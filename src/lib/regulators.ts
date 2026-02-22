/**
 * Regulators Library
 *
 * Functions for managing regulators and regulator user access
 */

import { supabase, getClerkToken } from './supabase';

export interface Regulator {
  id: string;
  code: string;
  name: string;
  jurisdiction: string | null;
  alert_thresholds: {
    liquidity: number;
    market: number;
    operational: number;
    credit: number;
    legal: number;
    strategic: number;
    esg: number;
  };
  created_at: string;
  updated_at: string;
}

export interface RegulatorAccess {
  id: string;
  user_id: string;
  regulator_id: string;
  granted_at: string;
  granted_by: string | null;
  regulator?: Regulator;
}

export interface RegulatorUser {
  id: string;
  email: string;
  full_name: string;
  status: string;
  created_at: string;
  regulators: Regulator[];
}

/**
 * Get all regulators
 */
export async function getAllRegulators() {
  const { data, error } = await supabase
    .from('regulators')
    .select('*')
    .order('name');

  return { data, error };
}

/**
 * Get regulator by ID
 */
export async function getRegulator(id: string) {
  const { data, error } = await supabase
    .from('regulators')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

/**
 * List all regulator users with their assigned regulators
 */
export async function listRegulatorUsers(): Promise<{
  data: RegulatorUser[] | null;
  error: Error | null;
}> {
  try {
    // Use RPC function that joins user_profiles with auth.users to get email
    const { data: profiles, error: profilesError } = await supabase.rpc(
      'list_users_with_email',
      { p_organization_id: null }
    );

    if (profilesError) {
      return { data: null, error: profilesError };
    }

    // Filter to regulator role only
    const regulatorProfiles = (profiles || []).filter(
      (p: any) => p.role === 'regulator'
    );

    if (regulatorProfiles.length === 0) {
      return { data: [], error: null };
    }

    // Get regulator access for each user
    const userIds = regulatorProfiles.map((p: any) => p.id);
    const { data: accessData, error: accessError } = await supabase
      .from('regulator_access')
      .select(`
        user_id,
        regulator:regulators(*)
      `)
      .in('user_id', userIds);

    if (accessError) {
      return { data: null, error: accessError };
    }

    // Build regulator users with their regulators
    const regulatorUsers: RegulatorUser[] = regulatorProfiles.map((profile: any) => {
      const userAccess = accessData?.filter(a => a.user_id === profile.id) || [];
      const regulators = userAccess
        .map((a: any) => a.regulator)
        .filter(Boolean) as Regulator[];

      return {
        id: profile.id,
        email: profile.email || 'N/A',
        full_name: profile.full_name,
        status: profile.status,
        created_at: profile.created_at,
        regulators,
      };
    });

    return { data: regulatorUsers, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Invite a regulator user (super admin only)
 * Uses fetch() directly for better error handling (matches OrganizationManagement pattern)
 */
export async function inviteRegulatorUser(
  email: string,
  full_name: string,
  regulator_ids: string[]
): Promise<{ data: any; error: Error | null }> {
  try {
    const token = await getClerkToken();
    if (!token) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/super-admin-invite-regulator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          full_name,
          regulator_ids,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: new Error(result.error || `HTTP ${response.status}`) };
    }

    return { data: result.data || result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Update regulator access for a user (super admin only)
 */
export async function updateRegulatorAccess(
  user_id: string,
  regulator_ids: string[]
): Promise<{ error: Error | null }> {
  try {
    // Delete existing access
    const { error: deleteError } = await supabase
      .from('regulator_access')
      .delete()
      .eq('user_id', user_id);

    if (deleteError) {
      return { error: deleteError };
    }

    // Insert new access
    if (regulator_ids.length > 0) {
      const accessRecords = regulator_ids.map(regulator_id => ({
        user_id,
        regulator_id,
      }));

      const { error: insertError } = await supabase
        .from('regulator_access')
        .insert(accessRecords);

      if (insertError) {
        return { error: insertError };
      }
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get organizations assigned to a specific regulator
 */
export async function getRegulatorOrganizations(regulator_id: string) {
  const { data, error } = await supabase
    .from('organization_regulators')
    .select(`
      organization:organizations(
        id,
        name,
        institution_type
      ),
      is_primary
    `)
    .eq('regulator_id', regulator_id);

  return { data, error };
}

/**
 * Assign regulators to an organization (super admin only)
 */
export async function assignRegulatorsToOrganization(
  organization_id: string,
  regulator_ids: string[],
  primary_regulator_id?: string
): Promise<{ error: Error | null }> {
  try {
    // Delete existing assignments
    const { error: deleteError } = await supabase
      .from('organization_regulators')
      .delete()
      .eq('organization_id', organization_id);

    if (deleteError) {
      return { error: deleteError };
    }

    // Insert new assignments
    if (regulator_ids.length > 0) {
      const assignments = regulator_ids.map(regulator_id => ({
        organization_id,
        regulator_id,
        is_primary: regulator_id === primary_regulator_id,
      }));

      const { error: insertError } = await supabase
        .from('organization_regulators')
        .insert(assignments);

      if (insertError) {
        return { error: insertError };
      }

      // Update primary_regulator_id on organization
      if (primary_regulator_id) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ primary_regulator_id })
          .eq('id', organization_id);

        if (updateError) {
          return { error: updateError };
        }
      }
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
