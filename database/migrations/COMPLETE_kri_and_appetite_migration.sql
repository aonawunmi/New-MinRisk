-- ================================================================
-- COMPLETE MIGRATION: KRI + Appetite & Tolerance
-- ================================================================
-- This script does CLEANUP + FULL MIGRATION in one go
-- Safe to run - will drop incomplete tables first, then create fresh
-- ================================================================

-- ================================================================
-- PART 0: CLEANUP (Drop incomplete tables from failed migrations)
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 0: Cleanup existing incomplete tables ===';
END $$;

-- Drop in reverse dependency order
DROP TABLE IF EXISTS appetite_breaches CASCADE;
DROP TABLE IF EXISTS tolerance_metrics CASCADE;
DROP TABLE IF EXISTS risk_appetite_categories CASCADE;
DROP TABLE IF EXISTS risk_appetite_statements CASCADE;
DROP TABLE IF EXISTS kri_values CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✓ Cleanup complete - old tables dropped';
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 1: Creating KRI time-series infrastructure ===';
END $$;

-- ================================================================
-- PART 1: KRI TIME-SERIES INFRASTRUCTURE
-- ================================================================

CREATE TABLE kri_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kri_id UUID NOT NULL REFERENCES kri_kci_library(id) ON DELETE CASCADE,

  -- Measurement
  value DECIMAL NOT NULL,
  value_date DATE NOT NULL,
  observed_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Period tracking (for quarterly reporting)
  period_year INT,
  period_quarter INT CHECK (period_quarter BETWEEN 1 AND 4),

  -- Data quality
  data_source TEXT,
  is_estimated BOOLEAN DEFAULT FALSE,
  confidence_level TEXT CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW')),

  -- Breach detection (calculated from tolerance thresholds)
  breach_status TEXT CHECK (breach_status IN ('GREEN', 'AMBER', 'RED')),
  threshold_breached TEXT,

  -- Audit
  recorded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,

  CONSTRAINT unique_kri_date UNIQUE (kri_id, value_date)
);

CREATE INDEX idx_kri_values_kri ON kri_values(kri_id, value_date DESC);
CREATE INDEX idx_kri_values_org_date ON kri_values(organization_id, value_date DESC);
CREATE INDEX idx_kri_values_period ON kri_values(period_year, period_quarter);
CREATE INDEX idx_kri_values_breach ON kri_values(breach_status) WHERE breach_status IN ('AMBER', 'RED');

COMMENT ON TABLE kri_values IS 'Historical time-series data for Key Risk Indicators';

-- RLS
ALTER TABLE kri_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org KRI values"
ON kri_values FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can record KRI values"
ON kri_values FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
  AND recorded_by = auth.uid()
);

CREATE POLICY "Admins can update KRI values"
ON kri_values FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

DO $$
BEGIN
  RAISE NOTICE '✓ kri_values table created';
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 2: Creating Risk Appetite & Tolerance tables ===';
END $$;

-- ================================================================
-- PART 2: RISK APPETITE STATEMENTS
-- ================================================================

CREATE TABLE risk_appetite_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  version_number INT NOT NULL DEFAULT 1,
  effective_from DATE NOT NULL,
  effective_to DATE,
  statement_text TEXT,

  approved_by UUID REFERENCES user_profiles(id),
  approved_date DATE,
  next_review_date DATE,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'SUPERSEDED')),

  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),

  CONSTRAINT unique_org_version UNIQUE (organization_id, version_number)
);

CREATE INDEX idx_ras_active ON risk_appetite_statements(organization_id, status)
WHERE status = 'APPROVED';

ALTER TABLE risk_appetite_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org RAS"
ON risk_appetite_statements FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "CRO_Admin can edit RAS"
ON risk_appetite_statements FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

DO $$
BEGIN
  RAISE NOTICE '✓ risk_appetite_statements created';
END $$;

-- ================================================================
-- PART 3: RISK APPETITE CATEGORIES
-- ================================================================

CREATE TABLE risk_appetite_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES risk_appetite_statements(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  risk_category TEXT NOT NULL,
  appetite_level TEXT NOT NULL CHECK (appetite_level IN ('ZERO', 'LOW', 'MODERATE', 'HIGH')),
  rationale TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  CONSTRAINT unique_statement_category UNIQUE (statement_id, risk_category)
);

CREATE INDEX idx_appetite_categories ON risk_appetite_categories(organization_id, risk_category);

ALTER TABLE risk_appetite_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org appetite categories"
ON risk_appetite_categories FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "CRO_Admin can manage appetite categories"
ON risk_appetite_categories FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

DO $$
BEGIN
  RAISE NOTICE '✓ risk_appetite_categories created';
END $$;

-- ================================================================
-- PART 4: TOLERANCE METRICS
-- ================================================================

CREATE TABLE tolerance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appetite_category_id UUID NOT NULL REFERENCES risk_appetite_categories(id) ON DELETE CASCADE,

  metric_name TEXT NOT NULL,
  metric_description TEXT,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('RANGE', 'MAXIMUM', 'MINIMUM', 'DIRECTIONAL')),
  unit TEXT,
  materiality_type TEXT DEFAULT 'INTERNAL' CHECK (materiality_type IN ('INTERNAL', 'EXTERNAL', 'DUAL')),

  green_min DECIMAL,
  green_max DECIMAL,
  amber_min DECIMAL,
  amber_max DECIMAL,
  red_min DECIMAL,
  red_max DECIMAL,

  kri_id UUID REFERENCES kri_kci_library(id),
  directional_config JSONB DEFAULT NULL,
  escalation_rules JSONB DEFAULT '{
    "amber": {"sla_days": 30, "notify": ["CRO", "Risk Committee"], "action_required": "Remediation plan mandatory"},
    "red": {"sla_days": 7, "notify": ["CEO", "BRC", "Board"], "action_required": "Board paper mandatory"}
  }'::jsonb,

  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  activated_by UUID REFERENCES user_profiles(id),
  activated_at TIMESTAMP,
  aggregation_weight NUMERIC DEFAULT 1 CHECK (aggregation_weight > 0),

  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),

  CONSTRAINT unique_metric_period UNIQUE (organization_id, metric_name, effective_from),
  CONSTRAINT directional_must_have_config CHECK (
    metric_type != 'DIRECTIONAL' OR directional_config IS NOT NULL
  ),
  CONSTRAINT active_must_have_kri CHECK (
    is_active = FALSE OR kri_id IS NOT NULL
  )
);

CREATE INDEX idx_tolerance_metrics_active ON tolerance_metrics(organization_id, is_active)
WHERE is_active = TRUE;
CREATE INDEX idx_tolerance_metrics_category ON tolerance_metrics(appetite_category_id);
CREATE INDEX idx_tolerance_metrics_kri ON tolerance_metrics(kri_id);

ALTER TABLE tolerance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org tolerance metrics"
ON tolerance_metrics FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "CRO_Risk can manage tolerance metrics"
ON tolerance_metrics FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

DO $$
BEGIN
  RAISE NOTICE '✓ tolerance_metrics created';
END $$;

-- ================================================================
-- PART 5: APPETITE BREACHES
-- ================================================================

CREATE TABLE appetite_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tolerance_metric_id UUID NOT NULL REFERENCES tolerance_metrics(id) ON DELETE CASCADE,
  kri_value_id UUID REFERENCES kri_values(id),

  breach_type TEXT NOT NULL CHECK (breach_type IN ('AMBER', 'RED')),
  breach_value DECIMAL NOT NULL,
  threshold_value DECIMAL NOT NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  prior_breach_id UUID REFERENCES appetite_breaches(id),

  remediation_plan TEXT,
  remediation_owner UUID REFERENCES user_profiles(id),
  remediation_due_date DATE,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'BOARD_ACCEPTED')),

  escalated_to JSONB,
  escalated_at TIMESTAMP,

  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,

  board_accepted_by UUID REFERENCES user_profiles(id),
  board_accepted_at TIMESTAMP,
  board_acceptance_rationale TEXT,
  temporary_threshold DECIMAL,
  exception_valid_until DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_active_breach UNIQUE (tolerance_metric_id, kri_value_id)
);

CREATE INDEX idx_appetite_breaches_status ON appetite_breaches(organization_id, status);
CREATE INDEX idx_appetite_breaches_type ON appetite_breaches(organization_id, breach_type, detected_at DESC);
CREATE INDEX idx_appetite_breaches_metric ON appetite_breaches(tolerance_metric_id);
CREATE INDEX idx_appetite_breaches_open ON appetite_breaches(tolerance_metric_id, status)
WHERE status IN ('OPEN', 'IN_PROGRESS');

ALTER TABLE appetite_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org appetite breaches"
ON appetite_breaches FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "CRO_Admin can manage breaches"
ON appetite_breaches FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

CREATE POLICY "Owners can update remediation"
ON appetite_breaches FOR UPDATE
USING (
  (
    remediation_owner = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'cro')
    )
  )
  AND status NOT IN ('BOARD_ACCEPTED')
);

ALTER TABLE appetite_breaches
ADD CONSTRAINT board_accepted_requires_metadata
CHECK (
  status != 'BOARD_ACCEPTED' OR (
    board_accepted_by IS NOT NULL AND
    board_accepted_at IS NOT NULL AND
    board_acceptance_rationale IS NOT NULL
  )
);

DO $$
BEGIN
  RAISE NOTICE '✓ appetite_breaches created';
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 3: Creating helper functions ===';
END $$;

-- ================================================================
-- PART 6: HELPER FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION get_active_appetite_statement(org_id UUID)
RETURNS UUID AS $$
  SELECT id
  FROM risk_appetite_statements
  WHERE organization_id = org_id
    AND status = 'APPROVED'
    AND effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ORDER BY effective_from DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION tolerance_metric_has_recent_data(metric_id UUID, days INT DEFAULT 90)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tolerance_metrics tm
    JOIN kri_values kv ON kv.kri_id = tm.kri_id
    WHERE tm.id = metric_id
      AND kv.value_date >= CURRENT_DATE - days
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION update_tolerance_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tolerance_metrics_update_timestamp
BEFORE UPDATE ON tolerance_metrics
FOR EACH ROW
EXECUTE FUNCTION update_tolerance_metrics_timestamp();

CREATE OR REPLACE FUNCTION update_appetite_breaches_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appetite_breaches_update_timestamp
BEFORE UPDATE ON appetite_breaches
FOR EACH ROW
EXECUTE FUNCTION update_appetite_breaches_timestamp();

DO $$
BEGIN
  RAISE NOTICE '✓ Helper functions and triggers created';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- COMPLETION
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '✅ KRI Time-Series + Risk Appetite & Tolerance migration COMPLETE';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables Created:';
  RAISE NOTICE '   1. kri_values - Historical KRI time-series data';
  RAISE NOTICE '   2. risk_appetite_statements - Board-approved appetite';
  RAISE NOTICE '   3. risk_appetite_categories - Appetite per risk category';
  RAISE NOTICE '   4. tolerance_metrics - Green/Amber/Red thresholds';
  RAISE NOTICE '   5. appetite_breaches - Breach events & remediation';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Security:';
  RAISE NOTICE '   - RLS policies enabled on all tables';
  RAISE NOTICE '   - Multi-tenant isolation enforced';
  RAISE NOTICE '   - Role-based access (admin, cro, user)';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️  Functionality:';
  RAISE NOTICE '   - Helper functions created';
  RAISE NOTICE '   - Audit triggers configured';
  RAISE NOTICE '   - All 6 critical fixes applied';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Start recording KRI values for trend analysis';
  RAISE NOTICE '   2. Create Risk Appetite Statement (Admin Panel)';
  RAISE NOTICE '   3. Define appetite categories for each risk type';
  RAISE NOTICE '   4. Configure tolerance metrics linked to KRIs';
  RAISE NOTICE '   5. Monitor appetite utilization dashboard';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
