/**
 * SEC Firm Drilldown Component
 *
 * Regulator-side detailed view of a single CMO's risk profile in the
 * SEC template format. Used by SEC regulators to review, approve, or
 * request revisions on quarterly Risk Profile Report submissions.
 *
 * When no organizationId prop is supplied the component renders an
 * organization selector populated from `organization_regulators`.
 *
 * SEC Template Sections:
 * 1. Introduction   - company name, period, institution type, intro narrative
 * 2. Risk Profile & Heat Map - 5-category summary + 5x5 heatmap matrix
 * 3. Risk Profile Summary    - quarter-over-quarter trends + narrative commentary
 * 4. Profile Mapping         - individual risk scores table
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type SecSubmission,
  type SecSubmissionNarrative,
  type SubmissionSnapshot,
  type SecReviewComment,
  getSubmission,
  getSubmissionNarratives,
  getAllSubmissionsForRegulator,
  approveSubmission,
  requestRevision,
  getReviewComments,
  getCurrentPeriod,
} from '@/lib/sec-submissions';
import { getSecStandardCategories, type SecStandardCategory } from '@/lib/sec-categories';
import { getRisksGroupedBySECCategory } from '@/lib/sec-categories';
import { supabase } from '@/lib/supabase';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import {
  Building2,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Eye,
  MessageSquare,
} from 'lucide-react';

// ============================================
// Props
// ============================================

interface SECFirmDrilldownProps {
  regulatorId: string;
  organizationId?: string; // If not provided, show org selector
}

// ============================================
// Internal Types
// ============================================

interface AssignedOrg {
  organization_id: string;
  name: string;
  institution_type: string | null;
}

interface CategorySummaryRow {
  code: string;
  name: string;
  count: number;
  avgLikelihood: number;
  avgImpact: number;
  avgRating: number;
  trendArrow: 'improving' | 'stable' | 'deteriorating' | null;
}

interface RiskDetailRow {
  riskCode: string;
  riskTitle: string;
  secCategoryCode: string;
  secCategoryName: string;
  likelihood: number;
  impact: number;
  rating: number;
}

interface TrendRow {
  code: string;
  name: string;
  current: number;
  previous: number | null;
  trend: 'improving' | 'stable' | 'deteriorating';
  narrative: string | null;
}

// ============================================
// Constants
// ============================================

const SEC_CATEGORY_ORDER = ['STRATEGIC', 'MARKET', 'REGULATORY', 'OPERATIONAL', 'IT_CYBER'];

const HEATMAP_ROW_LABELS = ['Remote', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const HEATMAP_COL_LABELS = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

const SEC_CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  STRATEGIC:   { bg: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-300', light: 'bg-purple-50' },
  MARKET:      { bg: 'bg-blue-600',   text: 'text-blue-700',   border: 'border-blue-300',   light: 'bg-blue-50' },
  REGULATORY:  { bg: 'bg-amber-600',  text: 'text-amber-700',  border: 'border-amber-300',  light: 'bg-amber-50' },
  OPERATIONAL: { bg: 'bg-orange-600', text: 'text-orange-700', border: 'border-orange-300', light: 'bg-orange-50' },
  IT_CYBER:    { bg: 'bg-red-600',    text: 'text-red-700',    border: 'border-red-300',    light: 'bg-red-50' },
};

// ============================================
// Helpers
// ============================================

function getCatColor(code: string) {
  return SEC_CATEGORY_COLORS[code] || { bg: 'bg-gray-600', text: 'text-gray-700', border: 'border-gray-300', light: 'bg-gray-50' };
}

/**
 * Return the positional color for a heatmap cell at row/col (1-based).
 */
function heatmapPositionColor(row: number, col: number, hasRisks: boolean): string {
  if (!hasRisks) return 'bg-gray-100 text-gray-400';
  const product = row * col;
  if (product >= 15) return 'bg-red-500 text-white font-bold';
  if (product >= 10) return 'bg-orange-400 text-white font-bold';
  if (product >= 5) return 'bg-yellow-300 text-yellow-900 font-bold';
  return 'bg-green-300 text-green-900 font-bold';
}

function getRatingBadge(rating: number) {
  if (rating >= 20) return { label: 'Critical', className: 'bg-red-600 text-white' };
  if (rating >= 12) return { label: 'High', className: 'bg-orange-500 text-white' };
  if (rating >= 6) return { label: 'Medium', className: 'bg-yellow-500 text-yellow-900' };
  return { label: 'Low', className: 'bg-green-500 text-white' };
}

function statusBadge(status: SecSubmission['status']) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'submitted':
      return <Badge className="bg-blue-600 text-white">Submitted</Badge>;
    case 'under_review':
      return <Badge className="bg-amber-600 text-white">Under Review</Badge>;
    case 'approved':
      return <Badge className="bg-green-600 text-white">Approved</Badge>;
    case 'revision_requested':
      return <Badge className="bg-red-500 text-white">Revision Requested</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function TrendIcon({ trend }: { trend: 'improving' | 'stable' | 'deteriorating' }) {
  switch (trend) {
    case 'improving':
      return <TrendingDown className="h-4 w-4 text-green-600 inline" />;
    case 'deteriorating':
      return <TrendingUp className="h-4 w-4 text-red-600 inline" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500 inline" />;
  }
}

function trendColor(trend: 'improving' | 'stable' | 'deteriorating'): string {
  switch (trend) {
    case 'improving': return 'text-green-600';
    case 'deteriorating': return 'text-red-600';
    case 'stable': return 'text-gray-500';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ============================================
// Component
// ============================================

export default function SECFirmDrilldown({ regulatorId, organizationId: orgIdProp }: SECFirmDrilldownProps) {
  // ----- Org selection (if not provided) -----
  const [assignedOrgs, setAssignedOrgs] = useState<AssignedOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(orgIdProp || '');
  const [selectedOrgName, setSelectedOrgName] = useState<string>('');
  const [orgsLoading, setOrgsLoading] = useState(!orgIdProp);

  // ----- Submission data -----
  const [secCategories, setSecCategories] = useState<SecStandardCategory[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<SecSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SecSubmission | null>(null);
  const [narratives, setNarratives] = useState<SecSubmissionNarrative[]>([]);
  const [reviewComments, setReviewComments] = useState<SecReviewComment[]>([]);

  // ----- View state -----
  const [viewMode, setViewMode] = useState<'snapshot' | 'live'>('snapshot');

  // ----- Live risk data -----
  const [liveCategories, setLiveCategories] = useState<CategorySummaryRow[]>([]);
  const [liveRisks, setLiveRisks] = useState<RiskDetailRow[]>([]);
  const [liveHeatmap, setLiveHeatmap] = useState<number[][]>(Array.from({ length: 5 }, () => Array(5).fill(0)));

  // ----- UI state -----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ----- Approve dialog -----
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  // ----- Revision dialog -----
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [generalRevisionComment, setGeneralRevisionComment] = useState('');
  const [categoryComments, setCategoryComments] = useState<Record<string, string>>({});

  // ============================================
  // 1. Load assigned organizations (only when no orgIdProp)
  // ============================================

  useEffect(() => {
    if (orgIdProp) {
      setSelectedOrgId(orgIdProp);
      return;
    }

    async function loadOrgs() {
      setOrgsLoading(true);
      try {
        const { data, error: qError } = await supabase
          .from('organization_regulators')
          .select(`
            organization_id,
            organization:organizations(name, institution_type)
          `)
          .eq('regulator_id', regulatorId);

        if (qError) throw qError;

        const orgs: AssignedOrg[] = (data || []).map((row: any) => ({
          organization_id: row.organization_id,
          name: row.organization?.name || 'Unknown',
          institution_type: row.organization?.institution_type || null,
        }));

        setAssignedOrgs(orgs);

        // Auto-select first if only one
        if (orgs.length === 1) {
          setSelectedOrgId(orgs[0].organization_id);
          setSelectedOrgName(orgs[0].name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organizations');
      } finally {
        setOrgsLoading(false);
      }
    }

    loadOrgs();
  }, [regulatorId, orgIdProp]);

  // Keep selectedOrgName in sync when selection changes
  useEffect(() => {
    if (!selectedOrgId) {
      setSelectedOrgName('');
      return;
    }
    const match = assignedOrgs.find(o => o.organization_id === selectedOrgId);
    if (match) {
      setSelectedOrgName(match.name);
    }
  }, [selectedOrgId, assignedOrgs]);

  // ============================================
  // 2. Load submission data when an org is selected
  // ============================================

  const loadSubmissionData = useCallback(async () => {
    if (!selectedOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Load SEC categories + all submissions for this regulator+org in parallel
      const [catResult, subResult] = await Promise.all([
        getSecStandardCategories(),
        getAllSubmissionsForRegulator(regulatorId),
      ]);

      if (catResult.error) throw catResult.error;
      if (subResult.error) throw subResult.error;

      const cats = catResult.data || [];
      setSecCategories(cats);

      // Filter submissions to this org
      const orgSubs = (subResult.data || []).filter(s => s.organization_id === selectedOrgId);
      setAllSubmissions(orgSubs);

      // Determine the latest non-draft submission
      const latest = orgSubs
        .filter(s => s.status !== 'draft')
        .sort((a, b) => {
          const da = a.submitted_at || a.created_at;
          const db = b.submitted_at || b.created_at;
          return new Date(db).getTime() - new Date(da).getTime();
        })[0] || null;

      setSelectedSubmission(latest);

      // If latest submission exists, load narratives and review comments
      if (latest) {
        const [narrResult, commentsResult] = await Promise.all([
          getSubmissionNarratives(latest.id),
          getReviewComments(latest.id),
        ]);
        setNarratives(narrResult.data || []);
        setReviewComments(commentsResult.data || []);
        setViewMode('snapshot');
      } else {
        setNarratives([]);
        setReviewComments([]);
        setViewMode('live');
      }

      // Also fetch org name if not already known (orgIdProp case)
      if (!selectedOrgName && latest?.organization) {
        setSelectedOrgName(latest.organization.name);
      }
      if (!selectedOrgName) {
        // Try fetching from supabase directly
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', selectedOrgId)
          .maybeSingle();
        if (orgData?.name) setSelectedOrgName(orgData.name);
      }

      // Load live risk data
      await loadLiveData(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submission data');
      console.error('SECFirmDrilldown load error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, regulatorId]);

  const loadLiveData = useCallback(async (cats: SecStandardCategory[]) => {
    if (!selectedOrgId) return;
    try {
      const { data: grouped, error: gErr } = await getRisksGroupedBySECCategory(selectedOrgId);
      if (gErr) throw gErr;
      if (!grouped) return;

      const catRows: CategorySummaryRow[] = [];
      const riskRows: RiskDetailRow[] = [];
      const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));

      for (const code of SEC_CATEGORY_ORDER) {
        const group = grouped[code];
        if (group) {
          catRows.push({
            code,
            name: group.sec_category.name,
            count: group.risk_count,
            avgLikelihood: group.avg_probability,
            avgImpact: group.avg_impact,
            avgRating: group.avg_severity,
            trendArrow: null,
          });

          for (const risk of group.risks) {
            const l = Math.min(Math.max(Math.round(risk.likelihood_inherent), 1), 5);
            const i = Math.min(Math.max(Math.round(risk.impact_inherent), 1), 5);
            matrix[l - 1][i - 1]++;

            riskRows.push({
              riskCode: risk.risk_code,
              riskTitle: risk.risk_title,
              secCategoryCode: code,
              secCategoryName: group.sec_category.name,
              likelihood: risk.likelihood_inherent,
              impact: risk.impact_inherent,
              rating: risk.likelihood_inherent * risk.impact_inherent,
            });
          }
        }
      }

      riskRows.sort((a, b) => b.rating - a.rating);

      setLiveCategories(catRows);
      setLiveRisks(riskRows);
      setLiveHeatmap(matrix);
    } catch (err) {
      console.error('Failed to load live data:', err);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    loadSubmissionData();
  }, [loadSubmissionData]);

  // ============================================
  // 3. Select a different submission
  // ============================================

  async function handleSelectSubmission(submissionId: string) {
    if (!submissionId) return;
    setLoading(true);
    try {
      const { data: sub, error: subErr } = await getSubmission(submissionId);
      if (subErr) throw subErr;
      setSelectedSubmission(sub);

      if (sub) {
        const [narrRes, commentRes] = await Promise.all([
          getSubmissionNarratives(sub.id),
          getReviewComments(sub.id),
        ]);
        setNarratives(narrRes.data || []);
        setReviewComments(commentRes.data || []);
      }
      setViewMode('snapshot');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // 4. Review actions
  // ============================================

  async function handleApprove() {
    if (!selectedSubmission) return;
    setActionLoading(true);
    setError(null);

    const { error: appErr } = await approveSubmission(selectedSubmission.id, approvalNotes || undefined);

    if (appErr) {
      setError('Failed to approve: ' + appErr.message);
      setActionLoading(false);
      return;
    }

    setSuccess('Submission approved successfully (No Objection issued).');
    setApproveOpen(false);
    setApprovalNotes('');
    setActionLoading(false);
    await loadSubmissionData();
  }

  async function handleRequestRevision() {
    if (!selectedSubmission) return;
    setActionLoading(true);
    setError(null);

    const comments: Array<{ sec_category_id?: string; comment_text: string }> = [];

    if (generalRevisionComment.trim()) {
      comments.push({ comment_text: generalRevisionComment.trim() });
    }

    for (const cat of secCategories) {
      const text = categoryComments[cat.id];
      if (text && text.trim()) {
        comments.push({ sec_category_id: cat.id, comment_text: text.trim() });
      }
    }

    if (comments.length === 0) {
      setError('Please provide at least one revision comment.');
      setActionLoading(false);
      return;
    }

    const { error: revErr } = await requestRevision(selectedSubmission.id, comments);

    if (revErr) {
      setError('Failed to request revision: ' + revErr.message);
      setActionLoading(false);
      return;
    }

    setSuccess('Revision requested. The CMO will be notified to update and resubmit.');
    setRevisionOpen(false);
    setGeneralRevisionComment('');
    setCategoryComments({});
    setActionLoading(false);
    await loadSubmissionData();
  }

  // ============================================
  // 5. Snapshot data extraction
  // ============================================

  const snapshot = selectedSubmission?.snapshot_data as unknown as SubmissionSnapshot | undefined;

  function getSnapshotCategories(): CategorySummaryRow[] {
    if (!snapshot?.summary?.by_sec_category) return [];
    return SEC_CATEGORY_ORDER
      .filter(code => snapshot.summary.by_sec_category[code])
      .map(code => {
        const cat = snapshot.summary.by_sec_category[code];
        const secCat = secCategories.find(sc => sc.code === code);
        const trend = snapshot.comparison?.trends?.[code]?.trend ?? null;
        return {
          code,
          name: secCat?.name || code,
          count: cat.count,
          avgLikelihood: cat.avg_probability,
          avgImpact: cat.avg_impact,
          avgRating: cat.avg_severity,
          trendArrow: trend,
        };
      });
  }

  function getSnapshotRisks(): RiskDetailRow[] {
    if (!snapshot?.risk_details) return [];
    return [...snapshot.risk_details]
      .sort((a, b) => b.rating - a.rating)
      .map(r => ({
        riskCode: r.risk_code,
        riskTitle: r.risk_title,
        secCategoryCode: r.sec_category_code,
        secCategoryName: r.sec_category_name,
        likelihood: r.likelihood,
        impact: r.impact,
        rating: r.rating,
      }));
  }

  function getSnapshotHeatmap(): number[][] {
    if (!snapshot?.heatmap?.matrix) return Array.from({ length: 5 }, () => Array(5).fill(0));
    return snapshot.heatmap.matrix;
  }

  function getSnapshotTrends(): TrendRow[] {
    if (!snapshot?.comparison?.trends) return [];
    return SEC_CATEGORY_ORDER
      .filter(code => snapshot.comparison.trends[code])
      .map(code => {
        const t = snapshot.comparison.trends[code];
        const secCat = secCategories.find(sc => sc.code === code);
        const narr = narratives.find(n => {
          const nCat = secCategories.find(sc => sc.id === n.sec_category_id);
          return nCat?.code === code;
        });
        return {
          code,
          name: secCat?.name || code,
          current: t.current,
          previous: t.previous,
          trend: t.trend,
          narrative: narr?.final_narrative || narr?.ai_draft || null,
        };
      });
  }

  // Active data based on view mode
  const activeCategories = viewMode === 'snapshot' ? getSnapshotCategories() : liveCategories;
  const activeRisks = viewMode === 'snapshot' ? getSnapshotRisks() : liveRisks;
  const activeHeatmap = viewMode === 'snapshot' ? getSnapshotHeatmap() : liveHeatmap;
  const activeTrends = viewMode === 'snapshot' ? getSnapshotTrends() : [];
  const totalRisks = activeCategories.reduce((sum, c) => sum + c.count, 0);

  const canReview = selectedSubmission &&
    (selectedSubmission.status === 'submitted' || selectedSubmission.status === 'under_review');

  // ============================================
  // 6. Render: Org selector gate
  // ============================================

  if (!orgIdProp && !selectedOrgId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Capital Market Operator
            </CardTitle>
            <CardDescription>
              Choose an assigned CMO to review their SEC Risk Profile Report
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orgsLoading ? (
              <div className="flex items-center gap-2 py-8 justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Loading organizations...</span>
              </div>
            ) : assignedOrgs.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No organizations are assigned to this regulator.</p>
              </div>
            ) : (
              <div className="max-w-md">
                <Label className="text-sm font-medium mb-2 block">Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedOrgs.map(org => (
                      <SelectItem key={org.organization_id} value={org.organization_id}>
                        <div className="flex items-center gap-2">
                          <span>{org.name}</span>
                          {org.institution_type && (
                            <span className="text-xs text-muted-foreground">({org.institution_type})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // 7. Render: Loading
  // ============================================

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading firm data...</span>
      </div>
    );
  }

  // ============================================
  // 8. Main render
  // ============================================

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          {!orgIdProp && (
            <div className="mb-3 max-w-xs">
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignedOrgs.map(org => (
                    <SelectItem key={org.organization_id} value={org.organization_id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold">{selectedOrgName || 'Organization'}</h1>
          <p className="text-muted-foreground mt-1">SEC Risk Profile Report -- Detailed Review</p>
        </div>

        {selectedSubmission && (
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-2 justify-end">
              {statusBadge(selectedSubmission.status)}
              {selectedSubmission.revision_count > 0 && (
                <Badge variant="outline">Rev. {selectedSubmission.revision_count}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedSubmission.period} | Submitted {formatDate(selectedSubmission.submitted_at)}
            </p>
          </div>
        )}
      </div>

      {/* ---- Status Messages ---- */}
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

      {/* ---- Submission Selector ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Submission Selector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {allSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submissions found for this organization. Viewing live data.
              </p>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-64">
                  <Select
                    value={selectedSubmission?.id || ''}
                    onValueChange={handleSelectSubmission}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a submission..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allSubmissions.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.period} -- {sub.status.replace('_', ' ')}
                          {sub.submitted_at ? ` (${formatDate(sub.submitted_at)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'snapshot' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('snapshot')}
                    disabled={!selectedSubmission || !snapshot}
                  >
                    <FileCheck className="h-4 w-4 mr-1" />
                    Submitted (Snapshot)
                  </Button>
                  <Button
                    variant={viewMode === 'live' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('live')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Live Data
                  </Button>
                </div>
              </div>
            )}

            <div className="sm:ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadSubmissionData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Review Actions ---- */}
      {canReview && viewMode === 'snapshot' && (
        <div className="flex items-center gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setRevisionOpen(true)}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Request Revision
          </Button>
          <Button
            onClick={() => setApproveOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve (No Objection)
          </Button>
        </div>
      )}

      {viewMode === 'live' && (
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Live view shows the organization's current risk register mapped to SEC categories.
            It may differ from the latest frozen submission. Trend comparisons are unavailable in live view.
          </AlertDescription>
        </Alert>
      )}

      {/* ================================================================ */}
      {/* Section 1: Introduction                                         */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-gray-800 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">1</span>
            Introduction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Company Name</p>
              <p className="text-lg font-semibold">
                {viewMode === 'snapshot' && snapshot?.organization?.name
                  ? snapshot.organization.name
                  : selectedOrgName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Institution Type</p>
              <p className="text-lg font-semibold">
                {viewMode === 'snapshot' && snapshot?.organization?.institution_type
                  ? snapshot.organization.institution_type
                  : 'Capital Market Operator'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {viewMode === 'snapshot' ? 'Reporting Period' : 'Data As Of'}
              </p>
              <p className="text-lg font-semibold">
                {viewMode === 'snapshot'
                  ? (snapshot?.period || selectedSubmission?.period || getCurrentPeriod())
                  : formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>

          {viewMode === 'snapshot' && selectedSubmission?.introduction_text && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">Introduction Narrative</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {selectedSubmission.introduction_text}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Section 2: Risk Profile & Heat Map                              */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-gray-800 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">2</span>
            Risk Profile & Heat Map
          </CardTitle>
          <CardDescription>
            Summary across SEC's 5 standard risk categories ({totalRisks} total risks)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* ---- Category Summary Table ---- */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Category Summary</h4>
            {activeCategories.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No risk data available</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SEC Category</TableHead>
                      <TableHead className="text-right">Risk Count</TableHead>
                      <TableHead className="text-right">Avg Likelihood</TableHead>
                      <TableHead className="text-right">Avg Impact</TableHead>
                      <TableHead className="text-right">Avg Rating</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCategories.map(cat => {
                      const color = getCatColor(cat.code);
                      return (
                        <TableRow key={cat.code}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                              <span className="font-medium">{cat.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{cat.count}</TableCell>
                          <TableCell className="text-right">{cat.avgLikelihood.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{cat.avgImpact.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">{cat.avgRating.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            {cat.trendArrow ? (
                              <TrendIcon trend={cat.trendArrow} />
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totalRisks}</TableCell>
                      <TableCell className="text-right">
                        {totalRisks > 0
                          ? (activeCategories.reduce((s, c) => s + c.avgLikelihood * c.count, 0) / totalRisks).toFixed(2)
                          : '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalRisks > 0
                          ? (activeCategories.reduce((s, c) => s + c.avgImpact * c.count, 0) / totalRisks).toFixed(2)
                          : '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalRisks > 0
                          ? (activeCategories.reduce((s, c) => s + c.avgRating * c.count, 0) / totalRisks).toFixed(2)
                          : '--'}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* ---- 5x5 Heatmap ---- */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Risk Heat Map (Likelihood x Impact)</h4>
            <div className="overflow-x-auto">
              <table className="border-collapse mx-auto">
                <thead>
                  <tr>
                    <th className="p-2 text-xs text-muted-foreground w-28" />
                    {HEATMAP_COL_LABELS.map((label, idx) => (
                      <th key={idx} className="p-2 text-xs font-medium text-center border w-20">
                        <div>{idx + 1}</div>
                        <div className="text-muted-foreground font-normal">{label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Render top-to-bottom: row 5 (Almost Certain) at top */}
                  {[...Array(5)].map((_, rowIdx) => {
                    const reversedRow = 4 - rowIdx; // 4, 3, 2, 1, 0
                    return (
                      <tr key={reversedRow}>
                        <td className="p-2 text-xs font-medium text-right border-r">
                          <div>{reversedRow + 1}</div>
                          <div className="text-muted-foreground font-normal">{HEATMAP_ROW_LABELS[reversedRow]}</div>
                        </td>
                        {[...Array(5)].map((_, colIdx) => {
                          const count = activeHeatmap[reversedRow]?.[colIdx] ?? 0;
                          return (
                            <td
                              key={colIdx}
                              className={`p-2 text-center border w-20 h-16 text-lg ${heatmapPositionColor(reversedRow + 1, colIdx + 1, count > 0)}`}
                            >
                              {count > 0 ? count : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex items-center gap-4 justify-center mt-4 text-xs flex-wrap">
                <span className="font-medium">Legend:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-300 border" />
                  <span>1-4 (Low)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-300 border" />
                  <span>5-9 (Medium)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-orange-400 border" />
                  <span>10-14 (High)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500 border" />
                  <span>15-25 (Critical)</span>
                </div>
              </div>

              {/* Axis labels */}
              <div className="flex justify-between mt-2 px-28">
                <span className="text-xs text-muted-foreground italic">Likelihood (Y-axis)</span>
                <span className="text-xs text-muted-foreground italic">Impact (X-axis)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Section 3: Risk Profile Summary (Quarter-over-Quarter)           */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-gray-800 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">3</span>
            Risk Profile Summary
          </CardTitle>
          <CardDescription>
            Quarter-over-quarter comparison
            {snapshot?.comparison?.previous_period && viewMode === 'snapshot' && (
              <> (vs. {snapshot.comparison.previous_period})</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {viewMode === 'live' ? (
            <div className="py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Trend data is only available when viewing a submitted snapshot,
                where it compares against the previous quarter's approved submission.
              </p>
            </div>
          ) : activeTrends.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No previous period data available for trend comparison.
            </p>
          ) : (
            <>
              {/* Trend Comparison Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SEC Category</TableHead>
                      <TableHead className="text-right">Current Rating</TableHead>
                      <TableHead className="text-right">Previous Rating</TableHead>
                      <TableHead className="text-center">Change</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTrends.map(t => {
                      const color = getCatColor(t.code);
                      const delta = t.previous !== null ? t.current - t.previous : null;
                      return (
                        <TableRow key={t.code}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                              <span className="font-medium">{t.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {t.current.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.previous !== null ? t.previous.toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            {delta !== null ? (
                              <span className={trendColor(t.trend)}>
                                <TrendIcon trend={t.trend} />
                                <span className="ml-1">{delta > 0 ? '+' : ''}{delta.toFixed(2)}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs capitalize ${trendColor(t.trend)}`}>
                              {t.trend}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Narrative Commentary */}
              {activeTrends.some(t => t.narrative) && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold">Narrative Commentary</h4>
                  {activeTrends
                    .filter(t => t.narrative)
                    .map(t => {
                      const color = getCatColor(t.code);
                      return (
                        <div key={t.code} className={`border rounded-lg p-4 ${color.light}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                            <span className={`font-semibold ${color.text}`}>{t.name}</span>
                            <Badge variant="outline" className="ml-2">
                              <TrendIcon trend={t.trend} />
                              <span className="ml-1 capitalize">{t.trend}</span>
                            </Badge>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {t.narrative}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Section 4: Profile Mapping (Individual Risk Scores)             */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-gray-800 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">4</span>
            Profile Mapping
          </CardTitle>
          <CardDescription>
            Individual risk scores ({activeRisks.length} risks, sorted by rating highest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRisks.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No risks mapped</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk Code</TableHead>
                    <TableHead>Risk Title</TableHead>
                    <TableHead>SEC Category</TableHead>
                    <TableHead className="text-right">Likelihood</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-center">Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRisks.map((risk, idx) => {
                    const ratingInfo = getRatingBadge(risk.rating);
                    const color = getCatColor(risk.secCategoryCode);
                    return (
                      <TableRow key={`${risk.riskCode}-${idx}`}>
                        <TableCell className="font-mono text-sm font-medium">{risk.riskCode}</TableCell>
                        <TableCell className="max-w-xs truncate" title={risk.riskTitle}>
                          {risk.riskTitle}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                            <span className="text-sm">{risk.secCategoryName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{risk.likelihood.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{risk.impact.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-bold">{risk.rating.toFixed(1)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={ratingInfo.className}>{ratingInfo.label}</Badge>
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

      {/* ================================================================ */}
      {/* Review Comments                                                 */}
      {/* ================================================================ */}
      {reviewComments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Review Comments
            </CardTitle>
            <CardDescription>Feedback from SEC reviewers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviewComments.map(comment => {
                const category = comment.sec_category_id
                  ? secCategories.find(sc => sc.id === comment.sec_category_id)
                  : null;
                const color = category ? getCatColor(category.code) : null;

                return (
                  <div
                    key={comment.id}
                    className={`border rounded-lg p-4 ${
                      comment.comment_type === 'revision_required'
                        ? 'border-red-200 bg-red-50'
                        : comment.comment_type === 'approval_note'
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {comment.comment_type === 'revision_required' && (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      {comment.comment_type === 'approval_note' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      <Badge
                        variant="outline"
                        className={
                          comment.comment_type === 'revision_required'
                            ? 'border-red-300 text-red-700'
                            : comment.comment_type === 'approval_note'
                            ? 'border-green-300 text-green-700'
                            : ''
                        }
                      >
                        {comment.comment_type === 'revision_required'
                          ? 'Revision Required'
                          : comment.comment_type === 'approval_note'
                          ? 'Approval Note'
                          : 'Comment'}
                      </Badge>
                      {category && (
                        <Badge variant="outline" className={`${color?.border} ${color?.text}`}>
                          {category.name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{comment.comment_text}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Approve Dialog                                                  */}
      {/* ================================================================ */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Submission (No Objection)</DialogTitle>
            <DialogDescription>
              Issue a No Objection for {selectedOrgName}'s {selectedSubmission?.period} Risk Profile Report.
              This action confirms the report meets SEC requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Approval Notes (optional)</Label>
              <Textarea
                placeholder="Add any notes regarding this approval..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Revision Dialog                                                 */}
      {/* ================================================================ */}
      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Provide feedback for {selectedOrgName}. Add a general comment and/or
              category-specific comments. The CMO will be asked to update and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* General comment */}
            <div>
              <Label className="text-sm font-medium">General Comment</Label>
              <Textarea
                placeholder="Overall feedback on the submission..."
                value={generalRevisionComment}
                onChange={(e) => setGeneralRevisionComment(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Per-category comments */}
            <div>
              <Label className="text-sm font-medium">Category-Specific Comments</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Add targeted feedback for specific SEC risk categories.
              </p>
              <div className="space-y-3">
                {secCategories.map(cat => {
                  const color = getCatColor(cat.code);
                  return (
                    <div key={cat.id} className={`border rounded-lg p-3 ${color.light}`}>
                      <Label className={`text-sm font-medium ${color.text}`}>
                        {cat.name}
                      </Label>
                      <Textarea
                        placeholder={`Comments for ${cat.name}...`}
                        value={categoryComments[cat.id] || ''}
                        onChange={(e) => {
                          setCategoryComments(prev => ({
                            ...prev,
                            [cat.id]: e.target.value,
                          }));
                        }}
                        rows={2}
                        className="mt-1 bg-white"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestRevision}
              disabled={actionLoading}
              variant="destructive"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
