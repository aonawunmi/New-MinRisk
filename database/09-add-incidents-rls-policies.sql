-- ============================================================================
-- Incident Management Tables - Add RLS Policies and Triggers (Step 9 of 9)
-- Run this after 08-add-incidents-constraints.sql
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_enhancement_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incidents
CREATE POLICY incidents_select_policy ON incidents
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY incidents_insert_policy ON incidents
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY incidents_update_policy ON incidents
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY incidents_delete_policy ON incidents
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- RLS Policies for control_enhancement_plans
CREATE POLICY enhancement_plans_select_policy ON control_enhancement_plans
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY enhancement_plans_insert_policy ON control_enhancement_plans
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY enhancement_plans_update_policy ON control_enhancement_plans
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY enhancement_plans_delete_policy ON control_enhancement_plans
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_updated_at();
