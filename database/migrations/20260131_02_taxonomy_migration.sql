-- Migration: 20260131_02_taxonomy_migration.sql
-- Purpose: Map existing risks to master taxonomy categories
-- Date: 2026-01-31
-- Status: PENDING STAGING TEST
-- Decision: Silent migration with UNCLASSIFIED fallback (test data will be reset at go-live)

-- ==============================================
-- PART 1: VERIFY MASTER CATEGORIES EXIST
-- ==============================================

-- Master categories should already exist from previous migration
-- Just verify they're present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM master_risk_categories WHERE code = 'UNCLASSIFIED') THEN
    RAISE EXCEPTION 'Master risk categories not found. Run prerequisite migrations first.';
  END IF;
END $$;

-- ==============================================
-- PART 2: CREATE HELPER FUNCTION FOR CATEGORY MAPPING
-- ==============================================

-- Function to intelligently map old category text to master category
CREATE OR REPLACE FUNCTION map_legacy_category_to_master(p_category_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_master_id UUID;
BEGIN
  -- Normalize input (trim, uppercase for comparison)
  p_category_text := TRIM(UPPER(p_category_text));

  -- Try to map to master categories based on keywords
  CASE
    -- Financial/Credit Risk mapping
    WHEN p_category_text LIKE '%CREDIT%' OR p_category_text LIKE '%FINANCIAL%' THEN
      SELECT id INTO v_master_id FROM master_risk_categories WHERE code = 'CREDIT';

    -- Market Risk mapping
    WHEN p_category_text LIKE '%MARKET%' THEN
      SELECT id INTO v_master_id FROM master_risk_categories WHERE code = 'MARKET';

    -- Liquidity Risk mapping
    WHEN p_category_text LIKE '%LIQUIDITY%' OR p_category_text LIKE '%CAPITAL%' THEN
      SELECT id INTO v_master_id FROM master_risk_categories WHERE code = 'LIQUIDITY';

    -- Operational Risk mapping
    WHEN p_category_text LIKE '%OPERATIONAL%' OR p_category_text LIKE '%TECHNOLOGY%' OR p_category_text LIKE '%TECH%' THEN
      SELECT id INTO v_master_id FROM master_risk_categories WHERE code = 'OPERATIONAL';

    -- Legal/Compliance Risk mapping
    WHEN p_category_text LIKE '%LEGAL%' OR p_category_text LIKE '%REGULATORY%' OR p_category_text LIKE '%COMPLIANCE%' OR p_category_text LIKE '%CONDUCT%' THEN
      SELECT id INTO v_master_id FROM master_risk_categories WHERE code = 'LEGAL';

    -- Strategic Risk mapping
    WHEN p_category_text LIKE '%STRATEGIC%' OR p_category_text LIKE '%BUSINESS%' THEN
      SELECT id INTO v_master_id FROM master_risk_categories WHERE code = 'STRATEGIC';

    -- ESG Risk mapping
    WHEN p_category_text LIKE '%ESG%' OR p_category_text LIKE '%ENVIRONMENTAL%' OR p_category_text LIKE '%SOCIAL%' OR p_category_text LIKE '%GOVERNANCE%' THEN
      SELECT id INTO v_master_id FROM master_risk_categories WHERE code = 'ESG';

    -- Default to UNCLASSIFIED
    ELSE
      SELECT id INTO v_master_id FROM master_risk_categories WHERE code = 'UNCLASSIFIED';
  END CASE;

  RETURN v_master_id;
END;
$$;

-- ==============================================
-- PART 3: CREATE OR UPDATE RISK_CATEGORIES
-- ==============================================

-- For each unique old category text, create a risk_category entry
-- linked to the appropriate master category
DO $$
DECLARE
  v_category_text TEXT;
  v_master_id UUID;
  v_category_id UUID;
  v_org_id UUID;
  v_super_admin_id UUID;
BEGIN
  -- Get first super admin user for created_by
  SELECT id INTO v_super_admin_id
  FROM user_profiles
  WHERE role = 'super_admin'
  LIMIT 1;

  -- For each organization, create categories
  FOR v_org_id IN
    SELECT DISTINCT organization_id FROM risks WHERE category_id IS NULL
  LOOP
    -- Get distinct categories for this org
    FOR v_category_text IN
      SELECT DISTINCT category
      FROM risks
      WHERE organization_id = v_org_id
        AND category_id IS NULL
        AND category IS NOT NULL
    LOOP
      -- Map to master category
      v_master_id := map_legacy_category_to_master(v_category_text);

      -- Check if risk_category already exists for this org/name combo
      SELECT id INTO v_category_id
      FROM risk_categories
      WHERE organization_id = v_org_id
        AND name = v_category_text;

      -- If not exists, create it
      IF v_category_id IS NULL THEN
        INSERT INTO risk_categories (
          organization_id,
          name,
          description,
          master_category_id,
          created_by
        )
        VALUES (
          v_org_id,
          v_category_text,
          'Migrated from legacy category field',
          v_master_id,
          v_super_admin_id
        )
        RETURNING id INTO v_category_id;

        RAISE NOTICE 'Created risk_category: % -> master: %', v_category_text, v_master_id;
      ELSE
        -- Update existing with master_category_id if not set
        UPDATE risk_categories
        SET master_category_id = v_master_id
        WHERE id = v_category_id
          AND master_category_id IS NULL;

        RAISE NOTICE 'Updated existing risk_category: % -> master: %', v_category_text, v_master_id;
      END IF;

      -- Update all risks with this category text to use the category_id
      UPDATE risks
      SET category_id = v_category_id
      WHERE organization_id = v_org_id
        AND category = v_category_text
        AND category_id IS NULL;
    END LOOP;
  END LOOP;

  -- Handle risks with NULL category (map to UNCLASSIFIED)
  FOR v_org_id IN
    SELECT DISTINCT organization_id
    FROM risks
    WHERE category IS NULL
      AND category_id IS NULL
  LOOP
    v_master_id := (SELECT id FROM master_risk_categories WHERE code = 'UNCLASSIFIED');

    -- Get or create UNCLASSIFIED category for this org
    SELECT id INTO v_category_id
    FROM risk_categories
    WHERE organization_id = v_org_id
      AND name = 'Unclassified';

    IF v_category_id IS NULL THEN
      INSERT INTO risk_categories (
        organization_id,
        name,
        description,
        master_category_id,
        created_by
      )
      VALUES (
        v_org_id,
        'Unclassified',
        'Risks pending classification',
        v_master_id,
        v_super_admin_id
      )
      RETURNING id INTO v_category_id;
    END IF;

    -- Update risks with NULL category
    UPDATE risks
    SET category_id = v_category_id,
        category = 'Unclassified'
    WHERE organization_id = v_org_id
      AND category IS NULL
      AND category_id IS NULL;
  END LOOP;
END $$;

-- ==============================================
-- PART 4: UPDATE REGULATOR RISK SUMMARY VIEW
-- ==============================================

-- Drop and recreate the materialized view to use master categories
DROP MATERIALIZED VIEW IF EXISTS regulator_risk_summary CASCADE;

CREATE MATERIALIZED VIEW regulator_risk_summary AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.institution_type,
  mrc.code AS master_category_code,
  mrc.name AS master_category_name,
  COUNT(r.id) AS risk_count,
  AVG(r.likelihood_inherent * r.impact_inherent) AS avg_inherent_score,
  AVG(r.residual_score) AS avg_residual_score,
  SUM(CASE WHEN r.residual_score >= 16 THEN 1 ELSE 0 END) AS critical_risks,
  SUM(CASE WHEN r.residual_score >= 12 AND r.residual_score < 16 THEN 1 ELSE 0 END) AS high_risks,
  SUM(CASE WHEN r.residual_score >= 6 AND r.residual_score < 12 THEN 1 ELSE 0 END) AS medium_risks,
  SUM(CASE WHEN r.residual_score < 6 THEN 1 ELSE 0 END) AS low_risks,
  NOW() AS last_updated
FROM risks r
JOIN organizations o ON r.organization_id = o.id
LEFT JOIN risk_categories rc ON r.category_id = rc.id
LEFT JOIN master_risk_categories mrc ON rc.master_category_id = mrc.id
WHERE r.status IN ('OPEN')
GROUP BY o.id, o.name, o.institution_type, mrc.code, mrc.name;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX idx_reg_risk_summary_unique
  ON regulator_risk_summary(organization_id, COALESCE(master_category_code, ''));

-- Performance indexes
CREATE INDEX idx_reg_risk_summary_org ON regulator_risk_summary(organization_id);
CREATE INDEX idx_reg_risk_summary_category ON regulator_risk_summary(master_category_code);

-- ==============================================
-- PART 5: VERIFICATION QUERIES
-- ==============================================

-- Show migration results
DO $$
DECLARE
  v_total_risks INT;
  v_mapped_risks INT;
  v_unclassified_risks INT;
BEGIN
  SELECT COUNT(*) INTO v_total_risks FROM risks WHERE status = 'OPEN';
  SELECT COUNT(*) INTO v_mapped_risks FROM risks WHERE status = 'OPEN' AND category_id IS NOT NULL;

  SELECT COUNT(*) INTO v_unclassified_risks
  FROM risks r
  JOIN risk_categories rc ON r.category_id = rc.id
  JOIN master_risk_categories mrc ON rc.master_category_id = mrc.id
  WHERE r.status = 'OPEN' AND mrc.code = 'UNCLASSIFIED';

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'TAXONOMY MIGRATION COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total active risks: %', v_total_risks;
  RAISE NOTICE 'Risks with category_id: %', v_mapped_risks;
  RAISE NOTICE 'Risks in UNCLASSIFIED: %', v_unclassified_risks;
  RAISE NOTICE '==============================================';
END $$;

-- ==============================================
-- PART 6: ADD MIGRATION TRACKING
-- ==============================================

INSERT INTO _migrations (name, executed_at)
VALUES ('20260131_02_taxonomy_migration', NOW())
ON CONFLICT (name) DO NOTHING;

COMMENT ON FUNCTION map_legacy_category_to_master IS 'Maps old category text to master risk category IDs';
COMMENT ON MATERIALIZED VIEW regulator_risk_summary IS 'Pre-aggregated risk data by master category for regulator dashboards';
