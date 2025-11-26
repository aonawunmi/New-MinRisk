/**
 * Risk Taxonomy Tables
 *
 * Creates the controlled risk taxonomy system for MinRisk.
 * Phase 1: Admin Taxonomy Management
 *
 * Structure:
 * - risk_categories: Main risk categories
 * - risk_subcategories: Sub-categories under each category
 */

-- ============================================================================
-- RISK CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL CHECK (LENGTH(description) <= 200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure category names are unique within organization
  UNIQUE(organization_id, name)
);

-- Index for faster lookups
CREATE INDEX idx_risk_categories_org ON risk_categories(organization_id);

-- RLS Policies for risk_categories
ALTER TABLE risk_categories ENABLE ROW LEVEL SECURITY;

-- Users can view categories in their organization
CREATE POLICY "Users can view their org's categories"
  ON risk_categories FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Only admins can insert categories
CREATE POLICY "Admins can insert categories"
  ON risk_categories FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

-- Only admins can update categories
CREATE POLICY "Admins can update categories"
  ON risk_categories FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

-- Only admins can delete categories (if no subcategories exist)
CREATE POLICY "Admins can delete categories"
  ON risk_categories FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

-- ============================================================================
-- RISK SUBCATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES risk_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL CHECK (LENGTH(description) <= 200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure subcategory names are unique within their category
  UNIQUE(category_id, name)
);

-- Index for faster lookups
CREATE INDEX idx_risk_subcategories_org ON risk_subcategories(organization_id);
CREATE INDEX idx_risk_subcategories_category ON risk_subcategories(category_id);

-- RLS Policies for risk_subcategories
ALTER TABLE risk_subcategories ENABLE ROW LEVEL SECURITY;

-- Users can view subcategories in their organization
CREATE POLICY "Users can view their org's subcategories"
  ON risk_subcategories FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Only admins can insert subcategories
CREATE POLICY "Admins can insert subcategories"
  ON risk_subcategories FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

-- Only admins can update subcategories
CREATE POLICY "Admins can update subcategories"
  ON risk_subcategories FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

-- Only admins can delete subcategories
CREATE POLICY "Admins can delete subcategories"
  ON risk_subcategories FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Check if a category can be deleted (has no subcategories or risks)
 */
CREATE OR REPLACE FUNCTION can_delete_category(category_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subcategory_count INTEGER;
  risk_count INTEGER;
BEGIN
  -- Check if category has subcategories
  SELECT COUNT(*) INTO subcategory_count
  FROM risk_subcategories
  WHERE category_id = category_id_param;

  IF subcategory_count > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check if category is assigned to any risks
  -- Note: This assumes risks table has a category_id column
  -- If risks use category names instead, this check would be different
  SELECT COUNT(*) INTO risk_count
  FROM risks
  WHERE category IN (
    SELECT name FROM risk_categories WHERE id = category_id_param
  );

  IF risk_count > 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

/**
 * Check if a subcategory can be deleted (not assigned to any risks)
 */
CREATE OR REPLACE FUNCTION can_delete_subcategory(subcategory_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  risk_count INTEGER;
BEGIN
  -- Check if subcategory is assigned to any risks
  SELECT COUNT(*) INTO risk_count
  FROM risks
  WHERE category IN (
    SELECT name FROM risk_subcategories WHERE id = subcategory_id_param
  );

  RETURN risk_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_categories_updated_at
  BEFORE UPDATE ON risk_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_subcategories_updated_at
  BEFORE UPDATE ON risk_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
