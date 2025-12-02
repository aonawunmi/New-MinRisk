/**
 * Risk History View Component
 *
 * Displays historical risk snapshots by quarter with heatmap visualization.
 * Shows risks as they existed at period boundaries (immutable historical view).
 */

import { useState, useEffect } from 'react';
import {
  getCommittedPeriods,
  getRiskHistoryForPeriod,
  formatPeriod,
  type Period,
  type RiskHistorySnapshot,
  type PeriodCommit,
} from '@/lib/periods-v2';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { History, Calendar, TrendingUp, AlertCircle, Archive } from 'lucide-react';

export default function RiskHistoryView() {
  const { profile } = useAuth();
  const [committedPeriods, setCommittedPeriods] = useState<PeriodCommit[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [riskSnapshots, setRiskSnapshots] = useState<RiskHistorySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      loadCommittedPeriods();
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    if (selectedPeriod && profile?.organization_id) {
      loadRiskHistory();
    }
  }, [selectedPeriod, profile?.organization_id]);

  async function loadCommittedPeriods() {
    if (!profile?.organization_id) return;

    try {
      const { data, error: loadError } = await getCommittedPeriods(profile.organization_id);
      if (loadError) {
        setError('Failed to load committed periods');
        console.error(loadError);
      } else if (data && data.length > 0) {
        setCommittedPeriods(data);
        // Auto-select most recent period
        const mostRecent = data.sort((a, b) => {
          if (a.period_year !== b.period_year) return b.period_year - a.period_year;
          return b.period_quarter - a.period_quarter;
        })[0];
        setSelectedPeriod({
          year: mostRecent.period_year,
          quarter: mostRecent.period_quarter,
        });
      }
    } catch (err) {
      setError('Unexpected error loading periods');
      console.error(err);
    }
  }

  async function loadRiskHistory() {
    if (!selectedPeriod || !profile?.organization_id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await getRiskHistoryForPeriod(
        profile.organization_id,
        selectedPeriod
      );

      if (loadError) {
        setError('Failed to load risk history');
        console.error(loadError);
      } else {
        setRiskSnapshots(data || []);
      }
    } catch (err) {
      setError('Unexpected error loading risk history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getRiskLevel(score: number): { label: string; color: string } {
    if (score >= 15) return { label: 'EXTREME', color: 'bg-red-600 text-white' };
    if (score >= 10) return { label: 'HIGH', color: 'bg-orange-500 text-white' };
    if (score >= 5) return { label: 'MEDIUM', color: 'bg-yellow-500 text-white' };
    return { label: 'LOW', color: 'bg-green-500 text-white' };
  }

  function calculateStats(snapshots: RiskHistorySnapshot[]) {
    const total = snapshots.length;
    const byStatus = snapshots.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byLevel = snapshots.reduce((acc, s) => {
      const level = getRiskLevel(s.score_residual || s.score_inherent).label;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgInherent =
      total > 0
        ? snapshots.reduce((sum, s) => sum + s.score_inherent, 0) / total
        : 0;

    const avgResidual =
      total > 0
        ? snapshots.reduce((sum, s) => sum + (s.score_residual || s.score_inherent), 0) /
              total
        : 0;

    return {
      total,
      byStatus,
      byLevel,
      avgInherent,
      avgResidual,
    };
  }

  const stats = riskSnapshots.length > 0 ? calculateStats(riskSnapshots) : null;
  const selectedCommit = committedPeriods.find(
    (c) => c.period_year === selectedPeriod?.year && c.period_quarter === selectedPeriod?.quarter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Risk History
          </CardTitle>
          <CardDescription>
            View historical risk snapshots by quarter. Historical data is immutable and shows risks
            as they existed at period boundaries.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          {committedPeriods.length === 0 ? (
            <Alert>
              <Archive className="h-4 w-4" />
              <AlertDescription>
                No historical periods available yet. Commit your first period in the Period
                Management section to start tracking risk evolution.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Period</label>
                  <Select
                    value={selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.quarter}` : ''}
                    onValueChange={(value) => {
                      const [year, quarter] = value.split('-').map(Number);
                      setSelectedPeriod({ year, quarter });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a period" />
                    </SelectTrigger>
                    <SelectContent>
                      {committedPeriods
                        .sort((a, b) => {
                          if (a.period_year !== b.period_year)
                            return b.period_year - a.period_year;
                          return b.period_quarter - a.period_quarter;
                        })
                        .map((commit) => (
                          <SelectItem
                            key={commit.id}
                            value={`${commit.period_year}-${commit.period_quarter}`}
                          >
                            {formatPeriod({
                              year: commit.period_year,
                              quarter: commit.period_quarter,
                            })}{' '}
                            ({commit.risks_count} risks)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCommit && (
                  <div className="text-sm text-gray-600">
                    <div>
                      <strong>Committed:</strong>{' '}
                      {new Date(selectedCommit.committed_at).toLocaleDateString()}
                    </div>
                    {selectedCommit.notes && (
                      <div className="text-xs text-gray-500 mt-1">
                        <strong>Notes:</strong> {selectedCommit.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {selectedPeriod && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Total Risks</div>
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-2">
                Active: {stats.byStatus['OPEN'] || 0} | Closed: {stats.byStatus['CLOSED'] || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Avg Inherent Risk</div>
              <div className="text-3xl font-bold text-red-600">{stats.avgInherent.toFixed(1)}</div>
              <div className="text-xs text-gray-500 mt-2">Before controls</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Avg Residual Risk</div>
              <div className="text-3xl font-bold text-orange-600">{stats.avgResidual.toFixed(1)}</div>
              <div className="text-xs text-gray-500 mt-2">After controls</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Risk Reduction</div>
              <div className="text-3xl font-bold text-green-600">
                {stats.avgInherent > 0
                  ? Math.round(((stats.avgInherent - stats.avgResidual) / stats.avgInherent) * 100)
                  : 0}
                %
              </div>
              <div className="text-xs text-gray-500 mt-2">Control Impact</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Level Distribution */}
      {selectedPeriod && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Risk Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center">
              {Object.entries(stats.byLevel)
                .sort(([a], [b]) => {
                  const order = ['EXTREME', 'HIGH', 'MEDIUM', 'LOW'];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map(([level, count]) => {
                  const levelInfo = getRiskLevel(level === 'EXTREME' ? 20 : level === 'HIGH' ? 12 : level === 'MEDIUM' ? 7 : 3);
                  return (
                    <Badge key={level} className={`${levelInfo.color} px-4 py-2`}>
                      {level}: {count}
                    </Badge>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Risk Table */}
      {selectedPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Risks as of {selectedPeriod && formatPeriod(selectedPeriod)}
            </CardTitle>
            <CardDescription>Read-only historical snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading risk history...</div>
            ) : riskSnapshots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No risk snapshots found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Inherent (L×I)</TableHead>
                      <TableHead>Residual (L×I)</TableHead>
                      <TableHead>Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskSnapshots
                      .sort((a, b) => {
                        const scoreA = a.score_residual || a.score_inherent;
                        const scoreB = b.score_residual || b.score_inherent;
                        return scoreB - scoreA;
                      })
                      .map((snapshot) => {
                        const residualScore = snapshot.score_residual || snapshot.score_inherent;
                        const level = getRiskLevel(residualScore);

                        return (
                          <TableRow key={snapshot.id}>
                            <TableCell className="font-mono text-sm">
                              {snapshot.risk_code}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {snapshot.risk_title}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {snapshot.category || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  snapshot.status === 'OPEN'
                                    ? 'border-green-500 text-green-700'
                                    : 'border-gray-400 text-gray-600'
                                }
                              >
                                {snapshot.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {snapshot.likelihood_inherent} × {snapshot.impact_inherent} ={' '}
                              <span className="font-semibold">{snapshot.score_inherent}</span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {snapshot.likelihood_residual || snapshot.likelihood_inherent} ×{' '}
                              {snapshot.impact_residual || snapshot.impact_inherent} ={' '}
                              <span className="font-semibold">{residualScore}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={level.color}>{level.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
