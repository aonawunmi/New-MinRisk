/**
 * Period Management Library v2 - Continuous Risk Evolution Model
 *
 * Implements the new architecture where:
 * - Risks are continuous (never cloned/cleared between periods)
 * - Period commits create snapshots in risk_history
 * - Periods represented as structured year + quarter
 * - Active period tracked at organization level
 */
import { supabase } from './supabase';
import { getControlsForRisk, calculateResidualRisk } from './controls';
// ============================================================================
// PERIOD UTILITIES
// ============================================================================
/**
 * Format period as display string "Q3 2025"
 */
export function formatPeriod(period) {
    return `Q${period.quarter} ${period.year}`;
}
/**
 * Parse period string "Q3 2025" to structured Period
 */
export function parsePeriod(periodStr) {
    const match = periodStr.match(/Q(\d)\s+(\d{4})/);
    if (match) {
        return {
            quarter: parseInt(match[1], 10),
            year: parseInt(match[2], 10),
        };
    }
    return null;
}
/**
 * Get current period based on current date
 */
export function getCurrentPeriod() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const quarter = Math.ceil(month / 3); // 1-4
    const year = now.getFullYear();
    return { year, quarter };
}
/**
 * Get next period
 */
export function getNextPeriod(period) {
    if (period.quarter === 4) {
        return { year: period.year + 1, quarter: 1 };
    }
    return { year: period.year, quarter: period.quarter + 1 };
}
/**
 * Get previous period
 */
export function getPreviousPeriod(period) {
    if (period.quarter === 1) {
        return { year: period.year - 1, quarter: 4 };
    }
    return { year: period.year, quarter: period.quarter - 1 };
}
/**
 * Compare two periods: returns -1 if p1 < p2, 0 if equal, 1 if p1 > p2
 */
export function comparePeriods(p1, p2) {
    if (p1.year !== p2.year) {
        return p1.year - p2.year;
    }
    return p1.quarter - p2.quarter;
}
// ============================================================================
// ACTIVE PERIOD MANAGEMENT
// ============================================================================
/**
 * Get the current active period for an organization
 */
export async function getActivePeriod(orgId) {
    try {
        const { data, error } = await supabase
            .from('active_period')
            .select('*')
            .eq('organization_id', orgId)
            .single();
        if (error) {
            // If no active period set, return current period as default
            if (error.code === 'PGRST116') {
                const current = getCurrentPeriod();
                return {
                    data: {
                        organization_id: orgId,
                        current_period_year: current.year,
                        current_period_quarter: current.quarter,
                        previous_period_year: null,
                        previous_period_quarter: null,
                        period_started_at: new Date().toISOString(),
                    },
                    error: null,
                };
            }
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Set/update the active period for an organization
 */
export async function setActivePeriod(orgId, period) {
    try {
        const { data, error } = await supabase
            .from('active_period')
            .upsert({
            organization_id: orgId,
            current_period_year: period.year,
            current_period_quarter: period.quarter,
            period_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (error) {
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
// ============================================================================
// PERIOD COMMIT (Create Historical Snapshot)
// ============================================================================
/**
 * Commit the current period - Create historical snapshots in risk_history
 * This is the core function called at end of quarter
 */
export async function commitPeriod(orgId, period, userId, notes) {
    try {
        // 1. Check if period already committed
        const { data: existingCommit } = await supabase
            .from('period_commits')
            .select('id')
            .eq('organization_id', orgId)
            .eq('period_year', period.year)
            .eq('period_quarter', period.quarter)
            .single();
        if (existingCommit) {
            return {
                data: null,
                error: new Error(`Period ${formatPeriod(period)} already committed`),
            };
        }
        // 2. Fetch ALL risks for the organization (active + closed)
        const { data: risks, error: risksError } = await supabase
            .from('risks')
            .select('*')
            .eq('organization_id', orgId)
            .order('risk_code', { ascending: true });
        if (risksError) {
            return { data: null, error: new Error(risksError.message) };
        }
        if (!risks || risks.length === 0) {
            return {
                data: null,
                error: new Error('No risks found to snapshot'),
            };
        }
        // 3. Create risk_history snapshot for EACH risk
        const historySnapshots = [];
        let activeCount = 0;
        let closedCount = 0;
        for (const risk of risks) {
            // Fetch controls for this risk (for snapshot data)
            const { data: riskControls } = await getControlsForRisk(risk.id);
            // Calculate residual risk using the risk ID (function fetches controls internally)
            let residualLikelihood = risk.likelihood_inherent;
            let residualImpact = risk.impact_inherent;
            let residualScore = risk.likelihood_inherent * risk.impact_inherent;
            const { data: residualCalc } = await calculateResidualRisk(risk.id, // Correct: risk ID
            risk.likelihood_inherent, // Correct: inherent likelihood
            risk.impact_inherent // Correct: inherent impact
            );
            if (residualCalc) {
                residualLikelihood = residualCalc.residual_likelihood;
                residualImpact = residualCalc.residual_impact;
                residualScore = residualCalc.residual_score;
            }
            // Count active vs closed
            if (risk.is_active && risk.status !== 'CLOSED') {
                activeCount++;
            }
            else {
                closedCount++;
            }
            // Create snapshot
            historySnapshots.push({
                organization_id: orgId,
                risk_id: risk.id,
                period_year: period.year,
                period_quarter: period.quarter,
                committed_at: new Date().toISOString(),
                committed_by: userId,
                change_type: 'PERIOD_COMMIT',
                // Flattened fields
                risk_code: risk.risk_code,
                risk_title: risk.risk_title,
                risk_description: risk.risk_description,
                category: risk.category,
                division: risk.division,
                department: risk.department,
                owner: risk.owner,
                status: risk.status,
                likelihood_inherent: risk.likelihood_inherent,
                impact_inherent: risk.impact_inherent,
                score_inherent: risk.likelihood_inherent * risk.impact_inherent,
                likelihood_residual: residualLikelihood,
                impact_residual: residualImpact,
                score_residual: residualScore,
                // Full snapshot (optional - for complex fields)
                snapshot_data: {
                    ...risk,
                    controls_count: riskControls?.length || 0,
                    controls: riskControls || [],
                },
            });
        }
        // 4. Insert all snapshots into risk_history
        const { error: insertError } = await supabase
            .from('risk_history')
            .insert(historySnapshots);
        if (insertError) {
            console.error('Insert risk_history error:', insertError);
            return { data: null, error: new Error(insertError.message) };
        }
        // 5. Count related entities (for audit log)
        const { count: controlsCount } = await supabase
            .from('controls')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId);
        const { count: krisCount } = await supabase
            .from('kris')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId);
        const { count: incidentsCount } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('period_year', period.year)
            .eq('period_quarter', period.quarter);
        // 6. Create period_commits audit log entry
        const { data: commitData, error: commitError } = await supabase
            .from('period_commits')
            .insert({
            organization_id: orgId,
            period_year: period.year,
            period_quarter: period.quarter,
            committed_at: new Date().toISOString(),
            committed_by: userId,
            risks_count: risks.length,
            active_risks_count: activeCount,
            closed_risks_count: closedCount,
            controls_count: controlsCount || 0,
            kris_count: krisCount || 0,
            incidents_count: incidentsCount || 0,
            notes,
        })
            .select()
            .single();
        if (commitError) {
            console.error('Create period_commits error:', commitError);
            return { data: null, error: new Error(commitError.message) };
        }
        // 7. Update active_period to next period
        const nextPeriod = getNextPeriod(period);
        await supabase
            .from('active_period')
            .upsert({
            organization_id: orgId,
            current_period_year: nextPeriod.year,
            current_period_quarter: nextPeriod.quarter,
            previous_period_year: period.year,
            previous_period_quarter: period.quarter,
            period_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        console.log(`✅ Period committed: ${formatPeriod(period)} → ${formatPeriod(nextPeriod)}`);
        console.log(`   ${risks.length} risks snapshotted (${activeCount} active, ${closedCount} closed)`);
        return { data: commitData, error: null };
    }
    catch (err) {
        console.error('Unexpected commit period error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
// ============================================================================
// QUERY HISTORICAL SNAPSHOTS
// ============================================================================
/**
 * Get all committed periods for an organization
 */
export async function getCommittedPeriods(orgId) {
    try {
        const { data, error } = await supabase
            .from('period_commits')
            .select('*')
            .eq('organization_id', orgId)
            .order('period_year', { ascending: false })
            .order('period_quarter', { ascending: false });
        if (error) {
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Get historical snapshots for a specific period
 */
export async function getRiskHistoryForPeriod(orgId, period) {
    try {
        const { data, error } = await supabase
            .from('risk_history')
            .select('*')
            .eq('organization_id', orgId)
            .eq('period_year', period.year)
            .eq('period_quarter', period.quarter)
            .eq('change_type', 'PERIOD_COMMIT')
            .order('risk_code', { ascending: true });
        if (error) {
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Get timeline of snapshots for a specific risk across all periods
 */
export async function getRiskTimeline(riskId) {
    try {
        const { data, error } = await supabase
            .from('risk_history')
            .select('*')
            .eq('risk_id', riskId)
            .eq('change_type', 'PERIOD_COMMIT')
            .order('period_year', { ascending: true })
            .order('period_quarter', { ascending: true });
        if (error) {
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
// ============================================================================
// PERIOD COMPARISON
// ============================================================================
/**
 * Compare two period snapshots to identify changes
 */
export async function compareSnapshotPeriods(orgId, period1, period2) {
    try {
        // Get snapshots for both periods
        const { data: snapshot1, error: error1 } = await getRiskHistoryForPeriod(orgId, period1);
        const { data: snapshot2, error: error2 } = await getRiskHistoryForPeriod(orgId, period2);
        if (error1 || error2) {
            return {
                data: null,
                error: new Error(error1?.message || error2?.message || 'Failed to load snapshots'),
            };
        }
        if (!snapshot1 || !snapshot2) {
            return {
                data: null,
                error: new Error('One or both periods have not been committed'),
            };
        }
        // Build comparison
        const risks1Map = new Map(snapshot1.map((r) => [r.risk_code, r]));
        const risks2Map = new Map(snapshot2.map((r) => [r.risk_code, r]));
        const comparison = {
            period1,
            period2,
            risk_count_change: snapshot2.length - snapshot1.length,
            risk_count_period1: snapshot1.length,
            risk_count_period2: snapshot2.length,
            new_risks: [],
            closed_risks: [],
            risk_changes: [],
            score_changes: {
                avg_inherent_change: 0,
                avg_residual_change: 0,
                avg_inherent_period1: 0,
                avg_inherent_period2: 0,
                avg_residual_period1: 0,
                avg_residual_period2: 0,
            },
        };
        // Find new risks (in period2 but not in period1)
        snapshot2.forEach((risk2) => {
            if (!risks1Map.has(risk2.risk_code)) {
                comparison.new_risks.push(risk2);
            }
        });
        // Find closed risks (in period1 but not in period2)
        snapshot1.forEach((risk1) => {
            if (!risks2Map.has(risk1.risk_code)) {
                comparison.closed_risks.push(risk1);
            }
        });
        // Find changed risks
        snapshot2.forEach((risk2) => {
            const risk1 = risks1Map.get(risk2.risk_code);
            if (risk1) {
                const likelihoodChange = risk2.likelihood_inherent - risk1.likelihood_inherent;
                const impactChange = risk2.impact_inherent - risk1.impact_inherent;
                const scoreChange = risk2.score_inherent - risk1.score_inherent;
                if (likelihoodChange !== 0 ||
                    impactChange !== 0 ||
                    risk1.status !== risk2.status) {
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
        // Calculate score averages
        const avgInherent1 = snapshot1.reduce((sum, r) => sum + r.score_inherent, 0) /
            snapshot1.length;
        const avgInherent2 = snapshot2.reduce((sum, r) => sum + r.score_inherent, 0) /
            snapshot2.length;
        const avgResidual1 = snapshot1.reduce((sum, r) => sum + (r.score_residual || r.score_inherent), 0) /
            snapshot1.length;
        const avgResidual2 = snapshot2.reduce((sum, r) => sum + (r.score_residual || r.score_inherent), 0) /
            snapshot2.length;
        comparison.score_changes = {
            avg_inherent_period1: Math.round(avgInherent1 * 10) / 10,
            avg_inherent_period2: Math.round(avgInherent2 * 10) / 10,
            avg_inherent_change: Math.round((avgInherent2 - avgInherent1) * 10) / 10,
            avg_residual_period1: Math.round(avgResidual1 * 10) / 10,
            avg_residual_period2: Math.round(avgResidual2 * 10) / 10,
            avg_residual_change: Math.round((avgResidual2 - avgResidual1) * 10) / 10,
        };
        return { data: comparison, error: null };
    }
    catch (err) {
        console.error('Compare periods error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
// ============================================================================
// PERIOD OPTIONS (for dropdowns)
// ============================================================================
/**
 * Generate period options for dropdowns (last 3 years + next year)
 */
export function generatePeriodOptions() {
    const currentYear = new Date().getFullYear();
    const periods = [];
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
        for (let quarter = 1; quarter <= 4; quarter++) {
            periods.push({ year, quarter });
        }
    }
    return periods.reverse(); // Most recent first
}
/**
 * Get trend data across all committed periods
 */
export async function getPeriodTrends(orgId) {
    try {
        // Get all committed periods
        const { data: committedPeriods, error: periodsError } = await getCommittedPeriods(orgId);
        if (periodsError) {
            return { data: null, error: periodsError };
        }
        if (!committedPeriods || committedPeriods.length === 0) {
            return { data: [], error: null };
        }
        // Build trend data for each period
        const trends = [];
        for (const commit of committedPeriods) {
            const period = {
                year: commit.period_year,
                quarter: commit.period_quarter,
            };
            // Get risk history for this period
            const { data: history, error: historyError } = await getRiskHistoryForPeriod(orgId, period);
            if (historyError || !history) {
                console.error(`Failed to load history for ${formatPeriod(period)}:`, historyError);
                continue;
            }
            // Calculate metrics
            const totalRisks = history.length;
            const byStatus = {};
            const byLevel = {};
            let totalInherent = 0;
            let totalResidual = 0;
            history.forEach((risk) => {
                // Count by status
                byStatus[risk.status] = (byStatus[risk.status] || 0) + 1;
                // Determine risk level based on residual score
                const score = risk.score_residual || risk.score_inherent;
                let level = 'Low';
                if (score >= 15)
                    level = 'Extreme';
                else if (score >= 10)
                    level = 'High';
                else if (score >= 5)
                    level = 'Medium';
                byLevel[level] = (byLevel[level] || 0) + 1;
                // Sum scores
                totalInherent += risk.score_inherent;
                totalResidual += risk.score_residual || risk.score_inherent;
            });
            trends.push({
                period: formatPeriod(period),
                snapshot_date: commit.committed_at,
                total_risks: totalRisks,
                by_status: byStatus,
                by_level: byLevel,
                avg_inherent_score: totalRisks > 0 ? totalInherent / totalRisks : 0,
                avg_residual_score: totalRisks > 0 ? totalResidual / totalRisks : 0,
                extreme_count: byLevel['Extreme'] || 0,
                high_count: byLevel['High'] || 0,
                medium_count: byLevel['Medium'] || 0,
                low_count: byLevel['Low'] || 0,
                identified_count: byStatus['IDENTIFIED'] || 0,
                under_review_count: byStatus['UNDER_REVIEW'] || 0,
                approved_count: byStatus['APPROVED'] || 0,
                monitoring_count: byStatus['MONITORING'] || 0,
                closed_count: byStatus['CLOSED'] || 0,
            });
        }
        // Sort by period (chronological order)
        trends.sort((a, b) => {
            const periodA = parsePeriod(a.period);
            const periodB = parsePeriod(b.period);
            if (!periodA || !periodB)
                return 0;
            return comparePeriods(periodA, periodB);
        });
        return { data: trends, error: null };
    }
    catch (err) {
        console.error('Get period trends error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to get period trends'),
        };
    }
}
/**
 * Analyze risk migrations between two periods
 */
export async function analyzeRiskMigrations(orgId, periodStr1, periodStr2) {
    try {
        const period1 = parsePeriod(periodStr1);
        const period2 = parsePeriod(periodStr2);
        if (!period1 || !period2) {
            return { data: null, error: new Error('Invalid period format') };
        }
        // Get risk history for both periods
        const [result1, result2] = await Promise.all([
            getRiskHistoryForPeriod(orgId, period1),
            getRiskHistoryForPeriod(orgId, period2),
        ]);
        if (result1.error || result2.error) {
            return {
                data: null,
                error: new Error('Failed to load risk history for comparison'),
            };
        }
        const history1 = result1.data || [];
        const history2 = result2.data || [];
        // Create map of risk_id -> risk for period 1
        const period1Map = new Map(history1.map((r) => [r.risk_id, r]));
        // Find risks that exist in both periods and have changed levels
        const migrations = [];
        history2.forEach((risk2) => {
            const risk1 = period1Map.get(risk2.risk_id);
            if (!risk1)
                return; // Risk didn't exist in period 1
            const score1 = risk1.score_residual || risk1.score_inherent;
            const score2 = risk2.score_residual || risk2.score_inherent;
            // Determine levels
            const getLevel = (score) => {
                if (score >= 15)
                    return 'Extreme';
                if (score >= 10)
                    return 'High';
                if (score >= 5)
                    return 'Medium';
                return 'Low';
            };
            const level1 = getLevel(score1);
            const level2 = getLevel(score2);
            // Only record if level changed
            if (level1 !== level2) {
                migrations.push({
                    risk_code: risk2.risk_code,
                    risk_title: risk2.risk_title,
                    from_level: level1,
                    to_level: level2,
                    from_score: score1,
                    to_score: score2,
                });
            }
        });
        return { data: migrations, error: null };
    }
    catch (err) {
        console.error('Analyze risk migrations error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to analyze migrations'),
        };
    }
}
