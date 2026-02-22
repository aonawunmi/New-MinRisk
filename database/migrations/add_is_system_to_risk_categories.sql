-- =====================================================================
-- Add is_system column to risk_categories
-- =====================================================================
-- Purpose: Mark the 5 SEC standard parent categories as system-locked
-- so organizations can't delete/rename them. Users can only add
-- subcategories under these fixed parent categories.
--
-- Target: Staging DB (oydbriokgjuwxndlsocd)
-- =====================================================================

BEGIN;

-- Step 1: Add is_system column (default false for any custom categories)
ALTER TABLE risk_categories
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Mark the 5 SEC-aligned categories as system for ACME Corporation
-- These were seeded in seed_staging_sec_data.sql
UPDATE risk_categories
SET is_system = true
WHERE organization_id = 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5'
  AND name IN (
    'Strategic Risk',
    'Market Risk',
    'Regulatory Risk',
    'Operational Risk',
    'IT/Cyber Risk'
  );

-- Step 3: Add a trigger to prevent deletion of system categories
CREATE OR REPLACE FUNCTION prevent_system_category_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = true THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete system category "%". These are SEC-mandated categories.', OLD.name;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      -- Allow updating is_system itself (for initial setup), but prevent name changes
      IF NEW.name IS DISTINCT FROM OLD.name THEN
        RAISE EXCEPTION 'Cannot rename system category "%". These are SEC-mandated categories.', OLD.name;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_system_categories ON risk_categories;
CREATE TRIGGER protect_system_categories
  BEFORE UPDATE OR DELETE ON risk_categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_system_category_modification();

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================
-- SELECT name, is_system FROM risk_categories
-- WHERE organization_id = 'ca23d741-4858-4e1e-a1e9-b4fffb4ebaf5'
-- ORDER BY name;
