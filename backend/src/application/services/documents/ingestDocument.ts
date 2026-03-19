import type { Logger } from "pino";
import type { AppEnv } from "@/config/env";
import type { AiService } from "@/domain/ports/aiService";
import type { SearchService, SearchChunkDoc } from "@/domain/ports/searchService";
import type { StorageService } from "@/domain/ports/storageService";
import type { DocumentRepository } from "@/domain/ports/documentRepository";
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
    }
  ) {}

  async ingest(input: {
    tenantId: string;
    documentId: string;
    filename: string;
    contentType: string;
    bytes: Buffer;
    extractedText: string;
  }) {
    const { tenantId, documentId } = input;
    if (!input.extractedText || input.extractedText.trim().length === 0) {
      throw badRequest("Document contained no extractable text");
    }

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
      filename: input.filename,
      contentType: input.contentType,
      blobUrl: uploaded.url,
      sizeBytes: input.bytes.length
    });

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
          blobUrl: uploaded.url,
          contentType: input.contentType
        },
        createdAtIso: new Date().toISOString()
      });
    }

    await this.deps.search.upsertChunks({ chunks: searchDocs });
    this.deps.logger.info(
      { tenantId, documentId, chunks: chunks.length, blobUrl: uploaded.url },
      "document ingested"
    );

    return {
      documentId,
      blobUrl: uploaded.url,
      chunksIndexed: chunks.length
    };
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

