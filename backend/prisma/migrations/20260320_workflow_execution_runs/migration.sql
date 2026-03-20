-- Workflow execution persistence for execute endpoint and ingestion triggers

CREATE TABLE IF NOT EXISTS "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "contextJson" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkflowRun" DROP CONSTRAINT IF EXISTS "WorkflowRun_workflowId_fkey";
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkflowRun" DROP CONSTRAINT IF EXISTS "WorkflowRun_workspaceId_fkey";
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WorkflowRun_tenantId_createdAt_idx"
  ON "WorkflowRun"("tenantId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WorkflowRun_workspaceId_createdAt_idx"
  ON "WorkflowRun"("workspaceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WorkflowRun_workflowId_createdAt_idx"
  ON "WorkflowRun"("workflowId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "WorkflowRunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRunStep_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkflowRunStep" DROP CONSTRAINT IF EXISTS "WorkflowRunStep_runId_fkey";
ALTER TABLE "WorkflowRunStep" ADD CONSTRAINT "WorkflowRunStep_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WorkflowRunStep_runId_createdAt_idx"
  ON "WorkflowRunStep"("runId", "createdAt" DESC);
