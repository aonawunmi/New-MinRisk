/**
 * Create Risk Intelligence Tables - Version 2
 * Fixed for Supabase SQL Editor execution
 *
 * Date: 2025-01-22
 */

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- External Events Table
CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES external_events(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  is_relevant BOOLEAN NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  likelihood_change INTEGER CHECK (likelihood_change >= -2 AND likelihood_change <= 2),
  impact_change INTEGER CHECK (impact_change >= -2 AND impact_change <= 2),
  ai_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  applied_to_risk BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Treatment Log Table
CREATE TABLE IF NOT EXISTS risk_intelligence_treatment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES intelligence_alerts(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('accept', 'reject')),
  previous_likelihood INTEGER,
  new_likelihood INTEGER,
  previous_impact INTEGER,
  new_impact INTEGER,
  notes TEXT,
  applied_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_external_events_org ON external_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_events_source ON external_events(source);
CREATE INDEX IF NOT EXISTS idx_external_events_published ON external_events(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_external_events_relevance ON external_events(relevance_checked);

CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_org ON intelligence_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_event ON intelligence_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_risk ON intelligence_alerts(risk_code);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_status ON intelligence_alerts(status);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_confidence ON intelligence_alerts(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_treatment_log_alert ON risk_intelligence_treatment_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_treatment_log_risk ON risk_intelligence_treatment_log(risk_code);
CREATE INDEX IF NOT EXISTS idx_treatment_log_action ON risk_intelligence_treatment_log(action_taken);
CREATE INDEX IF NOT EXISTS idx_treatment_log_date ON risk_intelligence_treatment_log(applied_at DESC);

-- ============================================================================
-- 3. ENABLE ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_intelligence_treatment_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES - External Events
-- ============================================================================

DROP POLICY IF EXISTS external_events_select_policy ON external_events;
CREATE POLICY external_events_select_policy ON external_events
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS external_events_insert_policy ON external_events;
CREATE POLICY external_events_insert_policy ON external_events
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS external_events_update_policy ON external_events;
CREATE POLICY external_events_update_policy ON external_events
  FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS external_events_delete_policy ON external_events;
CREATE POLICY external_events_delete_policy ON external_events
  FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 5. CREATE RLS POLICIES - Intelligence Alerts
-- ============================================================================

DROP POLICY IF EXISTS intelligence_alerts_select_policy ON intelligence_alerts;
CREATE POLICY intelligence_alerts_select_policy ON intelligence_alerts
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS intelligence_alerts_insert_policy ON intelligence_alerts;
CREATE POLICY intelligence_alerts_insert_policy ON intelligence_alerts
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS intelligence_alerts_update_policy ON intelligence_alerts;
CREATE POLICY intelligence_alerts_update_policy ON intelligence_alerts
  FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS intelligence_alerts_delete_policy ON intelligence_alerts;
CREATE POLICY intelligence_alerts_delete_policy ON intelligence_alerts
  FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 6. CREATE RLS POLICIES - Treatment Log
-- ============================================================================

DROP POLICY IF EXISTS treatment_log_select_policy ON risk_intelligence_treatment_log;
CREATE POLICY treatment_log_select_policy ON risk_intelligence_treatment_log
  FOR SELECT
  USING (alert_id IN (SELECT id FROM intelligence_alerts WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS treatment_log_insert_policy ON risk_intelligence_treatment_log;
CREATE POLICY treatment_log_insert_policy ON risk_intelligence_treatment_log
  FOR INSERT
  WITH CHECK (alert_id IN (SELECT id FROM intelligence_alerts WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
