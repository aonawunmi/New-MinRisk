/**
 * Create Incident Management Tables
 *
 * This migration creates two tables for the AI-powered Incident Management system:
 * 1. incidents - Incident tracking with AI-powered risk suggestions
 * 2. control_enhancement_plans - Control improvement plans based on incidents
 *
 * Features:
 * - Auto-generated incident codes (INC-DIV-001, INC-OPS-002, etc.)
 * - AI-powered risk linking suggestions using Claude API
 * - AI-powered control adequacy assessment
 * - Complete incident lifecycle tracking
 * - Organization-level RLS policies
 *
 * Date: 2025-01-22
 * Author: MinRisk Development Team
 */

-- ============================================================================
-- 1. INCIDENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Incident Identification
  incident_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Incident Details
  incident_date DATE NOT NULL,
  reported_by TEXT,
  division TEXT,
  department TEXT,
  incident_type TEXT,

  -- Severity & Impact
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
  financial_impact NUMERIC,

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'Reported' CHECK (
    status IN ('Reported', 'Under Investigation', 'Resolved', 'Closed')
  ),

  -- Analysis
  root_cause TEXT,
  corrective_actions TEXT,

  -- AI-Powered Features
  ai_suggested_risks JSONB DEFAULT '[]'::jsonb,
  ai_control_recommendations JSONB DEFAULT '[]'::jsonb,
  linked_risk_codes TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, incident_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_code ON incidents(incident_code);
CREATE INDEX IF NOT EXISTS idx_incidents_division ON incidents(division);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_linked_risks ON incidents USING GIN(linked_risk_codes);

-- Comments
COMMENT ON TABLE incidents IS 'Incident tracking with AI-powered risk linking and control assessment';
COMMENT ON COLUMN incidents.incident_code IS 'Unique incident code (e.g., INC-OPS-001, INC-FIN-002)';
COMMENT ON COLUMN incidents.severity IS 'Severity rating from 1 (Low) to 5 (Critical)';
COMMENT ON COLUMN incidents.financial_impact IS 'Estimated or actual financial impact in base currency';
COMMENT ON COLUMN incidents.ai_suggested_risks IS 'JSONB array of AI-suggested risk links with confidence scores';
COMMENT ON COLUMN incidents.ai_control_recommendations IS 'JSONB array of AI-generated control assessments and recommendations';
COMMENT ON COLUMN incidents.linked_risk_codes IS 'Array of risk codes linked to this incident';

-- ============================================================================
-- 2. CONTROL ENHANCEMENT PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_enhancement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,

  -- Enhancement Details
  control_gap TEXT NOT NULL,
  enhancement_plan TEXT NOT NULL,
  target_completion_date DATE,
  responsible_party TEXT,

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (
    status IN ('Planned', 'In Progress', 'Completed', 'On Hold')
  ),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_org ON control_enhancement_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_incident ON control_enhancement_plans(incident_id);
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_risk ON control_enhancement_plans(risk_code);
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_status ON control_enhancement_plans(status);
CREATE INDEX IF NOT EXISTS idx_enhancement_plans_target_date ON control_enhancement_plans(target_completion_date);

-- Comments
COMMENT ON TABLE control_enhancement_plans IS 'Control improvement plans created in response to incidents';
COMMENT ON COLUMN control_enhancement_plans.control_gap IS 'Identified gap or weakness in existing controls';
COMMENT ON COLUMN control_enhancement_plans.enhancement_plan IS 'Detailed plan to address the control gap';
COMMENT ON COLUMN control_enhancement_plans.status IS 'Implementation status: Planned → In Progress → Completed/On Hold';

-- ============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_enhancement_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Incidents Policies
-- ============================================================================

-- Users can view incidents in their organization
CREATE POLICY incidents_select_policy ON incidents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can insert incidents
CREATE POLICY incidents_insert_policy ON incidents
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can update incidents in their organization
CREATE POLICY incidents_update_policy ON incidents
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can delete incidents in their organization
CREATE POLICY incidents_delete_policy ON incidents
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Control Enhancement Plans Policies
-- ============================================================================

-- Users can view enhancement plans in their organization
CREATE POLICY enhancement_plans_select_policy ON control_enhancement_plans
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can insert enhancement plans
CREATE POLICY enhancement_plans_insert_policy ON control_enhancement_plans
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can update enhancement plans
CREATE POLICY enhancement_plans_update_policy ON control_enhancement_plans
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can delete enhancement plans
CREATE POLICY enhancement_plans_delete_policy ON control_enhancement_plans
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create function to update updated_at timestamp for incidents
CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to incidents table
CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND (table_name = 'incidents' OR table_name = 'control_enhancement_plans')
-- ORDER BY table_name;

-- Check RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND (tablename = 'incidents' OR tablename = 'control_enhancement_plans');

-- View all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('incidents', 'control_enhancement_plans')
-- ORDER BY tablename, policyname;

-- Check JSONB and array columns
-- SELECT
--   column_name,
--   data_type,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'incidents'
-- AND (data_type = 'jsonb' OR data_type = 'ARRAY');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Incident Management tables created successfully with:
-- ✅ 2 tables (incidents, control_enhancement_plans)
-- ✅ Complete column definitions with constraints
-- ✅ Foreign key relationships
-- ✅ JSONB columns for AI data
-- ✅ TEXT ARRAY for linked risk codes
-- ✅ RLS policies for organization-level security
-- ✅ Indexes for query performance (including GIN index for arrays)
-- ✅ Triggers for automatic timestamps
-- ✅ Comprehensive comments

