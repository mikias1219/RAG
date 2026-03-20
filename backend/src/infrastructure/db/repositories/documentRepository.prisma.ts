import type { DocumentRepository } from "@/domain/ports/documentRepository";
import type { Document } from "@/domain/entities/Document";
import type { Pagination } from "@/domain/valueObjects/Pagination";
import type { Chunk } from "@/domain/entities/Chunk";
import { getPrisma } from "@/infrastructure/db/prismaClient";

export class PrismaDocumentRepository implements DocumentRepository {
  private readonly prisma = getPrisma();
  private readonly prismaDocument = (this.prisma as any).document;
  private readonly prismaChunk = (this.prisma as any).chunk;

  private workspaceCompatibleWhere(input: { tenantId: string; workspaceId?: string | null }) {
    if (!input.workspaceId) return { tenantId: input.tenantId };
    return {
      OR: [{ workspaceId: input.workspaceId }, { tenantId: input.tenantId, workspaceId: null }]
    };
  }

  async createDocument(input: Omit<Document, "createdAt">): Promise<Document> {
    const created = await this.prismaDocument.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId ?? null,
        filename: input.filename,
        contentType: input.contentType,
        blobUrl: input.blobUrl,
        sizeBytes: input.sizeBytes
      }
    });
    return created as unknown as Document;
  }

  async listDocuments(input: { tenantId: string; workspaceId?: string | null; pagination: Pagination }) {
    const { tenantId, workspaceId, pagination } = input;
    const where = this.workspaceCompatibleWhere({ tenantId, workspaceId });
    const [total, items] = await this.prisma.$transaction([
      this.prismaDocument.count({ where }),
      this.prismaDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.offset,
        take: pagination.limit
      })
    ]);
    return { total, items: items as unknown as Document[] };
  }

  async createChunks(input: {
    tenantId: string;
    workspaceId?: string | null;
    documentId: string;
    chunks: Array<Omit<Chunk, "createdAt">>;
  }) {
    const { tenantId, workspaceId, documentId, chunks } = input;
    if (chunks.length === 0) return;

    await this.prismaChunk.createMany({
      data: chunks.map((c) => ({
        id: c.id,
        tenantId,
        workspaceId: workspaceId ?? null,
        documentId,
        chunkIndex: c.chunkIndex,
        text: c.text,
        tokenCountApprox: c.tokenCountApprox
      }))
    });
  }

  async getDocument(input: { tenantId: string; workspaceId?: string | null; documentId: string }) {
    const found = await this.prismaDocument.findFirst({
      where: {
        id: input.documentId,
        ...this.workspaceCompatibleWhere({ tenantId: input.tenantId, workspaceId: input.workspaceId })
      }
    });
    return (found as unknown as Document) ?? null;
  }

  async renameDocument(input: {
    tenantId: string;
    workspaceId?: string | null;
    documentId: string;
    filename: string;
  }) {
    const updated = await this.prismaDocument.updateMany({
      where: {
        id: input.documentId,
        ...this.workspaceCompatibleWhere({ tenantId: input.tenantId, workspaceId: input.workspaceId })
      },
      data: { filename: input.filename }
    });
    if (updated.count === 0) return null;
    return this.getDocument({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      documentId: input.documentId
    });
  }

  async listChunkSearchDocumentIds(input: {
    tenantId: string;
    workspaceId?: string | null;
    documentId: string;
  }) {
    const rows = await this.prismaChunk.findMany({
      where: {
        documentId: input.documentId,
        ...this.workspaceCompatibleWhere({ tenantId: input.tenantId, workspaceId: input.workspaceId })
      },
      select: { searchDocumentId: true }
    });
    return rows.map((r: any) => r.searchDocumentId).filter(Boolean);
  }

  async deleteDocument(input: { tenantId: string; workspaceId?: string | null; documentId: string }) {
    const deleted = await this.prismaDocument.deleteMany({
      where: {
        id: input.documentId,
        ...this.workspaceCompatibleWhere({ tenantId: input.tenantId, workspaceId: input.workspaceId })
      }
    });
    return deleted.count > 0;
  }

  async updateChunkEmbeddingMetadata(input: {
    tenantId: string;
    chunkId: string;
    searchDocumentId: string;
    embeddingModel: string;
  }) {
    await this.prismaChunk.updateMany({
      where: { id: input.chunkId, tenantId: input.tenantId },
      data: {
        searchDocumentId: input.searchDocumentId,
        embeddingModel: input.embeddingModel,
        embeddedAt: new Date()
      }
    });
  }
}

