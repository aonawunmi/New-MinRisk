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

// DIME Framework types
export interface DIMEScoreDescription {
  label: string;
  description: string;
}

export interface DIMEDimensionDescriptions {
  '0': DIMEScoreDescription;
  '1': DIMEScoreDescription;
  '2': DIMEScoreDescription;
  '3': DIMEScoreDescription;
}

export interface DIMEDescriptions {
  design: DIMEDimensionDescriptions;
  implementation: DIMEDimensionDescriptions;
  monitoring: DIMEDimensionDescriptions;
  evaluation: DIMEDimensionDescriptions;
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
  dime_descriptions?: DIMEDescriptions;
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
  dime_descriptions?: DIMEDescriptions;
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

export const DEFAULT_DIME_DESCRIPTIONS: DIMEDescriptions = {
  design: {
    '0': { label: 'Not designed', description: 'Control does not address the risk' },
    '1': { label: 'Poorly designed', description: 'Control minimally addresses the risk' },
    '2': { label: 'Partially designed', description: 'Control partially addresses the risk' },
    '3': { label: 'Well designed', description: 'Control specifically addresses the risk' },
  },
  implementation: {
    '0': { label: 'Not applied', description: 'Control is not applied or applied incorrectly' },
    '1': { label: 'Sometimes applied', description: 'Control is applied inconsistently' },
    '2': { label: 'Generally operational', description: 'Control is usually applied correctly' },
    '3': { label: 'Always applied', description: 'Control is always applied as intended' },
  },
  monitoring: {
    '0': { label: 'Not monitored', description: 'Control is not monitored at all' },
    '1': { label: 'Ad-hoc monitoring', description: 'Control is monitored on an ad-hoc basis' },
    '2': { label: 'Usually monitored', description: 'Control is regularly monitored' },
    '3': { label: 'Always monitored', description: 'Control is continuously monitored' },
  },
  evaluation: {
    '0': { label: 'Never evaluated', description: 'Control effectiveness is never evaluated' },
    '1': { label: 'Infrequently evaluated', description: 'Control effectiveness is rarely evaluated' },
    '2': { label: 'Occasionally evaluated', description: 'Control effectiveness is occasionally evaluated' },
    '3': { label: 'Regularly evaluated', description: 'Control effectiveness is regularly evaluated' },
  },
};

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
      // Super Admin / No org context: Return default system config
      const defaultConfig: OrganizationConfig = {
        id: 'system',
        organization_id: 'system',
        user_id: 'system',
        matrix_size: 5,
        likelihood_labels: DEFAULT_5X5_LIKELIHOOD_LABELS,
        impact_labels: DEFAULT_5X5_IMPACT_LABELS,
        divisions: DEFAULT_DIVISIONS,
        departments: DEFAULT_DEPARTMENTS,
        categories: DEFAULT_CATEGORIES,
        owners: [],
        dime_descriptions: DEFAULT_DIME_DESCRIPTIONS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { data: defaultConfig, error: null };
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
      // Super Admin / No org context: Cannot update system config, return no-op
      console.warn('updateOrganizationConfig: Skipped - no organization context (Super Admin)');
      return { data: null, error: null };
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

// ============================================================================
// DIME HELPER FUNCTIONS
// ============================================================================

/**
 * Get DIME score label for dropdown display
 * Format: "2 - Partially designed"
 */
export function getDIMELabel(
  config: OrganizationConfig | null,
  dimension: 'design' | 'implementation' | 'monitoring' | 'evaluation',
  score: 0 | 1 | 2 | 3
): string {
  const descriptions = config?.dime_descriptions || DEFAULT_DIME_DESCRIPTIONS;
  const scoreDesc = descriptions[dimension]?.[score.toString() as '0' | '1' | '2' | '3'];

  if (scoreDesc) {
    return `${score} - ${scoreDesc.label}`;
  }

  // Fallback to defaults
  const defaultDesc = DEFAULT_DIME_DESCRIPTIONS[dimension][score.toString() as '0' | '1' | '2' | '3'];
  return `${score} - ${defaultDesc.label}`;
}

/**
 * Get DIME score description (longer text)
 */
export function getDIMEDescription(
  config: OrganizationConfig | null,
  dimension: 'design' | 'implementation' | 'monitoring' | 'evaluation',
  score: 0 | 1 | 2 | 3
): string {
  const descriptions = config?.dime_descriptions || DEFAULT_DIME_DESCRIPTIONS;
  const scoreDesc = descriptions[dimension]?.[score.toString() as '0' | '1' | '2' | '3'];

  if (scoreDesc) {
    return scoreDesc.description;
  }

  return DEFAULT_DIME_DESCRIPTIONS[dimension][score.toString() as '0' | '1' | '2' | '3'].description;
}

/**
 * Reset DIME descriptions to defaults
 */
export async function resetDIMEDescriptions(): Promise<ApiResponse<OrganizationConfig>> {
  return updateOrganizationConfig({
    dime_descriptions: DEFAULT_DIME_DESCRIPTIONS,
  });
}

