/**
 * Submission Manager Component
 *
 * Main CMO-facing component for managing quarterly SEC Risk Profile Report submissions.
 * Orchestrates the entire submission workflow:
 * - Current Submission: draft/edit/submit quarterly reports
 * - Category Mapping: map internal risk categories to SEC's 5 standard categories
 * - Submission History: view past submissions and their statuses
 *
 * Visible to organization admins (primary_admin, secondary_admin) only.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { isUserAdmin } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Send,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Building2,
  MessageSquare,
} from 'lucide-react';
import {
  type SecSubmission,
  type SecSubmissionNarrative,
  type SecSubmissionDeadline,
  type SecReviewComment,
  getOrCreateSubmission,
  getSubmissionNarratives,
  getCurrentDeadline,
  getCurrentPeriod,
  getPreviousPeriod,
  refreshNarrativeMetrics,
  submitToRegulator,
  updateIntroduction,
  getSubmissionHistory,
  getReviewComments,
} from '@/lib/sec-submissions';
import {
  type SecStandardCategory,
  getSecStandardCategories,
  checkMappingCompleteness,
} from '@/lib/sec-categories';
import type { Regulator } from '@/lib/regulators';
import CategoryMappingConfig from './CategoryMappingConfig';
import NarrativeEditor from './NarrativeEditor';

// ============================================
// Status badge styling
// ============================================

const STATUS_STYLES: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: Send },
  under_review: { label: 'Under Review', color: 'bg-purple-100 text-purple-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  revision_requested: { label: 'Revision Requested', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const Icon = style.icon;
  return (
    <Badge className={`${style.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {style.label}
    </Badge>
  );
}

// ============================================
// Main Component
// ============================================

export default function SubmissionManager() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  const [activeSubTab, setActiveSubTab] = useState('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Regulator info
  const [regulator, setRegulator] = useState<Regulator | null>(null);

  // Current submission state
  const [submission, setSubmission] = useState<SecSubmission | null>(null);
  const [narratives, setNarratives] = useState<SecSubmissionNarrative[]>([]);
  const [secCategories, setSecCategories] = useState<SecStandardCategory[]>([]);
  const [deadline, setDeadline] = useState<SecSubmissionDeadline | null>(null);
  const [reviewComments, setReviewComments] = useState<SecReviewComment[]>([]);
  const [currentPeriod] = useState(getCurrentPeriod());

  // Category mapping completeness
  const [mappingComplete, setMappingComplete] = useState(false);
  const [unmappedCategories, setUnmappedCategories] = useState<string[]>([]);

  // Refreshing / submitting states
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Introduction text
  const [introText, setIntroText] = useState('');
  const [introSaving, setIntroSaving] = useState(false);
  const [introHasChanges, setIntroHasChanges] = useState(false);

  // Submission history
  const [history, setHistory] = useState<SecSubmission[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ============================================
  // Initial data load
  // ============================================

  const loadInitialData = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Check if user is admin
      const adminStatus = await isUserAdmin();
      setIsAdmin(adminStatus);

      // 2. Find the SEC regulator assigned to this organization
      const { data: orgRegs, error: orgRegError } = await supabase
        .from('organization_regulators')
        .select(`
          regulator:regulators(*)
        `)
        .eq('organization_id', organizationId);

      if (orgRegError) {
        setError('Failed to load regulator assignment');
        setLoading(false);
        return;
      }

      // Find the SEC regulator (or use first available)
      let secRegulator: Regulator | null = null;
      if (orgRegs && orgRegs.length > 0) {
        // Prefer SEC regulator
        const secReg = orgRegs.find((r: any) =>
          r.regulator?.code === 'SEC' || r.regulator?.name?.includes('SEC')
        );
        secRegulator = (secReg?.regulator || orgRegs[0]?.regulator) as unknown as Regulator;
      }

      if (!secRegulator) {
        setError('No regulator assigned to your organization. Please contact your administrator to configure regulator assignment.');
        setLoading(false);
        return;
      }

      setRegulator(secRegulator);

      // 3. Load SEC standard categories
      const { data: categories, error: catError } = await getSecStandardCategories();
      if (catError || !categories) {
        setError('Failed to load SEC categories');
        setLoading(false);
        return;
      }
      setSecCategories(categories);

      // 4. Check mapping completeness
      const { data: mappingStatus } = await checkMappingCompleteness(organizationId);
      if (mappingStatus) {
        setMappingComplete(mappingStatus.isComplete);
        setUnmappedCategories(mappingStatus.unmappedCategories);
      }

      // 5. Get or create submission for current period
      const { data: sub, error: subError } = await getOrCreateSubmission(
        organizationId,
        secRegulator.id,
        currentPeriod
      );

      if (subError) {
        setError(`Failed to load submission: ${subError.message}`);
        setLoading(false);
        return;
      }

      if (sub) {
        setSubmission(sub);
        setIntroText(sub.introduction_text || '');

        // 6. Load narratives
        const { data: narrs } = await getSubmissionNarratives(sub.id);
        setNarratives(narrs || []);

        // 7. Load deadline
        const { data: dl } = await getCurrentDeadline(secRegulator.id);
        setDeadline(dl);

        // 8. Load review comments if status requires it
        if (sub.status === 'revision_requested' || sub.status === 'approved') {
          const { data: comments } = await getReviewComments(sub.id);
          setReviewComments(comments || []);
        }

        // 9. If draft, auto-refresh metrics to show latest risk data
        if (sub.status === 'draft' || sub.status === 'revision_requested') {
          await refreshNarrativeMetrics(sub.id, organizationId);
          // Re-fetch narratives with updated metrics
          const { data: updatedNarrs } = await getSubmissionNarratives(sub.id);
          setNarratives(updatedNarrs || []);
        }
      }
    } catch (err) {
      console.error('SubmissionManager load error:', err);
      setError('An unexpected error occurred while loading submission data.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentPeriod]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ============================================
  // Handlers
  // ============================================

  // Refresh risk metrics (pull latest risk data into narrative cards)
  async function handleRefreshMetrics() {
    if (!submission || !organizationId) return;

    setRefreshing(true);
    setError(null);

    const { error: refreshError } = await refreshNarrativeMetrics(submission.id, organizationId);
    if (refreshError) {
      setError(`Failed to refresh metrics: ${refreshError.message}`);
    } else {
      // Re-fetch narratives
      const { data: updatedNarrs } = await getSubmissionNarratives(submission.id);
      setNarratives(updatedNarrs || []);
    }

    setRefreshing(false);
  }

  // Save introduction text
  async function handleSaveIntro() {
    if (!submission) return;

    setIntroSaving(true);
    const { error: saveError } = await updateIntroduction(submission.id, introText);
    if (saveError) {
      setError(`Failed to save introduction: ${saveError.message}`);
    } else {
      setIntroHasChanges(false);
    }
    setIntroSaving(false);
  }

  // Submit to SEC
  async function handleSubmit() {
    if (!submission || !organizationId) return;

    setSubmitting(true);
    setError(null);

    // Save intro first if there are changes
    if (introHasChanges) {
      await updateIntroduction(submission.id, introText);
    }

    const { error: submitError } = await submitToRegulator(submission.id, organizationId);

    if (submitError) {
      setError(`Submission failed: ${submitError.message}`);
      setSubmitting(false);
      setSubmitDialogOpen(false);
      return;
    }

    // Reload submission data to reflect new status
    setSubmitDialogOpen(false);
    setSubmitting(false);
    await loadInitialData();
  }

  // Callback when a narrative is updated (from NarrativeEditor)
  async function handleNarrativeUpdated() {
    if (!submission) return;
    const { data: updatedNarrs } = await getSubmissionNarratives(submission.id);
    setNarratives(updatedNarrs || []);
  }

  // Load submission history
  async function loadHistory() {
    if (!organizationId || !regulator) return;

    setHistoryLoading(true);
    const { data: historyData, error: historyError } = await getSubmissionHistory(
      organizationId,
      regulator.id
    );
    if (historyError) {
      console.error('Failed to load history:', historyError);
    }
    setHistory(historyData || []);
    setHistoryLoading(false);
  }

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    }
  }, [activeSubTab, organizationId, regulator?.id]);

  // ============================================
  // Derived state
  // ============================================

  const isReadOnly = submission?.status !== 'draft' && submission?.status !== 'revision_requested';
  const canSubmit = submission?.status === 'draft' || submission?.status === 'revision_requested';

  // Count narratives that have content
  const narrativesWithContent = narratives.filter(n => n.final_narrative && n.final_narrative.trim().length > 0).length;
  const totalCategories = secCategories.length;
  const allNarrativesFilled = narrativesWithContent === totalCategories && totalCategories > 0;

  // Deadline info
  const deadlineDate = deadline ? new Date(deadline.deadline_date) : null;
  const daysUntilDeadline = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // ============================================
  // Loading / Error states
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading SEC submission data...</span>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SEC Submissions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage quarterly Risk Profile Report submissions to {regulator?.name || 'SEC'}
          </p>
        </div>
        {submission && (
          <div className="flex items-center gap-3">
            <StatusBadge status={submission.status} />
            {deadlineDate && (
              <div className={`flex items-center gap-1 text-sm ${
                daysUntilDeadline !== null && daysUntilDeadline < 0
                  ? 'text-red-600 font-medium'
                  : daysUntilDeadline !== null && daysUntilDeadline <= 7
                    ? 'text-amber-600 font-medium'
                    : 'text-gray-600'
              }`}>
                <Calendar className="h-4 w-4" />
                {daysUntilDeadline !== null && daysUntilDeadline < 0
                  ? `${Math.abs(daysUntilDeadline)} days overdue`
                  : daysUntilDeadline !== null && daysUntilDeadline === 0
                    ? 'Due today'
                    : `${daysUntilDeadline} days until deadline`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="current" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1" />
            Current Submission
          </TabsTrigger>
          <TabsTrigger value="mapping" className="text-xs sm:text-sm">
            <Building2 className="h-4 w-4 mr-1" />
            Category Mapping
            {!mappingComplete && (
              <span className="ml-1 inline-flex items-center justify-center w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <Clock className="h-4 w-4 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* TAB: Current Submission */}
        {/* ============================================ */}
        <TabsContent value="current" className="space-y-6">
          {/* Error banner */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Mapping warning banner */}
          {!mappingComplete && unmappedCategories.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>{unmappedCategories.length} risk categories</strong> are not yet mapped to SEC categories.
                Unmapped categories will default to <strong>Operational Risk</strong>.{' '}
                <button
                  className="underline font-medium hover:no-underline"
                  onClick={() => setActiveSubTab('mapping')}
                >
                  Configure mappings
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Revision requested banner */}
          {submission?.status === 'revision_requested' && reviewComments.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <MessageSquare className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Revision Requested by {regulator?.name || 'SEC'}</strong>
                <div className="mt-2 space-y-2">
                  {reviewComments
                    .filter(c => c.comment_type === 'revision_required')
                    .map(comment => (
                      <div key={comment.id} className="bg-white border border-red-100 rounded p-2 text-sm">
                        {comment.comment_text}
                      </div>
                    ))}
                </div>
                <p className="mt-2 text-sm">
                  Please address the comments above and resubmit your report.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Approved banner */}
          {submission?.status === 'approved' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>No Objection - Approved</strong>
                <p className="text-sm mt-1">
                  Your {currentPeriod} Risk Profile Report has been approved by {regulator?.name || 'SEC'}.
                  {submission.reviewed_at && (
                    <span> Reviewed on {new Date(submission.reviewed_at).toLocaleDateString()}.</span>
                  )}
                </p>
                {reviewComments.filter(c => c.comment_type === 'approval_note').length > 0 && (
                  <div className="mt-2 space-y-1">
                    {reviewComments
                      .filter(c => c.comment_type === 'approval_note')
                      .map(note => (
                        <div key={note.id} className="text-sm italic">"{note.comment_text}"</div>
                      ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Submitted banner */}
          {submission?.status === 'submitted' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Send className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Submitted for Review</strong>
                <p className="text-sm mt-1">
                  Your {currentPeriod} report was submitted on{' '}
                  {submission.submitted_at
                    ? new Date(submission.submitted_at).toLocaleDateString()
                    : 'N/A'}
                  . It is now awaiting SEC review.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Period & Submission Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {currentPeriod} Risk Profile Report
                  </CardTitle>
                  <CardDescription>
                    Quarterly submission to {regulator?.name || 'SEC Nigeria'}
                    {submission?.revision_count ? ` (Revision ${submission.revision_count})` : ''}
                  </CardDescription>
                </div>
                {canSubmit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshMetrics}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Refresh Metrics
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">Period</div>
                  <div className="font-semibold">{currentPeriod}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">Deadline</div>
                  <div className={`font-semibold ${
                    daysUntilDeadline !== null && daysUntilDeadline < 0
                      ? 'text-red-600'
                      : ''
                  }`}>
                    {deadlineDate
                      ? deadlineDate.toLocaleDateString()
                      : 'Not set'}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">Narratives</div>
                  <div className="font-semibold">
                    {narrativesWithContent} / {totalCategories}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">Status</div>
                  <StatusBadge status={submission?.status || 'draft'} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Introduction Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Introduction</CardTitle>
                  <CardDescription>
                    Optional introductory narrative for your quarterly report
                  </CardDescription>
                </div>
                {canSubmit && introHasChanges && (
                  <Button
                    size="sm"
                    onClick={handleSaveIntro}
                    disabled={introSaving}
                  >
                    {introSaving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isReadOnly ? (
                <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap min-h-[80px]">
                  {introText || (
                    <span className="text-muted-foreground italic">No introduction provided</span>
                  )}
                </div>
              ) : (
                <Textarea
                  value={introText}
                  onChange={(e) => {
                    setIntroText(e.target.value);
                    setIntroHasChanges(true);
                  }}
                  placeholder="Provide an introductory overview of your organization's risk profile for this quarter..."
                  className="min-h-[100px] text-sm"
                />
              )}
            </CardContent>
          </Card>

          {/* SEC Category Narratives */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Risk Category Narratives</h3>
            <p className="text-sm text-gray-600 mb-4">
              {canSubmit
                ? 'Expand each category to view risk metrics and write narrative commentary. Use "Generate AI Draft" for an initial draft based on your risk data.'
                : 'Review the narrative commentary submitted for each SEC risk category.'}
            </p>
            <div className="space-y-3">
              {secCategories.map(category => {
                // Find narrative for this category
                const narrative = narratives.find(
                  n => n.sec_category_id === category.id || (n.sec_category as any)?.code === category.code
                );

                // Build a default narrative object if none exists yet
                const narrativeData: SecSubmissionNarrative = narrative || {
                  id: '',
                  submission_id: submission?.id || '',
                  sec_category_id: category.id,
                  ai_draft: null,
                  ai_generated_at: null,
                  final_narrative: null,
                  current_rating: null,
                  previous_rating: null,
                  trend: null,
                  risk_count: 0,
                  critical_count: 0,
                  high_count: 0,
                  medium_count: 0,
                  low_count: 0,
                  risk_details: [],
                  created_at: '',
                  updated_at: '',
                };

                return (
                  <NarrativeEditor
                    key={category.id}
                    narrative={narrativeData}
                    secCategory={category}
                    submissionId={submission?.id || ''}
                    organizationId={organizationId || ''}
                    period={currentPeriod}
                    previousPeriod={getPreviousPeriod(currentPeriod)}
                    isReadOnly={isReadOnly}
                    onNarrativeUpdated={handleNarrativeUpdated}
                  />
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          {canSubmit && (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {submission?.status === 'revision_requested'
                        ? 'Resubmit to SEC'
                        : 'Submit to SEC'}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {allNarrativesFilled
                        ? 'All category narratives are filled. Ready to submit.'
                        : `${totalCategories - narrativesWithContent} category narratives are still empty.`}
                    </p>
                    {!mappingComplete && (
                      <p className="text-xs text-amber-600 mt-1">
                        Some risk categories are unmapped and will default to Operational Risk.
                      </p>
                    )}
                  </div>
                  <Button
                    size="lg"
                    onClick={() => setSubmitDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submission?.status === 'revision_requested' ? 'Resubmit Report' : 'Submit to SEC'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Confirmation Dialog */}
          <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {submission?.status === 'revision_requested'
                    ? 'Resubmit Risk Profile Report?'
                    : 'Submit Risk Profile Report?'}
                </DialogTitle>
                <DialogDescription>
                  This will freeze your {currentPeriod} risk data and submit the report
                  to {regulator?.name || 'SEC'} for review. Once submitted, the report
                  data cannot be modified unless the regulator requests a revision.
                </DialogDescription>
              </DialogHeader>

              {!allNarrativesFilled && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    {totalCategories - narrativesWithContent} of {totalCategories} category narratives
                    are empty. You can still submit, but incomplete narratives may delay approval.
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Confirm Submission
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: Category Mapping */}
        {/* ============================================ */}
        <TabsContent value="mapping">
          <CategoryMappingConfig />
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: Submission History */}
        {/* ============================================ */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>
                Past quarterly Risk Profile Report submissions to {regulator?.name || 'SEC'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading history...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No submission history found.</p>
                  <p className="text-xs mt-1">
                    Your completed submissions will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead className="text-center">Revisions</TableHead>
                        <TableHead>Deadline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map(sub => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.period}</TableCell>
                          <TableCell>
                            <StatusBadge status={sub.status} />
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {sub.submitted_at
                              ? new Date(sub.submitted_at).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {sub.reviewed_at
                              ? new Date(sub.reviewed_at).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {sub.revision_count || 0}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {(sub.deadline as any)?.deadline_date
                              ? new Date((sub.deadline as any).deadline_date).toLocaleDateString()
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
