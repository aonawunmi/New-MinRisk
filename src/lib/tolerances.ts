/**
 * Tolerance Metrics API
 * 
 * Functions for managing tolerance metrics with outcomes-based model:
 * - CRUD operations
 * - RAG status queries (computed, not stored)
 * - KRI coverage management
 */

import { supabase } from './supabase';
import type {
    ToleranceMetric,
    CreateToleranceMetricParams,
    UpdateToleranceMetricParams,
    ToleranceMetricRAGStatus,
    ToleranceRAGHistory,
    RAGStatus,
    ToleranceKRICoverage,
    CreateCoverageParams
} from '@/types/tolerance';

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all tolerance metrics for an organization
 */
export async function getToleranceMetrics(
    activeOnly = true
): Promise<{ data: ToleranceMetric[] | null; error: Error | null }> {
    try {
        let query = supabase
            .from('tolerance_limits')
            .select('*')
            .order('metric_name', { ascending: true });

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching tolerance metrics:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Get tolerance metrics for a specific outcome
 */
export async function getToleranceMetricsForOutcome(
    outcomeId: string
): Promise<{ data: ToleranceMetric[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('tolerance_limits')
            .select('*')
            .eq('outcome_id', outcomeId)
            .order('metric_name', { ascending: true });

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching tolerance metrics for outcome:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Get single tolerance metric
 */
export async function getToleranceMetric(
    metricId: string
): Promise<{ data: ToleranceMetric | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('tolerance_limits')
            .select('*')
            .eq('id', metricId)
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching tolerance metric:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// RAG STATUS QUERIES (Computed, Not Stored)
// ============================================================================

/**
 * Get RAG status for all active tolerance metrics
 */
export async function getToleranceRAGStatuses(): Promise<{
    data: ToleranceMetricRAGStatus[] | null;
    error: Error | null;
}> {
    try {
        const { data, error } = await supabase
            .from('tolerance_metric_rag_status')
            .select('*')
            .order('metric_name', { ascending: true });

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching RAG statuses:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Compute RAG status for a single metric
 */
export async function computeMetricRAG(
    metricId: string,
    periodId?: string,
    asOfDate?: string
): Promise<{ data: RAGStatus | null; error: Error | null }> {
    try {
        const { data, error } = await supabase.rpc('compute_tolerance_metric_rag', {
            p_metric_id: metricId,
            p_period_id: periodId || null,
            p_as_of_date: asOfDate || new Date().toISOString().split('T')[0],
        });

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error computing RAG:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Get RAG history for a metric across periods
 */
export async function getMetricRAGHistory(
    metricId: string
): Promise<{ data: ToleranceRAGHistory[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('tolerance_rag_history')
            .select('*')
            .eq('metric_id', metricId)
            .order('start_date', { ascending: false });

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching RAG history:', err);
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
 * Create a new tolerance metric
 */
export async function createToleranceMetric(
    params: CreateToleranceMetricParams
): Promise<{ data: ToleranceMetric | null; error: Error | null }> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('tolerance_limits')
            .insert({
                ...params,
                created_by: user.id,
                status: 'draft',
                is_active: false, // Must be activated explicitly
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error creating tolerance metric:', err);
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
 * Update an existing tolerance metric
 */
export async function updateToleranceMetric(
    metricId: string,
    params: UpdateToleranceMetricParams
): Promise<{ data: ToleranceMetric | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('tolerance_limits')
            .update(params)
            .eq('id', metricId)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error updating tolerance metric:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Activate a tolerance metric (requires approval)
 */
export async function activateToleranceMetric(
    metricId: string
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
            .from('tolerance_limits')
            .update({
                is_active: true,
                status: 'approved',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
            })
            .eq('id', metricId);

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error activating tolerance metric:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// KRI COVERAGE MANAGEMENT
// ============================================================================

/**
 * Get KRI coverage for a tolerance metric
 */
export async function getMetricCoverage(
    metricId: string
): Promise<{ data: ToleranceKRICoverage[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('tolerance_kri_coverage')
            .select('*')
            .eq('tolerance_limit_id', metricId)
            .order('coverage_strength', { ascending: true });

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching metric coverage:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Link a KRI to a tolerance metric
 */
export async function linkKRIToMetric(
    params: CreateCoverageParams
): Promise<{ data: ToleranceKRICoverage | null; error: Error | null }> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('tolerance_kri_coverage')
            .insert({
                tolerance_limit_id: params.tolerance_metric_id,
                kri_id: params.kri_id,
                coverage_strength: params.coverage_strength,
                signal_type: params.signal_type,
                coverage_rationale: params.coverage_rationale || null,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error linking KRI to metric:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Unlink a KRI from a tolerance metric
 */
export async function unlinkKRIFromMetric(
    coverageId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('tolerance_kri_coverage')
            .delete()
            .eq('id', coverageId);

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error unlinking KRI from metric:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// MATERIALIZED VIEW REFRESH
// ============================================================================

/**
 * Refresh the RAG snapshot (call after observation updates)
 */
export async function refreshRAGSnapshot(): Promise<{
    success: boolean;
    error: Error | null;
}> {
    try {
        const { error } = await supabase.rpc('refresh_tolerance_rag_snapshot');

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error refreshing RAG snapshot:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
