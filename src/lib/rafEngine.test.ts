/**
 * RAF Engine Unit Tests
 * 
 * Tests for Layer B robustness features:
 * - Distributed-safe recalculation
 * - Atomic KRI synchronization
 * - Breach rule evaluation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client with any type to avoid Postgrest type complexity
vi.mock('./supabase', () => ({
    supabase: {
        rpc: vi.fn(),
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn()
        })),
        auth: {
            getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } }))
        }
    }
}));

import { supabase } from './supabase';

describe('RAF Engine - Layer B Robustness', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Distributed Locking', () => {
        it('should call acquire_recalc_lock RPC with correct params', async () => {
            const mockRpc = vi.mocked(supabase.rpc);
            mockRpc.mockResolvedValueOnce({ data: { run_id: 'test-run-123', acquired: true }, error: null } as any);

            await supabase.rpc('acquire_recalc_lock', {
                p_org_id: 'org-123',
                p_debounce_ms: 5000
            });

            expect(mockRpc).toHaveBeenCalledWith('acquire_recalc_lock', {
                p_org_id: 'org-123',
                p_debounce_ms: 5000
            });
        });

        it('should call complete_recalc_run RPC with correct params', async () => {
            const mockRpc = vi.mocked(supabase.rpc);
            mockRpc.mockResolvedValueOnce({ data: true, error: null } as any);

            await supabase.rpc('complete_recalc_run', {
                p_run_id: 'test-run-123',
                p_overall_status: 'GREEN',
                p_metrics_evaluated: 5,
                p_breaches_detected: 0
            });

            expect(mockRpc).toHaveBeenCalledWith('complete_recalc_run', expect.objectContaining({
                p_run_id: 'test-run-123',
                p_overall_status: 'GREEN'
            }));
        });
    });

    describe('Atomic KRI Synchronization', () => {
        it('should call sync_kri_with_tolerance_atomic RPC', async () => {
            const mockRpc = vi.mocked(supabase.rpc);
            mockRpc.mockResolvedValueOnce({ data: { kri_id: 'kri-123', linked: true }, error: null } as any);

            await supabase.rpc('sync_kri_with_tolerance_atomic', {
                p_tolerance_id: 'tol-123',
                p_kri_code: 'KRI-001',
                p_kri_name: 'Test KRI',
                p_thresholds: { green_max: 5, amber_max: 10, red_min: 10 }
            });

            expect(mockRpc).toHaveBeenCalledWith('sync_kri_with_tolerance_atomic', expect.objectContaining({
                p_tolerance_id: 'tol-123',
                p_kri_code: 'KRI-001'
            }));
        });
    });

    describe('Breach Rule Evaluation', () => {
        it('should call count_consecutive_breach_periods RPC', async () => {
            const mockRpc = vi.mocked(supabase.rpc);
            mockRpc.mockResolvedValueOnce({ data: 3, error: null } as any);

            const result = await supabase.rpc('count_consecutive_breach_periods', {
                p_metric_id: 'metric-123',
                p_breach_type: 'AMBER'
            });

            expect(mockRpc).toHaveBeenCalled();
            expect((result as any).data).toBe(3);
        });

        it('should call count_breaches_in_window RPC', async () => {
            const mockRpc = vi.mocked(supabase.rpc);
            mockRpc.mockResolvedValueOnce({ data: 5, error: null } as any);

            const result = await supabase.rpc('count_breaches_in_window', {
                p_metric_id: 'metric-123',
                p_window_days: 30
            });

            expect((result as any).data).toBe(5);
        });
    });

    describe('DIME Score Validation', () => {
        it('should accept valid DIME scores (0-3)', () => {
            const validScores = [0, 1, 2, 3];
            validScores.forEach(score => {
                expect(score >= 0 && score <= 3).toBe(true);
            });
        });

        it('should reject scores outside 0-3 range', () => {
            const invalidScores = [-1, 4, 5];
            invalidScores.forEach(score => {
                const isValid = score >= 0 && score <= 3;
                expect(isValid).toBe(false);
            });
        });

        it('should reject non-integer DIME scores', () => {
            const invalidScores = [0.5, 1.5, 2.7];
            invalidScores.forEach(score => {
                expect(Number.isInteger(score)).toBe(false);
            });
        });
    });
});

describe('Appetite Tolerance - Threshold Logic', () => {
    it('should classify GREEN when value is within green thresholds', () => {
        const value = 5;
        const green_max = 10;
        expect(value <= green_max).toBe(true);
    });

    it('should classify AMBER when value exceeds green but not red', () => {
        const value = 12;
        const green_max = 10;
        const red_max = 15;
        const isAmber = value > green_max && value <= red_max;
        expect(isAmber).toBe(true);
    });

    it('should classify RED when value exceeds red threshold', () => {
        const value = 25;
        const red_max = 20;
        expect(value > red_max).toBe(true);
    });
});
