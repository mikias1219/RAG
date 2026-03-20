import type { Logger } from "pino";
import type { AppEnv } from "@/config/env";
import type { AiService } from "@/domain/ports/aiService";
import type { SearchService, SearchChunkDoc } from "@/domain/ports/searchService";
import type { StorageService } from "@/domain/ports/storageService";
import type { DocumentRepository } from "@/domain/ports/documentRepository";
import type { IngestionJobRepository } from "@/domain/ports/ingestionJobRepository";
import type { DocumentIntelligenceService } from "@/domain/ports/documentIntelligenceService";
import { chunkText } from "@/application/services/rag/chunkingService";
import { badRequest } from "@/domain/errors/AppError";

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
      status: "queued"
    });
    this.bufferedBytes.set(jobId, input.bytes);
    // Fire-and-forget processing to decouple upload request latency from indexing.
    setTimeout(() => {
      void this.processJob({ tenantId, workspaceId: input.workspaceId ?? null, jobId });
    }, 0);

    return {
      jobId,
      documentId,
      blobUrl: uploaded.url,
      status: "queued"
    };
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
    const bytes = this.bufferedBytes.get(job.id);
    if (!bytes) throw badRequest("Retry window expired. Re-upload the file to retry.");
    await this.deps.jobsRepo.setStatus({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      jobId: input.jobId,
      status: "queued",
      errorMessage: null
    });
    setTimeout(() => {
      void this.processJob({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId ?? null,
        jobId: input.jobId
      });
    }, 0);
    return { jobId: input.jobId, status: "queued" };
  }

  private async processJob(input: { tenantId: string; workspaceId?: string | null; jobId: string }) {
    const { tenantId, jobId } = input;
    const workspaceId = input.workspaceId ?? null;
    const job = await this.deps.jobsRepo.getById({ tenantId, workspaceId, jobId });
    if (!job) return;
    const bytes = this.bufferedBytes.get(jobId);
    if (!bytes) {
      await this.deps.jobsRepo.setStatus({
        tenantId,
        workspaceId,
        jobId,
        status: "failed",
        errorMessage: "Upload payload no longer available for processing",
        setCompletedAt: true
      });
      return;
    }
    await this.deps.jobsRepo.setStatus({
      tenantId,
      workspaceId,
      jobId,
      status: "processing",
      setStartedAt: true
    });
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
    for (const row of chunkRows) {
      const emb = await this.deps.ai.embedText({ text: row.text });
      searchDocs.push({
        id: makeSearchKey(tenantId, documentId, row.id),
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
  // Node 22 supports crypto.randomUUID()
  return require("crypto").randomUUID();
}

function makeSearchKey(tenantId: string, documentId: string, chunkId: string) {
  // Azure AI Search keys must avoid separators like ":".
  return `t_${tenantId}__d_${documentId}__c_${chunkId}`.replace(/[^A-Za-z0-9_=-]/g, "_");
}

