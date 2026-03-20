import type { Document } from "@/domain/entities/Document";
import type { Chunk } from "@/domain/entities/Chunk";
import type { Pagination } from "@/domain/valueObjects/Pagination";

export interface DocumentRepository {
  createDocument(input: Omit<Document, "createdAt">): Promise<Document>;
  listDocuments(input: {
    tenantId: string;
    workspaceId?: string | null;
    pagination: Pagination;
  }): Promise<{ items: Document[]; total: number }>;
  createChunks(input: {
    tenantId: string;
    workspaceId?: string | null;
    documentId: string;
    chunks: Array<Omit<Chunk, "createdAt">>;
  }): Promise<void>;
  getDocument(input: { tenantId: string; workspaceId?: string | null; documentId: string }): Promise<Document | null>;
  updateChunkEmbeddingMetadata(input: {
    tenantId: string;
    chunkId: string;
    searchDocumentId: string;
    embeddingModel: string;
  }): Promise<void>;
}

