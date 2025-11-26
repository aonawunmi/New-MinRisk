-- ============================================================================
-- Risk Intelligence Tables - Minimal Version (Step 4 of 9)
-- Run this after completing KRI tables (steps 1-3)
-- ============================================================================

-- External Events Table
CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  published_date TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  relevance_checked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Intelligence Alerts Table
CREATE TABLE IF NOT EXISTS intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  event_id UUID NOT NULL,
  risk_code TEXT NOT NULL,
  is_relevant BOOLEAN NOT NULL,
  confidence_score NUMERIC NOT NULL,
  likelihood_change INTEGER,
  impact_change INTEGER,
  ai_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  applied_to_risk BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Treatment Log Table
CREATE TABLE IF NOT EXISTS risk_intelligence_treatment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL,
  risk_code TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  previous_likelihood INTEGER,
  new_likelihood INTEGER,
  previous_impact INTEGER,
  new_impact INTEGER,
  notes TEXT,
  applied_by UUID NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
