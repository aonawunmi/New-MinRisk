/**
 * SEC Submission Tracker Component
 *
 * Regulator-side view showing quarterly submission compliance tracking
 * across all Capital Market Operators (CMOs). Part of the SEC regulatory
 * oversight portal for the Nigerian Securities and Exchange Commission.
 *
 * Features:
 * - Period selector with dynamically generated last 4 quarters
 * - Current deadline display with countdown
 * - Organization submission status table with color-coded rows
 * - Status filters (All, Pending, Submitted, Under Review, Approved, Overdue)
 * - Compliance metrics cards
 * - Set Deadline dialog for regulator admins
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type SecSubmission,
  type SecSubmissionDeadline,
  getAllSubmissionsForRegulator,
  getSubmissionComplianceStats,
  getCurrentDeadline,
  getDeadlines,
  setDeadline,
  getCurrentPeriod,
} from '@/lib/sec-submissions';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  Calendar,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Send,
  Eye,
  Timer,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface SECSubmissionTrackerProps {
  regulatorId: string;
}

interface AssignedOrg {
  organization_id: string;
  organization_name: string;
  institution_type: string | null;
}

type StatusFilter = 'all' | 'pending' | 'submitted' | 'under_review' | 'approved' | 'overdue';

interface ComplianceStats {
  total_orgs: number;
  submitted: number;
  approved: number;
  pending_review: number;
  revision_requested: number;
  not_submitted: number;
  overdue: number;
  compliance_rate: number;
}

interface OrgSubmissionRow {
  organization_id: string;
  organization_name: string;
  institution_type: string | null;
  period: string;
  status: SecSubmission['status'] | 'not_submitted';
  submitted_at: string | null;
  days_relative: number | null; // negative = days before deadline, positive = days past
  submission?: SecSubmission;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate the last N quarter period strings from the current date.
 * e.g. ["Q1 2026", "Q4 2025", "Q3 2025", "Q2 2025"]
 */
function generateQuarterOptions(count: number = 4): string[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Determine current quarter
  let quarter: number;
  if (currentMonth < 3) quarter = 1;
  else if (currentMonth < 6) quarter = 2;
  else if (currentMonth < 9) quarter = 3;
  else quarter = 4;

  const quarters: string[] = [];
  let q = quarter;
  let y = currentYear;

  for (let i = 0; i < count; i++) {
    quarters.push(`Q${q} ${y}`);
    q--;
    if (q === 0) {
      q = 4;
      y--;
    }
  }

  return quarters;
}

/**
 * Calculate the number of days between now and a deadline date.
 * Negative = days remaining, Positive = days overdue.
 */
function getDaysRelativeToDeadline(deadlineDate: string, graceDays: number = 0): number {
  const deadline = new Date(deadlineDate);
  deadline.setDate(deadline.getDate() + graceDays);
  const now = new Date();
  const diffMs = now.getTime() - deadline.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a deadline countdown string for display.
 */
function formatCountdown(daysRelative: number): string {
  if (daysRelative === 0) return 'Due today';
  if (daysRelative > 0) return `${daysRelative} day${daysRelative !== 1 ? 's' : ''} overdue`;
  const remaining = Math.abs(daysRelative);
  return `${remaining} day${remaining !== 1 ? 's' : ''} remaining`;
}

// ============================================
// Component
// ============================================

export default function SECSubmissionTracker({ regulatorId }: SECSubmissionTrackerProps) {
  // Period & deadline
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentPeriod());
  const [currentDeadline, setCurrentDeadline] = useState<SecSubmissionDeadline | null>(null);
  const quarterOptions = generateQuarterOptions(4);

  // Submissions & orgs
  const [submissions, setSubmissions] = useState<SecSubmission[]>([]);
  const [assignedOrgs, setAssignedOrgs] = useState<AssignedOrg[]>([]);
  const [orgRows, setOrgRows] = useState<OrgSubmissionRow[]>([]);

  // Stats
  const [stats, setStats] = useState<ComplianceStats | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set Deadline dialog
  const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({
    period: getCurrentPeriod(),
    deadline_date: '',
    grace_period_days: '7',
    notes: '',
  });
  const [savingDeadline, setSavingDeadline] = useState(false);

  // ============================================
  // Data Loading
  // ============================================

  const loadData = useCallback(async () => {
    if (!regulatorId) return;

    setLoading(true);
    setError(null);

    try {
      // Load deadline, submissions, assigned orgs, and compliance stats in parallel
      const [deadlineResult, submissionsResult, orgsResult, statsResult] = await Promise.all([
        getCurrentDeadline(regulatorId),
        getAllSubmissionsForRegulator(regulatorId, selectedPeriod),
        loadAssignedOrgs(regulatorId),
        getSubmissionComplianceStats(regulatorId, selectedPeriod),
      ]);

      if (deadlineResult.error) {
        console.error('Failed to load deadline:', deadlineResult.error);
      }
      setCurrentDeadline(deadlineResult.data);

      if (submissionsResult.error) throw submissionsResult.error;
      setSubmissions(submissionsResult.data || []);

      if (orgsResult.error) throw orgsResult.error;
      setAssignedOrgs(orgsResult.data || []);

      if (statsResult.error) throw statsResult.error;
      setStats(statsResult.data);

      // Build merged rows: all assigned orgs with their submission status
      buildOrgRows(
        orgsResult.data || [],
        submissionsResult.data || [],
        deadlineResult.data,
        selectedPeriod
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submission data');
      console.error('SECSubmissionTracker loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [regulatorId, selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Query organization_regulators to get the full list of CMOs
   * assigned to this regulator, including those with no submissions.
   */
  async function loadAssignedOrgs(regId: string): Promise<{
    data: AssignedOrg[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error: queryError } = await supabase
        .from('organization_regulators')
        .select(`
          organization_id,
          organization:organizations(name, institution_type)
        `)
        .eq('regulator_id', regId);

      if (queryError) return { data: null, error: queryError };

      const orgs: AssignedOrg[] = (data || []).map((row: any) => ({
        organization_id: row.organization_id,
        organization_name: row.organization?.name || 'Unknown Organization',
        institution_type: row.organization?.institution_type || null,
      }));

      return { data: orgs, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
  }

  /**
   * Merge the assigned orgs list with actual submissions to produce one row per org.
   */
  function buildOrgRows(
    orgs: AssignedOrg[],
    subs: SecSubmission[],
    deadline: SecSubmissionDeadline | null,
    period: string
  ) {
    const subsByOrg = new Map<string, SecSubmission>();
    subs.forEach(s => subsByOrg.set(s.organization_id, s));

    const rows: OrgSubmissionRow[] = orgs.map(org => {
      const sub = subsByOrg.get(org.organization_id);

      let daysRelative: number | null = null;
      if (deadline) {
        if (sub && sub.submitted_at) {
          // Days relative at time of submission
          const submitDate = new Date(sub.submitted_at);
          const deadlineDate = new Date(deadline.deadline_date);
          deadlineDate.setDate(deadlineDate.getDate() + (deadline.grace_period_days || 0));
          daysRelative = Math.ceil(
            (submitDate.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        } else {
          // Days relative from now
          daysRelative = getDaysRelativeToDeadline(
            deadline.deadline_date,
            deadline.grace_period_days
          );
        }
      }

      return {
        organization_id: org.organization_id,
        organization_name: org.organization_name,
        institution_type: org.institution_type,
        period,
        status: sub ? sub.status : 'not_submitted',
        submitted_at: sub?.submitted_at || null,
        days_relative: daysRelative,
        submission: sub,
      };
    });

    // Sort: overdue first, then by org name
    rows.sort((a, b) => {
      // Overdue/not_submitted with past deadline first
      const aOverdue = a.status === 'not_submitted' && a.days_relative !== null && a.days_relative > 0;
      const bOverdue = b.status === 'not_submitted' && b.days_relative !== null && b.days_relative > 0;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return a.organization_name.localeCompare(b.organization_name);
    });

    setOrgRows(rows);
  }

  // ============================================
  // Deadline Management
  // ============================================

  async function handleSetDeadline() {
    if (!deadlineForm.period || !deadlineForm.deadline_date) {
      setError('Period and deadline date are required');
      return;
    }

    setSavingDeadline(true);
    setError(null);
    setSuccess(null);

    const { data, error: deadlineError } = await setDeadline(
      regulatorId,
      deadlineForm.period,
      deadlineForm.deadline_date,
      parseInt(deadlineForm.grace_period_days) || 0,
      deadlineForm.notes || undefined
    );

    setSavingDeadline(false);

    if (deadlineError) {
      setError(`Failed to set deadline: ${deadlineError.message}`);
      return;
    }

    setSuccess(`Deadline set for ${deadlineForm.period}: ${new Date(deadlineForm.deadline_date).toLocaleDateString()}`);
    setDeadlineDialogOpen(false);
    setDeadlineForm({
      period: getCurrentPeriod(),
      deadline_date: '',
      grace_period_days: '7',
      notes: '',
    });

    // Reload data
    loadData();
  }

  // ============================================
  // Status Badge & Color Helpers
  // ============================================

  function getStatusBadge(status: SecSubmission['status'] | 'not_submitted') {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Submitted</Badge>;
      case 'under_review':
        return <Badge className="bg-purple-600 text-white hover:bg-purple-700">Under Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Approved</Badge>;
      case 'revision_requested':
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Revision Requested</Badge>;
      case 'not_submitted':
        return <Badge variant="outline" className="text-muted-foreground">Not Submitted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function getRowClassName(row: OrgSubmissionRow): string {
    const isOverdue = row.days_relative !== null && row.days_relative > 0;
    const isApproaching = row.days_relative !== null && row.days_relative >= -7 && row.days_relative <= 0;

    if (row.status === 'approved') {
      return 'bg-green-50 dark:bg-green-950/20';
    }
    if (row.status === 'not_submitted' && isOverdue) {
      return 'bg-red-50 dark:bg-red-950/20';
    }
    if (row.status === 'draft' && isOverdue) {
      return 'bg-red-50 dark:bg-red-950/20';
    }
    if ((row.status === 'not_submitted' || row.status === 'draft') && isApproaching) {
      return 'bg-yellow-50 dark:bg-yellow-950/20';
    }
    return '';
  }

  function getDaysDisplay(row: OrgSubmissionRow): JSX.Element | null {
    if (row.days_relative === null) return null;

    // For submitted/approved/under_review items, show relative to deadline at submission time
    if (row.submitted_at && row.status !== 'not_submitted' && row.status !== 'draft') {
      if (row.days_relative <= 0) {
        const daysEarly = Math.abs(row.days_relative);
        return (
          <span className="text-green-600 text-sm font-medium">
            {daysEarly === 0 ? 'On time' : `${daysEarly}d early`}
          </span>
        );
      }
      return (
        <span className="text-red-600 text-sm font-medium">
          {row.days_relative}d late
        </span>
      );
    }

    // For not_submitted / draft, show days remaining or overdue
    if (row.days_relative > 0) {
      return (
        <span className="text-red-600 text-sm font-medium">
          {row.days_relative}d overdue
        </span>
      );
    }
    if (row.days_relative === 0) {
      return (
        <span className="text-yellow-600 text-sm font-medium">
          Due today
        </span>
      );
    }
    const remaining = Math.abs(row.days_relative);
    if (remaining <= 7) {
      return (
        <span className="text-yellow-600 text-sm font-medium">
          {remaining}d left
        </span>
      );
    }
    return (
      <span className="text-muted-foreground text-sm">
        {remaining}d left
      </span>
    );
  }

  // ============================================
  // Filtering
  // ============================================

  function getFilteredRows(): OrgSubmissionRow[] {
    if (statusFilter === 'all') return orgRows;

    return orgRows.filter(row => {
      switch (statusFilter) {
        case 'pending':
          return row.status === 'not_submitted' || row.status === 'draft';
        case 'submitted':
          return row.status === 'submitted';
        case 'under_review':
          return row.status === 'under_review';
        case 'approved':
          return row.status === 'approved';
        case 'overdue':
          return (
            (row.status === 'not_submitted' || row.status === 'draft') &&
            row.days_relative !== null &&
            row.days_relative > 0
          );
        default:
          return true;
      }
    });
  }

  const filteredRows = getFilteredRows();

  // ============================================
  // Deadline countdown display
  // ============================================

  function renderDeadlineCountdown() {
    if (!currentDeadline) {
      return (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            No deadline has been set for the current period. Set a deadline to enable compliance tracking.
          </AlertDescription>
        </Alert>
      );
    }

    const daysRelative = getDaysRelativeToDeadline(
      currentDeadline.deadline_date,
      currentDeadline.grace_period_days
    );
    const countdownText = formatCountdown(daysRelative);
    const isOverdue = daysRelative > 0;
    const isApproaching = daysRelative >= -7 && daysRelative <= 0;

    let borderColor = 'border-l-blue-500';
    let iconColor = 'text-blue-600';
    if (isOverdue) {
      borderColor = 'border-l-red-500';
      iconColor = 'text-red-600';
    } else if (isApproaching) {
      borderColor = 'border-l-yellow-500';
      iconColor = 'text-yellow-600';
    }

    const effectiveDeadline = new Date(currentDeadline.deadline_date);
    if (currentDeadline.grace_period_days > 0) {
      effectiveDeadline.setDate(effectiveDeadline.getDate() + currentDeadline.grace_period_days);
    }

    return (
      <Card className={`border-l-4 ${borderColor}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className={`h-6 w-6 ${iconColor}`} />
              <div>
                <p className="font-semibold text-lg">{countdownText}</p>
                <p className="text-sm text-muted-foreground">
                  Deadline: {new Date(currentDeadline.deadline_date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {currentDeadline.grace_period_days > 0 && (
                    <span className="ml-2">
                      (+{currentDeadline.grace_period_days} day grace period, effective{' '}
                      {effectiveDeadline.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      )
                    </span>
                  )}
                </p>
                {currentDeadline.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{currentDeadline.notes}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Period</p>
              <p className="text-lg font-bold">{currentDeadline.period}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================
  // Render
  // ============================================

  if (loading && assignedOrgs.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading submission tracker...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quarterly Submission Tracker</h2>
          <p className="text-muted-foreground mt-1">
            Monitor CMO compliance with quarterly risk profile report submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setDeadlineDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Set Deadline
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Period Selector & Deadline Countdown */}
      <div className="flex items-start gap-4">
        <div className="w-48">
          <Label className="text-sm font-medium mb-1.5 block">Reporting Period</Label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {quarterOptions.map(q => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          {renderDeadlineCountdown()}
        </div>
      </div>

      {/* Compliance Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Total CMOs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_orgs}</div>
              <p className="text-xs text-muted-foreground mt-1">Assigned organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Send className="h-4 w-4" />
                Submitted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.submitted}</div>
              <p className="text-xs text-muted-foreground mt-1">Reports received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground mt-1">No Objection issued</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.pending_review}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting SEC review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground mt-1">Past deadline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Compliance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${
                stats.compliance_rate >= 80
                  ? 'text-green-600'
                  : stats.compliance_rate >= 50
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}>
                {stats.compliance_rate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Submitted or approved</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-1">Filter:</span>
        {([
          { key: 'all', label: 'All', count: orgRows.length },
          { key: 'pending', label: 'Pending', count: orgRows.filter(r => r.status === 'not_submitted' || r.status === 'draft').length },
          { key: 'submitted', label: 'Submitted', count: orgRows.filter(r => r.status === 'submitted').length },
          { key: 'under_review', label: 'Under Review', count: orgRows.filter(r => r.status === 'under_review').length },
          { key: 'approved', label: 'Approved', count: orgRows.filter(r => r.status === 'approved').length },
          { key: 'overdue', label: 'Overdue', count: orgRows.filter(r => (r.status === 'not_submitted' || r.status === 'draft') && r.days_relative !== null && r.days_relative > 0).length },
        ] as { key: StatusFilter; label: string; count: number }[]).map(filter => (
          <Button
            key={filter.key}
            variant={statusFilter === filter.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(filter.key)}
            className={
              statusFilter === filter.key && filter.key === 'overdue'
                ? 'bg-red-600 hover:bg-red-700'
                : ''
            }
          >
            {filter.label}
            {filter.count > 0 && (
              <span className="ml-1.5 text-xs opacity-80">({filter.count})</span>
            )}
          </Button>
        ))}
      </div>

      {/* Submission Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Submissions - {selectedPeriod}</CardTitle>
          <CardDescription>
            Submission status for all CMOs assigned to this regulator
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {orgRows.length === 0
                ? 'No organizations are assigned to this regulator'
                : 'No organizations match the selected filter'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CMO Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead className="text-right">Days to/past Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(row => (
                  <TableRow key={row.organization_id} className={getRowClassName(row)}>
                    <TableCell className="font-medium">{row.organization_name}</TableCell>
                    <TableCell>
                      {row.institution_type ? (
                        <Badge variant="secondary">{row.institution_type}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{row.period}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-sm">
                      {row.submitted_at
                        ? new Date(row.submitted_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '--'}
                    </TableCell>
                    <TableCell className="text-right">
                      {getDaysDisplay(row) || (
                        <span className="text-muted-foreground text-sm">No deadline</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Set Deadline Dialog */}
      <Dialog open={deadlineDialogOpen} onOpenChange={setDeadlineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Submission Deadline</DialogTitle>
            <DialogDescription>
              Define the deadline for quarterly risk profile report submissions.
              All assigned CMOs will be measured against this deadline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deadline-period">Reporting Period</Label>
              <Select
                value={deadlineForm.period}
                onValueChange={(value) =>
                  setDeadlineForm(prev => ({ ...prev, period: value }))
                }
              >
                <SelectTrigger id="deadline-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map(q => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline-date">Deadline Date</Label>
              <Input
                id="deadline-date"
                type="date"
                value={deadlineForm.deadline_date}
                onChange={(e) =>
                  setDeadlineForm(prev => ({ ...prev, deadline_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grace-period">Grace Period (days)</Label>
              <Input
                id="grace-period"
                type="number"
                min="0"
                max="30"
                value={deadlineForm.grace_period_days}
                onChange={(e) =>
                  setDeadlineForm(prev => ({ ...prev, grace_period_days: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Number of days after the deadline before submissions are marked overdue
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline-notes">Notes (optional)</Label>
              <Textarea
                id="deadline-notes"
                placeholder="e.g., Extended deadline due to regulatory changes..."
                value={deadlineForm.notes}
                onChange={(e) =>
                  setDeadlineForm(prev => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeadlineDialogOpen(false)}
              disabled={savingDeadline}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetDeadline}
              disabled={savingDeadline || !deadlineForm.period || !deadlineForm.deadline_date}
            >
              {savingDeadline ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Set Deadline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
