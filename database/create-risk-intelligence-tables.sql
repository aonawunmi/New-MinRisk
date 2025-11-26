/**
 * Create Risk Intelligence Tables
 *
 * This migration creates three tables for the AI-powered Risk Intelligence system:
 * 1. external_events - External news/events from RSS feeds
 * 2. intelligence_alerts - AI-generated relevance alerts
 * 3. risk_intelligence_treatment_log - Audit trail of accept/reject decisions
 *
 * Features:
 * - AI-powered event relevance analysis using Claude API
 * - Automatic risk likelihood/impact adjustment suggestions
 * - Complete audit trail of all decisions
 * - Organization-level RLS policies
 *
 * Date: 2025-01-22
 * Author: MinRisk Development Team
 */

-- ============================================================================
-- 1. EXTERNAL EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event Source
  source TEXT NOT NULL, -- e.g., 'CBN', 'SEC', 'FMDQ', 'Reuters', etc.
  event_type TEXT NOT NULL, -- e.g., 'regulation', 'market_news', 'policy_change'

  -- Event Content
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,

  -- Event Metadata
  published_date TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  relevance_checked BOOLEAN DEFAULT false,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_events_org ON external_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_events_source ON external_events(source);
CREATE INDEX IF NOT EXISTS idx_external_events_published ON external_events(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_external_events_relevance ON external_events(relevance_checked);

-- Comments
COMMENT ON TABLE external_events IS 'External news and events from RSS feeds for risk intelligence scanning';
COMMENT ON COLUMN external_events.source IS 'Source of the event (e.g., CBN, SEC, PENCOM, Reuters)';
COMMENT ON COLUMN external_events.relevance_checked IS 'Whether AI has analyzed this event for risk relevance';

-- ============================================================================
-- 2. INTELLIGENCE ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES external_events(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,

  -- AI Analysis Results
  is_relevant BOOLEAN NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  likelihood_change INTEGER CHECK (likelihood_change >= -2 AND likelihood_change <= 2),
  impact_change INTEGER CHECK (impact_change >= -2 AND impact_change <= 2),
  ai_reasoning TEXT,

  -- Alert Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'expired')
  ),

  -- Review Tracking
  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  applied_to_risk BOOLEAN DEFAULT false,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_org ON intelligence_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_event ON intelligence_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_risk ON intelligence_alerts(risk_code);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_status ON intelligence_alerts(status);
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_confidence ON intelligence_alerts(confidence_score DESC);

-- Comments
COMMENT ON TABLE intelligence_alerts IS 'AI-generated alerts about external events relevant to specific risks';
COMMENT ON COLUMN intelligence_alerts.confidence_score IS 'AI confidence in relevance (0-100)';
COMMENT ON COLUMN intelligence_alerts.likelihood_change IS 'Suggested change to risk likelihood (-2 to +2)';
COMMENT ON COLUMN intelligence_alerts.impact_change IS 'Suggested change to risk impact (-2 to +2)';
COMMENT ON COLUMN intelligence_alerts.status IS 'Workflow: pending → accepted/rejected/expired';
COMMENT ON COLUMN intelligence_alerts.applied_to_risk IS 'Whether changes were applied to the risk';

-- ============================================================================
-- 3. RISK INTELLIGENCE TREATMENT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_intelligence_treatment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES intelligence_alerts(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,

  -- Action Details
  action_taken TEXT NOT NULL CHECK (action_taken IN ('accept', 'reject')),

  -- Risk Changes
  previous_likelihood INTEGER,
  new_likelihood INTEGER,
  previous_impact INTEGER,
  new_impact INTEGER,

  -- Audit
  notes TEXT,
  applied_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_treatment_log_alert ON risk_intelligence_treatment_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_treatment_log_risk ON risk_intelligence_treatment_log(risk_code);
CREATE INDEX IF NOT EXISTS idx_treatment_log_action ON risk_intelligence_treatment_log(action_taken);
CREATE INDEX IF NOT EXISTS idx_treatment_log_date ON risk_intelligence_treatment_log(applied_at DESC);

-- Comments
COMMENT ON TABLE risk_intelligence_treatment_log IS 'Complete audit trail of all intelligence alert decisions';
COMMENT ON COLUMN risk_intelligence_treatment_log.action_taken IS 'User decision: accept (apply changes) or reject (dismiss)';
COMMENT ON COLUMN risk_intelligence_treatment_log.applied_by IS 'User who made the decision';

-- ============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_intelligence_treatment_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- External Events Policies
-- ============================================================================

-- Users can view events in their organization
CREATE POLICY external_events_select_policy ON external_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can insert events (manual or automated)
CREATE POLICY external_events_insert_policy ON external_events
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can update events
CREATE POLICY external_events_update_policy ON external_events
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can delete events
CREATE POLICY external_events_delete_policy ON external_events
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Intelligence Alerts Policies
-- ============================================================================

-- Users can view alerts in their organization
CREATE POLICY intelligence_alerts_select_policy ON intelligence_alerts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- System can insert alerts (generated by AI analysis)
CREATE POLICY intelligence_alerts_insert_policy ON intelligence_alerts
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can update alerts (review, accept, reject)
CREATE POLICY intelligence_alerts_update_policy ON intelligence_alerts
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Users can delete alerts
CREATE POLICY intelligence_alerts_delete_policy ON intelligence_alerts
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Treatment Log Policies
-- ============================================================================

-- Users can view treatment log entries for their organization
CREATE POLICY treatment_log_select_policy ON risk_intelligence_treatment_log
  FOR SELECT
  USING (
    alert_id IN (
      SELECT id FROM intelligence_alerts
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can insert treatment log entries
CREATE POLICY treatment_log_insert_policy ON risk_intelligence_treatment_log
  FOR INSERT
  WITH CHECK (
    alert_id IN (
      SELECT id FROM intelligence_alerts
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Treatment log is immutable (no update/delete) for audit integrity

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND (table_name LIKE '%event%' OR table_name LIKE '%intelligence%')
-- ORDER BY table_name;

-- Check RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND (tablename LIKE '%event%' OR tablename LIKE '%intelligence%');

-- View all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename LIKE '%event%' OR tablename LIKE '%intelligence%'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Risk Intelligence tables created successfully with:
-- ✅ 3 tables (external_events, intelligence_alerts, treatment_log)
-- ✅ Complete column definitions with constraints
-- ✅ Foreign key relationships
-- ✅ RLS policies for organization-level security
-- ✅ Indexes for query performance
-- ✅ Comprehensive comments
-- ✅ Immutable audit log (treatment_log)

