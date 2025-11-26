import { supabase } from './supabase';
import type { Risk, RiskWithControls, Control } from '@/types/risk';

/**
 * Risk Management Service Layer
 *
 * Handles all risk operations using RLS-protected client.
 * All operations automatically scope to user's organization via RLS.
 */

export interface CreateRiskData {
  risk_code?: string; // Optional - will be auto-generated if not provided
  risk_title: string;
  risk_description: string;
  division: string;
  department: string;
  category: string;
  owner: string;
  likelihood_inherent: number;
  impact_inherent: number;
  status?: string;
  period?: string | null;
  is_priority?: boolean;
}

export interface UpdateRiskData extends Partial<CreateRiskData> {
  id: string;
}

/**
 * Generate a unique risk code based on division and category
 * Format: DIV-CAT-001 (e.g., CLE-CRE-001)
 * - First 3 letters of division (uppercase)
 * - First 3 letters of category (uppercase)
 * - Sequential 3-digit number
 */
async function generateRiskCode(
  organizationId: string,
  division: string,
  category: string
): Promise<string> {
  try {
    // Create prefix from first 3 letters
    const divPrefix = division.substring(0, 3).toUpperCase();
    const catPrefix = category.substring(0, 3).toUpperCase();
    const prefix = `${divPrefix}-${catPrefix}`;

    // Find max number for this prefix in the organization
    const { data: existingRisks, error } = await supabase
      .from('risks')
      .select('risk_code')
      .eq('organization_id', organizationId)
      .like('risk_code', `${prefix}-%`)
      .order('risk_code', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching existing risk codes:', error);
      // Fallback to timestamp-based code
      return `${prefix}-${Date.now().toString().slice(-3)}`;
    }

    let nextNumber = 1;
    if (existingRisks && existingRisks.length > 0) {
      // Extract number from last code (e.g., "CLE-CRE-005" -> 5)
      const lastCode = existingRisks[0].risk_code;
      const match = lastCode.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Return formatted code with 3-digit padding
    return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
  } catch (err) {
    console.error('Unexpected error generating risk code:', err);
    // Fallback to timestamp-based code
    const divPrefix = division.substring(0, 3).toUpperCase();
    const catPrefix = category.substring(0, 3).toUpperCase();
    return `${divPrefix}-${catPrefix}-${Date.now().toString().slice(-3)}`;
  }
}

/**
 * Get all risks for the current user's organization
 * RLS automatically filters by organization_id
 */
export async function getRisks(): Promise<{ data: Risk[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('risks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get risks error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get risks error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown get risks error'),
    };
  }
}

/**
 * Get a single risk by ID with its controls
 */
export async function getRiskById(
  riskId: string
): Promise<{ data: RiskWithControls | null; error: Error | null }> {
  try {
    // Get risk
    const { data: risk, error: riskError } = await supabase
      .from('risks')
      .select('*')
      .eq('id', riskId)
      .single();

    if (riskError) {
      console.error('Get risk error:', riskError.message);
      return { data: null, error: new Error(riskError.message) };
    }

    // Get controls for this risk
    const { data: controls, error: controlsError } = await supabase
      .from('controls')
      .select('*')
      .eq('risk_id', riskId)
      .order('created_at', { ascending: true });

    if (controlsError) {
      console.error('Get controls error:', controlsError.message);
      // Return risk without controls rather than failing completely
      return { data: { ...risk, controls: [] }, error: null };
    }

    return { data: { ...risk, controls: controls || [] }, error: null };
  } catch (err) {
    console.error('Unexpected get risk error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown get risk error'),
    };
  }
}

/**
 * Create a new risk
 * RLS automatically sets organization_id from user's profile
 */
export async function createRisk(
  riskData: CreateRiskData
): Promise<{ data: Risk | null; error: Error | null }> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get user profile to get organization_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    // Auto-generate risk_code if not provided
    const riskCode = riskData.risk_code || await generateRiskCode(
      profile.organization_id,
      riskData.division,
      riskData.category
    );

    const { data, error } = await supabase
      .from('risks')
      .insert([
        {
          ...riskData,
          risk_code: riskCode,
          organization_id: profile.organization_id,
          user_id: user.id,
          owner_profile_id: user.id,
          status: riskData.status || 'OPEN',
          is_priority: riskData.is_priority || false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create risk error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Risk created successfully:', data.id, 'with code:', riskCode);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected create risk error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown create risk error'),
    };
  }
}

/**
 * Update an existing risk
 */
export async function updateRisk(
  riskData: UpdateRiskData
): Promise<{ data: Risk | null; error: Error | null }> {
  try {
    const { id, ...updates } = riskData;

    const { data, error } = await supabase
      .from('risks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update risk error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Risk updated successfully:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected update risk error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown update risk error'),
    };
  }
}

/**
 * Delete a risk
 */
export async function deleteRisk(
  riskId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('risks')
      .delete()
      .eq('id', riskId);

    if (error) {
      console.error('Delete risk error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Risk deleted successfully:', riskId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected delete risk error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown delete risk error'),
    };
  }
}

/**
 * Add a control to a risk
 */
export async function addControl(
  riskId: string,
  controlData: Omit<Control, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Control | null; error: Error | null }> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get user profile to get organization_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    const { data, error } = await supabase
      .from('controls')
      .insert([
        {
          ...controlData,
          risk_id: riskId,
          organization_id: profile.organization_id,
          owner_profile_id: user.id,
          created_by_profile_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Add control error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Control added successfully:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected add control error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown add control error'),
    };
  }
}

/**
 * Update a control
 */
export async function updateControl(
  controlId: string,
  updates: Partial<Omit<Control, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ data: Control | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('controls')
      .update(updates)
      .eq('id', controlId)
      .select()
      .single();

    if (error) {
      console.error('Update control error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Control updated successfully:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected update control error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown update control error'),
    };
  }
}

/**
 * Delete a control
 */
export async function deleteControl(
  controlId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('controls')
      .delete()
      .eq('id', controlId);

    if (error) {
      console.error('Delete control error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Control deleted successfully:', controlId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected delete control error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown delete control error'),
    };
  }
}
