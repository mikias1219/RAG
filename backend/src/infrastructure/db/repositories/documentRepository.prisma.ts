import type { DocumentRepository } from "@/domain/ports/documentRepository";
import type { Document } from "@/domain/entities/Document";
import type { Pagination } from "@/domain/valueObjects/Pagination";
import type { Chunk } from "@/domain/entities/Chunk";
import { getPrisma } from "@/infrastructure/db/prismaClient";

export class PrismaDocumentRepository implements DocumentRepository {
  private readonly prisma = getPrisma();

  async createDocument(input: Omit<Document, "createdAt">): Promise<Document> {
    const created = await this.prisma.document.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        filename: input.filename,
        contentType: input.contentType,
        blobUrl: input.blobUrl,
        sizeBytes: input.sizeBytes
      }
    });
    return created as unknown as Document;
  }

  async listDocuments(input: { tenantId: string; pagination: Pagination }) {
    const { tenantId, pagination } = input;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.document.count({ where: { tenantId } }),
      this.prisma.document.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        skip: pagination.offset,
        take: pagination.limit
      })
    ]);
    return { total, items: items as unknown as Document[] };
  }

  async createChunks(input: { tenantId: string; documentId: string; chunks: Array<Omit<Chunk, "createdAt">> }) {
    const { tenantId, documentId, chunks } = input;
    if (chunks.length === 0) return;

    await this.prisma.chunk.createMany({
      data: chunks.map((c) => ({
        id: c.id,
        tenantId,
        documentId,
        chunkIndex: c.chunkIndex,
        text: c.text,
        tokenCountApprox: c.tokenCountApprox
      }))
    });
  }

  async getDocument(input: { tenantId: string; documentId: string }) {
    const found = await this.prisma.document.findFirst({
      where: { tenantId: input.tenantId, id: input.documentId }
    });
    return (found as unknown as Document) ?? null;
  }
}

