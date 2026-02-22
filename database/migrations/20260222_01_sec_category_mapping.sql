-- Migration: 20260222_01_sec_category_mapping.sql
-- Purpose: Create SEC standard risk categories and mapping tables
-- Date: 2026-02-22
-- Context: SEC Nigeria mandates quarterly Risk Profile Reports using 5 standard
--          risk categories. This migration creates the mapping infrastructure
--          for CMOs to map their internal taxonomy to SEC categories.

-- ==============================================
-- PART 1: SEC STANDARD CATEGORIES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS sec_standard_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z_]+$'),
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sec_standard_categories IS 'SEC Nigeria standardized risk categories for quarterly reporting';

-- Seed the 5 SEC risk categories (from SEC Risk Profile Report template)
INSERT INTO sec_standard_categories (code, name, description, display_order) VALUES
  ('STRATEGIC',   'Strategic Risk',   'Risks arising from strategic decisions, business model, competitive positioning, and AUM growth', 1),
  ('MARKET',      'Market Risk',      'Risks from market movements including price, interest rate, exchange rate, and investment exposure', 2),
  ('REGULATORY',  'Regulatory Risk',  'Risks from regulatory changes, compliance failures, sanctions, and legal exposure', 3),
  ('OPERATIONAL', 'Operational Risk', 'Risks from internal processes, people, systems, physical security, and external events', 4),
  ('IT_CYBER',    'IT/Cyber Risk',    'Risks from information technology, cybersecurity, system downtime, and digital operations', 5)
ON CONFLICT (code) DO NOTHING;

-- Index for ordered lookups
CREATE INDEX IF NOT EXISTS idx_sec_std_cat_order ON sec_standard_categories(display_order);


-- ==============================================
-- PART 2: PER-ORGANIZATION CATEGORY MAPPINGS
-- ==============================================

-- Each CMO maps their internal risk categories to SEC's 5 standard categories.
-- This supports both the new taxonomy system (risk_categories table with UUIDs)
-- and the legacy TEXT-based category system (risks.category column).

-- Mapping for organizations using the risk_categories table
CREATE TABLE IF NOT EXISTS sec_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  internal_category_name TEXT NOT NULL,   -- The org's category name (from risk_categories.name or risks.category)
  sec_category_id UUID NOT NULL REFERENCES sec_standard_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Each internal category maps to exactly one SEC category per org
  UNIQUE(organization_id, internal_category_name)
);

COMMENT ON TABLE sec_category_mappings IS 'Per-organization mapping of internal risk categories to SEC standard categories';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sec_cat_map_org ON sec_category_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_sec_cat_map_sec ON sec_category_mappings(sec_category_id);


-- ==============================================
-- PART 3: DEFAULT MAPPINGS TABLE
-- ==============================================

-- Provides intelligent defaults based on category name keywords.
-- Used when a CMO first configures their mapping - these are suggestions.

CREATE TABLE IF NOT EXISTS sec_default_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_pattern TEXT NOT NULL,           -- Keyword to match (case-insensitive, partial match)
  sec_category_id UUID NOT NULL REFERENCES sec_standard_categories(id) ON DELETE CASCADE,
  priority INT DEFAULT 10,                 -- Lower = higher priority (for overlapping keywords)
  UNIQUE(keyword_pattern)
);

COMMENT ON TABLE sec_default_category_mappings IS 'Keyword-based default mappings for auto-suggesting SEC categories';

-- Seed default keyword mappings
INSERT INTO sec_default_category_mappings (keyword_pattern, sec_category_id, priority) VALUES
  -- Strategic Risk mappings
  ('strategic',        (SELECT id FROM sec_standard_categories WHERE code = 'STRATEGIC'),    1),
  ('business',         (SELECT id FROM sec_standard_categories WHERE code = 'STRATEGIC'),    5),
  ('innovation',       (SELECT id FROM sec_standard_categories WHERE code = 'STRATEGIC'),    5),
  ('governance',       (SELECT id FROM sec_standard_categories WHERE code = 'STRATEGIC'),    5),
  ('reputational',     (SELECT id FROM sec_standard_categories WHERE code = 'STRATEGIC'),    5),
  ('esg',              (SELECT id FROM sec_standard_categories WHERE code = 'STRATEGIC'),    5),
  ('sustainability',   (SELECT id FROM sec_standard_categories WHERE code = 'STRATEGIC'),    5),

  -- Market Risk mappings
  ('market',           (SELECT id FROM sec_standard_categories WHERE code = 'MARKET'),       1),
  ('financial',        (SELECT id FROM sec_standard_categories WHERE code = 'MARKET'),       3),
  ('credit',           (SELECT id FROM sec_standard_categories WHERE code = 'MARKET'),       3),
  ('liquidity',        (SELECT id FROM sec_standard_categories WHERE code = 'MARKET'),       3),
  ('investment',       (SELECT id FROM sec_standard_categories WHERE code = 'MARKET'),       5),

  -- Regulatory Risk mappings
  ('regulatory',       (SELECT id FROM sec_standard_categories WHERE code = 'REGULATORY'),   1),
  ('compliance',       (SELECT id FROM sec_standard_categories WHERE code = 'REGULATORY'),   1),
  ('legal',            (SELECT id FROM sec_standard_categories WHERE code = 'REGULATORY'),   3),
  ('conduct',          (SELECT id FROM sec_standard_categories WHERE code = 'REGULATORY'),   5),

  -- Operational Risk mappings
  ('operational',      (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  1),
  ('process',          (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  3),
  ('fraud',            (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  3),
  ('human capital',    (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  3),
  ('physical',         (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  5),
  ('safety',           (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  5),
  ('supply chain',     (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  5),
  ('project',          (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  5),
  ('product',          (SELECT id FROM sec_standard_categories WHERE code = 'OPERATIONAL'),  5),

  -- IT/Cyber Risk mappings
  ('cyber',            (SELECT id FROM sec_standard_categories WHERE code = 'IT_CYBER'),     1),
  ('technology',       (SELECT id FROM sec_standard_categories WHERE code = 'IT_CYBER'),     1),
  ('it ',              (SELECT id FROM sec_standard_categories WHERE code = 'IT_CYBER'),     3),
  ('information',      (SELECT id FROM sec_standard_categories WHERE code = 'IT_CYBER'),     5),
  ('digital',          (SELECT id FROM sec_standard_categories WHERE code = 'IT_CYBER'),     5)
ON CONFLICT (keyword_pattern) DO NOTHING;


-- ==============================================
-- PART 4: RLS POLICIES
-- ==============================================

-- sec_standard_categories: Everyone can read (they're global reference data)
ALTER TABLE sec_standard_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_std_cat_read_all ON sec_standard_categories;
CREATE POLICY sec_std_cat_read_all ON sec_standard_categories
  FOR SELECT
  USING (true);  -- Global reference data, readable by all authenticated users

DROP POLICY IF EXISTS sec_std_cat_admin_manage ON sec_standard_categories;
CREATE POLICY sec_std_cat_admin_manage ON sec_standard_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );


-- sec_category_mappings: Org users read own, admins write, regulator read all assigned
ALTER TABLE sec_category_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_cat_map_org_read ON sec_category_mappings;
CREATE POLICY sec_cat_map_org_read ON sec_category_mappings
  FOR SELECT
  USING (
    -- Org members can read their own mappings
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    -- Super admin can read all
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
    OR
    -- Regulators can read mappings for their assigned organizations
    EXISTS (
      SELECT 1 FROM regulator_access ra
      JOIN organization_regulators oreg ON ra.regulator_id = oreg.regulator_id
      WHERE ra.user_id = auth.uid()
        AND oreg.organization_id = sec_category_mappings.organization_id
    )
  );

DROP POLICY IF EXISTS sec_cat_map_admin_write ON sec_category_mappings;
CREATE POLICY sec_cat_map_admin_write ON sec_category_mappings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

DROP POLICY IF EXISTS sec_cat_map_admin_update ON sec_category_mappings;
CREATE POLICY sec_cat_map_admin_update ON sec_category_mappings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

DROP POLICY IF EXISTS sec_cat_map_admin_delete ON sec_category_mappings;
CREATE POLICY sec_cat_map_admin_delete ON sec_category_mappings
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );


-- sec_default_category_mappings: Everyone can read (reference data)
ALTER TABLE sec_default_category_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_default_map_read_all ON sec_default_category_mappings;
CREATE POLICY sec_default_map_read_all ON sec_default_category_mappings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS sec_default_map_admin_manage ON sec_default_category_mappings;
CREATE POLICY sec_default_map_admin_manage ON sec_default_category_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );


-- ==============================================
-- PART 5: HELPER FUNCTION
-- ==============================================

-- Function to auto-suggest SEC category for a given category name
CREATE OR REPLACE FUNCTION suggest_sec_category(p_category_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sec_category_id UUID;
  v_lower_name TEXT := LOWER(p_category_name);
BEGIN
  -- Try to match against keyword patterns (ordered by priority)
  SELECT sec_category_id INTO v_sec_category_id
  FROM sec_default_category_mappings
  WHERE v_lower_name LIKE '%' || keyword_pattern || '%'
  ORDER BY priority ASC
  LIMIT 1;

  -- Default to OPERATIONAL if no match found
  IF v_sec_category_id IS NULL THEN
    SELECT id INTO v_sec_category_id
    FROM sec_standard_categories
    WHERE code = 'OPERATIONAL';
  END IF;

  RETURN v_sec_category_id;
END;
$$;

COMMENT ON FUNCTION suggest_sec_category IS 'Suggests a SEC standard category for a given internal category name based on keyword matching';


-- ==============================================
-- MIGRATION TRACKING
-- ==============================================

-- Track migration execution (if _migrations table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_migrations') THEN
    INSERT INTO _migrations (name, executed_at)
    VALUES ('20260222_01_sec_category_mapping', NOW())
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;
