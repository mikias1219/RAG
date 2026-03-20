-- Add workspace industry profile metadata for domain-specific guidance.
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "industry" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "domainFocus" TEXT;
