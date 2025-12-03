import { supabase } from './supabase';
// ============================================================================
// EXTERNAL EVENTS MANAGEMENT
// ============================================================================
/**
 * Get all external events
 */
export async function getExternalEvents(options) {
    try {
        let query = supabase
            .from('external_events')
            .select('*')
            .order('published_date', { ascending: false });
        if (options?.source) {
            query = query.eq('source', options.source);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Get external events error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
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
export async function createExternalEvent(eventData) {
    try {
        // Get user profile for organization_id
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
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
            console.log(`Duplicate event detected: "${eventData.title}" from ${eventData.source} (existing event ID: ${existingEvent.id})`);
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
    }
    catch (err) {
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
export async function createExternalEventWithAutoScan(eventData) {
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
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/analyze-intelligence`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eventId: event.id, // Analyze only this event
                minConfidence: 70,
            }),
        });
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
    }
    catch (err) {
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
export async function markEventAsChecked(eventId) {
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
    }
    catch (err) {
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
export async function deleteExternalEvent(eventId) {
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
    }
    catch (err) {
        console.error('Unexpected delete external event error:', err);
        return {
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Find and delete duplicate external events
 * Keeps the oldest event, deletes newer duplicates
 * Returns count of duplicates deleted
 */
export async function cleanupDuplicateEvents() {
    try {
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
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
        const seen = new Map();
        const duplicates = [];
        for (const event of allEvents) {
            const publishedDate = new Date(event.published_date);
            let isDuplicate = false;
            // Check against all seen events
            for (const [key, seenEvent] of seen.entries()) {
                const seenDate = new Date(seenEvent.published_date);
                const daysDiff = Math.abs((publishedDate.getTime() - seenDate.getTime()) / (1000 * 60 * 60 * 24));
                // If same source, same title, and within 7 days
                if (event.source === seenEvent.source &&
                    event.title === seenEvent.title &&
                    daysDiff <= 7) {
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
    }
    catch (err) {
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
 * Analyze if an event is relevant to a specific risk using Claude API
 *
 * NOTE: This requires VITE_ANTHROPIC_API_KEY in .env
 */
export async function analyzeEventRelevance(event, risk) {
    try {
        const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
        if (!apiKey) {
            return {
                data: null,
                error: new Error('Anthropic API key not configured'),
            };
        }
        const prompt = `You are analyzing if an external event is relevant to a specific risk.

EVENT:
Title: ${event.title}
Summary: ${event.summary || 'No summary available'}
Source: ${event.source}
Type: ${event.event_type}
Date: ${event.published_date}

RISK:
Code: ${risk.risk_code}
Title: ${risk.risk_title}
Description: ${risk.risk_description}
Category: ${risk.category}

TASK:
Determine if this event is relevant to the risk. Consider:
1. Does the event relate to the risk category or domain?
2. Could the event increase the likelihood or impact of this risk?
3. Is there a direct or indirect connection?

Respond ONLY with valid JSON in this exact format:
{
  "is_relevant": true or false,
  "confidence": number between 0 and 100,
  "likelihood_change": number between -2 and 2 (0 if no change),
  "impact_change": number between -2 and 2 (0 if no change),
  "reasoning": "brief explanation"
}`;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', errorText);
            return {
                data: null,
                error: new Error(`Claude API error: ${response.status}`),
            };
        }
        const result = await response.json();
        const contentText = result.content[0].text;
        // Extract JSON from response
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                data: null,
                error: new Error('Failed to parse AI response as JSON'),
            };
        }
        const analysis = JSON.parse(jsonMatch[0]);
        console.log('AI relevance analysis complete:', {
            event: event.title,
            risk: risk.risk_code,
            relevant: analysis.is_relevant,
            confidence: analysis.confidence,
        });
        return { data: analysis, error: null };
    }
    catch (err) {
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
export async function getIntelligenceAlertsByStatus(status) {
    try {
        const { data, error } = await supabase
            .from('intelligence_alerts')
            .select(`
        *,
        external_events (*)
      `)
            .eq('status', status)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Get intelligence alerts error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
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
export async function getPendingIntelligenceAlerts() {
    return getIntelligenceAlertsByStatus('pending');
}
/**
 * Get accepted intelligence alerts (pending application to risk register)
 */
export async function getAcceptedIntelligenceAlerts() {
    try {
        const { data, error } = await supabase
            .from('intelligence_alerts')
            .select(`
        *,
        external_events (*)
      `)
            .eq('status', 'accepted')
            .order('applied_to_risk', { ascending: true }) // Show unapplied first
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Get accepted intelligence alerts error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
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
export async function getAlertsForRisk(riskCode) {
    try {
        const { data, error } = await supabase
            .from('intelligence_alerts')
            .select('*')
            .eq('risk_code', riskCode)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Get alerts for risk error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
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
export async function getAlertsWithEventsForRisk(riskCode) {
    try {
        const { data, error } = await supabase
            .from('intelligence_alerts')
            .select(`
        *,
        external_events (*)
      `)
            .eq('risk_code', riskCode)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Get alerts with events for risk error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
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
export async function createIntelligenceAlert(alertData) {
    try {
        // Get user profile for organization_id
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
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
            .from('intelligence_alerts')
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
    }
    catch (err) {
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
export async function acceptIntelligenceAlert(alertId, notes) {
    try {
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
        if (userError || !user) {
            return { error: new Error('User not authenticated') };
        }
        // Get the alert
        const { data: alert, error: alertError } = await supabase
            .from('intelligence_alerts')
            .select('risk_code')
            .eq('id', alertId)
            .single();
        if (alertError || !alert) {
            return { error: new Error('Alert not found') };
        }
        // Update alert status (but don't apply to risk yet)
        const { error: alertUpdateError } = await supabase
            .from('intelligence_alerts')
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
    }
    catch (err) {
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
export async function applyIntelligenceAlert(alertId, treatmentNotes) {
    try {
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
        if (userError || !user) {
            return { error: new Error('User not authenticated') };
        }
        // Get the alert
        const { data: alert, error: alertError } = await supabase
            .from('intelligence_alerts')
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
        const originalLikelihood = treatmentLog && treatmentLog.length > 0
            ? treatmentLog[0].previous_likelihood
            : risk.likelihood_inherent;
        const originalImpact = treatmentLog && treatmentLog.length > 0
            ? treatmentLog[0].previous_impact
            : risk.impact_inherent;
        // Get ALL applied alerts for this risk (including the one we're about to apply)
        const { data: appliedAlerts } = await supabase
            .from('intelligence_alerts')
            .select('likelihood_change, impact_change')
            .eq('risk_code', alert.risk_code)
            .eq('status', 'accepted')
            .or(`id.eq.${alertId},applied_to_risk.eq.true`);
        // Find MAX changes from all alerts
        let maxLikelihoodChange = 0;
        let maxImpactChange = 0;
        if (appliedAlerts && appliedAlerts.length > 0) {
            appliedAlerts.forEach((a) => {
                if (a.likelihood_change !== null && Math.abs(a.likelihood_change) > Math.abs(maxLikelihoodChange)) {
                    maxLikelihoodChange = a.likelihood_change;
                }
                if (a.impact_change !== null && Math.abs(a.impact_change) > Math.abs(maxImpactChange)) {
                    maxImpactChange = a.impact_change;
                }
            });
        }
        // Calculate new values using MAX logic (not cumulative)
        const newLikelihood = Math.max(1, Math.min(5, originalLikelihood + maxLikelihoodChange));
        const newImpact = Math.max(1, Math.min(5, originalImpact + maxImpactChange));
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
            .from('intelligence_alerts')
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
    }
    catch (err) {
        console.error('Unexpected apply intelligence alert error:', err);
        return {
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Reject an intelligence alert
 */
export async function rejectIntelligenceAlert(alertId, notes) {
    try {
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
        if (userError || !user) {
            return { error: new Error('User not authenticated') };
        }
        // Get the alert
        const { data: alert, error: alertError } = await supabase
            .from('intelligence_alerts')
            .select('risk_code')
            .eq('id', alertId)
            .single();
        if (alertError || !alert) {
            return { error: new Error('Alert not found') };
        }
        // Update alert status
        const { error: updateError } = await supabase
            .from('intelligence_alerts')
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
    }
    catch (err) {
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
export async function undoAppliedAlert(alertId, notes) {
    try {
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
        if (userError || !user) {
            return { error: new Error('User not authenticated') };
        }
        // Get the alert
        const { data: alert, error: alertError } = await supabase
            .from('intelligence_alerts')
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
        const originalLikelihood = treatmentLog && treatmentLog.length > 0
            ? treatmentLog[0].previous_likelihood
            : risk.likelihood_inherent;
        const originalImpact = treatmentLog && treatmentLog.length > 0
            ? treatmentLog[0].previous_impact
            : risk.impact_inherent;
        // Mark this alert as not applied
        const { error: alertUpdateError } = await supabase
            .from('intelligence_alerts')
            .update({
            applied_to_risk: false,
        })
            .eq('id', alertId);
        if (alertUpdateError) {
            return { error: new Error(alertUpdateError.message) };
        }
        // Get ALL REMAINING applied alerts (excluding the one we just unapplied)
        const { data: remainingAlerts } = await supabase
            .from('intelligence_alerts')
            .select('likelihood_change, impact_change')
            .eq('risk_code', alert.risk_code)
            .eq('status', 'accepted')
            .eq('applied_to_risk', true);
        // Find MAX changes from remaining alerts
        let maxLikelihoodChange = 0;
        let maxImpactChange = 0;
        if (remainingAlerts && remainingAlerts.length > 0) {
            remainingAlerts.forEach((a) => {
                if (a.likelihood_change !== null && Math.abs(a.likelihood_change) > Math.abs(maxLikelihoodChange)) {
                    maxLikelihoodChange = a.likelihood_change;
                }
                if (a.impact_change !== null && Math.abs(a.impact_change) > Math.abs(maxImpactChange)) {
                    maxImpactChange = a.impact_change;
                }
            });
        }
        // Calculate new values using MAX of remaining alerts
        const newLikelihood = Math.max(1, Math.min(5, originalLikelihood + maxLikelihoodChange));
        const newImpact = Math.max(1, Math.min(5, originalImpact + maxImpactChange));
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
    }
    catch (err) {
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
export async function getTreatmentLogForRisk(riskCode) {
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
    }
    catch (err) {
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
export async function softDeleteTreatmentLogEntry(logId) {
    try {
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
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
    }
    catch (err) {
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
export async function scanRisksForRelevantEvents(options) {
    const minConfidence = options?.minConfidence || 70;
    const errors = [];
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
                const { data: analysis, error: analysisError } = await analyzeEventRelevance(event, risk);
                if (analysisError) {
                    errors.push(`Analysis failed for event ${event.id} and risk ${risk.risk_code}: ${analysisError.message}`);
                    continue;
                }
                if (!analysis)
                    continue;
                // If relevant and high confidence, create alert
                if (analysis.is_relevant && analysis.confidence >= minConfidence) {
                    const { error: alertError } = await createIntelligenceAlert({
                        event_id: event.id,
                        risk_code: risk.risk_code,
                        is_relevant: analysis.is_relevant,
                        confidence_score: analysis.confidence,
                        likelihood_change: analysis.likelihood_change,
                        impact_change: analysis.impact_change,
                        ai_reasoning: analysis.reasoning,
                    });
                    if (alertError) {
                        errors.push(`Failed to create alert: ${alertError.message}`);
                    }
                    else {
                        alertsCreated++;
                    }
                }
            }
            // Mark event as checked
            await markEventAsChecked(event.id);
        }
        return { scanned, alertsCreated, errors };
    }
    catch (err) {
        errors.push(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`);
        return { scanned, alertsCreated, errors };
    }
}
