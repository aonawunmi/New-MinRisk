-- Migration: Risk Appetite Framework
-- Description: Define organizational risk appetite and track tolerance exceptions
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #10 (Nice-to-Have V2.0)

-- ============================================================================
-- CREATE RISK APPETITE STATEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_appetite_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_category VARCHAR(100) NOT NULL,

  -- Appetite statement
  appetite_statement TEXT NOT NULL,
  appetite_level VARCHAR(20) CHECK (appetite_level IN ('Risk Averse', 'Risk Cautious', 'Risk Balanced', 'Risk Seeking', 'Risk Aggressive')),

  -- Quantitative thresholds
  max_acceptable_likelihood INTEGER CHECK (max_acceptable_likelihood BETWEEN 1 AND 5),
  max_acceptable_impact INTEGER CHECK (max_acceptable_impact BETWEEN 1 AND 5),
  max_acceptable_score INTEGER CHECK (max_acceptable_score BETWEEN 1 AND 25),

  -- Escalation and tolerance
  escalation_threshold INTEGER CHECK (escalation_threshold BETWEEN 1 AND 25),
  board_tolerance INTEGER CHECK (board_tolerance BETWEEN 1 AND 25),

  -- Review cycle
  review_frequency VARCHAR(20) CHECK (review_frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual')),
  last_reviewed_at DATE,
  next_review_date DATE,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, risk_category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appetite_org ON risk_appetite_statements(organization_id);
CREATE INDEX IF NOT EXISTS idx_appetite_category ON risk_appetite_statements(risk_category);
CREATE INDEX IF NOT EXISTS idx_appetite_next_review ON risk_appetite_statements(next_review_date);

-- ============================================================================
-- CREATE RISK TOLERANCE EXCEPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_tolerance_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Exception details
  exception_reason TEXT NOT NULL,
  business_justification TEXT NOT NULL,
  compensating_controls TEXT,

  -- Approval
  requested_by UUID REFERENCES user_profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),

  -- Validity period
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  review_frequency VARCHAR(20) CHECK (review_frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual')),
  next_review_date DATE,

  -- Tracking
  review_count INTEGER DEFAULT 0,
  last_reviewed_at DATE,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exception_risk ON risk_tolerance_exceptions(risk_id);
CREATE INDEX IF NOT EXISTS idx_exception_org ON risk_tolerance_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_exception_status ON risk_tolerance_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exception_valid_until ON risk_tolerance_exceptions(valid_until);
CREATE INDEX IF NOT EXISTS idx_exception_next_review ON risk_tolerance_exceptions(next_review_date);

-- ============================================================================
-- POPULATE DEFAULT RISK APPETITE STATEMENTS
-- ============================================================================

INSERT INTO risk_appetite_statements (
  organization_id, risk_category, appetite_statement, appetite_level,
  max_acceptable_likelihood, max_acceptable_impact, max_acceptable_score,
  escalation_threshold, board_tolerance, review_frequency
) VALUES
('YOUR_ORG_ID', 'Financial Risk', 'We maintain a risk-cautious approach to financial risks, accepting minor variances but escalating material exposures. Board approval required for residual risks >15.', 'Risk Cautious', 3, 4, 12, 12, 15, 'Quarterly'),
('YOUR_ORG_ID', 'Operational Risk', 'We accept moderate operational risks that support innovation, but require strong controls for critical systems. Residual risks >12 require escalation.', 'Risk Balanced', 3, 4, 12, 12, 15, 'Quarterly'),
('YOUR_ORG_ID', 'Compliance & Legal Risk', 'We have minimal appetite for compliance and legal risks. All regulatory breaches escalated to board. Board tolerance capped at 9.', 'Risk Averse', 2, 3, 6, 6, 9, 'Quarterly'),
('YOUR_ORG_ID', 'Technology & Cyber Risk', 'We accept necessary technology risks to remain competitive, but maintain strong cybersecurity posture. Critical vulnerabilities escalated immediately.', 'Risk Balanced', 3, 4, 12, 12, 15, 'Quarterly'),
('YOUR_ORG_ID', 'Strategic Risk', 'We accept calculated strategic risks aligned with growth objectives, with board oversight for transformational initiatives. Board tolerance at 16.', 'Risk Seeking', 4, 4, 16, 12, 16, 'Semi-Annual'),
('YOUR_ORG_ID', 'Governance & Reputational Risk', 'We have low tolerance for reputational damage and governance failures. Board approval required for risks >9.', 'Risk Cautious', 2, 4, 8, 8, 9, 'Quarterly'),
('YOUR_ORG_ID', 'ESG & Sustainability Risk', 'We have minimal appetite for environmental and social risks that could harm stakeholders or communities.', 'Risk Averse', 2, 3, 6, 6, 9, 'Annual'),
('YOUR_ORG_ID', 'Supply Chain & Logistics Risk', 'We accept moderate supply chain risks but require contingency planning for critical dependencies.', 'Risk Balanced', 3, 3, 9, 9, 12, 'Semi-Annual'),
('YOUR_ORG_ID', 'Human Capital Risk', 'We maintain balanced approach to people risks, investing in retention and development while accepting natural attrition.', 'Risk Balanced', 3, 3, 9, 9, 12, 'Annual'),
('YOUR_ORG_ID', 'Project & Programme Risk', 'We accept project risks within budget and timeline tolerances, with escalation for strategic programs.', 'Risk Balanced', 3, 4, 12, 10, 12, 'Quarterly')
ON CONFLICT (organization_id, risk_category) DO NOTHING;

-- ============================================================================
-- TRIGGER: Auto-expire Exceptions
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_expire_exceptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-expire exceptions past their valid_until date
  UPDATE risk_tolerance_exceptions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'approved'
    AND valid_until < CURRENT_DATE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Run daily via cron or manually
-- SELECT auto_expire_exceptions();

-- ============================================================================
-- CREATE VIEWS FOR APPETITE MONITORING
-- ============================================================================

-- View: Risks Exceeding Appetite
CREATE OR REPLACE VIEW risks_exceeding_appetite_view AS
SELECT
  r.id as risk_id,
  r.organization_id,
  r.title,
  r.category,
  r.status,
  r.inherent_likelihood,
  r.inherent_impact,
  (r.inherent_likelihood * r.inherent_impact) as inherent_score,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,
  -- Appetite thresholds
  ras.appetite_level,
  ras.max_acceptable_score,
  ras.escalation_threshold,
  ras.board_tolerance,
  -- Appetite breach analysis
  CASE
    WHEN r.residual_score > ras.board_tolerance THEN 'Board Action Required'
    WHEN r.residual_score > ras.escalation_threshold THEN 'Escalation Required'
    WHEN r.residual_score > ras.max_acceptable_score THEN 'Outside Appetite'
    ELSE 'Within Appetite'
  END as appetite_status,
  r.residual_score - ras.max_acceptable_score as score_above_appetite,
  -- Exception status
  rte.status as exception_status,
  rte.valid_until as exception_valid_until,
  rte.business_justification as exception_justification
FROM risks r
LEFT JOIN risk_appetite_statements ras ON r.category = ras.risk_category AND r.organization_id = ras.organization_id
LEFT JOIN risk_tolerance_exceptions rte ON r.id = rte.risk_id AND rte.status = 'approved'
WHERE r.residual_score > COALESCE(ras.max_acceptable_score, 12)
   OR (r.inherent_likelihood * r.inherent_impact) > COALESCE(ras.board_tolerance, 15)
ORDER BY r.residual_score DESC;

-- View: Risk Appetite Dashboard
CREATE OR REPLACE VIEW risk_appetite_dashboard_view AS
SELECT
  ras.organization_id,
  ras.risk_category,
  ras.appetite_level,
  ras.appetite_statement,
  ras.max_acceptable_score,
  ras.escalation_threshold,
  ras.board_tolerance,
  -- Risk counts by appetite status
  COUNT(r.id) as total_risks,
  COUNT(r.id) FILTER (WHERE r.residual_score <= ras.max_acceptable_score) as within_appetite,
  COUNT(r.id) FILTER (WHERE r.residual_score > ras.max_acceptable_score AND r.residual_score <= ras.escalation_threshold) as outside_appetite,
  COUNT(r.id) FILTER (WHERE r.residual_score > ras.escalation_threshold AND r.residual_score <= ras.board_tolerance) as escalation_required,
  COUNT(r.id) FILTER (WHERE r.residual_score > ras.board_tolerance) as board_action_required,
  -- Exception counts
  COUNT(rte.id) FILTER (WHERE rte.status = 'approved') as approved_exceptions,
  COUNT(rte.id) FILTER (WHERE rte.status = 'pending') as pending_exceptions,
  -- Review status
  ras.last_reviewed_at,
  ras.next_review_date,
  CASE
    WHEN ras.next_review_date < CURRENT_DATE THEN 'Overdue for Review'
    WHEN ras.next_review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Review Due Soon'
    ELSE 'Current'
  END as review_status
FROM risk_appetite_statements ras
LEFT JOIN risks r ON ras.risk_category = r.category AND ras.organization_id = r.organization_id
LEFT JOIN risk_tolerance_exceptions rte ON r.id = rte.risk_id
WHERE ras.organization_id IS NOT NULL
GROUP BY ras.id, ras.organization_id, ras.risk_category, ras.appetite_level, ras.appetite_statement,
         ras.max_acceptable_score, ras.escalation_threshold, ras.board_tolerance,
         ras.last_reviewed_at, ras.next_review_date
ORDER BY board_action_required DESC, escalation_required DESC;

-- View: Exception Management
CREATE OR REPLACE VIEW exception_management_view AS
SELECT
  rte.id as exception_id,
  rte.organization_id,
  r.title as risk_title,
  r.category as risk_category,
  r.residual_score,
  rte.status,
  rte.exception_reason,
  rte.business_justification,
  rte.compensating_controls,
  -- Requestor
  req.email as requested_by_email,
  rte.requested_at,
  -- Approver
  app.email as approved_by_email,
  rte.approved_at,
  -- Validity
  rte.valid_from,
  rte.valid_until,
  CURRENT_DATE - rte.valid_until as days_until_expiry,
  rte.next_review_date,
  rte.review_count,
  rte.last_reviewed_at,
  -- Status assessment
  CASE
    WHEN rte.status = 'expired' THEN 'Expired - Needs Renewal'
    WHEN rte.status = 'approved' AND rte.valid_until < CURRENT_DATE THEN 'Expired'
    WHEN rte.status = 'approved' AND rte.valid_until <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    WHEN rte.status = 'approved' THEN 'Active'
    WHEN rte.status = 'pending' THEN 'Pending Approval'
    WHEN rte.status = 'rejected' THEN 'Rejected'
  END as exception_status
FROM risk_tolerance_exceptions rte
JOIN risks r ON rte.risk_id = r.id
LEFT JOIN user_profiles req ON rte.requested_by = req.id
LEFT JOIN user_profiles app ON rte.approved_by = app.id
ORDER BY
  CASE rte.status
    WHEN 'pending' THEN 1
    WHEN 'approved' THEN 2
    WHEN 'expired' THEN 3
    WHEN 'rejected' THEN 4
  END,
  rte.valid_until ASC NULLS LAST;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Request Risk Exception
CREATE OR REPLACE FUNCTION request_risk_exception(
  p_risk_id UUID,
  p_organization_id UUID,
  p_exception_reason TEXT,
  p_business_justification TEXT,
  p_compensating_controls TEXT,
  p_requested_by UUID,
  p_valid_until DATE,
  p_review_frequency VARCHAR DEFAULT 'Quarterly'
)
RETURNS UUID AS $$
DECLARE
  v_exception_id UUID;
BEGIN
  INSERT INTO risk_tolerance_exceptions (
    risk_id, organization_id, exception_reason, business_justification,
    compensating_controls, requested_by, valid_until, review_frequency,
    next_review_date
  )
  VALUES (
    p_risk_id, p_organization_id, p_exception_reason, p_business_justification,
    p_compensating_controls, p_requested_by, p_valid_until, p_review_frequency,
    CASE p_review_frequency
      WHEN 'Monthly' THEN CURRENT_DATE + INTERVAL '1 month'
      WHEN 'Quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
      WHEN 'Semi-Annual' THEN CURRENT_DATE + INTERVAL '6 months'
      WHEN 'Annual' THEN CURRENT_DATE + INTERVAL '1 year'
    END
  )
  RETURNING id INTO v_exception_id;

  RETURN v_exception_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Approve Risk Exception
CREATE OR REPLACE FUNCTION approve_risk_exception(
  p_exception_id UUID,
  p_approved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE risk_tolerance_exceptions
  SET
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_exception_id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE risk_appetite_statements IS 'Defines organizational risk appetite by category with quantitative thresholds';
COMMENT ON TABLE risk_tolerance_exceptions IS 'Tracks approved exceptions to risk appetite with validity periods';

COMMENT ON COLUMN risk_appetite_statements.appetite_level IS 'Risk Averse (minimal), Cautious, Balanced, Seeking, Aggressive';
COMMENT ON COLUMN risk_appetite_statements.max_acceptable_score IS 'Maximum residual risk score acceptable without escalation';
COMMENT ON COLUMN risk_appetite_statements.escalation_threshold IS 'Risk score requiring management escalation';
COMMENT ON COLUMN risk_appetite_statements.board_tolerance IS 'Maximum risk score board will tolerate';

COMMENT ON VIEW risks_exceeding_appetite_view IS 'Risks with residual scores exceeding organizational appetite thresholds';
COMMENT ON VIEW risk_appetite_dashboard_view IS 'Dashboard showing risk distribution relative to appetite by category';
COMMENT ON VIEW exception_management_view IS 'Management view of all risk appetite exceptions and their status';

COMMENT ON FUNCTION request_risk_exception IS 'Creates a new risk exception request for approval';
COMMENT ON FUNCTION approve_risk_exception IS 'Approves a pending risk exception';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: View risks exceeding appetite
-- SELECT * FROM risks_exceeding_appetite_view WHERE organization_id = 'YOUR_ORG_ID' ORDER BY residual_score DESC;

-- Example 2: View appetite dashboard
-- SELECT * FROM risk_appetite_dashboard_view WHERE organization_id = 'YOUR_ORG_ID';

-- Example 3: Request exception
-- SELECT request_risk_exception(
--   'risk-uuid', 'org-uuid',
--   'Strategic initiative requires accepting higher risk',
--   'Growth opportunity worth $5M with strong market validation',
--   'Monthly executive review; Enhanced monitoring controls',
--   'user-uuid', CURRENT_DATE + INTERVAL '6 months', 'Monthly'
-- );

-- Example 4: Approve exception
-- SELECT approve_risk_exception('exception-uuid', 'approver-user-uuid');
