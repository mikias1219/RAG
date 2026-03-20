import type {
  IngestionJobRecord,
  IngestionJobRepository
} from "@/domain/ports/ingestionJobRepository";

export class InMemoryIngestionJobRepository implements IngestionJobRepository {
  private readonly store = new Map<string, IngestionJobRecord>();

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
    const now = new Date();
    const row: IngestionJobRecord = {
      ...input,
      storageObjectKey: input.storageObjectKey ?? null,
      errorMessage: null,
      attemptCount: 0,
      createdAt: now,
      startedAt: null,
      completedAt: null
    };
    this.store.set(this.key(input.tenantId, input.workspaceId ?? null, input.id), row);
    return row;
  }

  async getById(input: { tenantId: string; workspaceId?: string | null; jobId: string }) {
    return (
      this.store.get(this.key(input.tenantId, input.workspaceId ?? null, input.jobId)) ??
      this.store.get(this.key(input.tenantId, null, input.jobId)) ??
      null
    );
  }

  async listByTenant(input: { tenantId: string; workspaceId?: string | null; limit: number }) {
    return Array.from(this.store.values())
      .filter((j) =>
        j.tenantId === input.tenantId &&
        (!input.workspaceId || j.workspaceId === input.workspaceId || !j.workspaceId)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, input.limit);
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
    const key = this.key(input.tenantId, input.workspaceId ?? null, input.jobId);
    const current = this.store.get(key) ?? this.store.get(this.key(input.tenantId, null, input.jobId));
    if (!current) return;
    current.status = input.status;
    current.errorMessage = input.errorMessage ?? null;
    if (input.setStartedAt) current.startedAt = new Date();
    if (input.setCompletedAt) current.completedAt = new Date();
    if (input.incrementAttempt) current.attemptCount += 1;
    this.store.set(key, current);
  }

  async setStorageObjectKey(input: {
    tenantId: string;
    workspaceId?: string | null;
    jobId: string;
    storageObjectKey: string;
  }) {
    const key = this.key(input.tenantId, input.workspaceId ?? null, input.jobId);
    const current = this.store.get(key) ?? this.store.get(this.key(input.tenantId, null, input.jobId));
    if (!current) return;
    current.storageObjectKey = input.storageObjectKey;
    this.store.set(key, current);
  }

  private key(tenantId: string, workspaceId: string | null, jobId: string) {
    return `${tenantId}:${workspaceId ?? "none"}:${jobId}`;
  }
}

