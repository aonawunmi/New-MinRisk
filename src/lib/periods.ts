/**
 * Period Management Library
 *
 * Functions for managing risk register periods (quarters, fiscal years)
 * and creating historical snapshots.
 */

import { supabase } from './supabase';

/**
 * Period options for dropdown selection
 */
export const PERIOD_OPTIONS = [
  { value: 'Q1 2025', label: 'Q1 2025' },
  { value: 'Q2 2025', label: 'Q2 2025' },
  { value: 'Q3 2025', label: 'Q3 2025' },
  { value: 'Q4 2025', label: 'Q4 2025' },
  { value: 'FY 2025', label: 'FY 2025' },
  { value: 'Q1 2026', label: 'Q1 2026' },
  { value: 'Q2 2026', label: 'Q2 2026' },
  { value: 'Q3 2026', label: 'Q3 2026' },
  { value: 'Q4 2026', label: 'Q4 2026' },
  { value: 'FY 2026', label: 'FY 2026' },
];

/**
 * Get the active period for the current organization
 */
export async function getActivePeriod(): Promise<{
  data: string | null;
  error: Error | null;
}> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    // Get active period from risk_configs
    const { data: config, error: configError } = await supabase
      .from('risk_configs')
      .select('active_period')
      .eq('organization_id', profile.organization_id)
      .single();

    if (configError) {
      console.error('Error fetching active period:', configError);
      return { data: 'Q1 2025', error: null }; // Default period
    }

    return { data: config?.active_period || 'Q1 2025', error: null };
  } catch (err) {
    console.error('Unexpected error getting active period:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Set the active period for the current organization
 */
export async function setActivePeriod(
  period: string
): Promise<{ error: Error | null }> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: new Error('User profile not found') };
    }

    // Check if user is admin
    if (profile.role !== 'admin') {
      return { error: new Error('Only administrators can change the active period') };
    }

    // Update active period in risk_configs
    const { error: updateError } = await supabase
      .from('risk_configs')
      .update({ active_period: period })
      .eq('organization_id', profile.organization_id);

    if (updateError) {
      console.error('Error updating active period:', updateError);
      return { error: new Error(updateError.message) };
    }

    console.log('Active period updated to:', period);
    return { error: null };
  } catch (err) {
    console.error('Unexpected error setting active period:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get all committed period snapshots for the organization
 */
export async function getPeriodSnapshots(): Promise<{
  data: any[] | null;
  error: Error | null;
}> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    // Fetch all snapshots for the organization
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('risk_snapshots')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('snapshot_date', { ascending: false });

    if (snapshotsError) {
      console.error('Error fetching period snapshots:', snapshotsError);
      return { data: null, error: new Error(snapshotsError.message) };
    }

    return { data: snapshots || [], error: null };
  } catch (err) {
    console.error('Unexpected error getting period snapshots:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create a snapshot of the current risk register
 * (Commit Period functionality)
 */
export async function commitPeriodSnapshot(
  period: string,
  notes?: string
): Promise<{ data: any | null; error: Error | null }> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    // Check if user is admin
    if (profile.role !== 'admin') {
      return {
        data: null,
        error: new Error('Only administrators can commit periods'),
      };
    }

    // Fetch all risks for the period
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('period', period);

    if (risksError) {
      console.error('Error fetching risks for snapshot:', risksError);
      return { data: null, error: new Error(risksError.message) };
    }

    // Fetch all controls for these risks
    const riskIds = risks?.map((r) => r.id) || [];
    const { data: controls, error: controlsError } = await supabase
      .from('controls')
      .select('*')
      .in('risk_id', riskIds);

    if (controlsError) {
      console.error('Error fetching controls for snapshot:', controlsError);
    }

    // Create snapshot data
    const snapshotData = {
      period,
      risks: risks || [],
      controls: controls || [],
      risk_count: risks?.length || 0,
      control_count: controls?.length || 0,
      snapshot_timestamp: new Date().toISOString(),
    };

    // Insert snapshot
    const { data: snapshot, error: insertError } = await supabase
      .from('risk_snapshots')
      .insert({
        organization_id: profile.organization_id,
        period,
        committed_by_profile_id: user.id,
        risk_count: risks?.length || 0,
        snapshot_data: snapshotData,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating period snapshot:', insertError);
      return { data: null, error: new Error(insertError.message) };
    }

    console.log('Period snapshot created:', period);
    return { data: snapshot, error: null };
  } catch (err) {
    console.error('Unexpected error committing period snapshot:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
