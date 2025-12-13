-- ================================================================
-- MinRisk Risk Appetite & Tolerance Module
-- Migration: 20251213_risk_appetite_tolerance.sql
--
-- Architecture: Risk Boundary Management Engine
-- Design Principles:
--   - Appetite = Strategic (Board-owned)
--   - Tolerance = Enforcement layer (KRI-linked)
--   - Breaches = Events (idempotent, lifecycle-managed)
--   - Chain Validation = Blocking (not advisory)
--   - Dual Materiality = Explicit (Internal/External/Dual)
--
-- Regulatory Compliance: CBN, SEC, PENCOM, ISO 31000, COSO ERM
-- ================================================================

-- ================================================================
-- 1. RISK APPETITE STATEMENTS
-- ================================================================
-- Board-approved strategic risk appetite declaration
-- One per organization, versioned only when Board approves changes

CREATE TABLE IF NOT EXISTS risk_appetite_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Versioning
  version_number INT NOT NULL DEFAULT 1,
  effective_from DATE NOT NULL,
  effective_to DATE,

  -- Statement content (Rich Text Editor)
  statement_text TEXT,

  -- Governance
  approved_by UUID REFERENCES user_profiles(id),
  approved_date DATE,
  next_review_date DATE, -- Annual review reminder
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'SUPERSEDED')),

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),

  CONSTRAINT unique_org_version UNIQUE (organization_id, version_number)
);

-- Index for active statements
CREATE INDEX idx_ras_active ON risk_appetite_statements(organization_id, status)
WHERE status = 'APPROVED';

-- RLS Policy: All users in org can read
CREATE POLICY "Users can read org RAS"
ON risk_appetite_statements FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Only CRO/Admin can create/edit
CREATE POLICY "CRO_Admin can edit RAS"
ON risk_appetite_statements FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

-- ================================================================
-- 2. RISK APPETITE CATEGORIES
-- ================================================================
-- Strategic appetite level per risk category (from taxonomy)
-- Links risk categories to appetite levels (ZERO/LOW/MODERATE/HIGH)

CREATE TABLE IF NOT EXISTS risk_appetite_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES risk_appetite_statements(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Category linkage (from risk taxonomy)
  risk_category TEXT NOT NULL,

  -- Appetite level
  appetite_level TEXT NOT NULL CHECK (appetite_level IN ('ZERO', 'LOW', 'MODERATE', 'HIGH')),
  rationale TEXT, -- Why this appetite level?

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  CONSTRAINT unique_statement_category UNIQUE (statement_id, risk_category)
);

-- Index for category lookups
CREATE INDEX idx_appetite_categories ON risk_appetite_categories(organization_id, risk_category);

-- RLS Policy: Inherit from parent statement
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

-- ================================================================
-- 3. TOLERANCE METRICS (THE ENGINE)
-- ================================================================
-- Quantitative tolerance thresholds linked to KRIs
-- This is where appetite becomes enforceable via measurement

CREATE TABLE IF NOT EXISTS tolerance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appetite_category_id UUID NOT NULL REFERENCES risk_appetite_categories(id) ON DELETE CASCADE,

  -- Metric Definition
  metric_name TEXT NOT NULL,
  metric_description TEXT,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('RANGE', 'MAXIMUM', 'MINIMUM', 'DIRECTIONAL')),
  unit TEXT, -- "%", "₦M", "hours", "bps", etc.

  -- Dual Materiality (REGULATORY REQUIREMENT)
  materiality_type TEXT DEFAULT 'INTERNAL' CHECK (materiality_type IN ('INTERNAL', 'EXTERNAL', 'DUAL')),
  -- INTERNAL = Impact on entity (traditional)
  -- EXTERNAL = Impact on customers/market/systemic (conduct lens)
  -- DUAL = Both

  -- Threshold Bands (Green / Amber / Red)
  -- NULL values allowed based on metric_type
  green_min DECIMAL,
  green_max DECIMAL,
  amber_min DECIMAL,
  amber_max DECIMAL,
  red_min DECIMAL,
  red_max DECIMAL,

  -- KRI Linkage (CRITICAL CHAIN)
  kri_id UUID REFERENCES kri_definitions(id),

  -- Directional Metric Configuration (for metric_type = 'DIRECTIONAL')
  directional_config JSONB DEFAULT NULL,
  -- Example structure:
  -- {
  --   "lookback_days": 30,
  --   "allowed_change_pct": 5,
  --   "trend": "INCREASING_IS_BAD" | "DECREASING_IS_BAD"
  -- }

  -- Escalation Rules (JSONB for flexibility)
  escalation_rules JSONB DEFAULT '{
    "amber": {
      "sla_days": 30,
      "notify": ["CRO", "Risk Committee"],
      "action_required": "Remediation plan mandatory"
    },
    "red": {
      "sla_days": 7,
      "notify": ["CEO", "BRC", "Board"],
      "action_required": "Board paper mandatory"
    }
  }'::jsonb,

  -- Versioning (only when threshold changes)
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,

  -- Activation tracking
  is_active BOOLEAN DEFAULT TRUE,
  activated_by UUID REFERENCES user_profiles(id),
  activated_at TIMESTAMP,

  -- FIX #6: Future-proofing for weighted aggregation
  aggregation_weight NUMERIC DEFAULT 1 CHECK (aggregation_weight > 0),

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),

  CONSTRAINT unique_metric_period UNIQUE (organization_id, metric_name, effective_from),

  -- Validation: DIRECTIONAL metrics must have directional_config
  CONSTRAINT directional_must_have_config CHECK (
    metric_type != 'DIRECTIONAL' OR directional_config IS NOT NULL
  ),

  -- Validation: Active metrics must have KRI linked
  CONSTRAINT active_must_have_kri CHECK (
    is_active = FALSE OR kri_id IS NOT NULL
  )
);

-- Indexes for performance
CREATE INDEX idx_tolerance_metrics_active ON tolerance_metrics(organization_id, is_active)
WHERE is_active = TRUE;

CREATE INDEX idx_tolerance_metrics_category ON tolerance_metrics(appetite_category_id);
CREATE INDEX idx_tolerance_metrics_kri ON tolerance_metrics(kri_id);

-- RLS Policies
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

-- ================================================================
-- 4. APPETITE BREACHES (EVENTS)
-- ================================================================
-- Mint ONLY when Amber/Red breach detected
-- Idempotent: One OPEN breach per metric per severity at a time

CREATE TABLE IF NOT EXISTS appetite_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tolerance_metric_id UUID NOT NULL REFERENCES tolerance_metrics(id) ON DELETE CASCADE,
  kri_value_id UUID REFERENCES kri_values(id), -- What triggered the breach

  -- Breach Details
  breach_type TEXT NOT NULL CHECK (breach_type IN ('AMBER', 'RED')),
  breach_value DECIMAL NOT NULL,
  threshold_value DECIMAL NOT NULL, -- The threshold that was crossed
  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- FIX #3: Severity Provenance (track escalation history)
  prior_breach_id UUID REFERENCES appetite_breaches(id), -- Links to previous Amber breach when escalated to Red

  -- Remediation (Required for Amber/Red)
  remediation_plan TEXT,
  remediation_owner UUID REFERENCES user_profiles(id),
  remediation_due_date DATE,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'BOARD_ACCEPTED')),

  -- Escalation Tracking
  escalated_to JSONB, -- Array of roles/names with timestamps
  -- Example: [{"role": "CRO", "escalated_at": "2025-12-13T10:00:00Z"}]
  escalated_at TIMESTAMP,

  -- Resolution
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,

  -- Board Exception Approval (only for BOARD_ACCEPTED status)
  board_accepted_by UUID REFERENCES user_profiles(id),
  board_accepted_at TIMESTAMP,
  board_acceptance_rationale TEXT,
  temporary_threshold DECIMAL, -- Board-approved temporary threshold
  exception_valid_until DATE,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Idempotency: Prevent duplicate breach detection for same KRI value
  CONSTRAINT unique_active_breach UNIQUE (tolerance_metric_id, kri_value_id)
);

-- Indexes for performance
CREATE INDEX idx_appetite_breaches_status ON appetite_breaches(organization_id, status);
CREATE INDEX idx_appetite_breaches_type ON appetite_breaches(organization_id, breach_type, detected_at DESC);
CREATE INDEX idx_appetite_breaches_metric ON appetite_breaches(tolerance_metric_id);

-- Index for finding OPEN breaches (idempotency check)
CREATE INDEX idx_appetite_breaches_open ON appetite_breaches(tolerance_metric_id, status)
WHERE status IN ('OPEN', 'IN_PROGRESS');

-- RLS Policies
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

-- FIX #5: Remediation owners can update their assigned breaches
-- CRITICAL: Cannot modify BOARD_ACCEPTED breaches (governance integrity)
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
  AND status NOT IN ('BOARD_ACCEPTED') -- Hard stop: Board decisions are immutable by non-Board users
);

-- ================================================================
-- 5. HELPER FUNCTIONS
-- ================================================================

-- Function: Get active appetite statement for organization
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

-- Function: Check if tolerance metric has recent KRI data
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

-- ================================================================
-- 6. AUDIT TRIGGERS
-- ================================================================

-- Update timestamp trigger for tolerance_metrics
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

-- Update timestamp trigger for appetite_breaches
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

-- ================================================================
-- 7. VALIDATION CONSTRAINTS
-- ================================================================

-- Ensure BOARD_ACCEPTED breaches have board approval metadata
ALTER TABLE appetite_breaches
ADD CONSTRAINT board_accepted_requires_metadata
CHECK (
  status != 'BOARD_ACCEPTED' OR (
    board_accepted_by IS NOT NULL AND
    board_accepted_at IS NOT NULL AND
    board_acceptance_rationale IS NOT NULL
  )
);

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

-- Grant permissions (enable RLS)
ALTER TABLE risk_appetite_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_appetite_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolerance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE appetite_breaches ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Risk Appetite & Tolerance Module migration complete';
  RAISE NOTICE '   - 4 tables created';
  RAISE NOTICE '   - RLS policies enabled';
  RAISE NOTICE '   - Helper functions created';
  RAISE NOTICE '   - Audit triggers configured';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Next Steps:';
  RAISE NOTICE '   1. Create Risk Appetite Statement (Admin Panel)';
  RAISE NOTICE '   2. Define appetite categories for each risk type';
  RAISE NOTICE '   3. Configure tolerance metrics linked to KRIs';
  RAISE NOTICE '   4. Monitor appetite utilization dashboard';
END $$;
