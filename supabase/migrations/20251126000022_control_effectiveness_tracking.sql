-- Migration: Control Effectiveness Tracking
-- Description: Track control testing and actual effectiveness vs theoretical DIME scores
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #7 (Important)

-- ============================================================================
-- CREATE CONTROL EFFECTIVENESS TESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_effectiveness_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES risks(id) ON DELETE SET NULL, -- Optional: test in context of specific risk

  -- Test metadata
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type VARCHAR(50) NOT NULL CHECK (test_type IN (
    'Initial Assessment',
    'Periodic Review',
    'Audit',
    'Incident-Driven',
    'Post-Implementation',
    'Continuous Monitoring'
  )),
  tester_id UUID REFERENCES user_profiles(id),
  tester_name VARCHAR(255),

  -- Actual DIME scores (as observed during testing)
  design_score_actual INTEGER CHECK (design_score_actual BETWEEN 0 AND 100),
  implementation_score_actual INTEGER CHECK (implementation_score_actual BETWEEN 0 AND 100),
  monitoring_score_actual INTEGER CHECK (monitoring_score_actual BETWEEN 0 AND 100),
  evaluation_score_actual INTEGER CHECK (evaluation_score_actual BETWEEN 0 AND 100),
  overall_effectiveness NUMERIC(5,2), -- Calculated average of actual scores

  -- Variance from theoretical scores
  design_variance INTEGER,
  implementation_variance INTEGER,
  monitoring_variance INTEGER,
  evaluation_variance INTEGER,

  -- Test findings
  test_findings TEXT,
  strengths TEXT,
  weaknesses TEXT,
  remediation_required BOOLEAN DEFAULT false,
  remediation_plan TEXT,
  remediation_deadline DATE,
  remediation_completed BOOLEAN DEFAULT false,
  remediation_completed_date DATE,

  -- Next test scheduling
  next_test_date DATE,
  test_frequency VARCHAR(20) CHECK (test_frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Ad-Hoc')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_control FOREIGN KEY (control_id) REFERENCES control_library(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_control_tests_org ON control_effectiveness_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_control ON control_effectiveness_tests(control_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_risk ON control_effectiveness_tests(risk_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_date ON control_effectiveness_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_control_tests_next_test ON control_effectiveness_tests(next_test_date);
CREATE INDEX IF NOT EXISTS idx_control_tests_remediation ON control_effectiveness_tests(remediation_required, remediation_completed);

-- ============================================================================
-- TRIGGER: Calculate Overall Effectiveness and Variance
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_test_effectiveness()
RETURNS TRIGGER AS $$
DECLARE
  v_theoretical_control RECORD;
BEGIN
  -- Calculate overall effectiveness (average of actual scores)
  IF NEW.design_score_actual IS NOT NULL AND
     NEW.implementation_score_actual IS NOT NULL AND
     NEW.monitoring_score_actual IS NOT NULL AND
     NEW.evaluation_score_actual IS NOT NULL THEN

    NEW.overall_effectiveness := ROUND(
      (NEW.design_score_actual + NEW.implementation_score_actual +
       NEW.monitoring_score_actual + NEW.evaluation_score_actual) / 4.0,
      2
    );
  END IF;

  -- Get theoretical scores from control library
  SELECT
    design_score,
    implementation_score,
    monitoring_score,
    evaluation_score
  INTO v_theoretical_control
  FROM control_library
  WHERE id = NEW.control_id AND organization_id = NEW.organization_id;

  -- Calculate variance (actual - theoretical)
  IF v_theoretical_control IS NOT NULL THEN
    NEW.design_variance := COALESCE(NEW.design_score_actual, 0) - v_theoretical_control.design_score;
    NEW.implementation_variance := COALESCE(NEW.implementation_score_actual, 0) - v_theoretical_control.implementation_score;
    NEW.monitoring_variance := COALESCE(NEW.monitoring_score_actual, 0) - v_theoretical_control.monitoring_score;
    NEW.evaluation_variance := COALESCE(NEW.evaluation_score_actual, 0) - v_theoretical_control.evaluation_score;
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_test_effectiveness ON control_effectiveness_tests;
CREATE TRIGGER trigger_calculate_test_effectiveness
  BEFORE INSERT OR UPDATE ON control_effectiveness_tests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_test_effectiveness();

-- ============================================================================
-- FUNCTION: Update Control DIME Scores Based on Test Results
-- ============================================================================

CREATE OR REPLACE FUNCTION update_control_from_test_results(p_test_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_test RECORD;
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Get test results
  SELECT * INTO v_test
  FROM control_effectiveness_tests
  WHERE id = p_test_id;

  IF v_test IS NULL THEN
    RAISE EXCEPTION 'Test ID % not found', p_test_id;
  END IF;

  -- Update control library with actual test scores
  UPDATE control_library
  SET
    design_score = v_test.design_score_actual,
    implementation_score = v_test.implementation_score_actual,
    monitoring_score = v_test.monitoring_score_actual,
    evaluation_score = v_test.evaluation_score_actual,
    updated_at = NOW()
  WHERE id = v_test.control_id AND organization_id = v_test.organization_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Control Test History
-- ============================================================================

CREATE OR REPLACE VIEW control_test_history_view AS
SELECT
  t.id as test_id,
  t.organization_id,
  t.test_date,
  t.test_type,
  c.control_code,
  c.control_name,
  c.category,
  c.complexity,
  -- Theoretical scores
  c.design_score as design_theoretical,
  c.implementation_score as implementation_theoretical,
  c.monitoring_score as monitoring_theoretical,
  c.evaluation_score as evaluation_theoretical,
  ROUND((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0, 2) as dime_theoretical,
  -- Actual scores
  t.design_score_actual,
  t.implementation_score_actual,
  t.monitoring_score_actual,
  t.evaluation_score_actual,
  t.overall_effectiveness as dime_actual,
  -- Variance
  t.design_variance,
  t.implementation_variance,
  t.monitoring_variance,
  t.evaluation_variance,
  ROUND(t.overall_effectiveness - ((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0), 2) as dime_variance,
  -- Findings
  t.test_findings,
  t.remediation_required,
  t.remediation_completed,
  t.next_test_date,
  t.tester_name
FROM control_effectiveness_tests t
JOIN control_library c ON t.control_id = c.id AND t.organization_id = c.organization_id
ORDER BY t.test_date DESC, c.control_code;

-- ============================================================================
-- VIEW: Controls Due for Testing
-- ============================================================================

CREATE OR REPLACE VIEW controls_due_for_testing_view AS
SELECT
  c.id as control_id,
  c.organization_id,
  c.control_code,
  c.control_name,
  c.category,
  c.complexity,
  c.cost,
  -- Last test info
  lt.last_test_date,
  lt.last_test_type,
  lt.last_overall_effectiveness,
  lt.next_test_date,
  lt.test_frequency,
  -- Overdue calculation
  CASE
    WHEN lt.next_test_date IS NULL THEN 'Never Tested'
    WHEN lt.next_test_date < CURRENT_DATE THEN 'Overdue'
    WHEN lt.next_test_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Due Soon'
    ELSE 'Scheduled'
  END as test_status,
  CASE
    WHEN lt.next_test_date IS NULL THEN NULL
    WHEN lt.next_test_date < CURRENT_DATE THEN CURRENT_DATE - lt.next_test_date
    ELSE NULL
  END as days_overdue,
  -- Remediation status
  lt.has_open_remediation,
  lt.remediation_deadline,
  -- Risk context
  COUNT(DISTINCT rc.risk_id) as risk_count
FROM control_library c
LEFT JOIN LATERAL (
  SELECT
    test_date as last_test_date,
    test_type as last_test_type,
    overall_effectiveness as last_overall_effectiveness,
    next_test_date,
    test_frequency,
    remediation_required AND NOT remediation_completed as has_open_remediation,
    remediation_deadline
  FROM control_effectiveness_tests
  WHERE control_id = c.id AND organization_id = c.organization_id
  ORDER BY test_date DESC
  LIMIT 1
) lt ON true
LEFT JOIN risk_controls rc ON c.id = rc.control_id AND rc.status = 'active'
WHERE c.status = 'active'
GROUP BY
  c.id, c.control_code, c.control_name, c.category, c.complexity, c.cost, c.organization_id,
  lt.last_test_date, lt.last_test_type, lt.last_overall_effectiveness,
  lt.next_test_date, lt.test_frequency, lt.has_open_remediation, lt.remediation_deadline
ORDER BY
  CASE
    WHEN lt.next_test_date IS NULL THEN 1
    WHEN lt.next_test_date < CURRENT_DATE THEN 2
    WHEN lt.next_test_date <= CURRENT_DATE + INTERVAL '30 days' THEN 3
    ELSE 4
  END,
  lt.next_test_date ASC NULLS FIRST;

-- ============================================================================
-- VIEW: Control Effectiveness Trends
-- ============================================================================

CREATE OR REPLACE VIEW control_effectiveness_trends_view AS
WITH test_trends AS (
  SELECT
    control_id,
    organization_id,
    test_date,
    overall_effectiveness,
    LAG(overall_effectiveness) OVER (PARTITION BY control_id ORDER BY test_date) as prev_effectiveness,
    overall_effectiveness - LAG(overall_effectiveness) OVER (PARTITION BY control_id ORDER BY test_date) as effectiveness_change,
    ROW_NUMBER() OVER (PARTITION BY control_id ORDER BY test_date DESC) as test_rank
  FROM control_effectiveness_tests
  WHERE overall_effectiveness IS NOT NULL
)
SELECT
  c.control_code,
  c.control_name,
  c.organization_id,
  c.category,
  c.complexity,
  tt.test_date as latest_test_date,
  tt.overall_effectiveness as latest_effectiveness,
  tt.prev_effectiveness as previous_effectiveness,
  tt.effectiveness_change,
  CASE
    WHEN tt.effectiveness_change IS NULL THEN 'First Test'
    WHEN tt.effectiveness_change > 10 THEN 'Improving'
    WHEN tt.effectiveness_change < -10 THEN 'Degrading'
    ELSE 'Stable'
  END as trend,
  COUNT(*) OVER (PARTITION BY c.id) as total_tests
FROM control_library c
JOIN test_trends tt ON c.id = tt.control_id AND c.organization_id = tt.organization_id
WHERE tt.test_rank = 1 -- Latest test only
ORDER BY
  CASE
    WHEN tt.effectiveness_change < -10 THEN 1
    WHEN tt.effectiveness_change IS NULL THEN 2
    WHEN ABS(tt.effectiveness_change) <= 10 THEN 3
    ELSE 4
  END,
  tt.effectiveness_change ASC;

-- ============================================================================
-- VIEW: Controls with Significant Variance
-- ============================================================================

CREATE OR REPLACE VIEW controls_with_variance_view AS
SELECT
  c.control_code,
  c.control_name,
  c.organization_id,
  t.test_date,
  t.test_type,
  -- Variance analysis
  t.design_variance,
  t.implementation_variance,
  t.monitoring_variance,
  t.evaluation_variance,
  ROUND((ABS(t.design_variance) + ABS(t.implementation_variance) +
         ABS(t.monitoring_variance) + ABS(t.evaluation_variance)) / 4.0, 2) as avg_abs_variance,
  -- Theoretical vs Actual
  ROUND((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0, 2) as theoretical_dime,
  t.overall_effectiveness as actual_dime,
  t.overall_effectiveness - ROUND((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0, 2) as dime_gap,
  -- Findings
  t.test_findings,
  t.remediation_required,
  t.remediation_plan
FROM control_effectiveness_tests t
JOIN control_library c ON t.control_id = c.id AND t.organization_id = c.organization_id
WHERE (
  ABS(t.design_variance) > 15 OR
  ABS(t.implementation_variance) > 15 OR
  ABS(t.monitoring_variance) > 15 OR
  ABS(t.evaluation_variance) > 15
)
ORDER BY avg_abs_variance DESC, t.test_date DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE control_effectiveness_tests IS 'Tracks periodic testing of controls to validate actual effectiveness vs theoretical DIME scores';

COMMENT ON COLUMN control_effectiveness_tests.design_score_actual IS 'Actual design score observed during testing (0-100)';
COMMENT ON COLUMN control_effectiveness_tests.implementation_score_actual IS 'Actual implementation score observed during testing (0-100)';
COMMENT ON COLUMN control_effectiveness_tests.monitoring_score_actual IS 'Actual monitoring score observed during testing (0-100)';
COMMENT ON COLUMN control_effectiveness_tests.evaluation_score_actual IS 'Actual evaluation score observed during testing (0-100)';
COMMENT ON COLUMN control_effectiveness_tests.overall_effectiveness IS 'Average of all actual DIME scores';
COMMENT ON COLUMN control_effectiveness_tests.design_variance IS 'Difference between actual and theoretical design score';

COMMENT ON FUNCTION update_control_from_test_results IS 'Updates control library DIME scores based on actual test results';

COMMENT ON VIEW control_test_history_view IS 'Complete history of control tests showing theoretical vs actual scores and variance';
COMMENT ON VIEW controls_due_for_testing_view IS 'Controls that are overdue for testing or due soon, with risk context';
COMMENT ON VIEW control_effectiveness_trends_view IS 'Trend analysis showing whether controls are improving, degrading, or stable over time';
COMMENT ON VIEW controls_with_variance_view IS 'Controls showing significant variance (>15 points) between theoretical and actual DIME scores';

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Example 1: Get controls due for testing this month
-- SELECT * FROM controls_due_for_testing_view
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111'
--   AND test_status IN ('Overdue', 'Due Soon')
-- ORDER BY days_overdue DESC NULLS LAST;

-- Example 2: Check controls with declining effectiveness
-- SELECT * FROM control_effectiveness_trends_view
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111'
--   AND trend = 'Degrading';

-- Example 3: Find controls with high variance (theoretical vs actual)
-- SELECT * FROM controls_with_variance_view
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111'
--   AND avg_abs_variance > 20;

-- Example 4: View test history for a specific control
-- SELECT * FROM control_test_history_view
-- WHERE control_code = 'CTL-001' AND organization_id = '11111111-1111-1111-1111-111111111111'
-- ORDER BY test_date DESC;
