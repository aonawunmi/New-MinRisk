-- ============================================================================
-- Phase 1: Outcomes Model Foundation - KRI Observations Table
-- ============================================================================
-- Date: 2026-01-15
-- Purpose: Create kri_observations table for time-series actuals
-- Strategy: Period-based logging with maker-checker and immutability
-- ============================================================================

-- ============================================================================
-- 1. CREATE KRI_OBSERVATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS kri_observations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Link to KRI definition
    kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
    
    -- Time period (optional - can be linked later if reporting_periods table is created)
    period_id UUID, -- No foreign key constraint to avoid dependency issues
    observation_date DATE NOT NULL,
    
    -- The actual measured value
    observed_value NUMERIC NOT NULL,
    
    -- Data provenance
    data_source VARCHAR(255), -- e.g., 'Manual Entry', 'System Feed', 'API Import'
    observed_by UUID REFERENCES auth.users(id),
    verified_by UUID REFERENCES auth.users(id), -- Maker-checker
    
    -- Commentary and context
    commentary TEXT,
    
    -- Workflow status
    status VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
    
    -- Versioning (immutability - new version if correction needed)
    version_number INTEGER DEFAULT 1,
    superseded_by UUID REFERENCES kri_observations(id) ON DELETE SET NULL,
    
    -- Audit trail
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(kri_id, observation_date, version_number),
    CHECK (observation_date IS NOT NULL)
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX idx_kri_observations_kri ON kri_observations(kri_id, observation_date DESC);
CREATE INDEX idx_kri_observations_org ON kri_observations(organization_id);
CREATE INDEX idx_kri_observations_period ON kri_observations(period_id);
CREATE INDEX idx_kri_observations_status ON kri_observations(status) WHERE status = 'approved';
CREATE INDEX idx_kri_observations_latest ON kri_observations(kri_id, version_number DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE kri_observations ENABLE ROW LEVEL SECURITY;

-- Users can view observations in their organization
CREATE POLICY "Users can view org kri observations"
    ON kri_observations FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Users can create draft observations
CREATE POLICY "Users can create draft kri observations"
    ON kri_observations FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND created_by = auth.uid()
        AND status = 'draft'
    );

-- Users can update their own draft observations
CREATE POLICY "Users can update own draft kri observations"
    ON kri_observations FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        AND created_by = auth.uid()
        AND status = 'draft'
    );

-- Admins can manage all observations
CREATE POLICY "Admins can manage org kri observations"
    ON kri_observations FOR ALL
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
-- 4. HELPER FUNCTION: Get Latest Approved Observation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_latest_kri_observation(p_kri_id UUID, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    observation_id UUID,
    observed_value NUMERIC,
    observation_date DATE,
    data_source VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        kri_observations.observed_value,
        kri_observations.observation_date,
        kri_observations.data_source
    FROM kri_observations
    WHERE kri_id = p_kri_id
    AND status = 'approved'
    AND observation_date <= p_as_of_date
    AND superseded_by IS NULL
    ORDER BY observation_date DESC, version_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created:
-- ✅ kri_observations table (time-series actuals)
-- ✅ RLS policies (org-scoped with maker-checker support)
-- ✅ Indexes for time-series queries
-- ✅ Versioning and immutability support
-- ✅ Helper function for latest observation lookups
-- ============================================================================

NOTIFY pgrst, 'reload schema';
