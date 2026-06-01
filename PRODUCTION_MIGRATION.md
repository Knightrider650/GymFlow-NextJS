# Production Database Migration Guide

## Critical Database Schema Updates Required

The latest code changes require these database schema updates on production PostgreSQL. **These must be applied before the new code fully functions.**

### What Changed

1. **Plan Model**: Added `durationDays` column (optional integer for day-based plans)
2. **Member Model**: Added `planId` foreign key to link members to plans
3. **Member Model**: Made `membershipType` nullable (optional for backward compatibility)

### Current Status on Production

- ❌ `Plan.durationDays` column missing
- ❌ `Member.planId` column missing  
- ✅ JSON fallback database automatically handles new schema

## Step 1: Connect to Production PostgreSQL

```bash
# Using psql
psql $DATABASE_URL

# Or use your database client to connect to the DATABASE_URL from .env.production
```

Verify your connection string format: `postgresql://user:password@host:5432/dbname`

## Step 2: Run Migration SQL

Execute these commands in order:

### Add durationDays Column to Plan Table

```sql
-- Ensure durationDays column exists on Plan model
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER;
```

### Update Member Table Schema

```sql
-- Make membershipType nullable for backward compatibility
ALTER TABLE "Member" ALTER COLUMN "membershipType" DROP NOT NULL;

-- Add planId foreign key column
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "planId" TEXT;

-- Create foreign key relationship to Plan
ALTER TABLE "Member"
ADD CONSTRAINT "Member_planId_fkey" 
FOREIGN KEY ("planId") REFERENCES "Plan"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "Member_planId_idx" ON "Member"("planId");
```

## Step 3: Verify Migration

```sql
-- Check Plan table structure
\d "Plan"

-- Check Member table structure
\d "Member"

-- Verify both new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Plan' AND column_name = 'durationDays';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Member' AND column_name = 'planId';
```

Expected output:
- ✓ Plan.durationDays (integer, nullable)
- ✓ Member.planId (text, nullable)
- ✓ Member.membershipType (text, nullable)

## Step 4: Verify Application Works

After running migration:

1. **Test Plan Operations**
   - Navigate to Plans page
   - Create a new plan with days or months duration
   - Verify it saves and displays correctly

2. **Test Member Operations**
   - Navigate to Members page
   - Create a new member
   - Verify plan dropdown shows available plans
   - Assign a plan to the member
   - Verify membership expiry date auto-calculates

3. **Check Logs**
   - Should see NO more "durationDays does not exist" errors
   - Should see NO more "planId does not exist" errors

## Alternative: Using Prisma Migrate (if available)

If you have Prisma CLI access on production server:

```bash
# Apply pending migrations
npx prisma migrate deploy

# Or manually:
psql $DATABASE_URL < prisma/migrations/add_plan_to_members/migration.sql
```

## Troubleshooting

### Error: "column does not exist"

This means the migration hasn't been applied yet. Run the SQL commands above.

### Error: "permission denied"

The database user may not have ALTER TABLE permissions. Contact your database administrator or use an admin account with full privileges.

### Error: "constraint already exists"

The foreign key may already exist. You can safely ignore this or check if the migration was already partially applied:

```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name='Member' AND constraint_name='Member_planId_fkey';
```

### The application shows API errors but database looks correct

Clear application cache and restart services:
```bash
# On Vercel: Redeploy the application
# This will rebuild with fresh code and database connection

# For Railway/Heroku: Restart dynos
# For Docker: Rebuild and restart containers
```

## Rollback Instructions

If you need to undo these changes:

```sql
-- Remove foreign key
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_planId_fkey";

-- Remove index
DROP INDEX IF EXISTS "Member_planId_idx";

-- Remove columns
ALTER TABLE "Member" DROP COLUMN IF EXISTS "planId";
ALTER TABLE "Plan" DROP COLUMN IF EXISTS "durationDays";

-- Restore membershipType to NOT NULL (only if old data exists)
ALTER TABLE "Member" ALTER COLUMN "membershipType" SET NOT NULL DEFAULT 'Standard';
```

## Environment Variable Configuration

For Vercel/serverless deployments, set this optional variable:

```env
# Optional: Override JSON fallback database path (Vercel uses /tmp by default)
GYMFLOW_JSON_DB_FILE=/tmp/gymflow-data.json
```

If not set, the system automatically uses:
- Primary: `server/data.json` (if available, writable)
- Fallback: `/tmp/gymflow-data.json` (for read-only filesystems)

## Questions or Issues?

- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for general deployment instructions
- Review [SECURITY.md](./SECURITY.md) for security best practices
- Check repository issues: https://github.com/Knightrider650/GymFlow-NextJS/issues
