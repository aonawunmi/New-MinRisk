/**
 * Incident Management Module - Database Operations
 * Clean implementation using new auth system and Phase 1 schema
 * RLS policies automatically enforce access control
 */

import { supabase } from './supabase';
import type {
  Incident,
  IncidentSummary,
  IncidentComment,
  IncidentAmendment,
  IncidentRiskMappingHistory,
  CreateIncidentInput,
  UpdateIncidentInput,
  CreateCommentInput,
  IncidentFilters,
  IncidentWithDetails,
} from '../types/incident';

// ============================================================
// INCIDENT CRUD OPERATIONS
// ============================================================

/**
 * Get all incidents for current user
 * RLS automatically filters based on user role:
 * - Users see only their own incidents
 * - Admins see all org incidents
 */
export async function getUserIncidents(filters?: IncidentFilters) {
  try {
    let query = supabase
      .from('incidents')
      .select('*')
      .eq('incident_status', 'ACTIVE')  // Filter out VOIDED incidents
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('resolution_status', filters.status);
      }
      if (filters.severity && filters.severity.length > 0) {
        query = query.in('severity', filters.severity);
      }
      if (filters.incident_type && filters.incident_type.length > 0) {
        query = query.in('incident_type', filters.incident_type);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.date_from) {
        query = query.gte('incident_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('incident_date', filters.date_to);
      }
      if (filters.reported_by) {
        query = query.eq('created_by', filters.reported_by);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as Incident[], error: null };
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get single incident by ID with full details
 * Works with actual database schema (incident_summary view)
 */
export async function getIncidentById(incidentId: string) {
  try {
    // Get incident from summary view (already has linked risk info)
    const { data: incident, error: incidentError } = await supabase
      .from('incident_summary')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (incidentError) throw incidentError;
    if (!incident) throw new Error('Incident not found');

    // incident_summary already has linked_risk_ids and linked_risk_titles
    // No need for additional join
    return { data: incident, error: null };
  } catch (error) {
    console.error('Error fetching incident details:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create new incident
 * WORKAROUND: Uses RPC function to bypass PostgREST schema cache
 * Auto-generates incident_code and sets reported_by to current user
 */
export async function createIncident(input: CreateIncidentInput) {
  try {
    // Get current user (needed for authentication check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Call PostgreSQL function that bypasses PostgREST cache
    const { data, error } = await supabase
      .rpc('create_incident_bypass_cache', {
        p_title: input.title,
        p_description: input.description,
        p_incident_type: input.incident_type,
        p_severity: input.severity,
        p_occurred_at: input.occurred_at,
        p_visibility_scope: input.visibility_scope || 'REPORTER_ONLY',
        p_linked_risk_codes: input.linked_risk_codes || [],
        p_financial_impact: input.financial_impact ? parseFloat(input.financial_impact) : null
      })
      .single();

    if (error) throw error;
    return { data: data as Incident, error: null };
  } catch (error) {
    console.error('Error creating incident:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update incident
 * Users can only update their own OPEN incidents
 * Admins can update any incident
 * Status changes are admin-only (enforced by trigger)
 */
export async function updateIncident(incidentId: string, input: UpdateIncidentInput) {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Incident, error: null };
  } catch (error) {
    console.error('Error updating incident:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update incident description (creates amendment record)
 * Only for admins
 */
export async function updateIncidentDescription(
  incidentId: string,
  newDescription: string,
  reason: string
) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current incident
    const { data: incident, error: fetchError } = await supabase
      .from('incidents')
      .select('description, original_description, organization_id')
      .eq('id', incidentId)
      .single();

    if (fetchError) throw fetchError;

    // Update incident
    const { error: updateError } = await supabase
      .from('incidents')
      .update({
        description: newDescription,
        is_description_amended: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (updateError) throw updateError;

    // Create amendment record
    const { error: amendmentError } = await supabase
      .from('incident_amendments')
      .insert({
        incident_id: incidentId,
        organization_id: incident.organization_id,
        amended_by: user.id,
        field_name: 'description',
        old_value: incident.description,
        new_value: newDescription,
        reason,
      });

    if (amendmentError) throw amendmentError;

    return { data: true, error: null };
  } catch (error) {
    console.error('Error updating incident description:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update incident status (Admin only - enforced by trigger)
 */
export async function updateIncidentStatus(
  incidentId: string,
  newStatus: string
) {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Incident, error: null };
  } catch (error) {
    console.error('Error updating incident status:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete incident (Admin only - enforced by RLS)
 */
export async function deleteIncident(incidentId: string) {
  try {
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', incidentId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting incident:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// INCIDENT COMMENTS
// ============================================================
// Note: Comments functionality not available in current schema
// Tables incident_comments, incident_amendments, incident_risk_mapping_history don't exist

// ============================================================
// INCIDENT-RISK LINKING
// ============================================================

/**
 * Link incident to risk
 * Creates mapping history record for audit trail
 */
export async function linkIncidentToRisk(
  incidentId: string,
  riskId: string,
  mappingSource: 'USER_MANUAL' | 'ADMIN_MANUAL' | 'AI_SUGGESTION_ACCEPTED',
  reason?: string,
  confidenceScore?: number
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get incident's organization
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select('organization_id')
      .eq('id', incidentId)
      .single();

    if (incidentError) throw incidentError;

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('incident_risk_links')
      .select('risk_id')
      .eq('incident_id', incidentId)
      .single();

    // Create or update link
    if (existingLink) {
      // Update existing link
      const { error: updateError } = await supabase
        .from('incident_risk_links')
        .update({
          risk_id: riskId,
          linked_by: user.id,
          linked_at: new Date().toISOString(),
        })
        .eq('incident_id', incidentId);

      if (updateError) throw updateError;

      // Record mapping history
      await supabase
        .from('incident_risk_mapping_history')
        .insert({
          organization_id: incident.organization_id,
          incident_id: incidentId,
          modified_by: user.id,
          old_risk_id: existingLink.risk_id,
          new_risk_id: riskId,
          mapping_source: mappingSource,
          reason,
          confidence_score: confidenceScore,
        });
    } else {
      // Create new link
      const { error: insertError } = await supabase
        .from('incident_risk_links')
        .insert({
          incident_id: incidentId,
          risk_id: riskId,
          linked_by: user.id,
        });

      if (insertError) throw insertError;

      // Record mapping history
      await supabase
        .from('incident_risk_mapping_history')
        .insert({
          organization_id: incident.organization_id,
          incident_id: incidentId,
          modified_by: user.id,
          old_risk_id: null,
          new_risk_id: riskId,
          mapping_source: mappingSource,
          reason,
          confidence_score: confidenceScore,
        });
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error linking incident to risk:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Unlink incident from risk
 */
export async function unlinkIncidentFromRisk(incidentId: string, reason?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current link and incident org
    const { data: currentLink } = await supabase
      .from('incident_risk_links')
      .select('risk_id')
      .eq('incident_id', incidentId)
      .single();

    const { data: incident } = await supabase
      .from('incidents')
      .select('organization_id')
      .eq('id', incidentId)
      .single();

    if (!currentLink || !incident) {
      throw new Error('Link or incident not found');
    }

    // Delete link
    const { error: deleteError } = await supabase
      .from('incident_risk_links')
      .delete()
      .eq('incident_id', incidentId);

    if (deleteError) throw deleteError;

    // Record mapping history
    await supabase
      .from('incident_risk_mapping_history')
      .insert({
        organization_id: incident.organization_id,
        incident_id: incidentId,
        modified_by: user.id,
        old_risk_id: currentLink.risk_id,
        new_risk_id: null,
        mapping_source: 'USER_MANUAL',
        reason: reason || 'Link removed',
      });

    return { data: true, error: null };
  } catch (error) {
    console.error('Error unlinking incident from risk:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get incident statistics for dashboard
 */
export async function getIncidentStats() {
  try {
    const { data: incidents, error } = await supabase
      .from('incident_summary')
      .select('status, severity');

    if (error) throw error;

    const stats = {
      total: incidents?.length || 0,
      open: incidents?.filter(i => i.status === 'OPEN').length || 0,
      under_review: incidents?.filter(i => i.status === 'UNDER_REVIEW').length || 0,
      resolved: incidents?.filter(i => i.status === 'RESOLVED').length || 0,
      closed: incidents?.filter(i => i.status === 'CLOSED').length || 0,
      critical: incidents?.filter(i => i.severity === 'CRITICAL').length || 0,
      high: incidents?.filter(i => i.severity === 'HIGH').length || 0,
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching incident stats:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get available incident types from existing incidents
 */
export async function getIncidentTypes() {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('incident_type')
      .not('incident_type', 'is', null);

    if (error) throw error;

    const types = [...new Set(data?.map(i => i.incident_type))].sort();
    return { data: types, error: null };
  } catch (error) {
    console.error('Error fetching incident types:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// AI RISK MAPPING ANALYSIS (Phase 4+5)
// ============================================================

/**
 * Trigger AI analysis for incident-to-risk mapping
 * Calls Edge Function that uses Claude AI to suggest risk mappings
 *
 * @param incidentId - UUID of incident to analyze
 * @returns AI suggestions with confidence scores, keywords, and reasoning
 */
export async function analyzeIncidentForRiskMapping(incidentId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    console.log(`🧠 Triggering AI analysis for incident: ${incidentId}`);

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-incident-for-risk-mapping`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ incident_id: incidentId })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI analysis failed');
    }

    const result = await response.json();

    console.log(`✅ AI analysis complete:`, {
      suggestions_count: result.suggestions_count,
      suggestions: result.suggestions
    });

    return { data: result, error: null };
  } catch (error) {
    console.error('Error triggering AI analysis:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get AI suggestions for an incident
 * Fetches suggestions from incident_risk_ai_suggestions table
 *
 * @param incidentId - UUID of incident
 * @param status - Filter by status (optional): 'pending', 'accepted', 'rejected', 'superseded'
 */
export async function getAISuggestionsForIncident(
  incidentId: string,
  status?: string
) {
  try {
    let query = supabase
      .from('incident_risk_ai_suggestions')
      .select(`
        *,
        risks!risk_id (
          id,
          risk_code,
          risk_title,
          category,
          status
        )
      `)
      .eq('incident_id', incidentId)
      .order('confidence_score', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error details:', error);
      throw error;
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Accept an AI risk suggestion
 * Calls the database function that creates the risk link and updates statuses
 *
 * @param suggestionId - UUID of AI suggestion to accept
 * @param adminNotes - Optional notes from admin reviewer
 * @param classificationConfidence - Admin confidence level (0-100)
 */
export async function acceptAISuggestion(
  suggestionId: string,
  linkType: string,  // NEW: Admin selects link type
  adminNotes?: string,
  classificationConfidence?: number
) {
  try {
    const { data, error } = await supabase.rpc('accept_ai_risk_suggestion', {
      p_suggestion_id: suggestionId,
      p_link_type: linkType,  // NEW: Pass link type to database function
      p_admin_notes: adminNotes || null,
      p_classification_confidence: classificationConfidence || 100
    });

    if (error) throw error;

    console.log('✅ AI suggestion accepted successfully');

    return { data: true, error: null };
  } catch (error) {
    console.error('Error accepting AI suggestion:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Reject an AI risk suggestion
 * Calls the secure database function with full audit trail
 */
export async function rejectAISuggestion(
  suggestionId: string,
  adminNotes?: string
) {
  try {
    const { data, error } = await supabase.rpc('reject_ai_risk_suggestion', {
      p_suggestion_id: suggestionId,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;

    console.log('✅ AI suggestion rejected successfully');

    return { data: true, error: null };
  } catch (error) {
    console.error('Error rejecting AI suggestion:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// MANUAL INCIDENT-RISK LINKING
// ============================================================

/**
 * Manually create incident-to-risk link
 * Allows admins to map incidents to risks without AI suggestions
 */
export async function createIncidentRiskLink(
  incidentId: string,
  riskId: string,
  linkType: string,
  adminNotes?: string,
  classificationConfidence?: number
) {
  try {
    const { data, error } = await supabase.rpc('create_incident_risk_link', {
      p_incident_id: incidentId,
      p_risk_id: riskId,
      p_link_type: linkType,
      p_admin_notes: adminNotes || null,
      p_classification_confidence: classificationConfidence || 100
    });

    if (error) throw error;

    console.log('✅ Incident-risk link created successfully');

    return { data: true, error: null };
  } catch (error) {
    console.error('Error creating incident-risk link:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete incident-to-risk link
 * Allows admins to remove existing mappings
 */
export async function deleteIncidentRiskLink(
  incidentId: string,
  riskId: string,
  adminNotes?: string
) {
  try {
    const { data, error } = await supabase.rpc('delete_incident_risk_link', {
      p_incident_id: incidentId,
      p_risk_id: riskId,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;

    console.log('✅ Incident-risk link deleted successfully');

    return { data: true, error: null };
  } catch (error) {
    console.error('Error deleting incident-risk link:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all risk links for an incident
 * Shows all risks mapped to this incident
 */
export async function getIncidentRiskLinks(incidentId: string) {
  try {
    const { data, error } = await supabase
      .from('incident_risk_links')
      .select(`
        *,
        risks (
          id,
          risk_code,
          risk_title,
          category,
          status
        )
      `)
      .eq('incident_id', incidentId)
      .order('linked_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching incident risk links:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get mapping audit history for an incident
 * Shows full history of risk mapping changes
 */
export async function getIncidentMappingHistory(incidentId: string) {
  try {
    const { data, error } = await supabase
      .from('incident_risk_mapping_history')
      .select(`
        *,
        risks (
          risk_code,
          risk_title
        )
      `)
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching incident mapping history:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// INCIDENT LIFECYCLE MANAGEMENT
// ============================================================

/**
 * Void/withdraw an incident (soft delete)
 * Admin only - marks incident as invalid/poorly captured
 * Maintains full audit trail - never hard deletes
 */
export async function voidIncident(
  incidentId: string,
  reason: string
) {
  try {
    const { error } = await supabase.rpc('void_incident', {
      p_incident_id: incidentId,
      p_reason: reason
    });

    if (error) throw error;

    return { data: true, error: null };
  } catch (error) {
    console.error('Error voiding incident:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get lifecycle history for an incident
 * Shows all status changes (CREATED, VOIDED, REOPENED, etc.)
 */
export async function getIncidentLifecycleHistory(incidentId: string) {
  try {
    const { data, error } = await supabase
      .from('incident_lifecycle_history')
      .select('*')
      .eq('incident_id', incidentId)
      .order('performed_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching incident lifecycle history:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all incidents linked to a specific risk
 * Returns incident details with link metadata
 */
export async function getIncidentsForRisk(riskId: string) {
  try {
    const { data, error } = await supabase
      .from('incident_risk_links')
      .select(`
        id,
        link_type,
        classification_confidence,
        mapping_source,
        linked_at,
        notes,
        incidents (
          id,
          incident_code,
          title,
          description,
          incident_type,
          severity,
          incident_date,
          resolution_status,
          incident_status,
          financial_impact,
          created_at
        )
      `)
      .eq('risk_id', riskId)
      .order('linked_at', { ascending: false });

    if (error) throw error;

    // Filter out incidents that are voided
    const filteredData = data?.filter(link =>
      link.incidents && (link.incidents as any).incident_status === 'ACTIVE'
    );

    return { data: filteredData, error: null };
  } catch (error) {
    console.error('Error fetching incidents for risk:', error);
    return { data: null, error: error as Error };
  }
}
