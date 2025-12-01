-- ============================================================================
-- MinRisk: Fix Cascade Delete Behavior for Controls and KRI Links
-- ============================================================================
--
-- ISSUE: Controls currently have ON DELETE CASCADE, which deletes controls
--        when risks are deleted. This violates GRC best practices.
--
-- SOLUTION:
-- 1. Create junction tables for risk-control and risk-kri relationships
-- 2. Remove direct risk_id foreign key from controls table
-- 3. Update KRI risk links to use proper foreign keys with UUIDs
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create Risk-Control Junction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_control_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(risk_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_control_links_risk ON risk_control_links(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_control_links_control ON risk_control_links(control_id);

-- ============================================================================
-- STEP 2: Migrate Existing Control-Risk Relationships
-- ============================================================================

-- Copy existing risk-control relationships to junction table
INSERT INTO risk_control_links (risk_id, control_id, created_at)
SELECT
  risk_id,
  id as control_id,
  created_at
FROM controls
WHERE risk_id IS NOT NULL
ON CONFLICT (risk_id, control_id) DO NOTHING;

-- ============================================================================
-- STEP 3: Modify Controls Table (Remove CASCADE DELETE)
-- ============================================================================

-- Add control_code column if it doesn't exist (for standalone controls)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'controls' AND column_name = 'control_code'
  ) THEN
    ALTER TABLE controls ADD COLUMN control_code TEXT;
  END IF;
END $$;

-- Generate control codes for existing controls (if needed)
WITH numbered_controls AS (
  SELECT
    id,
    'CTRL-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') as new_code
  FROM controls
  WHERE control_code IS NULL
)
UPDATE controls
SET control_code = numbered_controls.new_code
FROM numbered_controls
WHERE controls.id = numbered_controls.id;

-- Make control_code unique
ALTER TABLE controls
  DROP CONSTRAINT IF EXISTS controls_control_code_unique,
  ADD CONSTRAINT controls_control_code_unique UNIQUE (control_code);

-- Drop the old cascading foreign key constraint
ALTER TABLE controls
  DROP CONSTRAINT IF EXISTS controls_risk_id_fkey;

-- Make risk_id nullable (controls can exist independently)
ALTER TABLE controls
  ALTER COLUMN risk_id DROP NOT NULL;

-- ============================================================================
-- STEP 4: Fix KRI Risk Links Table
-- ============================================================================

-- Create new KRI-Risk junction table with proper foreign keys
CREATE TABLE IF NOT EXISTS kri_risk_links_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  ai_link_confidence NUMERIC CHECK (ai_link_confidence >= 0 AND ai_link_confidence <= 100),
  linked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kri_id, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_kri_risk_links_v2_kri ON kri_risk_links_v2(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_v2_risk ON kri_risk_links_v2(risk_id);

-- Migrate data from old kri_risk_links (text-based risk_code) to new table (UUID-based)
INSERT INTO kri_risk_links_v2 (kri_id, risk_id, ai_link_confidence, linked_by, created_at)
SELECT
  krl.kri_id,
  r.id as risk_id,
  krl.ai_link_confidence,
  krl.linked_by,
  krl.created_at
FROM kri_risk_links krl
INNER JOIN risks r ON r.risk_code = krl.risk_code
ON CONFLICT (kri_id, risk_id) DO NOTHING;

-- Rename old table (keep for reference)
ALTER TABLE IF EXISTS kri_risk_links RENAME TO kri_risk_links_old;

-- Rename new table to replace old one
ALTER TABLE kri_risk_links_v2 RENAME TO kri_risk_links;

-- ============================================================================
-- STEP 5: Create Views for Easy Querying
-- ============================================================================

-- View: Risks with their controls
CREATE OR REPLACE VIEW risks_with_controls AS
SELECT
  r.*,
  json_agg(
    json_build_object(
      'id', c.id,
      'control_code', c.control_code,
      'name', c.name,
      'description', c.description,
      'control_type', c.control_type,
      'design_score', c.design_score,
      'implementation_score', c.implementation_score
    )
  ) FILTER (WHERE c.id IS NOT NULL) as controls
FROM risks r
LEFT JOIN risk_control_links rcl ON r.id = rcl.risk_id
LEFT JOIN controls c ON rcl.control_id = c.id
GROUP BY r.id;

-- View: Risks with their KRIs
CREATE OR REPLACE VIEW risks_with_kris AS
SELECT
  r.*,
  json_agg(
    json_build_object(
      'id', k.id,
      'kri_code', k.kri_code,
      'kri_name', k.kri_name,
      'category', k.category,
      'indicator_type', k.indicator_type,
      'threshold_direction', k.threshold_direction,
      'enabled', k.enabled
    )
  ) FILTER (WHERE k.id IS NOT NULL) as kris
FROM risks r
LEFT JOIN kri_risk_links krl ON r.id = krl.risk_id
LEFT JOIN kri_definitions k ON krl.kri_id = k.id
GROUP BY r.id;

-- View: Controls with their linked risks
CREATE OR REPLACE VIEW controls_with_risks AS
SELECT
  c.*,
  json_agg(
    json_build_object(
      'id', r.id,
      'risk_code', r.risk_code,
      'risk_title', r.risk_title,
      'status', r.status
    )
  ) FILTER (WHERE r.id IS NOT NULL) as linked_risks
FROM controls c
LEFT JOIN risk_control_links rcl ON c.id = rcl.control_id
LEFT JOIN risks r ON rcl.risk_id = r.id
GROUP BY c.id;

-- View: KRIs with their linked risks
CREATE OR REPLACE VIEW kris_with_risks AS
SELECT
  k.*,
  json_agg(
    json_build_object(
      'id', r.id,
      'risk_code', r.risk_code,
      'risk_title', r.risk_title,
      'status', r.status
    )
  ) FILTER (WHERE r.id IS NOT NULL) as linked_risks
FROM kri_definitions k
LEFT JOIN kri_risk_links krl ON k.id = krl.kri_id
LEFT JOIN risks r ON krl.risk_id = r.id
GROUP BY k.id;

-- ============================================================================
-- STEP 6: Add RLS Policies for Junction Tables
-- ============================================================================

-- Enable RLS on junction tables
ALTER TABLE risk_control_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_risk_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see links for risks in their organization
CREATE POLICY "Users can view risk-control links in their org"
  ON risk_control_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM risks
      WHERE risks.id = risk_control_links.risk_id
      AND risks.organization_id = current_org_id()
    )
  );

CREATE POLICY "Users can manage risk-control links in their org"
  ON risk_control_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM risks
      WHERE risks.id = risk_control_links.risk_id
      AND risks.organization_id = current_org_id()
    )
  );

CREATE POLICY "Users can view KRI-risk links in their org"
  ON kri_risk_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM risks
      WHERE risks.id = kri_risk_links.risk_id
      AND risks.organization_id = current_org_id()
    )
  );

CREATE POLICY "Users can manage KRI-risk links in their org"
  ON kri_risk_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM risks
      WHERE risks.id = kri_risk_links.risk_id
      AND risks.organization_id = current_org_id()
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that junction tables exist and have data
SELECT 'risk_control_links' as table_name, COUNT(*) as record_count FROM risk_control_links
UNION ALL
SELECT 'kri_risk_links', COUNT(*) FROM kri_risk_links;

-- Check that views work
SELECT COUNT(*) as risks_with_controls FROM risks_with_controls;
SELECT COUNT(*) as risks_with_kris FROM risks_with_kris;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ CASCADE DELETE FIX COMPLETED';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What Changed:';
  RAISE NOTICE '  1. Controls now use junction table (risk_control_links)';
  RAISE NOTICE '  2. KRIs now use proper UUID-based junction table (kri_risk_links)';
  RAISE NOTICE '  3. Deleting a risk will UNLINK controls/KRIs, not delete them';
  RAISE NOTICE '  4. Created views for easy querying (risks_with_controls, etc.)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Next Step:';
  RAISE NOTICE '  Update application code to use new junction tables and views';
END $$;
