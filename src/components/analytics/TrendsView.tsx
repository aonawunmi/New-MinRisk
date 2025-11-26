/**
 * TrendsView Component
 *
 * Shows risk trends over time periods
 */

import { useState, useEffect } from 'react';
import { getRiskTrends, type TrendData } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TrendsView() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrends();
  }, []);

  async function loadTrends() {
    setLoading(true);
    setError(null);

    try {
      const { data, error: trendsError } = await getRiskTrends();

      if (trendsError) {
        throw new Error(trendsError.message);
      }

      setTrends(data || []);
    } catch (err) {
      console.error('Trends load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading trends...</div>
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

  // No data state
  if (trends.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-2">No trend data available</p>
            <p className="text-gray-500 text-sm">
              Add period information to risks to see trends
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find max values for scaling
  const maxRisks = Math.max(...trends.map((t) => t.total_risks));
  const maxScore = Math.max(...trends.map((t) => t.avg_score));

  return (
    <div className="space-y-6">
      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {trends.map((trend, index) => {
              const riskHeight = (trend.total_risks / maxRisks) * 200;
              const scoreHeight = (trend.avg_score / maxScore) * 200;

              return (
                <div key={trend.period} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">
                      {trend.period}
                    </h4>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">
                        {trend.total_risks} risks
                      </span>
                      <span className="text-gray-600">
                        Avg Score: {trend.avg_score.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div className="flex gap-4 items-end h-52">
                    {/* Total risks bar */}
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-100 rounded-t-lg relative">
                        <div
                          className="bg-blue-500 rounded-t-lg transition-all"
                          style={{ height: `${riskHeight}px` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Total Risks
                      </div>
                    </div>

                    {/* Avg score bar */}
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-100 rounded-t-lg relative">
                        <div
                          className="bg-orange-500 rounded-t-lg transition-all"
                          style={{ height: `${scoreHeight}px` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Avg Score
                      </div>
                    </div>
                  </div>

                  {/* Status breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                    {Object.entries(trend.by_status).map(([status, count]) => (
                      <div
                        key={status}
                        className="bg-gray-50 rounded px-3 py-2 text-sm"
                      >
                        <div className="font-medium">{status}</div>
                        <div className="text-gray-600">{count}</div>
                      </div>
                    ))}
                  </div>

                  {index < trends.length - 1 && (
                    <div className="border-b border-gray-200 pt-4" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">
                {trends.length}
              </div>
              <div className="text-sm text-blue-700">Periods Tracked</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-900">
                {maxRisks}
              </div>
              <div className="text-sm text-green-700">Peak Risks</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-900">
                {maxScore.toFixed(1)}
              </div>
              <div className="text-sm text-orange-700">Highest Avg Score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
