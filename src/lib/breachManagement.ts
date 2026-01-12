/**
 * Breach Management System
 * 
 * Handles:
 * - Breach detection when tolerances/limits are exceeded
 * - Breach record creation and status tracking
 * - Escalation workflow logic
 * - KRI threshold auto-tightening on breach
 * - Resolution tracking
 * 
 * @module breachManagement
 */

import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export type BreachType = 'SOFT' | 'HARD' | 'CRITICAL';
export type BreachSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BreachStatus =
    | 'OPEN'
    | 'ACKNOWLEDGED'
    | 'INVESTIGATING'
    | 'REMEDIATION_IN_PROGRESS'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'RESOLVED'
    | 'CLOSED';

export interface BreachDetectionResult {
    isBreach: boolean;
    breachType: BreachType | null;
    severity: BreachSeverity;
    breachValue: number;
    thresholdValue: number;
    varianceAmount: number;
    variancePercentage: number;
}

export interface BreachRecord {
    id: string;
    organizationId: string;
    toleranceId: string | null;
    limitId: string | null;
    breachType: BreachType;
    breachDate: string;
    breachValue: number;
    thresholdValue: number;
    varianceAmount: number;
    variancePercentage: number;
    severity: BreachSeverity;
    status: BreachStatus;
    rootCause: string | null;
    resolutionNotes: string | null;
}

export interface CreateBreachData {
    organizationId: string;
    toleranceId?: string;
    limitId?: string;
    kriDataEntryId?: string;
    breachType: BreachType;
    breachValue: number;
    thresholdValue: number;
    varianceAmount?: number;
    variancePercentage?: number;
    severity?: BreachSeverity;
    isToleranceBreach?: boolean;
    isLimitBreach?: boolean;
}

// ============================================================================
// BREACH DETECTION
// ============================================================================

/**
 * Detect if a value breaches tolerance/limit thresholds
 */
export function detectBreach(
    currentValue: number,
    toleranceThreshold: number | null,
    softLimit: number | null,
    hardLimit: number | null,
    direction: 'UPPER' | 'LOWER' = 'UPPER'
): BreachDetectionResult {
    const result: BreachDetectionResult = {
        isBreach: false,
        breachType: null,
        severity: 'LOW',
        breachValue: currentValue,
        thresholdValue: 0,
        varianceAmount: 0,
        variancePercentage: 0,
    };

    // Helper to check if value exceeds threshold
    const exceeds = (value: number, threshold: number): boolean => {
        return direction === 'UPPER' ? value > threshold : value < threshold;
    };

    // Check hard limit first (highest severity)
    if (hardLimit !== null && exceeds(currentValue, hardLimit)) {
        result.isBreach = true;
        result.breachType = 'HARD';
        result.severity = 'CRITICAL';
        result.thresholdValue = hardLimit;
        result.varianceAmount = Math.abs(currentValue - hardLimit);
        result.variancePercentage = hardLimit !== 0 ? (result.varianceAmount / Math.abs(hardLimit)) * 100 : 0;
        return result;
    }

    // Check soft limit
    if (softLimit !== null && exceeds(currentValue, softLimit)) {
        result.isBreach = true;
        result.breachType = 'SOFT';
        result.severity = 'HIGH';
        result.thresholdValue = softLimit;
        result.varianceAmount = Math.abs(currentValue - softLimit);
        result.variancePercentage = softLimit !== 0 ? (result.varianceAmount / Math.abs(softLimit)) * 100 : 0;
        return result;
    }

    // Check tolerance threshold
    if (toleranceThreshold !== null && exceeds(currentValue, toleranceThreshold)) {
        result.isBreach = true;
        result.breachType = 'SOFT';
        result.severity = 'MEDIUM';
        result.thresholdValue = toleranceThreshold;
        result.varianceAmount = Math.abs(currentValue - toleranceThreshold);
        result.variancePercentage = toleranceThreshold !== 0 ? (result.varianceAmount / Math.abs(toleranceThreshold)) * 100 : 0;
        return result;
    }

    return result;
}

/**
 * Check a KRI data entry for breaches against its linked tolerance
 */
export async function checkKRIForBreach(
    kriId: string,
    currentValue: number,
    kriDataEntryId?: string
): Promise<{ data: BreachDetectionResult | null; breachId: string | null; error: Error | null }> {
    try {
        // Get KRI with linked tolerance and limits
        const { data: kri, error: kriError } = await supabase
            .from('kri_definitions')
            .select(`
        *,
        tolerance:appetite_kri_thresholds!kri_id (
          id,
          organization_id,
          amber_max,
          red_min,
          metric_type,
          limits:risk_limits (
            id,
            soft_limit,
            hard_limit,
            limit_direction
          )
        )
      `)
            .eq('id', kriId)
            .single();

        if (kriError || !kri) {
            // KRI not linked to tolerance - check using KRI's own thresholds
            const { data: standaloneKRI } = await supabase
                .from('kri_definitions')
                .select('*')
                .eq('id', kriId)
                .single();

            if (!standaloneKRI) {
                return { data: null, breachId: null, error: new Error('KRI not found') };
            }

            // Use KRI thresholds for detection
            const result = detectBreach(
                currentValue,
                standaloneKRI.threshold_yellow_upper,
                null,
                standaloneKRI.threshold_red_upper,
                'UPPER'
            );

            return { data: result, breachId: null, error: null };
        }

        const tolerance = kri.tolerance?.[0];
        if (!tolerance) {
            // No tolerance linked - use KRI thresholds only
            const result = detectBreach(
                currentValue,
                kri.threshold_yellow_upper,
                null,
                kri.threshold_red_upper,
                'UPPER'
            );
            return { data: result, breachId: null, error: null };
        }

        const limits = tolerance.limits?.[0];
        const direction = limits?.limit_direction || 'UPPER';

        const result = detectBreach(
            currentValue,
            tolerance.amber_max,
            limits?.soft_limit,
            limits?.hard_limit,
            direction
        );

        // If breach detected, create breach record
        if (result.isBreach) {
            const { data: breach, error: breachError } = await createBreachRecord({
                organizationId: tolerance.organization_id,
                toleranceId: tolerance.id,
                limitId: limits?.id,
                kriDataEntryId,
                breachType: result.breachType!,
                breachValue: result.breachValue,
                thresholdValue: result.thresholdValue,
                varianceAmount: result.varianceAmount,
                variancePercentage: result.variancePercentage,
                severity: result.severity,
                isToleranceBreach: !limits,
                isLimitBreach: !!limits,
            });

            if (breachError) {
                console.error('Error creating breach record:', breachError);
            }

            return { data: result, breachId: breach?.id || null, error: null };
        }

        return { data: result, breachId: null, error: null };
    } catch (err) {
        console.error('Error checking KRI for breach:', err);
        return {
            data: null,
            breachId: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// BREACH RECORD MANAGEMENT
// ============================================================================

/**
 * Create a new breach record
 */
export async function createBreachRecord(
    data: CreateBreachData
): Promise<{ data: { id: string } | null; error: Error | null }> {
    try {
        const { data: breach, error } = await supabase
            .from('risk_breaches')
            .insert([{
                organization_id: data.organizationId,
                tolerance_id: data.toleranceId,
                limit_id: data.limitId,
                kri_data_entry_id: data.kriDataEntryId,
                breach_type: data.breachType,
                breach_value: data.breachValue,
                threshold_value: data.thresholdValue,
                variance_amount: data.varianceAmount || Math.abs(data.breachValue - data.thresholdValue),
                variance_percentage: data.variancePercentage,
                severity: data.severity || 'MEDIUM',
                is_tolerance_breach: data.isToleranceBreach || false,
                is_limit_breach: data.isLimitBreach || false,
                status: 'OPEN',
            }])
            .select('id')
            .single();

        if (error) {
            console.error('Error creating breach record:', error);
            return { data: null, error: new Error(error.message) };
        }

        console.log(`🚨 Breach record created: ${breach.id} (${data.breachType})`);

        // Trigger escalation for HARD breaches
        if (data.breachType === 'HARD' || data.breachType === 'CRITICAL') {
            await triggerBreachEscalation(breach.id, data.breachType);
        }

        return { data: breach, error: null };
    } catch (err) {
        console.error('Unexpected error creating breach:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Get all active breaches for an organization
 */
export async function getActiveBreaches(
    organizationId: string
): Promise<{ data: BreachRecord[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('risk_breaches')
            .select(`
        *,
        tolerance:tolerance_id (
          metric_name,
          metric_type,
          appetite_category:appetite_category_id (
            risk_category,
            appetite_level
          )
        )
      `)
            .eq('organization_id', organizationId)
            .not('status', 'in', '("RESOLVED","CLOSED")')
            .order('breach_date', { ascending: false });

        if (error) {
            console.error('Error fetching active breaches:', error);
            return { data: null, error: new Error(error.message) };
        }

        return { data: data as unknown as BreachRecord[], error: null };
    } catch (err) {
        console.error('Unexpected error fetching breaches:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Acknowledge a breach
 */
export async function acknowledgeBreach(
    breachId: string,
    notes?: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('risk_breaches')
            .update({
                status: 'ACKNOWLEDGED',
                acknowledged_by: user?.id,
                acknowledged_at: new Date().toISOString(),
                acknowledged_notes: notes,
            })
            .eq('id', breachId);

        if (error) {
            return { success: false, error: new Error(error.message) };
        }

        console.log(`✅ Breach ${breachId} acknowledged`);
        return { success: true, error: null };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Resolve a breach
 */
export async function resolveBreach(
    breachId: string,
    resolutionNotes: string,
    resolutionActions?: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('risk_breaches')
            .update({
                status: 'RESOLVED',
                resolved_by: user?.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: resolutionNotes,
                resolution_actions: resolutionActions,
            })
            .eq('id', breachId);

        if (error) {
            return { success: false, error: new Error(error.message) };
        }

        console.log(`✅ Breach ${breachId} resolved`);
        return { success: true, error: null };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// ESCALATION WORKFLOW
// ============================================================================

/**
 * Trigger breach escalation workflow
 */
async function triggerBreachEscalation(
    breachId: string,
    breachType: BreachType
): Promise<void> {
    try {
        const updates: Record<string, unknown> = {};

        if (breachType === 'HARD' || breachType === 'CRITICAL') {
            updates.escalated_to_cro = true;
            updates.escalated_to_cro_at = new Date().toISOString();
            console.log(`📢 Breach ${breachId} escalated to CRO`);
        }

        if (breachType === 'CRITICAL') {
            updates.escalated_to_board = true;
            updates.escalated_to_board_at = new Date().toISOString();
            console.log(`📢📢 Breach ${breachId} escalated to BOARD`);
        }

        if (Object.keys(updates).length > 0) {
            await supabase
                .from('risk_breaches')
                .update(updates)
                .eq('id', breachId);
        }
    } catch (err) {
        console.error('Error triggering escalation:', err);
    }
}

// ============================================================================
// KRI THRESHOLD TIGHTENING
// ============================================================================

/**
 * Tighten KRI thresholds by a percentage after a breach
 * Default is 20% tightening as per RAF implementation plan
 */
export async function tightenKRIThresholds(
    kriId: string,
    breachId: string,
    tighteningPercent: number = 0.2
): Promise<{ success: boolean; error: Error | null }> {
    try {
        // Get current KRI thresholds
        const { data: kri, error: kriError } = await supabase
            .from('kri_definitions')
            .select('*')
            .eq('id', kriId)
            .single();

        if (kriError || !kri) {
            return { success: false, error: new Error(kriError?.message || 'KRI not found') };
        }

        // Calculate tightened thresholds
        const factor = 1 - tighteningPercent;
        const newUpperYellow = kri.threshold_yellow_upper
            ? kri.threshold_yellow_upper * factor
            : null;
        const newUpperRed = kri.threshold_red_upper
            ? kri.threshold_red_upper * factor
            : null;

        // Update KRI thresholds
        const { error: updateError } = await supabase
            .from('kri_definitions')
            .update({
                threshold_yellow_upper: newUpperYellow,
                threshold_red_upper: newUpperRed,
            })
            .eq('id', kriId);

        if (updateError) {
            return { success: false, error: new Error(updateError.message) };
        }

        // Mark breach as having tightened thresholds
        await supabase
            .from('risk_breaches')
            .update({
                kri_threshold_tightened: true,
                kri_threshold_tightened_by_percent: tighteningPercent * 100,
            })
            .eq('id', breachId);

        console.log(`🔧 Tightened KRI ${kriId} thresholds by ${tighteningPercent * 100}% due to breach ${breachId}`);
        return { success: true, error: null };
    } catch (err) {
        console.error('Error tightening KRI thresholds:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Reset KRI thresholds after breach remediation (requires CRO approval)
 */
export async function resetKRIThresholds(
    kriId: string,
    toleranceId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        // Re-sync with tolerance thresholds
        const { data: tolerance, error: tolError } = await supabase
            .from('appetite_kri_thresholds')
            .select('amber_max, red_min')
            .eq('id', toleranceId)
            .single();

        if (tolError || !tolerance) {
            return { success: false, error: new Error(tolError?.message || 'Tolerance not found') };
        }

        const { error: updateError } = await supabase
            .from('kri_definitions')
            .update({
                threshold_yellow_upper: tolerance.amber_max,
                threshold_red_upper: tolerance.red_min,
            })
            .eq('id', kriId);

        if (updateError) {
            return { success: false, error: new Error(updateError.message) };
        }

        console.log(`🔄 Reset KRI ${kriId} thresholds to original tolerance values`);
        return { success: true, error: null };
    } catch (err) {
        console.error('Error resetting KRI thresholds:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

// ============================================================================
// BREACH STATISTICS
// ============================================================================

/**
 * Get breach statistics for an organization
 */
export async function getBreachStatistics(
    organizationId: string
): Promise<{
    total: number;
    open: number;
    byType: Record<BreachType, number>;
    bySeverity: Record<BreachSeverity, number>;
    avgResolutionDays: number;
}> {
    const stats = {
        total: 0,
        open: 0,
        byType: { SOFT: 0, HARD: 0, CRITICAL: 0 },
        bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        avgResolutionDays: 0,
    };

    try {
        const { data: breaches } = await supabase
            .from('risk_breaches')
            .select('breach_type, severity, status, breach_date, resolved_at')
            .eq('organization_id', organizationId);

        if (!breaches) return stats;

        stats.total = breaches.length;

        let totalResolutionDays = 0;
        let resolvedCount = 0;

        for (const breach of breaches) {
            // Count by type
            if (breach.breach_type in stats.byType) {
                stats.byType[breach.breach_type as BreachType]++;
            }

            // Count by severity
            if (breach.severity in stats.bySeverity) {
                stats.bySeverity[breach.severity as BreachSeverity]++;
            }

            // Count open
            if (!['RESOLVED', 'CLOSED'].includes(breach.status)) {
                stats.open++;
            }

            // Calculate resolution time
            if (breach.resolved_at) {
                const breachDate = new Date(breach.breach_date);
                const resolvedDate = new Date(breach.resolved_at);
                const days = (resolvedDate.getTime() - breachDate.getTime()) / (1000 * 60 * 60 * 24);
                totalResolutionDays += days;
                resolvedCount++;
            }
        }

        stats.avgResolutionDays = resolvedCount > 0
            ? Math.round(totalResolutionDays / resolvedCount * 10) / 10
            : 0;

    } catch (err) {
        console.error('Error getting breach statistics:', err);
    }

    return stats;
}
