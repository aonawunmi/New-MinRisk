-- ============================================================================
-- KRI Tables - Add RLS Policies and Triggers (Step 3 of 3)
-- Run this after 02-add-kri-constraints.sql
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_risk_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kri_definitions
CREATE POLICY kri_definitions_select_policy ON kri_definitions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY kri_definitions_insert_policy ON kri_definitions
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY kri_definitions_update_policy ON kri_definitions
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY kri_definitions_delete_policy ON kri_definitions
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- RLS Policies for kri_data_entries
CREATE POLICY kri_data_entries_select_policy ON kri_data_entries
  FOR SELECT USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY kri_data_entries_insert_policy ON kri_data_entries
  FOR INSERT WITH CHECK (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY kri_data_entries_update_policy ON kri_data_entries
  FOR UPDATE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY kri_data_entries_delete_policy ON kri_data_entries
  FOR DELETE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

-- RLS Policies for kri_alerts
CREATE POLICY kri_alerts_select_policy ON kri_alerts
  FOR SELECT USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY kri_alerts_insert_policy ON kri_alerts
  FOR INSERT WITH CHECK (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY kri_alerts_update_policy ON kri_alerts
  FOR UPDATE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

-- RLS Policies for kri_risk_links
CREATE POLICY kri_risk_links_select_policy ON kri_risk_links
  FOR SELECT USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY kri_risk_links_insert_policy ON kri_risk_links
  FOR INSERT WITH CHECK (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY kri_risk_links_delete_policy ON kri_risk_links
  FOR DELETE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_kri_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
CREATE TRIGGER kri_definitions_updated_at
  BEFORE UPDATE ON kri_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_kri_definitions_updated_at();
