-- ============================================================================
-- MinRisk Phase 2 & 3 Database Migration
-- ============================================================================
-- Date: 2025-11-20
-- Purpose: Create tables for KRI Monitoring, Risk Intelligence, and Incidents
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================================

-- ============================================================================
-- PHASE 2: KRI MONITORING TABLES
-- ============================================================================

-- KRI Definitions Table
CREATE TABLE IF NOT EXISTS kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- KRI Identity
  kri_code VARCHAR(50) NOT NULL,
  kri_name VARCHAR(255) NOT NULL,
  kri_description TEXT,
  kri_type VARCHAR(50) DEFAULT 'Quantitative', -- Quantitative or Qualitative

  -- Measurement Details
  unit_of_measure VARCHAR(100),
  frequency VARCHAR(50) DEFAULT 'Monthly', -- Daily, Weekly, Monthly, Quarterly, Annually

  -- Threshold Configuration
  threshold_direction VARCHAR(20) DEFAULT 'above', -- above, below, outside
  threshold_yellow_lower DECIMAL(15,2),
  threshold_yellow_upper DECIMAL(15,2),
  threshold_red_lower DECIMAL(15,2),
  threshold_red_upper DECIMAL(15,2),

  -- Risk Linking (JSONB array of risk_codes)
  linked_risk_codes TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT kri_definitions_unique_code UNIQUE (organization_id, kri_code)
);

-- KRI Data Entries Table
CREATE TABLE IF NOT EXISTS kri_data_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,

  -- Measurement Data
  value DECIMAL(15,2) NOT NULL,
  period VARCHAR(50), -- Q1 2025, Q2 2025, etc.
  alert_status VARCHAR(10) DEFAULT 'green', -- green, yellow, red

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KRI Alerts Table
CREATE TABLE IF NOT EXISTS kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  kri_code VARCHAR(50) NOT NULL,

  -- Alert Details
  alert_level VARCHAR(10) NOT NULL, -- yellow, red
  measured_value DECIMAL(15,2) NOT NULL,
  threshold_breached VARCHAR(50),

  -- Alert Status
  status VARCHAR(20) DEFAULT 'open', -- open, acknowledged, resolved
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PHASE 3A: RISK INTELLIGENCE TABLES
-- ============================================================================

-- External Events Table
CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event Details
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source VARCHAR(255),
  event_date DATE DEFAULT CURRENT_DATE,
  impact_summary TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intelligence Alerts Table (AI-powered risk correlation)
CREATE TABLE IF NOT EXISTS intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event and Risk Linkage
  event_id UUID NOT NULL REFERENCES external_events(id) ON DELETE CASCADE,
  event_title VARCHAR(500),
  risk_code VARCHAR(50) NOT NULL,

  -- AI Analysis Results
  is_relevant BOOLEAN DEFAULT false,
  confidence_score INTEGER DEFAULT 0, -- 0-100
  likelihood_change INTEGER DEFAULT 0, -- -2 to +2
  impact_change INTEGER DEFAULT 0, -- -2 to +2
  recommendation TEXT,
  ai_reasoning TEXT,

  -- Alert Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Intelligence Treatment Log
CREATE TABLE IF NOT EXISTS risk_intelligence_treatment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Alert Reference
  alert_id UUID NOT NULL REFERENCES intelligence_alerts(id) ON DELETE CASCADE,
  risk_code VARCHAR(50) NOT NULL,

  -- Treatment Actions
  action_taken VARCHAR(20) NOT NULL, -- accept, reject
  previous_likelihood INTEGER,
  new_likelihood INTEGER,
  previous_impact INTEGER,
  new_impact INTEGER,
  notes TEXT,

  -- Metadata
  applied_by UUID NOT NULL REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PHASE 3B: INCIDENT MANAGEMENT TABLES
-- ============================================================================

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Incident Identity
  incident_code VARCHAR(50) NOT NULL,
  incident_title VARCHAR(500) NOT NULL,
  incident_description TEXT,

  -- Incident Details
  incident_date DATE DEFAULT CURRENT_DATE,
  division VARCHAR(255),
  severity VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High, Critical

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'Open', -- Open, Investigating, Resolved, Closed

  -- Risk Linkage (array of risk_codes)
  linked_risk_codes TEXT[] DEFAULT '{}',

  -- AI Suggestions (JSONB)
  ai_suggested_risks JSONB DEFAULT '[]',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT incidents_unique_code UNIQUE (organization_id, incident_code)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- KRI Indexes
CREATE INDEX IF NOT EXISTS idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_code ON kri_definitions(kri_code);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_kri ON kri_data_entries(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_created ON kri_data_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_kri ON kri_alerts(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_status ON kri_alerts(status) WHERE status IN ('open', 'acknowledged');

-- Risk Intelligence Indexes
CREATE INDEX IF NOT EXISTS idx_external_events_org ON external_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_events_date ON external_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_event ON intelligence_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_risk ON intelligence_alerts(risk_code);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_status ON intelligence_alerts(status);
CREATE INDEX IF NOT EXISTS idx_treatment_log_alert ON risk_intelligence_treatment_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_treatment_log_risk ON risk_intelligence_treatment_log(risk_code);

-- Incident Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_code ON incidents(incident_code);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_intelligence_treatment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- KRI DEFINITIONS POLICIES
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own KRI definitions" ON kri_definitions;
DROP POLICY IF EXISTS "Admins can view all org KRI definitions" ON kri_definitions;
DROP POLICY IF EXISTS "Users can insert their own KRI definitions" ON kri_definitions;
DROP POLICY IF EXISTS "Users can update their own KRI definitions" ON kri_definitions;
DROP POLICY IF EXISTS "Users can delete their own KRI definitions" ON kri_definitions;

-- SELECT policies (user + admin pattern)
CREATE POLICY "Users can view their own KRI definitions"
  ON kri_definitions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all org KRI definitions"
  ON kri_definitions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'primary_admin', 'super_admin')
    )
  );

-- INSERT policy
CREATE POLICY "Users can insert their own KRI definitions"
  ON kri_definitions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- UPDATE policy
CREATE POLICY "Users can update their own KRI definitions"
  ON kri_definitions FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE policy
CREATE POLICY "Users can delete their own KRI definitions"
  ON kri_definitions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- KRI DATA ENTRIES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view KRI data entries" ON kri_data_entries;
DROP POLICY IF EXISTS "Users can insert KRI data entries" ON kri_data_entries;

CREATE POLICY "Users can view KRI data entries"
  ON kri_data_entries FOR SELECT
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions WHERE user_id = auth.uid()
      UNION
      SELECT id FROM kri_definitions WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'primary_admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Users can insert KRI data entries"
  ON kri_data_entries FOR INSERT
  WITH CHECK (
    kri_id IN (
      SELECT id FROM kri_definitions WHERE user_id = auth.uid()
      OR organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- KRI ALERTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view KRI alerts" ON kri_alerts;
DROP POLICY IF EXISTS "Users can update KRI alerts" ON kri_alerts;

CREATE POLICY "Users can view KRI alerts"
  ON kri_alerts FOR SELECT
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions WHERE user_id = auth.uid()
      UNION
      SELECT id FROM kri_definitions WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update KRI alerts"
  ON kri_alerts FOR UPDATE
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- EXTERNAL EVENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view org external events" ON external_events;
DROP POLICY IF EXISTS "Users can insert org external events" ON external_events;

CREATE POLICY "Users can view org external events"
  ON external_events FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert org external events"
  ON external_events FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- INTELLIGENCE ALERTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view intelligence alerts" ON intelligence_alerts;
DROP POLICY IF EXISTS "Users can update intelligence alerts" ON intelligence_alerts;

CREATE POLICY "Users can view intelligence alerts"
  ON intelligence_alerts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update intelligence alerts"
  ON intelligence_alerts FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- TREATMENT LOG POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view treatment log" ON risk_intelligence_treatment_log;
DROP POLICY IF EXISTS "Users can insert treatment log" ON risk_intelligence_treatment_log;

CREATE POLICY "Users can view treatment log"
  ON risk_intelligence_treatment_log FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert treatment log"
  ON risk_intelligence_treatment_log FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ) AND applied_by = auth.uid());

-- ============================================================================
-- INCIDENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own incidents" ON incidents;
DROP POLICY IF EXISTS "Admins can view all org incidents" ON incidents;
DROP POLICY IF EXISTS "Users can insert their own incidents" ON incidents;
DROP POLICY IF EXISTS "Users can update their own incidents" ON incidents;
DROP POLICY IF EXISTS "Users can delete their own incidents" ON incidents;

-- SELECT policies (user + admin pattern)
CREATE POLICY "Users can view their own incidents"
  ON incidents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all org incidents"
  ON incidents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'primary_admin', 'super_admin')
    )
  );

-- INSERT policy
CREATE POLICY "Users can insert their own incidents"
  ON incidents FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- UPDATE policy
CREATE POLICY "Users can update their own incidents"
  ON incidents FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE policy
CREATE POLICY "Users can delete their own incidents"
  ON incidents FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for tables with updated_at
DROP TRIGGER IF EXISTS update_kri_definitions_updated_at ON kri_definitions;
CREATE TRIGGER update_kri_definitions_updated_at
  BEFORE UPDATE ON kri_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_external_events_updated_at ON external_events;
CREATE TRIGGER update_external_events_updated_at
  BEFORE UPDATE ON external_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after migration to verify:

-- Check all tables exist
SELECT 'Tables Created' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'kri_definitions', 'kri_data_entries', 'kri_alerts',
  'external_events', 'intelligence_alerts', 'risk_intelligence_treatment_log',
  'incidents'
)
ORDER BY table_name;

-- Check RLS is enabled
SELECT 'RLS Status' AS status;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'kri_definitions', 'kri_data_entries', 'kri_alerts',
  'external_events', 'intelligence_alerts', 'risk_intelligence_treatment_log',
  'incidents'
)
ORDER BY tablename;

-- Check policies
SELECT 'RLS Policies Count' AS status;
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'kri_definitions', 'kri_data_entries', 'kri_alerts',
  'external_events', 'intelligence_alerts', 'risk_intelligence_treatment_log',
  'incidents'
)
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All Phase 2 & 3 tables created with:
-- ✅ Proper column types
-- ✅ Foreign key relationships
-- ✅ Indexes for performance
-- ✅ RLS policies for security (user + admin pattern)
-- ✅ Updated_at triggers
-- ✅ Unique constraints
-- ============================================================================
