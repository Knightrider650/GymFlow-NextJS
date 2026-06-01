-- AlterTable Plan: Ensure durationDays column exists (fixes schema mismatch)
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER;

-- AlterTable Member: Add planId foreign key and make membershipType optional
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "planId" TEXT;
ALTER TABLE "Member" ALTER COLUMN "membershipType" DROP NOT NULL;
ALTER TABLE "Member" ADD CONSTRAINT "Member_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better query performance on planId
CREATE INDEX IF NOT EXISTS "Member_planId_idx" ON "Member"("planId");
