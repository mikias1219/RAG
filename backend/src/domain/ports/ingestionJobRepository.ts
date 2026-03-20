export type IngestionJobRecord = {
  id: string;
  tenantId: string;
  workspaceId?: string | null;
  documentId: string;
  filename: string;
  contentType: string;
  storageObjectKey: string | null;
  status: string;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export interface IngestionJobRepository {
  create(input: {
    id: string;
    tenantId: string;
    workspaceId?: string | null;
    documentId: string;
    filename: string;
    contentType: string;
    storageObjectKey?: string | null;
    status: "queued" | "processing" | "indexed" | "failed";
  }): Promise<IngestionJobRecord>;
  getById(input: { tenantId: string; workspaceId?: string | null; jobId: string }): Promise<IngestionJobRecord | null>;
  listByTenant(input: { tenantId: string; workspaceId?: string | null; limit: number }): Promise<IngestionJobRecord[]>;
  setStatus(input: {
    tenantId: string;
    workspaceId?: string | null;
    jobId: string;
    status: "queued" | "processing" | "indexed" | "failed";
    errorMessage?: string | null;
    setStartedAt?: boolean;
    setCompletedAt?: boolean;
    incrementAttempt?: boolean;
  }): Promise<void>;

  /** Backfill blob key for jobs created before storageObjectKey was persisted (or legacy rows). */
  setStorageObjectKey(input: {
    tenantId: string;
    workspaceId?: string | null;
    jobId: string;
    storageObjectKey: string;
  }): Promise<void>;
}

