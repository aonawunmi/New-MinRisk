/**
 * Configuration Management Library
 *
 * Manages organization-specific configurations including:
 * - Divisions and departments (dropdowns)
 * - Likelihood/Impact labels (numeric-to-text mapping)
 * - Matrix size (5x5 or 6x6)
 * - Categories and owners
 */

import { supabase } from './supabase';
import { getCurrentOrgId, getCurrentProfileId } from './auth';

// ============================================================================
// TYPES
// ============================================================================

export interface LikelihoodLabels {
  '1': string;
  '2': string;
  '3': string;
  '4': string;
  '5': string;
  '6'?: string; // Only for 6x6 matrix
}

export interface ImpactLabels {
  '1': string;
  '2': string;
  '3': string;
  '4': string;
  '5': string;
  '6'?: string; // Only for 6x6 matrix
}

export interface OrganizationConfig {
  id: string;
  organization_id: string;
  user_id: string;
  matrix_size: 5 | 6;
  likelihood_labels: LikelihoodLabels;
  impact_labels: ImpactLabels;
  divisions: string[];
  departments: string[];
  categories: string[];
  owners: string[];
  created_at: string;
  updated_at: string;
}

export interface UpdateConfigData {
  matrix_size?: 5 | 6;
  likelihood_labels?: LikelihoodLabels;
  impact_labels?: ImpactLabels;
  divisions?: string[];
  departments?: string[];
  categories?: string[];
  owners?: string[];
}

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_5X5_LIKELIHOOD_LABELS: LikelihoodLabels = {
  '1': 'Rare',
  '2': 'Unlikely',
  '3': 'Possible',
  '4': 'Likely',
  '5': 'Almost Certain',
};

export const DEFAULT_5X5_IMPACT_LABELS: ImpactLabels = {
  '1': 'Minimal',
  '2': 'Low',
  '3': 'Moderate',
  '4': 'High',
  '5': 'Severe',
};

export const DEFAULT_6X6_LIKELIHOOD_LABELS: LikelihoodLabels = {
  '1': 'Very Rare',
  '2': 'Rare',
  '3': 'Unlikely',
  '4': 'Possible',
  '5': 'Likely',
  '6': 'Almost Certain',
};

export const DEFAULT_6X6_IMPACT_LABELS: ImpactLabels = {
  '1': 'Insignificant',
  '2': 'Minimal',
  '3': 'Low',
  '4': 'Moderate',
  '5': 'High',
  '6': 'Severe',
};

export const DEFAULT_DIVISIONS = ['Clearing', 'Operations', 'Finance', 'Technology'];
export const DEFAULT_DEPARTMENTS = ['Risk Management', 'IT Ops', 'Quant/Risk', 'Treasury', 'Trading'];
export const DEFAULT_CATEGORIES = [
  'Strategic',
  'Credit',
  'Market',
  'Liquidity',
  'Operational',
  'Legal/Compliance',
  'Technology',
  'ESG',
  'Reputational',
];

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get organization configuration
 */
export async function getOrganizationConfig(): Promise<ApiResponse<OrganizationConfig>> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { data: null, error: new Error('No organization context') };
    }

    const { data, error } = await supabase
      .from('app_configs')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error) {
      console.error('Error fetching organization config:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error fetching config:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Update organization configuration
 */
export async function updateOrganizationConfig(
  updates: UpdateConfigData
): Promise<ApiResponse<OrganizationConfig>> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { data: null, error: new Error('No organization context') };
    }

    const { data, error } = await supabase
      .from('app_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization config:', error);
      return { data: null, error };
    }

    console.log('Organization config updated successfully');
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error updating config:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create initial configuration for new organization
 */
export async function createOrganizationConfig(
  matrixSize: 5 | 6 = 5
): Promise<ApiResponse<OrganizationConfig>> {
  try {
    const orgId = await getCurrentOrgId();
    const profileId = await getCurrentProfileId();

    if (!orgId || !profileId) {
      return { data: null, error: new Error('No organization or user context') };
    }

    const { data, error } = await supabase
      .from('app_configs')
      .insert({
        organization_id: orgId,
        user_id: profileId,
        matrix_size: matrixSize,
        likelihood_labels:
          matrixSize === 5
            ? DEFAULT_5X5_LIKELIHOOD_LABELS
            : DEFAULT_6X6_LIKELIHOOD_LABELS,
        impact_labels:
          matrixSize === 5 ? DEFAULT_5X5_IMPACT_LABELS : DEFAULT_6X6_IMPACT_LABELS,
        divisions: DEFAULT_DIVISIONS,
        departments: DEFAULT_DEPARTMENTS,
        categories: DEFAULT_CATEGORIES,
        owners: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating organization config:', error);
      return { data: null, error };
    }

    console.log('Organization config created successfully');
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error creating config:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get likelihood label for a numeric value
 */
export function getLikelihoodLabel(
  config: OrganizationConfig | null,
  value: number
): string {
  if (!config || !config.likelihood_labels) {
    return `Level ${value}`;
  }
  return config.likelihood_labels[value.toString() as keyof LikelihoodLabels] || `Level ${value}`;
}

/**
 * Get impact label for a numeric value
 */
export function getImpactLabel(
  config: OrganizationConfig | null,
  value: number
): string {
  if (!config || !config.impact_labels) {
    return `Level ${value}`;
  }
  return config.impact_labels[value.toString() as keyof ImpactLabels] || `Level ${value}`;
}

/**
 * Get formatted label (e.g., "Likely (4)")
 */
export function getFormattedLikelihoodLabel(
  config: OrganizationConfig | null,
  value: number
): string {
  const label = getLikelihoodLabel(config, value);
  return `${label} (${value})`;
}

/**
 * Get formatted impact label (e.g., "High (4)")
 */
export function getFormattedImpactLabel(
  config: OrganizationConfig | null,
  value: number
): string {
  const label = getImpactLabel(config, value);
  return `${label} (${value})`;
}

/**
 * Get all likelihood options for dropdowns
 */
export function getLikelihoodOptions(
  config: OrganizationConfig | null
): Array<{ value: number; label: string }> {
  const matrixSize = config?.matrix_size || 5;
  const options: Array<{ value: number; label: string }> = [];

  for (let i = 1; i <= matrixSize; i++) {
    options.push({
      value: i,
      label: getFormattedLikelihoodLabel(config, i),
    });
  }

  return options;
}

/**
 * Get all impact options for dropdowns
 */
export function getImpactOptions(
  config: OrganizationConfig | null
): Array<{ value: number; label: string }> {
  const matrixSize = config?.matrix_size || 5;
  const options: Array<{ value: number; label: string }> = [];

  for (let i = 1; i <= matrixSize; i++) {
    options.push({
      value: i,
      label: getFormattedImpactLabel(config, i),
    });
  }

  return options;
}

/**
 * Reset to default labels based on matrix size
 */
export async function resetToDefaultLabels(
  matrixSize: 5 | 6
): Promise<ApiResponse<OrganizationConfig>> {
  return updateOrganizationConfig({
    matrix_size: matrixSize,
    likelihood_labels:
      matrixSize === 5 ? DEFAULT_5X5_LIKELIHOOD_LABELS : DEFAULT_6X6_LIKELIHOOD_LABELS,
    impact_labels:
      matrixSize === 5 ? DEFAULT_5X5_IMPACT_LABELS : DEFAULT_6X6_IMPACT_LABELS,
  });
}
