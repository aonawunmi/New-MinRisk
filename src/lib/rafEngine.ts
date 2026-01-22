/**
 * Risk Appetite Framework (RAF) Engine - Layer A (Governance-Grade)
 * 
 * Core calculation engine for:
 * - Tolerance-based out-of-appetite detection (no hardcoded thresholds)
 * - Direction-aware breach detection (UP/DOWN)
 * - Breach rule evaluation (POINT_IN_TIME, SUSTAINED, N_BREACHES)
 * - ZERO appetite + materiality evaluation
 * - Residual score calculation using DIME control effectiveness
 * 
 * Precedence order:
 * HARD_LIMIT_BREACH > ZERO_APPETITE_MATERIAL > SOFT_LIMIT_ESCALATION > DATA_MISSING > SOFT_BREACH_PENDING
 * 
 * @module rafEngine
 */

import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export type AppetiteLevel = 'ZERO' | 'LOW' | 'MODERATE' | 'HIGH';
export type ScoreBasis = 'inherent' | 'residual' | 'forward_view';
export type BreachDirection = 'UP' | 'DOWN';
export type BreachRule = 'POINT_IN_TIME' | 'SUSTAINED_N_PERIODS' | 'N_BREACHES_IN_WINDOW';
export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
export type MaterialityRuleType = 'amount' | 'percentage' | 'count' | 'score_band';
export type AggregationScope = 'risk' | 'category' | 'org';
export type Severity = 'INFO' | 'WARN' | 'CRITICAL';

export type OutOfAppetiteReason =
    | 'HARD_LIMIT_BREACH'
    | 'ZERO_APPETITE_MATERIAL'
    | 'SOFT_LIMIT_ESCALATION'
    | 'DATA_MISSING_FOR_TOLERANCE'
    | 'SOFT_BREACH_PENDING_ESCALATION'
    | 'WITHIN_APPETITE';

export interface MaterialityRule {
    rule_type: MaterialityRuleType;
    threshold: number;
    comparison: ComparisonOperator;
    basis?: 'capital' | 'revenue' | 'exposure' | 'events';
    aggregation_scope: AggregationScope;
    measurement_window_days: number;
    description: string;
}

export interface BreachRuleConfig {
    periods?: number;        // for SUSTAINED_N_PERIODS
    count?: number;          // for N_BREACHES_IN_WINDOW
    window_days?: number;    // for N_BREACHES_IN_WINDOW
}

export interface ToleranceMetric {
    id: string;
    metric_id: string;
    metric_name: string;
    soft_limit: number | null;
    hard_limit: number | null;
    breach_direction: BreachDirection;
    comparison_operator: ComparisonOperator;
    breach_rule: BreachRule;
    breach_rule_config: BreachRuleConfig;
    measurement_window_days: number;
    escalation_severity_on_soft_breach: Severity;
    current_value?: number | null;
    last_measurement_date?: string | null;
}

export interface ToleranceStatus {
    tolerance_id: string;
    metric_name: string;
    is_soft_breached: boolean;
    is_hard_breached: boolean;
    is_data_missing: boolean;
    breach_rule_met: boolean;
    periods_remaining?: number;
    breach_count_in_window?: number;
    current_value: number | null;
    severity: Severity;
}

export interface ToleranceReference {
    tolerance_id: string;
    metric_name: string;
}

export interface OutOfAppetiteResult {
    outOfAppetite: boolean;
    escalationRequired: boolean;
    severity: Severity;
    reason_code: OutOfAppetiteReason;
    impacted_tolerances: ToleranceReference[];
    evidence: Record<string, unknown>;
}

export interface RAFScoreResult {
    inherent_score: number;
    residual_score: number;
    raf_adjusted_score: number;
    score_basis: ScoreBasis;
    multiplier: number;
    appetiteLevel: AppetiteLevel;
    control_effectiveness: number;
    appetite_status: OutOfAppetiteResult;
    explanation: string;
}

export interface AppetiteCategory {
    id: string;
    appetite_level: AppetiteLevel;
    risk_category: string;
    materiality_rule?: MaterialityRule | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRECEDENCE_ORDER: OutOfAppetiteReason[] = [
    'HARD_LIMIT_BREACH',
    'ZERO_APPETITE_MATERIAL',
    'SOFT_LIMIT_ESCALATION',
    'DATA_MISSING_FOR_TOLERANCE',
    'SOFT_BREACH_PENDING_ESCALATION',
    'WITHIN_APPETITE'
];

const DEFAULT_MEASUREMENT_WINDOW_DAYS = 90;

// ============================================================================
// TOLERANCE EVALUATION (Per Tolerance)
// ============================================================================

/**
 * Evaluate a single tolerance metric status
 * Returns the complete state for aggregation
 */
export function evaluateToleranceStatus(
    tolerance: ToleranceMetric,
    currentDate: Date = new Date()
): ToleranceStatus {
    const currentValue = tolerance.current_value;
    const measurementDate = tolerance.last_measurement_date;

    // Check for missing/stale data
    const isDataMissing = checkDataMissing(
        currentValue,
        measurementDate,
        tolerance.measurement_window_days,
        currentDate
    );

    if (isDataMissing) {
        return {
            tolerance_id: tolerance.id,
            metric_name: tolerance.metric_name,
            is_soft_breached: false,
            is_hard_breached: false,
            is_data_missing: true,
            breach_rule_met: false,
            current_value: currentValue ?? null,
            severity: 'WARN'
        };
    }

    // Direction-aware breach detection
    const is_hard_breached = isBreached(
        currentValue!,
        tolerance.hard_limit,
        tolerance.breach_direction,
        tolerance.comparison_operator
    );

    const is_soft_breached = isBreached(
        currentValue!,
        tolerance.soft_limit,
        tolerance.breach_direction,
        tolerance.comparison_operator
    );

    // Evaluate breach rule
    const breachRuleResult = evaluateBreachRule(tolerance);

    return {
        tolerance_id: tolerance.id,
        metric_name: tolerance.metric_name,
        is_soft_breached,
        is_hard_breached,
        is_data_missing: false,
        breach_rule_met: breachRuleResult.rule_met,
        periods_remaining: breachRuleResult.periods_remaining,
        breach_count_in_window: breachRuleResult.breach_count,
        current_value: currentValue!,
        severity: is_hard_breached ? 'CRITICAL' : tolerance.escalation_severity_on_soft_breach
    };
}

/**
 * Check if data is missing or stale
 */
function checkDataMissing(
    currentValue: number | null | undefined,
    measurementDate: string | null | undefined,
    windowDays: number,
    currentDate: Date
): boolean {
    if (currentValue === null || currentValue === undefined) {
        return true;
    }

    if (!measurementDate) {
        return true;
    }

    const measureDate = new Date(measurementDate);
    const cutoff = new Date(currentDate);
    cutoff.setDate(cutoff.getDate() - windowDays);

    return measureDate < cutoff;
}

/**
 * Direction-aware breach detection
 */
function isBreached(
    currentValue: number,
    limit: number | null,
    direction: BreachDirection,
    operator: ComparisonOperator = 'gte'
): boolean {
    if (limit === null) {
        return false;
    }

    if (direction === 'UP') {
        // Higher is worse (e.g., complaints, downtime)
        switch (operator) {
            case 'gt': return currentValue > limit;
            case 'gte': return currentValue >= limit;
            default: return currentValue >= limit;
        }
    } else {
        // Lower is worse (e.g., LCR, capital ratio)
        switch (operator) {
            case 'lt': return currentValue < limit;
            case 'lte': return currentValue <= limit;
            default: return currentValue <= limit;
        }
    }
}

/**
 * Evaluate breach rule (POINT_IN_TIME, SUSTAINED, N_BREACHES)
 * Uses database functions for historical queries
 */
async function evaluateBreachRuleAsync(tolerance: ToleranceMetric): Promise<{
    rule_met: boolean;
    periods_remaining?: number;
    breach_count?: number;
}> {
    switch (tolerance.breach_rule) {
        case 'POINT_IN_TIME':
            return { rule_met: true };

        case 'SUSTAINED_N_PERIODS': {
            const periodsRequired = tolerance.breach_rule_config?.periods || 3;

            // Query consecutive breach periods from DB
            const { data, error } = await supabase.rpc(
                'count_consecutive_breach_periods',
                {
                    p_tolerance_id: tolerance.id,
                    p_breach_type: 'SOFT'
                }
            );

            const consecutivePeriods = error ? 0 : (data || 0);
            const rule_met = consecutivePeriods >= periodsRequired;

            return {
                rule_met,
                periods_remaining: rule_met ? 0 : (periodsRequired - consecutivePeriods)
            };
        }

        case 'N_BREACHES_IN_WINDOW': {
            const countRequired = tolerance.breach_rule_config?.count || 2;
            const windowDays = tolerance.breach_rule_config?.window_days || 90;

            // Query breach count in window from DB
            const { data, error } = await supabase.rpc(
                'count_breaches_in_window',
                {
                    p_tolerance_id: tolerance.id,
                    p_window_days: windowDays,
                    p_breach_type: 'SOFT'
                }
            );

            const breachCount = error ? 0 : (data || 0);
            const rule_met = breachCount >= countRequired;

            return {
                rule_met,
                breach_count: breachCount
            };
        }

        default:
            return { rule_met: true };
    }
}

/**
 * Synchronous version for backward compatibility
 * Falls back to POINT_IN_TIME behavior
 */
function evaluateBreachRule(tolerance: ToleranceMetric): {
    rule_met: boolean;
    periods_remaining?: number;
    breach_count?: number;
} {
    // For synchronous contexts, only POINT_IN_TIME is deterministic
    if (tolerance.breach_rule === 'POINT_IN_TIME') {
        return { rule_met: true };
    }

    // For other rules, return "not yet met" - caller should use async version
    const periodsRequired = tolerance.breach_rule_config?.periods || 3;
    const countRequired = tolerance.breach_rule_config?.count || 2;

    return {
        rule_met: false,
        periods_remaining: tolerance.breach_rule === 'SUSTAINED_N_PERIODS' ? periodsRequired : undefined,
        breach_count: tolerance.breach_rule === 'N_BREACHES_IN_WINDOW' ? 0 : undefined
    };
}

// ============================================================================
// AGGREGATION (Risk Level)
// ============================================================================

/**
 * Aggregate tolerance statuses into risk-level out-of-appetite decision
 * Respects precedence order
 */
export function aggregateToleranceStatuses(
    statuses: ToleranceStatus[],
    category: AppetiteCategory,
    riskMateriality?: { isMaterial: boolean; explanation: string }
): OutOfAppetiteResult {

    // Rule 1: Check for hard limit breaches (highest precedence after ZERO)
    const hardBreaches = statuses.filter(s => s.is_hard_breached);

    // Rule 2: Check for ZERO appetite + material exposure
    if (category.appetite_level === 'ZERO' && riskMateriality?.isMaterial) {
        // But hard breach takes precedence if present
        if (hardBreaches.length > 0) {
            return {
                outOfAppetite: true,
                escalationRequired: true,
                severity: 'CRITICAL',
                reason_code: 'HARD_LIMIT_BREACH',
                impacted_tolerances: hardBreaches.map(s => ({
                    tolerance_id: s.tolerance_id,
                    metric_name: s.metric_name
                })),
                evidence: {
                    breached_limits: hardBreaches.map(s => s.metric_name),
                    also_zero_appetite_material: true
                }
            };
        }

        return {
            outOfAppetite: true,
            escalationRequired: true,
            severity: 'CRITICAL',
            reason_code: 'ZERO_APPETITE_MATERIAL',
            impacted_tolerances: [],
            evidence: { materiality: riskMateriality }
        };
    }

    // Rule 3: Hard limit breach
    if (hardBreaches.length > 0) {
        return {
            outOfAppetite: true,
            escalationRequired: true,
            severity: 'CRITICAL',
            reason_code: 'HARD_LIMIT_BREACH',
            impacted_tolerances: hardBreaches.map(s => ({
                tolerance_id: s.tolerance_id,
                metric_name: s.metric_name
            })),
            evidence: { breached_limits: hardBreaches.map(s => s.metric_name) }
        };
    }

    // Rule 4: Soft limit + escalation rule met
    const softEscalations = statuses.filter(s =>
        s.is_soft_breached && s.breach_rule_met
    );
    if (softEscalations.length > 0) {
        const maxSeverity = softEscalations.reduce((max, s) =>
            severityToNumber(s.severity) > severityToNumber(max) ? s.severity : max,
            'WARN' as Severity
        );

        return {
            outOfAppetite: true,
            escalationRequired: true,
            severity: maxSeverity,
            reason_code: 'SOFT_LIMIT_ESCALATION',
            impacted_tolerances: softEscalations.map(s => ({
                tolerance_id: s.tolerance_id,
                metric_name: s.metric_name
            })),
            evidence: { breach_rule: 'ESCALATION_TRIGGERED' }
        };
    }

    // Rule 5: Missing data (lower precedence than actual breaches)
    const missingData = statuses.filter(s => s.is_data_missing);
    if (missingData.length > 0) {
        return {
            outOfAppetite: false,
            escalationRequired: true,
            severity: 'WARN',
            reason_code: 'DATA_MISSING_FOR_TOLERANCE',
            impacted_tolerances: missingData.map(s => ({
                tolerance_id: s.tolerance_id,
                metric_name: s.metric_name
            })),
            evidence: { missing_count: missingData.length }
        };
    }

    // Rule 6: Soft breach pending escalation
    const softPending = statuses.filter(s =>
        s.is_soft_breached && !s.breach_rule_met
    );
    if (softPending.length > 0) {
        return {
            outOfAppetite: false,
            escalationRequired: false,
            severity: 'INFO',
            reason_code: 'SOFT_BREACH_PENDING_ESCALATION',
            impacted_tolerances: softPending.map(s => ({
                tolerance_id: s.tolerance_id,
                metric_name: s.metric_name
            })),
            evidence: {
                pending_count: softPending.length,
                periods_remaining: softPending[0]?.periods_remaining
            }
        };
    }

    // Rule 7: Within appetite
    return {
        outOfAppetite: false,
        escalationRequired: false,
        severity: 'INFO',
        reason_code: 'WITHIN_APPETITE',
        impacted_tolerances: [],
        evidence: {}
    };
}

function severityToNumber(severity: Severity): number {
    switch (severity) {
        case 'CRITICAL': return 3;
        case 'WARN': return 2;
        case 'INFO': return 1;
        default: return 0;
    }
}

// ============================================================================
// MATERIALITY EVALUATION
// ============================================================================

/**
 * Evaluate materiality for ZERO appetite risks
 */
export async function evaluateMateriality(
    riskId: string,
    organizationId: string,
    rule: MaterialityRule
): Promise<{ isMaterial: boolean; explanation: string; value?: number }> {

    // Calculate measurement window
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - rule.measurement_window_days);

    switch (rule.rule_type) {
        case 'count':
            return evaluateCountMateriality(riskId, organizationId, rule, windowStart);

        case 'amount':
            return evaluateAmountMateriality(riskId, organizationId, rule);

        case 'percentage':
            return evaluatePercentageMateriality(riskId, organizationId, rule);

        case 'score_band':
            return evaluateScoreBandMateriality(riskId, rule);

        default:
            return { isMaterial: false, explanation: 'Unknown materiality rule type' };
    }
}

async function evaluateCountMateriality(
    riskId: string,
    organizationId: string,
    rule: MaterialityRule,
    windowStart: Date
): Promise<{ isMaterial: boolean; explanation: string; value?: number }> {
    // Count incidents/events based on aggregation scope
    let query = supabase
        .from('incidents')
        .select('id', { count: 'exact' })
        .gte('occurrence_date', windowStart.toISOString());

    if (rule.aggregation_scope === 'risk') {
        query = query.contains('linked_risk_ids', [riskId]);
    } else if (rule.aggregation_scope === 'org') {
        query = query.eq('organization_id', organizationId);
    }

    const { count, error } = await query;

    if (error) {
        console.error('Error evaluating count materiality:', error);
        return { isMaterial: false, explanation: 'Error querying incidents' };
    }

    const eventCount = count || 0;
    const isMaterial = compareValues(eventCount, rule.threshold, rule.comparison);

    return {
        isMaterial,
        explanation: `Event count (${eventCount}) ${rule.comparison} ${rule.threshold}`,
        value: eventCount
    };
}

async function evaluateAmountMateriality(
    riskId: string,
    organizationId: string,
    rule: MaterialityRule
): Promise<{ isMaterial: boolean; explanation: string; value?: number }> {
    // Get exposure amount - implementation depends on data model
    // Placeholder - would query financial impact or exposure field
    return {
        isMaterial: false,
        explanation: 'Amount materiality not yet implemented',
        value: 0
    };
}

async function evaluatePercentageMateriality(
    riskId: string,
    organizationId: string,
    rule: MaterialityRule
): Promise<{ isMaterial: boolean; explanation: string; value?: number }> {
    // Get percentage of capital/revenue - requires organization financials
    // Placeholder
    return {
        isMaterial: false,
        explanation: 'Percentage materiality not yet implemented',
        value: 0
    };
}

async function evaluateScoreBandMateriality(
    riskId: string,
    rule: MaterialityRule
): Promise<{ isMaterial: boolean; explanation: string; value?: number }> {
    const { data: risk, error } = await supabase
        .from('risks')
        .select('residual_score')
        .eq('id', riskId)
        .single();

    if (error || !risk) {
        return { isMaterial: false, explanation: 'Could not fetch risk score' };
    }

    const score = risk.residual_score || 0;
    const isMaterial = compareValues(score, rule.threshold, rule.comparison);

    return {
        isMaterial,
        explanation: `Residual score (${score}) ${rule.comparison} ${rule.threshold}`,
        value: score
    };
}

function compareValues(value: number, threshold: number, operator: ComparisonOperator): boolean {
    switch (operator) {
        case 'gt': return value > threshold;
        case 'gte': return value >= threshold;
        case 'lt': return value < threshold;
        case 'lte': return value <= threshold;
        case 'eq': return value === threshold;
        default: return false;
    }
}

// ============================================================================
// RESIDUAL SCORE CALCULATION (Using DIME)
// ============================================================================

/**
 * Calculate residual score using control effectiveness (DIME)
 */
export async function calculateResidualScore(
    riskId: string
): Promise<{
    inherent_score: number;
    residual_score: number;
    control_effectiveness: number;
    mapping_method: string;
}> {
    // Get risk with controls
    const { data: risk, error: riskError } = await supabase
        .from('risks')
        .select(`
      likelihood_inherent,
      impact_inherent,
      controls (
        id,
        design_score,
        implementation_score,
        monitoring_score,
        evaluation_score
      )
    `)
        .eq('id', riskId)
        .single();

    if (riskError || !risk) {
        return {
            inherent_score: 0,
            residual_score: 0,
            control_effectiveness: 0,
            mapping_method: 'ERROR'
        };
    }

    const inherent_score = (risk.likelihood_inherent || 1) * (risk.impact_inherent || 1);
    const controls = risk.controls || [];

    if (controls.length === 0) {
        return {
            inherent_score,
            residual_score: inherent_score,
            control_effectiveness: 0,
            mapping_method: 'DIME_v1'
        };
    }

    // Calculate aggregate DIME effectiveness
    let totalDIME = 0;
    for (const control of controls) {
        const d = control.design_score || 0;
        const i = control.implementation_score || 0;
        const m = control.monitoring_score || 0;
        const e = control.evaluation_score || 0;

        // DIME average per control (0-3 scale)
        const controlDIME = (d + i + m + e) / 4;
        totalDIME += controlDIME;
    }

    // Average effectiveness across all controls (0-3 scale)
    const avgDIME = totalDIME / controls.length;

    // Convert to percentage (max score is 3)
    // 3.0 -> 100% effectiveness
    // 0.0 -> 0% effectiveness
    const effectiveness = Math.min(100, Math.max(0, (avgDIME / 3) * 100));

    // Residual Risk = Inherent Risk * (1 - Effectiveness)
    const residual_score = inherent_score * (1 - (effectiveness / 100));

    return {
        inherent_score,
        residual_score: Math.round(residual_score * 100) / 100,
        control_effectiveness: Math.round(effectiveness * 100) / 100,
        mapping_method: 'DIME_v1'
    };
}

// ============================================================================
// FULL RAF SCORE CALCULATION
// ============================================================================

/**
 * Calculate complete RAF score for a risk
 */
export async function calculateRiskRAFScore(
    riskId: string,
    scoreBasis: ScoreBasis = 'residual'
): Promise<{ data: RAFScoreResult | null; error: Error | null }> {
    try {
        // Get risk with appetite category
        const { data: risk, error: riskError } = await supabase
            .from('risks')
            .select(`
        id,
        organization_id,
        likelihood_inherent,
        impact_inherent,
        appetite_category:appetite_category_id (
          id,
          appetite_level,
          risk_category
        )
      `)
            .eq('id', riskId)
            .single();

        if (riskError || !risk) {
            return { data: null, error: new Error(riskError?.message || 'Risk not found') };
        }

        // Calculate scores
        const scores = await calculateResidualScore(riskId);
        const baseScore = scoreBasis === 'inherent' ? scores.inherent_score : scores.residual_score;

        // Get appetite category (handle both array and object from Supabase)
        const appetiteCat = Array.isArray(risk.appetite_category)
            ? risk.appetite_category[0]
            : risk.appetite_category;

        const category: AppetiteCategory = {
            id: appetiteCat?.id || '',
            appetite_level: (appetiteCat?.appetite_level as AppetiteLevel) || 'MODERATE',
            risk_category: appetiteCat?.risk_category || 'Uncategorized',
            materiality_rule: null // Would load from category config
        };

        // Get linked tolerances
        const tolerances = await getLinkedTolerances(riskId, category.id);

        // Evaluate each tolerance
        const toleranceStatuses = tolerances.map(t => evaluateToleranceStatus(t));

        // Evaluate materiality if ZERO appetite
        let materialityResult: { isMaterial: boolean; explanation: string } | undefined;
        if (category.appetite_level === 'ZERO' && category.materiality_rule) {
            materialityResult = await evaluateMateriality(
                riskId,
                risk.organization_id,
                category.materiality_rule
            );
        }

        // Aggregate to risk-level decision
        const appetiteStatus = aggregateToleranceStatuses(
            toleranceStatuses,
            category,
            materialityResult
        );

        // Apply multiplier (informational only - real decision is tolerance-based)
        const multiplier = getAppetiteMultiplier(category.appetite_level);
        const raf_adjusted_score = baseScore * multiplier;

        return {
            data: {
                inherent_score: scores.inherent_score,
                residual_score: scores.residual_score,
                raf_adjusted_score: Math.round(raf_adjusted_score * 100) / 100,
                score_basis: scoreBasis,
                multiplier,
                appetiteLevel: category.appetite_level,
                control_effectiveness: scores.control_effectiveness,
                appetite_status: appetiteStatus,
                explanation: generateExplanation(category.appetite_level, appetiteStatus)
            },
            error: null
        };
    } catch (err) {
        console.error('Error calculating RAF score:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error')
        };
    }
}

function getAppetiteMultiplier(level: AppetiteLevel): number {
    // Multipliers are informational - real decisions are tolerance-based
    switch (level) {
        case 'ZERO': return 2.0;
        case 'LOW': return 1.5;
        case 'MODERATE': return 1.0;
        case 'HIGH': return 0.8;
        default: return 1.0;
    }
}

function generateExplanation(level: AppetiteLevel, status: OutOfAppetiteResult): string {
    if (status.outOfAppetite) {
        return `OUT OF APPETITE: ${status.reason_code} - ${status.impacted_tolerances.map(t => t.metric_name).join(', ')}`;
    }
    if (status.escalationRequired) {
        return `ATTENTION REQUIRED: ${status.reason_code} - escalation to 2nd line recommended`;
    }
    return `Within appetite (${level})`;
}

// ============================================================================
// TOLERANCE LINKING
// ============================================================================

/**
 * Get linked tolerances with precedence:
 * 1. Risk-specific tolerances
 * 2. Category defaults (not overridden)
 */
async function getLinkedTolerances(
    riskId: string,
    categoryId: string
): Promise<ToleranceMetric[]> {
    // This is a placeholder - actual implementation depends on DB schema
    // In production, this would query:
    // 1. risk_tolerance_links (risk-specific)
    // 2. appetite_kri_thresholds (category defaults)
    // With proper deduplication by metric_id

    try {
        // Get category tolerances as defaults
        const { data: categoryTolerances, error } = await supabase
            .from('appetite_kri_thresholds')
            .select(`
        id,
        metric_name,
        green_max,
        amber_max,
        red_min,
        kri_id
      `)
            .eq('appetite_category_id', categoryId);

        if (error || !categoryTolerances) {
            return [];
        }

        // Map to ToleranceMetric interface (with defaults for missing fields)
        return categoryTolerances.map(t => ({
            id: t.id,
            metric_id: t.id,
            metric_name: t.metric_name || 'Unknown',
            soft_limit: t.amber_max,
            hard_limit: t.red_min,
            breach_direction: 'UP' as BreachDirection, // Default - would come from config
            comparison_operator: 'gte' as ComparisonOperator,
            breach_rule: 'POINT_IN_TIME' as BreachRule,
            breach_rule_config: {},
            measurement_window_days: DEFAULT_MEASUREMENT_WINDOW_DAYS,
            escalation_severity_on_soft_breach: 'WARN' as Severity,
            current_value: null, // Would need to join with KRI data
            last_measurement_date: null
        }));
    } catch (err) {
        console.error('Error getting linked tolerances:', err);
        return [];
    }
}

// ============================================================================
// UPDATE RISK RAF SCORE
// ============================================================================

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
                raf_adjusted_score: result.raf_adjusted_score,
                appetite_multiplier: result.multiplier,
                out_of_appetite: result.appetite_status.outOfAppetite,
                residual_score: result.residual_score,
                last_residual_calc: new Date().toISOString()
            })
            .eq('id', riskId);

        if (updateError) {
            console.error('Error updating RAF score:', updateError);
            return { success: false, error: new Error(updateError.message) };
        }

        console.log(`✅ Updated RAF score for risk ${riskId}: ${result.raf_adjusted_score} (${result.appetite_status.reason_code})`);
        return { success: true, error: null };
    } catch (err) {
        console.error('Unexpected error updating RAF score:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        };
    }
}

// ============================================================================
// BULK RECALCULATION (DB-Based Distributed Lock)
// ============================================================================

/**
 * Recalculate RAF scores for all risks in an organization
 * Uses DB-based locking via recalc_runs table for distributed safety
 */
export async function recalculateAllRAFScores(
    organizationId: string,
    userId?: string
): Promise<{ updated: number; errors: number; run_id?: string }> {
    let runId: string | undefined;

    try {
        // Acquire distributed lock via DB
        const { data: lockResult, error: lockError } = await supabase.rpc(
            'acquire_recalc_lock',
            {
                p_organization_id: organizationId,
                p_run_type: 'FULL',
                p_user_id: userId || null
            }
        );

        if (lockError || !lockResult?.success) {
            console.log('⏸️ RAF recalculation already in progress or lock failed');
            return {
                updated: 0,
                errors: 0
            };
        }

        runId = lockResult.run_id;
        console.log(`🔒 Acquired recalc lock: ${runId}`);

        // Verify organization ownership
        const { data: orgCheck } = await supabase
            .from('organizations')
            .select('id')
            .eq('id', organizationId)
            .single();

        if (!orgCheck) {
            console.error('Organization not found or access denied');
            await completeRecalcRun(runId, 'FAILED', 0, 0, 0, 'Organization not found');
            return { updated: 0, errors: 1, run_id: runId };
        }

        const { data: risks, error: fetchError } = await supabase
            .from('risks')
            .select('id')
            .eq('organization_id', organizationId);

        if (fetchError || !risks) {
            console.error('Error fetching risks for bulk RAF recalculation:', fetchError);
            await completeRecalcRun(runId, 'FAILED', 0, 0, 0, fetchError?.message || 'Fetch error');
            return { updated: 0, errors: 1, run_id: runId };
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

        // Complete the run successfully
        await completeRecalcRun(runId, 'COMPLETED', risks.length, updated, errors);

        console.log(`📊 Bulk RAF recalculation complete: ${updated} updated, ${errors} errors`);
        return { updated, errors, run_id: runId };

    } catch (err) {
        // Complete the run with failure status
        if (runId) {
            await completeRecalcRun(runId, 'FAILED', 0, 0, 0, String(err));
        }
        console.error('Unexpected error in recalculateAllRAFScores:', err);
        return { updated: 0, errors: 1, run_id: runId };
    }
}

/**
 * Helper to complete a recalc run
 */
async function completeRecalcRun(
    runId: string,
    status: 'COMPLETED' | 'FAILED',
    processed: number,
    updated: number,
    failed: number,
    errorMessage?: string
): Promise<void> {
    try {
        await supabase.rpc('complete_recalc_run', {
            p_run_id: runId,
            p_status: status,
            p_risks_processed: processed,
            p_risks_updated: updated,
            p_risks_failed: failed,
            p_error_message: errorMessage || null
        });
        console.log(`🔓 Released recalc lock: ${runId} (${status})`);
    } catch (err) {
        console.error('Failed to complete recalc run:', err);
    }
}

// ============================================================================
// APPETITE HELPERS
// ============================================================================

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

// ============================================================================
// BACKWARD COMPATIBILITY - LEGACY API
// ============================================================================

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateRiskRAFScore instead
 */
export interface LegacyRAFScoreResult {
    baseScore: number;
    adjustedScore: number;
    multiplier: number;
    appetiteLevel: AppetiteLevel;
    outOfAppetite: boolean;
    explanation: string;
}

export function calculateRAFAdjustedScore(
    baseScore: number,
    appetiteLevel: AppetiteLevel,
    customMultipliers?: Partial<Record<AppetiteLevel, number>>
): LegacyRAFScoreResult {
    const defaultMultipliers = {
        ZERO: 2.0,
        LOW: 1.5,
        MODERATE: 1.0,
        HIGH: 0.8,
    };

    const multipliers = { ...defaultMultipliers, ...customMultipliers };
    const multiplier = multipliers[appetiteLevel] || 1.0;
    const adjustedScore = baseScore * multiplier;

    // Legacy: still uses threshold-based (retained for compatibility)
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

export interface ToleranceKRIMapping {
    toleranceId: string;
    kriTarget: number;
    kriWarning: number;
    kriCritical: number;
    unit: string;
    description: string;
}

/**
 * Legacy function: Generate KRI thresholds from a tolerance metric
 * @deprecated Use tolerance-based evaluation instead
 */
export async function generateKRIFromTolerance(
    toleranceId: string
): Promise<{ data: ToleranceKRIMapping | null; error: Error | null }> {
    try {
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

        const limits = tolerance.limits?.[0];
        const metricType = tolerance.metric_type || 'MAXIMUM';

        // For MAXIMUM metrics (e.g., NPL Ratio ≤ 5%): lower is better
        // For MINIMUM metrics (e.g., LCR ≥ 100%): higher is better
        // For RANGE metrics: must be within bounds

        let kriTarget: number;
        let kriWarning: number;
        let kriCritical: number;

        if (metricType === 'MINIMUM') {
            // For MINIMUM metrics (e.g., LCR must be >= 100%)
            // Target = red_min (what you need to stay above)
            // Warning = when approaching the minimum
            // Critical = below minimum
            kriTarget = tolerance.red_min ?? 100;
            kriWarning = tolerance.amber_max ?? (kriTarget * 1.1); // Slightly above critical
            kriCritical = tolerance.red_min ?? 100;
        } else if (metricType === 'RANGE') {
            // For RANGE metrics
            kriTarget = tolerance.green_max ?? 0;
            kriWarning = limits?.soft_limit ?? tolerance.amber_max ?? kriTarget * 1.2;
            kriCritical = limits?.hard_limit ?? tolerance.red_min ?? kriTarget * 1.5;
        } else {
            // For MAXIMUM metrics (default) - e.g., NPL Ratio <= 5%
            // Target = green_max (ideal upper bound)
            // Warning = amber_max (approaching limit)
            // Critical = red_min (breach)
            kriTarget = tolerance.green_max ?? 0;
            kriWarning = limits?.soft_limit ?? tolerance.amber_max ?? (kriTarget * 1.5);
            kriCritical = limits?.hard_limit ?? tolerance.red_min ?? (kriTarget * 2);
        }

        // Round to 2 decimal places to avoid floating point issues
        const round = (n: number) => Math.round(n * 100) / 100;

        const mapping: ToleranceKRIMapping = {
            toleranceId,
            kriTarget: round(kriTarget),
            kriWarning: round(kriWarning),
            kriCritical: round(kriCritical),
            unit: tolerance.unit || '%',
            description: `Auto-generated from tolerance: ${tolerance.metric_name}. Metric type: ${metricType}. Green: ≤${tolerance.green_max ?? 'N/A'}, Amber: ≤${tolerance.amber_max ?? 'N/A'}, Red: ≥${tolerance.red_min ?? 'N/A'}`,
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
 * Sync KRI with tolerance using atomic DB transaction
 * Uses sync_kri_with_tolerance_atomic RPC for transactional safety
 */
export async function syncKRIWithTolerance(
    kriId: string,
    toleranceId: string,
    userId?: string
): Promise<{ success: boolean; error: Error | null; mapping?: ToleranceKRIMapping }> {
    try {
        // Use atomic RPC for transactional sync
        const { data: result, error: rpcError } = await supabase.rpc(
            'sync_kri_with_tolerance_atomic',
            {
                p_kri_id: kriId,
                p_tolerance_id: toleranceId,
                p_user_id: userId || null
            }
        );

        if (rpcError) {
            console.error('Error in atomic sync RPC:', rpcError);
            return { success: false, error: new Error(rpcError.message) };
        }

        if (!result?.success) {
            return {
                success: false,
                error: new Error(result?.error || 'Unknown error in sync')
            };
        }

        const mapping: ToleranceKRIMapping = {
            toleranceId,
            kriTarget: result.mapping?.kriTarget || 0,
            kriWarning: result.mapping?.kriWarning || 0,
            kriCritical: result.mapping?.kriCritical || 0,
            unit: result.mapping?.unit || 'count',
            description: `Synced via atomic RPC`
        };

        console.log(`✅ Atomically synced KRI ${kriId} with tolerance ${toleranceId}`);
        return { success: true, error: null, mapping };

    } catch (err) {
        console.error('Unexpected error syncing KRI:', err);
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}

/**
 * Legacy function: Check out of appetite
 * @deprecated Use calculateRiskRAFScore's appetite_status instead
 */
export async function checkOutOfAppetite(
    riskId: string
): Promise<{ outOfAppetite: boolean; actions: string[] }> {
    const actions: string[] = [];

    const { data: result, error } = await calculateRiskRAFScore(riskId);

    if (error || !result) {
        return { outOfAppetite: false, actions: ['Error calculating RAF score'] };
    }

    const outOfAppetite = result.appetite_status.outOfAppetite;

    if (outOfAppetite) {
        actions.push(`Risk flagged as OUT OF APPETITE: ${result.appetite_status.reason_code}`);

        if (result.appetiteLevel === 'ZERO' || result.appetiteLevel === 'LOW') {
            actions.push('Mandatory escalation to CRO required');
            actions.push('Monthly control effectiveness reviews enabled');
        }

        if (result.appetiteLevel === 'ZERO') {
            actions.push('Escalate to board risk committee');
        }
    }

    return { outOfAppetite, actions };
}

