import { supabase } from './supabase';
import { calculateResidualRisk } from './controls';
// ============================================================================
// DASHBOARD METRICS
// ============================================================================
/**
 * Get comprehensive dashboard metrics
 */
export async function getDashboardMetrics() {
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
        const byStatus = {};
        const byLevel = {};
        const byDivision = {};
        const byCategory = {};
        let priorityRisks = 0;
        let totalInherentScore = 0;
        let totalResidualScore = 0;
        // Aggregate data - calculate residual scores in parallel
        const residualPromises = risks.map(async (risk) => {
            // Calculate inherent score
            const inherentScore = risk.likelihood_inherent * risk.impact_inherent;
            // Calculate residual score using controls
            const { data: residual } = await calculateResidualRisk(risk.id, risk.likelihood_inherent, risk.impact_inherent);
            const residualScore = residual ? residual.residual_score : inherentScore;
            return { risk, inherentScore, residualScore };
        });
        const riskScores = await Promise.all(residualPromises);
        // Now aggregate with calculated residual scores
        riskScores.forEach(({ risk, inherentScore, residualScore }) => {
            // By status
            byStatus[risk.status] = (byStatus[risk.status] || 0) + 1;
            // By level
            const level = getRiskLevel(risk.likelihood_inherent, risk.impact_inherent);
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
            totalInherentScore += inherentScore;
            totalResidualScore += residualScore;
        });
        // Control metrics using correct DIME formula: (D + I + M + E) / 12
        let totalControlEffectiveness = 0;
        let validControlsCount = 0;
        if (controls && controls.length > 0) {
            controls.forEach((control) => {
                // Only count controls with all DIME scores filled
                if (control.design_score !== null &&
                    control.implementation_score !== null &&
                    control.monitoring_score !== null &&
                    control.evaluation_score !== null) {
                    // Skip if design or implementation is 0 (control cannot be effective)
                    if (control.design_score === 0 || control.implementation_score === 0) {
                        validControlsCount++;
                        // effectiveness = 0 (don't add to total)
                    }
                    else {
                        // Calculate effectiveness: (D + I + M + E) / 12 gives 0 to 1
                        const effectiveness = (control.design_score +
                            control.implementation_score +
                            control.monitoring_score +
                            control.evaluation_score) /
                            12;
                        totalControlEffectiveness += effectiveness;
                        validControlsCount++;
                    }
                }
            });
        }
        const avgInherentScore = totalInherentScore / risks.length;
        const avgResidualScore = totalResidualScore / risks.length;
        const avgControlEffectiveness = validControlsCount > 0
            ? Math.round((totalControlEffectiveness / validControlsCount) * 100) // Convert 0-1 to percentage
            : 0;
        const metrics = {
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
    }
    catch (err) {
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
export function getRiskLevel(likelihood, impact) {
    const score = likelihood * impact;
    if (score <= 5)
        return 'Low';
    if (score <= 12)
        return 'Medium';
    if (score <= 19)
        return 'High';
    return 'Extreme';
}
/**
 * Get color for risk level
 */
export function getRiskLevelColor(level) {
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
 * Can load from current risks table or historical snapshots
 *
 * @param matrixSize - 5x5 or 6x6 matrix
 * @param period - Optional period (e.g., "Q1 2025"). If null/undefined, loads current risks
 * @param orgId - Organization ID (required when loading historical data)
 */
export async function getHeatmapData(matrixSize = 5, period, orgId, viewType = 'inherent') {
    try {
        let risks = [];
        let isHistorical = false;
        let snapshotDate;
        // Load from risk_history if period is specified
        if (period && period !== 'current' && orgId) {
            // Parse period string (e.g., "Q2 2026" -> {year: 2026, quarter: 2})
            const periodMatch = period.match(/Q(\d+)\s+(\d{4})/);
            if (!periodMatch) {
                return {
                    data: null,
                    error: new Error(`Invalid period format: ${period}. Expected format: "Q1 2025"`),
                    isHistorical: false
                };
            }
            const quarter = parseInt(periodMatch[1]);
            const year = parseInt(periodMatch[2]);
            // Load from risk_history table
            const { data: historyRecords, error: historyError } = await supabase
                .from('risk_history')
                .select('*')
                .eq('organization_id', orgId)
                .eq('period_year', year)
                .eq('period_quarter', quarter);
            if (historyError) {
                return {
                    data: null,
                    error: new Error(`Failed to load risk history: ${historyError.message}`),
                    isHistorical: false
                };
            }
            if (!historyRecords || historyRecords.length === 0) {
                return {
                    data: null,
                    error: new Error(`No risk history found for ${period}`),
                    isHistorical: false
                };
            }
            // Convert risk_history records to risk objects
            risks = historyRecords.map((h) => ({
                id: h.risk_id,
                risk_code: h.risk_code,
                risk_title: h.risk_title,
                likelihood_inherent: h.likelihood_inherent,
                impact_inherent: h.impact_inherent,
                residual_likelihood: h.likelihood_residual,
                residual_impact: h.impact_residual,
            }));
            isHistorical = true;
            snapshotDate = historyRecords[0]?.committed_at;
        }
        else {
            // Load current risks from risks table
            const { data: currentRisks, error: risksError } = await supabase
                .from('risks')
                .select('risk_code, risk_title, likelihood_inherent, impact_inherent, residual_likelihood, residual_impact, id');
            if (risksError) {
                return { data: null, error: new Error(risksError.message), isHistorical: false };
            }
            risks = currentRisks || [];
            // For current risks viewing residual, calculate residual values if needed
            if (viewType === 'residual') {
                risks = await Promise.all(risks.map(async (risk) => {
                    // Use stored residual values if available, otherwise calculate
                    if (risk.residual_likelihood && risk.residual_impact) {
                        return risk;
                    }
                    else {
                        // Calculate using controls
                        const { data: residualData } = await calculateResidualRisk(risk.id, risk.likelihood_inherent, risk.impact_inherent);
                        return {
                            ...risk,
                            residual_likelihood: residualData?.residual_likelihood ?? risk.likelihood_inherent,
                            residual_impact: residualData?.residual_impact ?? risk.impact_inherent,
                        };
                    }
                }));
            }
        }
        // Initialize matrix
        const matrix = {};
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
        // Populate matrix with risks based on view type
        if (risks && risks.length > 0) {
            risks.forEach((risk) => {
                let likelihood;
                let impact;
                if (viewType === 'residual') {
                    // Use residual values (from snapshot or calculated)
                    likelihood = risk.residual_likelihood || risk.likelihood_residual || risk.likelihood_inherent;
                    impact = risk.residual_impact || risk.impact_residual || risk.impact_inherent;
                }
                else {
                    // Use inherent values
                    likelihood = risk.likelihood_inherent;
                    impact = risk.impact_inherent;
                }
                const key = `${likelihood}-${impact}`;
                if (matrix[key]) {
                    matrix[key].count++;
                    matrix[key].risk_codes.push(risk.risk_code);
                }
            });
        }
        // Convert to array
        const heatmapData = Object.values(matrix);
        return {
            data: heatmapData,
            error: null,
            isHistorical,
            snapshotDate
        };
    }
    catch (err) {
        console.error('Unexpected get heatmap data error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
            isHistorical: false
        };
    }
}
// ============================================================================
// TOP RISKS
// ============================================================================
/**
 * Get top N risks by score
 */
export async function getTopRisks(limit = 10) {
    try {
        const { data: risks, error } = await supabase
            .from('risks')
            .select('risk_code, risk_title, category, division, likelihood_inherent, impact_inherent')
            .order('likelihood_inherent', { ascending: false });
        if (error) {
            return { data: null, error: new Error(error.message) };
        }
        if (!risks || risks.length === 0) {
            return { data: [], error: null };
        }
        // Calculate scores and sort
        const topRisks = risks
            .map((risk) => {
            const inherentScore = risk.likelihood_inherent * risk.impact_inherent;
            return {
                risk_code: risk.risk_code,
                risk_title: risk.risk_title,
                category: risk.category,
                division: risk.division,
                inherent_score: inherentScore,
                residual_score: inherentScore, // Would be calculated with controls
                level: getRiskLevel(risk.likelihood_inherent, risk.impact_inherent),
            };
        })
            .sort((a, b) => b.inherent_score - a.inherent_score)
            .slice(0, limit);
        return { data: topRisks, error: null };
    }
    catch (err) {
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
export async function getRiskTrends() {
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
        const periodMap = {};
        risks.forEach((risk) => {
            const period = risk.period || 'No Period';
            if (!periodMap[period]) {
                periodMap[period] = [];
            }
            periodMap[period].push(risk);
        });
        // Calculate trends for each period
        const trends = Object.entries(periodMap).map(([period, periodRisks]) => {
            const byStatus = {};
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
                avg_score: Math.round((totalScore / periodRisks.length) * 10) / 10,
            };
        });
        // Sort by period
        const periodOrder = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'FY 2025'];
        trends.sort((a, b) => {
            const aIndex = periodOrder.indexOf(a.period);
            const bIndex = periodOrder.indexOf(b.period);
            if (aIndex === -1 && bIndex === -1)
                return 0;
            if (aIndex === -1)
                return 1;
            if (bIndex === -1)
                return -1;
            return aIndex - bIndex;
        });
        return { data: trends, error: null };
    }
    catch (err) {
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
export async function getRiskDistribution(field) {
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
        const distribution = {};
        risks.forEach((risk) => {
            let key;
            if (field === 'level') {
                key = getRiskLevel(risk.likelihood_inherent, risk.impact_inherent);
            }
            else {
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
    }
    catch (err) {
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
export async function getAlertsSummary() {
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
        const kriByLevel = {};
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
    }
    catch (err) {
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
export async function getEnhancedHeatmapData(matrixSize = 5) {
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
        impact_inherent
      `);
        if (risksError) {
            return { data: null, error: new Error(risksError.message) };
        }
        // Initialize matrix
        const matrix = [];
        for (let impact = matrixSize; impact >= 1; impact--) {
            const row = [];
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
            // Calculate residual risk for all risks
            const risksWithResidual = await Promise.all(risks.map(async (risk) => {
                const { data: residualData } = await calculateResidualRisk(risk.id, risk.likelihood_inherent, risk.impact_inherent);
                return {
                    ...risk,
                    residualL: residualData?.residual_likelihood ?? risk.likelihood_inherent,
                    residualI: residualData?.residual_impact ?? risk.impact_inherent,
                };
            }));
            risksWithResidual.forEach((risk) => {
                const residualL = risk.residualL;
                const residualI = risk.residualI;
                const riskWithPosition = {
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
                if (inherentRowIndex >= 0 &&
                    inherentRowIndex < matrixSize &&
                    inherentColIndex >= 0 &&
                    inherentColIndex < matrixSize) {
                    const inherentCell = matrix[inherentRowIndex][inherentColIndex];
                    inherentCell.inherent_count++;
                    inherentCell.inherent_risks.push(riskWithPosition);
                    // Calculate improvement
                    const inherentScore = risk.likelihood_inherent * risk.impact_inherent;
                    const residualScore = residualL * residualI;
                    const improvement = residualScore < inherentScore ? 'improved' : 'unchanged';
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
                if (residualRowIndex >= 0 &&
                    residualRowIndex < matrixSize &&
                    residualColIndex >= 0 &&
                    residualColIndex < matrixSize) {
                    const residualCell = matrix[residualRowIndex][residualColIndex];
                    residualCell.residual_count++;
                    residualCell.residual_risks.push(riskWithPosition);
                }
            });
        }
        return { data: matrix, error: null };
    }
    catch (err) {
        console.error('Unexpected get enhanced heatmap data error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
