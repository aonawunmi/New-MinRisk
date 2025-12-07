-- Migration: Add owner_id to risks table for proper user tracking
-- Date: 2025-12-07
-- Purpose: Replace free-text owner with actual user references
-- FIX: Temporarily disable audit trigger to avoid user_email error

-- Step 0: Temporarily disable the audit trigger to prevent errors
DROP TRIGGER IF EXISTS audit_risk_changes_trigger ON risks;

-- Step 1: Add owner_id column (nullable for now to allow migration)
ALTER TABLE risks
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN risks.owner_id IS 'User who owns this risk (replaces free-text owner field)';

-- Step 4: Keep the old owner TEXT field for backward compatibility
COMMENT ON COLUMN risks.owner IS 'Legacy free-text owner field - use owner_id for new risks';

-- Step 5: Populate owner_id for existing risks
-- (Assumption: user who created the risk is also the owner)
UPDATE risks
SET owner_id = user_id
WHERE owner_id IS NULL;

-- Step 6: Re-create the audit trigger (if it existed)
-- First, check if the audit function exists and recreate it without user_email
CREATE OR REPLACE FUNCTION audit_risk_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if audit_trail table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_trail') THEN
    -- Check if user_email column exists in audit_trail
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_trail' AND column_name = 'user_email'
    ) THEN
      -- Insert with user_email
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
      -- Insert without user_email
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER audit_risk_changes_trigger
  AFTER UPDATE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION audit_risk_changes();

-- Verify migration
SELECT
  COUNT(*) as total_risks,
  COUNT(owner_id) as risks_with_owner_id,
  COUNT(*) - COUNT(owner_id) as risks_without_owner_id
FROM risks;

-- Show sample of migrated data
SELECT id, risk_code, owner, owner_id, user_id
FROM risks
LIMIT 5;
