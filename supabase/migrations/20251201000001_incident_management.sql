-- =====================================================
-- INCIDENT MANAGEMENT SYSTEM
-- =====================================================
-- This migration creates tables for tracking incidents
-- and linking them to risks for better risk management.
-- =====================================================

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS incident_risk_links CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;

-- =====================================================
-- INCIDENTS TABLE
-- =====================================================
-- Tracks security incidents, operational failures, near-misses, etc.
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic Information
  incident_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: INC-2025-001
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  incident_type VARCHAR(50) NOT NULL, -- 'security', 'operational', 'compliance', 'financial', 'reputational', 'other'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(30) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'contained', 'resolved', 'closed')),

  -- Timing
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL, -- When incident occurred
  discovered_date TIMESTAMP WITH TIME ZONE NOT NULL, -- When incident was discovered
  reported_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When incident was reported
  resolved_date TIMESTAMP WITH TIME ZONE, -- When incident was resolved
  closed_date TIMESTAMP WITH TIME ZONE, -- When incident was closed

  -- Impact Assessment
  impact_description TEXT,
  financial_impact DECIMAL(15, 2), -- Estimated or actual financial loss
  affected_systems TEXT[], -- List of affected systems/processes
  affected_customers INTEGER DEFAULT 0,
  data_breach BOOLEAN DEFAULT FALSE,

  -- Root Cause Analysis
  root_cause_id UUID REFERENCES root_cause_register(id),
  root_cause_description TEXT,
  contributing_factors TEXT[],

  -- Assignment & Ownership
  reported_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  investigated_by UUID[], -- Array of user IDs

  -- Resolution
  resolution_summary TEXT,
  corrective_actions TEXT[],
  preventive_actions TEXT[],
  lessons_learned TEXT,

  -- Regulatory & Compliance
  regulatory_notification_required BOOLEAN DEFAULT FALSE,
  regulatory_body VARCHAR(100),
  notification_date TIMESTAMP WITH TIME ZONE,
  regulatory_reference VARCHAR(100),

  -- Audit Trail
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb -- Store file references
);

-- =====================================================
-- INCIDENT-RISK LINKS (Many-to-Many)
-- =====================================================
-- Links incidents to one or more risks
CREATE TABLE incident_risk_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,

  -- Link metadata
  link_type VARCHAR(50) NOT NULL DEFAULT 'materialized', -- 'materialized', 'near_miss', 'control_failure'
  notes TEXT,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_by UUID REFERENCES users(id),

  -- Prevent duplicate links
  UNIQUE(incident_id, risk_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_incidents_org_id ON incidents(org_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_incident_date ON incidents(incident_date);
CREATE INDEX idx_incidents_incident_type ON incidents(incident_type);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_incident_number ON incidents(incident_number);

CREATE INDEX idx_incident_risk_links_incident_id ON incident_risk_links(incident_id);
CREATE INDEX idx_incident_risk_links_risk_id ON incident_risk_links(risk_id);

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_risk_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view incidents in their organization
CREATE POLICY "Users can view incidents in their org"
  ON incidents FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Users can create incidents in their organization
CREATE POLICY "Users can create incidents in their org"
  ON incidents FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- Policy: Users can update incidents in their organization
CREATE POLICY "Users can update incidents in their org"
  ON incidents FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Users can delete incidents in their organization (admins only via app logic)
CREATE POLICY "Users can delete incidents in their org"
  ON incidents FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Users can view incident-risk links in their organization
CREATE POLICY "Users can view incident-risk links in their org"
  ON incident_risk_links FOR SELECT
  USING (incident_id IN (
    SELECT id FROM incidents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));

-- Policy: Users can create incident-risk links in their organization
CREATE POLICY "Users can create incident-risk links in their org"
  ON incident_risk_links FOR INSERT
  WITH CHECK (incident_id IN (
    SELECT id FROM incidents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));

-- Policy: Users can update incident-risk links in their organization
CREATE POLICY "Users can update incident-risk links in their org"
  ON incident_risk_links FOR UPDATE
  USING (incident_id IN (
    SELECT id FROM incidents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));

-- Policy: Users can delete incident-risk links in their organization
CREATE POLICY "Users can delete incident-risk links in their org"
  ON incident_risk_links FOR DELETE
  USING (incident_id IN (
    SELECT id FROM incidents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));

-- =====================================================
-- FUNCTION: Generate incident number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_incident_number(p_org_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_count INTEGER;
  v_number VARCHAR(50);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count incidents for this org this year
  SELECT COUNT(*) + 1 INTO v_count
  FROM incidents
  WHERE org_id = p_org_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Format: INC-2025-001
  v_number := 'INC-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW: Incident Summary with Risk Links
-- =====================================================
CREATE OR REPLACE VIEW incident_summary AS
SELECT
  i.id,
  i.org_id,
  i.incident_number,
  i.title,
  i.description,
  i.incident_type,
  i.severity,
  i.status,
  i.incident_date,
  i.discovered_date,
  i.financial_impact,
  i.assigned_to,
  i.resolved_date,
  i.created_at,
  -- Count of linked risks
  COUNT(DISTINCT irl.risk_id) AS linked_risks_count,
  -- Array of linked risk IDs
  ARRAY_AGG(DISTINCT irl.risk_id) FILTER (WHERE irl.risk_id IS NOT NULL) AS linked_risk_ids,
  -- Array of linked risk titles
  ARRAY_AGG(DISTINCT r.title) FILTER (WHERE r.id IS NOT NULL) AS linked_risk_titles
FROM incidents i
LEFT JOIN incident_risk_links irl ON i.id = irl.incident_id
LEFT JOIN risks r ON irl.risk_id = r.id
GROUP BY
  i.id, i.org_id, i.incident_number, i.title, i.description,
  i.incident_type, i.severity, i.status, i.incident_date,
  i.discovered_date, i.financial_impact, i.assigned_to,
  i.resolved_date, i.created_at;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE incidents IS 'Tracks incidents, failures, breaches, and near-misses';
COMMENT ON TABLE incident_risk_links IS 'Many-to-many relationship between incidents and risks';
COMMENT ON COLUMN incidents.incident_number IS 'Auto-generated unique identifier (INC-2025-001)';
COMMENT ON COLUMN incidents.severity IS 'Impact severity: critical, high, medium, low';
COMMENT ON COLUMN incidents.status IS 'Lifecycle status: reported, investigating, contained, resolved, closed';
COMMENT ON COLUMN incident_risk_links.link_type IS 'Type of link: materialized (risk occurred), near_miss, control_failure';
