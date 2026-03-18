import type { Document } from "@/domain/entities/Document";
import type { Chunk } from "@/domain/entities/Chunk";
import type { Pagination } from "@/domain/valueObjects/Pagination";

export interface DocumentRepository {
  createDocument(input: Omit<Document, "createdAt">): Promise<Document>;
  listDocuments(input: { tenantId: string; pagination: Pagination }): Promise<{ items: Document[]; total: number }>;
  createChunks(input: { tenantId: string; documentId: string; chunks: Array<Omit<Chunk, "createdAt">> }): Promise<void>;
  getDocument(input: { tenantId: string; documentId: string }): Promise<Document | null>;
}

