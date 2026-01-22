-- ============================================================================
-- Phase 1: Outcomes Model Foundation - Risk Outcomes Table
-- ============================================================================
-- Date: 2026-01-15
-- Purpose: Create risk_outcomes table to model harm types per risk
-- Strategy: Multi-select impact log with controlled outcome buckets
-- ============================================================================

-- ============================================================================
-- 1. CREATE OUTCOME_TYPE ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outcome_type') THEN
        CREATE TYPE outcome_type AS ENUM (
            'Financial Impact',
            'Customer Impact',
            'Regulatory Impact',
            'Operational Impact',
            'Reputational Impact',
            'Strategic Impact'
        );
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE RISK_OUTCOMES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_outcomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Link to risk (many outcomes per risk)
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    
    -- Outcome classification
    outcome_type outcome_type NOT NULL,
    outcome_description TEXT,
    
    -- Quantifiability assessment
    quantifiable_flag VARCHAR(10) CHECK (quantifiable_flag IN ('Yes', 'No', 'Proxy')) DEFAULT 'No',
    preferred_unit VARCHAR(50), -- e.g., 'USD', '%', 'count', 'hours'
    measurement_horizon VARCHAR(20), -- e.g., 'Monthly', 'Quarterly', 'Event-based'
    
    -- Materiality and governance
    materiality_flag BOOLEAN DEFAULT false, -- Board-material?
    status VARCHAR(20) CHECK (status IN ('draft', 'approved', 'superseded', 'retired')) DEFAULT 'draft',
    
    -- AI metadata
    ai_extracted BOOLEAN DEFAULT false,
    ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    
    -- Audit trail
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(risk_id, outcome_type) -- One entry per outcome type per risk
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX idx_risk_outcomes_risk ON risk_outcomes(risk_id);
CREATE INDEX idx_risk_outcomes_org ON risk_outcomes(organization_id);
CREATE INDEX idx_risk_outcomes_type ON risk_outcomes(outcome_type);
CREATE INDEX idx_risk_outcomes_material ON risk_outcomes(materiality_flag) WHERE materiality_flag = true;
CREATE INDEX idx_risk_outcomes_status ON risk_outcomes(status) WHERE status IN ('draft', 'approved');

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE risk_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can view outcomes in their organization
CREATE POLICY "Users can view org outcomes"
    ON risk_outcomes FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Admins can manage outcomes
CREATE POLICY "Admins can manage org outcomes"
    ON risk_outcomes FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('primary_admin', 'secondary_admin', 'admin')
        )
    );

-- ============================================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS update_risk_outcomes_updated_at ON risk_outcomes;
CREATE TRIGGER update_risk_outcomes_updated_at
    BEFORE UPDATE ON risk_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created:
-- ✅ outcome_type enum (6 harm types)
-- ✅ risk_outcomes table (multi-select impact log)
-- ✅ RLS policies (org-scoped)
-- ✅ Indexes for performance
-- ✅ Audit trail and versioning support
-- ============================================================================

NOTIFY pgrst, 'reload schema';
