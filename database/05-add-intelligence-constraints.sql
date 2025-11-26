-- ============================================================================
-- Risk Intelligence Tables - Add Constraints and Indexes (Step 5 of 9)
-- Run this after 04-create-intelligence-tables-minimal.sql
-- ============================================================================

-- Add foreign keys to external_events
ALTER TABLE external_events
  ADD CONSTRAINT fk_external_events_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add foreign keys to intelligence_alerts
ALTER TABLE intelligence_alerts
  ADD CONSTRAINT fk_intelligence_alerts_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT fk_intelligence_alerts_event
  FOREIGN KEY (event_id) REFERENCES external_events(id) ON DELETE CASCADE;

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT fk_intelligence_alerts_user
  FOREIGN KEY (reviewed_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add constraints to intelligence_alerts
ALTER TABLE intelligence_alerts
  ADD CONSTRAINT ck_confidence_score
  CHECK (confidence_score >= 0 AND confidence_score <= 100);

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT ck_likelihood_change
  CHECK (likelihood_change >= -2 AND likelihood_change <= 2);

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT ck_impact_change
  CHECK (impact_change >= -2 AND impact_change <= 2);

ALTER TABLE intelligence_alerts
  ADD CONSTRAINT ck_alert_status
  CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'));

-- Add foreign keys to treatment_log
ALTER TABLE risk_intelligence_treatment_log
  ADD CONSTRAINT fk_treatment_log_alert
  FOREIGN KEY (alert_id) REFERENCES intelligence_alerts(id) ON DELETE CASCADE;

ALTER TABLE risk_intelligence_treatment_log
  ADD CONSTRAINT fk_treatment_log_user
  FOREIGN KEY (applied_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add constraints to treatment_log
ALTER TABLE risk_intelligence_treatment_log
  ADD CONSTRAINT ck_action_taken
  CHECK (action_taken IN ('accept', 'reject'));

-- Create indexes
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
