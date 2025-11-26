import { supabase } from './supabase';
import type { Risk } from '@/types/risk';

/**
 * Analytics Service Layer
 *
 * Provides data aggregation and analytics functions for dashboards,
 * reports, heatmaps, and trend analysis.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardMetrics {
  total_risks: number;
  by_status: Record<string, number>;
  by_level: Record<string, number>; // Low, Medium, High, Extreme
  by_division: Record<string, number>;
  by_category: Record<string, number>;
  priority_risks: number;
  avg_inherent_score: number;
  avg_residual_score: number;
  total_controls: number;
  avg_control_effectiveness: number;
}

export interface HeatmapCell {
  likelihood: number;
  impact: number;
  count: number;
  risk_codes: string[];
  level: 'Low' | 'Medium' | 'High' | 'Extreme';
}

export interface TrendData {
  period: string;
  total_risks: number;
  by_status: Record<string, number>;
  avg_score: number;
}

export interface TopRisk {
  risk_code: string;
  risk_title: string;
  category: string;
  division: string;
  inherent_score: number;
  residual_score: number;
  level: string;
}

// Enhanced Heatmap Types
export interface RiskWithPosition extends Risk {
  inherent_l: number;
  inherent_i: number;
  residual_l: number;
  residual_i: number;
}

export interface RiskTransition {
  risk_code: string;
  risk_title: string;
  from_l: number;
  from_i: number;
  to_l: number;
  to_i: number;
  improvement: 'improved' | 'unchanged';
}

export interface EnhancedHeatmapCell {
  likelihood: number;
  impact: number;
  inherent_count: number;
  residual_count: number;
  inherent_risks: RiskWithPosition[];
  residual_risks: RiskWithPosition[];
  transitions: RiskTransition[];
  level: 'Low' | 'Medium' | 'High' | 'Extreme';
  color: string;
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * Get comprehensive dashboard metrics
 */
export async function getDashboardMetrics(): Promise<{
  data: DashboardMetrics | null;
  error: Error | null;
}> {
  try {
    // Fetch all risks (RLS will filter by user/org automatically)
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('*');

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    if (!risks || risks.length === 0) {
      return {
        data: {
          total_risks: 0,
          by_status: {},
          by_level: {},
          by_division: {},
          by_category: {},
          priority_risks: 0,
          avg_inherent_score: 0,
          avg_residual_score: 0,
          total_controls: 0,
          avg_control_effectiveness: 0,
        },
        error: null,
      };
    }

    // Fetch all controls
    const { data: controls, error: controlsError } = await supabase
      .from('controls')
      .select('*');

    // Initialize aggregations
    const byStatus: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    const byDivision: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let priorityRisks = 0;
    let totalInherentScore = 0;
    let totalResidualScore = 0;

    // Aggregate data
    risks.forEach((risk) => {
      // By status
      byStatus[risk.status] = (byStatus[risk.status] || 0) + 1;

      // By level
      const level = getRiskLevel(
        risk.likelihood_inherent,
        risk.impact_inherent
      );
      byLevel[level] = (byLevel[level] || 0) + 1;

      // By division
      if (risk.division) {
        byDivision[risk.division] = (byDivision[risk.division] || 0) + 1;
      }

      // By category
      if (risk.category) {
        byCategory[risk.category] = (byCategory[risk.category] || 0) + 1;
      }

      // Priority risks
      if (risk.is_priority) {
        priorityRisks++;
      }

      // Scores
      totalInherentScore +=
        risk.likelihood_inherent * risk.impact_inherent;
      // For now, residual = inherent (would be calculated with controls)
      totalResidualScore +=
        risk.likelihood_inherent * risk.impact_inherent;
    });

    // Control metrics
    let totalControlEffectiveness = 0;
    if (controls && controls.length > 0) {
      controls.forEach((control) => {
        const effectiveness =
          (control.design +
            control.implementation +
            control.monitoring +
            control.effectiveness_evaluation) /
          4;
        totalControlEffectiveness += effectiveness;
      });
    }

    const avgInherentScore = totalInherentScore / risks.length;
    const avgResidualScore = totalResidualScore / risks.length;
    const avgControlEffectiveness =
      controls && controls.length > 0
        ? (totalControlEffectiveness / controls.length / 3) * 100 // Convert 0-3 to percentage
        : 0;

    const metrics: DashboardMetrics = {
      total_risks: risks.length,
      by_status: byStatus,
      by_level: byLevel,
      by_division: byDivision,
      by_category: byCategory,
      priority_risks: priorityRisks,
      avg_inherent_score: Math.round(avgInherentScore * 10) / 10,
      avg_residual_score: Math.round(avgResidualScore * 10) / 10,
      total_controls: controls?.length || 0,
      avg_control_effectiveness: Math.round(avgControlEffectiveness),
    };

    return { data: metrics, error: null };
  } catch (err) {
    console.error('Unexpected get dashboard metrics error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// RISK LEVEL CALCULATION
// ============================================================================

/**
 * Determine risk level based on likelihood and impact
 * Uses 5x5 matrix by default
 */
export function getRiskLevel(
  likelihood: number,
  impact: number
): 'Low' | 'Medium' | 'High' | 'Extreme' {
  const score = likelihood * impact;

  if (score <= 5) return 'Low';
  if (score <= 12) return 'Medium';
  if (score <= 19) return 'High';
  return 'Extreme';
}

/**
 * Get color for risk level
 */
export function getRiskLevelColor(
  level: 'Low' | 'Medium' | 'High' | 'Extreme'
): string {
  switch (level) {
    case 'Low':
      return '#10b981'; // green-500
    case 'Medium':
      return '#fbbf24'; // yellow-400
    case 'High':
      return '#f97316'; // orange-500
    case 'Extreme':
      return '#ef4444'; // red-500
  }
}

// ============================================================================
// HEATMAP DATA
// ============================================================================

/**
 * Generate heatmap data (5x5 or 6x6 matrix)
 */
export async function getHeatmapData(matrixSize: 5 | 6 = 5): Promise<{
  data: HeatmapCell[] | null;
  error: Error | null;
}> {
  try {
    // Fetch all risks
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('risk_code, risk_title, likelihood_inherent, impact_inherent');

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    // Initialize matrix
    const matrix: Record<string, HeatmapCell> = {};

    for (let l = 1; l <= matrixSize; l++) {
      for (let i = 1; i <= matrixSize; i++) {
        const key = `${l}-${i}`;
        matrix[key] = {
          likelihood: l,
          impact: i,
          count: 0,
          risk_codes: [],
          level: getRiskLevel(l, i),
        };
      }
    }

    // Populate matrix with risks
    if (risks && risks.length > 0) {
      risks.forEach((risk) => {
        const key = `${risk.likelihood_inherent}-${risk.impact_inherent}`;
        if (matrix[key]) {
          matrix[key].count++;
          matrix[key].risk_codes.push(risk.risk_code);
        }
      });
    }

    // Convert to array
    const heatmapData = Object.values(matrix);

    return { data: heatmapData, error: null };
  } catch (err) {
    console.error('Unexpected get heatmap data error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// TOP RISKS
// ============================================================================

/**
 * Get top N risks by score
 */
export async function getTopRisks(limit: number = 10): Promise<{
  data: TopRisk[] | null;
  error: Error | null;
}> {
  try {
    const { data: risks, error } = await supabase
      .from('risks')
      .select(
        'risk_code, risk_title, category, division, likelihood_inherent, impact_inherent'
      )
      .order('likelihood_inherent', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!risks || risks.length === 0) {
      return { data: [], error: null };
    }

    // Calculate scores and sort
    const topRisks: TopRisk[] = risks
      .map((risk) => {
        const inherentScore =
          risk.likelihood_inherent * risk.impact_inherent;
        return {
          risk_code: risk.risk_code,
          risk_title: risk.risk_title,
          category: risk.category,
          division: risk.division,
          inherent_score: inherentScore,
          residual_score: inherentScore, // Would be calculated with controls
          level: getRiskLevel(
            risk.likelihood_inherent,
            risk.impact_inherent
          ),
        };
      })
      .sort((a, b) => b.inherent_score - a.inherent_score)
      .slice(0, limit);

    return { data: topRisks, error: null };
  } catch (err) {
    console.error('Unexpected get top risks error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Get risk trends over periods
 */
export async function getRiskTrends(): Promise<{
  data: TrendData[] | null;
  error: Error | null;
}> {
  try {
    const { data: risks, error } = await supabase
      .from('risks')
      .select('period, status, likelihood_inherent, impact_inherent');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!risks || risks.length === 0) {
      return { data: [], error: null };
    }

    // Group by period
    const periodMap: Record<string, Risk[]> = {};

    risks.forEach((risk) => {
      const period = risk.period || 'No Period';
      if (!periodMap[period]) {
        periodMap[period] = [];
      }
      periodMap[period].push(risk as Risk);
    });

    // Calculate trends for each period
    const trends: TrendData[] = Object.entries(periodMap).map(
      ([period, periodRisks]) => {
        const byStatus: Record<string, number> = {};
        let totalScore = 0;

        periodRisks.forEach((risk) => {
          byStatus[risk.status] = (byStatus[risk.status] || 0) + 1;
          totalScore +=
            risk.likelihood_inherent * risk.impact_inherent;
        });

        return {
          period,
          total_risks: periodRisks.length,
          by_status: byStatus,
          avg_score:
            Math.round((totalScore / periodRisks.length) * 10) / 10,
        };
      }
    );

    // Sort by period
    const periodOrder = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'FY 2025'];
    trends.sort((a, b) => {
      const aIndex = periodOrder.indexOf(a.period);
      const bIndex = periodOrder.indexOf(b.period);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return { data: trends, error: null };
  } catch (err) {
    console.error('Unexpected get risk trends error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// RISK DISTRIBUTION
// ============================================================================

/**
 * Get risk distribution by any field
 */
export async function getRiskDistribution(
  field: 'division' | 'category' | 'status' | 'level'
): Promise<{
  data: Array<{ name: string; count: number; percentage: number }> | null;
  error: Error | null;
}> {
  try {
    const { data: risks, error } = await supabase
      .from('risks')
      .select('division, category, status, likelihood_inherent, impact_inherent');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!risks || risks.length === 0) {
      return { data: [], error: null };
    }

    const distribution: Record<string, number> = {};

    risks.forEach((risk) => {
      let key: string;

      if (field === 'level') {
        key = getRiskLevel(
          risk.likelihood_inherent,
          risk.impact_inherent
        );
      } else {
        key = risk[field] || 'Unknown';
      }

      distribution[key] = (distribution[key] || 0) + 1;
    });

    // Convert to array with percentages
    const total = risks.length;
    const result = Object.entries(distribution)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return { data: result, error: null };
  } catch (err) {
    console.error('Unexpected get risk distribution error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// ALERTS SUMMARY
// ============================================================================

/**
 * Get summary of all alerts (KRI + Intelligence)
 */
export async function getAlertsSummary(): Promise<{
  data: {
    kri_alerts: number;
    intelligence_alerts: number;
    total_alerts: number;
    kri_by_level: Record<string, number>;
  } | null;
  error: Error | null;
}> {
  try {
    // Get KRI alerts
    const { data: kriAlerts, error: kriError } = await supabase
      .from('kri_alerts')
      .select('alert_level')
      .eq('status', 'open');

    if (kriError) {
      return { data: null, error: new Error(kriError.message) };
    }

    // Get intelligence alerts
    const { count: intelligenceCount, error: intelError } = await supabase
      .from('risk_intelligence_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (intelError) {
      return { data: null, error: new Error(intelError.message) };
    }

    // Aggregate KRI alerts by level
    const kriByLevel: Record<string, number> = {};
    if (kriAlerts) {
      kriAlerts.forEach((alert) => {
        kriByLevel[alert.alert_level] =
          (kriByLevel[alert.alert_level] || 0) + 1;
      });
    }

    const summary = {
      kri_alerts: kriAlerts?.length || 0,
      intelligence_alerts: intelligenceCount || 0,
      total_alerts: (kriAlerts?.length || 0) + (intelligenceCount || 0),
      kri_by_level: kriByLevel,
    };

    return { data: summary, error: null };
  } catch (err) {
    console.error('Unexpected get alerts summary error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// ENHANCED HEATMAP WITH DUAL INHERENT/RESIDUAL DISPLAY
// ============================================================================

/**
 * Get enhanced heatmap data with both inherent and residual risk positions
 * This enables dual display showing how risks move from inherent to residual
 */
export async function getEnhancedHeatmapData(matrixSize: 5 | 6 = 5): Promise<{
  data: EnhancedHeatmapCell[][] | null;
  error: Error | null;
}> {
  try {
    // Fetch all risks with residual values
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select(`
        id,
        risk_code,
        risk_title,
        status,
        owner,
        likelihood_inherent,
        impact_inherent,
        residual_likelihood,
        residual_impact,
        residual_score
      `);

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    // Initialize matrix
    const matrix: EnhancedHeatmapCell[][] = [];

    for (let impact = matrixSize; impact >= 1; impact--) {
      const row: EnhancedHeatmapCell[] = [];

      for (let likelihood = 1; likelihood <= matrixSize; likelihood++) {
        const score = likelihood * impact;
        const level = getRiskLevel(likelihood, impact);
        const color = getRiskLevelColor(level);

        row.push({
          likelihood,
          impact,
          inherent_count: 0,
          residual_count: 0,
          inherent_risks: [],
          residual_risks: [],
          transitions: [],
          level,
          color,
        });
      }

      matrix.push(row);
    }

    // Populate matrix with risk data
    if (risks && risks.length > 0) {
      risks.forEach((risk) => {
        // Use residual values if available, otherwise fallback to inherent
        const residualL = risk.residual_likelihood || risk.likelihood_inherent;
        const residualI = risk.residual_impact || risk.impact_inherent;

        const riskWithPosition: RiskWithPosition = {
          ...risk,
          inherent_l: risk.likelihood_inherent,
          inherent_i: risk.impact_inherent,
          residual_l: residualL,
          residual_i: residualI,
          // Add other required Risk interface properties with defaults
          organization_id: risk.organization_id || '',
          user_id: risk.user_id || '',
          owner_profile_id: risk.owner_profile_id || null,
          risk_description: risk.risk_description || '',
          division: risk.division || '',
          department: risk.department || '',
          category: risk.category || '',
          period: risk.period || null,
          is_priority: risk.is_priority || false,
          created_at: risk.created_at || '',
          updated_at: risk.updated_at || '',
        };

        // Add to inherent cell
        const inherentRowIndex = matrixSize - risk.impact_inherent;
        const inherentColIndex = risk.likelihood_inherent - 1;

        if (
          inherentRowIndex >= 0 &&
          inherentRowIndex < matrixSize &&
          inherentColIndex >= 0 &&
          inherentColIndex < matrixSize
        ) {
          const inherentCell = matrix[inherentRowIndex][inherentColIndex];
          inherentCell.inherent_count++;
          inherentCell.inherent_risks.push(riskWithPosition);

          // Calculate improvement
          const inherentScore = risk.likelihood_inherent * risk.impact_inherent;
          const residualScore = residualL * residualI;
          const improvement =
            residualScore < inherentScore ? 'improved' : 'unchanged';

          // Add transition
          inherentCell.transitions.push({
            risk_code: risk.risk_code,
            risk_title: risk.risk_title,
            from_l: risk.likelihood_inherent,
            from_i: risk.impact_inherent,
            to_l: residualL,
            to_i: residualI,
            improvement,
          });
        }

        // Add to residual cell
        const residualRowIndex = matrixSize - residualI;
        const residualColIndex = residualL - 1;

        if (
          residualRowIndex >= 0 &&
          residualRowIndex < matrixSize &&
          residualColIndex >= 0 &&
          residualColIndex < matrixSize
        ) {
          const residualCell = matrix[residualRowIndex][residualColIndex];
          residualCell.residual_count++;
          residualCell.residual_risks.push(riskWithPosition);
        }
      });
    }

    return { data: matrix, error: null };
  } catch (err) {
    console.error('Unexpected get enhanced heatmap data error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
