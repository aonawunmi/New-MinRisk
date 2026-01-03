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
  owner: string; // Legacy TEXT field
  owner_id?: string | null; // New field - UUID reference to auth.users
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
 * Generate a unique risk code using database function with dynamic prefix
 * Format: DIV-CAT-001 (e.g., CLE-CRE-001)
 * - First 3 letters of division (uppercase)
 * - First 3 letters of category (uppercase)
 * - Sequential 3-digit number per prefix
 * - Uses database-level locking to prevent race conditions
 */
async function generateRiskCode(
  organizationId: string,
  division: string,
  category: string
): Promise<string> {
  try {
    console.log(`[DEBUG] Calling generate_next_risk_code RPC with: Org=${organizationId}, Div=${division}, Cat=${category}`);
    // Call database function for atomic code generation with dynamic prefix
    const { data, error } = await supabase
      .rpc('generate_next_risk_code', {
        p_organization_id: organizationId,
        p_division: division,
        p_category: category
      });

    if (error) {
      console.error('Error generating Risk code via database function:', error);
      // Fallback to timestamp-based code
      const divPrefix = division.substring(0, 3).toUpperCase();
      const catPrefix = category.substring(0, 3).toUpperCase();
      return `${divPrefix}-${catPrefix}-${Date.now().toString().slice(-3)}`;
    }

    if (!data) {
      console.warn('Database function returned no data, using timestamp fallback');
      const divPrefix = division.substring(0, 3).toUpperCase();
      const catPrefix = category.substring(0, 3).toUpperCase();
      return `${divPrefix}-${catPrefix}-${Date.now().toString().slice(-3)}`;
    }

    console.log('✅ Generated Risk code atomically:', data, 'for', division, '/', category);
    return data;
  } catch (err) {
    console.error('Unexpected error generating Risk code:', err);
    // Fallback to timestamp-based code
    const divPrefix = division.substring(0, 3).toUpperCase();
    const catPrefix = category.substring(0, 3).toUpperCase();
    return `${divPrefix}-${catPrefix}-${Date.now().toString().slice(-3)}`;
  }
}

/**
 * Get all risks for the current user's organization with owner information
 * RLS automatically filters by organization_id
 * Enriches risks with owner full_name from user_profiles
 */
export async function getRisks(): Promise<{ data: Risk[] | null; error: Error | null }> {
  try {
    const { data: risks, error } = await supabase
      .from('risks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get risks error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    // If no risks, return empty array
    if (!risks || risks.length === 0) {
      return { data: [], error: null };
    }

    // Get unique owner_ids that are not null
    const ownerIds = Array.from(new Set(
      risks
        .map(r => r.owner_id)
        .filter((id): id is string => id !== null && id !== undefined)
    ));

    // If no owner_ids, return risks as-is
    if (ownerIds.length === 0) {
      return { data: risks, error: null };
    }

    // Fetch owner information via Edge Function (bypasses RLS, uses service role)
    console.log('🔍 Fetching owner profiles for IDs via Edge Function:', ownerIds);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No session found for Edge Function call');
      // Return risks with legacy owner fallback
      return {
        data: risks.map(risk => ({
          ...risk,
          owner_email: risk.owner || 'Unknown'
        })),
        error: null
      };
    }

    const { data: ownerData, error: ownerError } = await supabase.functions.invoke('get-risk-owners', {
      body: { ownerIds },
    });

    console.log('📊 Owner profiles Edge Function result:', {
      data: ownerData,
      error: ownerError,
      count: ownerData?.data ? Object.keys(ownerData.data).length : 0
    });

    if (ownerError) {
      console.error('❌ Error fetching owner profiles:', ownerError.message);
      // Return risks with legacy owner fallback
      return {
        data: risks.map(risk => ({
          ...risk,
          owner_email: risk.owner || 'Unknown'
        })),
        error: null
      };
    }

    // Create a map of owner_id -> full_name from Edge Function response
    const ownerInfoMap = ownerData?.data || {};
    const ownerMap = new Map<string, string>();

    Object.values(ownerInfoMap).forEach((ownerInfo: any) => {
      if (ownerInfo.full_name) {
        ownerMap.set(ownerInfo.id, ownerInfo.full_name);
      }
    });

    console.log('🗺️ Owner map created:', {
      size: ownerMap.size,
      entries: Array.from(ownerMap.entries())
    });

    // Enrich risks with owner_email (using full_name from user_profiles, fallback to legacy owner field)
    const enrichedRisks = risks.map(risk => ({
      ...risk,
      owner_email: risk.owner_id
        ? (ownerMap.get(risk.owner_id) || risk.owner || 'Unknown')  // Try user_profiles first, then legacy owner field
        : (risk.owner || 'Unassigned')  // If no owner_id, use legacy owner field
    }));

    return { data: enrichedRisks, error: null };
  } catch (err) {
    console.error('Unexpected get risks error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown get risks error'),
    };
  }
}

/**
 * Get a single risk by ID with its controls (via junction table)
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

    // Get controls for this risk via junction table
    const { data: controlLinks, error: controlsError } = await supabase
      .from('risk_control_links')
      .select(`
        control_id,
        controls:control_id (*)
      `)
      .eq('risk_id', riskId);

    if (controlsError) {
      console.error('Get controls error:', controlsError.message);
      // Return risk without controls rather than failing completely
      return { data: { ...risk, controls: [] }, error: null };
    }

    // Extract controls from the junction table result
    const controls = controlLinks?.map((link: any) => link.controls).filter(Boolean) || [];

    return { data: { ...risk, controls }, error: null };
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
          owner_id: riskData.owner_id || user.id, // Default to creator if not specified
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
 *
 * IMPORTANT: This unlinks Controls and KRIs rather than deleting them.
 * - Controls exist independently and can be reused across multiple risks
 * - KRIs can monitor multiple risks simultaneously
 * - Only the junction table records (links) are deleted via CASCADE
 * - The actual Control and KRI records remain intact
 */
export async function deleteRisk(
  riskId: string
): Promise<{ error: Error | null }> {
  try {
    // Delete the risk
    // This will automatically cascade delete:
    // - risk_control_links (unlinks controls)
    // - kri_risk_links (unlinks KRIs)
    // - But NOT the actual controls or KRI definitions
    const { error } = await supabase
      .from('risks')
      .delete()
      .eq('id', riskId);

    if (error) {
      console.error('Delete risk error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Risk deleted successfully:', riskId, '(controls and KRIs unlinked, not deleted)');
    return { error: null };
  } catch (err) {
    console.error('Unexpected delete risk error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown delete risk error'),
    };
  }
}

/**
 * Add a control to a risk (creates control and links it via junction table)
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

    // Create the control (without risk_id - controls are independent)
    const { data: control, error: controlError } = await supabase
      .from('controls')
      .insert([
        {
          ...controlData,
          organization_id: profile.organization_id,
          owner_profile_id: user.id,
          created_by_profile_id: user.id,
          // Note: risk_id is now nullable and not set here
        },
      ])
      .select()
      .single();

    if (controlError) {
      console.error('Add control error:', controlError.message);
      return { data: null, error: new Error(controlError.message) };
    }

    // Link the control to the risk via junction table
    const { error: linkError } = await supabase
      .from('risk_control_links')
      .insert([
        {
          risk_id: riskId,
          control_id: control.id,
          created_by: user.id,
        },
      ]);

    if (linkError) {
      console.error('Link control to risk error:', linkError.message);
      // Rollback: delete the control we just created
      await supabase.from('controls').delete().eq('id', control.id);
      return { data: null, error: new Error(linkError.message) };
    }

    console.log('Control added and linked to risk successfully:', control.id);
    return { data: control, error: null };
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
 * Delete a control (permanently removes the control and all its links)
 * Note: This will cascade delete all risk_control_links
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

/**
 * Link an existing control to a risk
 */
export async function linkControlToRisk(
  controlId: string,
  riskId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('risk_control_links')
      .insert([
        {
          risk_id: riskId,
          control_id: controlId,
          created_by: user.id,
        },
      ]);

    if (error) {
      console.error('Link control to risk error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Control linked to risk successfully:', controlId, '->', riskId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected link control error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown link control error'),
    };
  }
}

/**
 * Unlink a control from a risk (keeps the control, just removes the link)
 */
export async function unlinkControlFromRisk(
  controlId: string,
  riskId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('risk_control_links')
      .delete()
      .eq('risk_id', riskId)
      .eq('control_id', controlId);

    if (error) {
      console.error('Unlink control from risk error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Control unlinked from risk successfully:', controlId, '<-X->', riskId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected unlink control error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown unlink control error'),
    };
  }
}

/**
 * Link an existing KRI to a risk
 */
export async function linkKRIToRisk(
  kriId: string,
  riskId: string,
  aiConfidence?: number
): Promise<{ error: Error | null }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('kri_risk_links')
      .insert([
        {
          kri_id: kriId,
          risk_id: riskId,
          ai_link_confidence: aiConfidence,
          linked_by: user.id,
        },
      ]);

    if (error) {
      console.error('Link KRI to risk error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('KRI linked to risk successfully:', kriId, '->', riskId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected link KRI error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown link KRI error'),
    };
  }
}

/**
 * Unlink a KRI from a risk (keeps the KRI, just removes the link)
 */
export async function unlinkKRIFromRisk(
  kriId: string,
  riskId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('kri_risk_links')
      .delete()
      .eq('kri_id', kriId)
      .eq('risk_id', riskId);

    if (error) {
      console.error('Unlink KRI from risk error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('KRI unlinked from risk successfully:', kriId, '<-X->', riskId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected unlink KRI error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown unlink KRI error'),
    };
  }
}

/**
 * Get all controls linked to a specific risk
 */
export async function getControlsForRisk(
  riskId: string
): Promise<{ data: Control[] | null; error: Error | null }> {
  try {
    const { data: controlLinks, error } = await supabase
      .from('risk_control_links')
      .select(`
        control_id,
        controls:control_id (*)
      `)
      .eq('risk_id', riskId);

    if (error) {
      console.error('Get controls for risk error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    const controls = controlLinks?.map((link: any) => link.controls).filter(Boolean) || [];
    return { data: controls, error: null };
  } catch (err) {
    console.error('Unexpected get controls error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown get controls error'),
    };
  }
}

/**
 * Get all risks linked to a specific control
 */
export async function getRisksForControl(
  controlId: string
): Promise<{ data: Risk[] | null; error: Error | null }> {
  try {
    const { data: riskLinks, error } = await supabase
      .from('risk_control_links')
      .select(`
        risk_id,
        risks:risk_id (*)
      `)
      .eq('control_id', controlId);

    if (error) {
      console.error('Get risks for control error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    const risks = riskLinks?.map((link: any) => link.risks).filter(Boolean) || [];
    return { data: risks, error: null };
  } catch (err) {
    console.error('Unexpected get risks error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown get risks error'),
    };
  }
}
