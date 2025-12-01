/**
 * EnhancedTrendsView Component
 *
 * Comprehensive period-over-period trend analysis with multiple chart types
 * Shows risk count trends, status distribution, level migration, and detailed comparisons
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
  getPeriodTrends,
  analyzeRiskMigrations,
  getAvailableSnapshots,
  type PeriodTrendData,
  type RiskMigration,
} from '@/lib/periods';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

export default function EnhancedTrendsView() {
  const { profile } = useAuth();
  const [trendData, setTrendData] = useState<PeriodTrendData[]>([]);
  const [migrations, setMigrations] = useState<RiskMigration[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [selectedPeriod1, setSelectedPeriod1] = useState<string>('');
  const [selectedPeriod2, setSelectedPeriod2] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      loadData();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedPeriod1 && selectedPeriod2 && profile?.organization_id) {
      loadMigrations();
    }
  }, [selectedPeriod1, selectedPeriod2, profile]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const orgId = profile?.organization_id;
      if (!orgId) throw new Error('No organization ID');

      // Load trend data
      const { data: trends, error: trendsError } = await getPeriodTrends(orgId);
      if (trendsError) throw trendsError;

      setTrendData(trends || []);

      // Load available periods
      const { data: snapshots } = await getAvailableSnapshots(orgId);
      if (snapshots && snapshots.length > 0) {
        const periods = snapshots.map((s) => s.period);
        setAvailablePeriods(periods);

        // Auto-select last two periods for migration analysis
        if (periods.length >= 2) {
          setSelectedPeriod1(periods[periods.length - 2]);
          setSelectedPeriod2(periods[periods.length - 1]);
        }
      }
    } catch (err) {
      console.error('Trend load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trend data');
    } finally {
      setLoading(false);
    }
  }

  async function loadMigrations() {
    if (!profile?.organization_id || !selectedPeriod1 || !selectedPeriod2) return;

    const { data, error: migError } = await analyzeRiskMigrations(
      profile.organization_id,
      selectedPeriod1,
      selectedPeriod2
    );

    if (migError) {
      console.error('Migration analysis error:', migError);
    } else {
      setMigrations(data || []);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading trend analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (trendData.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No historical data available. Commit periods in the Admin Panel to start tracking
          trends.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate summary metrics
  const latestPeriod = trendData[trendData.length - 1];
  const previousPeriod = trendData.length > 1 ? trendData[trendData.length - 2] : null;

  const riskCountChange = previousPeriod
    ? latestPeriod.total_risks - previousPeriod.total_risks
    : 0;
  const riskCountChangePercent = previousPeriod && previousPeriod.total_risks > 0
    ? ((riskCountChange / previousPeriod.total_risks) * 100).toFixed(1)
    : '0.0';

  const extremeChange = previousPeriod
    ? latestPeriod.extreme_count - previousPeriod.extreme_count
    : 0;

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-red-600';
    if (change < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Risks</p>
                <p className="text-3xl font-bold">{latestPeriod.total_risks}</p>
              </div>
              {getTrendIcon(riskCountChange)}
            </div>
            {previousPeriod && (
              <p className={`text-sm mt-2 ${getTrendColor(riskCountChange)}`}>
                {riskCountChange > 0 ? '+' : ''}
                {riskCountChange} ({riskCountChangePercent}%)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Extreme Risks</p>
                <p className="text-3xl font-bold text-red-600">
                  {latestPeriod.extreme_count}
                </p>
              </div>
              {getTrendIcon(extremeChange)}
            </div>
            {previousPeriod && (
              <p className={`text-sm mt-2 ${getTrendColor(extremeChange)}`}>
                {extremeChange > 0 ? '+' : ''}
                {extremeChange} from previous
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">High Risks</p>
              <p className="text-3xl font-bold text-orange-600">
                {latestPeriod.high_count}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Periods Tracked</p>
              <p className="text-3xl font-bold text-blue-600">{trendData.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Count Over Time - Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Count Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_risks"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Total Risks"
              />
              <Line
                type="monotone"
                dataKey="extreme_count"
                stroke="#ef4444"
                strokeWidth={2}
                name="Extreme"
              />
              <Line
                type="monotone"
                dataKey="high_count"
                stroke="#f97316"
                strokeWidth={2}
                name="High"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Levels Stacked Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Level Distribution Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="low_count"
                stackId="1"
                stroke="#22c55e"
                fill="#22c55e"
                name="Low"
              />
              <Area
                type="monotone"
                dataKey="medium_count"
                stackId="1"
                stroke="#eab308"
                fill="#eab308"
                name="Medium"
              />
              <Area
                type="monotone"
                dataKey="high_count"
                stackId="1"
                stroke="#f97316"
                fill="#f97316"
                name="High"
              />
              <Area
                type="monotone"
                dataKey="extreme_count"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                name="Extreme"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Status Distribution by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="identified_count" fill="#94a3b8" name="Identified" />
              <Bar dataKey="under_review_count" fill="#60a5fa" name="Under Review" />
              <Bar dataKey="approved_count" fill="#34d399" name="Approved" />
              <Bar dataKey="monitoring_count" fill="#fbbf24" name="Monitoring" />
              <Bar dataKey="closed_count" fill="#9ca3af" name="Closed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Migration Analysis */}
      {availablePeriods.length >= 2 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Risk Migration Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Period Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  From Period:
                </label>
                <Select value={selectedPeriod1} onValueChange={setSelectedPeriod1}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select period" />
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

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  To Period:
                </label>
                <Select value={selectedPeriod2} onValueChange={setSelectedPeriod2}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select period" />
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
            </div>

            {/* Migration Results */}
            {migrations.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">
                  {migrations.length} risk{migrations.length !== 1 ? 's' : ''} changed
                  severity
                </h4>

                {/* Group by direction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Escalations */}
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Escalated (
                      {
                        migrations.filter(
                          (m) =>
                            ['Low', 'Medium'].includes(m.from_level) &&
                            ['High', 'Extreme'].includes(m.to_level)
                        ).length
                      }
                      )
                    </h5>
                    <div className="space-y-2">
                      {migrations
                        .filter(
                          (m) =>
                            ['Low', 'Medium'].includes(m.from_level) &&
                            ['High', 'Extreme'].includes(m.to_level)
                        )
                        .map((migration) => (
                          <div
                            key={migration.risk_code}
                            className="bg-white rounded p-2 text-sm"
                          >
                            <code className="font-mono text-xs text-red-900">
                              {migration.risk_code}
                            </code>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs bg-yellow-100 border-yellow-300"
                              >
                                {migration.from_level}
                              </Badge>
                              <span className="text-gray-400">’</span>
                              <Badge
                                variant="outline"
                                className="text-xs bg-red-100 border-red-300"
                              >
                                {migration.to_level}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* De-escalations */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h5 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      De-escalated (
                      {
                        migrations.filter(
                          (m) =>
                            ['High', 'Extreme'].includes(m.from_level) &&
                            ['Low', 'Medium'].includes(m.to_level)
                        ).length
                      }
                      )
                    </h5>
                    <div className="space-y-2">
                      {migrations
                        .filter(
                          (m) =>
                            ['High', 'Extreme'].includes(m.from_level) &&
                            ['Low', 'Medium'].includes(m.to_level)
                        )
                        .map((migration) => (
                          <div
                            key={migration.risk_code}
                            className="bg-white rounded p-2 text-sm"
                          >
                            <code className="font-mono text-xs text-green-900">
                              {migration.risk_code}
                            </code>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs bg-red-100 border-red-300"
                              >
                                {migration.from_level}
                              </Badge>
                              <span className="text-gray-400">’</span>
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-100 border-green-300"
                              >
                                {migration.to_level}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">
                No risk level changes detected between these periods
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Period Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Period-by-Period Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Period</th>
                  <th className="text-right p-2 font-semibold">Total</th>
                  <th className="text-right p-2 font-semibold text-red-600">Extreme</th>
                  <th className="text-right p-2 font-semibold text-orange-600">High</th>
                  <th className="text-right p-2 font-semibold text-yellow-600">
                    Medium
                  </th>
                  <th className="text-right p-2 font-semibold text-green-600">Low</th>
                  <th className="text-right p-2 font-semibold text-gray-600">
                    Closed
                  </th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((period, index) => {
                  const prev = index > 0 ? trendData[index - 1] : null;
                  const totalChange = prev
                    ? period.total_risks - prev.total_risks
                    : 0;

                  return (
                    <tr key={period.period} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{period.period}</td>
                      <td className="text-right p-2">
                        {period.total_risks}
                        {prev && totalChange !== 0 && (
                          <span
                            className={`ml-2 text-xs ${
                              totalChange > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            ({totalChange > 0 ? '+' : ''}
                            {totalChange})
                          </span>
                        )}
                      </td>
                      <td className="text-right p-2 text-red-600">
                        {period.extreme_count}
                      </td>
                      <td className="text-right p-2 text-orange-600">
                        {period.high_count}
                      </td>
                      <td className="text-right p-2 text-yellow-600">
                        {period.medium_count}
                      </td>
                      <td className="text-right p-2 text-green-600">
                        {period.low_count}
                      </td>
                      <td className="text-right p-2 text-gray-600">
                        {period.closed_count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
