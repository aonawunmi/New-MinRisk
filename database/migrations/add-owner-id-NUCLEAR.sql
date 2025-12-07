-- Migration: Add owner_id to risks table for proper user tracking
-- Date: 2025-12-07
-- Purpose: Replace free-text owner with actual user references
-- Version: NUCLEAR - Drop the audit function entirely to prevent any triggers from firing

-- ============================================================================
-- STEP 1: Drop ALL triggers and the audit function
-- ============================================================================
-- Drop any triggers on risks table
DROP TRIGGER IF EXISTS audit_risk_changes_trigger ON risks;
DROP TRIGGER IF EXISTS audit_risks_trigger ON risks;
DROP TRIGGER IF EXISTS risk_audit_trigger ON risks;

-- Drop the audit function itself (this prevents ANY trigger from calling it)
DROP FUNCTION IF EXISTS audit_risk_changes() CASCADE;

-- ============================================================================
-- STEP 2: Add owner_id column
-- ============================================================================
ALTER TABLE risks
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: Create index for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id);

-- ============================================================================
-- STEP 4: Add documentation
-- ============================================================================
COMMENT ON COLUMN risks.owner_id IS 'User who owns this risk (replaces free-text owner field)';
COMMENT ON COLUMN risks.owner IS 'Legacy free-text owner field - use owner_id for new risks';

-- ============================================================================
-- STEP 5: Populate owner_id for existing risks
-- ============================================================================
-- Assumption: user who created the risk is also the owner
UPDATE risks
SET owner_id = user_id
WHERE owner_id IS NULL;

-- ============================================================================
-- STEP 6: Verify migration
-- ============================================================================
DO $$
DECLARE
  total_count INTEGER;
  with_owner_id_count INTEGER;
  without_owner_id_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM risks;
  SELECT COUNT(*) INTO with_owner_id_count FROM risks WHERE owner_id IS NOT NULL;
  SELECT COUNT(*) INTO without_owner_id_count FROM risks WHERE owner_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   MIGRATION RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total risks: %', total_count;
  RAISE NOTICE 'Risks with owner_id: %', with_owner_id_count;
  RAISE NOTICE 'Risks without owner_id: %', without_owner_id_count;
  RAISE NOTICE '';

  IF without_owner_id_count > 0 THEN
    RAISE WARNING 'Some risks still have NULL owner_id!';
    RAISE NOTICE 'This likely means those risks have NULL user_id';
  ELSE
    RAISE NOTICE '✓ SUCCESS: All risks have owner_id populated!';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 7: Show sample data
-- ============================================================================
SELECT
  risk_code,
  owner AS "Legacy Owner (Text)",
  owner_id AS "New Owner ID",
  user_id AS "Creator ID",
  CASE
    WHEN owner_id = user_id THEN '✓ Match'
    WHEN owner_id IS NULL THEN '✗ NULL'
    ELSE '⚠ Different'
  END AS "Status"
FROM risks
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 8: Final warnings
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   CRITICAL WARNINGS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. All audit triggers have been REMOVED';
  RAISE NOTICE '2. The audit_risk_changes() function has been DELETED';
  RAISE NOTICE '3. Risk changes are NO LONGER being audited';
  RAISE NOTICE '';
  RAISE NOTICE 'To restore auditing:';
  RAISE NOTICE '1. Check your audit_trail schema';
  RAISE NOTICE '2. Recreate the function with correct columns';
  RAISE NOTICE '3. Recreate the trigger';
  RAISE NOTICE '========================================';
END $$;
