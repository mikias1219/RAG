import type {
  IngestionJobRecord,
  IngestionJobRepository
} from "@/domain/ports/ingestionJobRepository";
import { getPrisma } from "@/infrastructure/db/prismaClient";

export class PrismaIngestionJobRepository implements IngestionJobRepository {
  private readonly prisma = getPrisma();
  private readonly prismaIngestionJob = (this.prisma as any).ingestionJob;

  async create(input: {
    id: string;
    tenantId: string;
    workspaceId?: string | null;
    documentId: string;
    filename: string;
    contentType: string;
    storageObjectKey?: string | null;
    status: "queued" | "processing" | "indexed" | "failed";
  }) {
    const created = await this.prismaIngestionJob.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId ?? null,
        documentId: input.documentId,
        filename: input.filename,
        contentType: input.contentType,
        storageObjectKey: input.storageObjectKey ?? null,
        status: input.status
      }
    });
    return created as unknown as IngestionJobRecord;
  }

  async getById(input: { tenantId: string; workspaceId?: string | null; jobId: string }) {
    const found = await this.prismaIngestionJob.findFirst({
      where: {
        id: input.jobId,
        OR: input.workspaceId
          ? [{ workspaceId: input.workspaceId }, { tenantId: input.tenantId, workspaceId: null }]
          : [{ tenantId: input.tenantId }]
      }
    });
    return (found as IngestionJobRecord) ?? null;
  }

  async listByTenant(input: { tenantId: string; workspaceId?: string | null; limit: number }) {
    const rows = await this.prismaIngestionJob.findMany({
      where: input.workspaceId
        ? {
            OR: [{ workspaceId: input.workspaceId }, { tenantId: input.tenantId, workspaceId: null }]
          }
        : { tenantId: input.tenantId },
      orderBy: { createdAt: "desc" },
      take: input.limit
    });
    return rows as IngestionJobRecord[];
  }

  async setStatus(input: {
    tenantId: string;
    workspaceId?: string | null;
    jobId: string;
    status: "queued" | "processing" | "indexed" | "failed";
    errorMessage?: string | null;
    setStartedAt?: boolean;
    setCompletedAt?: boolean;
    incrementAttempt?: boolean;
  }) {
    await this.prismaIngestionJob.updateMany({
      where: input.workspaceId
        ? {
            id: input.jobId,
            OR: [{ workspaceId: input.workspaceId }, { tenantId: input.tenantId, workspaceId: null }]
          }
        : { id: input.jobId, tenantId: input.tenantId },
      data: {
        status: input.status,
        errorMessage: input.errorMessage ?? null,
        ...(input.setStartedAt ? { startedAt: new Date() } : {}),
        ...(input.setCompletedAt ? { completedAt: new Date() } : {}),
        ...(input.incrementAttempt ? { attemptCount: { increment: 1 } } : {})
      }
    });
  }
}

