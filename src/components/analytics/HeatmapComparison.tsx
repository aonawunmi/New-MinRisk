/**
 * HeatmapComparison Component
 *
 * Side-by-side comparison of two period snapshots
 * Shows how risk profile evolved between periods
 */

import { useState, useEffect } from 'react';
import { getHeatmapData, getRiskLevelColor, type HeatmapCell } from '@/lib/analytics';
import { getAvailableSnapshots, compareSnapshots, type PeriodComparison } from '@/lib/periods';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, TrendingUp, TrendingDown, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function HeatmapComparison() {
  const { profile } = useAuth();
  const [period1, setPeriod1] = useState<string>('');
  const [period2, setPeriod2] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [heatmap1, setHeatmap1] = useState<HeatmapCell[]>([]);
  const [heatmap2, setHeatmap2] = useState<HeatmapCell[]>([]);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matrixSize = 5;

  // Load available periods on mount
  useEffect(() => {
    if (profile?.organization_id) {
      loadAvailablePeriods();
    }
  }, [profile]);

  // Load heatmaps when both periods selected
  useEffect(() => {
    if (period1 && period2 && profile?.organization_id) {
      loadComparison();
    }
  }, [period1, period2, profile]);

  async function loadAvailablePeriods() {
    if (!profile?.organization_id) return;

    const { data: snapshots } = await getAvailableSnapshots(profile.organization_id);
    if (snapshots && snapshots.length > 0) {
      const periods = snapshots.map((s) => s.period);
      setAvailablePeriods(periods);
      
      // Auto-select last two periods if available
      if (periods.length >= 2) {
        setPeriod1(periods[1]); // Second most recent
        setPeriod2(periods[0]); // Most recent
      } else if (periods.length === 1) {
        setPeriod1(periods[0]);
      }
    }
  }

  async function loadComparison() {
    if (!profile?.organization_id || !period1 || !period2) return;

    setLoading(true);
    setError(null);

    try {
      // Load both heatmaps
      const [result1, result2] = await Promise.all([
        getHeatmapData(matrixSize, period1, profile.organization_id),
        getHeatmapData(matrixSize, period2, profile.organization_id),
      ]);

      if (result1.error || result2.error) {
        throw new Error(result1.error?.message || result2.error?.message || 'Failed to load heatmaps');
      }

      setHeatmap1(result1.data || []);
      setHeatmap2(result2.data || []);

      // Load detailed comparison
      const { data: comparisonData, error: compError } = await compareSnapshots(
        profile.organization_id,
        period1,
        period2
      );

      if (compError) {
        console.error('Comparison error:', compError);
        // Don't fail completely if comparison fails
      } else {
        setComparison(comparisonData);
      }
    } catch (err) {
      console.error('Load comparison error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  }

  // Create matrix structure for a heatmap
  function createMatrix(data: HeatmapCell[]): HeatmapCell[][] {
    const matrix: HeatmapCell[][] = [];
    for (let impact = matrixSize; impact >= 1; impact--) {
      const row: HeatmapCell[] = [];
      for (let likelihood = 1; likelihood <= matrixSize; likelihood++) {
        const cell = data.find(
          (c) => c.likelihood === likelihood && c.impact === impact
        );
        if (cell) {
          row.push(cell);
        } else {
          // Empty cell
          row.push({
            likelihood,
            impact,
            count: 0,
            risk_codes: [],
            level: 'Low',
          });
        }
      }
      matrix.push(row);
    }
    return matrix;
  }

  // Get change indicator color
  function getChangeColor(change: number): string {
    if (change > 0) return 'text-red-600'; // More risks = worse
    if (change < 0) return 'text-green-600'; // Fewer risks = better
    return 'text-gray-600'; // No change
  }

  // Get cell opacity based on count
  const getOpacity = (count: number): number => {
    if (count === 0) return 0.1;
    if (count === 1) return 0.3;
    if (count === 2) return 0.5;
    if (count <= 4) return 0.7;
    return 1.0;
  };

  if (!profile?.organization_id) {
    return (
      <Alert>
        <AlertDescription>Please log in to view period comparison</AlertDescription>
      </Alert>
    );
  }

  if (availablePeriods.length < 2) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Not Enough Period Snapshots
            </h3>
            <p className="text-gray-600 mb-4">
              You need at least 2 committed period snapshots to compare.
            </p>
            <p className="text-sm text-gray-500">
              Go to Admin Panel → Period Management to commit periods.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const matrix1 = createMatrix(heatmap1);
  const matrix2 = createMatrix(heatmap2);

  return (
    <div className="space-y-6">
      {/* Period Selectors */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Period Comparison
          </CardTitle>
          <CardDescription>
            Compare risk profiles between two periods to track changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {/* Period 1 */}
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Period 1 (Earlier):
              </label>
              <Select value={period1} onValueChange={setPeriod1}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select first period" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-6">
              <ArrowRight className="h-6 w-6 text-gray-400" />
            </div>

            {/* Period 2 */}
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Period 2 (Later):
              </label>
              <Select value={period2} onValueChange={setPeriod2}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select second period" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-6">
              <Button onClick={loadComparison} disabled={loading || !period1 || !period2}>
                {loading ? 'Comparing...' : 'Compare'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-600">
              Loading comparison data...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Metrics */}
      {!loading && comparison && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Comparison Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Change */}
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Total Risk Count</div>
                <div className={`text-2xl font-bold ${getChangeColor(comparison.risk_count_change)}`}>
                  {comparison.risk_count_change > 0 ? '+' : ''}
                  {comparison.risk_count_change}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {comparison.risk_count_change > 0 ? 'risks added' : comparison.risk_count_change < 0 ? 'risks reduced' : 'no change'}
                </div>
              </div>

              {/* New Risks */}
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">New Risks</div>
                <div className="text-2xl font-bold text-blue-600">
                  {comparison.new_risks.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">added</div>
              </div>

              {/* Closed Risks */}
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Closed Risks</div>
                <div className="text-2xl font-bold text-green-600">
                  {comparison.closed_risks.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">resolved</div>
              </div>

              {/* Changed Risks */}
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Changed Risks</div>
                <div className="text-2xl font-bold text-amber-600">
                  {comparison.risk_changes.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">modified</div>
              </div>
            </div>

            {/* Score Changes */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Avg Inherent Score Change</div>
                <div className={`text-xl font-bold ${getChangeColor(comparison.score_changes.avg_inherent_change)}`}>
                  {comparison.score_changes.avg_inherent_change > 0 ? '+' : ''}
                  {comparison.score_changes.avg_inherent_change.toFixed(1)}
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Avg Residual Score Change</div>
                <div className={`text-xl font-bold ${getChangeColor(comparison.score_changes.avg_residual_change)}`}>
                  {comparison.score_changes.avg_residual_change > 0 ? '+' : ''}
                  {comparison.score_changes.avg_residual_change.toFixed(1)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-Side Heatmaps */}
      {!loading && period1 && period2 && heatmap1.length > 0 && heatmap2.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Period 1 Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{period1}</span>
                <Badge variant="outline" className="bg-gray-100">Earlier</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {matrix1.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {row.map((cell) => {
                      const cellColor = getRiskLevelColor(cell.level);
                      const opacity = getOpacity(cell.count);

                      return (
                        <div
                          key={`${cell.likelihood}-${cell.impact}`}
                          className="relative w-16 h-16 rounded border border-gray-300"
                          style={{
                            backgroundColor: cellColor,
                            opacity,
                          }}
                        >
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                            <div className="text-xl font-bold">{cell.count}</div>
                            <div className="text-xs opacity-90">
                              {cell.likelihood}×{cell.impact}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Period 2 Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{period2}</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">Later</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {matrix2.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {row.map((cell) => {
                      const cellColor = getRiskLevelColor(cell.level);
                      const cell1 = matrix1[rowIndex].find(
                        (c) => c.likelihood === cell.likelihood && c.impact === cell.impact
                      );
                      const change = cell.count - (cell1?.count || 0);
                      const opacity = getOpacity(cell.count);

                      return (
                        <div
                          key={`${cell.likelihood}-${cell.impact}`}
                          className={`relative w-16 h-16 rounded border-2 ${
                            change > 0 ? 'border-red-500' : change < 0 ? 'border-green-500' : 'border-gray-300'
                          }`}
                          style={{
                            backgroundColor: cellColor,
                            opacity,
                          }}
                        >
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                            <div className="text-xl font-bold">{cell.count}</div>
                            {change !== 0 && (
                              <div className="text-xs font-bold">
                                {change > 0 ? `+${change}` : change}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Changes Details */}
      {!loading && comparison && comparison.risk_changes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Changes Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.risk_changes.map((change) => (
                <div
                  key={change.risk_code}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{change.risk_code}</div>
                      <div className="text-sm text-gray-600">{change.risk_title}</div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {change.likelihood_change !== 0 && (
                        <div className={getChangeColor(change.likelihood_change)}>
                          Likelihood: {change.likelihood_change > 0 ? '+' : ''}
                          {change.likelihood_change}
                        </div>
                      )}
                      {change.impact_change !== 0 && (
                        <div className={getChangeColor(change.impact_change)}>
                          Impact: {change.impact_change > 0 ? '+' : ''}
                          {change.impact_change}
                        </div>
                      )}
                      <div className={`font-bold ${getChangeColor(change.score_change)}`}>
                        Score: {change.score_change > 0 ? '+' : ''}
                        {change.score_change}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Risks */}
      {!loading && comparison && comparison.new_risks.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              New Risks Added ({comparison.new_risks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {comparison.new_risks.map((risk) => (
                <div key={risk.risk_code} className="bg-white rounded-lg p-3 border">
                  <div className="font-medium text-gray-900">{risk.risk_code}</div>
                  <div className="text-sm text-gray-600">{risk.risk_title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Score: {risk.score_inherent} | Status: {risk.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closed Risks */}
      {!loading && comparison && comparison.closed_risks.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Risks Closed/Removed ({comparison.closed_risks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {comparison.closed_risks.map((risk) => (
                <div key={risk.risk_code} className="bg-white rounded-lg p-3 border">
                  <div className="font-medium text-gray-900">{risk.risk_code}</div>
                  <div className="text-sm text-gray-600">{risk.risk_title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Score: {risk.score_inherent} | Status: {risk.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
