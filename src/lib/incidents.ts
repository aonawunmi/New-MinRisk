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
