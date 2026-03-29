-- Add performance indexes for frequently queried fields
-- These indexes improve query performance for common operations

-- Lead indexes for analytics and filtering
CREATE INDEX IF NOT EXISTS "leads_organizationId_source_idx" ON "leads"("organizationId", "source");
CREATE INDEX IF NOT EXISTS "leads_organizationId_createdAt_idx" ON "leads"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "leads_organizationId_priority_idx" ON "leads"("organizationId", "priority");
CREATE INDEX IF NOT EXISTS "leads_organizationId_isConverted_idx" ON "leads"("organizationId", "isConverted");
