/**
 * Period Management Library
 *
 * Handles period snapshots, commits, and historical risk data retrieval.
 * Enables organizations to track risk evolution over time.
 */

import { supabase } from './supabase';
import { getRisks } from './risks';
import { getControlsForRisk, calculateResidualRisk } from './controls';

// =====================================================
// TYPES
// =====================================================

export interface RiskSnapshot {
  id: string;
  organization_id: string;
  period: string;
  snapshot_date: string;
  committed_by: string | null;
  risk_count: number;
  snapshot_data: SnapshotData;
  notes: string | null;
  created_at: string;
}

export interface SnapshotData {
  period: string;
  snapshot_date: string;
  risk_count: number;
  risks: SnapshotRisk[];
  summary: {
    total_risks: number;
    by_status: Record<string, number>;
    by_level: Record<string, number>;
    by_category: Record<string, number>;
    avg_inherent_score: number;
    avg_residual_score: number;
  };
}

export interface SnapshotRisk {
  risk_code: string;
  risk_title: string;
  risk_description: string;
  category: string;
  division: string | null;
  likelihood_inherent: number;
  impact_inherent: number;
  score_inherent: number;
  likelihood_residual: number | null;
  impact_residual: number | null;
  score_residual: number | null;
  status: string;
  is_priority: boolean;
  controls_count: number;
  controls: any[];
}

export interface PeriodComparison {
  period1: string;
  period2: string;
  risk_count_change: number;
  new_risks: SnapshotRisk[];
  closed_risks: SnapshotRisk[];
  risk_changes: RiskChange[];
  score_changes: {
    avg_inherent_change: number;
    avg_residual_change: number;
  };
}

export interface RiskChange {
  risk_code: string;
  risk_title: string;
  likelihood_change: number;
  impact_change: number;
  score_change: number;
  old_status: string;
  new_status: string;
}

// =====================================================
// PERIOD SNAPSHOT OPERATIONS
// =====================================================

/**
 * Get all committed periods (snapshots) for an organization
 */
export async function getAvailableSnapshots(orgId: string) {
  const { data, error } = await supabase
    .from('risk_snapshots')
    .select('id, period, snapshot_date, risk_count, committed_by, notes, created_at')
    .eq('organization_id', orgId)
    .order('snapshot_date', { ascending: false });

  return { data: data as Omit<RiskSnapshot, 'snapshot_data'>[] | null, error };
}

/**
 * Get a specific snapshot by period
 */
export async function getSnapshotByPeriod(orgId: string, period: string) {
  const { data, error } = await supabase
    .from('risk_snapshots')
    .select('*')
    .eq('organization_id', orgId)
    .eq('period', period)
    .single();

  return { data: data as RiskSnapshot | null, error };
}

/**
 * Get the latest snapshot for an organization
 */
export async function getLatestSnapshot(orgId: string) {
  const { data, error } = await supabase
    .from('risk_snapshots')
    .select('*')
    .eq('organization_id', orgId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  return { data: data as RiskSnapshot | null, error };
}

/**
 * Check if a period snapshot already exists
 */
export async function periodSnapshotExists(orgId: string, period: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('risk_snapshots')
    .select('id')
    .eq('organization_id', orgId)
    .eq('period', period)
    .single();

  return !error && data !== null;
}

// =====================================================
// COMMIT PERIOD (CREATE SNAPSHOT)
// =====================================================

/**
 * Commit current period - Take snapshot of all risks
 * This is the main function for end-of-period activities
 */
export async function commitPeriod(
  orgId: string,
  period: string,
  userId: string,
  notes?: string
): Promise<{ data: RiskSnapshot | null; error: Error | null }> {
  try {
    // Check if snapshot already exists
    const exists = await periodSnapshotExists(orgId, period);
    if (exists) {
      return {
        data: null,
        error: new Error(`Snapshot for ${period} already exists`),
      };
    }

    // Get all current risks for the organization
    const { data: risks, error: risksError } = await getRisks(orgId);

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    if (!risks || risks.length === 0) {
      return {
        data: null,
        error: new Error('No risks found to snapshot'),
      };
    }

    // Build snapshot data with controls and residual calculations
    const snapshotRisks: SnapshotRisk[] = [];

    for (const risk of risks) {
      // Get controls for this risk
      const { data: controls } = await getControlsForRisk(risk.id);

      // Calculate residual risk
      const residual = controls && controls.length > 0
        ? calculateResidualRisk(
            risk.likelihood_inherent,
            risk.impact_inherent,
            controls
          )
        : null;

      snapshotRisks.push({
        risk_code: risk.risk_code,
        risk_title: risk.risk_title,
        risk_description: risk.risk_description || '',
        category: risk.category,
        division: risk.division,
        likelihood_inherent: risk.likelihood_inherent,
        impact_inherent: risk.impact_inherent,
        score_inherent: risk.likelihood_inherent * risk.impact_inherent,
        likelihood_residual: residual?.likelihood || null,
        impact_residual: residual?.impact || null,
        score_residual: residual ? residual.likelihood * residual.impact : null,
        status: risk.status,
        is_priority: risk.is_priority || false,
        controls_count: controls?.length || 0,
        controls: controls || [],
      });
    }

    // Calculate summary statistics
    const summary = calculateSnapshotSummary(snapshotRisks);

    // Build complete snapshot data
    const snapshotData: SnapshotData = {
      period,
      snapshot_date: new Date().toISOString(),
      risk_count: snapshotRisks.length,
      risks: snapshotRisks,
      summary,
    };

    // Insert snapshot into database
    const { data, error } = await supabase
      .from('risk_snapshots')
      .insert({
        organization_id: orgId,
        period,
        snapshot_date: new Date().toISOString(),
        committed_by: userId,
        risk_count: snapshotRisks.length,
        snapshot_data: snapshotData,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Commit period error:', error);
      return { data: null, error: new Error(error.message) };
    }

    console.log(`✅ Period committed: ${period} (${snapshotRisks.length} risks)`);
    return { data: data as RiskSnapshot, error: null };
  } catch (err) {
    console.error('Unexpected commit period error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Calculate summary statistics for snapshot
 */
function calculateSnapshotSummary(risks: SnapshotRisk[]) {
  const summary = {
    total_risks: risks.length,
    by_status: {} as Record<string, number>,
    by_level: {} as Record<string, number>,
    by_category: {} as Record<string, number>,
    avg_inherent_score: 0,
    avg_residual_score: 0,
  };

  let totalInherent = 0;
  let totalResidual = 0;
  let residualCount = 0;

  risks.forEach((risk) => {
    // By status
    summary.by_status[risk.status] = (summary.by_status[risk.status] || 0) + 1;

    // By category
    summary.by_category[risk.category] = (summary.by_category[risk.category] || 0) + 1;

    // By level (based on inherent score)
    const level = getRiskLevel(risk.score_inherent);
    summary.by_level[level] = (summary.by_level[level] || 0) + 1;

    // Average scores
    totalInherent += risk.score_inherent;
    if (risk.score_residual !== null) {
      totalResidual += risk.score_residual;
      residualCount++;
    }
  });

  summary.avg_inherent_score = Math.round((totalInherent / risks.length) * 10) / 10;
  summary.avg_residual_score = residualCount > 0
    ? Math.round((totalResidual / residualCount) * 10) / 10
    : 0;

  return summary;
}

/**
 * Get risk level from score (5x5 matrix)
 */
function getRiskLevel(score: number): string {
  if (score >= 20) return 'Severe';
  if (score >= 12) return 'High';
  if (score >= 6) return 'Moderate';
  if (score >= 3) return 'Low';
  return 'Minimal';
}

// =====================================================
// PERIOD COMPARISON
// =====================================================

/**
 * Compare two periods to identify changes
 */
export async function compareSnapshots(
  orgId: string,
  period1: string,
  period2: string
): Promise<{ data: PeriodComparison | null; error: Error | null }> {
  try {
    // Get both snapshots
    const { data: snapshot1, error: error1 } = await getSnapshotByPeriod(orgId, period1);
    const { data: snapshot2, error: error2 } = await getSnapshotByPeriod(orgId, period2);

    if (error1 || error2) {
      return {
        data: null,
        error: new Error(error1?.message || error2?.message || 'Failed to load snapshots'),
      };
    }

    if (!snapshot1 || !snapshot2) {
      return { data: null, error: new Error('One or both snapshots not found') };
    }

    const data1 = snapshot1.snapshot_data;
    const data2 = snapshot2.snapshot_data;

    // Build comparison
    const comparison: PeriodComparison = {
      period1,
      period2,
      risk_count_change: data2.risk_count - data1.risk_count,
      new_risks: [],
      closed_risks: [],
      risk_changes: [],
      score_changes: {
        avg_inherent_change: data2.summary.avg_inherent_score - data1.summary.avg_inherent_score,
        avg_residual_change: data2.summary.avg_residual_score - data1.summary.avg_residual_score,
      },
    };

    // Create maps for quick lookup
    const risks1Map = new Map(data1.risks.map((r) => [r.risk_code, r]));
    const risks2Map = new Map(data2.risks.map((r) => [r.risk_code, r]));

    // Find new risks (in period2 but not in period1)
    data2.risks.forEach((risk2) => {
      if (!risks1Map.has(risk2.risk_code)) {
        comparison.new_risks.push(risk2);
      }
    });

    // Find closed risks (in period1 but not in period2)
    data1.risks.forEach((risk1) => {
      if (!risks2Map.has(risk1.risk_code)) {
        comparison.closed_risks.push(risk1);
      }
    });

    // Find changed risks
    data2.risks.forEach((risk2) => {
      const risk1 = risks1Map.get(risk2.risk_code);
      if (risk1) {
        const likelihoodChange = risk2.likelihood_inherent - risk1.likelihood_inherent;
        const impactChange = risk2.impact_inherent - risk1.impact_inherent;
        const scoreChange = risk2.score_inherent - risk1.score_inherent;

        // Only include if something changed
        if (likelihoodChange !== 0 || impactChange !== 0 || risk1.status !== risk2.status) {
          comparison.risk_changes.push({
            risk_code: risk2.risk_code,
            risk_title: risk2.risk_title,
            likelihood_change: likelihoodChange,
            impact_change: impactChange,
            score_change: scoreChange,
            old_status: risk1.status,
            new_status: risk2.status,
          });
        }
      }
    });

    return { data: comparison, error: null };
  } catch (err) {
    console.error('Compare snapshots error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// =====================================================
// DELETE SNAPSHOT
// =====================================================

/**
 * Delete a period snapshot (admin only)
 */
export async function deleteSnapshot(snapshotId: string) {
  const { error } = await supabase
    .from('risk_snapshots')
    .delete()
    .eq('id', snapshotId);

  return { error };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate period options (Q1-Q4 for current and next year)
 */
export function generatePeriodOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const periods: { value: string; label: string }[] = [];

  // Generate for previous year, current year, and next year
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      const period = `Q${quarter} ${year}`;
      periods.push({ value: period, label: period });
    }
  }

  // Reverse to show most recent first
  return periods.reverse();
}

/**
 * Get current quarter and year
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const year = now.getFullYear();
  return `Q${quarter} ${year}`;
}

/**
 * Parse period string to get quarter and year
 */
export function parsePeriod(period: string): { quarter: number; year: number } | null {
  const match = period.match(/Q(\d) (\d{4})/);
  if (match) {
    return {
      quarter: parseInt(match[1], 10),
      year: parseInt(match[2], 10),
    };
  }
  return null;
}

// =====================================================
// TREND ANALYSIS
// =====================================================

export interface PeriodTrendData {
  period: string;
  snapshot_date: string;
  total_risks: number;
  by_status: Record<string, number>;
  by_level: Record<string, number>;
  by_category: Record<string, number>;
  avg_inherent_score: number;
  avg_residual_score: number;
  high_severe_count: number;
}

export interface RiskMigration {
  risk_code: string;
  risk_title: string;
  from_period: string;
  to_period: string;
  from_level: string;
  to_level: string;
  from_score: number;
  to_score: number;
  direction: 'improved' | 'deteriorated' | 'unchanged';
}

/**
 * Get trend data across all snapshots for an organization
 */
export async function getPeriodTrends(
  orgId: string
): Promise<{ data: PeriodTrendData[] | null; error: Error | null }> {
  try {
    const { data: snapshots, error } = await getAvailableSnapshots(orgId);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!snapshots || snapshots.length === 0) {
      return { data: [], error: null };
    }

    // Load full snapshot data for each period
    const trends: PeriodTrendData[] = [];

    for (const snapshot of snapshots) {
      const { data: fullSnapshot } = await getSnapshotByPeriod(orgId, snapshot.period);

      if (fullSnapshot && fullSnapshot.snapshot_data) {
        const summary = fullSnapshot.snapshot_data.summary;

        // Count high/severe risks
        const highSevereCount =
          (summary.by_level['High'] || 0) +
          (summary.by_level['Severe'] || 0) +
          (summary.by_level['Extreme'] || 0);

        trends.push({
          period: snapshot.period,
          snapshot_date: snapshot.snapshot_date,
          total_risks: summary.total_risks,
          by_status: summary.by_status,
          by_level: summary.by_level,
          by_category: summary.by_category,
          avg_inherent_score: summary.avg_inherent_score,
          avg_residual_score: summary.avg_residual_score,
          high_severe_count: highSevereCount,
        });
      }
    }

    // Sort by date (oldest to newest for trend charts)
    trends.sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());

    return { data: trends, error: null };
  } catch (err) {
    console.error('Get period trends error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Analyze risk migrations between two periods
 * Shows how individual risks moved between risk levels
 */
export async function analyzeRiskMigrations(
  orgId: string,
  period1: string,
  period2: string
): Promise<{ data: RiskMigration[] | null; error: Error | null }> {
  try {
    const { data: snapshot1, error: error1 } = await getSnapshotByPeriod(orgId, period1);
    const { data: snapshot2, error: error2 } = await getSnapshotByPeriod(orgId, period2);

    if (error1 || error2) {
      return {
        data: null,
        error: new Error('Failed to load snapshots for migration analysis'),
      };
    }

    if (!snapshot1 || !snapshot2) {
      return { data: null, error: new Error('Snapshots not found') };
    }

    const risks1Map = new Map(
      snapshot1.snapshot_data.risks.map((r) => [r.risk_code, r])
    );
    const risks2Map = new Map(
      snapshot2.snapshot_data.risks.map((r) => [r.risk_code, r])
    );

    const migrations: RiskMigration[] = [];

    // Find risks that exist in both periods and check for level changes
    snapshot2.snapshot_data.risks.forEach((risk2) => {
      const risk1 = risks1Map.get(risk2.risk_code);

      if (risk1) {
        const level1 = getRiskLevel(risk1.score_inherent);
        const level2 = getRiskLevel(risk2.score_inherent);

        // Only include if level changed
        if (level1 !== level2) {
          let direction: 'improved' | 'deteriorated' | 'unchanged' = 'unchanged';

          if (risk2.score_inherent < risk1.score_inherent) {
            direction = 'improved';
          } else if (risk2.score_inherent > risk1.score_inherent) {
            direction = 'deteriorated';
          }

          migrations.push({
            risk_code: risk2.risk_code,
            risk_title: risk2.risk_title,
            from_period: period1,
            to_period: period2,
            from_level: level1,
            to_level: level2,
            from_score: risk1.score_inherent,
            to_score: risk2.score_inherent,
            direction,
          });
        }
      }
    });

    return { data: migrations, error: null };
  } catch (err) {
    console.error('Analyze risk migrations error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
