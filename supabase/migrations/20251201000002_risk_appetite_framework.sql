-- =====================================================
-- RISK APPETITE FRAMEWORK
-- =====================================================
-- This migration creates tables for defining and tracking
-- organizational risk appetite and tolerance levels.
-- =====================================================

-- Drop existing tables if they exist (for clean reinstall)
DROP VIEW IF EXISTS risk_appetite_compliance CASCADE;
DROP TABLE IF EXISTS risk_appetite_breaches CASCADE;
DROP TABLE IF EXISTS risk_appetite CASCADE;

-- =====================================================
-- RISK APPETITE TABLE
-- =====================================================
-- Defines the organization's appetite for different risk categories
CREATE TABLE risk_appetite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Risk Category/Dimension
  risk_category VARCHAR(100) NOT NULL, -- Links to risk taxonomy categories
  division VARCHAR(100), -- Optional: appetite by division
  description TEXT,

  -- Appetite Definition
  appetite_statement TEXT NOT NULL, -- Qualitative statement of appetite
  appetite_level VARCHAR(20) NOT NULL CHECK (appetite_level IN ('averse', 'minimal', 'cautious', 'open', 'eager')),

  -- Quantitative Thresholds (based on risk scores)
  target_threshold INTEGER, -- Ideal maximum score (e.g., 6 - target is "Medium or below")
  tolerance_threshold INTEGER NOT NULL, -- Absolute maximum acceptable score (e.g., 9 - "High")
  critical_threshold INTEGER, -- Immediate escalation threshold (e.g., 15 - "Extreme")

  -- Count Limits
  max_high_risks INTEGER, -- Maximum number of "High" level risks allowed
  max_extreme_risks INTEGER DEFAULT 0, -- Maximum number of "Extreme" level risks (usually 0)

  -- Financial Thresholds
  max_financial_exposure DECIMAL(15, 2), -- Maximum financial exposure in currency
  currency VARCHAR(3) DEFAULT 'USD',

  -- Review & Monitoring
  review_frequency VARCHAR(20) NOT NULL DEFAULT 'quarterly' CHECK (review_frequency IN ('monthly', 'quarterly', 'semi-annual', 'annual')),
  next_review_date DATE,
  last_reviewed_date DATE,
  reviewed_by UUID REFERENCES users(id),

  -- Status & Compliance
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'breached', 'under_review', 'archived')),
  breach_notification_enabled BOOLEAN DEFAULT TRUE,
  escalation_required BOOLEAN DEFAULT FALSE,

  -- Board Approval
  board_approved BOOLEAN DEFAULT FALSE,
  board_approval_date DATE,
  board_minutes_reference VARCHAR(100),

  -- Audit Trail
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Notes
  notes TEXT,

  -- Unique constraint: one appetite definition per category per division per org
  UNIQUE(org_id, risk_category, COALESCE(division, ''))
);

-- =====================================================
-- RISK APPETITE BREACHES TABLE
-- =====================================================
-- Tracks when risk appetite is breached
CREATE TABLE risk_appetite_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_appetite_id UUID NOT NULL REFERENCES risk_appetite(id) ON DELETE CASCADE,

  -- Breach Details
  breach_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  breach_type VARCHAR(50) NOT NULL, -- 'threshold_exceeded', 'count_exceeded', 'financial_exceeded'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'breach', 'critical')),

  -- Measurements
  current_value DECIMAL(15, 2) NOT NULL, -- Current exposure
  threshold_value DECIMAL(15, 2) NOT NULL, -- Threshold that was breached
  variance_percentage DECIMAL(5, 2), -- How much over threshold (%)

  -- Context
  contributing_risks UUID[], -- Array of risk IDs contributing to breach
  description TEXT,

  -- Response
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'action_taken', 'resolved', 'accepted')),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Notification
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  notified_recipients TEXT[], -- Array of user IDs or emails

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_risk_appetite_org_id ON risk_appetite(org_id);
CREATE INDEX idx_risk_appetite_category ON risk_appetite(risk_category);
CREATE INDEX idx_risk_appetite_status ON risk_appetite(status);
CREATE INDEX idx_risk_appetite_next_review ON risk_appetite(next_review_date);

CREATE INDEX idx_appetite_breaches_org_id ON risk_appetite_breaches(org_id);
CREATE INDEX idx_appetite_breaches_appetite_id ON risk_appetite_breaches(risk_appetite_id);
CREATE INDEX idx_appetite_breaches_status ON risk_appetite_breaches(status);
CREATE INDEX idx_appetite_breaches_date ON risk_appetite_breaches(breach_date);

-- =====================================================
-- TRIGGERS: Update updated_at timestamp
-- =====================================================
CREATE TRIGGER update_risk_appetite_updated_at
  BEFORE UPDATE ON risk_appetite
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appetite_breaches_updated_at
  BEFORE UPDATE ON risk_appetite_breaches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE risk_appetite ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_appetite_breaches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view risk appetite in their organization
CREATE POLICY "Users can view risk appetite in their org"
  ON risk_appetite FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Admins can manage risk appetite (checked in app logic)
CREATE POLICY "Users can create risk appetite in their org"
  ON risk_appetite FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update risk appetite in their org"
  ON risk_appetite FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete risk appetite in their org"
  ON risk_appetite FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Users can view breaches in their organization
CREATE POLICY "Users can view breaches in their org"
  ON risk_appetite_breaches FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Policy: System can create breaches (via functions)
CREATE POLICY "System can create breaches"
  ON risk_appetite_breaches FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update breaches in their org"
  ON risk_appetite_breaches FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- =====================================================
-- VIEW: Risk Appetite Compliance Dashboard
-- =====================================================
CREATE OR REPLACE VIEW risk_appetite_compliance AS
SELECT
  ra.id AS appetite_id,
  ra.org_id,
  ra.risk_category,
  ra.division,
  ra.appetite_level,
  ra.appetite_statement,
  ra.target_threshold,
  ra.tolerance_threshold,
  ra.critical_threshold,
  ra.max_high_risks,
  ra.max_extreme_risks,
  ra.status AS appetite_status,

  -- Current Exposure Metrics
  COUNT(DISTINCT r.id) AS total_risks_in_category,
  COALESCE(AVG(r.likelihood_inherent * r.impact_inherent), 0) AS avg_inherent_score,
  COALESCE(AVG(CASE
    WHEN c.residual_likelihood IS NOT NULL AND c.residual_impact IS NOT NULL
    THEN c.residual_likelihood * c.residual_impact
    ELSE r.likelihood_inherent * r.impact_inherent
  END), 0) AS avg_residual_score,

  -- Risk Level Counts
  COUNT(CASE WHEN rl.level_name = 'Extreme' THEN 1 END) AS extreme_risk_count,
  COUNT(CASE WHEN rl.level_name = 'High' THEN 1 END) AS high_risk_count,
  COUNT(CASE WHEN rl.level_name = 'Medium' THEN 1 END) AS medium_risk_count,
  COUNT(CASE WHEN rl.level_name = 'Low' THEN 1 END) AS low_risk_count,

  -- Compliance Status
  CASE
    WHEN ra.critical_threshold IS NOT NULL
         AND AVG(r.likelihood_inherent * r.impact_inherent) > ra.critical_threshold
    THEN 'critical_breach'
    WHEN AVG(r.likelihood_inherent * r.impact_inherent) > ra.tolerance_threshold
    THEN 'tolerance_breach'
    WHEN ra.target_threshold IS NOT NULL
         AND AVG(r.likelihood_inherent * r.impact_inherent) > ra.target_threshold
    THEN 'above_target'
    ELSE 'within_appetite'
  END AS compliance_status,

  -- Count Compliance
  CASE
    WHEN ra.max_extreme_risks IS NOT NULL
         AND COUNT(CASE WHEN rl.level_name = 'Extreme' THEN 1 END) > ra.max_extreme_risks
    THEN TRUE
    WHEN ra.max_high_risks IS NOT NULL
         AND COUNT(CASE WHEN rl.level_name = 'High' THEN 1 END) > ra.max_high_risks
    THEN TRUE
    ELSE FALSE
  END AS count_breach,

  -- Active Breaches
  COUNT(DISTINCT rab.id) FILTER (WHERE rab.status = 'active') AS active_breaches,

  -- Review Status
  CASE
    WHEN ra.next_review_date < CURRENT_DATE THEN 'overdue'
    WHEN ra.next_review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
    ELSE 'current'
  END AS review_status,

  ra.next_review_date,
  ra.last_reviewed_date

FROM risk_appetite ra
LEFT JOIN risks r ON r.category = ra.risk_category
  AND r.org_id = ra.org_id
  AND (ra.division IS NULL OR r.division = ra.division)
  AND r.status != 'closed'
LEFT JOIN (
  SELECT DISTINCT ON (risk_id)
    risk_id,
    residual_likelihood,
    residual_impact
  FROM controls
  ORDER BY risk_id, created_at DESC
) c ON c.risk_id = r.id
LEFT JOIN risk_levels rl ON rl.org_id = ra.org_id
  AND (r.likelihood_inherent * r.impact_inherent) BETWEEN rl.min_score AND rl.max_score
LEFT JOIN risk_appetite_breaches rab ON rab.risk_appetite_id = ra.id
  AND rab.status = 'active'
WHERE ra.status = 'active'
GROUP BY
  ra.id, ra.org_id, ra.risk_category, ra.division, ra.appetite_level,
  ra.appetite_statement, ra.target_threshold, ra.tolerance_threshold,
  ra.critical_threshold, ra.max_high_risks, ra.max_extreme_risks,
  ra.status, ra.next_review_date, ra.last_reviewed_date;

-- =====================================================
-- FUNCTION: Check Risk Appetite Compliance
-- =====================================================
CREATE OR REPLACE FUNCTION check_risk_appetite_compliance(p_org_id UUID)
RETURNS TABLE (
  category VARCHAR,
  compliance_status VARCHAR,
  current_avg_score DECIMAL,
  tolerance_threshold INTEGER,
  breach_detected BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rac.risk_category::VARCHAR,
    rac.compliance_status::VARCHAR,
    rac.avg_residual_score::DECIMAL,
    rac.tolerance_threshold,
    (rac.compliance_status IN ('tolerance_breach', 'critical_breach') OR rac.count_breach)::BOOLEAN
  FROM risk_appetite_compliance rac
  WHERE rac.org_id = p_org_id
  ORDER BY
    CASE rac.compliance_status
      WHEN 'critical_breach' THEN 1
      WHEN 'tolerance_breach' THEN 2
      WHEN 'above_target' THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Log Risk Appetite Breach
-- =====================================================
CREATE OR REPLACE FUNCTION log_risk_appetite_breach(
  p_risk_appetite_id UUID,
  p_breach_type VARCHAR,
  p_severity VARCHAR,
  p_current_value DECIMAL,
  p_threshold_value DECIMAL,
  p_contributing_risks UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_breach_id UUID;
  v_org_id UUID;
  v_variance DECIMAL;
BEGIN
  -- Get org_id
  SELECT org_id INTO v_org_id
  FROM risk_appetite
  WHERE id = p_risk_appetite_id;

  -- Calculate variance percentage
  v_variance := ((p_current_value - p_threshold_value) / p_threshold_value) * 100;

  -- Insert breach record
  INSERT INTO risk_appetite_breaches (
    org_id,
    risk_appetite_id,
    breach_type,
    severity,
    current_value,
    threshold_value,
    variance_percentage,
    contributing_risks,
    status
  ) VALUES (
    v_org_id,
    p_risk_appetite_id,
    p_breach_type,
    p_severity,
    p_current_value,
    p_threshold_value,
    v_variance,
    p_contributing_risks,
    'active'
  )
  RETURNING id INTO v_breach_id;

  -- Update risk appetite status
  UPDATE risk_appetite
  SET
    status = 'breached',
    escalation_required = (p_severity = 'critical'),
    updated_at = NOW()
  WHERE id = p_risk_appetite_id;

  RETURN v_breach_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE risk_appetite IS 'Defines organizational risk appetite and tolerance levels';
COMMENT ON TABLE risk_appetite_breaches IS 'Tracks breaches of risk appetite thresholds';
COMMENT ON VIEW risk_appetite_compliance IS 'Dashboard view showing current risk exposure vs appetite';
COMMENT ON COLUMN risk_appetite.appetite_level IS 'Qualitative appetite: averse, minimal, cautious, open, eager';
COMMENT ON COLUMN risk_appetite.tolerance_threshold IS 'Maximum acceptable risk score';
COMMENT ON COLUMN risk_appetite.target_threshold IS 'Ideal target risk score';
