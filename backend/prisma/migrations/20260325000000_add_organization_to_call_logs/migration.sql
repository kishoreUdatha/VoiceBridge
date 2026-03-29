-- Add organizationId to call_logs and ivrs_logs for multi-tenancy support
-- This migration safely handles existing data by deriving organizationId from related entities

-- Step 1: Add organizationId as nullable first
ALTER TABLE "call_logs" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ivrs_logs" ADD COLUMN "organizationId" TEXT;

-- Step 2: Populate existing call_logs with organizationId from the caller (User)
UPDATE "call_logs" cl
SET "organizationId" = u."organizationId"
FROM "users" u
WHERE cl."callerId" = u."id" AND cl."organizationId" IS NULL;

-- Step 3: For any remaining call_logs, try to get organizationId from lead
UPDATE "call_logs" cl
SET "organizationId" = l."organizationId"
FROM "leads" l
WHERE cl."leadId" = l."id" AND cl."organizationId" IS NULL;

-- Step 4: Populate ivrs_logs with organizationId from lead
UPDATE "ivrs_logs" il
SET "organizationId" = l."organizationId"
FROM "leads" l
WHERE il."leadId" = l."id" AND il."organizationId" IS NULL;

-- Step 5: For any remaining records without organizationId, set to first organization
-- (This is a fallback - ideally all records should have valid organizationId by now)
UPDATE "call_logs"
SET "organizationId" = (SELECT id FROM "organizations" LIMIT 1)
WHERE "organizationId" IS NULL;

UPDATE "ivrs_logs"
SET "organizationId" = (SELECT id FROM "organizations" LIMIT 1)
WHERE "organizationId" IS NULL;

-- Step 6: Make organizationId NOT NULL (only if there are no NULL values remaining)
-- If this fails, there's data integrity issue that needs manual resolution
ALTER TABLE "call_logs" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ivrs_logs" ALTER COLUMN "organizationId" SET NOT NULL;

-- Step 7: Create indexes for efficient multi-tenant queries
CREATE INDEX "call_logs_organizationId_idx" ON "call_logs"("organizationId");
CREATE INDEX "call_logs_organizationId_createdAt_idx" ON "call_logs"("organizationId", "createdAt");
CREATE INDEX "ivrs_logs_organizationId_idx" ON "ivrs_logs"("organizationId");
CREATE INDEX "ivrs_logs_organizationId_createdAt_idx" ON "ivrs_logs"("organizationId", "createdAt");

-- Step 8: Add foreign key constraints
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ivrs_logs" ADD CONSTRAINT "ivrs_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
