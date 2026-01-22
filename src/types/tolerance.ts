/**
 * Tolerance Metrics Types
 * 
 * Updated for outcomes-based architecture:
 * - Soft/Hard limits instead of Green/Amber/Red bands
 * - Linkage to risk_id and outcome_id
 * - Computed RAG status (never stored)
 */

// ============================================================================
// ENUMS
// ============================================================================

export const LIMIT_DIRECTIONS = ['above', 'below', 'between'] as const;
export type LimitDirection = typeof LIMIT_DIRECTIONS[number];

export const RAG_STATUSES = ['GREEN', 'AMBER', 'RED', 'NO_DATA', 'NO_KRI', 'UNKNOWN'] as const;
export type RAGStatus = typeof RAG_STATUSES[number];

export const METRIC_TYPES = ['RANGE', 'MAXIMUM', 'MINIMUM', 'DIRECTIONAL'] as const;
export type MetricType = typeof METRIC_TYPES[number];

// ============================================================================
// TOLERANCE METRIC INTERFACE (Updated)
// ============================================================================

export interface ToleranceMetric {
    id: string;
    organization_id: string;

    // Linkage (updated for outcomes model)
    appetite_category_id: string | null; // Legacy - will be deprecated
    risk_id: string | null; // NEW - direct risk link
    outcome_id: string | null; // NEW - outcome link

    // Metric definition
    metric_name: string;
    metric_description: string | null;
    metric_type: MetricType;
    unit: string | null;
    materiality_type: 'INTERNAL' | 'EXTERNAL' | 'DUAL' | null;

    // Limits (NEW - replaces green/amber/red)
    soft_limit: number; // Early warning threshold (Amber trigger)
    hard_limit: number; // Breach threshold (Red trigger)
    limit_direction: LimitDirection;

    // Legacy threshold bands (deprecated, will be removed)
    green_min?: number | null;
    green_max?: number | null;
    amber_min?: number | null;
    amber_max?: number | null;
    red_min?: number | null;
    red_max?: number | null;
    directional_config?: any;

    // Governance
    status: 'draft' | 'pending_approval' | 'approved' | 'superseded' | 'retired';
    version_number: number;

    // Validity period
    effective_from: string | null;
    effective_to: string | null;

    // Activation
    is_active: boolean;

    // Audit trail
    created_by: string | null;
    activated_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// RAG STATUS VIEWS
// ============================================================================

export interface ToleranceMetricRAGStatus {
    metric_id: string;
    metric_name: string;
    risk_id: string | null;
    outcome_id: string | null;
    soft_limit: number;
    hard_limit: number;
    limit_direction: LimitDirection;
    unit: string | null;

    // Primary KRI info
    primary_kri_id: string | null;
    kri_code: string | null;
    kri_name: string | null;

    // Latest observation
    latest_actual: number | null;
    latest_observation_date: string | null;

    // Computed RAG (never stored)
    rag_status: RAGStatus;
}

export interface ToleranceRAGHistory {
    metric_id: string;
    metric_name: string;
    period_id: string;
    period_name: string;
    start_date: string;
    end_date: string;
    rag_status: RAGStatus;
}

// ============================================================================
// CREATE/UPDATE PARAMS
// ============================================================================

export interface CreateToleranceMetricParams {
    metric_name: string;
    metric_description?: string;
    metric_type: MetricType;
    unit: string;
    risk_id?: string; // Optional - can link to risk or just category
    outcome_id: string; // Required for new metrics

    // Limits
    soft_limit: number;
    hard_limit: number;
    limit_direction: LimitDirection;

    materiality_type?: 'INTERNAL' | 'EXTERNAL' | 'DUAL';
    effective_from?: string;
}

export interface UpdateToleranceMetricParams {
    metric_name?: string;
    metric_description?: string;
    unit?: string;
    soft_limit?: number;
    hard_limit?: number;
    limit_direction?: LimitDirection;
    is_active?: boolean;
    effective_to?: string;
}

// ============================================================================
// TOLERANCE CONTAINER (Future - Phase 3)
// ============================================================================

export interface ToleranceContainer {
    id: string;
    outcome_id: string;
    container_name: string;
    status: 'draft' | 'approved' | 'superseded' | 'retired';
    created_by: string | null;
    approved_by: string | null;
    created_at: string;

    // Computed fields
    metric_count?: number;
    aggregate_rag?: RAGStatus;
}

// ============================================================================
// KRI COVERAGE (Junction Table)
// ============================================================================

export const COVERAGE_STRENGTHS = ['primary', 'secondary', 'supplementary'] as const;
export type CoverageStrength = typeof COVERAGE_STRENGTHS[number];

export const SIGNAL_TYPES = ['leading', 'concurrent', 'lagging'] as const;
export type SignalType = typeof SIGNAL_TYPES[number];

export interface ToleranceKRICoverage {
    id: string;
    organization_id: string;
    tolerance_limit_id: string; // Will be tolerance_metric_id in future
    kri_id: string;

    // Coverage classification
    coverage_strength: CoverageStrength;
    signal_type: SignalType;
    coverage_rationale: string | null;

    // Audit
    created_by: string | null;
    created_at: string;
}

export interface CreateCoverageParams {
    tolerance_metric_id: string;
    kri_id: string;
    coverage_strength: CoverageStrength;
    signal_type: SignalType;
    coverage_rationale?: string;
}
