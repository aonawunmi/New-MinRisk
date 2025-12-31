/**
 * Dashboard Component
 *
 * Executive dashboard showing risk metrics, distributions, top risks,
 * alerts, and trends.
 */

import { useState, useEffect } from 'react';
import {
  getDashboardMetrics,
  getTopRisks,
  getRiskDistribution,
  getAlertsSummary,
  getRiskProfileSummary,
  type DashboardMetrics,
  type TopRisk,
  type RiskProfileSummary,
} from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MetricCard from './MetricCard';
import RiskLevelChart from './RiskLevelChart';
import RiskDistributionChart from './RiskDistributionChart';
import TopRisksTable from './TopRisksTable';
import AlertsSummary from './AlertsSummary';
import RiskRankingHeatmap from './RiskRankingHeatmap';
import RiskProfileSummaryTable from './RiskProfileSummaryTable';
import RiskCategoryDrilldown from './RiskCategoryDrilldown';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topRisks, setTopRisks] = useState<TopRisk[]>([]);
  const [levelDistribution, setLevelDistribution] = useState<
    Array<{ name: string; count: number; percentage: number }>
  >([]);
  const [divisionDistribution, setDivisionDistribution] = useState<
    Array<{ name: string; count: number; percentage: number }>
  >([]);
  const [categoryDistribution, setCategoryDistribution] = useState<
    Array<{ name: string; count: number; percentage: number }>
  >([]);
  const [alertsSummary, setAlertsSummary] = useState<{
    kri_alerts: number;
    intelligence_alerts: number;
    total_alerts: number;
    kri_by_level: Record<string, number>;
  } | null>(null);
  const [riskProfileSummary, setRiskProfileSummary] = useState<RiskProfileSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    try {
      // Load all dashboard data in parallel
      const [
        metricsResult,
        topRisksResult,
        levelDistResult,
        divDistResult,
        catDistResult,
        alertsResult,
        profileSummaryResult,
      ] = await Promise.all([
        getDashboardMetrics(),
        getTopRisks(10),
        getRiskDistribution('level'),
        getRiskDistribution('division'),
        getRiskDistribution('category'),
        getAlertsSummary(),
        getRiskProfileSummary(),
      ]);

      // Handle errors
      if (metricsResult.error) throw new Error(metricsResult.error.message);
      if (topRisksResult.error) throw new Error(topRisksResult.error.message);
      if (levelDistResult.error) throw new Error(levelDistResult.error.message);
      if (divDistResult.error) throw new Error(divDistResult.error.message);
      if (catDistResult.error) throw new Error(catDistResult.error.message);
      if (alertsResult.error) throw new Error(alertsResult.error.message);
      if (profileSummaryResult.error) throw new Error(profileSummaryResult.error.message);

      // Set data
      setMetrics(metricsResult.data);
      setTopRisks(topRisksResult.data || []);
      setLevelDistribution(levelDistResult.data || []);
      setDivisionDistribution(divDistResult.data || []);
      setCategoryDistribution(catDistResult.data || []);
      setAlertsSummary(alertsResult.data);
      setRiskProfileSummary(profileSummaryResult.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state
  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">No risk data available</p>
              <p className="text-gray-500 text-sm">
                Start by adding risks in the Risk Register tab
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Risk Dashboard</h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Executive overview of your organization's risk landscape
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm touch-target self-start sm:self-auto"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Key Metrics Row - 2x2 on mobile, 4 across on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Risks"
          value={metrics.total_risks}
          icon="📋"
          color="blue"
        />
        <MetricCard
          title="Avg Inherent Risk"
          value={metrics.avg_inherent_score.toFixed(1)}
          icon="📊"
          color="orange"
        />
        <MetricCard
          title="Avg Residual Risk"
          value={metrics.avg_residual_score.toFixed(1)}
          icon="🎯"
          color="blue"
        />
        <MetricCard
          title="Control Quality"
          value={`${metrics.avg_control_effectiveness}%`}
          icon="🛡️"
          color="green"
          subtitle={`DIME • ${metrics.total_controls} controls`}
        />
      </div>

      {/* 2. Risk Ranking Visualization & Drilldown - stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Heatmap with horizontal scroll on mobile */}
          <div className="mobile-scroll-x -mx-3 px-3 sm:mx-0 sm:px-0">
            <RiskRankingHeatmap
              data={riskProfileSummary}
              onCategoryClick={setSelectedCategory}
            />
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Summary table with horizontal scroll on mobile */}
          <div className="mobile-scroll-x -mx-3 px-3 sm:mx-0 sm:px-0">
            <RiskProfileSummaryTable data={riskProfileSummary} />
          </div>
        </div>
      </div>

      {/* Drilldown Section */}
      {selectedCategory && (
        <RiskCategoryDrilldown
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      {/* Alerts Summary */}
      {alertsSummary && (
        <AlertsSummary
          kriAlerts={alertsSummary.kri_alerts}
          intelligenceAlerts={alertsSummary.intelligence_alerts}
          totalAlerts={alertsSummary.total_alerts}
          kriByLevel={alertsSummary.kri_by_level}
        />
      )}

      {/* Secondary Distribution Charts - stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Risk Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-3">
              {Object.entries(metrics.by_status).map(([status, count]) => {
                const percentage = Math.round((count / metrics.total_risks) * 100);
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium">{status}</span>
                      <span className="text-gray-600">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Risks by Division</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <RiskDistributionChart
              data={divisionDistribution}
              emptyMessage="No division data available"
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Risks Table - horizontal scroll on mobile */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Top 10 Risks (by Inherent Score)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="mobile-scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
            {topRisks.length > 0 ? (
              <TopRisksTable risks={topRisks} />
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No risks to display
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

