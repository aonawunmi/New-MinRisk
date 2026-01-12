/**
 * RAF Engine Unit Tests
 * 
 * 7 Critical Path Tests:
 * 1. ZERO appetite + material count breach
 * 2. Hard limit breach (UP direction)
 * 3. Hard limit breach (DOWN direction, e.g., LCR)
 * 4. Soft breach + ESCALATE rule met
 * 5. Soft breach + SUSTAINED rule not yet met
 * 6. Missing current value (stale data)
 * 7. Hard breach + missing data present (precedence test)
 */

import { describe, it, expect } from 'vitest';
import {
    evaluateToleranceStatus,
    aggregateToleranceStatuses,
    type ToleranceMetric,
    type ToleranceStatus,
    type AppetiteCategory,
} from './rafEngine';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTolerance(overrides: Partial<ToleranceMetric> = {}): ToleranceMetric {
    return {
        id: 'tol-test-1',
        metric_id: 'metric-1',
        metric_name: 'Test Metric',
        soft_limit: 80,
        hard_limit: 100,
        breach_direction: 'UP',
        comparison_operator: 'gte',
        breach_rule: 'POINT_IN_TIME',
        breach_rule_config: {},
        measurement_window_days: 90,
        escalation_severity_on_soft_breach: 'WARN',
        current_value: 50,
        last_measurement_date: new Date().toISOString(),
        ...overrides
    };
}

function createCategory(overrides: Partial<AppetiteCategory> = {}): AppetiteCategory {
    return {
        id: 'cat-test-1',
        appetite_level: 'MODERATE',
        risk_category: 'Test Category',
        materiality_rule: null,
        ...overrides
    };
}

// ============================================================================
// TEST 1: ZERO Appetite + Material Count Breach
// ============================================================================

describe('Test 1: ZERO appetite + material count breach', () => {
    it('should return ZERO_APPETITE_MATERIAL when ZERO appetite and material exposure exists', () => {
        const tolerance = createTolerance({ current_value: 50 }); // Within limits
        const status = evaluateToleranceStatus(tolerance);

        const category = createCategory({
            appetite_level: 'ZERO',
            materiality_rule: {
                rule_type: 'count',
                threshold: 1,
                comparison: 'gte',
                aggregation_scope: 'risk',
                measurement_window_days: 90,
                description: 'Any event'
            }
        });

        const materialityResult = { isMaterial: true, explanation: 'Event count (5) >= 1' };

        const result = aggregateToleranceStatuses([status], category, materialityResult);

        expect(result.outOfAppetite).toBe(true);
        expect(result.reason_code).toBe('ZERO_APPETITE_MATERIAL');
        expect(result.severity).toBe('CRITICAL');
        expect(result.escalationRequired).toBe(true);
    });
});

// ============================================================================
// TEST 2: Hard Limit Breach (UP Direction)
// ============================================================================

describe('Test 2: Hard limit breach (UP direction)', () => {
    it('should return HARD_LIMIT_BREACH when current value exceeds hard limit (higher is worse)', () => {
        const tolerance = createTolerance({
            current_value: 105,  // Exceeds hard limit of 100
            breach_direction: 'UP'
        });

        const status = evaluateToleranceStatus(tolerance);

        expect(status.is_hard_breached).toBe(true);
        expect(status.severity).toBe('CRITICAL');

        const result = aggregateToleranceStatuses([status], createCategory());

        expect(result.outOfAppetite).toBe(true);
        expect(result.reason_code).toBe('HARD_LIMIT_BREACH');
        expect(result.impacted_tolerances.length).toBe(1);
        expect(result.impacted_tolerances[0].metric_name).toBe('Test Metric');
    });
});

// ============================================================================
// TEST 3: Hard Limit Breach (DOWN Direction - e.g., LCR)
// ============================================================================

describe('Test 3: Hard limit breach (DOWN direction, e.g., LCR)', () => {
    it('should return HARD_LIMIT_BREACH when current value falls below hard limit (lower is worse)', () => {
        const tolerance = createTolerance({
            current_value: 95,   // Below hard limit of 100
            hard_limit: 100,     // Minimum required (like LCR 100%)
            breach_direction: 'DOWN',
            comparison_operator: 'lte'
        });

        const status = evaluateToleranceStatus(tolerance);

        expect(status.is_hard_breached).toBe(true);

        const result = aggregateToleranceStatuses([status], createCategory());

        expect(result.outOfAppetite).toBe(true);
        expect(result.reason_code).toBe('HARD_LIMIT_BREACH');
        expect(result.severity).toBe('CRITICAL');
    });
});

// ============================================================================
// TEST 4: Soft Breach + ESCALATE Rule Met
// ============================================================================

describe('Test 4: Soft breach + ESCALATE rule met', () => {
    it('should return SOFT_LIMIT_ESCALATION when soft limit breached and POINT_IN_TIME rule', () => {
        const tolerance = createTolerance({
            current_value: 85,   // Exceeds soft limit of 80, below hard of 100
            breach_rule: 'POINT_IN_TIME'
        });

        const status = evaluateToleranceStatus(tolerance);

        expect(status.is_soft_breached).toBe(true);
        expect(status.is_hard_breached).toBe(false);
        expect(status.breach_rule_met).toBe(true);

        const result = aggregateToleranceStatuses([status], createCategory());

        expect(result.outOfAppetite).toBe(true);
        expect(result.reason_code).toBe('SOFT_LIMIT_ESCALATION');
        expect(result.escalationRequired).toBe(true);
    });
});

// ============================================================================
// TEST 5: Soft Breach + SUSTAINED Rule Not Yet Met
// ============================================================================

describe('Test 5: Soft breach + SUSTAINED rule not yet met', () => {
    it('should return SOFT_BREACH_PENDING_ESCALATION when breached but periods not met', () => {
        const tolerance = createTolerance({
            current_value: 85,   // Exceeds soft limit
            breach_rule: 'SUSTAINED_N_PERIODS',
            breach_rule_config: { periods: 3 }
        });

        const status = evaluateToleranceStatus(tolerance);

        expect(status.is_soft_breached).toBe(true);
        expect(status.breach_rule_met).toBe(false);  // Not sustained long enough
        expect(status.periods_remaining).toBeDefined();

        const result = aggregateToleranceStatuses([status], createCategory());

        expect(result.outOfAppetite).toBe(false);
        expect(result.reason_code).toBe('SOFT_BREACH_PENDING_ESCALATION');
        expect(result.escalationRequired).toBe(false);
        expect(result.severity).toBe('INFO');
    });
});

// ============================================================================
// TEST 6: Missing Current Value (Stale Data)
// ============================================================================

describe('Test 6: Missing current value (stale data)', () => {
    it('should return DATA_MISSING_FOR_TOLERANCE when no current value', () => {
        const tolerance = createTolerance({
            current_value: null
        });

        const status = evaluateToleranceStatus(tolerance);

        expect(status.is_data_missing).toBe(true);
        expect(status.is_soft_breached).toBe(false);
        expect(status.is_hard_breached).toBe(false);

        const result = aggregateToleranceStatuses([status], createCategory());

        expect(result.outOfAppetite).toBe(false);  // Not confirmed out of appetite
        expect(result.escalationRequired).toBe(true);  // But needs attention
        expect(result.reason_code).toBe('DATA_MISSING_FOR_TOLERANCE');
        expect(result.severity).toBe('WARN');
    });

    it('should return DATA_MISSING when measurement date is stale', () => {
        const staleDate = new Date();
        staleDate.setDate(staleDate.getDate() - 100);  // 100 days ago, window is 90

        const tolerance = createTolerance({
            current_value: 50,
            last_measurement_date: staleDate.toISOString()
        });

        const status = evaluateToleranceStatus(tolerance);

        expect(status.is_data_missing).toBe(true);
    });
});

// ============================================================================
// TEST 7: Hard Breach + Missing Data Present (Precedence Test)
// ============================================================================

describe('Test 7: Hard breach + missing data present (precedence)', () => {
    it('should return HARD_LIMIT_BREACH (not DATA_MISSING) when both conditions exist', () => {
        const hardBreachTolerance = createTolerance({
            id: 'tol-1',
            current_value: 110,  // Hard breach
            metric_name: 'Breached Metric'
        });

        const missingDataTolerance = createTolerance({
            id: 'tol-2',
            current_value: null,
            metric_name: 'Missing Data Metric'
        });

        const statuses = [
            evaluateToleranceStatus(hardBreachTolerance),
            evaluateToleranceStatus(missingDataTolerance)
        ];

        const result = aggregateToleranceStatuses(statuses, createCategory());

        // Hard breach takes precedence over missing data
        expect(result.outOfAppetite).toBe(true);
        expect(result.reason_code).toBe('HARD_LIMIT_BREACH');
        expect(result.severity).toBe('CRITICAL');
        expect(result.impacted_tolerances.length).toBe(1);
        expect(result.impacted_tolerances[0].metric_name).toBe('Breached Metric');
    });

    it('should include both hard breach and ZERO appetite material in evidence when both exist', () => {
        const hardBreachTolerance = createTolerance({
            current_value: 110  // Hard breach
        });

        const category = createCategory({
            appetite_level: 'ZERO'
        });

        const materialityResult = { isMaterial: true, explanation: 'Material exposure' };
        const statuses = [evaluateToleranceStatus(hardBreachTolerance)];

        const result = aggregateToleranceStatuses(statuses, category, materialityResult);

        // Hard breach takes precedence, but evidence notes ZERO appetite
        expect(result.reason_code).toBe('HARD_LIMIT_BREACH');
        expect(result.evidence.also_zero_appetite_material).toBe(true);
    });
});

// ============================================================================
// ADDITIONAL EDGE CASES
// ============================================================================

describe('Edge cases', () => {
    it('should handle tolerance with no limits defined', () => {
        const tolerance = createTolerance({
            soft_limit: null,
            hard_limit: null,
            current_value: 100
        });

        const status = evaluateToleranceStatus(tolerance);

        expect(status.is_soft_breached).toBe(false);
        expect(status.is_hard_breached).toBe(false);
    });

    it('should return WITHIN_APPETITE when all tolerances are healthy', () => {
        const tolerance = createTolerance({
            current_value: 50,  // Well within limits (soft: 80, hard: 100)
        });

        const status = evaluateToleranceStatus(tolerance);
        const result = aggregateToleranceStatuses([status], createCategory());

        expect(result.outOfAppetite).toBe(false);
        expect(result.escalationRequired).toBe(false);
        expect(result.reason_code).toBe('WITHIN_APPETITE');
        expect(result.severity).toBe('INFO');
    });
});
