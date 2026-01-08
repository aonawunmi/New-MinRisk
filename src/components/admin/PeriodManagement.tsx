/**
 * Period Management Component - UPDATED for Continuous Risk Architecture
 *
 * Admin interface for committing end-of-period snapshots using the new
 * continuous risk evolution architecture (structured periods, risk_history table).
 */

import { useState, useEffect } from 'react';
import {
  commitPeriod,
  getActivePeriod,
  setActivePeriod as updateActivePeriodInDB,
  getCommittedPeriods,
  formatPeriod,
  generatePeriodOptions,
  type Period,
  type PeriodCommit,
} from '@/lib/periods-v2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Calendar, CheckCircle2, AlertTriangle, TrendingUp, Archive } from 'lucide-react';

interface PeriodManagementProps {
  orgId: string;
  userId: string;
}

export default function PeriodManagement({ orgId, userId }: PeriodManagementProps) {
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [committedPeriods, setCommittedPeriods] = useState<PeriodCommit[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [changingPeriod, setChangingPeriod] = useState(false);

  useEffect(() => {
    loadPeriodData();
  }, [orgId]);

  async function loadPeriodData() {
    setLoading(true);
    try {
      // Get active period
      const { data: activeData, error: activeError } = await getActivePeriod(orgId);
      if (activeError) {
        setError('Failed to load active period');
        console.error(activeError);
      } else if (activeData) {
        setActivePeriod({
          year: activeData.current_period_year,
          quarter: activeData.current_period_quarter,
        });
      }

      // Get committed periods
      const { data: commitsData, error: commitsError } = await getCommittedPeriods(orgId);
      if (commitsError) {
        setError('Failed to load committed periods');
        console.error(commitsError);
      } else {
        setCommittedPeriods(commitsData || []);
      }
    } catch (err) {
      setError('Unexpected error loading period data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCommitPeriod() {
    if (!activePeriod) {
      setError('No active period found');
      return;
    }

    setCommitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: commitError } = await commitPeriod(
        orgId,
        activePeriod,
        userId,
        notes || undefined
      );

      if (commitError) {
        setError(commitError.message);
      } else if (data) {
        setSuccess(
          `Period ${formatPeriod(activePeriod)} committed successfully! ` +
          `${data.risks_count} risks snapshotted ` +
          `(${data.active_risks_count || 0} active, ${data.closed_risks_count || 0} closed).`
        );
        setNotes('');
        await loadPeriodData();
        setShowConfirmDialog(false);
      }
    } catch (err) {
      setError('Unexpected error committing period');
      console.error(err);
    } finally {
      setCommitting(false);
    }
  }

  // Check if current period already committed
  const currentPeriodCommitted = activePeriod
    ? committedPeriods.some(
      (c) => c.period_year === activePeriod.year && c.period_quarter === activePeriod.quarter
    )
    : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Period Management
          </CardTitle>
          <CardDescription>
            Commit end-of-period snapshots to track risk evolution over time using the continuous
            risk architecture
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Active Period Info */}
      {activePeriod && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600 font-medium mb-1">Current Active Period</div>
                {showPeriodSelector ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={`${activePeriod.year}-${activePeriod.quarter}`}
                      onValueChange={async (value) => {
                        const [year, quarter] = value.split('-').map(Number);
                        setChangingPeriod(true);
                        setError(null);
                        try {
                          const result = await updateActivePeriodInDB(orgId, { year, quarter });
                          if (result.error) {
                            throw result.error;
                          }
                          setActivePeriod({ year, quarter });
                          setSuccess(`Active period changed to Q${quarter} ${year}`);
                          setShowPeriodSelector(false);
                          await loadPeriodData();
                        } catch (err: any) {
                          setError(`Failed to change period: ${err.message}`);
                        } finally {
                          setChangingPeriod(false);
                        }
                      }}
                      disabled={changingPeriod}
                    >
                      <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generatePeriodOptions().map((p) => (
                          <SelectItem key={`${p.year}-${p.quarter}`} value={`${p.year}-${p.quarter}`}>
                            Q{p.quarter} {p.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPeriodSelector(false)}
                      disabled={changingPeriod}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-blue-900">
                      {formatPeriod(activePeriod)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPeriodSelector(true)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-100"
                    >
                      Change
                    </Button>
                  </div>
                )}
                {currentPeriodCommitted && (
                  <Badge variant="outline" className="mt-2 border-green-600 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Already Committed
                  </Badge>
                )}
              </div>
              <TrendingUp className="h-12 w-12 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commit New Period */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commit Period Snapshot</CardTitle>
          <CardDescription>
            Take a snapshot of all current risks (active and closed) for historical tracking. The
            continuous risk model ensures risks are preserved and never deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success/Error Messages */}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder={`Add notes for ${activePeriod ? formatPeriod(activePeriod) : 'this period'} (e.g., 'Q4 2025 - Annual risk review completed')`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Commit Button */}
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={committing || currentPeriodCommitted || !activePeriod}
            className="w-full"
            size="lg"
          >
            {committing
              ? 'Committing Period...'
              : currentPeriodCommitted
                ? `${activePeriod ? formatPeriod(activePeriod) : 'Period'} Already Committed`
                : `Commit ${activePeriod ? formatPeriod(activePeriod) : 'Current Period'}`}
          </Button>

          {currentPeriodCommitted && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
              ⚠️ This period has already been committed. Risks continue to be editable in the
              continuous model.
            </p>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
            <div className="font-medium text-blue-900 text-sm">What happens when you commit?</div>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>All current risks are snapshotted to risk_history table</li>
              <li>Residual risk scores are calculated based on active controls</li>
              <li>The active period advances to the next quarter automatically</li>
              <li>
                <strong>Risks are NOT deleted</strong> - they remain editable (continuous model)
              </li>
              <li>Historical snapshots become immutable for reporting</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Existing Commits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Committed Periods ({committedPeriods.length})
          </CardTitle>
          <CardDescription>Historical period snapshots for reporting and comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading period history...</div>
          ) : committedPeriods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No periods committed yet. Commit your first period to start tracking risk evolution.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Committed</TableHead>
                  <TableHead>Total Risks</TableHead>
                  <TableHead>Active / Closed</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead className="max-w-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {committedPeriods
                  .sort((a, b) => {
                    // Sort descending (newest first)
                    if (a.period_year !== b.period_year) return b.period_year - a.period_year;
                    return b.period_quarter - a.period_quarter;
                  })
                  .map((commit) => {
                    const period: Period = {
                      year: commit.period_year,
                      quarter: commit.period_quarter,
                    };
                    return (
                      <TableRow key={commit.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="text-sm">
                            {formatPeriod(period)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(commit.committed_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{commit.risks_count}</span> risks
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="text-green-600 font-medium">
                            {commit.active_risks_count || 0} active
                          </span>
                          {' / '}
                          <span className="text-gray-500">
                            {commit.closed_risks_count || 0} closed
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {commit.controls_count || 0} controls
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-gray-600">
                          {commit.notes || <span className="text-gray-400">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Commit */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Commit Period Snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a snapshot of all current risks for period{' '}
              <strong>{activePeriod ? formatPeriod(activePeriod) : 'unknown'}</strong>.
              <br />
              <br />
              The snapshot will be stored in the risk_history table and the active period will
              automatically advance to the next quarter.
              <br />
              <br />
              <strong>Important:</strong> Risks will remain editable (continuous model), but this
              snapshot will be immutable for historical reporting.
              <br />
              <br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCommitPeriod} disabled={committing}>
              {committing ? 'Committing...' : 'Yes, Commit Period'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
