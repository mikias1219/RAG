import type {
  IngestionJobRecord,
  IngestionJobRepository
} from "@/domain/ports/ingestionJobRepository";

export class InMemoryIngestionJobRepository implements IngestionJobRepository {
  private readonly store = new Map<string, IngestionJobRecord>();

  async create(input: {
    id: string;
    tenantId: string;
    documentId: string;
    filename: string;
    contentType: string;
    status: "queued" | "processing" | "indexed" | "failed";
  }) {
    const now = new Date();
    const row: IngestionJobRecord = {
      ...input,
      errorMessage: null,
      createdAt: now,
      startedAt: null,
      completedAt: null
    };
    this.store.set(this.key(input.tenantId, input.id), row);
    return row;
  }

  async getById(input: { tenantId: string; jobId: string }) {
    return this.store.get(this.key(input.tenantId, input.jobId)) ?? null;
  }

  async listByTenant(input: { tenantId: string; limit: number }) {
    return Array.from(this.store.values())
      .filter((j) => j.tenantId === input.tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, input.limit);
  }

  async setStatus(input: {
    tenantId: string;
    jobId: string;
    status: "queued" | "processing" | "indexed" | "failed";
    errorMessage?: string | null;
    setStartedAt?: boolean;
    setCompletedAt?: boolean;
  }) {
    const key = this.key(input.tenantId, input.jobId);
    const current = this.store.get(key);
    if (!current) return;
    current.status = input.status;
    current.errorMessage = input.errorMessage ?? null;
    if (input.setStartedAt) current.startedAt = new Date();
    if (input.setCompletedAt) current.completedAt = new Date();
    this.store.set(key, current);
  }

  private key(tenantId: string, jobId: string) {
    return `${tenantId}:${jobId}`;
  }
}

