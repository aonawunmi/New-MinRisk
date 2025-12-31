-- Migration: KRI/KCI Breach History Tracking
-- Description: Track when indicators breach thresholds and monitor resolution
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #11 (Nice-to-Have V2.0)

-- ============================================================================
-- CREATE INDICATOR BREACHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS indicator_breaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES kri_kci_library(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,

  -- Breach details
  breach_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  breach_level VARCHAR(10) NOT NULL CHECK (breach_level IN ('warning', 'critical')),
  measured_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  threshold_type VARCHAR(10) CHECK (threshold_type IN ('warning', 'critical')),

  -- Breach context
  measurement_unit VARCHAR(50),
  breach_percentage NUMERIC, -- How much over threshold (percentage)
  consecutive_breach_count INTEGER DEFAULT 1, -- How many times in a row this indicator breached

  -- Response and resolution
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'mitigating', 'resolved', 'false_positive')),
  action_taken TEXT,
  action_owner UUID REFERENCES user_profiles(id),
  priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Resolution tracking
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,
  breach_duration_hours NUMERIC, -- Calculated when resolved
  time_to_detect_hours NUMERIC, -- Time between breach and detection
  time_to_respond_hours NUMERIC, -- Time between detection and action

  -- Root cause analysis
  root_cause_analysis TEXT,
  preventive_actions TEXT,
  lessons_learned TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_breach_org ON indicator_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_breach_indicator ON indicator_breaches(indicator_id);
CREATE INDEX IF NOT EXISTS idx_breach_risk ON indicator_breaches(risk_id);
CREATE INDEX IF NOT EXISTS idx_breach_date ON indicator_breaches(breach_date);
CREATE INDEX IF NOT EXISTS idx_breach_status ON indicator_breaches(status);
CREATE INDEX IF NOT EXISTS idx_breach_level ON indicator_breaches(breach_level);
CREATE INDEX IF NOT EXISTS idx_breach_resolved ON indicator_breaches(resolved_at);

-- ============================================================================
-- TRIGGER: Calculate Breach Duration and Metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_breach_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate breach percentage over threshold
  IF NEW.threshold_value != 0 THEN
    NEW.breach_percentage := ROUND(
      ((NEW.measured_value - NEW.threshold_value) / ABS(NEW.threshold_value) * 100)::NUMERIC,
      2
    );
  END IF;

  -- Calculate breach duration when resolved
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    NEW.breach_duration_hours := ROUND(
      EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.breach_date)) / 3600,
      2
    );
  END IF;

  -- Auto-assign priority based on breach level and percentage
  IF NEW.priority IS NULL THEN
    NEW.priority := CASE
      WHEN NEW.breach_level = 'critical' AND NEW.breach_percentage > 50 THEN 'critical'
      WHEN NEW.breach_level = 'critical' THEN 'high'
      WHEN NEW.breach_percentage > 100 THEN 'high'
      WHEN NEW.breach_percentage > 50 THEN 'medium'
      ELSE 'low'
    END;
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_breach_metrics ON indicator_breaches;
CREATE TRIGGER trigger_calculate_breach_metrics
  BEFORE INSERT OR UPDATE ON indicator_breaches
  FOR EACH ROW
  EXECUTE FUNCTION calculate_breach_metrics();

-- ============================================================================
-- CREATE VIEWS FOR BREACH MONITORING
-- ============================================================================

-- View: Active Breaches
CREATE OR REPLACE VIEW active_breaches_view AS
SELECT
  ib.id as breach_id,
  ib.organization_id,
  ib.breach_date,
  ib.breach_level,
  ib.status,
  ib.priority,
  -- Indicator details
  kri.indicator_code,
  kri.indicator_name,
  kri.indicator_type,
  kri.indicator_category,
  kri.measurement_unit,
  -- Breach details
  ib.measured_value,
  ib.threshold_value,
  ib.breach_percentage,
  ib.consecutive_breach_count,
  -- Risk context
  r.id as risk_id,
  r.risk_title,
  r.category as risk_category,
  r.residual_score,
  -- Response
  ib.action_taken,
  -- owner.email removed
  -- Duration
  ROUND(EXTRACT(EPOCH FROM (NOW() - ib.breach_date)) / 3600, 1) as hours_active,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - ib.breach_date)) / 3600 > 48 THEN 'Overdue'
    WHEN EXTRACT(EPOCH FROM (NOW() - ib.breach_date)) / 3600 > 24 THEN 'Urgent'
    ELSE 'Active'
  END as urgency_status
FROM indicator_breaches ib
JOIN kri_kci_library kri ON ib.indicator_id = kri.id
LEFT JOIN risks r ON ib.risk_id = r.id
LEFT JOIN user_profiles owner ON ib.action_owner = owner.id
WHERE ib.status IN ('active', 'investigating', 'mitigating')
ORDER BY
  CASE ib.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  ib.breach_date ASC;

-- View: Breach Trends
CREATE OR REPLACE VIEW breach_trends_view AS
SELECT
  ib.organization_id,
  kri.indicator_code,
  kri.indicator_name,
  kri.indicator_type,
  kri.indicator_category,
  -- Breach statistics
  COUNT(*) as total_breaches,
  COUNT(*) FILTER (WHERE ib.breach_level = 'warning') as warning_breaches,
  COUNT(*) FILTER (WHERE ib.breach_level = 'critical') as critical_breaches,
  COUNT(*) FILTER (WHERE ib.status = 'resolved') as resolved_breaches,
  COUNT(*) FILTER (WHERE ib.status IN ('active', 'investigating', 'mitigating')) as active_breaches,
  -- Time metrics
  ROUND(AVG(ib.breach_duration_hours) FILTER (WHERE ib.breach_duration_hours IS NOT NULL), 2) as avg_resolution_hours,
  ROUND(MAX(ib.breach_duration_hours), 2) as max_resolution_hours,
  -- Frequency
  MIN(ib.breach_date) as first_breach_date,
  MAX(ib.breach_date) as latest_breach_date,
  ROUND(
    COUNT(*)::NUMERIC /
    GREATEST(EXTRACT(DAY FROM (MAX(ib.breach_date) - MIN(ib.breach_date))), 1),
    2
  ) as breaches_per_day,
  -- Severity analysis
  ROUND(AVG(ib.breach_percentage), 1) as avg_breach_percentage,
  MAX(ib.breach_percentage) as max_breach_percentage
FROM indicator_breaches ib
JOIN kri_kci_library kri ON ib.indicator_id = kri.id
GROUP BY ib.organization_id, kri.id, kri.indicator_code, kri.indicator_name, kri.indicator_type, kri.indicator_category
HAVING COUNT(*) > 0
ORDER BY total_breaches DESC, breaches_per_day DESC;

-- View: Breach Resolution Performance
CREATE OR REPLACE VIEW breach_resolution_performance_view AS
SELECT
  ib.organization_id,
  -- owner.email removed as action_owner
  -- Breach counts
  COUNT(*) as total_assigned_breaches,
  COUNT(*) FILTER (WHERE ib.status = 'resolved') as resolved_count,
  COUNT(*) FILTER (WHERE ib.status IN ('active', 'investigating', 'mitigating')) as active_count,
  COUNT(*) FILTER (WHERE ib.status = 'false_positive') as false_positive_count,
  -- Resolution metrics
  ROUND(
    COUNT(*) FILTER (WHERE ib.status = 'resolved')::NUMERIC / COUNT(*) * 100,
    1
  ) as resolution_rate_pct,
  ROUND(AVG(ib.breach_duration_hours) FILTER (WHERE ib.status = 'resolved'), 2) as avg_resolution_time_hours,
  ROUND(AVG(ib.breach_duration_hours) FILTER (WHERE ib.breach_level = 'critical' AND ib.status = 'resolved'), 2) as avg_critical_resolution_hours,
  -- Workload
  COUNT(*) FILTER (WHERE ib.priority = 'critical' AND ib.status IN ('active', 'investigating', 'mitigating')) as critical_active,
  COUNT(*) FILTER (WHERE ib.priority = 'high' AND ib.status IN ('active', 'investigating', 'mitigating')) as high_active
FROM indicator_breaches ib
LEFT JOIN user_profiles owner ON ib.action_owner = owner.id
WHERE ib.action_owner IS NOT NULL
GROUP BY ib.organization_id, owner.id
ORDER BY resolution_rate_pct DESC, avg_resolution_time_hours ASC;

-- View: Indicator Health Dashboard
CREATE OR REPLACE VIEW indicator_health_dashboard_view AS
SELECT
  kri.organization_id,
  kri.indicator_code,
  kri.indicator_name,
  kri.indicator_type,
  kri.indicator_category,
  kri.threshold_warning,
  kri.threshold_critical,
  -- Breach frequency
  COUNT(ib.id) as total_breaches_30d,
  COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '7 days') as breaches_7d,
  COUNT(ib.id) FILTER (WHERE ib.breach_level = 'critical') as critical_breaches_30d,
  -- Current status
  CASE
    WHEN COUNT(ib.id) FILTER (WHERE ib.status IN ('active', 'investigating', 'mitigating')) > 0 THEN 'Breached'
    WHEN COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '7 days') > 2 THEN 'Frequent Breaches'
    WHEN COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '30 days') > 0 THEN 'Stable'
    ELSE 'Healthy'
  END as health_status,
  -- Latest breach
  MAX(ib.breach_date) as latest_breach_date,
  MAX(ib.measured_value) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '30 days') as highest_measured_value,
  -- Trend
  CASE
    WHEN COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '7 days') >
         COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '14 days' AND ib.breach_date < NOW() - INTERVAL '7 days')
    THEN 'Worsening'
    WHEN COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '7 days') <
         COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '14 days' AND ib.breach_date < NOW() - INTERVAL '7 days')
    THEN 'Improving'
    ELSE 'Stable'
  END as trend
FROM kri_kci_library kri
LEFT JOIN indicator_breaches ib ON kri.id = ib.indicator_id AND ib.breach_date >= NOW() - INTERVAL '30 days'
WHERE kri.status = 'active'
GROUP BY kri.id, kri.organization_id, kri.indicator_code, kri.indicator_name,
         kri.indicator_type, kri.indicator_category,
         kri.threshold_warning, kri.threshold_critical
ORDER BY total_breaches_30d DESC, health_status;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Record Indicator Breach
CREATE OR REPLACE FUNCTION record_indicator_breach(
  p_organization_id UUID,
  p_indicator_id UUID,
  p_risk_id UUID,
  p_measured_value NUMERIC,
  p_breach_level VARCHAR DEFAULT 'warning'
)
RETURNS UUID AS $$
DECLARE
  v_indicator RECORD;
  v_threshold_value NUMERIC;
  v_breach_id UUID;
BEGIN
  -- Get indicator details
  SELECT * INTO v_indicator
  FROM kri_kci_library
  WHERE id = p_indicator_id AND organization_id = p_organization_id;

  IF v_indicator IS NULL THEN
    RAISE EXCEPTION 'Indicator % not found', p_indicator_id;
  END IF;

  -- Determine threshold value
  v_threshold_value := CASE p_breach_level
    WHEN 'critical' THEN v_indicator.threshold_critical
    ELSE v_indicator.threshold_warning
  END;

  -- Create breach record
  INSERT INTO indicator_breaches (
    organization_id, indicator_id, risk_id,
    breach_level, measured_value, threshold_value, threshold_type,
    measurement_unit
  )
  VALUES (
    p_organization_id, p_indicator_id, p_risk_id,
    p_breach_level, p_measured_value, v_threshold_value, p_breach_level,
    v_indicator.measurement_unit
  )
  RETURNING id INTO v_breach_id;

  RETURN v_breach_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Resolve Breach
CREATE OR REPLACE FUNCTION resolve_breach(
  p_breach_id UUID,
  p_resolved_by UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
  v_row_count INTEGER;
BEGIN
  UPDATE indicator_breaches
  SET
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = p_resolved_by,
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    updated_at = NOW()
  WHERE id = p_breach_id AND status != 'resolved';

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_updated := (v_row_count > 0);
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE indicator_breaches IS 'Tracks KRI/KCI threshold breaches with response and resolution history';

COMMENT ON COLUMN indicator_breaches.breach_level IS 'warning (threshold_warning) or critical (threshold_critical)';
COMMENT ON COLUMN indicator_breaches.breach_percentage IS 'Percentage by which measured value exceeded threshold';
COMMENT ON COLUMN indicator_breaches.consecutive_breach_count IS 'Number of consecutive breaches for this indicator';
COMMENT ON COLUMN indicator_breaches.breach_duration_hours IS 'Hours from breach to resolution';

COMMENT ON VIEW active_breaches_view IS 'Currently active indicator breaches requiring attention';
COMMENT ON VIEW breach_trends_view IS 'Historical breach trends by indicator showing frequency and resolution performance';
COMMENT ON VIEW breach_resolution_performance_view IS 'Performance metrics for individuals resolving breaches';
COMMENT ON VIEW indicator_health_dashboard_view IS 'Health status of all indicators based on recent breach activity';

COMMENT ON FUNCTION record_indicator_breach IS 'Creates a new breach record when an indicator exceeds its threshold';
COMMENT ON FUNCTION resolve_breach IS 'Marks a breach as resolved and calculates resolution time';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: Record a breach
-- SELECT record_indicator_breach(
--   'org-uuid', 'indicator-uuid', 'risk-uuid',
--   95.5,  -- measured value (e.g., CPU at 95.5%)
--   'critical'
-- );

-- Example 2: View active breaches
-- SELECT * FROM active_breaches_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' ORDER BY priority, hours_active DESC;

-- Example 3: Analyze breach trends
-- SELECT * FROM breach_trends_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND breaches_per_day > 1;

-- Example 4: Resolve a breach
-- SELECT resolve_breach(
--   'breach-uuid',
--   'resolver-user-uuid',
--   'Auto-scaling kicked in, CPU normalized to 65%'
-- );

-- Example 5: Check indicator health
-- SELECT * FROM indicator_health_dashboard_view
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND health_status != 'Healthy';
