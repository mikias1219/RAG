-- Milestone 1 additive workspace foundation migration scaffold.
-- NOTE: This file is safe-additive and intended for rollout preparation.

CREATE TABLE IF NOT EXISTS "Company" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workspace_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_tenantId_slug_key" ON "Workspace"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "Workspace_companyId_createdAt_idx" ON "Workspace"("companyId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE,
  CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_createdAt_idx" ON "WorkspaceMember"("userId", "createdAt" DESC);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "IngestionJob" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

CREATE INDEX IF NOT EXISTS "User_workspaceId_createdAt_idx" ON "User"("workspaceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Document_workspaceId_createdAt_idx" ON "Document"("workspaceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Chunk_workspaceId_documentId_idx" ON "Chunk"("workspaceId", "documentId");
CREATE INDEX IF NOT EXISTS "ChatSession_workspaceId_userId_createdAt_idx" ON "ChatSession"("workspaceId", "userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ChatMessage_workspaceId_sessionId_createdAt_idx" ON "ChatMessage"("workspaceId", "sessionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IngestionJob_workspaceId_status_createdAt_idx" ON "IngestionJob"("workspaceId", "status", "createdAt" DESC);

-- Compatibility backfill for existing data.
-- Existing tenant-scoped records can be mapped to a default workspace per tenant during app bootstrap/seed.
