/**
 * Regulator Dashboard Component
 *
 * Shows aggregated risk view across all organizations assigned to a regulator
 * Includes: metrics, organization summaries, category breakdown, and heatmap
 */

import { useState, useEffect } from 'react';
import {
  getRegulatorDashboardMetrics,
  getOrganizationRiskSummaries,
  getCategoryRiskBreakdown,
  getRegulatorHeatmapData,
  type RegulatorDashboardMetrics,
  type OrganizationRiskSummary,
  type CategoryRiskBreakdown,
  type RegulatorHeatmapData,
} from '@/lib/regulator-analytics';
import { getAllRegulators, type Regulator } from '@/lib/regulators';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RegulatorReportsView from './RegulatorReportsView';
import {
  AlertTriangle,
  Building2,
  TrendingDown,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

export default function RegulatorDashboard() {
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [selectedRegulatorId, setSelectedRegulatorId] = useState<string>('');
  const [metrics, setMetrics] = useState<RegulatorDashboardMetrics | null>(null);
  const [orgSummaries, setOrgSummaries] = useState<OrganizationRiskSummary[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryRiskBreakdown[]>([]);
  const [heatmapData, setHeatmapData] = useState<RegulatorHeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRegulators();
  }, []);

  useEffect(() => {
    if (selectedRegulatorId) {
      loadDashboardData();
    }
  }, [selectedRegulatorId]);

  async function loadRegulators() {
    const { data, error: regError } = await getAllRegulators();
    if (regError) {
      setError('Failed to load regulators');
      return;
    }
    setRegulators(data || []);
    if (data && data.length > 0) {
      setSelectedRegulatorId(data[0].id);
    }
    setLoading(false);
  }

  async function loadDashboardData() {
    if (!selectedRegulatorId) return;

    setLoading(true);
    setError(null);

    try {
      const [metricsResult, summariesResult, categoryResult, heatmapResult] = await Promise.all([
        getRegulatorDashboardMetrics(selectedRegulatorId),
        getOrganizationRiskSummaries(selectedRegulatorId),
        getCategoryRiskBreakdown(selectedRegulatorId),
        getRegulatorHeatmapData(selectedRegulatorId),
      ]);

      if (metricsResult.error) throw metricsResult.error;
      if (summariesResult.error) throw summariesResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (heatmapResult.error) throw heatmapResult.error;

      setMetrics(metricsResult.data);
      setOrgSummaries(summariesResult.data || []);
      setCategoryBreakdown(categoryResult.data || []);
      setHeatmapData(heatmapResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  const selectedRegulator = regulators.find(r => r.id === selectedRegulatorId);

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  }

  if (loading && regulators.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Oversight Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Cross-organization risk monitoring and analysis
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">📊 Risk Overview</TabsTrigger>
          <TabsTrigger value="reports">📄 Submitted Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="flex items-center justify-end">
            <div className="w-64">
              <Select value={selectedRegulatorId} onValueChange={setSelectedRegulatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select regulator" />
                </SelectTrigger>
                <SelectContent>
                  {regulators.map(reg => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.name} ({reg.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedRegulator && (
            <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics?.total_organizations || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Under {selectedRegulator.code} oversight
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Total Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics?.total_risks || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active open risks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Critical & High
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {(metrics?.critical_risks || 0) + (metrics?.high_risks || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.critical_risks || 0} critical, {metrics?.high_risks || 0} high
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Risk Mitigation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {metrics && metrics.avg_inherent_score > 0
                    ? Math.round(
                        ((metrics.avg_inherent_score - metrics.avg_residual_score) /
                          metrics.avg_inherent_score) *
                          100
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average risk reduction
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Organization Summaries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Risk Profiles</CardTitle>
              <CardDescription>
                Risk summary for each organization under {selectedRegulator.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgSummaries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No organizations assigned to this regulator
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Total Risks</TableHead>
                      <TableHead className="text-right">Critical</TableHead>
                      <TableHead className="text-right">High</TableHead>
                      <TableHead className="text-right">Avg Inherent</TableHead>
                      <TableHead className="text-right">Avg Residual</TableHead>
                      <TableHead className="text-right">Reduction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgSummaries.map(org => (
                      <TableRow key={org.organization_id}>
                        <TableCell className="font-medium">{org.organization_name}</TableCell>
                        <TableCell>
                          {org.institution_type && (
                            <Badge variant="secondary">{org.institution_type}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{org.total_risks}</TableCell>
                        <TableCell className="text-right">
                          {org.critical_risks > 0 && (
                            <span className="text-red-600 font-semibold">{org.critical_risks}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {org.high_risks > 0 && (
                            <span className="text-orange-600 font-semibold">{org.high_risks}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{org.avg_inherent_score.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{org.avg_residual_score.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 font-semibold">
                            {org.risk_reduction_percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Category Analysis</CardTitle>
              <CardDescription>
                Risks by master category across all organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No risk data available
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total Risks</TableHead>
                      <TableHead className="text-right">Critical</TableHead>
                      <TableHead className="text-right">High</TableHead>
                      <TableHead className="text-right">Avg Inherent</TableHead>
                      <TableHead className="text-right">Avg Residual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryBreakdown.map(cat => (
                      <TableRow key={cat.master_category_code}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{cat.master_category_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {cat.master_category_code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{cat.risk_count}</TableCell>
                        <TableCell className="text-right">
                          {cat.critical_count > 0 && (
                            <span className="text-red-600 font-semibold">{cat.critical_count}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {cat.high_count > 0 && (
                            <span className="text-orange-600 font-semibold">{cat.high_count}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{cat.avg_inherent.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{cat.avg_residual.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Risk Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Heatmap: Organizations × Categories</CardTitle>
              <CardDescription>
                Visual representation of risk severity across organizations and categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heatmapData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No heatmap data available
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 bg-gray-50 text-left sticky left-0 z-10">
                          Organization
                        </th>
                        {['CREDIT', 'MARKET', 'LIQUIDITY', 'OPERATIONAL', 'LEGAL', 'STRATEGIC', 'ESG'].map(
                          cat => (
                            <th key={cat} className="border p-2 bg-gray-50 text-center text-xs">
                              {cat}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.map((org, idx) => (
                        <tr key={idx}>
                          <td className="border p-2 font-medium sticky left-0 bg-white z-10">
                            <div>
                              <div className="text-sm">{org.organization_name}</div>
                              {org.institution_type && (
                                <div className="text-xs text-muted-foreground">
                                  {org.institution_type}
                                </div>
                              )}
                            </div>
                          </td>
                          {['CREDIT', 'MARKET', 'LIQUIDITY', 'OPERATIONAL', 'LEGAL', 'STRATEGIC', 'ESG'].map(
                            cat => {
                              const catData = org.category_scores[cat];
                              return (
                                <td
                                  key={cat}
                                  className={`border p-2 text-center ${
                                    catData ? getSeverityColor(catData.severity) : 'bg-gray-100'
                                  }`}
                                >
                                  {catData && (
                                    <div className="text-white font-semibold">
                                      <div className="text-lg">{catData.risk_count}</div>
                                      <div className="text-xs">{catData.avg_score.toFixed(1)}</div>
                                    </div>
                                  )}
                                </td>
                              );
                            }
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="font-medium">Legend:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-600"></div>
                      <span>Critical</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500"></div>
                      <span>High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500"></div>
                      <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500"></div>
                      <span>Low</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </>
        )}
        </TabsContent>

        <TabsContent value="reports">
          <RegulatorReportsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
