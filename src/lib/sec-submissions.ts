/**
 * SEC Submissions Library
 *
 * Manages the quarterly SEC Risk Profile Report submission lifecycle:
 * - CMO creates/edits draft submissions
 * - AI generates narrative commentary per SEC category
 * - CMO submits (snapshot is frozen)
 * - SEC reviews and approves or requests revision
 *
 * Submission Status Lifecycle:
 *   draft -> submitted -> under_review -> approved | revision_requested
 *   revision_requested -> draft (re-edit) -> submitted (resubmit)
 */

import { supabase, getClerkToken } from './supabase';
import { getRisksGroupedBySECCategory, type SecStandardCategory } from './sec-categories';

// ============================================
// Types
// ============================================

export interface SecSubmissionDeadline {
  id: string;
  regulator_id: string;
  period: string;
  deadline_date: string;
  grace_period_days: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecSubmission {
  id: string;
  organization_id: string;
  regulator_id: string;
  deadline_id: string | null;
  period: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'revision_requested';
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  revision_count: number;
  snapshot_data: Record<string, unknown>;
  introduction_text: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  organization?: { name: string; institution_type: string | null };
  deadline?: SecSubmissionDeadline;
}

export interface SecSubmissionNarrative {
  id: string;
  submission_id: string;
  sec_category_id: string;
  ai_draft: string | null;
  ai_generated_at: string | null;
  final_narrative: string | null;
  current_rating: number | null;
  previous_rating: number | null;
  trend: 'improving' | 'stable' | 'deteriorating' | null;
  risk_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  risk_details: Array<{
    risk_code: string;
    risk_title: string;
    likelihood: number;
    impact: number;
    rating: number;
  }>;
  created_at: string;
  updated_at: string;
  // Joined
  sec_category?: SecStandardCategory;
}

export interface SecReviewComment {
  id: string;
  submission_id: string;
  sec_category_id: string | null;
  comment_text: string;
  comment_type: 'comment' | 'revision_required' | 'approval_note';
  created_by: string;
  created_at: string;
}

export interface SubmissionSnapshot {
  organization: {
    name: string;
    institution_type: string | null;
  };
  period: string;
  submitted_at: string;
  summary: {
    total_risks: number;
    by_sec_category: Record<string, {
      count: number;
      avg_probability: number;
      avg_impact: number;
      avg_severity: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>;
  };
  heatmap: {
    matrix: number[][];
    row_labels: string[];
    col_labels: string[];
  };
  risk_details: Array<{
    risk_code: string;
    risk_title: string;
    sec_category_code: string;
    sec_category_name: string;
    likelihood: number;
    impact: number;
    rating: number;
  }>;
  comparison: {
    previous_period: string | null;
    trends: Record<string, {
      current: number;
      previous: number | null;
      trend: 'improving' | 'stable' | 'deteriorating';
    }>;
  };
}

// ============================================
// Deadlines
// ============================================

/**
 * Get the current active deadline for an organization's regulator
 */
export async function getCurrentDeadline(regulatorId: string): Promise<{
  data: SecSubmissionDeadline | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_submission_deadlines')
      .select('*')
      .eq('regulator_id', regulatorId)
      .eq('is_active', true)
      .order('deadline_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: data as SecSubmissionDeadline | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get all deadlines for a regulator
 */
export async function getDeadlines(regulatorId: string): Promise<{
  data: SecSubmissionDeadline[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_submission_deadlines')
      .select('*')
      .eq('regulator_id', regulatorId)
      .order('deadline_date', { ascending: false });

    if (error) return { data: null, error };
    return { data: data as SecSubmissionDeadline[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Set a submission deadline (regulator action)
 */
export async function setDeadline(
  regulatorId: string,
  period: string,
  deadlineDate: string,
  gracePeriodDays: number = 0,
  notes?: string
): Promise<{ data: SecSubmissionDeadline | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('sec_submission_deadlines')
      .upsert(
        {
          regulator_id: regulatorId,
          period,
          deadline_date: deadlineDate,
          grace_period_days: gracePeriodDays,
          is_active: true,
          notes: notes || null,
        },
        { onConflict: 'regulator_id,period' }
      )
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as SecSubmissionDeadline, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// Submissions (CMO side)
// ============================================

/**
 * Get or create a draft submission for the current period
 * If a submission exists, returns it. Otherwise creates a new draft.
 */
export async function getOrCreateSubmission(
  organizationId: string,
  regulatorId: string,
  period: string
): Promise<{ data: SecSubmission | null; error: Error | null }> {
  try {
    // Try to find existing submission
    const { data: existing, error: findError } = await supabase
      .from('sec_submissions')
      .select(`
        *,
        organization:organizations(name, institution_type),
        deadline:sec_submission_deadlines(*)
      `)
      .eq('organization_id', organizationId)
      .eq('regulator_id', regulatorId)
      .eq('period', period)
      .maybeSingle();

    if (findError) return { data: null, error: findError };

    if (existing) {
      return { data: existing as SecSubmission, error: null };
    }

    // Create new draft submission
    // First try to find the deadline for this period
    const { data: deadline } = await supabase
      .from('sec_submission_deadlines')
      .select('id')
      .eq('regulator_id', regulatorId)
      .eq('period', period)
      .maybeSingle();

    const { data: newSub, error: createError } = await supabase
      .from('sec_submissions')
      .insert({
        organization_id: organizationId,
        regulator_id: regulatorId,
        period,
        deadline_id: deadline?.id || null,
        status: 'draft',
        snapshot_data: {},
      })
      .select(`
        *,
        organization:organizations(name, institution_type),
        deadline:sec_submission_deadlines(*)
      `)
      .single();

    if (createError) return { data: null, error: createError };
    return { data: newSub as SecSubmission, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a submission by ID with all related data
 */
export async function getSubmission(submissionId: string): Promise<{
  data: SecSubmission | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_submissions')
      .select(`
        *,
        organization:organizations(name, institution_type),
        deadline:sec_submission_deadlines(*)
      `)
      .eq('id', submissionId)
      .single();

    if (error) return { data: null, error };
    return { data: data as SecSubmission, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Update the introduction text of a draft submission
 */
export async function updateIntroduction(
  submissionId: string,
  introductionText: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('sec_submissions')
      .update({ introduction_text: introductionText, updated_at: new Date().toISOString() })
      .eq('id', submissionId);

    return { error: error || null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// Narratives
// ============================================

/**
 * Get all narratives for a submission (one per SEC category)
 */
export async function getSubmissionNarratives(submissionId: string): Promise<{
  data: SecSubmissionNarrative[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_submission_narratives')
      .select(`
        *,
        sec_category:sec_standard_categories(*)
      `)
      .eq('submission_id', submissionId)
      .order('sec_category_id');

    if (error) return { data: null, error };
    return { data: data as SecSubmissionNarrative[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Upsert a narrative for a specific SEC category in a submission
 * Creates or updates the narrative record
 */
export async function upsertNarrative(
  submissionId: string,
  secCategoryId: string,
  updates: Partial<{
    ai_draft: string;
    ai_generated_at: string;
    final_narrative: string;
    current_rating: number;
    previous_rating: number;
    trend: 'improving' | 'stable' | 'deteriorating';
    risk_count: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    risk_details: unknown[];
  }>
): Promise<{ data: SecSubmissionNarrative | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('sec_submission_narratives')
      .upsert(
        {
          submission_id: submissionId,
          sec_category_id: secCategoryId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'submission_id,sec_category_id' }
      )
      .select(`*, sec_category:sec_standard_categories(*)`)
      .single();

    if (error) return { data: null, error };
    return { data: data as SecSubmissionNarrative, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Update only the final narrative text (CMO editing)
 */
export async function updateNarrativeText(
  narrativeId: string,
  finalNarrative: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('sec_submission_narratives')
      .update({
        final_narrative: finalNarrative,
        updated_at: new Date().toISOString(),
      })
      .eq('id', narrativeId);

    return { error: error || null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// AI Narrative Generation
// ============================================

/**
 * Generate AI draft narrative for a specific SEC category
 * Calls the generate-sec-narrative Edge Function
 */
export async function generateAINarrative(
  organizationId: string,
  secCategoryCode: string,
  period: string,
  previousPeriod?: string
): Promise<{
  data: {
    narrative: string;
    key_observations: string[];
    risk_trend: 'improving' | 'stable' | 'deteriorating';
  } | null;
  error: Error | null;
}> {
  try {
    const token = await getClerkToken();
    if (!token) return { data: null, error: new Error('Not authenticated') };

    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
    const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-sec-narrative`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'x-clerk-token': token,
        },
        body: JSON.stringify({
          organization_id: organizationId,
          sec_category_code: secCategoryCode,
          period,
          previous_period: previousPeriod,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: new Error(`AI generation failed: ${errorText}`) };
    }

    const result = await response.json();
    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// Submission Workflow
// ============================================

/**
 * Build and freeze the snapshot data, then submit to regulator
 * This is the main "Submit to SEC" action
 */
export async function submitToRegulator(
  submissionId: string,
  organizationId: string
): Promise<{ error: Error | null }> {
  try {
    // 1. Fetch the submission to verify it's in draft status
    const { data: submission, error: subError } = await getSubmission(submissionId);
    if (subError || !submission) return { error: subError || new Error('Submission not found') };

    if (submission.status !== 'draft' && submission.status !== 'revision_requested') {
      return { error: new Error(`Cannot submit: current status is '${submission.status}'`) };
    }

    // 2. Get risks grouped by SEC category
    const { data: grouped, error: groupError } = await getRisksGroupedBySECCategory(organizationId);
    if (groupError || !grouped) return { error: groupError || new Error('Failed to load risk data') };

    // 3. Get org info
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, institution_type')
      .eq('id', organizationId)
      .single();

    // 4. Get narratives
    const { data: narratives } = await getSubmissionNarratives(submissionId);

    // 5. Get previous submission for comparison
    const previousPeriod = getPreviousPeriod(submission.period);
    const { data: prevSubmission } = await supabase
      .from('sec_submissions')
      .select('snapshot_data')
      .eq('organization_id', organizationId)
      .eq('regulator_id', submission.regulator_id)
      .eq('period', previousPeriod)
      .eq('status', 'approved')
      .maybeSingle();

    // 6. Build snapshot
    const snapshot = buildSnapshot(
      orgData || { name: 'Unknown', institution_type: null },
      submission.period,
      grouped,
      narratives || [],
      prevSubmission?.snapshot_data as SubmissionSnapshot | null
    );

    // 7. Update submission with snapshot and set status to submitted
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('sec_submissions')
      .update({
        status: 'submitted',
        submitted_at: now,
        snapshot_data: snapshot,
        revision_count: submission.status === 'revision_requested'
          ? submission.revision_count + 1
          : submission.revision_count,
        updated_at: now,
      })
      .eq('id', submissionId);

    return { error: updateError || null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Populate narratives with current quantitative data (without submitting)
 * Called when the CMO opens the submission to see current metrics
 */
export async function refreshNarrativeMetrics(
  submissionId: string,
  organizationId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: grouped, error: groupError } = await getRisksGroupedBySECCategory(organizationId);
    if (groupError || !grouped) return { error: groupError || new Error('Failed to load risk data') };

    // Get the submission to find regulator and period for previous data
    const { data: submission, error: subError } = await getSubmission(submissionId);
    if (subError || !submission) return { error: subError || new Error('Submission not found') };

    // Get previous submission for trend calculation
    const previousPeriod = getPreviousPeriod(submission.period);
    const { data: prevSubmission } = await supabase
      .from('sec_submissions')
      .select('snapshot_data')
      .eq('organization_id', organizationId)
      .eq('regulator_id', submission.regulator_id)
      .eq('period', previousPeriod)
      .eq('status', 'approved')
      .maybeSingle();

    const prevSnapshot = prevSubmission?.snapshot_data as SubmissionSnapshot | null;

    // Upsert narrative for each SEC category
    for (const [code, group] of Object.entries(grouped)) {
      const previousRating = prevSnapshot?.summary?.by_sec_category?.[code]?.avg_severity ?? null;
      const currentRating = group.avg_severity;

      let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
      if (previousRating !== null) {
        const diff = currentRating - previousRating;
        if (diff < -0.5) trend = 'improving';
        else if (diff > 0.5) trend = 'deteriorating';
      }

      await upsertNarrative(submissionId, group.sec_category.id, {
        current_rating: currentRating,
        previous_rating: previousRating,
        trend,
        risk_count: group.risk_count,
        critical_count: group.critical_count,
        high_count: group.high_count,
        medium_count: group.medium_count,
        low_count: group.low_count,
        risk_details: group.risks.map(r => ({
          risk_code: r.risk_code,
          risk_title: r.risk_title,
          likelihood: r.likelihood_inherent,
          impact: r.impact_inherent,
          rating: r.likelihood_inherent * r.impact_inherent,
        })),
      });
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// Review Workflow (SEC side)
// ============================================

/**
 * Approve a submission (No Objection)
 */
export async function approveSubmission(
  submissionId: string,
  approvalNotes?: string
): Promise<{ error: Error | null }> {
  try {
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('sec_submissions')
      .update({
        status: 'approved',
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', submissionId);

    if (updateError) return { error: updateError };

    // Add approval note if provided
    if (approvalNotes) {
      await supabase
        .from('sec_review_comments')
        .insert({
          submission_id: submissionId,
          comment_text: approvalNotes,
          comment_type: 'approval_note',
        });
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Request revision on a submission
 */
export async function requestRevision(
  submissionId: string,
  comments: Array<{
    sec_category_id?: string;
    comment_text: string;
  }>
): Promise<{ error: Error | null }> {
  try {
    const now = new Date().toISOString();

    // Update submission status
    const { error: updateError } = await supabase
      .from('sec_submissions')
      .update({
        status: 'revision_requested',
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', submissionId);

    if (updateError) return { error: updateError };

    // Insert review comments
    if (comments.length > 0) {
      const rows = comments.map(c => ({
        submission_id: submissionId,
        sec_category_id: c.sec_category_id || null,
        comment_text: c.comment_text,
        comment_type: 'revision_required' as const,
      }));

      const { error: commentError } = await supabase
        .from('sec_review_comments')
        .insert(rows);

      if (commentError) return { error: commentError };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get all review comments for a submission
 */
export async function getReviewComments(submissionId: string): Promise<{
  data: SecReviewComment[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_review_comments')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };
    return { data: data as SecReviewComment[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// Submission History & Regulator Queries
// ============================================

/**
 * Get submission history for an organization
 */
export async function getSubmissionHistory(
  organizationId: string,
  regulatorId: string
): Promise<{ data: SecSubmission[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('sec_submissions')
      .select(`
        *,
        deadline:sec_submission_deadlines(*)
      `)
      .eq('organization_id', organizationId)
      .eq('regulator_id', regulatorId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };
    return { data: data as SecSubmission[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get all submissions for a regulator (all CMOs) for a specific period
 */
export async function getAllSubmissionsForRegulator(
  regulatorId: string,
  period?: string
): Promise<{ data: SecSubmission[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('sec_submissions')
      .select(`
        *,
        organization:organizations(name, institution_type),
        deadline:sec_submission_deadlines(*)
      `)
      .eq('regulator_id', regulatorId)
      .order('submitted_at', { ascending: false });

    if (period) {
      query = query.eq('period', period);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };
    return { data: data as SecSubmission[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get submission compliance stats for a regulator (for dashboard)
 */
export async function getSubmissionComplianceStats(
  regulatorId: string,
  period: string
): Promise<{
  data: {
    total_orgs: number;
    submitted: number;
    approved: number;
    pending_review: number;
    revision_requested: number;
    not_submitted: number;
    overdue: number;
    compliance_rate: number;
  } | null;
  error: Error | null;
}> {
  try {
    // Get all organizations assigned to this regulator
    const { data: orgData, error: orgError } = await supabase
      .from('organization_regulators')
      .select('organization_id')
      .eq('regulator_id', regulatorId);

    if (orgError) return { data: null, error: orgError };

    const totalOrgs = orgData?.length || 0;

    // Get all submissions for this period
    const { data: submissions, error: subError } = await supabase
      .from('sec_submissions')
      .select('organization_id, status, submitted_at')
      .eq('regulator_id', regulatorId)
      .eq('period', period);

    if (subError) return { data: null, error: subError };

    const subMap = new Map<string, SecSubmission>();
    (submissions || []).forEach(s => subMap.set(s.organization_id, s as SecSubmission));

    // Get deadline to determine overdue
    const { data: deadline } = await supabase
      .from('sec_submission_deadlines')
      .select('deadline_date, grace_period_days')
      .eq('regulator_id', regulatorId)
      .eq('period', period)
      .maybeSingle();

    const now = new Date();
    let deadlineDate: Date | null = null;
    if (deadline) {
      deadlineDate = new Date(deadline.deadline_date);
      deadlineDate.setDate(deadlineDate.getDate() + (deadline.grace_period_days || 0));
    }

    let submitted = 0;
    let approved = 0;
    let pendingReview = 0;
    let revisionRequested = 0;
    let notSubmitted = 0;
    let overdue = 0;

    const orgIds = (orgData || []).map(o => o.organization_id);

    for (const orgId of orgIds) {
      const sub = subMap.get(orgId);
      if (!sub) {
        notSubmitted++;
        if (deadlineDate && now > deadlineDate) {
          overdue++;
        }
      } else {
        switch (sub.status) {
          case 'approved': approved++; submitted++; break;
          case 'submitted':
          case 'under_review':
            pendingReview++; submitted++; break;
          case 'revision_requested': revisionRequested++; break;
          case 'draft':
            notSubmitted++;
            if (deadlineDate && now > deadlineDate) overdue++;
            break;
        }
      }
    }

    return {
      data: {
        total_orgs: totalOrgs,
        submitted,
        approved,
        pending_review: pendingReview,
        revision_requested: revisionRequested,
        not_submitted: notSubmitted,
        overdue,
        compliance_rate: totalOrgs > 0
          ? Math.round(((submitted + approved) / totalOrgs) * 100)
          : 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate previous period string from current period
 * e.g., 'Q1 2026' -> 'Q4 2025', 'Q3 2026' -> 'Q2 2026'
 */
export function getPreviousPeriod(period: string): string {
  const match = period.match(/^Q(\d)\s+(\d{4})$/);
  if (!match) return '';

  const quarter = parseInt(match[1]);
  const year = parseInt(match[2]);

  if (quarter === 1) {
    return `Q4 ${year - 1}`;
  }
  return `Q${quarter - 1} ${year}`;
}

/**
 * Get current period string based on current date
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  if (month < 3) return `Q1 ${year}`;
  if (month < 6) return `Q2 ${year}`;
  if (month < 9) return `Q3 ${year}`;
  return `Q4 ${year}`;
}

/**
 * Build the submission snapshot from current risk data
 * This creates the immutable record that gets frozen at submission time
 */
function buildSnapshot(
  org: { name: string; institution_type: string | null },
  period: string,
  grouped: Record<string, {
    sec_category: SecStandardCategory;
    risks: Array<{
      risk_code: string;
      risk_title: string;
      likelihood_inherent: number;
      impact_inherent: number;
    }>;
    risk_count: number;
    avg_probability: number;
    avg_impact: number;
    avg_severity: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  }>,
  narratives: SecSubmissionNarrative[],
  prevSnapshot: SubmissionSnapshot | null
): SubmissionSnapshot {
  // Build category summary
  const by_sec_category: Record<string, {
    count: number;
    avg_probability: number;
    avg_impact: number;
    avg_severity: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> = {};

  let totalRisks = 0;

  for (const [code, group] of Object.entries(grouped)) {
    by_sec_category[code] = {
      count: group.risk_count,
      avg_probability: group.avg_probability,
      avg_impact: group.avg_impact,
      avg_severity: group.avg_severity,
      critical: group.critical_count,
      high: group.high_count,
      medium: group.medium_count,
      low: group.low_count,
    };
    totalRisks += group.risk_count;
  }

  // Build 5x5 heatmap matrix (likelihood rows x impact columns)
  const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  const allRisks: Array<{
    risk_code: string;
    risk_title: string;
    sec_category_code: string;
    sec_category_name: string;
    likelihood: number;
    impact: number;
    rating: number;
  }> = [];

  for (const [code, group] of Object.entries(grouped)) {
    for (const risk of group.risks) {
      const l = Math.min(Math.max(Math.round(risk.likelihood_inherent), 1), 5);
      const i = Math.min(Math.max(Math.round(risk.impact_inherent), 1), 5);
      matrix[l - 1][i - 1]++;

      allRisks.push({
        risk_code: risk.risk_code,
        risk_title: risk.risk_title,
        sec_category_code: code,
        sec_category_name: group.sec_category.name,
        likelihood: risk.likelihood_inherent,
        impact: risk.impact_inherent,
        rating: risk.likelihood_inherent * risk.impact_inherent,
      });
    }
  }

  // Build trend comparison
  const trends: Record<string, {
    current: number;
    previous: number | null;
    trend: 'improving' | 'stable' | 'deteriorating';
  }> = {};

  for (const [code, group] of Object.entries(grouped)) {
    const currentSeverity = group.avg_severity;
    const prevSeverity = prevSnapshot?.summary?.by_sec_category?.[code]?.avg_severity ?? null;

    let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
    if (prevSeverity !== null) {
      const diff = currentSeverity - prevSeverity;
      if (diff < -0.5) trend = 'improving';
      else if (diff > 0.5) trend = 'deteriorating';
    }

    trends[code] = {
      current: currentSeverity,
      previous: prevSeverity,
      trend,
    };
  }

  return {
    organization: {
      name: org.name,
      institution_type: org.institution_type,
    },
    period,
    submitted_at: new Date().toISOString(),
    summary: {
      total_risks: totalRisks,
      by_sec_category,
    },
    heatmap: {
      matrix,
      row_labels: ['1-Remote', '2-Unlikely', '3-Possible', '4-Likely', '5-Almost Certain'],
      col_labels: ['1-Insignificant', '2-Minor', '3-Moderate', '4-Major', '5-Catastrophic'],
    },
    risk_details: allRisks.sort((a, b) => a.risk_code.localeCompare(b.risk_code)),
    comparison: {
      previous_period: prevSnapshot ? getPreviousPeriod(period) : null,
      trends,
    },
  };
}
