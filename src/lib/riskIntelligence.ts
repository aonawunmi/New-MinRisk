import { supabase } from './supabase';

/**
 * Risk Intelligence Service Layer
 *
 * Handles external events scanning, AI-powered relevance analysis,
 * and automatic risk updates based on intelligence alerts.
 *
 * Uses Anthropic Claude API for AI analysis.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExternalEvent {
  id: string;
  organization_id: string;
  source: string;
  event_type: string;
  title: string;
  summary: string | null;
  url: string | null;
  published_date: string;
  fetched_at: string;
  relevance_checked: boolean;
  created_at: string;
}

export interface CreateExternalEventInput {
  source: string;
  event_type: string;
  title: string;
  summary?: string;
  url?: string;
  published_date: string;
}

export interface RiskIntelligenceAlert {
  id: string;
  organization_id: string;
  event_id: string;
  risk_code: string;
  is_relevant: boolean;
  confidence_score: number;
  suggested_likelihood_change: number | null;
  impact_change: number | null;
  reasoning: string | null;
  suggested_controls: string[] | null;
  impact_assessment: string | null;
  user_notes: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_to_risk: boolean;
  created_at: string;
}

export interface TreatmentLogEntry {
  id: string;
  alert_id: string;
  risk_code: string;
  action_taken: 'accept' | 'reject';
  previous_likelihood: number | null;
  new_likelihood: number | null;
  previous_impact: number | null;
  new_impact: number | null;
  notes: string | null;
  applied_by: string;
  applied_at: string;
}

export interface AIRelevanceAnalysis {
  is_relevant: boolean;
  confidence: number; // 0-100
  likelihood_change: number; // -2 to +2
  impact_change: number; // -2 to +2
  reasoning: string;
}

// ============================================================================
// EXTERNAL EVENTS MANAGEMENT
// ============================================================================

/**
 * Get all external events
 */
export async function getExternalEvents(options?: {
  limit?: number;
  offset?: number;
  source?: string;
  event_type?: string;
  date_from?: string; // YYYY-MM-DD format
  date_to?: string; // YYYY-MM-DD format
}): Promise<{ data: ExternalEvent[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('external_events')
      .select('*')
      .order('published_date', { ascending: false });

    if (options?.source) {
      query = query.eq('source', options.source);
    }

    if (options?.event_type) {
      query = query.eq('event_type', options.event_type);
    }

    if (options?.date_from) {
      query = query.gte('published_date', options.date_from);
    }

    if (options?.date_to) {
      query = query.lte('published_date', options.date_to);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get external events error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get external events error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create an external event
 * Includes duplicate detection - prevents creating events from the same source
 * with the same title within a 7-day window
 */
export async function createExternalEvent(
  eventData: CreateExternalEventInput
): Promise<{ data: ExternalEvent | null; error: Error | null }> {
  try {
    // Get user profile for organization_id
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    // DUPLICATE DETECTION: Check for existing event within same week
    // Calculate date range: ±7 days from published_date
    const publishedDate = new Date(eventData.published_date);
    const weekBefore = new Date(publishedDate);
    weekBefore.setDate(weekBefore.getDate() - 7);
    const weekAfter = new Date(publishedDate);
    weekAfter.setDate(weekAfter.getDate() + 7);

    const { data: existingEvents, error: checkError } = await supabase
      .from('external_events')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('source', eventData.source)
      .eq('title', eventData.title)
      .gte('published_date', weekBefore.toISOString())
      .lte('published_date', weekAfter.toISOString())
      .limit(1);

    if (checkError) {
      console.error('Duplicate check error:', checkError.message);
      // Continue with creation even if duplicate check fails
    }

    // If duplicate found, return the existing event
    if (existingEvents && existingEvents.length > 0) {
      const existingEvent = existingEvents[0];
      console.log(
        `Duplicate event detected: "${eventData.title}" from ${eventData.source} (existing event ID: ${existingEvent.id})`
      );
      return { data: existingEvent, error: null };
    }

    // No duplicate found - create new event
    const { data, error } = await supabase
      .from('external_events')
      .insert([
        {
          ...eventData,
          organization_id: profile.organization_id,
          relevance_checked: false,
          fetched_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create external event error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('External event created:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected create external event error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create external event and auto-scan for threats
 * Returns both the created event and scan results
 */
export async function createExternalEventWithAutoScan(
  eventData: CreateExternalEventInput
): Promise<{
  data: ExternalEvent | null;
  scanResults: { alertsCreated: number; scanned: boolean } | null;
  error: Error | null;
}> {
  try {
    // Step 1: Create the event
    const { data: event, error: createError } = await createExternalEvent(eventData);

    if (createError || !event) {
      return { data: null, scanResults: null, error: createError };
    }

    // Step 2: Immediately trigger AI analysis for this single event
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Event created but can't scan - return event only
      return {
        data: event,
        scanResults: { alertsCreated: 0, scanned: false },
        error: null
      };
    }

    // Get auth token for Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        data: event,
        scanResults: { alertsCreated: 0, scanned: false },
        error: null
      };
    }

    // Call Edge Function to analyze this single event
    const response = await fetch(
      `${supabase.supabaseUrl}/functions/v1/analyze-intelligence`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id, // Analyze only this event
          minConfidence: 70,
        }),
      }
    );

    if (!response.ok) {
      console.error('Auto-scan failed:', response.statusText);
      return {
        data: event,
        scanResults: { alertsCreated: 0, scanned: false },
        error: new Error('Auto-scan failed but event was created'),
      };
    }

    const result = await response.json();

    return {
      data: event,
      scanResults: {
        alertsCreated: result.alertsCreated || 0,
        scanned: true,
      },
      error: null,
    };
  } catch (err) {
    console.error('Create event with auto-scan error:', err);
    return {
      data: null,
      scanResults: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Mark event as relevance checked
 */
export async function markEventAsChecked(
  eventId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('external_events')
      .update({ relevance_checked: true })
      .eq('id', eventId);

    if (error) {
      console.error('Mark event as checked error:', error.message);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected mark event as checked error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Delete an external event (and associated alerts)
 * Uses CASCADE delete for associated intelligence_alerts
 */
export async function deleteExternalEvent(
  eventId: string
): Promise<{ error: Error | null }> {
  try {
    // Delete the event (CASCADE will delete associated alerts)
    const { error } = await supabase
      .from('external_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Delete external event error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('External event deleted:', eventId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected delete external event error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Bulk delete external events
 * @param eventIds - Array of event IDs to delete
 * @returns Count of deleted events and any error
 */
export async function bulkDeleteExternalEvents(
  eventIds: string[]
): Promise<{ deletedCount: number; error: Error | null }> {
  try {
    if (!eventIds || eventIds.length === 0) {
      return { deletedCount: 0, error: null };
    }

    // Delete events (CASCADE will delete associated alerts)
    const { error, count } = await supabase
      .from('external_events')
      .delete()
      .in('id', eventIds);

    if (error) {
      console.error('Bulk delete external events error:', error.message);
      return { deletedCount: 0, error: new Error(error.message) };
    }

    console.log(`Bulk deleted ${count || eventIds.length} external events`);
    return { deletedCount: count || eventIds.length, error: null };
  } catch (err) {
    console.error('Unexpected bulk delete external events error:', err);
    return {
      deletedCount: 0,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get unique event sources for filter dropdown
 */
export async function getUniqueSources(): Promise<{
  data: string[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('external_events')
      .select('source')
      .order('source');

    if (error) {
      console.error('Get unique sources error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    // Extract unique sources
    const uniqueSources = Array.from(new Set(data?.map(e => e.source) || []));
    return { data: uniqueSources, error: null };
  } catch (err) {
    console.error('Unexpected get unique sources error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get unique event types for filter dropdown
 */
export async function getUniqueEventTypes(): Promise<{
  data: string[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('external_events')
      .select('event_type')
      .order('event_type');

    if (error) {
      console.error('Get unique event types error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    // Extract unique event types
    const uniqueTypes = Array.from(new Set(data?.map(e => e.event_type) || []));
    return { data: uniqueTypes, error: null };
  } catch (err) {
    console.error('Unexpected get unique event types error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Find and delete duplicate external events
 * Keeps the oldest event, deletes newer duplicates
 * Returns count of duplicates deleted
 */
export async function cleanupDuplicateEvents(): Promise<{
  deletedCount: number;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { deletedCount: 0, error: new Error('User not authenticated') };
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { deletedCount: 0, error: new Error('User profile not found') };
    }

    // Get all events for the organization
    const { data: allEvents, error: fetchError } = await supabase
      .from('external_events')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: true }); // Oldest first

    if (fetchError) {
      return { deletedCount: 0, error: new Error(fetchError.message) };
    }

    if (!allEvents || allEvents.length === 0) {
      return { deletedCount: 0, error: null };
    }

    // Group events by source + title + published_date (within 7 days)
    const seen = new Map<string, ExternalEvent>();
    const duplicates: string[] = [];

    for (const event of allEvents) {
      const publishedDate = new Date(event.published_date);
      let isDuplicate = false;

      // Check against all seen events
      for (const [key, seenEvent] of seen.entries()) {
        const seenDate = new Date(seenEvent.published_date);
        const daysDiff = Math.abs(
          (publishedDate.getTime() - seenDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If same source, same title, and within 7 days
        if (
          event.source === seenEvent.source &&
          event.title === seenEvent.title &&
          daysDiff <= 7
        ) {
          isDuplicate = true;
          duplicates.push(event.id);
          break;
        }
      }

      if (!isDuplicate) {
        // Keep this event (it's the oldest of its group)
        const key = `${event.source}:${event.title}`;
        seen.set(key, event);
      }
    }

    // Delete duplicates
    if (duplicates.length > 0) {
      const { error: deleteError } = await supabase
        .from('external_events')
        .delete()
        .in('id', duplicates);

      if (deleteError) {
        console.error('Error deleting duplicates:', deleteError.message);
        return { deletedCount: 0, error: new Error(deleteError.message) };
      }

      console.log(`Deleted ${duplicates.length} duplicate events`);
    }

    return { deletedCount: duplicates.length, error: null };
  } catch (err) {
    console.error('Unexpected cleanup duplicates error:', err);
    return {
      deletedCount: 0,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// AI RELEVANCE ANALYSIS
// ============================================================================

/**
 * Analyze if an event is relevant to a specific risk using Edge Function
 *
 * SECURITY: This function now calls the server-side Edge Function only.
 * The old implementation that exposed VITE_ANTHROPIC_API_KEY has been removed.
 */
export async function analyzeEventRelevance(
  event: ExternalEvent,
  risk: {
    risk_code: string;
    risk_title: string;
    risk_description: string;
    category: string;
  }
): Promise<{ data: AIRelevanceAnalysis | null; error: Error | null }> {
  try {
    // Get authentication session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        data: null,
        error: new Error('Not authenticated'),
      };
    }

    // Call Edge Function (server-side, secure)
    const response = await fetch(
      `${supabase.supabaseUrl}/functions/v1/analyze-intelligence`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          riskCode: risk.risk_code,
          minConfidence: 0, // Return analysis regardless of confidence for this use case
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      return {
        data: null,
        error: new Error(`Analysis failed: ${response.status}`),
      };
    }

    const result = await response.json();

    // Edge Function returns alerts array, extract first match for this risk
    if (result.alertsCreated > 0 && result.alerts && result.alerts.length > 0) {
      const alert = result.alerts.find((a: any) => a.risk_code === risk.risk_code);

      if (alert) {
        // Convert Edge Function response format to AIRelevanceAnalysis format
        const analysis: AIRelevanceAnalysis = {
          is_relevant: alert.is_relevant,
          confidence: alert.confidence_score,
          likelihood_change: alert.suggested_likelihood_change || 0,
          impact_change: alert.impact_change || 0,
          reasoning: alert.reasoning || 'No reasoning provided',
        };

        console.log('AI relevance analysis complete (via Edge Function):', {
          event: event.title,
          risk: risk.risk_code,
          relevant: analysis.is_relevant,
          confidence: analysis.confidence,
        });

        return { data: analysis, error: null };
      }
    }

    // No match found
    return {
      data: {
        is_relevant: false,
        confidence: 0,
        likelihood_change: 0,
        impact_change: 0,
        reasoning: 'Not relevant to this risk',
      },
      error: null,
    };
  } catch (err) {
    console.error('Unexpected analyze event relevance error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// RISK INTELLIGENCE ALERTS
// ============================================================================

/**
 * Get intelligence alerts by status
 */
export async function getIntelligenceAlertsByStatus(
  status: 'pending' | 'accepted' | 'rejected'
): Promise<{
  data: any[] | null;
  error: Error | null;
}> {
  try {
    // Fetch alerts without joins (no foreign keys exist)
    const { data: alerts, error } = await supabase
      .from('risk_intelligence_alerts')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get intelligence alerts error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    if (!alerts || alerts.length === 0) {
      return { data: [], error: null };
    }

    // Manually fetch related external_events and risks
    const eventIds = [...new Set(alerts.map(a => a.event_id))];
    const riskCodes = [...new Set(alerts.map(a => a.risk_code))];

    const [eventsResult, risksResult] = await Promise.all([
      supabase.from('external_events').select('*').in('id', eventIds),
      supabase.from('risks').select('risk_code, risk_title').in('risk_code', riskCodes)
    ]);

    // Create lookup maps
    const eventsMap = new Map((eventsResult.data || []).map(e => [e.id, e]));
    const risksMap = new Map((risksResult.data || []).map(r => [r.risk_code, r]));

    // Attach related data to each alert
    const enrichedAlerts = alerts.map(alert => ({
      ...alert,
      external_events: eventsMap.get(alert.event_id) || null,
      risks: risksMap.get(alert.risk_code) || null
    }));

    return { data: enrichedAlerts, error: null };
  } catch (err) {
    console.error('Unexpected get intelligence alerts error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get all pending intelligence alerts
 */
export async function getPendingIntelligenceAlerts(): Promise<{
  data: any[] | null;
  error: Error | null;
}> {
  return getIntelligenceAlertsByStatus('pending');
}

/**
 * Get accepted intelligence alerts (pending application to risk register)
 */
export async function getAcceptedIntelligenceAlerts(): Promise<{
  data: any[] | null;
  error: Error | null;
}> {
  try {
    // Fetch alerts without joins (no foreign keys exist)
    const { data: alerts, error } = await supabase
      .from('risk_intelligence_alerts')
      .select('*')
      .eq('status', 'accepted')
      .order('applied_to_risk', { ascending: true }) // Show unapplied first
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get accepted intelligence alerts error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    if (!alerts || alerts.length === 0) {
      return { data: [], error: null };
    }

    // Manually fetch related external_events and risks
    const eventIds = [...new Set(alerts.map(a => a.event_id))];
    const riskCodes = [...new Set(alerts.map(a => a.risk_code))];

    const [eventsResult, risksResult] = await Promise.all([
      supabase.from('external_events').select('*').in('id', eventIds),
      supabase.from('risks').select('risk_code, risk_title').in('risk_code', riskCodes)
    ]);

    // Create lookup maps
    const eventsMap = new Map((eventsResult.data || []).map(e => [e.id, e]));
    const risksMap = new Map((risksResult.data || []).map(r => [r.risk_code, r]));

    // Attach related data to each alert
    const enrichedAlerts = alerts.map(alert => ({
      ...alert,
      external_events: eventsMap.get(alert.event_id) || null,
      risks: risksMap.get(alert.risk_code) || null
    }));

    return { data: enrichedAlerts, error: null };
  } catch (err) {
    console.error('Unexpected get accepted intelligence alerts error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get alerts for a specific risk
 */
export async function getAlertsForRisk(
  riskCode: string
): Promise<{ data: RiskIntelligenceAlert[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('risk_intelligence_alerts')
      .select('*')
      .eq('risk_code', riskCode)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get alerts for risk error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get alerts for risk error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get intelligence alerts for a risk with external event details
 */
export async function getAlertsWithEventsForRisk(
  riskCode: string
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    // Fetch alerts without joins (no foreign keys exist)
    const { data: alerts, error } = await supabase
      .from('risk_intelligence_alerts')
      .select('*')
      .eq('risk_code', riskCode)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get alerts with events for risk error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    if (!alerts || alerts.length === 0) {
      return { data: [], error: null };
    }

    // Manually fetch related external_events
    const eventIds = [...new Set(alerts.map(a => a.event_id))];
    const { data: events } = await supabase
      .from('external_events')
      .select('*')
      .in('id', eventIds);

    // Create lookup map
    const eventsMap = new Map((events || []).map(e => [e.id, e]));

    // Attach related data to each alert
    const enrichedAlerts = alerts.map(alert => ({
      ...alert,
      external_events: eventsMap.get(alert.event_id) || null
    }));

    return { data: enrichedAlerts, error: null };
  } catch (err) {
    console.error('Unexpected get alerts with events for risk error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create a risk intelligence alert
 */
export async function createIntelligenceAlert(alertData: {
  event_id: string;
  risk_code: string;
  is_relevant: boolean;
  confidence_score: number;
  suggested_likelihood_change?: number;
  impact_change?: number;
  reasoning?: string;
}): Promise<{ data: RiskIntelligenceAlert | null; error: Error | null }> {
  try {
    // Get user profile for organization_id
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    const { data, error } = await supabase
      .from('risk_intelligence_alerts')
      .insert([
        {
          ...alertData,
          organization_id: profile.organization_id,
          status: 'pending',
          applied_to_risk: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create intelligence alert error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Intelligence alert created:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected create intelligence alert error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Accept an intelligence alert (recommendation only - does not apply to risk)
 */
export async function acceptIntelligenceAlert(
  alertId: string,
  notes?: string
): Promise<{ error: Error | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    // Get the alert
    const { data: alert, error: alertError } = await supabase
      .from('risk_intelligence_alerts')
      .select('risk_code')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) {
      return { error: new Error('Alert not found') };
    }

    // Update alert status (but don't apply to risk yet)
    const { error: alertUpdateError } = await supabase
      .from('risk_intelligence_alerts')
      .update({
        status: 'accepted',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        applied_to_risk: false, // Not applied yet - just accepted as valid recommendation
      })
      .eq('id', alertId);

    if (alertUpdateError) {
      return { error: new Error(alertUpdateError.message) };
    }

    console.log('Intelligence alert accepted (recommendation):', alertId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected accept intelligence alert error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Apply an accepted intelligence alert to the risk register
 * This actually updates the risk likelihood/impact based on the alert recommendation
 */
export async function applyIntelligenceAlert(
  alertId: string,
  treatmentNotes?: string
): Promise<{ error: Error | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    // Get the alert
    const { data: alert, error: alertError } = await supabase
      .from('risk_intelligence_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) {
      return { error: new Error('Alert not found') };
    }

    // Verify alert is accepted
    if (alert.status !== 'accepted') {
      return { error: new Error('Alert must be accepted before applying') };
    }

    // Get the current risk
    const { data: risk, error: riskError } = await supabase
      .from('risks')
      .select('*')
      .eq('risk_code', alert.risk_code)
      .single();

    if (riskError || !risk) {
      return { error: new Error('Risk not found') };
    }

    // Get original risk values (before any intelligence alerts were applied)
    // We look at the treatment log to find the earliest previous values
    const { data: treatmentLog } = await supabase
      .from('risk_intelligence_treatment_log')
      .select('previous_likelihood, previous_impact')
      .eq('risk_code', alert.risk_code)
      .order('applied_at', { ascending: true })
      .limit(1);

    // If there's treatment history, use the original values; otherwise use current values
    const originalLikelihood =
      treatmentLog && treatmentLog.length > 0
        ? treatmentLog[0].previous_likelihood
        : risk.likelihood_inherent;
    const originalImpact =
      treatmentLog && treatmentLog.length > 0
        ? treatmentLog[0].previous_impact
        : risk.impact_inherent;

    // Get ALL applied alerts for this risk (including the one we're about to apply)
    const { data: appliedAlerts } = await supabase
      .from('risk_intelligence_alerts')
      .select('suggested_likelihood_change, impact_change')
      .eq('risk_code', alert.risk_code)
      .eq('status', 'accepted')
      .or(`id.eq.${alertId},applied_to_risk.eq.true`);

    // Find MAX changes from all alerts
    let maxLikelihoodChange = 0;
    let maxImpactChange = 0;

    if (appliedAlerts && appliedAlerts.length > 0) {
      appliedAlerts.forEach((a) => {
        if (a.suggested_likelihood_change !== null && Math.abs(a.suggested_likelihood_change) > Math.abs(maxLikelihoodChange)) {
          maxLikelihoodChange = a.suggested_likelihood_change;
        }
        if (a.impact_change !== null && Math.abs(a.impact_change) > Math.abs(maxImpactChange)) {
          maxImpactChange = a.impact_change;
        }
      });
    }

    // Calculate new values using MAX logic (not cumulative)
    const newLikelihood = Math.max(
      1,
      Math.min(5, originalLikelihood + maxLikelihoodChange)
    );
    const newImpact = Math.max(
      1,
      Math.min(5, originalImpact + maxImpactChange)
    );

    // Update the risk
    const { error: updateError } = await supabase
      .from('risks')
      .update({
        likelihood_inherent: newLikelihood,
        impact_inherent: newImpact,
        last_intelligence_check: new Date().toISOString(),
      })
      .eq('risk_code', alert.risk_code);

    if (updateError) {
      return { error: new Error(updateError.message) };
    }

    // Mark alert as applied
    const { error: alertUpdateError } = await supabase
      .from('risk_intelligence_alerts')
      .update({
        applied_to_risk: true,
      })
      .eq('id', alertId);

    if (alertUpdateError) {
      return { error: new Error(alertUpdateError.message) };
    }

    // Create treatment log entry
    const { error: logError } = await supabase
      .from('risk_intelligence_treatment_log')
      .insert([
        {
          alert_id: alertId,
          risk_code: alert.risk_code,
          action_taken: 'accept',
          previous_likelihood: risk.likelihood_inherent,
          new_likelihood: newLikelihood,
          previous_impact: risk.impact_inherent,
          new_impact: newImpact,
          notes: treatmentNotes || null,
          applied_by: user.id,
          applied_at: new Date().toISOString(),
        },
      ]);

    if (logError) {
      console.error('Failed to create treatment log:', logError.message);
      // Don't fail the whole operation if logging fails
    }

    console.log('Intelligence alert applied to risk register:', alertId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected apply intelligence alert error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Bulk delete intelligence alerts (pending/rejected only)
 */
export async function bulkDeleteIntelligenceAlerts(
  alertIds: string[]
): Promise<{ deletedCount: number; error: Error | null }> {
  try {
    if (!alertIds || alertIds.length === 0) {
      return { deletedCount: 0, error: null };
    }

    // Safety: Only delete alerts that haven't been applied to risks
    // This includes: pending, rejected, and accepted (but not yet applied)
    const { data: alerts } = await supabase
      .from('risk_intelligence_alerts')
      .select('id, status, applied_to_risk')
      .in('id', alertIds);

    const safeToDelete = (alerts || []).filter(
      a => !a.applied_to_risk
    );

    if (safeToDelete.length === 0) {
      return {
        deletedCount: 0,
        error: new Error('No alerts are safe to delete (only unapplied alerts can be deleted)')
      };
    }

    const safeIds = safeToDelete.map(a => a.id);

    const { error, count } = await supabase
      .from('risk_intelligence_alerts')
      .delete()
      .in('id', safeIds);

    if (error) {
      console.error('Bulk delete intelligence alerts error:', error.message);
      return { deletedCount: 0, error: new Error(error.message) };
    }

    console.log(`Bulk deleted ${count || safeIds.length} intelligence alerts`);
    return { deletedCount: count || safeIds.length, error: null };
  } catch (err) {
    console.error('Unexpected bulk delete intelligence alerts error:', err);
    return {
      deletedCount: 0,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Reject an intelligence alert
 */
export async function rejectIntelligenceAlert(
  alertId: string,
  notes?: string
): Promise<{ error: Error | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    // Get the alert
    const { data: alert, error: alertError } = await supabase
      .from('risk_intelligence_alerts')
      .select('risk_code')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) {
      return { error: new Error('Alert not found') };
    }

    // Update alert status
    const { error: updateError } = await supabase
      .from('risk_intelligence_alerts')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        applied_to_risk: false,
      })
      .eq('id', alertId);

    if (updateError) {
      return { error: new Error(updateError.message) };
    }

    // Create treatment log entry
    const { error: logError } = await supabase
      .from('risk_intelligence_treatment_log')
      .insert([
        {
          alert_id: alertId,
          risk_code: alert.risk_code,
          action_taken: 'reject',
          notes: notes || null,
          applied_by: user.id,
          applied_at: new Date().toISOString(),
        },
      ]);

    if (logError) {
      console.error('Failed to create treatment log:', logError.message);
    }

    console.log('Intelligence alert rejected:', alertId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected reject intelligence alert error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Undo an applied intelligence alert
 * Removes the alert's effect from the risk and recalculates using MAX logic
 */
export async function undoAppliedAlert(
  alertId: string,
  notes?: string
): Promise<{ error: Error | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    // Get the alert
    const { data: alert, error: alertError } = await supabase
      .from('risk_intelligence_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) {
      return { error: new Error('Alert not found') };
    }

    // Verify alert is currently applied
    if (!alert.applied_to_risk) {
      return { error: new Error('Alert is not currently applied') };
    }

    // Get the current risk
    const { data: risk, error: riskError } = await supabase
      .from('risks')
      .select('*')
      .eq('risk_code', alert.risk_code)
      .single();

    if (riskError || !risk) {
      return { error: new Error('Risk not found') };
    }

    // Get original risk values (before any intelligence alerts were applied)
    const { data: treatmentLog } = await supabase
      .from('risk_intelligence_treatment_log')
      .select('previous_likelihood, previous_impact')
      .eq('risk_code', alert.risk_code)
      .order('applied_at', { ascending: true })
      .limit(1);

    const originalLikelihood =
      treatmentLog && treatmentLog.length > 0
        ? treatmentLog[0].previous_likelihood
        : risk.likelihood_inherent;
    const originalImpact =
      treatmentLog && treatmentLog.length > 0
        ? treatmentLog[0].previous_impact
        : risk.impact_inherent;

    // Mark this alert as not applied
    const { error: alertUpdateError } = await supabase
      .from('risk_intelligence_alerts')
      .update({
        applied_to_risk: false,
      })
      .eq('id', alertId);

    if (alertUpdateError) {
      return { error: new Error(alertUpdateError.message) };
    }

    // Get ALL REMAINING applied alerts (excluding the one we just unapplied)
    const { data: remainingAlerts } = await supabase
      .from('risk_intelligence_alerts')
      .select('suggested_likelihood_change, impact_change')
      .eq('risk_code', alert.risk_code)
      .eq('status', 'accepted')
      .eq('applied_to_risk', true);

    // Find MAX changes from remaining alerts
    let maxLikelihoodChange = 0;
    let maxImpactChange = 0;

    if (remainingAlerts && remainingAlerts.length > 0) {
      remainingAlerts.forEach((a) => {
        if (a.suggested_likelihood_change !== null && Math.abs(a.suggested_likelihood_change) > Math.abs(maxLikelihoodChange)) {
          maxLikelihoodChange = a.suggested_likelihood_change;
        }
        if (a.impact_change !== null && Math.abs(a.impact_change) > Math.abs(maxImpactChange)) {
          maxImpactChange = a.impact_change;
        }
      });
    }

    // Calculate new values using MAX of remaining alerts
    const newLikelihood = Math.max(
      1,
      Math.min(5, originalLikelihood + maxLikelihoodChange)
    );
    const newImpact = Math.max(
      1,
      Math.min(5, originalImpact + maxImpactChange)
    );

    // Update the risk
    const { error: updateError } = await supabase
      .from('risks')
      .update({
        likelihood_inherent: newLikelihood,
        impact_inherent: newImpact,
        last_intelligence_check: new Date().toISOString(),
      })
      .eq('risk_code', alert.risk_code);

    if (updateError) {
      return { error: new Error(updateError.message) };
    }

    // Create treatment log entry documenting the undo
    const { error: logError } = await supabase
      .from('risk_intelligence_treatment_log')
      .insert([
        {
          alert_id: alertId,
          risk_code: alert.risk_code,
          action_taken: 'reject', // Using 'reject' to indicate removal
          previous_likelihood: risk.likelihood_inherent,
          new_likelihood: newLikelihood,
          previous_impact: risk.impact_inherent,
          new_impact: newImpact,
          notes: notes || 'Alert application undone',
          applied_by: user.id,
          applied_at: new Date().toISOString(),
        },
      ]);

    if (logError) {
      console.error('Failed to create treatment log:', logError.message);
      // Don't fail the whole operation if logging fails
    }

    console.log('Intelligence alert undone:', alertId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected undo alert error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// TREATMENT LOG
// ============================================================================

/**
 * Get treatment log for a risk
 */
export async function getTreatmentLogForRisk(
  riskCode: string
): Promise<{ data: TreatmentLogEntry[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('risk_intelligence_treatment_log')
      .select('*')
      .eq('risk_code', riskCode)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('Get treatment log error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get treatment log error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Soft delete a treatment log entry
 * Marks entry as deleted without removing from database (for audit)
 */
export async function softDeleteTreatmentLogEntry(
  logId: string
): Promise<{ error: Error | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    // Update log entry to mark as deleted
    const { error } = await supabase
      .from('risk_intelligence_treatment_log')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', logId);

    if (error) {
      console.error('Soft delete treatment log error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Treatment log entry soft-deleted:', logId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected soft delete error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// AUTOMATED SCANNING (For Backend/Cron Implementation)
// ============================================================================

/**
 * Scan all active risks against unchecked events
 * This would typically be called by a cron job or Edge Function
 */
export async function scanRisksForRelevantEvents(options?: {
  minConfidence?: number;
}): Promise<{
  scanned: number;
  alertsCreated: number;
  errors: string[];
}> {
  const minConfidence = options?.minConfidence || 70;
  const errors: string[] = [];
  let scanned = 0;
  let alertsCreated = 0;

  try {
    // Get unchecked events
    const { data: events, error: eventsError } = await supabase
      .from('external_events')
      .select('*')
      .eq('relevance_checked', false)
      .limit(50);

    if (eventsError) {
      errors.push(`Failed to fetch events: ${eventsError.message}`);
      return { scanned, alertsCreated, errors };
    }

    if (!events || events.length === 0) {
      return { scanned, alertsCreated, errors };
    }

    // Get all active risks
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('risk_code, risk_title, risk_description, category')
      .in('status', ['OPEN', 'MONITORING']);

    if (risksError) {
      errors.push(`Failed to fetch risks: ${risksError.message}`);
      return { scanned, alertsCreated, errors };
    }

    if (!risks || risks.length === 0) {
      return { scanned, alertsCreated, errors };
    }

    // Analyze each event against each risk
    for (const event of events) {
      for (const risk of risks) {
        scanned++;

        // Analyze relevance
        const { data: analysis, error: analysisError } =
          await analyzeEventRelevance(event, risk);

        if (analysisError) {
          errors.push(
            `Analysis failed for event ${event.id} and risk ${risk.risk_code}: ${analysisError.message}`
          );
          continue;
        }

        if (!analysis) continue;

        // If relevant and high confidence, create alert
        if (analysis.is_relevant && analysis.confidence >= minConfidence) {
          const { error: alertError } = await createIntelligenceAlert({
            event_id: event.id,
            risk_code: risk.risk_code,
            is_relevant: analysis.is_relevant,
            confidence_score: analysis.confidence,
            suggested_likelihood_change: analysis.likelihood_change,
            impact_change: analysis.impact_change,
            reasoning: analysis.reasoning,
          });

          if (alertError) {
            errors.push(
              `Failed to create alert: ${alertError.message}`
            );
          } else {
            alertsCreated++;
          }
        }
      }

      // Mark event as checked
      await markEventAsChecked(event.id);
    }

    return { scanned, alertsCreated, errors };
  } catch (err) {
    errors.push(
      `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`
    );
    return { scanned, alertsCreated, errors };
  }
}

// ============================================================================
// RSS SCANNER TRIGGER
// ============================================================================

export interface RssScanResult {
  success: boolean;
  message: string;
  stats?: {
    feeds_scanned?: number;
    events_stored?: number;
    alerts_created?: number;
    execution_time?: string;
  };
  error?: string;
}

/**
 * Trigger the RSS scanner Edge Function
 * Admin-only function to manually trigger RSS feed scanning
 */
export async function triggerRssScan(): Promise<RssScanResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
        error: 'You must be logged in to trigger RSS scanning'
      };
    }

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return {
        success: false,
        message: 'Configuration error',
        error: 'Supabase URL not configured'
      };
    }

    // Call the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/scan-rss-feeds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ trigger: 'manual-scan' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: 'Scan failed',
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const result = await response.json();

    return {
      success: true,
      message: `RSS scan completed! ${result.stats?.events_stored || 0} events stored, ${result.stats?.alerts_created || 0} alerts created`,
      stats: result.stats
    };
  } catch (error) {
    return {
      success: false,
      message: 'Scan error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// RSS SOURCE MANAGEMENT
// ============================================================================

export interface RssSource {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  description: string | null;
  category: string[]; // Array of categories
  is_active: boolean;
  last_scanned_at: string | null;
  last_scan_status: string | null;
  last_scan_error: string | null;
  events_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRssSourceInput {
  name: string;
  url: string;
  description?: string;
  category: string[]; // Array of categories
}

export interface UpdateRssSourceInput {
  name?: string;
  url?: string;
  description?: string;
  category?: string[]; // Array of categories
  is_active?: boolean;
}

/**
 * Get all RSS sources for the user's organization
 */
export async function getRssSources(): Promise<{
  data: RssSource[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('rss_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching RSS sources:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch RSS sources')
    };
  }
}

/**
 * Create a new RSS source (admin only)
 */
export async function createRssSource(
  input: CreateRssSourceInput
): Promise<{
  data: RssSource | null;
  error: Error | null;
}> {
  try {
    // Get current user's profile to get organization_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const { data, error } = await supabase
      .from('rss_sources')
      .insert({
        organization_id: profile.organization_id,
        name: input.name,
        url: input.url,
        description: input.description || null,
        category: input.category,
        is_active: true,
        created_by: session.user.id
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creating RSS source:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to create RSS source')
    };
  }
}

/**
 * Update an existing RSS source (admin only)
 */
export async function updateRssSource(
  id: string,
  input: UpdateRssSourceInput
): Promise<{
  data: RssSource | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('rss_sources')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating RSS source:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to update RSS source')
    };
  }
}

/**
 * Delete an RSS source (admin only)
 */
export async function deleteRssSource(id: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('rss_sources')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting RSS source:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to delete RSS source')
    };
  }
}

/**
 * Toggle RSS source active status (admin only)
 */
export async function toggleRssSourceStatus(id: string, isActive: boolean): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('rss_sources')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error toggling RSS source status:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to toggle RSS source status')
    };
  }
}
