-- Migration: Add owner_id to risks table for proper user tracking
-- Date: 2025-12-07
-- Purpose: Replace free-text owner with actual user references

-- Step 1: Add owner_id column (nullable for now to allow migration)
ALTER TABLE risks
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN risks.owner_id IS 'User who owns this risk (replaces free-text owner field)';

-- Step 4: Keep the old owner TEXT field for backward compatibility
-- We will migrate data gradually and eventually deprecate it
COMMENT ON COLUMN risks.owner IS 'Legacy free-text owner field - use owner_id for new risks';

-- Note: Migration strategy
-- 1. New risks will require owner_id (enforced in app)
-- 2. Admins can use mapping UI to convert old text owners to user references
-- 3. Once all risks have owner_id, we can make it NOT NULL
-- 4. Eventually drop the owner TEXT column

-- For immediate testing: Set owner_id to user_id for all risks created by that user
-- (Assumption: user who created the risk is also the owner)
UPDATE risks
SET owner_id = user_id
WHERE owner_id IS NULL;

-- Verify migration
SELECT
  COUNT(*) as total_risks,
  COUNT(owner_id) as risks_with_owner_id,
  COUNT(*) - COUNT(owner_id) as risks_without_owner_id
FROM risks;
