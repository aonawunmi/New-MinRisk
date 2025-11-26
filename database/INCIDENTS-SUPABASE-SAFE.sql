-- ============================================================================
-- Incident Management - Supabase-Safe Migration
-- Creates tables first, then adds all constraints separately
-- ============================================================================

-- Drop existing tables if needed
DROP TABLE IF EXISTS control_enhancement_plans CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;

-- ============================================================================
-- STEP 1: CREATE TABLES (No constraints, no foreign keys)
-- ============================================================================

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  incident_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  incident_date DATE NOT NULL,
  reported_by TEXT,
  division TEXT,
  department TEXT,
  incident_type TEXT,
  severity INTEGER NOT NULL,
  financial_impact NUMERIC,
  status TEXT NOT NULL DEFAULT 'Reported',
  root_cause TEXT,
  corrective_actions TEXT,
  ai_suggested_risks JSONB DEFAULT '[]'::jsonb,
  ai_control_recommendations JSONB DEFAULT '[]'::jsonb,
  linked_risk_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE control_enhancement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  incident_id UUID NOT NULL,
  risk_code TEXT NOT NULL,
  control_gap TEXT NOT NULL,
  enhancement_plan TEXT NOT NULL,
  target_completion_date DATE,
  responsible_party TEXT,
  status TEXT NOT NULL DEFAULT 'Planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- incidents foreign keys
ALTER TABLE incidents
  ADD CONSTRAINT fk_incidents_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE incidents
  ADD CONSTRAINT fk_incidents_user
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- control_enhancement_plans foreign keys
ALTER TABLE control_enhancement_plans
  ADD CONSTRAINT fk_enhancement_plans_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE control_enhancement_plans
  ADD CONSTRAINT fk_enhancement_plans_incident
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: ADD CHECK CONSTRAINTS
-- ============================================================================

ALTER TABLE incidents
  ADD CONSTRAINT check_severity
  CHECK (severity >= 1 AND severity <= 5);

ALTER TABLE incidents
  ADD CONSTRAINT check_status
  CHECK (status IN ('Reported', 'Under Investigation', 'Resolved', 'Closed'));

ALTER TABLE control_enhancement_plans
  ADD CONSTRAINT check_enhancement_status
  CHECK (status IN ('Planned', 'In Progress', 'Completed', 'On Hold'));

-- ============================================================================
-- STEP 4: ADD UNIQUE CONSTRAINTS
-- ============================================================================

ALTER TABLE incidents
  ADD CONSTRAINT unique_org_incident_code
  UNIQUE (organization_id, incident_code);

-- ============================================================================
-- STEP 5: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_incidents_org ON incidents(organization_id);
CREATE INDEX idx_incidents_code ON incidents(incident_code);
CREATE INDEX idx_incidents_division ON incidents(division);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity DESC);
CREATE INDEX idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX idx_incidents_linked_risks ON incidents USING GIN(linked_risk_codes);

CREATE INDEX idx_enhancement_plans_org ON control_enhancement_plans(organization_id);
CREATE INDEX idx_enhancement_plans_incident ON control_enhancement_plans(incident_id);
CREATE INDEX idx_enhancement_plans_risk ON control_enhancement_plans(risk_code);
CREATE INDEX idx_enhancement_plans_status ON control_enhancement_plans(status);
CREATE INDEX idx_enhancement_plans_target_date ON control_enhancement_plans(target_completion_date);

-- ============================================================================
-- STEP 6: ENABLE RLS
-- ============================================================================

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_enhancement_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================================================

-- incidents policies
DROP POLICY IF EXISTS incidents_select_policy ON incidents;
CREATE POLICY incidents_select_policy ON incidents FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS incidents_insert_policy ON incidents;
CREATE POLICY incidents_insert_policy ON incidents FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS incidents_update_policy ON incidents;
CREATE POLICY incidents_update_policy ON incidents FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS incidents_delete_policy ON incidents;
CREATE POLICY incidents_delete_policy ON incidents FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- control_enhancement_plans policies
DROP POLICY IF EXISTS enhancement_plans_select_policy ON control_enhancement_plans;
CREATE POLICY enhancement_plans_select_policy ON control_enhancement_plans FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS enhancement_plans_insert_policy ON control_enhancement_plans;
CREATE POLICY enhancement_plans_insert_policy ON control_enhancement_plans FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS enhancement_plans_update_policy ON control_enhancement_plans;
CREATE POLICY enhancement_plans_update_policy ON control_enhancement_plans FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS enhancement_plans_delete_policy ON control_enhancement_plans;
CREATE POLICY enhancement_plans_delete_policy ON control_enhancement_plans FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- STEP 8: CREATE TRIGGERS
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
-- DONE! Incident Management tables are ready
-- ============================================================================
