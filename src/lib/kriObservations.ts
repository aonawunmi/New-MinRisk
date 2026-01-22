/**
 * KRI Observations API
 * 
 * Functions for managing KRI observations (time-series actuals):
 * - CRUD operations
 * - Maker-checker workflow
 * - Version management
 * - Latest observation queries
 */

import { supabase } from './supabase';
import type {
    KRIObservation,
    CreateObservationParams,
    UpdateObservationParams,
    ObservationStatus
} from '@/types/kri';

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all observations for a specific KRI
 */
export async function getObservationsForKRI(
    kriId: string,
    limit?: number
): Promise<{ data: KRIObservation[] | null; error: Error | null }> {
    try {
        let query = supabase
            .from('kri_observations')
            .select('*')
            .eq('kri_id', kriId)
            .order('observation_date', { ascending: false })
            .order('version_number', { ascending: false });

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching KRI observations:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Get latest approved observation for a KRI
 */
export async function getLatestObservation(
    kriId: string,
    asOfDate?: string
): Promise<{ data: KRIObservation | null; error: Error | null }> {
    try {
        let query = supabase
            .from('kri_observations')
            .select('*')
            .eq('kri_id', kriId)
            .eq('status', 'approved')
            .is('superseded_by', null)
            .order('observation_date', { ascending: false })
            .order('version_number', { ascending: false })
            .limit(1);

        if (asOfDate) {
            query = query.lte('observation_date', asOfDate);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        return { data: data?.[0] || null, error: null };
    } catch (err) {
        console.error('Error fetching latest observation:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Get  observation by ID
 */
export async function getObservation(
    observationId: string
): Promise<{ data: KRIObservation | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('kri_observations')
            .select('*')
            .eq('id', observationId)
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error fetching observation:', err);
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
 * Create a new KRI observation
 */
export async function createObservation(
    params: CreateObservationParams
): Promise<{ data: KRIObservation | null; error: Error | null }> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }

        const { data, error } = await supabase
            .from('kri_observations')
            .insert({
                ...params,
                created_by: user.id,
                observed_by: user.id,
                status: 'draft',
                version_number: 1,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error creating observation:', err);
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
 * Update an existing observation (only if draft)
 */
export async function updateObservation(
    observationId: string,
    params: UpdateObservationParams
): Promise<{ data: KRIObservation | null; error: Error | null }> {
    try {
        // Fetch current observation to check if it's draft
        const { data: current, error: fetchError } = await supabase
            .from('kri_observations')
            .select('status')
            .eq('id', observationId)
            .single();

        if (fetchError) throw new Error(fetchError.message);

        if (current.status !== 'draft') {
            throw new Error('Only draft observations can be edited');
        }

        const { data, error } = await supabase
            .from('kri_observations')
            .update(params)
            .eq('id', observationId)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return { data, error: null };
    } catch (err) {
        console.error('Error updating observation:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Submit observation for approval (change status to submitted)
 */
export async function submitObservation(
    observationId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('kri_observations')
            .update({
                status: 'submitted',
                submitted_at: new Date().toISOString(),
            })
            .eq('id', observationId)
            .eq('status', 'draft');

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error submitting observation:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Approve observation (maker-checker)
 */
export async function approveObservation(
    observationId: string
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
            .from('kri_observations')
            .update({
                status: 'approved',
                verified_by: user.id,
                approved_at: new Date().toISOString(),
            })
            .eq('id', observationId)
            .eq('status', 'submitted');

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error approving observation:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Reject observation
 */
export async function rejectObservation(
    observationId: string,
    reason?: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const updateParams: any = {
            status: 'rejected',
        };

        if (reason) {
            updateParams.commentary = reason;
        }

        const { error } = await supabase
            .from('kri_observations')
            .update(updateParams)
            .eq('id', observationId)
            .eq('status', 'submitted');

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error rejecting observation:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// DELETE / SUPERSEDE OPERATIONS
// ============================================================================

/**
 * Delete an observation (only if draft and never approved)
 */
export async function deleteObservation(
    observationId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('kri_observations')
            .delete()
            .eq('id', observationId)
            .eq('status', 'draft');

        if (error) throw new Error(error.message);

        return { success: true, error: null };
    } catch (err) {
        console.error('Error deleting observation:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Supersede an observation with a corrected version
 * (For approved observations that need correction)
 */
export async function supersedeObservation(
    observationId: string,
    newObservedValue: number,
    correctionReason: string
): Promise<{ data: KRIObservation | null; error: Error | null }> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }

        // Fetch the original observation
        const { data: original, error: fetchError } = await supabase
            .from('kri_observations')
            .select('*')
            .eq('id', observationId)
            .single();

        if (fetchError) throw new Error(fetchError.message);

        // Create new version
        const { data: newVersion, error: insertError } = await supabase
            .from('kri_observations')
            .insert({
                kri_id: original.kri_id,
                period_id: original.period_id,
                observation_date: original.observation_date,
                observed_value: newObservedValue,
                data_source: original.data_source,
                commentary: `Corrected version. Reason: ${correctionReason}. Original value: ${original.observed_value}`,
                version_number: original.version_number + 1,
                created_by: user.id,
                observed_by: user.id,
                status: 'draft',
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        // Mark original as superseded
        const { error: updateError } = await supabase
            .from('kri_observations')
            .update({ superseded_by: newVersion.id })
            .eq('id', observationId);

        if (updateError) throw new Error(updateError.message);

        return { data: newVersion, error: null };
    } catch (err) {
        console.error('Error superseding observation:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
