-- ============================================================================
-- MinRisk Phase 1a: PCI Workflow Database Functions
-- Date: 2026-02-03
-- Description: Core functions for DIME calculation, Confidence scoring, and G1 Gate
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION: compute_dime_for_pci
-- Calculates derived DIME scores for a PCI instance
-- Returns the computed scores and stores them in derived_dime_scores
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_dime_for_pci(p_pci_instance_id UUID)
RETURNS TABLE (
    d_score NUMERIC,
    i_score NUMERIC,
    m_score NUMERIC,
    e_raw NUMERIC,
    e_final NUMERIC,
    cap_applied BOOLEAN,
    cap_details JSONB,
    calc_trace JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_d_score NUMERIC := 0;
    v_i_score NUMERIC := 0;
    v_m_score NUMERIC := 0;
    v_e_raw NUMERIC := 0;
    v_e_final NUMERIC := 0;
    v_cap_applied BOOLEAN := FALSE;
    v_cap_details JSONB := '[]'::JSONB;
    v_calc_trace JSONB := '{}'::JSONB;

    -- Dimension calculations
    v_d_weighted_sum NUMERIC := 0;
    v_d_weight_total NUMERIC := 0;
    v_i_weighted_sum NUMERIC := 0;
    v_i_weight_total NUMERIC := 0;
    v_m_weighted_sum NUMERIC := 0;
    v_m_weight_total NUMERIC := 0;
    v_e_weighted_sum NUMERIC := 0;
    v_e_weight_total NUMERIC := 0;

    -- Hard cap tracking
    v_d_critical_no BOOLEAN := FALSE;
    v_i_critical_no BOOLEAN := FALSE;
    v_m_critical_no BOOLEAN := FALSE;
    v_e_critical_no BOOLEAN := FALSE;
    v_cap_triggers JSONB := '[]'::JSONB;

    -- Loop variables
    v_sc RECORD;
    v_weight NUMERIC;
    v_status_value NUMERIC;
    v_sc_details JSONB := '[]'::JSONB;
BEGIN
    -- Process each secondary control instance
    FOR v_sc IN
        SELECT
            sci.id,
            sci.status,
            sci.evidence_exists,
            sct.code,
            sct.dimension,
            sct.criticality,
            sct.prompt_text
        FROM secondary_control_instances sci
        JOIN secondary_control_templates sct ON sct.id = sci.secondary_control_template_id
        WHERE sci.pci_instance_id = p_pci_instance_id
    LOOP
        -- Skip N/A items (excluded from calculation)
        IF v_sc.status = 'na' OR v_sc.status IS NULL THEN
            -- Add to trace but don't include in calculation
            v_sc_details := v_sc_details || jsonb_build_object(
                'code', v_sc.code,
                'dimension', v_sc.dimension::TEXT,
                'criticality', v_sc.criticality::TEXT,
                'status', COALESCE(v_sc.status::TEXT, 'not_attested'),
                'included', FALSE,
                'reason', CASE WHEN v_sc.status = 'na' THEN 'N/A - excluded' ELSE 'Not yet attested' END
            );
            CONTINUE;
        END IF;

        -- Map status to numeric value
        v_status_value := CASE v_sc.status
            WHEN 'yes' THEN 1.0
            WHEN 'partial' THEN 0.5
            WHEN 'no' THEN 0.0
            ELSE 0.0
        END;

        -- Map criticality to weight
        v_weight := CASE v_sc.criticality
            WHEN 'critical' THEN 3.0
            WHEN 'important' THEN 2.0
            WHEN 'optional' THEN 1.0
            ELSE 1.0
        END;

        -- Track critical "No" for hard caps
        IF v_sc.criticality = 'critical' AND v_sc.status = 'no' THEN
            CASE v_sc.dimension
                WHEN 'D' THEN
                    v_d_critical_no := TRUE;
                    v_cap_triggers := v_cap_triggers || jsonb_build_object('dimension', 'D', 'code', v_sc.code);
                WHEN 'I' THEN
                    v_i_critical_no := TRUE;
                    v_cap_triggers := v_cap_triggers || jsonb_build_object('dimension', 'I', 'code', v_sc.code);
                WHEN 'M' THEN
                    v_m_critical_no := TRUE;
                    v_cap_triggers := v_cap_triggers || jsonb_build_object('dimension', 'M', 'code', v_sc.code);
                WHEN 'E' THEN
                    v_e_critical_no := TRUE;
                    v_cap_triggers := v_cap_triggers || jsonb_build_object('dimension', 'E', 'code', v_sc.code);
            END CASE;
        END IF;

        -- Add weighted contribution to appropriate dimension
        CASE v_sc.dimension
            WHEN 'D' THEN
                v_d_weighted_sum := v_d_weighted_sum + (v_weight * v_status_value);
                v_d_weight_total := v_d_weight_total + v_weight;
            WHEN 'I' THEN
                v_i_weighted_sum := v_i_weighted_sum + (v_weight * v_status_value);
                v_i_weight_total := v_i_weight_total + v_weight;
            WHEN 'M' THEN
                v_m_weighted_sum := v_m_weighted_sum + (v_weight * v_status_value);
                v_m_weight_total := v_m_weight_total + v_weight;
            WHEN 'E' THEN
                v_e_weighted_sum := v_e_weighted_sum + (v_weight * v_status_value);
                v_e_weight_total := v_e_weight_total + v_weight;
        END CASE;

        -- Add to trace
        v_sc_details := v_sc_details || jsonb_build_object(
            'code', v_sc.code,
            'dimension', v_sc.dimension::TEXT,
            'criticality', v_sc.criticality::TEXT,
            'status', v_sc.status::TEXT,
            'status_value', v_status_value,
            'weight', v_weight,
            'contribution', v_weight * v_status_value,
            'included', TRUE
        );
    END LOOP;

    -- Calculate dimension scores (0-3 scale)
    -- Formula: 3 * (weighted_sum / weight_total)
    IF v_d_weight_total > 0 THEN
        v_d_score := ROUND(3.0 * (v_d_weighted_sum / v_d_weight_total), 2);
    END IF;

    IF v_i_weight_total > 0 THEN
        v_i_score := ROUND(3.0 * (v_i_weighted_sum / v_i_weight_total), 2);
    END IF;

    IF v_m_weight_total > 0 THEN
        v_m_score := ROUND(3.0 * (v_m_weighted_sum / v_m_weight_total), 2);
    END IF;

    IF v_e_weight_total > 0 THEN
        v_e_raw := ROUND(3.0 * (v_e_weighted_sum / v_e_weight_total), 2);
    END IF;

    -- Apply Hard Cap Option B: Critical "No" caps dimension to <= 1.0
    IF v_d_critical_no AND v_d_score > 1.0 THEN
        v_d_score := 1.0;
        v_cap_applied := TRUE;
    END IF;

    IF v_i_critical_no AND v_i_score > 1.0 THEN
        v_i_score := 1.0;
        v_cap_applied := TRUE;
    END IF;

    IF v_m_critical_no AND v_m_score > 1.0 THEN
        v_m_score := 1.0;
        v_cap_applied := TRUE;
    END IF;

    IF v_e_critical_no AND v_e_raw > 1.0 THEN
        v_e_raw := 1.0;
        v_cap_applied := TRUE;
    END IF;

    -- Apply Constrained Effectiveness: E_final = min(E_raw, D, I, M)
    v_e_final := LEAST(v_e_raw, v_d_score, v_i_score, v_m_score);

    -- Build cap details
    IF v_cap_applied THEN
        v_cap_details := jsonb_build_object(
            'caps_triggered', v_cap_triggers,
            'd_capped', v_d_critical_no,
            'i_capped', v_i_critical_no,
            'm_capped', v_m_critical_no,
            'e_capped', v_e_critical_no
        );
    END IF;

    -- Build calculation trace
    v_calc_trace := jsonb_build_object(
        'secondary_controls', v_sc_details,
        'dimension_totals', jsonb_build_object(
            'D', jsonb_build_object('weighted_sum', v_d_weighted_sum, 'weight_total', v_d_weight_total, 'raw', CASE WHEN v_d_weight_total > 0 THEN 3.0 * (v_d_weighted_sum / v_d_weight_total) ELSE 0 END),
            'I', jsonb_build_object('weighted_sum', v_i_weighted_sum, 'weight_total', v_i_weight_total, 'raw', CASE WHEN v_i_weight_total > 0 THEN 3.0 * (v_i_weighted_sum / v_i_weight_total) ELSE 0 END),
            'M', jsonb_build_object('weighted_sum', v_m_weighted_sum, 'weight_total', v_m_weight_total, 'raw', CASE WHEN v_m_weight_total > 0 THEN 3.0 * (v_m_weighted_sum / v_m_weight_total) ELSE 0 END),
            'E', jsonb_build_object('weighted_sum', v_e_weighted_sum, 'weight_total', v_e_weight_total, 'raw', CASE WHEN v_e_weight_total > 0 THEN 3.0 * (v_e_weighted_sum / v_e_weight_total) ELSE 0 END)
        ),
        'constrained_effectiveness', jsonb_build_object(
            'e_raw', v_e_raw,
            'e_final', v_e_final,
            'constrained_by', CASE
                WHEN v_e_final < v_e_raw THEN
                    CASE
                        WHEN v_e_final = v_d_score THEN 'D'
                        WHEN v_e_final = v_i_score THEN 'I'
                        WHEN v_e_final = v_m_score THEN 'M'
                        ELSE 'none'
                    END
                ELSE 'none'
            END
        )
    );

    -- Upsert into derived_dime_scores
    INSERT INTO derived_dime_scores (
        pci_instance_id, d_score, i_score, m_score, e_raw, e_final,
        cap_applied, cap_details, computed_at, calc_trace
    )
    VALUES (
        p_pci_instance_id, v_d_score, v_i_score, v_m_score, v_e_raw, v_e_final,
        v_cap_applied, v_cap_details, NOW(), v_calc_trace
    )
    ON CONFLICT (pci_instance_id) DO UPDATE SET
        d_score = EXCLUDED.d_score,
        i_score = EXCLUDED.i_score,
        m_score = EXCLUDED.m_score,
        e_raw = EXCLUDED.e_raw,
        e_final = EXCLUDED.e_final,
        cap_applied = EXCLUDED.cap_applied,
        cap_details = EXCLUDED.cap_details,
        computed_at = NOW(),
        calc_trace = EXCLUDED.calc_trace;

    -- Return results
    RETURN QUERY SELECT v_d_score, v_i_score, v_m_score, v_e_raw, v_e_final, v_cap_applied, v_cap_details, v_calc_trace;
END;
$$;

COMMENT ON FUNCTION compute_dime_for_pci IS
'Computes derived DIME scores for a PCI instance. Applies weights, hard caps, and constrained effectiveness.';

-- ============================================================================
-- FUNCTION: compute_confidence_for_pci
-- Calculates confidence score for a PCI instance
-- Formula components:
--   - Critical Control Status: 40 points max
--   - Critical Evidence Coverage: 20 points max
--   - Overall Evidence Coverage: 10 points max
--   - Attestation Recency: 20 points max
--   - Overdue Request Penalty: up to -30 points
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_confidence_for_pci(p_pci_instance_id UUID)
RETURNS TABLE (
    confidence_score INTEGER,
    confidence_label confidence_label,
    drivers JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score INTEGER := 0;
    v_label confidence_label;
    v_drivers JSONB := '[]'::JSONB;

    -- Component scores
    v_critical_status_score NUMERIC := 0;
    v_critical_evidence_score NUMERIC := 0;
    v_overall_evidence_score NUMERIC := 0;
    v_recency_score NUMERIC := 0;
    v_overdue_penalty NUMERIC := 0;

    -- Counters
    v_critical_count INTEGER := 0;
    v_critical_yes_partial NUMERIC := 0;
    v_critical_with_evidence INTEGER := 0;
    v_total_applicable INTEGER := 0;
    v_total_with_evidence INTEGER := 0;

    -- Recency
    v_latest_attestation TIMESTAMPTZ;
    v_days_since_attestation INTEGER;

    -- Overdue requests
    v_overdue_rec RECORD;
    v_org_id UUID;
BEGIN
    -- Get organization ID for evidence request lookup
    SELECT organization_id INTO v_org_id FROM pci_instances WHERE id = p_pci_instance_id;

    -- 1. Calculate Critical Control Status Score (max 40)
    -- and Critical Evidence Coverage (max 20)
    SELECT
        COUNT(*) FILTER (WHERE sct.criticality = 'critical' AND sci.status IS NOT NULL AND sci.status != 'na'),
        SUM(CASE
            WHEN sct.criticality = 'critical' AND sci.status = 'yes' THEN 1.0
            WHEN sct.criticality = 'critical' AND sci.status = 'partial' THEN 0.5
            WHEN sct.criticality = 'critical' AND sci.status = 'no' THEN 0.0
            ELSE 0
        END),
        COUNT(*) FILTER (WHERE sct.criticality = 'critical' AND sci.status IS NOT NULL AND sci.status != 'na' AND sci.evidence_exists = TRUE),
        COUNT(*) FILTER (WHERE sci.status IS NOT NULL AND sci.status != 'na'),
        COUNT(*) FILTER (WHERE sci.status IS NOT NULL AND sci.status != 'na' AND sci.evidence_exists = TRUE),
        MAX(sci.attested_at)
    INTO
        v_critical_count,
        v_critical_yes_partial,
        v_critical_with_evidence,
        v_total_applicable,
        v_total_with_evidence,
        v_latest_attestation
    FROM secondary_control_instances sci
    JOIN secondary_control_templates sct ON sct.id = sci.secondary_control_template_id
    WHERE sci.pci_instance_id = p_pci_instance_id;

    -- Critical Status Score: 40 * (sum of critical values / count of critical)
    IF v_critical_count > 0 THEN
        v_critical_status_score := ROUND(40.0 * (v_critical_yes_partial / v_critical_count));
    END IF;

    -- Critical Evidence Coverage Score: 20 * (critical with evidence / critical count)
    IF v_critical_count > 0 THEN
        v_critical_evidence_score := ROUND(20.0 * (v_critical_with_evidence::NUMERIC / v_critical_count));
    END IF;

    -- Overall Evidence Coverage Score: 10 * (all with evidence / all applicable)
    IF v_total_applicable > 0 THEN
        v_overall_evidence_score := ROUND(10.0 * (v_total_with_evidence::NUMERIC / v_total_applicable));
    END IF;

    -- 2. Attestation Recency Score (max 20)
    IF v_latest_attestation IS NOT NULL THEN
        v_days_since_attestation := EXTRACT(DAY FROM (NOW() - v_latest_attestation));

        v_recency_score := CASE
            WHEN v_days_since_attestation <= 30 THEN 20
            WHEN v_days_since_attestation <= 60 THEN 15
            WHEN v_days_since_attestation <= 90 THEN 10
            WHEN v_days_since_attestation <= 180 THEN 5
            ELSE 0
        END;
    END IF;

    -- 3. Overdue Request Penalty (max -30)
    FOR v_overdue_rec IN
        SELECT
            er.id,
            er.due_date,
            er.is_critical_scope,
            (CURRENT_DATE - er.due_date) as days_overdue  -- date - date returns integer directly
        FROM evidence_requests er
        WHERE er.pci_instance_id = p_pci_instance_id
          AND er.status = 'open'
          AND er.due_date < CURRENT_DATE
    LOOP
        -- Base penalty based on days overdue
        IF v_overdue_rec.days_overdue <= 7 THEN
            v_overdue_penalty := v_overdue_penalty - 5;
        ELSIF v_overdue_rec.days_overdue <= 30 THEN
            v_overdue_penalty := v_overdue_penalty - 10;
        ELSE
            v_overdue_penalty := v_overdue_penalty - 15;
        END IF;

        -- 1.5x multiplier if linked to critical secondary control
        IF v_overdue_rec.is_critical_scope THEN
            v_overdue_penalty := v_overdue_penalty * 1.5;
        END IF;
    END LOOP;

    -- Cap penalty at -30
    v_overdue_penalty := GREATEST(v_overdue_penalty, -30);

    -- Calculate total score
    v_score := GREATEST(0, LEAST(100,
        v_critical_status_score +
        v_critical_evidence_score +
        v_overall_evidence_score +
        v_recency_score +
        v_overdue_penalty
    )::INTEGER);

    -- Apply floor rule: if critical status < 25% of max (10/40), cap to 39
    IF v_critical_status_score < 10 THEN
        v_score := LEAST(v_score, 39);
    END IF;

    -- Determine label (updated thresholds: High >= 75)
    v_label := CASE
        WHEN v_score >= 75 THEN 'high'::confidence_label
        WHEN v_score >= 40 THEN 'medium'::confidence_label
        ELSE 'low'::confidence_label
    END;

    -- Build drivers array
    -- Critical status driver
    IF v_critical_count > 0 THEN
        v_drivers := v_drivers || jsonb_build_object(
            'type', CASE WHEN v_critical_status_score >= 30 THEN 'positive' ELSE 'negative' END,
            'text', format('%s/%s critical controls answered (%s Yes, %s Partial)',
                v_critical_count, v_critical_count,
                ROUND(v_critical_yes_partial),
                v_critical_count - ROUND(v_critical_yes_partial)),
            'points', v_critical_status_score
        );
    ELSE
        v_drivers := v_drivers || jsonb_build_object(
            'type', 'negative',
            'text', 'No critical controls attested yet',
            'points', 0
        );
    END IF;

    -- Critical evidence driver
    IF v_critical_count > 0 THEN
        v_drivers := v_drivers || jsonb_build_object(
            'type', CASE WHEN v_critical_evidence_score >= 15 THEN 'positive' ELSE 'negative' END,
            'text', format('Evidence documented for %s/%s critical controls', v_critical_with_evidence, v_critical_count),
            'points', v_critical_evidence_score
        );
    END IF;

    -- Overall evidence driver
    IF v_total_applicable > 0 THEN
        v_drivers := v_drivers || jsonb_build_object(
            'type', CASE WHEN v_overall_evidence_score >= 7 THEN 'positive' ELSE 'neutral' END,
            'text', format('Overall evidence coverage: %s/%s controls', v_total_with_evidence, v_total_applicable),
            'points', v_overall_evidence_score
        );
    END IF;

    -- Recency driver
    IF v_latest_attestation IS NOT NULL THEN
        v_drivers := v_drivers || jsonb_build_object(
            'type', CASE WHEN v_recency_score >= 15 THEN 'positive' ELSE 'negative' END,
            'text', format('Last attestation %s days ago', v_days_since_attestation),
            'points', v_recency_score
        );
    ELSE
        v_drivers := v_drivers || jsonb_build_object(
            'type', 'negative',
            'text', 'No attestations recorded',
            'points', 0
        );
    END IF;

    -- Overdue penalty driver
    IF v_overdue_penalty < 0 THEN
        v_drivers := v_drivers || jsonb_build_object(
            'type', 'negative',
            'text', format('Overdue evidence requests penalty'),
            'points', v_overdue_penalty
        );
    END IF;

    -- Floor rule driver
    IF v_critical_status_score < 10 AND v_score >= 40 THEN
        v_drivers := v_drivers || jsonb_build_object(
            'type', 'negative',
            'text', 'Score capped to Low: critical control status below 25%',
            'points', 0
        );
    END IF;

    -- Upsert into confidence_scores
    INSERT INTO confidence_scores (
        pci_instance_id, confidence_score, confidence_label, drivers, computed_at
    )
    VALUES (
        p_pci_instance_id, v_score, v_label, v_drivers, NOW()
    )
    ON CONFLICT (pci_instance_id) DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        confidence_label = EXCLUDED.confidence_label,
        drivers = EXCLUDED.drivers,
        computed_at = NOW();

    -- Return results
    RETURN QUERY SELECT v_score, v_label, v_drivers;
END;
$$;

COMMENT ON FUNCTION compute_confidence_for_pci IS
'Computes confidence score (0-100) for a PCI instance. Factors: critical status, evidence coverage, recency, overdue penalties.';

-- ============================================================================
-- FUNCTION: check_risk_activation_gate
-- G1 Gate: Validates if a risk can transition to "Active" status
-- Rules:
--   1. Response must be set
--   2. If response != 'accept', at least one PCI instance must exist
-- ============================================================================

CREATE OR REPLACE FUNCTION check_risk_activation_gate(p_risk_id UUID)
RETURNS TABLE (
    can_activate BOOLEAN,
    validation_message TEXT,
    has_response BOOLEAN,
    response_type TEXT,
    pci_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_can_activate BOOLEAN := FALSE;
    v_message TEXT;
    v_has_response BOOLEAN := FALSE;
    v_response_type TEXT;
    v_pci_count INTEGER := 0;
BEGIN
    -- Check if response exists
    SELECT
        TRUE,
        rr.response_type::TEXT
    INTO v_has_response, v_response_type
    FROM risk_responses rr
    WHERE rr.risk_id = p_risk_id;

    -- If no response found
    IF NOT v_has_response THEN
        v_message := 'Risk response must be set before activation. Please select a response (Avoid, Reduce Likelihood, Reduce Impact, Transfer/Share, or Accept).';
        RETURN QUERY SELECT FALSE, v_message, FALSE, NULL::TEXT, 0;
        RETURN;
    END IF;

    -- Count PCI instances for this risk
    SELECT COUNT(*) INTO v_pci_count
    FROM pci_instances
    WHERE risk_id = p_risk_id AND status != 'retired';

    -- Check activation rules
    IF v_response_type = 'accept' THEN
        -- Accept response: can activate without PCIs
        v_can_activate := TRUE;
        v_message := 'Risk can be activated. Response is "Accept" - no controls required.';
    ELSIF v_pci_count > 0 THEN
        -- Non-accept response with PCIs: can activate
        v_can_activate := TRUE;
        v_message := format('Risk can be activated. Response is "%s" with %s control(s) defined.', v_response_type, v_pci_count);
    ELSE
        -- Non-accept response without PCIs: cannot activate
        v_can_activate := FALSE;
        v_message := format('Cannot activate risk. Response is "%s" which requires at least one control (PCI instance). Please add a control from the library.', v_response_type);
    END IF;

    RETURN QUERY SELECT v_can_activate, v_message, v_has_response, v_response_type, v_pci_count;
END;
$$;

COMMENT ON FUNCTION check_risk_activation_gate IS
'G1 Gate check: Validates if a risk can transition to Active status based on response and PCI requirements.';

-- ============================================================================
-- FUNCTION: auto_create_secondary_controls
-- Automatically creates 10 secondary control instances when a PCI instance is created
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_secondary_controls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert 10 secondary control instances from the template
    INSERT INTO secondary_control_instances (
        pci_instance_id,
        secondary_control_template_id,
        secondary_template_version
    )
    SELECT
        NEW.id,
        sct.id,
        sct.version
    FROM secondary_control_templates sct
    WHERE sct.pci_template_id = NEW.pci_template_id
      AND sct.is_active = TRUE;

    RETURN NEW;
END;
$$;

-- Trigger to auto-create secondary controls on PCI instance creation
DROP TRIGGER IF EXISTS trigger_auto_create_secondary_controls ON pci_instances;
CREATE TRIGGER trigger_auto_create_secondary_controls
    AFTER INSERT ON pci_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_secondary_controls();

COMMENT ON FUNCTION auto_create_secondary_controls IS
'Trigger function: Auto-creates 10 secondary control instances when a PCI instance is created.';

-- ============================================================================
-- FUNCTION: recompute_scores_on_attestation
-- Triggers DIME and Confidence recompute when secondary control is updated
-- Only triggers on status, evidence_exists, or attested_at changes (not notes)
-- ============================================================================

CREATE OR REPLACE FUNCTION recompute_scores_on_attestation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only recompute if status, evidence_exists, or attested_at changed
    IF (OLD.status IS DISTINCT FROM NEW.status) OR
       (OLD.evidence_exists IS DISTINCT FROM NEW.evidence_exists) OR
       (OLD.attested_at IS DISTINCT FROM NEW.attested_at) THEN

        -- Recompute DIME
        PERFORM compute_dime_for_pci(NEW.pci_instance_id);

        -- Recompute Confidence
        PERFORM compute_confidence_for_pci(NEW.pci_instance_id);
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger for recomputation
DROP TRIGGER IF EXISTS trigger_recompute_scores ON secondary_control_instances;
CREATE TRIGGER trigger_recompute_scores
    AFTER UPDATE ON secondary_control_instances
    FOR EACH ROW
    EXECUTE FUNCTION recompute_scores_on_attestation();

COMMENT ON FUNCTION recompute_scores_on_attestation IS
'Trigger function: Recomputes DIME and Confidence when secondary control attestation changes.';

-- ============================================================================
-- FUNCTION: recompute_confidence_on_evidence_change
-- Triggers Confidence recompute when evidence request status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION recompute_confidence_on_evidence_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If this request is PCI-scoped, recompute confidence for that PCI
    IF NEW.pci_instance_id IS NOT NULL THEN
        PERFORM compute_confidence_for_pci(NEW.pci_instance_id);
    END IF;

    -- If this request is secondary-control-scoped, find the PCI and recompute
    IF NEW.secondary_control_instance_id IS NOT NULL THEN
        PERFORM compute_confidence_for_pci(
            (SELECT pci_instance_id FROM secondary_control_instances WHERE id = NEW.secondary_control_instance_id)
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger for evidence request changes
DROP TRIGGER IF EXISTS trigger_recompute_on_evidence ON evidence_requests;
CREATE TRIGGER trigger_recompute_on_evidence
    AFTER UPDATE ON evidence_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.due_date IS DISTINCT FROM NEW.due_date)
    EXECUTE FUNCTION recompute_confidence_on_evidence_change();

COMMENT ON FUNCTION recompute_confidence_on_evidence_change IS
'Trigger function: Recomputes Confidence when evidence request status or due date changes.';

-- ============================================================================
-- GRANT EXECUTE TO authenticated role
-- ============================================================================

GRANT EXECUTE ON FUNCTION compute_dime_for_pci(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION compute_confidence_for_pci(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_risk_activation_gate(UUID) TO authenticated;

COMMIT;

-- ============================================================================
-- END OF FUNCTIONS MIGRATION
-- ============================================================================
