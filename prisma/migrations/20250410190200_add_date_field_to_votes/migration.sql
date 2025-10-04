-- Step 1: Add date column as nullable first
ALTER TABLE "Vote" ADD COLUMN "date" TEXT;

-- Step 2: Populate date field with a calculated value based on createdAt
-- This ensures existing votes get a date value
UPDATE "Vote" 
SET "date" = TO_CHAR("createdAt", 'YYYY-MM-DD');

-- Step 3: Make date column required now that it has values
ALTER TABLE "Vote" ALTER COLUMN "date" SET NOT NULL;

-- Step 4: Drop the old unique constraint on userId and weekOf
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_userId_weekOf_key";

-- Step 5: Create new unique constraint on userId and date
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_date_key" UNIQUE ("userId", "date");

-- Step 6: Create index on date
CREATE INDEX "Vote_date_idx" ON "Vote"("date");
