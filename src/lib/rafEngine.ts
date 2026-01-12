/**
 * Risk Appetite Framework (RAF) Engine
 * 
 * Core calculation engine for:
 * - RAF-adjusted risk scoring
 * - Out-of-appetite detection
 * - KRI threshold generation from tolerances
 * - Appetite multiplier calculations
 * 
 * @module rafEngine
 */

import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export type AppetiteLevel = 'ZERO' | 'LOW' | 'MODERATE' | 'HIGH';

export interface RAFScoreResult {
    baseScore: number;
    adjustedScore: number;
    multiplier: number;
    appetiteLevel: AppetiteLevel;
    outOfAppetite: boolean;
    explanation: string;
}

export interface RAFConfig {
    organizationId: string;
    // Configurable multipliers (defaults provided)
    multipliers?: {
        ZERO: number;
        LOW: number;
        MODERATE: number;
        HIGH: number;
    };
    // Threshold for out-of-appetite (percentage of tolerance)
    outOfAppetiteThreshold?: number;
}

export interface ToleranceKRIMapping {
    toleranceId: string;
    kriTarget: number;
    kriWarning: number;
    kriCritical: number;
    unit: string;
    description: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_MULTIPLIERS = {
    ZERO: 2.0,      // Zero tolerance = double the severity
    LOW: 1.5,       // Low appetite = 1.5x severity
    MODERATE: 1.0,  // Moderate = normal scoring
    HIGH: 0.8,      // High appetite = reduced severity
};

// ============================================================================
// RAF SCORE CALCULATION
// ============================================================================

/**
 * Calculate RAF-adjusted risk score based on appetite level
 * 
 * @param baseScore - The inherent or residual risk score (likelihood × impact)
 * @param appetiteLevel - The appetite level for this risk category
 * @param customMultipliers - Optional custom multipliers per organization
 * @returns RAF-adjusted score with explanation
 */
export function calculateRAFAdjustedScore(
    baseScore: number,
    appetiteLevel: AppetiteLevel,
    customMultipliers?: Partial<typeof DEFAULT_MULTIPLIERS>
): RAFScoreResult {
    const multipliers = { ...DEFAULT_MULTIPLIERS, ...customMultipliers };
    const multiplier = multipliers[appetiteLevel] || 1.0;
    const adjustedScore = baseScore * multiplier;

    // Determine if out of appetite (adjusted score exceeds typical threshold)
    // Threshold is 15 for a 5×5 matrix (high-high)
    const outOfAppetite = adjustedScore > 15;

    const explanations: Record<AppetiteLevel, string> = {
        ZERO: 'Zero appetite - severity doubled. Immediate action required.',
        LOW: 'Low appetite - severity increased by 50%. Prioritize mitigation.',
        MODERATE: 'Moderate appetite - normal risk scoring applied.',
        HIGH: 'High appetite - reduced severity. Monitor for changes.',
    };

    return {
        baseScore,
        adjustedScore: Math.round(adjustedScore * 100) / 100,
        multiplier,
        appetiteLevel,
        outOfAppetite,
        explanation: explanations[appetiteLevel],
    };
}

/**
 * Calculate RAF score for a risk including the full assessment
 */
export async function calculateRiskRAFScore(
    riskId: string
): Promise<{ data: RAFScoreResult | null; error: Error | null }> {
    try {
        // Get risk with linked appetite category
        const { data: risk, error: riskError } = await supabase
            .from('risks')
            .select(`
        *,
        appetite_category:appetite_category_id (
          id,
          appetite_level,
          risk_category,
          rationale
        )
      `)
            .eq('id', riskId)
            .single();

        if (riskError || !risk) {
            console.error('Error fetching risk for RAF calculation:', riskError);
            return { data: null, error: new Error(riskError?.message || 'Risk not found') };
        }

        // Calculate base score
        const baseScore = (risk.likelihood_inherent || 1) * (risk.impact_inherent || 1);

        // If no appetite category linked, use MODERATE as default
        const appetiteLevel = (risk.appetite_category?.appetite_level as AppetiteLevel) || 'MODERATE';

        const result = calculateRAFAdjustedScore(baseScore, appetiteLevel);

        return { data: result, error: null };
    } catch (err) {
        console.error('Unexpected error calculating RAF score:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Update a risk's RAF-adjusted score in the database
 */
export async function updateRiskRAFScore(
    riskId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data: result, error: calcError } = await calculateRiskRAFScore(riskId);

        if (calcError || !result) {
            return { success: false, error: calcError };
        }

        const { error: updateError } = await supabase
            .from('risks')
            .update({
                raf_adjusted_score: result.adjustedScore,
                appetite_multiplier: result.multiplier,
                out_of_appetite: result.outOfAppetite,
            })
            .eq('id', riskId);

        if (updateError) {
            console.error('Error updating RAF score:', updateError);
            return { success: false, error: new Error(updateError.message) };
        }

        console.log(`✅ Updated RAF score for risk ${riskId}: ${result.adjustedScore} (${result.multiplier}x)`);
        return { success: true, error: null };
    } catch (err) {
        console.error('Unexpected error updating RAF score:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// BULK RAF RECALCULATION
// ============================================================================

/**
 * Recalculate RAF scores for all risks in an organization
 * Called when appetite levels change
 * 
 * Includes debouncing to prevent cascade loops
 */
let recalculationInProgress = false;

export async function recalculateAllRAFScores(
    organizationId: string
): Promise<{ updated: number; errors: number }> {
    // Debounce to prevent cascade loops
    if (recalculationInProgress) {
        console.log('⏸️ RAF recalculation already in progress, skipping...');
        return { updated: 0, errors: 0 };
    }

    recalculationInProgress = true;

    try {
        // Get all risks for the organization with appetite categories
        const { data: risks, error: fetchError } = await supabase
            .from('risks')
            .select('id')
            .eq('organization_id', organizationId);

        if (fetchError || !risks) {
            console.error('Error fetching risks for bulk RAF recalculation:', fetchError);
            return { updated: 0, errors: 1 };
        }

        let updated = 0;
        let errors = 0;

        for (const risk of risks) {
            const { success, error } = await updateRiskRAFScore(risk.id);
            if (success) {
                updated++;
            } else {
                errors++;
                console.error(`Failed to update RAF for risk ${risk.id}:`, error);
            }
        }

        console.log(`📊 Bulk RAF recalculation complete: ${updated} updated, ${errors} errors`);
        return { updated, errors };
    } finally {
        recalculationInProgress = false;
    }
}

// ============================================================================
// KRI THRESHOLD GENERATION FROM TOLERANCES
// ============================================================================

/**
 * Generate KRI thresholds from a tolerance metric
 * 
 * Mapping:
 * - Tolerance green_max → KRI Target
 * - Tolerance amber_max / Soft Limit → KRI Warning
 * - Tolerance red_min / Hard Limit → KRI Critical
 */
export async function generateKRIFromTolerance(
    toleranceId: string
): Promise<{ data: ToleranceKRIMapping | null; error: Error | null }> {
    try {
        // Get tolerance with limits
        const { data: tolerance, error: tolError } = await supabase
            .from('appetite_kri_thresholds')
            .select(`
        *,
        limits:risk_limits (
          soft_limit,
          hard_limit
        )
      `)
            .eq('id', toleranceId)
            .single();

        if (tolError || !tolerance) {
            return { data: null, error: new Error(tolError?.message || 'Tolerance not found') };
        }

        // Determine KRI thresholds
        const limits = tolerance.limits?.[0];

        const mapping: ToleranceKRIMapping = {
            toleranceId,
            kriTarget: tolerance.green_max ?? 0,
            kriWarning: limits?.soft_limit ?? tolerance.amber_max ?? tolerance.green_max * 1.2,
            kriCritical: limits?.hard_limit ?? tolerance.red_min ?? tolerance.green_max * 1.5,
            unit: tolerance.unit || 'count',
            description: `Auto-generated from tolerance: ${tolerance.metric_name}`,
        };

        return { data: mapping, error: null };
    } catch (err) {
        console.error('Error generating KRI from tolerance:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Create or update a KRI definition based on tolerance thresholds
 */
export async function syncKRIWithTolerance(
    kriId: string,
    toleranceId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data: mapping, error: mapError } = await generateKRIFromTolerance(toleranceId);

        if (mapError || !mapping) {
            return { success: false, error: mapError };
        }

        // Update KRI thresholds
        const { error: updateError } = await supabase
            .from('kri_definitions')
            .update({
                target_value: mapping.kriTarget,
                threshold_yellow_upper: mapping.kriWarning,
                threshold_red_upper: mapping.kriCritical,
                unit_of_measure: mapping.unit,
            })
            .eq('id', kriId);

        if (updateError) {
            console.error('Error syncing KRI with tolerance:', updateError);
            return { success: false, error: new Error(updateError.message) };
        }

        // Update tolerance to link to KRI
        await supabase
            .from('appetite_kri_thresholds')
            .update({ kri_id: kriId })
            .eq('id', toleranceId);

        console.log(`✅ Synced KRI ${kriId} with tolerance ${toleranceId}`);
        return { success: true, error: null };
    } catch (err) {
        console.error('Unexpected error syncing KRI:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// OUT OF APPETITE DETECTION
// ============================================================================

/**
 * Check if a risk is out of appetite and trigger appropriate actions
 */
export async function checkOutOfAppetite(
    riskId: string
): Promise<{ outOfAppetite: boolean; actions: string[] }> {
    const actions: string[] = [];

    const { data: result, error } = await calculateRiskRAFScore(riskId);

    if (error || !result) {
        return { outOfAppetite: false, actions: ['Error calculating RAF score'] };
    }

    if (result.outOfAppetite) {
        actions.push('Risk flagged as OUT OF APPETITE');

        if (result.appetiteLevel === 'ZERO' || result.appetiteLevel === 'LOW') {
            actions.push('Mandatory escalation to CRO required');
            actions.push('Monthly control effectiveness reviews enabled');
        }

        if (result.appetiteLevel === 'ZERO') {
            actions.push('Escalate to board risk committee');
        }
    }

    return { outOfAppetite: result.outOfAppetite, actions };
}

// ============================================================================
// APPETITE LEVEL HELPERS
// ============================================================================

/**
 * Get appetite level for a risk category
 */
export async function getAppetiteLevelForCategory(
    organizationId: string,
    riskCategory: string
): Promise<AppetiteLevel | null> {
    try {
        const { data, error } = await supabase
            .from('risk_appetite_categories')
            .select('appetite_level')
            .eq('organization_id', organizationId)
            .eq('risk_category', riskCategory)
            .single();

        if (error || !data) {
            return null;
        }

        return data.appetite_level as AppetiteLevel;
    } catch {
        return null;
    }
}

/**
 * Get all categories with their appetite status
 */
export async function getOrganizationAppetiteSummary(
    organizationId: string
): Promise<{
    summary: {
        total: number;
        byLevel: Record<AppetiteLevel, number>;
    };
    categories: Array<{
        category: string;
        level: AppetiteLevel;
        risksCount: number;
        outOfAppetiteCount: number;
    }>;
}> {
    const result = {
        summary: {
            total: 0,
            byLevel: {
                ZERO: 0,
                LOW: 0,
                MODERATE: 0,
                HIGH: 0,
            },
        },
        categories: [] as Array<{
            category: string;
            level: AppetiteLevel;
            risksCount: number;
            outOfAppetiteCount: number;
        }>,
    };

    try {
        const { data: categories } = await supabase
            .from('risk_appetite_categories')
            .select(`
        id,
        risk_category,
        appetite_level,
        risks:risks!appetite_category_id (
          id,
          out_of_appetite
        )
      `)
            .eq('organization_id', organizationId);

        if (categories) {
            for (const cat of categories) {
                const level = cat.appetite_level as AppetiteLevel;
                const risks = cat.risks || [];

                result.summary.total++;
                result.summary.byLevel[level]++;

                result.categories.push({
                    category: cat.risk_category,
                    level,
                    risksCount: risks.length,
                    outOfAppetiteCount: risks.filter((r: { out_of_appetite: boolean }) => r.out_of_appetite).length,
                });
            }
        }
    } catch (err) {
        console.error('Error getting appetite summary:', err);
    }

    return result;
}
