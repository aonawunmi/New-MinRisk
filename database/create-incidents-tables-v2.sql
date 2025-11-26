/**
 * Create Incident Management Tables - Version 2
 * Fixed for Supabase SQL Editor execution
 *
 * Date: 2025-01-22
 */

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  incident_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  incident_date DATE NOT NULL,
  reported_by TEXT,
  division TEXT,
  department TEXT,
  incident_type TEXT,
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
  financial_impact NUMERIC,
  status TEXT NOT NULL DEFAULT 'Reported' CHECK (status IN ('Reported', 'Under Investigation', 'Resolved', 'Closed')),
  root_cause TEXT,
  corrective_actions TEXT,
  ai_suggested_risks JSONB DEFAULT '[]'::jsonb,
  ai_control_recommendations JSONB DEFAULT '[]'::jsonb,
  linked_risk_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, incident_code)
);

-- Control Enhancement Plans Table
CREATE TABLE IF NOT EXISTS control_enhancement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  control_gap TEXT NOT NULL,
  enhancement_plan TEXT NOT NULL,
  target_completion_date DATE,
  responsible_party TEXT,
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Completed', 'On Hold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_code ON incidents(incident_code);
CREATE INDEX IF NOT EXISTS idx_incidents_division ON incidents(division);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_linked_risks ON incidents USING GIN(linked_risk_codes);

CREATE INDEX IF NOT EXISTS idx_enhancement_plans_org ON control_enhancement_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_incident ON control_enhancement_plans(incident_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_risk ON control_enhancement_plans(risk_code);
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_status ON control_enhancement_plans(status);
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_target_date ON control_enhancement_plans(target_completion_date);

-- ============================================================================
-- 3. ENABLE ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_enhancement_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES - Incidents
-- ============================================================================

DROP POLICY IF EXISTS incidents_select_policy ON incidents;
CREATE POLICY incidents_select_policy ON incidents
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS incidents_insert_policy ON incidents;
CREATE POLICY incidents_insert_policy ON incidents
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS incidents_update_policy ON incidents;
CREATE POLICY incidents_update_policy ON incidents
  FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS incidents_delete_policy ON incidents;
CREATE POLICY incidents_delete_policy ON incidents
  FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 5. CREATE RLS POLICIES - Enhancement Plans
-- ============================================================================

DROP POLICY IF EXISTS enhancement_plans_select_policy ON control_enhancement_plans;
CREATE POLICY enhancement_plans_select_policy ON control_enhancement_plans
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS enhancement_plans_insert_policy ON control_enhancement_plans;
CREATE POLICY enhancement_plans_insert_policy ON control_enhancement_plans
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS enhancement_plans_update_policy ON control_enhancement_plans;
CREATE POLICY enhancement_plans_update_policy ON control_enhancement_plans
  FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS enhancement_plans_delete_policy ON control_enhancement_plans;
CREATE POLICY enhancement_plans_delete_policy ON control_enhancement_plans
  FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 6. CREATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incidents_updated_at ON incidents;
CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_updated_at();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
