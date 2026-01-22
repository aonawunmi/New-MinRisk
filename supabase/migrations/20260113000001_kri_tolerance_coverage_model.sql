-- ============================================================================
-- PHASE 1: KRI-Tolerance Coverage Model Migration
-- ============================================================================
-- Date: 2026-01-13
-- Purpose: Implement many-to-many KRI-Tolerance coverage model
-- Strategy: A1 - New tables + backfill + backward-compatible view
-- ============================================================================

-- ============================================================================
-- 1. CREATE ENUMS
-- ============================================================================

-- Coverage strength: how important is this KRI to the tolerance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coverage_strength') THEN
        CREATE TYPE coverage_strength AS ENUM ('primary', 'secondary', 'supplementary');
    END IF;
END $$;

-- Signal type: leading/lagging classification
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_type') THEN
        CREATE TYPE signal_type AS ENUM ('leading', 'concurrent', 'lagging');
    END IF;
END $$;

-- Tolerance status: governance lifecycle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tolerance_status') THEN
        CREATE TYPE tolerance_status AS ENUM ('draft', 'pending_approval', 'approved', 'superseded', 'retired');
    END IF;
END $$;

-- Tolerance risk signal level: computed from KRI aggregation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_signal_level') THEN
        CREATE TYPE risk_signal_level AS ENUM ('normal', 'watch', 'concern', 'imminent', 'breach');
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE TOLERANCE_LIMITS TABLE (replaces appetite_kri_thresholds)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tolerance_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Link to appetite category
    appetite_category_id UUID REFERENCES risk_appetite_categories(id) ON DELETE SET NULL,
    
    -- Metric definition
    metric_name VARCHAR(255) NOT NULL,
    metric_description TEXT,
    metric_type VARCHAR(20) CHECK (metric_type IN ('RANGE', 'MAXIMUM', 'MINIMUM', 'DIRECTIONAL')) DEFAULT 'MAXIMUM',
    unit VARCHAR(50) DEFAULT '%',
    
    -- Threshold bands (Green/Amber/Red)
    green_min NUMERIC,
    green_max NUMERIC,
    amber_min NUMERIC,
    amber_max NUMERIC,
    red_min NUMERIC,
    red_max NUMERIC,
    
    -- Governance status
    status tolerance_status DEFAULT 'draft',
    version_number INTEGER DEFAULT 1,
    
    -- Validity period
    effective_from DATE,
    effective_to DATE,
    
    -- Activation
    is_active BOOLEAN DEFAULT false,
    
    -- Audit trail
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, metric_name, version_number)
);

-- RLS
ALTER TABLE tolerance_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org tolerance limits"
    ON tolerance_limits FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage org tolerance limits"
    ON tolerance_limits FOR ALL
    USING (
        organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'admin')
        )
    );

-- ============================================================================
-- 3. CREATE TOLERANCE_KRI_COVERAGE JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tolerance_kri_coverage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- The relationship
    tolerance_limit_id UUID NOT NULL REFERENCES tolerance_limits(id) ON DELETE CASCADE,
    kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
    
    -- Coverage classification
    coverage_strength coverage_strength NOT NULL DEFAULT 'secondary',
    signal_type signal_type NOT NULL DEFAULT 'leading',
    
    -- Governance
    coverage_rationale TEXT, -- Required for primary links
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(organization_id, tolerance_limit_id, kri_id)
);

-- RLS
ALTER TABLE tolerance_kri_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org coverage"
    ON tolerance_kri_coverage FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage org coverage"
    ON tolerance_kri_coverage FOR ALL
    USING (
        organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'admin')
        )
    );

-- ============================================================================
-- 4. CREATE TOLERANCE_RISK_SIGNALS TABLE (computed bridge)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tolerance_risk_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    tolerance_limit_id UUID NOT NULL REFERENCES tolerance_limits(id) ON DELETE CASCADE,
    
    -- Computed signal
    signal_level risk_signal_level NOT NULL DEFAULT 'normal',
    
    -- Computation metadata
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contributing_kris JSONB DEFAULT '[]',  -- Array of {kri_id, status, strength}
    aggregation_rule_used VARCHAR(100),
    
    -- Latest values for quick lookup
    primary_red_count INTEGER DEFAULT 0,
    secondary_red_count INTEGER DEFAULT 0,
    amber_count INTEGER DEFAULT 0
);

-- RLS
ALTER TABLE tolerance_risk_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org risk signals"
    ON tolerance_risk_signals FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage risk signals"
    ON tolerance_risk_signals FOR ALL
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 5. BACKFILL FROM APPETITE_KRI_THRESHOLDS
-- ============================================================================

INSERT INTO tolerance_limits (
    id,
    organization_id,
    appetite_category_id,
    metric_name,
    metric_description,
    metric_type,
    unit,
    green_min,
    green_max,
    amber_min,
    amber_max,
    red_min,
    red_max,
    status,
    version_number,
    effective_from,
    effective_to,
    is_active,
    created_by,
    created_at,
    updated_at
)
SELECT
    id,
    organization_id,
    appetite_category_id,
    metric_name,
    metric_description,
    metric_type,
    unit,
    green_min,
    green_max,
    amber_min,
    amber_max,
    red_min,
    red_max,
    CASE WHEN is_active THEN 'approved'::tolerance_status ELSE 'draft'::tolerance_status END,
    1,
    effective_from,
    effective_to,
    is_active,
    created_by,
    created_at,
    updated_at
FROM appetite_kri_thresholds
ON CONFLICT (organization_id, metric_name, version_number) DO NOTHING;

-- ============================================================================
-- 6. CREATE BACKWARD-COMPATIBLE VIEW
-- ============================================================================

-- Drop the old view if it exists (from tolerance_metrics)
DROP VIEW IF EXISTS tolerance_metrics;

-- Create view mapping old name to new table
CREATE OR REPLACE VIEW appetite_kri_thresholds_v2 AS
SELECT 
    id,
    organization_id,
    appetite_category_id,
    NULL::UUID AS kri_id, -- Deprecated: use tolerance_kri_coverage instead
    metric_name,
    metric_description,
    metric_type,
    unit,
    green_min,
    green_max,
    amber_min,
    amber_max,
    red_min,
    red_max,
    is_active,
    effective_from,
    effective_to,
    created_by,
    created_at,
    updated_at,
    status,
    version_number,
    approved_by,
    approved_at
FROM tolerance_limits;

-- Grant access
GRANT SELECT ON appetite_kri_thresholds_v2 TO authenticated;
GRANT SELECT ON appetite_kri_thresholds_v2 TO anon;

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tolerance_limits_org ON tolerance_limits(organization_id);
CREATE INDEX IF NOT EXISTS idx_tolerance_limits_status ON tolerance_limits(status) WHERE status IN ('draft', 'approved');
CREATE INDEX IF NOT EXISTS idx_tolerance_limits_category ON tolerance_limits(appetite_category_id);

CREATE INDEX IF NOT EXISTS idx_tolerance_kri_coverage_tolerance ON tolerance_kri_coverage(tolerance_limit_id);
CREATE INDEX IF NOT EXISTS idx_tolerance_kri_coverage_kri ON tolerance_kri_coverage(kri_id);
CREATE INDEX IF NOT EXISTS idx_tolerance_kri_coverage_strength ON tolerance_kri_coverage(coverage_strength) WHERE coverage_strength = 'primary';

CREATE INDEX IF NOT EXISTS idx_tolerance_risk_signals_tolerance ON tolerance_risk_signals(tolerance_limit_id);
CREATE INDEX IF NOT EXISTS idx_tolerance_risk_signals_level ON tolerance_risk_signals(signal_level) WHERE signal_level NOT IN ('normal');

-- ============================================================================
-- 8. UPDATED_AT TRIGGER FOR TOLERANCE_LIMITS
-- ============================================================================

DROP TRIGGER IF EXISTS update_tolerance_limits_updated_at ON tolerance_limits;
CREATE TRIGGER update_tolerance_limits_updated_at
    BEFORE UPDATE ON tolerance_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. COMPUTE TOLERANCE RISK SIGNAL FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_tolerance_risk_signal(p_tolerance_id UUID)
RETURNS risk_signal_level
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_primary_red INTEGER := 0;
    v_secondary_red INTEGER := 0;
    v_amber_count INTEGER := 0;
    v_result risk_signal_level := 'normal';
    v_org_id UUID;
BEGIN
    -- Get organization ID
    SELECT organization_id INTO v_org_id
    FROM tolerance_limits WHERE id = p_tolerance_id;
    
    -- Count KRI statuses by coverage strength
    -- This assumes kri_definitions has a current_status field or we compute it
    -- For now, we'll use a simplified approach
    
    SELECT 
        COUNT(*) FILTER (WHERE tc.coverage_strength = 'primary') AS primary_count,
        COUNT(*) FILTER (WHERE tc.coverage_strength = 'secondary') AS secondary_count,
        COUNT(*) AS total_count
    INTO v_primary_red, v_secondary_red, v_amber_count
    FROM tolerance_kri_coverage tc
    WHERE tc.tolerance_limit_id = p_tolerance_id;
    
    -- Apply aggregation rules (simplified - full implementation needs KRI status)
    -- Rule: 1+ primary KRI = RED → imminent
    -- Rule: 2+ secondary RED → imminent
    -- Rule: 1 RED + 2 AMBER → concern
    -- Rule: 3+ AMBER → watch
    
    -- For now, return normal until KRI status integration
    v_result := 'normal';
    
    -- Upsert the signal
    INSERT INTO tolerance_risk_signals (
        organization_id,
        tolerance_limit_id,
        signal_level,
        computed_at,
        aggregation_rule_used,
        primary_red_count,
        secondary_red_count,
        amber_count
    ) VALUES (
        v_org_id,
        p_tolerance_id,
        v_result,
        NOW(),
        'default_ruleset',
        v_primary_red,
        v_secondary_red,
        v_amber_count
    )
    ON CONFLICT (organization_id) 
    DO UPDATE SET
        signal_level = v_result,
        computed_at = NOW(),
        primary_red_count = v_primary_red,
        secondary_red_count = v_secondary_red,
        amber_count = v_amber_count;
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created:
-- ✅ Enums: coverage_strength, signal_type, tolerance_status, risk_signal_level
-- ✅ tolerance_limits - Clean replacement for appetite_kri_thresholds
-- ✅ tolerance_kri_coverage - Many-to-many junction table
-- ✅ tolerance_risk_signals - Computed bridge for risk signals
-- ✅ Backfilled data from appetite_kri_thresholds
-- ✅ Backward-compatible view: appetite_kri_thresholds_v2
-- ✅ Indexes for performance
-- ✅ compute_tolerance_risk_signal function
-- ============================================================================

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
