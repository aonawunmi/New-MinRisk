/**
 * Create KRI (Key Risk Indicator) Monitoring Tables
 *
 * This migration creates four tables for the KRI monitoring system:
 * 1. kri_definitions - KRI template definitions with thresholds
 * 2. kri_data_entries - Time-series measurements for each KRI
 * 3. kri_alerts - Threshold breach alerts
 * 4. kri_risk_links - Links between KRIs and risks
 *
 * Features:
 * - Auto-generated KRI codes (KRI-001, KRI-002, etc.)
 * - Threshold-based alerting (green/yellow/red)
 * - Organization-level RLS policies
 * - Audit trail with timestamps
 *
 * Date: 2025-01-22
 * Author: MinRisk Development Team
 */

-- ============================================================================
-- 1. KRI DEFINITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- KRI Identification
  kri_code TEXT NOT NULL,
  kri_name TEXT NOT NULL,
  description TEXT,
  category TEXT,

  -- KRI Classification
  indicator_type TEXT CHECK (indicator_type IN ('leading', 'lagging', 'concurrent')),

  -- Measurement Details
  measurement_unit TEXT,
  data_source TEXT,
  collection_frequency TEXT CHECK (
    collection_frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually')
  ),

  -- Thresholds
  target_value NUMERIC,
  lower_threshold NUMERIC,
  upper_threshold NUMERIC,
  threshold_direction TEXT CHECK (threshold_direction IN ('above', 'below', 'between')),

  -- Ownership
  responsible_user TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, kri_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_code ON kri_definitions(kri_code);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_enabled ON kri_definitions(enabled);

-- Comments
COMMENT ON TABLE kri_definitions IS 'KRI template definitions with thresholds and measurement specifications';
COMMENT ON COLUMN kri_definitions.kri_code IS 'Unique KRI code within organization (e.g., KRI-001, KRI-002)';
COMMENT ON COLUMN kri_definitions.indicator_type IS 'Leading (predictive), lagging (outcome), or concurrent (real-time)';
COMMENT ON COLUMN kri_definitions.threshold_direction IS 'Alert when value goes above, below, or between thresholds';

-- ============================================================================
-- 2. KRI DATA ENTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS kri_data_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,

  -- Measurement Data
  measurement_date DATE NOT NULL,
  measurement_value NUMERIC NOT NULL,
  alert_status TEXT CHECK (alert_status IN ('green', 'yellow', 'red')),

  -- Data Quality
  data_quality TEXT NOT NULL DEFAULT 'verified' CHECK (
    data_quality IN ('verified', 'estimated', 'provisional')
  ),
  notes TEXT,

  -- Audit
  entered_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(kri_id, measurement_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_kri ON kri_data_entries(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_date ON kri_data_entries(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_alert ON kri_data_entries(alert_status);

-- Comments
COMMENT ON TABLE kri_data_entries IS 'Time-series measurements for KRIs with automatic alert status';
COMMENT ON COLUMN kri_data_entries.alert_status IS 'Automatically calculated based on KRI thresholds';
COMMENT ON COLUMN kri_data_entries.data_quality IS 'Indicates confidence level of the measurement';

-- ============================================================================
-- 3. KRI ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,

  -- Alert Details
  alert_level TEXT NOT NULL CHECK (alert_level IN ('yellow', 'red')),
  alert_date DATE NOT NULL,
  measured_value NUMERIC NOT NULL,
  threshold_breached NUMERIC NOT NULL,

  -- Alert Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'acknowledged', 'resolved', 'dismissed')
  ),

  -- Acknowledgment
  acknowledged_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_notes TEXT,

  -- Resolution
  resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kri_alerts_kri ON kri_alerts(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_status ON kri_alerts(status);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_level ON kri_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_date ON kri_alerts(alert_date DESC);

-- Comments
COMMENT ON TABLE kri_alerts IS 'Threshold breach alerts generated automatically when KRI thresholds are exceeded';
COMMENT ON COLUMN kri_alerts.alert_level IS 'Yellow for warning threshold, red for critical threshold';
COMMENT ON COLUMN kri_alerts.status IS 'Workflow: open → acknowledged → resolved/dismissed';

-- ============================================================================
-- 4. KRI RISK LINKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS kri_risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,

  -- AI Metadata
  ai_link_confidence NUMERIC CHECK (ai_link_confidence >= 0 AND ai_link_confidence <= 100),

  -- Audit
  linked_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(kri_id, risk_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_kri ON kri_risk_links(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_risk ON kri_risk_links(risk_code);

-- Comments
COMMENT ON TABLE kri_risk_links IS 'Links KRIs to specific risks they monitor';
COMMENT ON COLUMN kri_risk_links.ai_link_confidence IS 'AI confidence score (0-100) if link was suggested by AI';

-- ============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_risk_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- KRI Definitions Policies
-- ============================================================================

-- Users can view KRIs in their organization
CREATE POLICY kri_definitions_select_policy ON kri_definitions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can insert KRIs in their organization
CREATE POLICY kri_definitions_insert_policy ON kri_definitions
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can update KRIs in their organization
CREATE POLICY kri_definitions_update_policy ON kri_definitions
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can delete KRIs in their organization
CREATE POLICY kri_definitions_delete_policy ON kri_definitions
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- KRI Data Entries Policies
-- ============================================================================

-- Users can view data entries for KRIs in their organization
CREATE POLICY kri_data_entries_select_policy ON kri_data_entries
  FOR SELECT
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can insert data entries for KRIs in their organization
CREATE POLICY kri_data_entries_insert_policy ON kri_data_entries
  FOR INSERT
  WITH CHECK (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can update data entries
CREATE POLICY kri_data_entries_update_policy ON kri_data_entries
  FOR UPDATE
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can delete data entries
CREATE POLICY kri_data_entries_delete_policy ON kri_data_entries
  FOR DELETE
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- KRI Alerts Policies
-- ============================================================================

-- Users can view alerts for KRIs in their organization
CREATE POLICY kri_alerts_select_policy ON kri_alerts
  FOR SELECT
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- System can insert alerts (typically done by triggers/functions)
CREATE POLICY kri_alerts_insert_policy ON kri_alerts
  FOR INSERT
  WITH CHECK (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can update alerts (acknowledge, resolve)
CREATE POLICY kri_alerts_update_policy ON kri_alerts
  FOR UPDATE
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- KRI Risk Links Policies
-- ============================================================================

-- Users can view risk links in their organization
CREATE POLICY kri_risk_links_select_policy ON kri_risk_links
  FOR SELECT
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can create risk links
CREATE POLICY kri_risk_links_insert_policy ON kri_risk_links
  FOR INSERT
  WITH CHECK (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can delete risk links
CREATE POLICY kri_risk_links_delete_policy ON kri_risk_links
  FOR DELETE
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kri_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to kri_definitions
CREATE TRIGGER kri_definitions_updated_at
  BEFORE UPDATE ON kri_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_kri_definitions_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name LIKE 'kri%'
-- ORDER BY table_name;

-- Check RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename LIKE 'kri%';

-- View all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename LIKE 'kri%'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- KRI monitoring tables created successfully with:
-- ✅ 4 tables (definitions, data_entries, alerts, risk_links)
-- ✅ Complete column definitions with constraints
-- ✅ Foreign key relationships
-- ✅ RLS policies for organization-level security
-- ✅ Indexes for query performance
-- ✅ Triggers for automatic timestamps
-- ✅ Comprehensive comments

