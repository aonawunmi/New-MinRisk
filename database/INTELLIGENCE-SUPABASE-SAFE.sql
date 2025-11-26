-- ============================================================================
-- Risk Intelligence - Supabase-Safe Migration
-- Creates tables first, then adds all constraints separately
-- ============================================================================

-- Drop existing tables if needed
DROP TABLE IF EXISTS risk_intelligence_treatment_log CASCADE;
DROP TABLE IF EXISTS intelligence_alerts CASCADE;
DROP TABLE IF EXISTS external_events CASCADE;

-- ============================================================================
-- STEP 1: CREATE TABLES (No constraints, no foreign keys)
-- ============================================================================

CREATE TABLE external_events (
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

CREATE TABLE intelligence_alerts (
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

CREATE TABLE risk_intelligence_treatment_log (
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

-- ============================================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- external_events foreign keys
ALTER TABLE external_events
  ADD CONSTRAINT fk_external_events_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- intelligence_alerts foreign keys
ALTER TABLE intelligence_alerts
  ADD CONSTRAINT fk_intelligence_alerts_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT fk_intelligence_alerts_event
  FOREIGN KEY (event_id) REFERENCES external_events(id) ON DELETE CASCADE;

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT fk_intelligence_alerts_reviewed_by
  FOREIGN KEY (reviewed_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- risk_intelligence_treatment_log foreign keys
ALTER TABLE risk_intelligence_treatment_log
  ADD CONSTRAINT fk_treatment_log_alert
  FOREIGN KEY (alert_id) REFERENCES intelligence_alerts(id) ON DELETE CASCADE;

ALTER TABLE risk_intelligence_treatment_log
  ADD CONSTRAINT fk_treatment_log_applied_by
  FOREIGN KEY (applied_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: ADD CHECK CONSTRAINTS
-- ============================================================================

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT check_confidence_score
  CHECK (confidence_score >= 0 AND confidence_score <= 100);

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT check_likelihood_change
  CHECK (likelihood_change >= -2 AND likelihood_change <= 2);

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT check_impact_change
  CHECK (impact_change >= -2 AND impact_change <= 2);

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT check_status
  CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'));

ALTER TABLE risk_intelligence_treatment_log
  ADD CONSTRAINT check_action_taken
  CHECK (action_taken IN ('accept', 'reject'));

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_external_events_org ON external_events(organization_id);
CREATE INDEX idx_external_events_source ON external_events(source);
CREATE INDEX idx_external_events_published ON external_events(published_date DESC);
CREATE INDEX idx_external_events_relevance ON external_events(relevance_checked);

CREATE INDEX idx_intelligence_alerts_org ON intelligence_alerts(organization_id);
CREATE INDEX idx_intelligence_alerts_event ON intelligence_alerts(event_id);
CREATE INDEX idx_intelligence_alerts_risk ON intelligence_alerts(risk_code);
CREATE INDEX idx_intelligence_alerts_status ON intelligence_alerts(status);
CREATE INDEX idx_intelligence_alerts_confidence ON intelligence_alerts(confidence_score DESC);

CREATE INDEX idx_treatment_log_alert ON risk_intelligence_treatment_log(alert_id);
CREATE INDEX idx_treatment_log_risk ON risk_intelligence_treatment_log(risk_code);
CREATE INDEX idx_treatment_log_action ON risk_intelligence_treatment_log(action_taken);
CREATE INDEX idx_treatment_log_date ON risk_intelligence_treatment_log(applied_at DESC);

-- ============================================================================
-- STEP 5: ENABLE RLS
-- ============================================================================

ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_intelligence_treatment_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES
-- ============================================================================

-- external_events policies
DROP POLICY IF EXISTS external_events_select_policy ON external_events;
CREATE POLICY external_events_select_policy ON external_events FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS external_events_insert_policy ON external_events;
CREATE POLICY external_events_insert_policy ON external_events FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS external_events_update_policy ON external_events;
CREATE POLICY external_events_update_policy ON external_events FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS external_events_delete_policy ON external_events;
CREATE POLICY external_events_delete_policy ON external_events FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- intelligence_alerts policies
DROP POLICY IF EXISTS intelligence_alerts_select_policy ON intelligence_alerts;
CREATE POLICY intelligence_alerts_select_policy ON intelligence_alerts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS intelligence_alerts_insert_policy ON intelligence_alerts;
CREATE POLICY intelligence_alerts_insert_policy ON intelligence_alerts FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS intelligence_alerts_update_policy ON intelligence_alerts;
CREATE POLICY intelligence_alerts_update_policy ON intelligence_alerts FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS intelligence_alerts_delete_policy ON intelligence_alerts;
CREATE POLICY intelligence_alerts_delete_policy ON intelligence_alerts FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- risk_intelligence_treatment_log policies
DROP POLICY IF EXISTS treatment_log_select_policy ON risk_intelligence_treatment_log;
CREATE POLICY treatment_log_select_policy ON risk_intelligence_treatment_log FOR SELECT
  USING (alert_id IN (SELECT id FROM intelligence_alerts WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS treatment_log_insert_policy ON risk_intelligence_treatment_log;
CREATE POLICY treatment_log_insert_policy ON risk_intelligence_treatment_log FOR INSERT
  WITH CHECK (alert_id IN (SELECT id FROM intelligence_alerts WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

-- ============================================================================
-- DONE! Risk Intelligence tables are ready
-- ============================================================================
