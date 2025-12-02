/**
 * Incident Management Library
 *
 * Functions for managing incidents, linking to risks, and tracking
 * incident lifecycle from reporting to resolution.
 */

import { supabase } from './supabase';

// =====================================================
// TYPES
// =====================================================

export interface Incident {
  id: string;
  org_id: string;
  incident_number: string;
  title: string;
  description?: string;
  incident_type: 'security' | 'operational' | 'compliance' | 'financial' | 'reputational' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'reported' | 'investigating' | 'contained' | 'resolved' | 'closed';
  incident_date: string;
  discovered_date: string;
  reported_date: string;
  resolved_date?: string;
  closed_date?: string;
  impact_description?: string;
  financial_impact?: number;
  affected_systems?: string[];
  affected_customers?: number;
  data_breach?: boolean;
  root_cause_id?: string;
  root_cause_description?: string;
  contributing_factors?: string[];
  reported_by?: string;
  assigned_to?: string;
  investigated_by?: string[];
  resolution_summary?: string;
  corrective_actions?: string[];
  preventive_actions?: string[];
  lessons_learned?: string;
  regulatory_notification_required?: boolean;
  regulatory_body?: string;
  notification_date?: string;
  regulatory_reference?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  attachments?: any[];
}

export interface IncidentRiskLink {
  id: string;
  incident_id: string;
  risk_id: string;
  link_type: 'materialized' | 'near_miss' | 'control_failure';
  notes?: string;
  linked_at: string;
  linked_by?: string;
}

export interface IncidentSummary extends Incident {
  linked_risks_count: number;
  linked_risk_ids: string[];
  linked_risk_titles: string[];
}

export interface IncidentFormData {
  title: string;
  description?: string;
  incident_type: string;
  severity: string;
  status?: string;
  incident_date: string;
  discovered_date: string;
  impact_description?: string;
  financial_impact?: number;
  affected_systems?: string[];
  affected_customers?: number;
  data_breach?: boolean;
  root_cause_id?: string;
  root_cause_description?: string;
  contributing_factors?: string[];
  assigned_to?: string;
  resolution_summary?: string;
  corrective_actions?: string[];
  preventive_actions?: string[];
  lessons_learned?: string;
  regulatory_notification_required?: boolean;
  regulatory_body?: string;
  notification_date?: string;
  regulatory_reference?: string;
  tags?: string[];
}

// =====================================================
// INCIDENT CRUD OPERATIONS
// =====================================================

/**
 * Get all incidents for an organization with risk links
 */
export async function getIncidents(orgId: string) {
  const { data, error } = await supabase
    .from('incident_summary')
    .select('*')
    .eq('org_id', orgId)
    .order('incident_date', { ascending: false });

  return { data: data as IncidentSummary[] | null, error };
}

/**
 * Get a single incident by ID with full details
 */
export async function getIncidentById(incidentId: string) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  return { data: data as Incident | null, error };
}

/**
 * Get incidents by status
 */
export async function getIncidentsByStatus(
  orgId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('incident_summary')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', status)
    .order('incident_date', { ascending: false });

  return { data: data as IncidentSummary[] | null, error };
}

/**
 * Get incidents by severity
 */
export async function getIncidentsBySeverity(
  orgId: string,
  severity: string
) {
  const { data, error } = await supabase
    .from('incident_summary')
    .select('*')
    .eq('org_id', orgId)
    .eq('severity', severity)
    .order('incident_date', { ascending: false });

  return { data: data as IncidentSummary[] | null, error };
}

/**
 * Get incidents linked to a specific risk
 */
export async function getIncidentsByRisk(riskId: string) {
  // First get incident IDs linked to this risk
  const { data: links, error: linksError } = await supabase
    .from('incident_risk_links')
    .select('incident_id')
    .eq('risk_id', riskId);

  if (linksError || !links || links.length === 0) {
    return { data: [] as IncidentSummary[], error: linksError };
  }

  const incidentIds = links.map((link) => link.incident_id);

  // Get incident details
  const { data, error } = await supabase
    .from('incident_summary')
    .select('*')
    .in('id', incidentIds)
    .order('incident_date', { ascending: false });

  return { data: data as IncidentSummary[] | null, error };
}

/**
 * Create a new incident
 */
export async function createIncident(
  orgId: string,
  userId: string,
  incidentData: IncidentFormData
) {
  // First, generate incident number
  const { data: numberData, error: numberError } = await supabase.rpc(
    'generate_incident_number',
    { p_org_id: orgId }
  );

  if (numberError) {
    return { data: null, error: numberError };
  }

  const incident_number = numberData as string;

  // Create incident
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      org_id: orgId,
      incident_number,
      ...incidentData,
      reported_by: userId,
      created_by: userId,
      status: incidentData.status || 'reported',
    })
    .select()
    .single();

  return { data: data as Incident | null, error };
}

/**
 * Update an incident
 */
export async function updateIncident(
  incidentId: string,
  updates: Partial<IncidentFormData>
) {
  const { data, error } = await supabase
    .from('incidents')
    .update(updates)
    .eq('id', incidentId)
    .select()
    .single();

  return { data: data as Incident | null, error };
}

/**
 * Delete an incident
 */
export async function deleteIncident(incidentId: string) {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', incidentId);

  return { error };
}

/**
 * Close an incident
 */
export async function closeIncident(
  incidentId: string,
  resolutionSummary: string,
  lessonsLearned?: string
) {
  const { data, error } = await supabase
    .from('incidents')
    .update({
      status: 'closed',
      closed_date: new Date().toISOString(),
      resolution_summary: resolutionSummary,
      lessons_learned: lessonsLearned,
    })
    .eq('id', incidentId)
    .select()
    .single();

  return { data: data as Incident | null, error };
}

// =====================================================
// INCIDENT-RISK LINKS
// =====================================================

/**
 * Get all risk links for an incident
 */
export async function getIncidentRiskLinks(incidentId: string) {
  const { data, error } = await supabase
    .from('incident_risk_links')
    .select(`
      *,
      risks:risk_id (
        id,
        title,
        risk_id,
        category
      )
    `)
    .eq('incident_id', incidentId);

  return { data, error };
}

/**
 * Link an incident to a risk
 */
export async function linkIncidentToRisk(
  incidentId: string,
  riskId: string,
  userId: string,
  linkType: 'materialized' | 'near_miss' | 'control_failure' = 'materialized',
  notes?: string
) {
  const { data, error } = await supabase
    .from('incident_risk_links')
    .insert({
      incident_id: incidentId,
      risk_id: riskId,
      link_type: linkType,
      notes,
      linked_by: userId,
    })
    .select()
    .single();

  return { data: data as IncidentRiskLink | null, error };
}

/**
 * Unlink an incident from a risk
 */
export async function unlinkIncidentFromRisk(linkId: string) {
  const { error } = await supabase
    .from('incident_risk_links')
    .delete()
    .eq('id', linkId);

  return { error };
}

/**
 * Update a risk link
 */
export async function updateIncidentRiskLink(
  linkId: string,
  updates: { link_type?: string; notes?: string }
) {
  const { data, error } = await supabase
    .from('incident_risk_links')
    .update(updates)
    .eq('id', linkId)
    .select()
    .single();

  return { data: data as IncidentRiskLink | null, error };
}

// =====================================================
// ANALYTICS & REPORTING
// =====================================================

/**
 * Get incident statistics for an organization
 */
export async function getIncidentStats(orgId: string) {
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select('severity, status, incident_type, financial_impact, incident_date, resolved_date')
    .eq('org_id', orgId);

  if (error || !incidents) {
    return {
      data: null,
      error,
    };
  }

  // Calculate statistics
  const stats = {
    total_incidents: incidents.length,
    by_severity: {} as Record<string, number>,
    by_status: {} as Record<string, number>,
    by_type: {} as Record<string, number>,
    total_financial_impact: 0,
    open_incidents: 0,
    closed_incidents: 0,
    avg_time_to_resolution: 0,
  };

  let resolutionTimes: number[] = [];

  incidents.forEach((incident) => {
    // By severity
    stats.by_severity[incident.severity] =
      (stats.by_severity[incident.severity] || 0) + 1;

    // By status
    stats.by_status[incident.status] =
      (stats.by_status[incident.status] || 0) + 1;

    // By type
    stats.by_type[incident.incident_type] =
      (stats.by_type[incident.incident_type] || 0) + 1;

    // Financial impact
    if (incident.financial_impact) {
      stats.total_financial_impact += incident.financial_impact;
    }

    // Open vs closed
    if (['reported', 'investigating', 'contained'].includes(incident.status)) {
      stats.open_incidents++;
    } else {
      stats.closed_incidents++;
    }

    // Resolution time
    if (incident.resolved_date) {
      const incidentDate = new Date(incident.incident_date).getTime();
      const resolvedDate = new Date(incident.resolved_date).getTime();
      const days = Math.floor((resolvedDate - incidentDate) / (1000 * 60 * 60 * 24));
      resolutionTimes.push(days);
    }
  });

  if (resolutionTimes.length > 0) {
    stats.avg_time_to_resolution = Math.round(
      resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    );
  }

  return { data: stats, error: null };
}

/**
 * Get recent incidents (last 30 days)
 */
export async function getRecentIncidents(orgId: string, days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('incident_summary')
    .select('*')
    .eq('org_id', orgId)
    .gte('incident_date', cutoffDate.toISOString())
    .order('incident_date', { ascending: false });

  return { data: data as IncidentSummary[] | null, error };
}

/**
 * Get critical incidents (critical severity or unresolved for >30 days)
 */
export async function getCriticalIncidents(orgId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('incident_summary')
    .select('*')
    .eq('org_id', orgId)
    .or(`severity.eq.critical,and(status.in.(reported,investigating),incident_date.lt.${thirtyDaysAgo.toISOString()})`)
    .order('incident_date', { ascending: false });

  return { data: data as IncidentSummary[] | null, error };
}

/**
 * Search incidents by keyword
 */
export async function searchIncidents(orgId: string, searchTerm: string) {
  const { data, error } = await supabase
    .from('incident_summary')
    .select('*')
    .eq('org_id', orgId)
    .or(
      `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,incident_number.ilike.%${searchTerm}%`
    )
    .order('incident_date', { ascending: false });

  return { data: data as IncidentSummary[] | null, error };
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Get severity color class
 */
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-700 bg-red-100 border-red-300',
    high: 'text-orange-700 bg-orange-100 border-orange-300',
    medium: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    low: 'text-blue-700 bg-blue-100 border-blue-300',
  };
  return colors[severity.toLowerCase()] || 'text-gray-700 bg-gray-100 border-gray-300';
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    reported: 'text-blue-700 bg-blue-100 border-blue-300',
    investigating: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    contained: 'text-orange-700 bg-orange-100 border-orange-300',
    resolved: 'text-green-700 bg-green-100 border-green-300',
    closed: 'text-gray-700 bg-gray-100 border-gray-300',
  };
  return colors[status.toLowerCase()] || 'text-gray-700 bg-gray-100 border-gray-300';
}

/**
 * Format incident number for display
 */
export function formatIncidentNumber(incidentNumber: string): string {
  return incidentNumber; // Already formatted as INC-2025-001
}

// =====================================================
// AI-POWERED FEATURES
// =====================================================

/**
 * AI-suggested risk structure
 */
export interface AISuggestedRisk {
  risk_code: string;
  risk_title: string;
  confidence: number; // 0-100
  reasoning: string;
  link_type: 'materialized' | 'near_miss' | 'control_failure';
  status: 'pending' | 'accepted' | 'rejected';
  suggested_at: string;
}

/**
 * Control adequacy assessment structure
 */
export interface ControlAdequacyAssessment {
  assessment: 'Adequate' | 'Partially Adequate' | 'Inadequate';
  reasoning: string;
  dime_adjustments: Array<{
    control_id: string;
    control_name: string;
    dimension: 'design' | 'implementation' | 'monitoring' | 'evaluation';
    current_score: number;
    suggested_score: number;
    reason: string;
  }>;
  suggested_controls: Array<{
    name: string;
    description: string;
    control_type: 'preventive' | 'detective' | 'corrective';
    target: 'likelihood' | 'impact';
    expected_dime: {
      design: number;
      implementation: number;
      monitoring: number;
      evaluation: number;
    };
    implementation_priority: 'High' | 'Medium' | 'Low';
  }>;
  priority: 'High' | 'Medium' | 'Low';
  analyzed_at: string;
}

/**
 * Suggest risks for an incident using AI analysis
 */
export async function suggestRisksForIncident(incidentId: string) {
  try {
    // 1. Get incident details
    const { data: incident, error: incidentError } = await getIncidentById(incidentId);
    if (incidentError || !incident) {
      return { data: null, error: new Error('Incident not found') };
    }

    // 2. Get all active risks for the organization
    const { data: allRisks } = await supabase
      .from('risks')
      .select('id, risk_code, risk_title, risk_description, category, division, department')
      .eq('org_id', incident.org_id)
      .in('status', ['OPEN', 'MONITORING']);

    const risks = allRisks || [];

    if (risks.length === 0) {
      return { data: [], error: null };
    }

    // 3. Call Edge Function for AI analysis
    console.log(`Calling AI to analyze incident "${incident.title}" against ${risks.length} risks...`);

    const { data: aiResult, error: aiError } = await supabase.functions.invoke('analyze-incident', {
      body: {
        action: 'suggest_risks',
        incident: {
          title: incident.title,
          description: incident.description,
          incident_type: incident.incident_type,
          severity: incident.severity,
          incident_date: incident.incident_date,
          division: incident.division,
          department: incident.department,
          financial_impact: incident.financial_impact,
          root_cause: incident.root_cause_description,
          impact_description: incident.impact_description,
        },
        risks,
      },
    });

    if (aiError) {
      console.error('AI analysis error:', aiError);
      return { data: null, error: new Error('AI analysis failed: ' + aiError.message) };
    }

    if (!aiResult?.success) {
      return { data: null, error: new Error(aiResult?.error || 'AI analysis failed') };
    }

    const suggestedRisks: AISuggestedRisk[] = (aiResult.data || []).map((suggestion: any) => ({
      risk_code: suggestion.risk_code,
      risk_title: suggestion.risk_title,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      link_type: suggestion.link_type || 'materialized',
      status: 'pending',
      suggested_at: new Date().toISOString(),
    }));

    // 4. Update incident with AI suggestions
    const { error: updateError } = await supabase
      .from('incidents')
      .update({
        ai_suggested_risks: suggestedRisks,
        ai_analysis_date: new Date().toISOString(),
        ai_analysis_status: 'completed',
      })
      .eq('id', incidentId);

    if (updateError) {
      console.error('Error updating incident with AI suggestions:', updateError);
      return { data: null, error: updateError };
    }

    console.log(`✅ AI suggested ${suggestedRisks.length} risk link(s)`);
    return { data: suggestedRisks, error: null };

  } catch (error) {
    console.error('Error in suggestRisksForIncident:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Accept an AI-suggested risk link
 */
export async function acceptRiskSuggestion(incidentId: string, riskCode: string) {
  try {
    // 1. Get incident
    const { data: incident, error: incidentError } = await getIncidentById(incidentId);
    if (incidentError || !incident) {
      return { data: null, error: new Error('Incident not found') };
    }

    // 2. Get the suggestion from ai_suggested_risks
    const suggestions = incident.ai_suggested_risks as AISuggestedRisk[];
    const suggestion = suggestions?.find(s => s.risk_code === riskCode);

    if (!suggestion) {
      return { data: null, error: new Error('Risk suggestion not found') };
    }

    // 3. Get the risk ID
    const { data: risk } = await supabase
      .from('risks')
      .select('id')
      .eq('risk_code', riskCode)
      .eq('org_id', incident.org_id)
      .single();

    if (!risk) {
      return { data: null, error: new Error('Risk not found') };
    }

    // 4. Create the incident-risk link
    const linkResult = await linkIncidentToRisk(incidentId, risk.id, {
      link_type: suggestion.link_type,
      notes: `AI-suggested link (${suggestion.confidence}% confidence): ${suggestion.reasoning}`,
    });

    if (linkResult.error) {
      return { data: null, error: linkResult.error };
    }

    // 5. Update suggestion status to 'accepted'
    const updatedSuggestions = suggestions.map(s =>
      s.risk_code === riskCode ? { ...s, status: 'accepted' as const } : s
    );

    const { error: updateError } = await supabase
      .from('incidents')
      .update({ ai_suggested_risks: updatedSuggestions })
      .eq('id', incidentId);

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: linkResult.data, error: null };

  } catch (error) {
    console.error('Error accepting risk suggestion:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Reject an AI-suggested risk link
 */
export async function rejectRiskSuggestion(incidentId: string, riskCode: string) {
  try {
    // 1. Get incident
    const { data: incident, error: incidentError } = await getIncidentById(incidentId);
    if (incidentError || !incident) {
      return { data: null, error: new Error('Incident not found') };
    }

    // 2. Update suggestion status to 'rejected'
    const suggestions = incident.ai_suggested_risks as AISuggestedRisk[];
    const updatedSuggestions = suggestions?.map(s =>
      s.risk_code === riskCode ? { ...s, status: 'rejected' as const } : s
    ) || [];

    const { error: updateError } = await supabase
      .from('incidents')
      .update({ ai_suggested_risks: updatedSuggestions })
      .eq('id', incidentId);

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: true, error: null };

  } catch (error) {
    console.error('Error rejecting risk suggestion:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Assess control adequacy for a linked risk
 */
export async function assessControlAdequacy(incidentId: string, riskId: string) {
  try {
    // 1. Get incident
    const { data: incident, error: incidentError } = await getIncidentById(incidentId);
    if (incidentError || !incident) {
      return { data: null, error: new Error('Incident not found') };
    }

    // 2. Get risk details
    const { data: risk, error: riskError } = await supabase
      .from('risks')
      .select('*')
      .eq('id', riskId)
      .single();

    if (riskError || !risk) {
      return { data: null, error: new Error('Risk not found') };
    }

    // 3. Get controls for this risk
    const { data: controls } = await supabase
      .from('risk_controls')
      .select(`
        control_id,
        controls:control_id (
          id,
          name,
          description,
          control_type,
          target,
          design_score,
          implementation_score,
          monitoring_score,
          evaluation_score
        )
      `)
      .eq('risk_id', riskId);

    const controlsList = controls?.map(rc => rc.controls).filter(Boolean) || [];

    // 4. Call Edge Function for control assessment
    console.log(`Assessing controls for risk ${risk.risk_code}...`);

    const { data: aiResult, error: aiError } = await supabase.functions.invoke('analyze-incident', {
      body: {
        action: 'assess_controls',
        incident: {
          title: incident.title,
          description: incident.description,
          incident_type: incident.incident_type,
          severity: incident.severity,
          financial_impact: incident.financial_impact,
          root_cause: incident.root_cause_description,
        },
        risk: {
          risk_code: risk.risk_code,
          risk_title: risk.risk_title,
          risk_description: risk.risk_description,
          category: risk.category,
          likelihood_inherent: risk.likelihood_inherent,
          impact_inherent: risk.impact_inherent,
        },
        controls: controlsList,
      },
    });

    if (aiError) {
      console.error('Control assessment error:', aiError);
      return { data: null, error: new Error('Control assessment failed: ' + aiError.message) };
    }

    if (!aiResult?.success) {
      return { data: null, error: new Error(aiResult?.error || 'Control assessment failed') };
    }

    const assessment: ControlAdequacyAssessment = {
      ...aiResult.data,
      analyzed_at: new Date().toISOString(),
    };

    // 5. Update incident with control recommendations
    const { error: updateError } = await supabase
      .from('incidents')
      .update({
        ai_control_recommendations: assessment,
      })
      .eq('id', incidentId);

    if (updateError) {
      return { data: null, error: updateError };
    }

    console.log(`✅ Control assessment: ${assessment.assessment}`);
    return { data: assessment, error: null };

  } catch (error) {
    console.error('Error assessing control adequacy:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate incident data
 */
export function validateIncidentData(data: IncidentFormData): string[] {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!data.incident_type) {
    errors.push('Incident type is required');
  }

  if (!data.severity) {
    errors.push('Severity is required');
  }

  if (!data.incident_date) {
    errors.push('Incident date is required');
  }

  if (!data.discovered_date) {
    errors.push('Discovery date is required');
  }

  // Validate that incident_date <= discovered_date
  if (data.incident_date && data.discovered_date) {
    const incidentDate = new Date(data.incident_date);
    const discoveredDate = new Date(data.discovered_date);
    if (incidentDate > discoveredDate) {
      errors.push('Incident date cannot be after discovery date');
    }
  }

  return errors;
}
