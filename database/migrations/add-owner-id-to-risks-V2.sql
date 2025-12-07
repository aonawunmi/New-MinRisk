-- Migration: Add owner_id to risks table for proper user tracking
-- Date: 2025-12-07
-- Purpose: Replace free-text owner with actual user references
-- Version 2: Fix audit trigger BEFORE making any changes

-- ============================================================================
-- STEP 1: Fix the audit function FIRST (before any table modifications)
-- ============================================================================
-- This ensures the function works whether or not user_email exists
CREATE OR REPLACE FUNCTION audit_risk_changes()
RETURNS TRIGGER AS $$
DECLARE
  has_user_email_column BOOLEAN;
BEGIN
  -- Check if audit_trail table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_trail') THEN
    RETURN NEW;
  END IF;

  -- Check if user_email column exists in audit_trail
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_trail' AND column_name = 'user_email'
  ) INTO has_user_email_column;

  -- Insert with or without user_email based on column existence
  IF has_user_email_column THEN
    INSERT INTO audit_trail (
      organization_id, user_id, user_email, action, entity_type,
      entity_id, entity_code, old_values, new_values, timestamp
    )
    VALUES (
      NEW.organization_id,
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'update',
      'risk',
      NEW.id,
      NEW.risk_code,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
  ELSE
    INSERT INTO audit_trail (
      organization_id, user_id, action, entity_type,
      entity_id, entity_code, old_values, new_values, timestamp
    )
    VALUES (
      NEW.organization_id,
      auth.uid(),
      'update',
      'risk',
      NEW.id,
      NEW.risk_code,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Now we can safely make schema changes
-- ============================================================================

-- Add owner_id column (nullable for now to allow migration)
ALTER TABLE risks
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id);

-- Add documentation comments
COMMENT ON COLUMN risks.owner_id IS 'User who owns this risk (replaces free-text owner field)';
COMMENT ON COLUMN risks.owner IS 'Legacy free-text owner field - use owner_id for new risks';

-- ============================================================================
-- STEP 3: Populate owner_id for existing risks
-- ============================================================================
-- Assumption: user who created the risk is also the owner
UPDATE risks
SET owner_id = user_id
WHERE owner_id IS NULL;

-- ============================================================================
-- STEP 4: Verify migration success
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

  RAISE NOTICE '=== Migration Results ===';
  RAISE NOTICE 'Total risks: %', total_count;
  RAISE NOTICE 'Risks with owner_id: %', with_owner_id_count;
  RAISE NOTICE 'Risks without owner_id: %', without_owner_id_count;

  IF without_owner_id_count > 0 THEN
    RAISE WARNING 'Some risks still have NULL owner_id - check user_id values';
  ELSE
    RAISE NOTICE 'SUCCESS: All risks have owner_id populated!';
  END IF;
END $$;

-- Show sample of migrated data
SELECT
  id,
  risk_code,
  owner AS legacy_owner_text,
  owner_id AS new_owner_id,
  user_id AS creator_id,
  CASE
    WHEN owner_id = user_id THEN 'Owner = Creator ✓'
    ELSE 'Owner ≠ Creator (needs review)'
  END AS validation
FROM risks
LIMIT 10;
