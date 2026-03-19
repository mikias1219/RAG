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
    documentId: string;
    filename: string;
    contentType: string;
    status: "queued" | "processing" | "indexed" | "failed";
  }) {
    const created = await this.prismaIngestionJob.create({
      data: input
    });
    return created as IngestionJobRecord;
  }

  async getById(input: { tenantId: string; jobId: string }) {
    const found = await this.prismaIngestionJob.findFirst({
      where: { id: input.jobId, tenantId: input.tenantId }
    });
    return (found as IngestionJobRecord) ?? null;
  }

  async listByTenant(input: { tenantId: string; limit: number }) {
    const rows = await this.prismaIngestionJob.findMany({
      where: { tenantId: input.tenantId },
      orderBy: { createdAt: "desc" },
      take: input.limit
    });
    return rows as IngestionJobRecord[];
  }

  async setStatus(input: {
    tenantId: string;
    jobId: string;
    status: "queued" | "processing" | "indexed" | "failed";
    errorMessage?: string | null;
    setStartedAt?: boolean;
    setCompletedAt?: boolean;
  }) {
    await this.prismaIngestionJob.updateMany({
      where: { id: input.jobId, tenantId: input.tenantId },
      data: {
        status: input.status,
        errorMessage: input.errorMessage ?? null,
        ...(input.setStartedAt ? { startedAt: new Date() } : {}),
        ...(input.setCompletedAt ? { completedAt: new Date() } : {})
      }
    });
  }
}

