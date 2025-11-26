-- ============================================================================
-- Risk Intelligence Tables - Add RLS Policies (Step 6 of 9)
-- Run this after 05-add-intelligence-constraints.sql
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_intelligence_treatment_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_events
CREATE POLICY external_events_select_policy ON external_events
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY external_events_insert_policy ON external_events
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY external_events_update_policy ON external_events
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY external_events_delete_policy ON external_events
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- RLS Policies for intelligence_alerts
CREATE POLICY intelligence_alerts_select_policy ON intelligence_alerts
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY intelligence_alerts_insert_policy ON intelligence_alerts
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY intelligence_alerts_update_policy ON intelligence_alerts
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY intelligence_alerts_delete_policy ON intelligence_alerts
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- RLS Policies for treatment_log
CREATE POLICY treatment_log_select_policy ON risk_intelligence_treatment_log
  FOR SELECT USING (
    alert_id IN (SELECT id FROM intelligence_alerts WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY treatment_log_insert_policy ON risk_intelligence_treatment_log
  FOR INSERT WITH CHECK (
    alert_id IN (SELECT id FROM intelligence_alerts WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );
