-- ============================================================================
-- Incident Management Tables - Minimal Version (Step 7 of 9)
-- Run this after completing Intelligence tables (steps 4-6)
-- ============================================================================

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
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

-- Control Enhancement Plans Table
CREATE TABLE IF NOT EXISTS control_enhancement_plans (
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
