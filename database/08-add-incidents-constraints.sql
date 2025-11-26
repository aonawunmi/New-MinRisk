-- ============================================================================
-- Incident Management Tables - Add Constraints and Indexes (Step 8 of 9)
-- Run this after 07-create-incidents-tables-minimal.sql
-- ============================================================================

-- Add foreign keys to incidents
ALTER TABLE incidents
  ADD CONSTRAINT fk_incidents_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE incidents
  ADD CONSTRAINT fk_incidents_user
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add constraints to incidents
ALTER TABLE incidents
  ADD CONSTRAINT uk_incident_code
  UNIQUE(organization_id, incident_code);

ALTER TABLE incidents
  ADD CONSTRAINT ck_severity
  CHECK (severity >= 1 AND severity <= 5);

ALTER TABLE incidents
  ADD CONSTRAINT ck_incident_status
  CHECK (status IN ('Reported', 'Under Investigation', 'Resolved', 'Closed'));

-- Add foreign keys to control_enhancement_plans
ALTER TABLE control_enhancement_plans
  ADD CONSTRAINT fk_enhancement_plans_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE control_enhancement_plans
  ADD CONSTRAINT fk_enhancement_plans_incident
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;

-- Add constraints to control_enhancement_plans
ALTER TABLE control_enhancement_plans
  ADD CONSTRAINT ck_plan_status
  CHECK (status IN ('Planned', 'In Progress', 'Completed', 'On Hold'));

-- Create indexes
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
