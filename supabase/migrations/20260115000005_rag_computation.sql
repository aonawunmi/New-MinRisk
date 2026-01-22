-- ============================================================================
-- Phase 2: RAG Computation Functions
-- ============================================================================
-- Date: 2026-01-15
-- Purpose: Create deterministic R AG computation based on actuals vs limits
-- Strategy: System-derived status, never stored
-- ============================================================================

-- ============================================================================
-- 1. CREATE RAG COMPUTATION FUNCTION FOR SINGLE TOLERANCE METRIC
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_tolerance_metric_rag(
    p_metric_id UUID,
    p_period_id UUID DEFAULT NULL,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS VARCHAR AS $$
DECLARE
    v_actual NUMERIC;
    v_soft NUMERIC;
    v_hard NUMERIC;
    v_direction VARCHAR;
    v_kri_id UUID;
BEGIN
    -- Get metric limits and direction
    SELECT soft_limit, hard_limit, limit_direction
    INTO v_soft, v_hard, v_direction
    FROM tolerance_limits
    WHERE id = p_metric_id;
    
    IF v_soft IS NULL OR v_hard IS NULL OR v_direction IS NULL THEN
        RETURN 'UNKNOWN';  -- Metric not properly configured
    END IF;
    
    -- Get the PRIMARY KRI linked to this tolerance metric
    SELECT kri_id INTO v_kri_id
    FROM tolerance_kri_coverage
    WHERE tolerance_limit_id = p_metric_id
    AND coverage_strength = 'primary'
    LIMIT 1;
    
    IF v_kri_id IS NULL THEN
        RETURN 'NO_KRI';  -- No primary KRI linked
    END IF;
    
    -- Get latest approved observation for this KRI
    IF p_period_id IS NOT NULL THEN
        -- Use period-specific observation
        SELECT observed_value INTO v_actual
        FROM kri_observations
        WHERE kri_id = v_kri_id
        AND period_id = p_period_id
        AND status = 'approved'
        AND superseded_by IS NULL
        ORDER BY version_number DESC
        LIMIT 1;
    ELSE
        -- Use latest observation as of date
        SELECT observed_value INTO v_actual
        FROM kri_observations
        WHERE kri_id = v_kri_id
        AND observation_date <= p_as_of_date
        AND status = 'approved'
        AND superseded_by IS NULL
        ORDER BY observation_date DESC, version_number DESC
        LIMIT 1;
    END IF;
    
    IF v_actual IS NULL THEN
        RETURN 'NO_DATA';  -- No observation yet
    END IF;
    
    -- Compute RAG based on direction
    IF v_direction = 'above' THEN
        -- Higher values are worse (e.g., error count, loss amount)
        IF v_actual >= v_hard THEN RETURN 'RED';
        ELSIF v_actual >= v_soft THEN RETURN 'AMBER';
        ELSE RETURN 'GREEN';
        END IF;
        
    ELSIF v_direction = 'below' THEN
        -- Lower values are worse (e.g., liquidity ratio, customer satisfaction)
        IF v_actual <= v_hard THEN RETURN 'RED';
        ELSIF v_actual <= v_soft THEN RETURN 'AMBER';
        ELSE RETURN 'GREEN';
        END IF;
        
    ELSIF v_direction = 'between' THEN
        -- Values outside range are worse (e.g., temperature, volatility)
        -- hard_limit is lower bound, soft_limit is upper bound
        IF v_actual < v_hard OR v_actual > v_soft THEN RETURN 'RED';
        -- Amber zone: approaching boundaries
        ELSIF v_actual < (v_hard * 1.1) OR v_actual > (v_soft * 0.9) THEN RETURN 'AMBER';
        ELSE RETURN 'GREEN';
        END IF;
    END IF;
    
    RETURN 'UNKNOWN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION compute_tolerance_metric_rag TO authenticated;

-- ============================================================================
-- 2. CREATE VIEW FOR EASY RAG QUERIES
-- ============================================================================

CREATE OR REPLACE VIEW tolerance_metric_rag_status AS
SELECT 
    tl.id AS metric_id,
    tl.metric_name,
    tl.risk_id,
    tl.outcome_id,
    tl.soft_limit,
    tl.hard_limit,
    tl.limit_direction,
    tl.unit,
    
    -- Get primary KRI info
    tkc.kri_id AS primary_kri_id,
    kd.kri_code,
    kd.kri_name,
    
    -- Get latest observation
    ko.observed_value AS latest_actual,
    ko.observation_date AS latest_observation_date,
    
    -- Compute RAG
    compute_tolerance_metric_rag(tl.id, NULL, CURRENT_DATE) AS rag_status
    
FROM tolerance_limits tl
LEFT JOIN tolerance_kri_coverage tkc ON tkc.tolerance_limit_id = tl.id AND tkc.coverage_strength = 'primary'
LEFT JOIN kri_definitions kd ON kd.id = tkc.kri_id
LEFT JOIN LATERAL (
    SELECT observed_value, observation_date
    FROM kri_observations
    WHERE kri_id = tkc.kri_id
    AND status = 'approved'
    AND superseded_by IS NULL
    ORDER BY observation_date DESC, version_number DESC
    LIMIT 1
) ko ON true
WHERE tl.is_active = true;

-- Grant access
GRANT SELECT ON tolerance_metric_rag_status TO authenticated;

-- ============================================================================
-- 3. CREATE CONTAINER-LEVEL AGGREGATION FUNCTION
-- ============================================================================

-- For future use when we have tolerance_containers table
-- This function aggregates multiple metrics under a container (worst-of)

CREATE OR REPLACE FUNCTION compute_container_rag(
    p_outcome_id UUID,
    p_period_id UUID DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
    v_has_red BOOLEAN;
    v_has_amber BOOLEAN;
    v_has_green BOOLEAN;
    v_has_unknown BOOLEAN;
    v_metric_rag VARCHAR;
BEGIN
    -- For each active tolerance metric linked to this outcome,
    -- compute its RAG status and apply worst-of aggregation
    
    v_has_red := false;
    v_has_amber := false;
    v_has_green := false;
    v_has_unknown := false;
    
    FOR v_metric_rag IN
        SELECT compute_tolerance_metric_rag(id, p_period_id, CURRENT_DATE)
        FROM tolerance_limits
        WHERE outcome_id = p_outcome_id
        AND is_active = true
    LOOP
        IF v_metric_rag = 'RED' THEN
            v_has_red := true;
        ELSIF v_metric_rag = 'AMBER' THEN
            v_has_amber := true;
        ELSIF v_metric_rag = 'GREEN' THEN
            v_has_green := true;
        ELSE
            v_has_unknown := true;
        END IF;
    END LOOP;
    
    -- Worst-of aggregation
    IF v_has_red THEN RETURN 'RED';
    ELSIF v_has_amber THEN RETURN 'AMBER';
    ELSIF v_has_green THEN RETURN 'GREEN';
    ELSIF v_has_unknown THEN RETURN 'UNKNOWN';
    ELSE RETURN 'NO_METRICS';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION compute_container_rag TO authenticated;

-- ============================================================================
-- 4. CREATE HELPER VIEW FOR PERIOD-BASED RAG HISTORY
-- ============================================================================

-- This view allows querying RAG status for historical periods
-- Useful for trend analysis and reporting

CREATE OR REPLACE VIEW tolerance_rag_history AS
SELECT 
    tl.id AS metric_id,
    tl.metric_name,
    rp.id AS period_id,
    rp.period_name,
    rp.start_date,
    rp.end_date,
    
    -- Compute RAG for this period
    compute_tolerance_metric_rag(tl.id, rp.id, rp.end_date) AS rag_status
    
FROM tolerance_limits tl
CROSS JOIN reporting_periods rp
WHERE tl.is_active = true
AND rp.end_date >= tl.effective_from
AND (tl.effective_to IS NULL OR rp.start_date <= tl.effective_to)
ORDER BY tl.metric_name, rp.start_date DESC;

GRANT SELECT ON tolerance_rag_history TO authenticated;

-- ============================================================================
-- 5. CREATE MATERIALIZED VIEW FOR DASHBOARD PERFORMANCE (Optional)
-- ============================================================================

-- For high-frequency dashboard queries, create a materialized view
-- Refresh this periodically (e.g., hourly or after observation updates)

CREATE MATERIALIZED VIEW IF NOT EXISTS tolerance_rag_snapshot AS
SELECT 
    tl.id AS metric_id,
    tl.organization_id,
    tl.metric_name,
    tl.risk_id,
    tl.outcome_id,
    compute_tolerance_metric_rag(tl.id, NULL, CURRENT_DATE) AS rag_status,
    CURRENT_TIMESTAMP AS snapshot_at
FROM tolerance_limits tl
WHERE tl.is_active = true;

-- Create index for fast org-level queries
CREATE INDEX IF NOT EXISTS idx_tolerance_rag_snapshot_org 
ON tolerance_rag_snapshot(organization_id);

CREATE INDEX IF NOT EXISTS idx_tolerance_rag_snapshot_status 
ON tolerance_rag_snapshot(rag_status) 
WHERE rag_status IN ('RED', 'AMBER');

-- Grant access
GRANT SELECT ON tolerance_rag_snapshot TO authenticated;

-- Create refresh function (to be called by cron or trigger)
CREATE OR REPLACE FUNCTION refresh_tolerance_rag_snapshot()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW tolerance_rag_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created:
-- ✅ compute_tolerance_metric_rag(metric_id, period_id, as_of_date)
-- ✅ tolerance_metric_rag_status view (latest RAG for all metrics)
-- ✅ compute_container_rag(outcome_id) - worst-of aggregation
-- ✅ tolerance_rag_history view (period-based RAG history)
-- ✅ tolerance_rag_snapshot materialized view (dashboard performance)
-- ============================================================================

NOTIFY pgrst, 'reload schema';
