/**
 * PCI Workflow API Functions
 * Phase 1: Risk Response + Primary Control Instances + Secondary Controls
 */

import { supabase } from './supabase';
import { getAuthenticatedProfile } from './auth';
import type {
  RiskResponse,
  CreateRiskResponseData,
  UpdateRiskResponseData,
  PCITemplate,
  SecondaryControlTemplate,
  PCIInstance,
  CreatePCIInstanceData,
  UpdatePCIInstanceData,
  SecondaryControlInstance,
  UpdateSecondaryControlData,
  DerivedDIMEScore,
  ConfidenceScore,
  EvidenceRequest,
  CreateEvidenceRequestData,
  EvidenceSubmission,
  CreateEvidenceSubmissionData,
  G1GateResult,
} from '@/types/pci';

// ============================================================================
// FEATURE FLAG
// ============================================================================

/**
 * Check if PCI workflow is enabled for the current organization
 */
export async function isPCIWorkflowEnabled(): Promise<boolean> {
  const profile = await getAuthenticatedProfile();

  if (!profile?.organization_id) {
    console.warn('isPCIWorkflowEnabled: No organization found for user');
    return false;
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('pci_workflow_enabled')
    .eq('id', profile.organization_id)
    .maybeSingle();

  if (error) {
    console.error('isPCIWorkflowEnabled: Error querying organizations:', error.message);
    return false;
  }

  console.log('isPCIWorkflowEnabled:', org?.pci_workflow_enabled, 'for org:', profile.organization_id);
  return org?.pci_workflow_enabled ?? false;
}

// ============================================================================
// RISK RESPONSE
// ============================================================================

/**
 * Get risk response for a risk (1:1 relationship)
 */
export async function getRiskResponse(riskId: string) {
  const { data, error } = await supabase
    .from('risk_responses')
    .select('*')
    .eq('risk_id', riskId)
    .single();

  return { data: data as RiskResponse | null, error };
}

/**
 * Create or update risk response (upsert)
 */
export async function upsertRiskResponse(input: CreateRiskResponseData) {
  const authProfile = await getAuthenticatedProfile();

  const { data, error } = await supabase
    .from('risk_responses')
    .upsert(
      {
        risk_id: input.risk_id,
        response_type: input.response_type,
        response_rationale: input.response_rationale || null,
        ai_proposed_response: input.ai_proposed_response || null,
        ai_response_rationale: input.ai_response_rationale || null,
        updated_by: authProfile?.id,
      },
      {
        onConflict: 'risk_id',
      }
    )
    .select()
    .single();

  return { data: data as RiskResponse | null, error };
}

/**
 * Update risk response
 */
export async function updateRiskResponse(
  riskId: string,
  updates: UpdateRiskResponseData
) {
  const authProfile = await getAuthenticatedProfile();

  const { data, error } = await supabase
    .from('risk_responses')
    .update({
      ...updates,
      updated_by: authProfile?.id,
    })
    .eq('risk_id', riskId)
    .select()
    .single();

  return { data: data as RiskResponse | null, error };
}

// ============================================================================
// PCI TEMPLATES (Seed Library - Read Only)
// ============================================================================

/**
 * Get all active PCI templates
 */
export async function getPCITemplates() {
  const { data, error } = await supabase
    .from('pci_templates')
    .select('*')
    .eq('is_active', true)
    .order('id');

  return { data: data as PCITemplate[] | null, error };
}

/**
 * Get a single PCI template by ID
 */
export async function getPCITemplate(templateId: string) {
  const { data, error } = await supabase
    .from('pci_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  return { data: data as PCITemplate | null, error };
}

/**
 * Get secondary control templates for a PCI template
 */
export async function getSecondaryControlTemplates(pciTemplateId: string) {
  const { data, error } = await supabase
    .from('secondary_control_templates')
    .select('*')
    .eq('pci_template_id', pciTemplateId)
    .eq('is_active', true)
    .order('code');

  return { data: data as SecondaryControlTemplate[] | null, error };
}

// ============================================================================
// PCI INSTANCES
// ============================================================================

/**
 * Get all PCI instances for a risk
 */
export async function getPCIInstancesForRisk(riskId: string) {
  const { data, error } = await supabase
    .from('pci_instances')
    .select(`
      *,
      pci_template:pci_templates(*),
      derived_dime_score:derived_dime_scores(*),
      confidence_score:confidence_scores(*)
    `)
    .eq('risk_id', riskId)
    .neq('status', 'retired')
    .order('created_at');

  return { data: data as PCIInstance[] | null, error };
}

/**
 * Residual risk result type
 */
export interface PCIResidualRisk {
  residual_likelihood: number;
  residual_impact: number;
  residual_score: number;
  max_likelihood_effectiveness: number;
  max_impact_effectiveness: number;
}

/**
 * Calculate residual risk using PCI instances and DIME scores
 *
 * Uses the same formula as legacy controls:
 * residual = GREATEST(1, inherent - ROUND((inherent - 1) * max_effectiveness))
 *
 * But effectiveness is derived from DIME scores (0-3 scale → 0-1 effectiveness)
 * Only ACTIVE PCI instances are considered.
 */
export async function calculateResidualRiskPCI(
  riskId: string,
  inherentLikelihood: number,
  inherentImpact: number
): Promise<{ data: PCIResidualRisk | null; error: Error | null }> {
  try {
    // Step 1: Get all active PCI instances for this risk
    const { data: pciInstances, error: pciError } = await supabase
      .from('pci_instances')
      .select('id, objective')
      .eq('risk_id', riskId)
      .eq('status', 'active');

    if (pciError) {
      console.error('Error fetching PCI instances:', pciError);
      return { data: null, error: pciError };
    }

    // If no active PCI instances, return inherent values as residual
    if (!pciInstances || pciInstances.length === 0) {
      return {
        data: {
          residual_likelihood: inherentLikelihood,
          residual_impact: inherentImpact,
          residual_score: inherentLikelihood * inherentImpact,
          max_likelihood_effectiveness: 0,
          max_impact_effectiveness: 0,
        },
        error: null,
      };
    }

    // Step 2: Fetch DIME scores for each active PCI instance
    // Columns: d_score, i_score, m_score, e_final (each 0-3 scale)
    const pciIds = pciInstances.map(p => p.id);
    const { data: dimeScores, error: dimeError } = await supabase
      .from('derived_dime_scores')
      .select('pci_instance_id, d_score, i_score, m_score, e_final')
      .in('pci_instance_id', pciIds);

    if (dimeError) {
      console.error('Error fetching DIME scores:', dimeError);
      // Continue with zero effectiveness if DIME scores fail
    }

    // Create a map of PCI instance ID to average DIME score
    const dimeMap = new Map<string, number>();
    if (dimeScores) {
      for (const score of dimeScores) {
        // Apply D=0 cascade: if Design=0, I/M/E are all forced to 0
        const d = score.d_score ?? 0;
        const i = d === 0 ? 0 : (score.i_score ?? 0);
        const m = d === 0 ? 0 : (score.m_score ?? 0);
        const e = d === 0 ? 0 : (score.e_final ?? 0);
        const avgScore = (d + i + m + e) / 4;
        dimeMap.set(score.pci_instance_id, avgScore);
      }
    }

    // Calculate max effectiveness for each dimension
    let maxLikelihoodEffectiveness = 0;
    let maxImpactEffectiveness = 0;

    for (const pci of pciInstances) {
      // Get the DIME average score (0-3 scale)
      const avgScore = dimeMap.get(pci.id) ?? 0;

      // Convert DIME average (0-3) to effectiveness (0-1)
      // A perfect DIME score of 3 = 100% effectiveness
      const effectiveness = Math.min(1, avgScore / 3);

      // Apply based on control objective
      const objective = pci.objective as 'likelihood' | 'impact' | 'both';

      if (objective === 'likelihood' || objective === 'both') {
        maxLikelihoodEffectiveness = Math.max(maxLikelihoodEffectiveness, effectiveness);
      }
      if (objective === 'impact' || objective === 'both') {
        maxImpactEffectiveness = Math.max(maxImpactEffectiveness, effectiveness);
      }
    }

    // Apply SSD formula: residual = GREATEST(1, inherent - ROUND((inherent - 1) * max_effectiveness))
    const residualLikelihood = Math.max(
      1,
      inherentLikelihood - Math.round((inherentLikelihood - 1) * maxLikelihoodEffectiveness)
    );

    const residualImpact = Math.max(
      1,
      inherentImpact - Math.round((inherentImpact - 1) * maxImpactEffectiveness)
    );

    const residualScore = residualLikelihood * residualImpact;

    return {
      data: {
        residual_likelihood: residualLikelihood,
        residual_impact: residualImpact,
        residual_score: residualScore,
        max_likelihood_effectiveness: maxLikelihoodEffectiveness,
        max_impact_effectiveness: maxImpactEffectiveness,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error calculating PCI residual risk:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get a single PCI instance with all related data
 */
export async function getPCIInstance(pciInstanceId: string) {
  const { data, error } = await supabase
    .from('pci_instances')
    .select(`
      *,
      pci_template:pci_templates(*),
      secondary_control_instances(
        *,
        secondary_control_template:secondary_control_templates(*)
      ),
      derived_dime_score:derived_dime_scores(*),
      confidence_score:confidence_scores(*)
    `)
    .eq('id', pciInstanceId)
    .single();

  return { data: data as PCIInstance | null, error };
}

/**
 * Create a new PCI instance
 * Note: This will trigger auto-creation of 10 secondary control instances
 */
export async function createPCIInstance(input: CreatePCIInstanceData) {
  const authProfile = await getAuthenticatedProfile();

  if (!authProfile?.organization_id) {
    return { data: null, error: { message: 'Organization not found' } };
  }
  const profile = authProfile;

  // Get template to freeze version
  const { data: template } = await getPCITemplate(input.pci_template_id);
  if (!template) {
    return { data: null, error: { message: 'PCI template not found' } };
  }

  const { data, error } = await supabase
    .from('pci_instances')
    .insert({
      organization_id: profile.organization_id,
      risk_id: input.risk_id,
      pci_template_id: input.pci_template_id,
      pci_template_version: template.version,
      objective: input.objective || template.objective_default,
      statement: input.statement || null,
      scope_boundary: input.scope_boundary,
      method: input.method,
      target_threshold_standard: input.target_threshold_standard || null,
      trigger_frequency: input.trigger_frequency,
      owner_role: input.owner_role,
      owner_user_id: input.owner_user_id || null,
      dependencies: input.dependencies || null,
      status: 'draft',
      created_by: authProfile?.id,
    })
    .select(`
      *,
      pci_template:pci_templates(*),
      secondary_control_instances(
        *,
        secondary_control_template:secondary_control_templates(*)
      )
    `)
    .single();

  return { data: data as PCIInstance | null, error };
}

/**
 * Update a PCI instance
 */
export async function updatePCIInstance(
  pciInstanceId: string,
  updates: UpdatePCIInstanceData
) {
  const authProfile = await getAuthenticatedProfile();

  const { data, error } = await supabase
    .from('pci_instances')
    .update({
      ...updates,
      updated_by: authProfile?.id,
    })
    .eq('id', pciInstanceId)
    .select(`
      *,
      pci_template:pci_templates(*),
      derived_dime_score:derived_dime_scores(*),
      confidence_score:confidence_scores(*)
    `)
    .single();

  return { data: data as PCIInstance | null, error };
}

/**
 * Retire a PCI instance (soft delete)
 */
export async function retirePCIInstance(pciInstanceId: string) {
  return updatePCIInstance(pciInstanceId, { status: 'retired' });
}

/**
 * Activate a PCI instance (commit attestation)
 * Should only be called when all secondary controls have been attested
 */
export async function activatePCIInstance(pciInstanceId: string) {
  return updatePCIInstance(pciInstanceId, { status: 'active' });
}

/**
 * Mark a PCI template as "Not Applicable" for a specific risk
 * Creates a minimal PCI instance with status='not_applicable'
 */
export async function declinePCITemplate(riskId: string, templateId: string) {
  const authProfile = await getAuthenticatedProfile();

  if (!authProfile?.organization_id) {
    return { data: null, error: { message: 'Organization not found' } };
  }
  const profile = authProfile;

  // Get template to freeze version
  const { data: template } = await getPCITemplate(templateId);
  if (!template) {
    return { data: null, error: { message: 'PCI template not found' } };
  }

  const { data, error } = await supabase
    .from('pci_instances')
    .insert({
      organization_id: profile.organization_id,
      risk_id: riskId,
      pci_template_id: templateId,
      pci_template_version: template.version,
      objective: template.objective_default,
      statement: 'Not applicable to this risk',
      scope_boundary: 'N/A',
      method: 'N/A',
      trigger_frequency: 'N/A',
      owner_role: 'N/A',
      status: 'not_applicable',
      created_by: authProfile?.id,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Get declined (not applicable) PCI templates for a risk
 */
export async function getDeclinedTemplatesForRisk(riskId: string) {
  const { data, error } = await supabase
    .from('pci_instances')
    .select('pci_template_id')
    .eq('risk_id', riskId)
    .eq('status', 'not_applicable');

  return {
    data: data?.map((d) => d.pci_template_id) || [],
    error,
  };
}

/**
 * Undo declining a PCI template (delete the not_applicable instance)
 */
export async function undoDeclinePCITemplate(riskId: string, templateId: string) {
  const { error } = await supabase
    .from('pci_instances')
    .delete()
    .eq('risk_id', riskId)
    .eq('pci_template_id', templateId)
    .eq('status', 'not_applicable');

  return { error };
}

/**
 * Check if all secondary controls for a PCI instance have been attested
 */
export async function checkAttestationComplete(pciInstanceId: string): Promise<{
  complete: boolean;
  total: number;
  attested: number;
}> {
  const { data, error } = await supabase
    .from('secondary_control_instances')
    .select('id, status')
    .eq('pci_instance_id', pciInstanceId);

  if (error || !data) {
    return { complete: false, total: 0, attested: 0 };
  }

  const total = data.length;
  const attested = data.filter((sc) => sc.status !== null).length;

  return {
    complete: total > 0 && attested === total,
    total,
    attested,
  };
}

// ============================================================================
// SECONDARY CONTROL INSTANCES (Attestations)
// ============================================================================

/**
 * Get secondary control instances for a PCI instance
 */
export async function getSecondaryControlInstances(pciInstanceId: string) {
  const { data, error } = await supabase
    .from('secondary_control_instances')
    .select(`
      *,
      secondary_control_template:secondary_control_templates(*)
    `)
    .eq('pci_instance_id', pciInstanceId)
    .order('secondary_control_template(code)');

  return { data: data as SecondaryControlInstance[] | null, error };
}

/**
 * Update a secondary control instance (attestation)
 */
export async function updateSecondaryControlInstance(
  instanceId: string,
  updates: UpdateSecondaryControlData
) {
  const authProfile = await getAuthenticatedProfile();

  // If status is being set, update attestation metadata
  const attestationFields =
    updates.status !== undefined
      ? {
          attested_by: authProfile?.id,
          attested_at: new Date().toISOString(),
        }
      : {};

  const { data, error } = await supabase
    .from('secondary_control_instances')
    .update({
      ...updates,
      ...attestationFields,
    })
    .eq('id', instanceId)
    .select(`
      *,
      secondary_control_template:secondary_control_templates(*)
    `)
    .single();

  return { data: data as SecondaryControlInstance | null, error };
}

/**
 * Batch update multiple secondary control instances
 */
export async function batchUpdateSecondaryControls(
  updates: Array<{ id: string } & UpdateSecondaryControlData>
) {
  const authProfile = await getAuthenticatedProfile();
  const results = [];

  for (const update of updates) {
    const { id, ...fields } = update;
    const attestationFields =
      fields.status !== undefined
        ? {
            attested_by: authProfile?.id,
            attested_at: new Date().toISOString(),
          }
        : {};

    const { data, error } = await supabase
      .from('secondary_control_instances')
      .update({
        ...fields,
        ...attestationFields,
      })
      .eq('id', id)
      .select()
      .single();

    results.push({ data, error });
  }

  return results;
}

// ============================================================================
// DIME & CONFIDENCE COMPUTATION
// ============================================================================

/**
 * Manually trigger DIME recomputation for a PCI instance
 * (Usually triggered automatically by database trigger)
 */
export async function recomputeDIME(pciInstanceId: string) {
  const { data, error } = await supabase.rpc('compute_dime_for_pci', {
    p_pci_instance_id: pciInstanceId,
  });

  return { data: data?.[0] as DerivedDIMEScore | null, error };
}

/**
 * Manually trigger Confidence recomputation for a PCI instance
 * (Usually triggered automatically by database trigger)
 */
export async function recomputeConfidence(pciInstanceId: string) {
  const { data, error } = await supabase.rpc('compute_confidence_for_pci', {
    p_pci_instance_id: pciInstanceId,
  });

  return { data: data?.[0] as ConfidenceScore | null, error };
}

/**
 * Get DIME score for a PCI instance
 */
export async function getDIMEScore(pciInstanceId: string) {
  const { data, error } = await supabase
    .from('derived_dime_scores')
    .select('*')
    .eq('pci_instance_id', pciInstanceId)
    .single();

  return { data: data as DerivedDIMEScore | null, error };
}

/**
 * Get Confidence score for a PCI instance
 */
export async function getConfidenceScore(pciInstanceId: string) {
  const { data, error } = await supabase
    .from('confidence_scores')
    .select('*')
    .eq('pci_instance_id', pciInstanceId)
    .single();

  return { data: data as ConfidenceScore | null, error };
}

// ============================================================================
// G1 GATE
// ============================================================================

/**
 * Check if a risk can be activated (G1 Gate)
 */
export async function checkActivationGate(riskId: string) {
  const { data, error } = await supabase.rpc('check_risk_activation_gate', {
    p_risk_id: riskId,
  });

  if (error) {
    return { data: null, error };
  }

  // RPC returns array, take first result
  const result = data?.[0] as G1GateResult | undefined;
  return { data: result || null, error: null };
}

// ============================================================================
// EVIDENCE REQUESTS
// ============================================================================

/**
 * Get evidence requests for an organization
 */
export async function getEvidenceRequests(filters?: {
  risk_id?: string;
  pci_instance_id?: string;
  status?: string;
}) {
  let query = supabase.from('evidence_requests').select('*');

  if (filters?.risk_id) {
    query = query.eq('risk_id', filters.risk_id);
  }
  if (filters?.pci_instance_id) {
    query = query.eq('pci_instance_id', filters.pci_instance_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('due_date');

  return { data: data as EvidenceRequest[] | null, error };
}

/**
 * Create an evidence request
 */
export async function createEvidenceRequest(input: CreateEvidenceRequestData) {
  const authProfile = await getAuthenticatedProfile();

  if (!authProfile?.organization_id) {
    return { data: null, error: { message: 'Organization not found' } };
  }
  const profile = authProfile;

  const { data, error } = await supabase
    .from('evidence_requests')
    .insert({
      organization_id: profile.organization_id,
      risk_id: input.risk_id || null,
      pci_instance_id: input.pci_instance_id || null,
      secondary_control_instance_id: input.secondary_control_instance_id || null,
      requested_by: authProfile?.id,
      due_date: input.due_date,
      notes: input.notes || null,
      is_critical_scope: input.is_critical_scope || false,
      status: 'open',
    })
    .select()
    .single();

  return { data: data as EvidenceRequest | null, error };
}

/**
 * Update evidence request status
 */
export async function updateEvidenceRequestStatus(
  requestId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('evidence_requests')
    .update({ status })
    .eq('id', requestId)
    .select()
    .single();

  return { data: data as EvidenceRequest | null, error };
}

// ============================================================================
// EVIDENCE SUBMISSIONS
// ============================================================================

/**
 * Get submissions for an evidence request
 */
export async function getEvidenceSubmissions(requestId: string) {
  const { data, error } = await supabase
    .from('evidence_submissions')
    .select('*')
    .eq('evidence_request_id', requestId)
    .order('submitted_at', { ascending: false });

  return { data: data as EvidenceSubmission[] | null, error };
}

/**
 * Create an evidence submission
 */
export async function createEvidenceSubmission(
  input: CreateEvidenceSubmissionData
) {
  const authProfile = await getAuthenticatedProfile();

  const { data, error } = await supabase
    .from('evidence_submissions')
    .insert({
      evidence_request_id: input.evidence_request_id,
      submission_note: input.submission_note,
      submitted_by: authProfile?.id,
    })
    .select()
    .single();

  // Also update the request status to 'submitted'
  if (data) {
    await updateEvidenceRequestStatus(input.evidence_request_id, 'submitted');
  }

  return { data: data as EvidenceSubmission | null, error };
}

/**
 * Review an evidence submission (accept or reject)
 */
export async function reviewEvidenceSubmission(
  submissionId: string,
  decision: 'accepted' | 'rejected',
  reviewNotes?: string
) {
  const authProfile = await getAuthenticatedProfile();

  const { data, error } = await supabase
    .from('evidence_submissions')
    .update({
      reviewed_by: authProfile?.id,
      reviewed_at: new Date().toISOString(),
      decision,
      review_notes: reviewNotes || null,
    })
    .eq('id', submissionId)
    .select()
    .single();

  // Also update the evidence request status
  if (data) {
    await updateEvidenceRequestStatus(
      data.evidence_request_id,
      decision === 'accepted' ? 'accepted' : 'rejected'
    );
  }

  return { data: data as EvidenceSubmission | null, error };
}

// ============================================================================
// AI SUGGESTIONS
// ============================================================================

export interface PCISuggestion {
  template_id: string;
  template_name: string;
  priority: number;
  rationale: string;
}

/**
 * Get AI-powered PCI template suggestions for a risk and response type
 */
export async function getPCISuggestions(
  riskId: string,
  responseType: string
): Promise<{ data: PCISuggestion[] | null; error: any }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'suggest-pci-templates',
      {
        body: {
          risk_id: riskId,
          response_type: responseType,
        },
      }
    );

    if (error) {
      console.error('Error calling suggest-pci-templates:', error);
      return { data: null, error };
    }

    if (data?.error) {
      console.error('Edge function returned error:', data.error);
      return { data: null, error: { message: data.error } };
    }

    return { data: data?.suggestions || [], error: null };
  } catch (err) {
    console.error('Failed to get PCI suggestions:', err);
    return { data: null, error: err };
  }
}
