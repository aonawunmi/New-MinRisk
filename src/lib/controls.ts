/**
 * Controls Library
 *
 * CRUD operations for risk controls with DIME framework.
 * Clean implementation using new database schema.
 */

import { supabase } from './supabase';
import { getCurrentOrgId, getCurrentProfileId } from './auth';
import type {
  Control,
  CreateControlData,
  UpdateControlData,
  ResidualRisk,
  ControlSummary,
  DIMEScore,
} from '@/types/control';

/**
 * API response type
 */
interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Generate a unique control code using database function
 * Format: CTRL-001, CTRL-002, CTRL-003, etc.
 * - "CTRL-" prefix
 * - Sequential 3-digit number
 * - Uses database-level locking to prevent race conditions
 */
async function generateControlCode(organizationId: string): Promise<string> {
  try {
    // Call database function for atomic code generation
    const { data, error } = await supabase
      .rpc('generate_next_control_code', {
        p_organization_id: organizationId
      });

    if (error) {
      console.error('Error generating Control code via database function:', error);
      // Fallback to timestamp-based code
      return `CTRL-${Date.now().toString().slice(-3)}`;
    }

    if (!data) {
      console.warn('Database function returned no data, using timestamp fallback');
      return `CTRL-${Date.now().toString().slice(-3)}`;
    }

    console.log('✅ Generated Control code atomically:', data);
    return data;
  } catch (err) {
    console.error('Unexpected error generating Control code:', err);
    // Fallback to timestamp-based code
    return `CTRL-${Date.now().toString().slice(-3)}`;
  }
}

/**
 * Get all controls for the organization (not just for a specific risk)
 */
export async function getAllControls(): Promise<ApiResponse<Control[]>> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { data: null, error: new Error('No organization context') };
    }

    const { data, error } = await supabase
      .from('controls')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all controls:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error fetching all controls:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get all controls for a specific risk
 */
export async function getControlsForRisk(
  riskId: string
): Promise<ApiResponse<Control[]>> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { data: null, error: new Error('No organization context') };
    }

    const { data, error } = await supabase
      .from('controls')
      .select('*')
      .eq('organization_id', orgId)
      .eq('risk_id', riskId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching controls:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error fetching controls:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get a single control by ID
 */
export async function getControl(
  controlId: string
): Promise<ApiResponse<Control>> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { data: null, error: new Error('No organization context') };
    }

    const { data, error } = await supabase
      .from('controls')
      .select('*')
      .eq('id', controlId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error fetching control:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error fetching control:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create a new control
 */
export async function createControl(
  controlData: CreateControlData
): Promise<ApiResponse<Control>> {
  try {
    const orgId = await getCurrentOrgId();
    const profileId = await getCurrentProfileId();

    if (!orgId) {
      return { data: null, error: new Error('No organization context') };
    }

    if (!profileId) {
      return { data: null, error: new Error('No user profile') };
    }

    // Auto-generate control_code if not provided
    const controlCode = controlData.control_code || await generateControlCode(orgId);

    const { data, error } = await supabase
      .from('controls')
      .insert({
        ...controlData,
        control_code: controlCode,
        organization_id: orgId,
        created_by_profile_id: profileId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating control:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      console.error('Control data being inserted:', {
        ...controlData,
        control_code: controlCode,
        organization_id: orgId,
        created_by_profile_id: profileId,
      });
      return { data: null, error };
    }

    console.log('Control created successfully:', data.id, 'with code:', controlCode);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error creating control:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Update an existing control
 */
export async function updateControl(
  controlId: string,
  controlData: UpdateControlData
): Promise<ApiResponse<Control>> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { data: null, error: new Error('No organization context') };
    }

    const { data, error } = await supabase
      .from('controls')
      .update(controlData)
      .eq('id', controlId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating control:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error updating control:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Soft delete a control
 */
export async function deleteControl(
  controlId: string
): Promise<ApiResponse<boolean>> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { data: null, error: new Error('No organization context') };
    }

    const { error } = await supabase
      .from('controls')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', controlId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting control:', error);
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (err) {
    console.error('Unexpected error deleting control:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Calculate control effectiveness using DIME framework
 * Formula per SSD: (D + I + M + E) / 12
 * Returns value between 0 and 1 (0% to 100%)
 *
 * Special case: If design = 0 OR implementation = 0, effectiveness = 0
 * (Control cannot be effective if not designed or implemented)
 */
export function calculateControlEffectiveness(
  design: DIMEScore | null,
  implementation: DIMEScore | null,
  monitoring: DIMEScore | null,
  evaluation: DIMEScore | null
): number {
  // DIME Framework Critical Rule:
  // If Design=0 or Implementation=0, control has NO effectiveness
  // (Can't work if poorly designed or not implemented)
  if (design === 0 || implementation === 0) {
    return 0;
  }

  // If Design or Implementation are null, we can't assess effectiveness
  if (design === null || implementation === null) {
    return 0;
  }

  // Monitoring and Evaluation can be null or 0 - control still has SOME effectiveness
  // Treat null M/E as 0 (not measured, but control still works based on D and I)
  const m = monitoring ?? 0;
  const e = evaluation ?? 0;

  // Calculate effectiveness as fraction (0 to 1)
  // Formula: (D + I + M + E) / 12
  return (design + implementation + m + e) / 12.0;
}

/**
 * Calculate residual risk for a specific risk
 * Formula per SSD: residual = GREATEST(1, inherent - ROUND((inherent - 1) * max_effectiveness))
 *
 * Uses MAX effectiveness of controls targeting each dimension (Likelihood or Impact)
 * If multiple controls target the same dimension, only the most effective one is used
 */
export async function calculateResidualRisk(
  riskId: string,
  inherentLikelihood: number,
  inherentImpact: number
): Promise<ApiResponse<ResidualRisk>> {
  try {
    // Get all controls for this risk
    const { data: controls, error } = await getControlsForRisk(riskId);

    if (error) {
      return { data: null, error };
    }

    // Find MAX effectiveness for Likelihood controls
    let maxLikelihoodEffectiveness = 0;
    // Find MAX effectiveness for Impact controls
    let maxImpactEffectiveness = 0;

    if (controls) {
      for (const control of controls) {
        // Skip controls without Design or Implementation (required for effectiveness)
        // Monitoring and Evaluation are optional - control can still be effective
        if (
          control.design_score === null ||
          control.implementation_score === null ||
          !control.target
        ) {
          continue;
        }

        // Calculate control effectiveness
        // (M and E can be null - will be treated as 0 in calculation)
        const effectiveness = calculateControlEffectiveness(
          control.design_score,
          control.implementation_score,
          control.monitoring_score,
          control.evaluation_score
        );

        // Track maximum effectiveness per target
        if (control.target === 'Likelihood') {
          maxLikelihoodEffectiveness = Math.max(maxLikelihoodEffectiveness, effectiveness);
        } else if (control.target === 'Impact') {
          maxImpactEffectiveness = Math.max(maxImpactEffectiveness, effectiveness);
        }
      }
    }

    // Apply SSD formula: residual = GREATEST(1, inherent - ROUND((inherent - 1) * max_effectiveness))
    const residualLikelihood = Math.max(
      1,
      inherentLikelihood - Math.round((inherentLikelihood - 1) * maxLikelihoodEffectiveness)
    );

    const residualImpact = Math.max(
      1,
      inherentImpact - Math.round((inherentImpact - 1) * maxImpactEffectiveness)
    );

    const residualScore = residualLikelihood * residualImpact;

    return {
      data: {
        residual_likelihood: residualLikelihood,
        residual_impact: residualImpact,
        residual_score: residualScore,
      },
      error: null,
    };
  } catch (err) {
    console.error('Unexpected error calculating residual risk:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get control summary for a risk
 */
export async function getControlSummary(
  riskId: string,
  inherentLikelihood: number,
  inherentImpact: number
): Promise<ApiResponse<ControlSummary>> {
  try {
    // Get all controls for this risk
    const { data: controls, error: controlsError } =
      await getControlsForRisk(riskId);

    if (controlsError) {
      return { data: null, error: controlsError };
    }

    // Calculate residual risk
    const { data: residualRisk, error: residualError } =
      await calculateResidualRisk(riskId, inherentLikelihood, inherentImpact);

    if (residualError || !residualRisk) {
      return { data: null, error: residualError || new Error('No residual risk data') };
    }

    // Calculate summary statistics
    const likelihoodControls = (controls || []).filter(
      (c) => c.target === 'Likelihood'
    );
    const impactControls = (controls || []).filter((c) => c.target === 'Impact');

    // Calculate average effectiveness
    const effectivenessScores = (controls || [])
      .filter(
        (c) =>
          c.design_score !== null &&
          c.implementation_score !== null &&
          c.monitoring_score !== null &&
          c.evaluation_score !== null
      )
      .map((c) =>
        calculateControlEffectiveness(
          c.design_score!,
          c.implementation_score!,
          c.monitoring_score!,
          c.evaluation_score!
        )
      );

    const avgEffectiveness =
      effectivenessScores.length > 0
        ? effectivenessScores.reduce((a, b) => a + b, 0) /
          effectivenessScores.length
        : 0;

    return {
      data: {
        total_controls: (controls || []).length,
        controls_targeting_likelihood: likelihoodControls.length,
        controls_targeting_impact: impactControls.length,
        average_effectiveness: avgEffectiveness,
        residual_risk: residualRisk,
      },
      error: null,
    };
  } catch (err) {
    console.error('Unexpected error getting control summary:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
