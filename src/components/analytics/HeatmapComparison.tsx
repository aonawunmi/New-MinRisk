/**
 * HeatmapComparison Component
 *
 * Side-by-side comparison of two period snapshots
 * Shows how risk profile evolved between periods
 */

import { useState, useEffect } from 'react';
import { getHeatmapData, getRiskLevelColor, type HeatmapCell } from '@/lib/analytics';
import { getCommittedPeriods, getRiskHistoryForPeriod, formatPeriod, type Period } from '@/lib/periods-v2';
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
  const [period1, setPeriod1] = useState<Period | null>(null);
  const [period2, setPeriod2] = useState<Period | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<Period[]>([]);
  const [heatmap1, setHeatmap1] = useState<HeatmapCell[]>([]);
  const [heatmap2, setHeatmap2] = useState<HeatmapCell[]>([]);
  const [comparisonStats, setComparisonStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'inherent' | 'residual'>('inherent');
  const [selectedCell1, setSelectedCell1] = useState<HeatmapCell | null>(null);
  const [selectedCell2, setSelectedCell2] = useState<HeatmapCell | null>(null);

  const matrixSize = 5;

  // Load available periods on mount
  useEffect(() => {
    if (profile?.organization_id) {
      loadAvailablePeriods();
    }
  }, [profile]);

  // Load heatmaps when both periods selected or view type changes
  useEffect(() => {
    if (period1 && period2 && profile?.organization_id) {
      loadComparison();
    }
  }, [period1, period2, viewType, profile]);

  async function loadAvailablePeriods() {
    if (!profile?.organization_id) return;

    const { data: committedPeriods, error } = await getCommittedPeriods(profile.organization_id);
    if (error) {
      console.error('Failed to load committed periods:', error);
      return;
    }

    if (committedPeriods && committedPeriods.length > 0) {
      // Sort periods by year and quarter (most recent first)
      const sortedPeriods = [...committedPeriods].sort((a, b) => {
        if (a.period_year !== b.period_year) return b.period_year - a.period_year;
        return b.period_quarter - a.period_quarter;
      });

      // Extract Period objects
      const periods: Period[] = sortedPeriods.map((cp) => ({
        year: cp.period_year,
        quarter: cp.period_quarter,
      }));

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

    // Prevent comparing same period to itself
    if (period1.year === period2.year && period1.quarter === period2.quarter) {
      setError('Please select two different periods to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load both heatmaps with selected view type
      // Note: getHeatmapData will be updated in Phase 8 to accept Period objects
      // For now, we convert to formatted strings
      const [result1, result2] = await Promise.all([
        getHeatmapData(matrixSize, formatPeriod(period1), profile.organization_id, viewType),
        getHeatmapData(matrixSize, formatPeriod(period2), profile.organization_id, viewType),
      ]);

      if (result1.error || result2.error) {
        throw new Error(result1.error?.message || result2.error?.message || 'Failed to load heatmaps');
      }

      setHeatmap1(result1.data || []);
      setHeatmap2(result2.data || []);

      // Load risk history for both periods to calculate comparison stats
      const [history1, history2] = await Promise.all([
        getRiskHistoryForPeriod(profile.organization_id, period1),
        getRiskHistoryForPeriod(profile.organization_id, period2),
      ]);

      if (!history1.error && !history2.error && history1.data && history2.data) {
        // Calculate comparison statistics
        const stats = {
          period1Count: history1.data.length,
          period2Count: history2.data.length,
          risksAdded: history2.data.length - history1.data.length,
          avgInherent1: history1.data.reduce((sum, r) => sum + r.score_inherent, 0) / history1.data.length || 0,
          avgInherent2: history2.data.reduce((sum, r) => sum + r.score_inherent, 0) / history2.data.length || 0,
          avgResidual1: history1.data.reduce((sum, r) => sum + (r.score_residual || r.score_inherent), 0) / history1.data.length || 0,
          avgResidual2: history2.data.reduce((sum, r) => sum + (r.score_residual || r.score_inherent), 0) / history2.data.length || 0,
        };
        setComparisonStats(stats);
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
        <CardContent className="space-y-4">
          {/* View Type Toggle */}
          <div className="flex items-center justify-center gap-6 py-3 border-b border-blue-200">
            <span className="text-sm font-medium text-gray-700">Risk View:</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewType('inherent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewType === 'inherent'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Inherent Risk
              </button>
              <button
                onClick={() => setViewType('residual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewType === 'residual'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Residual Risk
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {viewType === 'inherent' ? '(Before controls)' : '(After controls)'}
            </div>
          </div>

          {/* Period Selectors */}
          <div className="flex items-center gap-4">
            {/* Period 1 */}
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Period 1 (Earlier):
              </label>
              <Select
                value={period1 ? `${period1.year}-${period1.quarter}` : undefined}
                onValueChange={(value) => {
                  const [year, quarter] = value.split('-').map(Number);
                  setPeriod1({ year, quarter });
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select first period" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map((period) => (
                    <SelectItem key={`${period.year}-${period.quarter}`} value={`${period.year}-${period.quarter}`}>
                      {formatPeriod(period)}
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
              <Select
                value={period2 ? `${period2.year}-${period2.quarter}` : undefined}
                onValueChange={(value) => {
                  const [year, quarter] = value.split('-').map(Number);
                  setPeriod2({ year, quarter });
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select second period" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map((period) => (
                    <SelectItem key={`${period.year}-${period.quarter}`} value={`${period.year}-${period.quarter}`}>
                      {formatPeriod(period)}
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
      {!loading && comparisonStats && period1 && period2 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Comparison Summary: {formatPeriod(period1)} vs {formatPeriod(period2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Change */}
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Total Risk Count Change</div>
                <div className={`text-2xl font-bold ${getChangeColor(comparisonStats.risksAdded)}`}>
                  {comparisonStats.risksAdded > 0 ? '+' : ''}
                  {comparisonStats.risksAdded}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {comparisonStats.risksAdded > 0 ? 'risks added' : comparisonStats.risksAdded < 0 ? 'risks removed' : 'no change'}
                </div>
                <div className="text-xs text-gray-400 mt-2 border-t pt-2">
                  {comparisonStats.period1Count} → {comparisonStats.period2Count} risks
                </div>
              </div>

              {/* Inherent Risk Change */}
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Avg Inherent Risk</div>
                <div className={`text-2xl font-bold ${getChangeColor(comparisonStats.avgInherent2 - comparisonStats.avgInherent1)}`}>
                  {comparisonStats.avgInherent2 - comparisonStats.avgInherent1 > 0 ? '+' : ''}
                  {(comparisonStats.avgInherent2 - comparisonStats.avgInherent1).toFixed(1)}
                </div>
                <div className="text-xs text-gray-400 mt-2 border-t pt-2">
                  {comparisonStats.avgInherent1.toFixed(1)} → {comparisonStats.avgInherent2.toFixed(1)}
                </div>
              </div>

              {/* Residual Risk Change */}
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Avg Residual Risk</div>
                <div className={`text-2xl font-bold ${getChangeColor(comparisonStats.avgResidual2 - comparisonStats.avgResidual1)}`}>
                  {comparisonStats.avgResidual2 - comparisonStats.avgResidual1 > 0 ? '+' : ''}
                  {(comparisonStats.avgResidual2 - comparisonStats.avgResidual1).toFixed(1)}
                </div>
                <div className="text-xs text-gray-400 mt-2 border-t pt-2">
                  {comparisonStats.avgResidual1.toFixed(1)} → {comparisonStats.avgResidual2.toFixed(1)}
                </div>
              </div>

              {/* Risk Reduction Trend */}
              <div className="bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Risk Reduction</div>
                <div className="text-2xl font-bold text-green-600">
                  {comparisonStats.avgResidual2 < comparisonStats.avgInherent2 ?
                    ((comparisonStats.avgInherent2 - comparisonStats.avgResidual2) / comparisonStats.avgInherent2 * 100).toFixed(0) :
                    0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">in {formatPeriod(period2)}</div>
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
                <div className="flex items-center gap-3">
                  <span>{formatPeriod(period1)}</span>
                  <Badge variant="outline" className="bg-gray-100">Earlier</Badge>
                </div>
                <Badge
                  variant="outline"
                  className={viewType === 'inherent' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-green-100 border-green-300 text-green-800'}
                >
                  {viewType === 'inherent' ? 'INHERENT' : 'RESIDUAL'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {matrix1.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {row.map((cell) => {
                      const cellColor = getRiskLevelColor(cell.level);
                      const opacity = getOpacity(cell.count);
                      const isSelected = selectedCell1?.likelihood === cell.likelihood && selectedCell1?.impact === cell.impact;

                      return (
                        <button
                          key={`${cell.likelihood}-${cell.impact}`}
                          onClick={() => setSelectedCell1(cell)}
                          className={`relative w-16 h-16 rounded border-2 transition-all hover:scale-105 hover:shadow-lg hover:z-10 ${
                            isSelected ? 'border-blue-600 shadow-lg scale-105 z-10' : 'border-gray-300'
                          }`}
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
                        </button>
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
                <div className="flex items-center gap-3">
                  <span>{formatPeriod(period2)}</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">Later</Badge>
                </div>
                <Badge
                  variant="outline"
                  className={viewType === 'inherent' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-green-100 border-green-300 text-green-800'}
                >
                  {viewType === 'inherent' ? 'INHERENT' : 'RESIDUAL'}
                </Badge>
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
                      const isSelected = selectedCell2?.likelihood === cell.likelihood && selectedCell2?.impact === cell.impact;

                      return (
                        <button
                          key={`${cell.likelihood}-${cell.impact}`}
                          onClick={() => setSelectedCell2(cell)}
                          className={`relative w-16 h-16 rounded border-2 transition-all hover:scale-105 hover:shadow-lg hover:z-10 ${
                            isSelected
                              ? 'border-blue-600 shadow-lg scale-105 z-10'
                              : change > 0
                              ? 'border-red-500'
                              : change < 0
                              ? 'border-green-500'
                              : 'border-gray-300'
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
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selected Cell Details for Period 1 */}
      {selectedCell1 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Badge
                  style={{
                    backgroundColor: getRiskLevelColor(selectedCell1.level),
                    color: 'white',
                  }}
                  className="text-lg px-3 py-1"
                >
                  {selectedCell1.level}
                </Badge>
                <span>
                  {formatPeriod(period1)} - Likelihood: {selectedCell1.likelihood} | Impact: {selectedCell1.impact}
                </span>
              </CardTitle>
              <button
                onClick={() => setSelectedCell1(null)}
                className="text-gray-500 hover:text-gray-700 text-xl px-2"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCell1.count === 0 ? (
              <p className="text-gray-600">
                No risks in this category (L{selectedCell1.likelihood} × I{selectedCell1.impact})
              </p>
            ) : (
              <div>
                <p className="text-gray-900 font-medium mb-3">
                  {selectedCell1.count} risk{selectedCell1.count !== 1 ? 's' : ''} in this category:
                </p>
                <div className="space-y-2">
                  {selectedCell1.risk_codes.map((code) => (
                    <div
                      key={code}
                      className="bg-white rounded-lg px-4 py-2 border border-blue-200"
                    >
                      <code className="text-sm font-mono text-blue-900">{code}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Cell Details for Period 2 */}
      {selectedCell2 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Badge
                  style={{
                    backgroundColor: getRiskLevelColor(selectedCell2.level),
                    color: 'white',
                  }}
                  className="text-lg px-3 py-1"
                >
                  {selectedCell2.level}
                </Badge>
                <span>
                  {formatPeriod(period2)} - Likelihood: {selectedCell2.likelihood} | Impact: {selectedCell2.impact}
                </span>
              </CardTitle>
              <button
                onClick={() => setSelectedCell2(null)}
                className="text-gray-500 hover:text-gray-700 text-xl px-2"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCell2.count === 0 ? (
              <p className="text-gray-600">
                No risks in this category (L{selectedCell2.likelihood} × I{selectedCell2.impact})
              </p>
            ) : (
              <div>
                <p className="text-gray-900 font-medium mb-3">
                  {selectedCell2.count} risk{selectedCell2.count !== 1 ? 's' : ''} in this category:
                </p>
                <div className="space-y-2">
                  {selectedCell2.risk_codes.map((code) => (
                    <div
                      key={code}
                      className="bg-white rounded-lg px-4 py-2 border border-green-200"
                    >
                      <code className="text-sm font-mono text-green-900">{code}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
