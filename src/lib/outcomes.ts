/**
 * Risk Outcomes API
 * 
 * Functions for managing risk outcomes (harm types per risk):
 * - CRUD operations
 * - AI-assisted extraction
 * - Approval workflows
 */

import { supabase } from './supabase';
import type {
    RiskOutcome,
    CreateOutcomeParams,
    UpdateOutcomeParams,
    OutcomeType,
    AIOutcomeSuggestion,
    OutcomeExtractionResult
} from '@/types/outcome';

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all outcomes for a specific risk
 */
export async function getOutcomesForRisk(
    riskId: string
): Promise<{ data: RiskOutcome[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('risk_outcomes')
            .select('*')
            .eq('risk_id', riskId)
            .order('outcome_type', { ascending: true });

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching outcomes:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Get a single outcome by ID
 */
export async function getOutcome(
    outcomeId: string
): Promise<{ data: RiskOutcome | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('risk_outcomes')
            .select('*')
            .eq('id', outcomeId)
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching outcome:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a new outcome for a risk
 */
export async function createOutcome(
    params: CreateOutcomeParams
): Promise<{ data: RiskOutcome | null; error: Error | null }> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('risk_outcomes')
            .insert({
                ...params,
                created_by: user.id,
                status: 'draft',
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error creating outcome:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update an existing outcome
 */
export async function updateOutcome(
    outcomeId: string,
    params: UpdateOutcomeParams
): Promise<{ data: RiskOutcome | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('risk_outcomes')
            .update(params)
            .eq('id', outcomeId)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error updating outcome:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Approve an outcome (change status to approved)
 */
export async function approveOutcome(
    outcomeId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return { success: false, error: new Error('User not authenticated') };
        }

        const { error } = await supabase
            .from('risk_outcomes')
            .update({
                status: 'approved',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
            })
            .eq('id', outcomeId);

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error approving outcome:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete an outcome (only if draft and not linked to tolerances)
 */
export async function deleteOutcome(
    outcomeId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('risk_outcomes')
            .delete()
            .eq('id', outcomeId)
            .eq('status', 'draft'); // Only allow deleting drafts

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error deleting outcome:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// AI-ASSISTED EXTRACTION (Placeholder)
// ============================================================================

/**
 * Extract outcomes from risk statement using AI
 * (To be implemented with AI service integration)
 */
export async function extractOutcomesFromRisk(
    riskId: string,
    riskStatement: string
): Promise<{ data: OutcomeExtractionResult | null; error: Error | null }> {
    try {
        // TODO: Implement AI extraction
        // This would call an edge function or AI service to:
        // 1. Parse the risk statement
        // 2. Identify impacts/harms
        // 3. Classify them into outcome buckets
        // 4. Assess quantifiability
        // 5. Return suggestions for HITL approval

        console.warn('AI outcome extraction not yet implemented');

        return {
            data: {
                suggestions: [],
                risk_statement: riskStatement,
                extraction_metadata: {
                    model: 'not_implemented',
                    timestamp: new Date().toISOString(),
                    total_suggestions: 0,
                },
            },
            error: null,
        };
    } catch (err) {
        console.error('Error extracting outcomes:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Create multiple outcomes from AI suggestions
 */
export async function createOutcomesFromAISuggestions(
    riskId: string,
    suggestions: AIOutcomeSuggestion[]
): Promise<{ data: RiskOutcome[] | null; error: Error | null }> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const outcomesToInsert = suggestions.map((suggestion) => ({
            risk_id: riskId,
            outcome_type: suggestion.outcome_type,
            outcome_description: suggestion.outcome_description,
            quantifiable_flag: suggestion.quantifiable_flag,
            preferred_unit: suggestion.preferred_unit,
            ai_extracted: true,
            ai_confidence: suggestion.confidence,
            created_by: user.id,
            status: 'draft',
        }));

        const { data, error } = await supabase
            .from('risk_outcomes')
            .insert(outcomesToInsert)
            .select();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error creating outcomes from AI suggestions:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
