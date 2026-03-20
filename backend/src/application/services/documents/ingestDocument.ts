import type { Logger } from "pino";
import type { Queue } from "bullmq";
import type { AppEnv } from "@/config/env";
import type { AiService } from "@/domain/ports/aiService";
import type { SearchService, SearchChunkDoc } from "@/domain/ports/searchService";
import type { StorageService } from "@/domain/ports/storageService";
import type { DocumentRepository } from "@/domain/ports/documentRepository";
import type { IngestionJobRecord, IngestionJobRepository } from "@/domain/ports/ingestionJobRepository";
import type { DocumentIntelligenceService } from "@/domain/ports/documentIntelligenceService";
import { chunkText } from "@/application/services/rag/chunkingService";
import { badRequest } from "@/domain/errors/AppError";

/** Must match AzureBlobStorageService blob path: `sanitize(tenantId)/documentId/safeFilename` */
function tenantSegmentSanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function inferredStorageBlobKey(job: Pick<IngestionJobRecord, "tenantId" | "documentId" | "filename">) {
  return `${tenantSegmentSanitize(job.tenantId)}/${job.documentId}/${safeFilename(job.filename)}`;
}

export class IngestDocumentService {
  constructor(
    private readonly deps: {
      env: AppEnv;
      logger: Logger;
      ai: AiService;
      search: SearchService;
      storage: StorageService;
      documentsRepo: DocumentRepository;
      jobsRepo: IngestionJobRepository;
      documentIntelligence: DocumentIntelligenceService;
      ingestionQueue?: Queue | null;
      onDocumentIndexed?: (input: {
        tenantId: string;
        workspaceId?: string | null;
        documentId: string;
        jobId: string;
      }) => Promise<void>;
    }
  ) {}

  private readonly bufferedBytes = new Map<string, Buffer>();

  async enqueue(input: {
    tenantId: string;
    workspaceId?: string | null;
    documentId: string;
    jobId: string;
    filename: string;
    contentType: string;
    bytes: Buffer;
  }) {
    const { tenantId, documentId, jobId } = input;
    const objectKey = `${documentId}/${safeFilename(input.filename)}`;
    const uploaded = await this.deps.storage.putObject({
      tenantId,
      key: objectKey,
      contentType: input.contentType,
      data: input.bytes
    });

    await this.deps.documentsRepo.createDocument({
      id: documentId,
      tenantId,
      workspaceId: input.workspaceId ?? null,
      filename: input.filename,
      contentType: input.contentType,
      blobUrl: uploaded.url,
      sizeBytes: input.bytes.length
    });

    await this.deps.jobsRepo.create({
      id: jobId,
      tenantId,
      workspaceId: input.workspaceId ?? null,
      documentId,
      filename: input.filename,
      contentType: input.contentType,
      storageObjectKey: uploaded.key,
      status: "queued"
    });

    const useQueue = Boolean(this.deps.ingestionQueue && this.deps.env.INGESTION_QUEUE_ENABLED);
    if (useQueue && this.deps.ingestionQueue) {
      await this.deps.ingestionQueue.add(
        "ingest",
        {
          tenantId,
          workspaceId: input.workspaceId ?? null,
          jobId
        },
        { jobId: `${tenantId}:${jobId}`.replace(/[^a-zA-Z0-9:_-]/g, "_") }
      );
    } else {
      this.bufferedBytes.set(jobId, input.bytes);
      setTimeout(() => {
        void this.processJob({ tenantId, workspaceId: input.workspaceId ?? null, jobId });
      }, 0);
    }

    return {
      jobId,
      documentId,
      blobUrl: uploaded.url,
      status: "queued"
    };
  }

  /** Called by BullMQ worker process. */
  async processJobFromQueue(input: { tenantId: string; workspaceId?: string | null; jobId: string }) {
    await this.deps.jobsRepo.setStatus({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      jobId: input.jobId,
      status: "processing",
      setStartedAt: true,
      incrementAttempt: true
    });
    await this.runIngestionPipeline({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      jobId: input.jobId
    });
  }

  async getJob(input: { tenantId: string; workspaceId?: string | null; jobId: string }) {
    return this.deps.jobsRepo.getById(input);
  }

  async listJobs(input: { tenantId: string; workspaceId?: string | null; limit: number }) {
    return this.deps.jobsRepo.listByTenant(input);
  }

  async retryJob(input: { tenantId: string; workspaceId?: string | null; jobId: string }) {
    const job = await this.deps.jobsRepo.getById(input);
    if (!job) throw badRequest("Job not found");
    if (job.status !== "failed") throw badRequest("Only failed jobs can be retried");
    const inMemory = this.bufferedBytes.has(job.id);
    const inStorage = inMemory ? true : (await this.tryLoadBytesFromStorage(job)) !== null;
    if (!inStorage) {
      throw badRequest(
        "Retry not possible: the file is no longer in blob storage. Re-upload the document."
      );
    }
    await this.deps.jobsRepo.setStatus({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      jobId: input.jobId,
      status: "queued",
      errorMessage: null
    });
    const useQueue = Boolean(this.deps.ingestionQueue && this.deps.env.INGESTION_QUEUE_ENABLED);
    if (useQueue && this.deps.ingestionQueue) {
      await this.deps.ingestionQueue.add(
        "ingest",
        {
          tenantId: input.tenantId,
          workspaceId: input.workspaceId ?? null,
          jobId: input.jobId
        },
        { jobId: `retry_${input.tenantId}_${input.jobId}`.replace(/[^a-zA-Z0-9:_-]/g, "_") }
      );
    } else {
      setTimeout(() => {
        void this.processJob({
          tenantId: input.tenantId,
          workspaceId: input.workspaceId ?? null,
          jobId: input.jobId
        });
      }, 0);
    }
    return { jobId: input.jobId, status: "queued" };
  }

  private async processJob(input: { tenantId: string; workspaceId?: string | null; jobId: string }) {
    await this.deps.jobsRepo.setStatus({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      jobId: input.jobId,
      status: "processing",
      setStartedAt: true,
      incrementAttempt: true
    });
    await this.runIngestionPipeline(input);
  }

  private async runIngestionPipeline(input: { tenantId: string; workspaceId?: string | null; jobId: string }) {
    const { tenantId, jobId } = input;
    const workspaceId = input.workspaceId ?? null;
    const job = await this.deps.jobsRepo.getById({ tenantId, workspaceId, jobId });
    if (!job) return;
    const bytes = await this.resolveJobBytes(job);
    if (!bytes) {
      await this.deps.jobsRepo.setStatus({
        tenantId,
        workspaceId,
        jobId,
        status: "failed",
        errorMessage: "Could not load document bytes for processing",
        setCompletedAt: true
      });
      return;
    }
    try {
      const extractedText = await this.extractText({
        bytes,
        contentType: job.contentType,
        filename: job.filename
      });
      const result = await this.indexExtracted({
        tenantId,
        workspaceId,
        documentId: job.documentId,
        filename: job.filename,
        contentType: job.contentType,
        blobUrl: await this.getBlobUrl({ tenantId, workspaceId, documentId: job.documentId }),
        extractedText
      });
      await this.deps.jobsRepo.setStatus({
        tenantId,
        workspaceId,
        jobId,
        status: "indexed",
        setCompletedAt: true,
        errorMessage: null
      });
      if (this.deps.onDocumentIndexed) {
        await this.deps.onDocumentIndexed({ tenantId, workspaceId, documentId: job.documentId, jobId });
      }
      this.deps.logger.info({ tenantId, jobId, ...result }, "ingestion job indexed");
    } catch (error: any) {
      await this.deps.jobsRepo.setStatus({
        tenantId,
        workspaceId,
        jobId,
        status: "failed",
        errorMessage: error?.message ?? "Unknown ingestion error",
        setCompletedAt: true
      });
      this.deps.logger.error({ tenantId, jobId, err: error }, "ingestion job failed");
    }
  }

  private async resolveJobBytes(job: IngestionJobRecord): Promise<Buffer | null> {
    const fromBuffer = this.bufferedBytes.get(job.id);
    if (fromBuffer) return fromBuffer;
    return this.tryLoadBytesFromStorage(job);
  }

  /**
   * Load bytes from blob storage using persisted key or the same path convention as upload
   * (fixes legacy rows with null storageObjectKey after migrations / multi-instance APIs).
   */
  private async tryLoadBytesFromStorage(job: IngestionJobRecord): Promise<Buffer | null> {
    const keys = [...new Set([job.storageObjectKey, inferredStorageBlobKey(job)].filter(Boolean) as string[])];
    for (const blobKey of keys) {
      try {
        const buf = await this.deps.storage.getObject({ blobKey });
        if (buf?.length) {
          if (!job.storageObjectKey || job.storageObjectKey !== blobKey) {
            await this.deps.jobsRepo.setStorageObjectKey({
              tenantId: job.tenantId,
              workspaceId: job.workspaceId ?? null,
              jobId: job.id,
              storageObjectKey: blobKey
            });
          }
          return buf;
        }
      } catch {
        /* try next candidate key */
      }
    }
    return null;
  }

  private async indexExtracted(input: {
    tenantId: string;
    workspaceId?: string | null;
    documentId: string;
    filename: string;
    contentType: string;
    blobUrl: string;
    extractedText: string;
  }) {
    const { tenantId, documentId } = input;
    if (!input.extractedText || input.extractedText.trim().length === 0) {
      throw badRequest("Document contained no extractable text");
    }

    const chunks = chunkText({
      text: input.extractedText,
      chunkSize: this.deps.env.CHUNK_SIZE,
      overlap: this.deps.env.CHUNK_OVERLAP
    });

    const chunkRows = chunks.map((c) => ({
      id: cryptoRandomId(),
      documentId,
      chunkIndex: c.index,
      text: c.text,
      tokenCountApprox: c.tokenCountApprox
    }));

    await this.deps.documentsRepo.createChunks({
      tenantId,
      workspaceId: input.workspaceId ?? null,
      documentId,
      chunks: chunkRows
    });

    const searchDocs: SearchChunkDoc[] = [];
    const embeddingModel = this.deps.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
    for (const row of chunkRows) {
      const emb = await this.deps.ai.embedText({ text: row.text });
      const searchDocId = makeSearchKey(tenantId, documentId, row.id);
      searchDocs.push({
        id: searchDocId,
        tenantId,
        documentId,
        chunkId: row.id,
        chunkIndex: row.chunkIndex,
        text: row.text,
        embedding: emb.vector,
        source: {
          filename: input.filename,
          blobUrl: input.blobUrl,
          contentType: input.contentType
        },
        createdAtIso: new Date().toISOString()
      });
      await this.deps.documentsRepo.updateChunkEmbeddingMetadata({
        tenantId,
        chunkId: row.id,
        searchDocumentId: searchDocId,
        embeddingModel
      });
    }

    await this.deps.search.upsertChunks({ chunks: searchDocs });
    return {
      documentId,
      chunksIndexed: chunks.length
    };
  }

  private async extractText(input: { bytes: Buffer; contentType: string; filename: string }) {
    if (input.contentType.startsWith("text/") || input.contentType === "application/json") {
      return input.bytes.toString("utf8");
    }
    if (
      input.contentType === "application/pdf" ||
      input.contentType.startsWith("image/")
    ) {
      return this.deps.documentIntelligence.extractText(input);
    }
    throw badRequest(
      "Unsupported contentType. Allowed: text/plain, application/json, application/pdf, and image/*.",
      { contentType: input.contentType }
    );
  }

  private async getBlobUrl(input: { tenantId: string; workspaceId?: string | null; documentId: string }) {
    const doc = await this.deps.documentsRepo.getDocument({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      documentId: input.documentId
    });
    if (!doc) throw badRequest("Document metadata was not found");
    return doc.blobUrl;
  }
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function cryptoRandomId() {
  return require("crypto").randomUUID();
}

function makeSearchKey(tenantId: string, documentId: string, chunkId: string) {
  return `t_${tenantId}__d_${documentId}__c_${chunkId}`.replace(/[^A-Za-z0-9_=-]/g, "_");
}
