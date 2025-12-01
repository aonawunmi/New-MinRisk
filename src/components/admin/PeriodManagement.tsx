/**
 * Period Management Component
 *
 * Admin interface for committing end-of-period snapshots
 * and viewing historical periods.
 */

import { useState, useEffect } from 'react';
import {
  commitPeriod,
  getAvailableSnapshots,
  deleteSnapshot,
  generatePeriodOptions,
  getCurrentPeriod,
  type RiskSnapshot,
} from '@/lib/periods';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PeriodManagementProps {
  orgId: string;
  userId: string;
}

export default function PeriodManagement({ orgId, userId }: PeriodManagementProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentPeriod());
  const [notes, setNotes] = useState('');
  const [snapshots, setSnapshots] = useState<Omit<RiskSnapshot, 'snapshot_data'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<string | null>(null);

  const periodOptions = generatePeriodOptions();

  useEffect(() => {
    loadSnapshots();
  }, [orgId]);

  async function loadSnapshots() {
    setLoading(true);
    const { data, error: loadError } = await getAvailableSnapshots(orgId);

    if (loadError) {
      setError('Failed to load period snapshots');
      console.error(loadError);
    } else {
      setSnapshots(data || []);
    }

    setLoading(false);
  }

  async function handleCommitPeriod() {
    setCommitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: commitError } = await commitPeriod(
        orgId,
        selectedPeriod,
        userId,
        notes || undefined
      );

      if (commitError) {
        setError(commitError.message);
      } else {
        setSuccess(`Period ${selectedPeriod} committed successfully with ${data?.risk_count} risks`);
        setNotes('');
        await loadSnapshots();
        setShowConfirmDialog(false);
      }
    } catch (err) {
      setError('Unexpected error committing period');
      console.error(err);
    } finally {
      setCommitting(false);
    }
  }

  async function handleDeleteSnapshot(snapshotId: string) {
    const { error: deleteError } = await deleteSnapshot(snapshotId);

    if (deleteError) {
      setError('Failed to delete snapshot');
      console.error(deleteError);
    } else {
      setSuccess('Snapshot deleted successfully');
      await loadSnapshots();
      setDeleteConfirmDialog(null);
    }
  }

  function handleDownloadReport(snapshot: Omit<RiskSnapshot, 'snapshot_data'>) {
    // TODO: Implement report download (Phase 1.5)
    alert(`Download report for ${snapshot.period} - Coming soon!`);
  }

  const snapshotExists = snapshots.some((s) => s.period === selectedPeriod);

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
            Commit end-of-period snapshots to track risk evolution over time
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Commit New Period */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commit Period Snapshot</CardTitle>
          <CardDescription>
            Take a snapshot of all current risks for historical tracking and reporting
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

          {/* Period Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Period</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {snapshotExists && (
              <p className="text-sm text-amber-600">
                ⚠️ Snapshot already exists for this period
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes about this period (e.g., 'Q1 2025 - Completed risk review')"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Commit Button */}
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={committing || snapshotExists}
            className="w-full"
          >
            {committing ? 'Committing Period...' : 'Commit Period Snapshot'}
          </Button>

          <p className="text-sm text-gray-500">
            This will create a snapshot of all current risks, including controls and calculated
            residual scores. The snapshot is immutable and cannot be edited.
          </p>
        </CardContent>
      </Card>

      {/* Existing Snapshots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Committed Periods</CardTitle>
          <CardDescription>View and manage historical period snapshots</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading snapshots...</div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No period snapshots yet. Commit your first period to track historical risks.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Snapshot Date</TableHead>
                  <TableHead>Risk Count</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{snapshot.period}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(snapshot.snapshot_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{snapshot.risk_count} risks</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {snapshot.notes || <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(snapshot)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Report
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmDialog(snapshot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
              This will create a snapshot of all current risks for period <strong>{selectedPeriod}</strong>.
              <br />
              <br />
              This snapshot will be immutable and used for historical comparison and reporting.
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

      {/* Confirmation Dialog for Delete */}
      <AlertDialog
        open={deleteConfirmDialog !== null}
        onOpenChange={() => setDeleteConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this period snapshot. This action cannot be undone.
              <br />
              <br />
              Are you sure you want to delete this snapshot?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmDialog && handleDeleteSnapshot(deleteConfirmDialog)}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
