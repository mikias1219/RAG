-- OKDE: async ingestion metadata, chunk embedding metadata, workflows, audit logs

ALTER TABLE "IngestionJob" ADD COLUMN IF NOT EXISTS "storageObjectKey" TEXT;
ALTER TABLE "IngestionJob" ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "searchDocumentId" TEXT;
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT;
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "embeddedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Workflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rulesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Workflow_tenantId_enabled_idx" ON "Workflow"("tenantId", "enabled");
CREATE INDEX IF NOT EXISTS "Workflow_workspaceId_enabled_idx" ON "Workflow"("workspaceId", "enabled");

ALTER TABLE "Workflow" DROP CONSTRAINT IF EXISTS "Workflow_workspaceId_fkey";
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadataJson" TEXT NOT NULL,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt" DESC);

ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_workspaceId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
