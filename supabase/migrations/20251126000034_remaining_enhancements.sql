-- Migration: Remaining Risk Register Enhancements
-- Description: Add residual risk calculation, control effectiveness tracking, dependencies, etc.
-- Feature Branch: feature/hybrid-multi-tenant
-- Date: 2025-11-26
-- Enhancements: #6, #7, #8, #9, #10, #11, #12
-- Note: These enhancements work with the hybrid architecture views

-- ============================================================================
-- ENHANCEMENT #6: RESIDUAL RISK CALCULATION
-- ============================================================================

-- Create risk_controls table if it doesn't exist (for linking risks to controls)
CREATE TABLE IF NOT EXISTS risk_controls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  control_id UUID NOT NULL, -- References control_library view
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'planned')),
  implementation_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(risk_id, control_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_controls_risk ON risk_controls(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_controls_control ON risk_controls(control_id);
CREATE INDEX IF NOT EXISTS idx_risk_controls_status ON risk_controls(status);

-- Enable RLS
ALTER TABLE risk_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org risk controls"
ON risk_controls FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Add columns to risks table for residual risk
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS residual_likelihood INTEGER CHECK (residual_likelihood >= 1 AND residual_likelihood <= 5),
  ADD COLUMN IF NOT EXISTS residual_impact INTEGER CHECK (residual_impact >= 1 AND residual_impact <= 5),
  ADD COLUMN IF NOT EXISTS residual_score INTEGER,
  ADD COLUMN IF NOT EXISTS control_effectiveness_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS residual_last_calculated TIMESTAMP WITH TIME ZONE;

-- Function to calculate control effectiveness for a risk
CREATE OR REPLACE FUNCTION calculate_control_effectiveness(p_risk_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_combined_residual NUMERIC := 1.0;
  v_individual_effectiveness NUMERIC;
BEGIN
  -- Loop through all active controls for this risk
  FOR v_individual_effectiveness IN
    SELECT ((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0) / 100.0 AS effectiveness
    FROM risk_controls rc
    INNER JOIN control_library c ON rc.control_id = c.id
    WHERE rc.risk_id = p_risk_id
      AND rc.status = 'active'
  LOOP
    -- Compound the residual: each control reduces remaining risk
    v_combined_residual := v_combined_residual * (1.0 - v_individual_effectiveness);
  END LOOP;

  -- Return overall control effectiveness as percentage
  RETURN (1.0 - v_combined_residual) * 100.0;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate residual risk
CREATE OR REPLACE FUNCTION calculate_residual_risk(
  p_inherent_likelihood INTEGER,
  p_inherent_impact INTEGER,
  p_risk_id UUID
) RETURNS TABLE(
  residual_likelihood INTEGER,
  residual_impact INTEGER,
  residual_score INTEGER,
  control_effectiveness NUMERIC
) AS $$
DECLARE
  v_effectiveness NUMERIC;
  v_residual_likelihood INTEGER;
  v_residual_impact INTEGER;
BEGIN
  -- Calculate control effectiveness
  v_effectiveness := calculate_control_effectiveness(p_risk_id);

  -- Apply control effectiveness to reduce likelihood and impact
  -- Formula: Residual = Inherent * (1 - Effectiveness/100)
  v_residual_likelihood := GREATEST(1, ROUND(p_inherent_likelihood * (1 - v_effectiveness/100.0))::INTEGER);
  v_residual_impact := GREATEST(1, ROUND(p_inherent_impact * (1 - v_effectiveness/100.0))::INTEGER);

  residual_likelihood := v_residual_likelihood;
  residual_impact := v_residual_impact;
  residual_score := v_residual_likelihood * v_residual_impact;
  control_effectiveness := v_effectiveness;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update risk's residual values
CREATE OR REPLACE FUNCTION update_risk_residual() RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
  v_inherent_likelihood INTEGER;
  v_inherent_impact INTEGER;
BEGIN
  -- Get inherent risk values
  SELECT likelihood, impact
  INTO v_inherent_likelihood, v_inherent_impact
  FROM risks
  WHERE id = COALESCE(NEW.risk_id, OLD.risk_id);

  IF v_inherent_likelihood IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate residual risk
  SELECT * INTO v_result
  FROM calculate_residual_risk(v_inherent_likelihood, v_inherent_impact, COALESCE(NEW.risk_id, OLD.risk_id));

  -- Update the risk record
  UPDATE risks
  SET
    residual_likelihood = v_result.residual_likelihood,
    residual_impact = v_result.residual_impact,
    residual_score = v_result.residual_score,
    control_effectiveness_percentage = v_result.control_effectiveness,
    residual_last_calculated = NOW()
  WHERE id = COALESCE(NEW.risk_id, OLD.risk_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update residual risk when controls change
CREATE TRIGGER trigger_update_residual_on_control_add
  AFTER INSERT ON risk_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_residual();

CREATE TRIGGER trigger_update_residual_on_control_remove
  AFTER DELETE ON risk_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_residual();

CREATE TRIGGER trigger_update_residual_on_control_update
  AFTER UPDATE ON risk_controls
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_risk_residual();

-- Create view for residual risk analysis
CREATE OR REPLACE VIEW residual_risk_view AS
SELECT
  r.id,
  r.risk_title,
  r.organization_id,
  r.likelihood_inherent as inherent_likelihood,
  r.impact_inherent as inherent_impact,
  (r.likelihood_inherent * r.impact_inherent) as inherent_score,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,
  r.control_effectiveness_percentage,
  (r.likelihood_inherent * r.impact_inherent - r.residual_score) as risk_reduction,
  ((r.likelihood_inherent * r.impact_inherent - r.residual_score)::NUMERIC / (r.likelihood_inherent * r.impact_inherent)) * 100 as risk_reduction_percentage,
  r.residual_last_calculated,
  (SELECT COUNT(*) FROM risk_controls WHERE risk_id = r.id AND status = 'active') as active_control_count
FROM risks r
WHERE r.residual_score IS NOT NULL;

-- ============================================================================
-- ENHANCEMENT #7: CONTROL EFFECTIVENESS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_effectiveness_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL, -- References control_library view
  risk_id UUID REFERENCES risks(id), -- Optional: which risk this test was for
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type VARCHAR(50) NOT NULL, -- e.g., 'Design Review', 'Implementation Audit', 'Monitoring Check', 'Effectiveness Assessment'
  tester_id UUID REFERENCES user_profiles(id),

  -- Actual scores from testing (may differ from theoretical DIME scores)
  design_score_actual INTEGER CHECK (design_score_actual >= 0 AND design_score_actual <= 100),
  implementation_score_actual INTEGER CHECK (implementation_score_actual >= 0 AND implementation_score_actual <= 100),
  monitoring_score_actual INTEGER CHECK (monitoring_score_actual >= 0 AND monitoring_score_actual <= 100),
  evaluation_score_actual INTEGER CHECK (evaluation_score_actual >= 0 AND evaluation_score_actual <= 100),
  overall_effectiveness NUMERIC(5,2), -- Average of actual scores

  -- Variance from theoretical scores
  design_variance INTEGER, -- actual - theoretical
  implementation_variance INTEGER,
  monitoring_variance INTEGER,
  evaluation_variance INTEGER,

  -- Test results
  test_findings TEXT,
  remediation_required BOOLEAN DEFAULT false,
  remediation_plan TEXT,
  remediation_due_date DATE,
  remediation_completed BOOLEAN DEFAULT false,
  next_test_date DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_control_tests_org ON control_effectiveness_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_control ON control_effectiveness_tests(control_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_date ON control_effectiveness_tests(test_date);

-- Enable RLS
ALTER TABLE control_effectiveness_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org control tests"
ON control_effectiveness_tests FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- View for controls due for testing
CREATE OR REPLACE VIEW controls_due_for_testing_view AS
SELECT
  c.control_code,
  c.control_name,
  c.organization_id,
  MAX(t.test_date) as last_test_date,
  MAX(t.next_test_date) as next_test_date,
  CASE
    WHEN MAX(t.next_test_date) < CURRENT_DATE THEN 'Overdue'
    WHEN MAX(t.next_test_date) <= CURRENT_DATE + INTERVAL '30 days' THEN 'Due Soon'
    ELSE 'Scheduled'
  END as test_status
FROM control_library c
LEFT JOIN control_effectiveness_tests t ON c.id = t.control_id
GROUP BY c.id, c.control_code, c.control_name, c.organization_id
HAVING MAX(t.next_test_date) IS NULL OR MAX(t.next_test_date) <= CURRENT_DATE + INTERVAL '60 days';

-- ============================================================================
-- ENHANCEMENT #8: MULTIPLE CAUSES/IMPACTS PER RISK
-- ============================================================================

-- Junction table for risk → root causes (many-to-many)
CREATE TABLE IF NOT EXISTS risk_root_causes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  root_cause_id UUID NOT NULL, -- References root_cause_register view
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- One primary cause per risk
  contribution_percentage INTEGER CHECK (contribution_percentage >= 0 AND contribution_percentage <= 100),
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(risk_id, root_cause_id)
);

-- Junction table for risk → impacts (many-to-many)
CREATE TABLE IF NOT EXISTS risk_impacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  impact_id UUID NOT NULL, -- References impact_register view
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- One primary impact per risk
  severity_percentage INTEGER CHECK (severity_percentage >= 0 AND severity_percentage <= 100),
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(risk_id, impact_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_risk ON risk_root_causes(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_cause ON risk_root_causes(root_cause_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_risk ON risk_impacts(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_impact ON risk_impacts(impact_id);

-- Enable RLS
ALTER TABLE risk_root_causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_impacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org risk causes"
ON risk_root_causes FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view org risk impacts"
ON risk_impacts FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Trigger to enforce exactly one primary cause
CREATE OR REPLACE FUNCTION enforce_single_primary_cause() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE risk_root_causes
    SET is_primary = false
    WHERE risk_id = NEW.risk_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_cause
  BEFORE INSERT OR UPDATE ON risk_root_causes
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION enforce_single_primary_cause();

-- Similar trigger for impacts
CREATE OR REPLACE FUNCTION enforce_single_primary_impact() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE risk_impacts
    SET is_primary = false
    WHERE risk_id = NEW.risk_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_impact
  BEFORE INSERT OR UPDATE ON risk_impacts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION enforce_single_primary_impact();

-- Comprehensive risk decomposition view
CREATE OR REPLACE VIEW risk_decomposition_view AS
SELECT
  r.id,
  r.risk_title,
  r.organization_id,
  jsonb_agg(DISTINCT jsonb_build_object(
    'cause_code', rc.cause_code,
    'cause_name', rc.cause_name,
    'is_primary', rrc.is_primary,
    'contribution_pct', rrc.contribution_percentage
  )) FILTER (WHERE rc.id IS NOT NULL) as all_root_causes,
  jsonb_agg(DISTINCT jsonb_build_object(
    'impact_code', imp.impact_code,
    'impact_name', imp.impact_name,
    'is_primary', ri.is_primary,
    'severity_pct', ri.severity_percentage
  )) FILTER (WHERE imp.id IS NOT NULL) as all_impacts
FROM risks r
LEFT JOIN risk_root_causes rrc ON r.id = rrc.risk_id
LEFT JOIN root_cause_register rc ON rrc.root_cause_id = rc.id
LEFT JOIN risk_impacts ri ON r.id = ri.risk_id
LEFT JOIN impact_register imp ON ri.impact_id = imp.id
GROUP BY r.id, r.risk_title, r.organization_id;

-- ============================================================================
-- ENHANCEMENT #9: CONTROL DEPENDENCIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id), -- NULL for global dependencies
  control_id UUID NOT NULL, -- The control that has the dependency
  depends_on_control_id UUID NOT NULL, -- The control it depends on
  dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('prerequisite', 'complementary', 'alternative')),
  dependency_strength VARCHAR(15) NOT NULL CHECK (dependency_strength IN ('required', 'recommended', 'optional')),
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_control_deps_control ON control_dependencies(control_id);
CREATE INDEX IF NOT EXISTS idx_control_deps_depends_on ON control_dependencies(depends_on_control_id);

-- Create unique constraints
-- For global dependencies (organization_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_control_deps_global_unique
ON control_dependencies(control_id, depends_on_control_id)
WHERE organization_id IS NULL;

-- For org-specific dependencies (organization_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_control_deps_org_unique
ON control_dependencies(organization_id, control_id, depends_on_control_id)
WHERE organization_id IS NOT NULL;

-- Function to get all prerequisites for a control (recursive)
CREATE OR REPLACE FUNCTION get_control_prerequisites(p_control_id UUID, p_organization_id UUID DEFAULT NULL)
RETURNS TABLE(
  control_code VARCHAR,
  control_name VARCHAR,
  dependency_level INTEGER,
  dependency_type VARCHAR
) AS $$
WITH RECURSIVE prereq_tree AS (
  -- Base case: direct prerequisites
  SELECT
    c.control_code,
    c.control_name,
    1 as dependency_level,
    cd.dependency_type
  FROM control_dependencies cd
  INNER JOIN control_library c ON cd.depends_on_control_id = c.id
  WHERE cd.control_id = p_control_id
    AND cd.dependency_type = 'prerequisite'
    AND (cd.organization_id = p_organization_id OR cd.organization_id IS NULL)

  UNION ALL

  -- Recursive case: prerequisites of prerequisites
  SELECT
    c.control_code,
    c.control_name,
    pt.dependency_level + 1,
    cd.dependency_type
  FROM control_dependencies cd
  INNER JOIN control_library c ON cd.depends_on_control_id = c.id
  INNER JOIN prereq_tree pt ON cd.control_id = (
    SELECT id FROM control_library WHERE control_code = pt.control_code LIMIT 1
  )
  WHERE cd.dependency_type = 'prerequisite'
    AND (cd.organization_id = p_organization_id OR cd.organization_id IS NULL)
    AND pt.dependency_level < 5 -- Prevent infinite loops
)
SELECT * FROM prereq_tree ORDER BY dependency_level;
$$ LANGUAGE sql;

-- ============================================================================
-- ENHANCEMENT #10: RISK APPETITE FRAMEWORK
-- ============================================================================

-- Risk appetite statements (per organization)
CREATE TABLE IF NOT EXISTS risk_appetite_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_category VARCHAR(100) NOT NULL,
  appetite_statement TEXT NOT NULL,
  appetite_level VARCHAR(20) CHECK (appetite_level IN ('Risk Averse', 'Risk Cautious', 'Balanced', 'Risk Seeking', 'Aggressive')),
  max_acceptable_likelihood INTEGER CHECK (max_acceptable_likelihood >= 1 AND max_acceptable_likelihood <= 5),
  max_acceptable_impact INTEGER CHECK (max_acceptable_impact >= 1 AND max_acceptable_impact <= 5),
  max_acceptable_score INTEGER CHECK (max_acceptable_score >= 1 AND max_acceptable_score <= 25),
  escalation_threshold INTEGER,
  board_tolerance INTEGER,
  review_frequency VARCHAR(20), -- 'Monthly', 'Quarterly', 'Annually'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, risk_category)
);

-- Risk tolerance exceptions (when risks exceed appetite)
CREATE TABLE IF NOT EXISTS risk_tolerance_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exception_reason TEXT NOT NULL,
  business_justification TEXT NOT NULL,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  review_frequency VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE risk_appetite_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_tolerance_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org risk appetite"
ON risk_appetite_statements FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view org risk exceptions"
ON risk_tolerance_exceptions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- ENHANCEMENT #11: KRI/KCI BREACH TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS indicator_breaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL, -- References kri_kci_library view
  risk_id UUID REFERENCES risks(id), -- Associated risk (if any)
  breach_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  breach_level VARCHAR(10) NOT NULL CHECK (breach_level IN ('warning', 'critical')),
  measured_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  breach_percentage NUMERIC, -- How much over threshold
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_alarm')),
  action_taken TEXT,
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  breach_duration_hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_indicator_breaches_org ON indicator_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_indicator_breaches_indicator ON indicator_breaches(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_breaches_status ON indicator_breaches(status);
CREATE INDEX IF NOT EXISTS idx_indicator_breaches_date ON indicator_breaches(breach_date);

-- Enable RLS
ALTER TABLE indicator_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org indicator breaches"
ON indicator_breaches FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- View for active breaches
CREATE OR REPLACE VIEW active_breaches_view AS
SELECT
  b.id,
  b.organization_id,
  k.indicator_code,
  k.indicator_name,
  k.indicator_type,
  b.breach_level,
  b.measured_value,
  b.threshold_value,
  b.breach_percentage,
  b.breach_date,
  EXTRACT(EPOCH FROM (NOW() - b.breach_date)) / 3600 as hours_since_breach,
  b.status
FROM indicator_breaches b
INNER JOIN kri_kci_library k ON b.indicator_id = k.id
WHERE b.status IN ('active', 'investigating')
ORDER BY b.breach_level DESC, b.breach_date ASC;

-- ============================================================================
-- ENHANCEMENT #12: LIBRARY SUGGESTIONS APPROVAL WORKFLOW
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('root_cause', 'impact', 'control', 'indicator')),
  suggested_data JSONB NOT NULL, -- JSON structure with all fields
  justification TEXT NOT NULL,
  use_case_example TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  submitted_by UUID NOT NULL REFERENCES user_profiles(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  appeal_submitted BOOLEAN DEFAULT false,
  appeal_reason TEXT,
  implemented BOOLEAN DEFAULT false, -- True when added to global library
  implemented_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_library_suggestions_org ON library_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_library_suggestions_type ON library_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_library_suggestions_status ON library_suggestions(status);

-- Enable RLS
ALTER TABLE library_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org library suggestions"
ON library_suggestions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- View for pending suggestions
CREATE OR REPLACE VIEW pending_suggestions_view AS
SELECT
  s.id,
  s.organization_id,
  s.suggestion_type,
  s.suggested_data,
  s.justification,
  s.submitted_by,
  up.full_name as submitter_name,
  s.submitted_at,
  EXTRACT(DAY FROM (NOW() - s.submitted_at)) as days_pending
FROM library_suggestions s
INNER JOIN user_profiles up ON s.submitted_by = up.id
WHERE s.status = 'pending'
ORDER BY s.submitted_at ASC;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'All remaining enhancements applied successfully';
  RAISE NOTICE 'Created tables: control_effectiveness_tests, risk_root_causes, risk_impacts, control_dependencies, risk_appetite_statements, risk_tolerance_exceptions, indicator_breaches, library_suggestions';
  RAISE NOTICE 'Created functions: calculate_control_effectiveness, calculate_residual_risk, update_risk_residual, get_control_prerequisites';
  RAISE NOTICE 'Created triggers: Auto-update residual risk on control changes, enforce single primary cause/impact';
  RAISE NOTICE 'Created views: residual_risk_view, controls_due_for_testing_view, risk_decomposition_view, active_breaches_view, pending_suggestions_view';
END $$;
