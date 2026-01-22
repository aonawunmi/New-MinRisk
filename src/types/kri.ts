/**
 * KRI (Key Risk Indicator) Types
 * 
 * Updated with outcomes model architecture:
 * - Targets (management intent)
 * - Direction of goodness
 * - Observations (time-series actuals)
 * - Bounds (not thresholds)
 */

// ============================================================================
// ENUMS
// ============================================================================

export const DIRECTION_OF_GOODNESS = ['higher_is_better', 'lower_is_better'] as const;
export type DirectionOfGoodness = typeof DIRECTION_OF_GOODNESS[number];

export const OBSERVATION_STATUSES = ['draft', 'submitted', 'approved', 'rejected'] as const;
export type ObservationStatus = typeof OBSERVATION_STATUSES[number];

export const INDICATOR_TYPES = ['leading', 'lagging', 'concurrent'] as const;
export type IndicatorType = typeof INDICATOR_TYPES[number];

export const COLLECTION_FREQUENCIES = [
    'Daily',
    'Weekly',
    'Monthly',
    'Quarterly',
    'Annually',
    'Event-based'
] as const;
export type CollectionFrequency = typeof COLLECTION_FREQUENCIES[number];

// ============================================================================
// CORE KRI DEFINITION INTERFACE
// ============================================================================

export interface KRIDefinition {
    id: string;
    organization_id: string;
    kri_code: string;
    kri_name: string;
    description: string | null;
    category: string | null;

    // Measurement specs
    indicator_type: IndicatorType;
    measurement_unit: string | null;
    collection_frequency: CollectionFrequency;
    data_source: string | null;

    // Management intent (NEW - mandatory)
    target: number;
    direction_of_goodness: DirectionOfGoodness;

    // Sanity bounds (renamed from thresholds - optional)
    optional_lower_bound: number | null;
    optional_upper_bound: number | null;

    // Legacy/deprecated (may still exist in some rows)
    target_value?: number | null;
    threshold_direction?: string | null;

    // Ownership and governance
    responsible_user: string | null;
    responsible_owner: string | null;
    enabled: boolean;

    // AI metadata
    ai_generated: boolean;
    ai_confidence: number | null;

    // Linkages (arrays of IDs)
    linked_risk_codes: string[]; // Array of risk IDs (UUIDs)

    // Audit
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// KRI OBSERVATIONS (TIME-SERIES ACTUALS)
// ============================================================================

export interface KRIObservation {
    id: string;
    organization_id: string;
    kri_id: string;

    // Time period
    period_id: string | null;
    observation_date: string; // ISO date string

    // The actual value
    observed_value: number;

    // Provenance
    data_source: string | null;
    observed_by: string | null;
    verified_by: string | null; // Maker-checker

    // Commentary
    commentary: string | null;

    // Workflow
    status: ObservationStatus;

    // Versioning
    version_number: number;
    superseded_by: string | null;

    // Audit
    created_by: string | null;
    created_at: string;
    submitted_at: string | null;
    approved_at: string | null;
}

export interface CreateObservationParams {
    kri_id: string;
    observation_date: string;
    observed_value: number;
    period_id?: string;
    data_source?: string;
    commentary?: string;
}

export interface UpdateObservationParams {
    observed_value?: number;
    commentary?: string;
    status?: ObservationStatus;
}

// ============================================================================
// TARGET STATUS (PERFORMANCE VS TARGET)
// ============================================================================

export type TargetStatus =
    | 'NO_DATA'
    | 'ON_TARGET'
    | 'BELOW_TARGET'
    | 'ABOVE_TARGET'
    | 'UNKNOWN';

export interface KRITargetStatus {
    kri_id: string;
    kri_code: string;
    kri_name: string;
    target: number;
    direction_of_goodness: DirectionOfGoodness;
    latest_actual: number | null;
    latest_observation_date: string | null;
    target_status: TargetStatus;
}

// ============================================================================
// CREATE/UPDATE PARAMS
// ============================================================================

export interface CreateKRIParams {
    kri_name: string;
    description?: string;
    category?: string;
    indicator_type: IndicatorType;
    measurement_unit: string;
    collection_frequency?: CollectionFrequency;
    data_source?: string;

    // Mandatory for new KRIs
    target: number;
    direction_of_goodness: DirectionOfGoodness;

    // Optional bounds
    optional_lower_bound?: number;
    optional_upper_bound?: number;

    responsible_owner?: string;
    enabled?: boolean;
}

export interface UpdateKRIParams {
    kri_name?: string;
    description?: string;
    category?: string;
    measurement_unit?: string;
    collection_frequency?: CollectionFrequency;
    data_source?: string;
    target?: number;
    direction_of_goodness?: DirectionOfGoodness;
    optional_lower_bound?: number;
    optional_upper_bound?: number;
    responsible_owner?: string;
    enabled?: boolean;
}
