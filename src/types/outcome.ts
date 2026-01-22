/**
 * Risk Outcomes - Harm Types per Risk
 * 
 * Outcomes represent the measurable impacts/harms that occur
 * if a risk event materializes. A single risk can have multiple
 * outcomes across different harm type buckets.
 */

// ============================================================================
// ENUMS
// ============================================================================

export const OUTCOME_TYPES = [
    'Financial Impact',
    'Customer Impact',
    'Regulatory Impact',
    'Operational Impact',
    'Reputational Impact',
    'Strategic Impact',
] as const;

export type OutcomeType = typeof OUTCOME_TYPES[number];

export const QUANTIFIABLE_FLAGS = ['Yes', 'No', 'Proxy'] as const;
export type QuantifiableFlag = typeof QUANTIFIABLE_FLAGS[number];

export const OUTCOME_STATUSES = ['draft', 'approved', 'superseded', 'retired'] as const;
export type OutcomeStatus = typeof OUTCOME_STATUSES[number];

// ============================================================================
// INTERFACES
// ============================================================================

export interface RiskOutcome {
    id: string;
    organization_id: string;
    risk_id: string;

    // Classification
    outcome_type: OutcomeType;
    outcome_description: string | null;

    // Quantifiability
    quantifiable_flag: QuantifiableFlag;
    preferred_unit: string | null; // e.g., 'USD', '%', 'count'
    measurement_horizon: string | null; // e.g., 'Monthly', 'Quarterly'

    // Materiality and governance
    materiality_flag: boolean;
    status: OutcomeStatus;

    // AI metadata
    ai_extracted: boolean;
    ai_confidence: number | null;

    // Audit
    created_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateOutcomeParams {
    risk_id: string;
    outcome_type: OutcomeType;
    outcome_description?: string;
    quantifiable_flag?: QuantifiableFlag;
    preferred_unit?: string;
    measurement_horizon?: string;
    materiality_flag?: boolean;
    ai_extracted?: boolean;
    ai_confidence?: number;
}

export interface UpdateOutcomeParams {
    outcome_description?: string;
    quantifiable_flag?: QuantifiableFlag;
    preferred_unit?: string;
    measurement_horizon?: string;
    materiality_flag?: boolean;
    status?: OutcomeStatus;
}

// ============================================================================
// AI EXTRACTION INTERFACES
// ============================================================================

export interface AIOutcomeSuggestion {
    outcome_type: OutcomeType;
    outcome_description: string;
    quantifiable_flag: QuantifiableFlag;
    preferred_unit: string | null;
    reasoning: string;
    confidence: number;
}

export interface OutcomeExtractionResult {
    suggestions: AIOutcomeSuggestion[];
    risk_statement: string;
    extraction_metadata: {
        model: string;
        timestamp: string;
        total_suggestions: number;
    };
}
