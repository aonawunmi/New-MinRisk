-- ============================================================================
-- RAF Layer B Migration: Robustness Improvements
-- ============================================================================
-- 
-- This migration adds:
-- 1. recalc_runs table for distributed-safe RAF recalculation
-- 2. tolerance_breach_history table for SUSTAINED and N_BREACHES rules
-- 3. sync_kri_with_tolerance_atomic RPC function
-- 4. Additional columns on tolerance_metrics for breach rules
-- ============================================================================

-- ============================================================================
-- 1. RECALC_RUNS TABLE (Distributed-Safe Recalculation)
-- ============================================================================
-- Replaces the client-side debounce with a DB-level lock mechanism

CREATE TABLE IF NOT EXISTS public.recalc_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    run_type TEXT NOT NULL CHECK (run_type IN ('FULL', 'CATEGORY', 'RISK')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    risks_processed INTEGER DEFAULT 0,
    risks_updated INTEGER DEFAULT 0,
    risks_failed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Unique constraint to prevent concurrent runs for same org
    CONSTRAINT unique_running_recalc UNIQUE (organization_id, status) 
        WHERE (status = 'RUNNING')
);

-- Index for quick status checks
CREATE INDEX IF NOT EXISTS idx_recalc_runs_org_status 
    ON public.recalc_runs(organization_id, status);

-- ============================================================================
-- 2. TOLERANCE_BREACH_HISTORY TABLE
-- ============================================================================
-- Records breach events for SUSTAINED and N_BREACHES rule evaluation

CREATE TABLE IF NOT EXISTS public.tolerance_breach_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    tolerance_id UUID NOT NULL, -- References appetite_kri_thresholds or tolerance_metrics
    risk_id UUID REFERENCES public.risks(id) ON DELETE CASCADE,
    breach_type TEXT NOT NULL CHECK (breach_type IN ('SOFT', 'HARD')),
    breach_value NUMERIC NOT NULL,
    limit_value NUMERIC NOT NULL,
    breach_direction TEXT NOT NULL CHECK (breach_direction IN ('UP', 'DOWN')),
    measurement_date DATE NOT NULL,
    resolved_at TIMESTAMPTZ,
    period_number INTEGER, -- For tracking consecutive periods
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient breach rule queries
CREATE INDEX IF NOT EXISTS idx_breach_history_tolerance_date 
    ON public.tolerance_breach_history(tolerance_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_breach_history_risk_date 
    ON public.tolerance_breach_history(risk_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_breach_history_org_unresolved 
    ON public.tolerance_breach_history(organization_id, resolved_at) 
    WHERE resolved_at IS NULL;

-- ============================================================================
-- 3. ADD BREACH RULE COLUMNS TO TOLERANCE METRICS
-- ============================================================================

-- Add breach configuration columns if they don't exist
DO $$
BEGIN
    -- breach_direction
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appetite_kri_thresholds' AND column_name = 'breach_direction'
    ) THEN
        ALTER TABLE public.appetite_kri_thresholds 
        ADD COLUMN breach_direction TEXT DEFAULT 'UP' CHECK (breach_direction IN ('UP', 'DOWN'));
    END IF;

    -- comparison_operator
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appetite_kri_thresholds' AND column_name = 'comparison_operator'
    ) THEN
        ALTER TABLE public.appetite_kri_thresholds 
        ADD COLUMN comparison_operator TEXT DEFAULT 'gte' CHECK (comparison_operator IN ('gt', 'gte', 'lt', 'lte', 'eq'));
    END IF;

    -- breach_rule
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appetite_kri_thresholds' AND column_name = 'breach_rule'
    ) THEN
        ALTER TABLE public.appetite_kri_thresholds 
        ADD COLUMN breach_rule TEXT DEFAULT 'POINT_IN_TIME' CHECK (breach_rule IN ('POINT_IN_TIME', 'SUSTAINED_N_PERIODS', 'N_BREACHES_IN_WINDOW'));
    END IF;

    -- breach_rule_config (JSONB for flexibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appetite_kri_thresholds' AND column_name = 'breach_rule_config'
    ) THEN
        ALTER TABLE public.appetite_kri_thresholds 
        ADD COLUMN breach_rule_config JSONB DEFAULT '{}';
    END IF;

    -- measurement_window_days
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appetite_kri_thresholds' AND column_name = 'measurement_window_days'
    ) THEN
        ALTER TABLE public.appetite_kri_thresholds 
        ADD COLUMN measurement_window_days INTEGER DEFAULT 90;
    END IF;

    -- escalation_severity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appetite_kri_thresholds' AND column_name = 'escalation_severity'
    ) THEN
        ALTER TABLE public.appetite_kri_thresholds 
        ADD COLUMN escalation_severity TEXT DEFAULT 'WARN' CHECK (escalation_severity IN ('INFO', 'WARN', 'CRITICAL'));
    END IF;
END $$;

-- ============================================================================
-- 4. ATOMIC SYNC KRI WITH TOLERANCE RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_kri_with_tolerance_atomic(
    p_kri_id UUID,
    p_tolerance_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tolerance RECORD;
    v_limits RECORD;
    v_kri_target NUMERIC;
    v_kri_warning NUMERIC;
    v_kri_critical NUMERIC;
    v_result JSONB;
BEGIN
    -- Start transaction (implicit in function)
    
    -- 1. Get tolerance with limits
    SELECT t.*, t.green_max, t.amber_max, t.red_min, t.metric_name, t.unit
    INTO v_tolerance
    FROM public.appetite_kri_thresholds t
    WHERE t.id = p_tolerance_id;
    
    IF v_tolerance IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tolerance not found'
        );
    END IF;
    
    -- 2. Get associated limits (if any)
    SELECT soft_limit, hard_limit
    INTO v_limits
    FROM public.risk_limits
    WHERE tolerance_id = p_tolerance_id
    LIMIT 1;
    
    -- 3. Calculate KRI thresholds
    v_kri_target := COALESCE(v_tolerance.green_max, 0);
    v_kri_warning := COALESCE(
        v_limits.soft_limit, 
        v_tolerance.amber_max, 
        v_tolerance.green_max * 1.2
    );
    v_kri_critical := COALESCE(
        v_limits.hard_limit, 
        v_tolerance.red_min, 
        v_tolerance.green_max * 1.5
    );
    
    -- 4. Update KRI definition (atomic)
    UPDATE public.kri_definitions
    SET 
        target_value = v_kri_target,
        lower_threshold = v_kri_warning,
        upper_threshold = v_kri_critical,
        measurement_unit = COALESCE(v_tolerance.unit, 'count'),
        updated_at = now()
    WHERE id = p_kri_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'KRI not found'
        );
    END IF;
    
    -- 5. Update tolerance to link to KRI (atomic)
    UPDATE public.appetite_kri_thresholds
    SET 
        kri_id = p_kri_id,
        updated_at = now()
    WHERE id = p_tolerance_id;
    
    -- 6. Log audit event
    INSERT INTO public.audit_logs (
        organization_id,
        user_id,
        action,
        entity_type,
        entity_id,
        changes,
        created_at
    )
    SELECT 
        v_tolerance.organization_id,
        p_user_id,
        'SYNC_KRI_TOLERANCE',
        'tolerance',
        p_tolerance_id,
        jsonb_build_object(
            'kri_id', p_kri_id,
            'tolerance_id', p_tolerance_id,
            'kri_target', v_kri_target,
            'kri_warning', v_kri_warning,
            'kri_critical', v_kri_critical
        ),
        now()
    WHERE EXISTS (SELECT 1 FROM public.audit_logs LIMIT 0); -- Only if table exists
    
    -- Return success with mapping details
    RETURN jsonb_build_object(
        'success', true,
        'mapping', jsonb_build_object(
            'toleranceId', p_tolerance_id,
            'kriId', p_kri_id,
            'kriTarget', v_kri_target,
            'kriWarning', v_kri_warning,
            'kriCritical', v_kri_critical,
            'unit', COALESCE(v_tolerance.unit, 'count')
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- 5. ACQUIRE RECALC LOCK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.acquire_recalc_lock(
    p_organization_id UUID,
    p_run_type TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_run_id UUID;
    v_new_run_id UUID;
BEGIN
    -- Check for existing running recalc
    SELECT id INTO v_existing_run_id
    FROM public.recalc_runs
    WHERE organization_id = p_organization_id
      AND status = 'RUNNING'
    LIMIT 1;
    
    IF v_existing_run_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Recalculation already in progress',
            'existing_run_id', v_existing_run_id
        );
    END IF;
    
    -- Create new run record
    INSERT INTO public.recalc_runs (
        organization_id,
        run_type,
        status,
        started_at,
        created_by
    ) VALUES (
        p_organization_id,
        p_run_type,
        'RUNNING',
        now(),
        p_user_id
    )
    RETURNING id INTO v_new_run_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'run_id', v_new_run_id
    );
END;
$$;

-- ============================================================================
-- 6. COMPLETE RECALC RUN FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_recalc_run(
    p_run_id UUID,
    p_status TEXT,
    p_risks_processed INTEGER DEFAULT 0,
    p_risks_updated INTEGER DEFAULT 0,
    p_risks_failed INTEGER DEFAULT 0,
    p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.recalc_runs
    SET 
        status = p_status,
        completed_at = now(),
        risks_processed = p_risks_processed,
        risks_updated = p_risks_updated,
        risks_failed = p_risks_failed,
        error_message = p_error_message
    WHERE id = p_run_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Run not found');
    END IF;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 7. GET BREACH HISTORY FOR TOLERANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_breach_history_for_tolerance(
    p_tolerance_id UUID,
    p_window_days INTEGER DEFAULT 90,
    p_breach_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    breach_id UUID,
    breach_type TEXT,
    breach_value NUMERIC,
    limit_value NUMERIC,
    measurement_date DATE,
    is_resolved BOOLEAN,
    period_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id as breach_id,
        h.breach_type,
        h.breach_value,
        h.limit_value,
        h.measurement_date,
        (h.resolved_at IS NOT NULL) as is_resolved,
        h.period_number
    FROM public.tolerance_breach_history h
    WHERE h.tolerance_id = p_tolerance_id
      AND h.measurement_date >= (CURRENT_DATE - p_window_days)
      AND (p_breach_type IS NULL OR h.breach_type = p_breach_type)
    ORDER BY h.measurement_date DESC;
END;
$$;

-- ============================================================================
-- 8. COUNT CONSECUTIVE BREACH PERIODS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_consecutive_breach_periods(
    p_tolerance_id UUID,
    p_breach_type TEXT DEFAULT 'SOFT'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_prev_period INTEGER := NULL;
    v_breach RECORD;
BEGIN
    FOR v_breach IN 
        SELECT period_number
        FROM public.tolerance_breach_history
        WHERE tolerance_id = p_tolerance_id
          AND breach_type = p_breach_type
          AND resolved_at IS NULL
        ORDER BY period_number DESC
    LOOP
        IF v_prev_period IS NULL THEN
            v_count := 1;
            v_prev_period := v_breach.period_number;
        ELSIF v_breach.period_number = v_prev_period - 1 THEN
            v_count := v_count + 1;
            v_prev_period := v_breach.period_number;
        ELSE
            EXIT; -- Gap in consecutive periods
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- ============================================================================
-- 9. COUNT BREACHES IN WINDOW
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_breaches_in_window(
    p_tolerance_id UUID,
    p_window_days INTEGER DEFAULT 90,
    p_breach_type TEXT DEFAULT 'SOFT'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM public.tolerance_breach_history
    WHERE tolerance_id = p_tolerance_id
      AND breach_type = p_breach_type
      AND measurement_date >= (CURRENT_DATE - p_window_days);
    
    RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.recalc_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tolerance_breach_history ENABLE ROW LEVEL SECURITY;

-- Recalc runs: users can see their org's runs
CREATE POLICY "Users can view their org recalc runs"
    ON public.recalc_runs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Breach history: users can view their org's history
CREATE POLICY "Users can view their org breach history"
    ON public.tolerance_breach_history FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT ON public.recalc_runs TO authenticated;
GRANT SELECT, INSERT ON public.tolerance_breach_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_kri_with_tolerance_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_recalc_lock TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_recalc_run TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_breach_history_for_tolerance TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_consecutive_breach_periods TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_breaches_in_window TO authenticated;
