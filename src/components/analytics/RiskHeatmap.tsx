/**
 * RiskHeatmap Component
 *
 * Interactive 5x5 or 6x6 risk matrix heatmap visualization
 * showing likelihood vs impact with risk counts and details
 */

import { useState, useEffect } from 'react';
import { getHeatmapData, getRiskLevelColor, type HeatmapCell } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface RiskHeatmapProps {
  matrixSize?: 5 | 6;
}

export default function RiskHeatmap({ matrixSize = 5 }: RiskHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHeatmapData();
  }, [matrixSize]);

  async function loadHeatmapData() {
    setLoading(true);
    setError(null);

    try {
      const { data, error: heatmapError } = await getHeatmapData(matrixSize);

      if (heatmapError) {
        throw new Error(heatmapError.message);
      }

      setHeatmapData(data || []);
    } catch (err) {
      console.error('Heatmap load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading heatmap...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Create matrix structure
  const matrix: HeatmapCell[][] = [];
  for (let impact = matrixSize; impact >= 1; impact--) {
    const row: HeatmapCell[] = [];
    for (let likelihood = 1; likelihood <= matrixSize; likelihood++) {
      const cell = heatmapData.find(
        (c) => c.likelihood === likelihood && c.impact === impact
      );
      if (cell) {
        row.push(cell);
      }
    }
    matrix.push(row);
  }

  // Get cell opacity based on count
  const getOpacity = (count: number): number => {
    if (count === 0) return 0.1;
    if (count === 1) return 0.3;
    if (count === 2) return 0.5;
    if (count <= 4) return 0.7;
    return 1.0;
  };

  return (
    <div className="space-y-6">
      {/* Heatmap Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Risk Heatmap ({matrixSize}x{matrixSize})</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-400" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Extreme</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {/* Y-axis label */}
            <div className="flex flex-col items-center justify-center">
              <div
                className="text-sm font-semibold text-gray-700 vertical-text"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                IMPACT →
              </div>
            </div>

            {/* Main grid */}
            <div className="flex-1">
              <div className="space-y-1">
                {matrix.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {row.map((cell, colIndex) => {
                      const cellColor = getRiskLevelColor(cell.level);
                      const opacity = getOpacity(cell.count);
                      const isSelected =
                        selectedCell?.likelihood === cell.likelihood &&
                        selectedCell?.impact === cell.impact;

                      return (
                        <button
                          key={`${cell.likelihood}-${cell.impact}`}
                          onClick={() => setSelectedCell(cell)}
                          className={`
                            relative w-20 h-20 rounded-lg border-2 transition-all
                            hover:scale-105 hover:shadow-lg hover:z-10
                            ${
                              isSelected
                                ? 'border-blue-600 shadow-lg scale-105 z-10'
                                : 'border-gray-300'
                            }
                          `}
                          style={{
                            backgroundColor: cellColor,
                            opacity,
                          }}
                        >
                          {/* Cell content */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                            <div className="text-2xl font-bold">
                              {cell.count}
                            </div>
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

              {/* X-axis label */}
              <div className="text-center mt-3">
                <div className="text-sm font-semibold text-gray-700">
                  ← LIKELIHOOD →
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-sm text-gray-600 text-center">
            Click on any cell to view risks in that category
          </div>
        </CardContent>
      </Card>

      {/* Selected Cell Details */}
      {selectedCell && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Badge
                  style={{
                    backgroundColor: getRiskLevelColor(selectedCell.level),
                    color: 'white',
                  }}
                  className="text-lg px-3 py-1"
                >
                  {selectedCell.level}
                </Badge>
                <span>
                  Likelihood: {selectedCell.likelihood} | Impact:{' '}
                  {selectedCell.impact}
                </span>
              </CardTitle>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCell.count === 0 ? (
              <p className="text-gray-600">
                No risks in this category (L{selectedCell.likelihood} × I
                {selectedCell.impact})
              </p>
            ) : (
              <div>
                <p className="text-gray-900 font-medium mb-3">
                  {selectedCell.count} risk{selectedCell.count !== 1 ? 's' : ''}{' '}
                  in this category:
                </p>
                <div className="space-y-2">
                  {selectedCell.risk_codes.map((code) => (
                    <div
                      key={code}
                      className="bg-white rounded-lg px-4 py-2 border border-blue-200"
                    >
                      <code className="text-sm font-mono text-blue-900">
                        {code}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Extreme', 'High', 'Medium', 'Low'].map((level) => {
              const count = heatmapData
                .filter((cell) => cell.level === level)
                .reduce((sum, cell) => sum + cell.count, 0);
              const color = getRiskLevelColor(
                level as 'Low' | 'Medium' | 'High' | 'Extreme'
              );

              return (
                <div
                  key={level}
                  className="bg-white rounded-lg border-2 p-4 text-center"
                  style={{ borderColor: color }}
                >
                  <div
                    className="text-3xl font-bold mb-1"
                    style={{ color }}
                  >
                    {count}
                  </div>
                  <div className="text-sm text-gray-600">{level} Risk</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
