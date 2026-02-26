-- Migrate kri_risk_links from risk_id (UUID FK) to risk_code (TEXT)
-- The code and all migration SQL files expect risk_code (TEXT), but the staging
-- DB was created from an older schema that still has risk_id (UUID).
-- This migration converts existing data and aligns the schema.

-- 1. Drop views that depend on risk_id column (will recreate using risk_code)
DROP VIEW IF EXISTS kris_with_risks CASCADE;
DROP VIEW IF EXISTS risks_with_kris CASCADE;

-- 2. Add new risk_code column (if it doesn't already exist)
ALTER TABLE kri_risk_links ADD COLUMN IF NOT EXISTS risk_code TEXT;

-- 3. Populate risk_code from risks table using existing risk_id values
UPDATE kri_risk_links SET risk_code = r.risk_code
FROM risks r WHERE kri_risk_links.risk_id = r.id
AND kri_risk_links.risk_code IS NULL;

-- 4. Delete any orphan rows where risk_id doesn't match a valid risk
DELETE FROM kri_risk_links WHERE risk_code IS NULL;

-- 5. Make risk_code NOT NULL
ALTER TABLE kri_risk_links ALTER COLUMN risk_code SET NOT NULL;

-- 6. Drop the old risk_id column (FK constraint dropped automatically)
ALTER TABLE kri_risk_links DROP COLUMN IF EXISTS risk_id;

-- 7. Add unique constraint to prevent duplicate links
DO $$ BEGIN
  ALTER TABLE kri_risk_links ADD CONSTRAINT unique_kri_risk_link UNIQUE (kri_id, risk_code);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- 8. Recreate views using risk_code instead of risk_id
CREATE OR REPLACE VIEW kris_with_risks AS
SELECT
  kd.*,
  array_agg(DISTINCT krl.risk_code) FILTER (WHERE krl.risk_code IS NOT NULL) AS linked_risk_codes
FROM kri_definitions kd
LEFT JOIN kri_risk_links krl ON krl.kri_id = kd.id
GROUP BY kd.id;

CREATE OR REPLACE VIEW risks_with_kris AS
SELECT
  r.*,
  array_agg(DISTINCT kd.kri_code) FILTER (WHERE kd.kri_code IS NOT NULL) AS linked_kri_codes,
  count(DISTINCT kd.id) FILTER (WHERE kd.id IS NOT NULL) AS kri_count
FROM risks r
LEFT JOIN kri_risk_links krl ON krl.risk_code = r.risk_code
LEFT JOIN kri_definitions kd ON kd.id = krl.kri_id
GROUP BY r.id;
