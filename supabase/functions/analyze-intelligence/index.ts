// Supabase Edge Function: analyze-intelligence
// Analyzes external events against organizational risks using Claude AI
// Updated: 2026-02-19 — Intelligence Redesign (upsert, retry, institution context)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { USE_CASE_MODELS } from '../_shared/ai-models.ts'
import { verifyClerkAuth } from '../_shared/clerk-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MAX_RETRIES = 3

/**
 * Load institution type context for an organization
 */
async function getInstitutionContext(supabase: any, organizationId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select(`
      institution_type_id,
      institution_type,
      institution_types:institution_type_id (
        name, category, slug, description, default_scan_keywords
      )
    `)
    .eq('id', organizationId)
    .single()

  if (!org?.institution_types) {
    return { name: 'General Organization', category: 'Other', description: '', regulators: [] }
  }

  // Get mapped regulators
  const { data: regs } = await supabase
    .from('institution_type_regulators')
    .select('regulators:regulator_id (code, name)')
    .eq('institution_type_id', org.institution_type_id)

  const regulatorNames = (regs || []).map((r: any) => r.regulators?.name).filter(Boolean)

  return {
    name: org.institution_types.name,
    category: org.institution_types.category,
    description: org.institution_types.description || '',
    regulators: regulatorNames,
  }
}

/**
 * Check org-specific analysis cache
 */
async function checkOrgCache(supabase: any, eventId: string, orgId: string, riskCode: string) {
  const { data } = await supabase
    .from('org_analysis_cache')
    .select('*')
    .eq('event_id', eventId)
    .eq('organization_id', orgId)
    .eq('risk_code', riskCode)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return data
}

/**
 * Store org-specific analysis in cache
 */
async function storeOrgCache(supabase: any, eventId: string, orgId: string, riskAnalysis: any, modelUsed: string) {
  await supabase
    .from('org_analysis_cache')
    .upsert({
      event_id: eventId,
      organization_id: orgId,
      risk_code: riskAnalysis.risk_code,
      analysis_result: riskAnalysis,
      likelihood_change: riskAnalysis.likelihood_change || 0,
      impact_change: riskAnalysis.impact_change || 0,
      confidence: (riskAnalysis.confidence || 70) / 100,
      suggested_controls: riskAnalysis.suggested_controls || [],
      reasoning: riskAnalysis.reasoning || '',
      model_used: modelUsed,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'event_id,organization_id,risk_code' })
}

/**
 * Analyze event relevance to risks using Claude AI
 */
async function analyzeEventRelevance(
  event: any,
  risks: any[],
  claudeApiKey: string,
  institutionContext: any
) {
  if (risks.length === 0) {
    return { is_relevant: false }
  }

  const riskSummary = risks.map(r => `${r.risk_code}: ${r.risk_title} (${r.category || 'Uncategorized'})`).join('\n')
  const regulatorList = institutionContext.regulators.length > 0
    ? institutionContext.regulators.join(', ')
    : 'Not specified'

  const prompt = `You are analyzing a risk intelligence event for a ${institutionContext.name} (Category: ${institutionContext.category}) regulated by ${regulatorList}.

${institutionContext.description ? `Institution focus: ${institutionContext.description}` : ''}

Analyze if this event is relevant to this specific type of institution, not financial services in general.

EVENT:
Title: "${event.title}"
Type: ${event.event_type}
Summary: ${event.summary || 'N/A'}

ORGANIZATIONAL RISKS:
${riskSummary}

TASK:
1. Determine if this event is relevant to ANY of the listed risks for a ${institutionContext.name}
2. If relevant, identify which risk(s) it affects and provide RISK-SPECIFIC analysis for EACH risk
3. For EACH affected risk, provide:
   - Specific reasoning explaining how this event affects THIS PARTICULAR risk
   - Likelihood/impact changes specific to THIS risk (scale -2 to +2)
   - 2-4 specific controls tailored to mitigate THIS risk
   - Impact assessment describing consequences for THIS specific risk area

RESPOND ONLY WITH THIS JSON FORMAT (no markdown, no explanations):
{
  "is_relevant": true,
  "confidence": 85,
  "risk_analyses": [
    {
      "risk_code": "STR-CYB-001",
      "reasoning": "Specific explanation for why this event affects STR-CYB-001 in particular",
      "likelihood_change": 1,
      "impact_change": 0,
      "suggested_controls": ["Control specific to STR-CYB-001", "Another control for this risk"],
      "impact_assessment": "Detailed consequences specific to the cybersecurity risk area"
    }
  ]
}

IMPORTANT: Each risk must have UNIQUE, SPECIFIC reasoning. Do NOT reuse generic text across multiple risks.

OR if not relevant:
{"is_relevant": false}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: USE_CASE_MODELS.RISK_INTELLIGENCE,
      max_tokens: 2048,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    }),
  })

  if (!response.ok) {
    console.error(`   Claude API error: ${response.status}`)
    return { is_relevant: false }
  }

  const result = await response.json()
  const text = result.content?.[0]?.text || '{}'

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('   Could not extract JSON from AI response')
    return { is_relevant: false }
  }

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    console.error('   JSON parse error')
    return { is_relevant: false }
  }
}

/**
 * Create/update risk alerts from AI analysis using UPSERT
 */
async function upsertRiskAlerts(
  supabase: any,
  event: any,
  analysis: any,
  organizationId: string,
  modelUsed: string
) {
  let alertsCreated = 0

  if (!analysis.is_relevant) return alertsCreated

  if (!analysis.risk_analyses || !Array.isArray(analysis.risk_analyses) || analysis.risk_analyses.length === 0) {
    console.log(`   No risk_analyses array in response`)
    return alertsCreated
  }

  for (const riskAnalysis of analysis.risk_analyses) {
    if (!riskAnalysis.risk_code) continue

    const alert = {
      event_id: event.id,
      risk_code: riskAnalysis.risk_code,
      organization_id: organizationId,
      confidence_score: (analysis.confidence || 70) / 100,
      suggested_likelihood_change: riskAnalysis.likelihood_change || 0,
      reasoning: riskAnalysis.reasoning || 'No reasoning provided',
      suggested_controls: riskAnalysis.suggested_controls || [],
      impact_assessment: riskAnalysis.impact_assessment || null,
      status: 'pending',
      applied_to_risk: false,
    }

    // UPSERT: update if exists, insert if not
    const { error } = await supabase
      .from('risk_intelligence_alerts')
      .upsert(alert, { onConflict: 'event_id,risk_code' })

    if (!error) {
      alertsCreated++
      console.log(`   Alert upserted for ${riskAnalysis.risk_code}`)
    } else {
      console.error(`   Failed to upsert alert: ${error.message}`)
    }

    // Cache org-specific analysis
    await storeOrgCache(supabase, event.id, organizationId, riskAnalysis, modelUsed)
  }

  return alertsCreated
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let profile, supabaseAdmin;
    try {
      ({ profile, supabaseAdmin } = await verifyClerkAuth(req));
    } catch {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizationId = profile.organization_id
    console.log(`Analyzing events for org: ${organizationId}`)

    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('VITE_ANTHROPIC_API_KEY')
    if (!claudeApiKey) {
      return new Response(
        JSON.stringify({ error: 'Claude API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const minConfidence = body.minConfidence ?? 70
    const eventId = body.eventId
    const limit = body.limit || 50

    // Load institution context for better AI prompts
    const institutionContext = await getInstitutionContext(supabaseAdmin, organizationId)
    console.log(`Institution: ${institutionContext.name} (${institutionContext.category})`)

    // Get events to analyze
    let eventsQuery = supabaseAdmin
      .from('external_events')
      .select('*')
      .eq('organization_id', organizationId)

    if (eventId) {
      eventsQuery = eventsQuery.eq('id', eventId)
    } else {
      // Batch mode: unchecked events with retry_count < MAX_RETRIES
      eventsQuery = eventsQuery
        .eq('relevance_checked', false)
        .lt('retry_count', MAX_RETRIES)
        .order('published_date', { ascending: false })
        .limit(limit)
    }

    const { data: events, error: eventsError } = await eventsQuery
    if (eventsError) throw eventsError

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No events to analyze', scanned: 0, alertsCreated: 0, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active risks
    const { data: risks, error: risksError } = await supabaseAdmin
      .from('risks')
      .select('risk_code, risk_title, risk_description, category')
      .eq('organization_id', organizationId)
      .in('status', ['OPEN', 'MONITORING', 'Open', 'Monitoring', 'open', 'monitoring'])

    if (risksError) throw risksError

    if (!risks || risks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No risks found', scanned: 0, alertsCreated: 0, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${events.length} events, ${risks.length} risks`)

    let scanned = 0
    let alertsCreated = 0
    const errors: string[] = []

    for (const event of events) {
      try {
        console.log(`Analyzing: ${event.title.substring(0, 60)}...`)

        const analysis = await analyzeEventRelevance(event, risks, claudeApiKey, institutionContext)
        scanned++

        if (analysis.is_relevant && analysis.confidence >= minConfidence) {
          const created = await upsertRiskAlerts(
            supabaseAdmin, event, analysis, organizationId, USE_CASE_MODELS.RISK_INTELLIGENCE
          )
          alertsCreated += created
        }

        // Mark event as checked ONLY on success
        await supabaseAdmin
          .from('external_events')
          .update({ relevance_checked: true })
          .eq('id', event.id)

        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`Error analyzing event ${event.id}:`, error.message)
        errors.push(`Event ${event.id}: ${error.message}`)

        // Increment retry_count instead of marking as checked
        await supabaseAdmin
          .from('external_events')
          .update({ retry_count: (event.retry_count || 0) + 1 })
          .eq('id', event.id)

        // If max retries reached, mark as checked with a note
        if ((event.retry_count || 0) + 1 >= MAX_RETRIES) {
          await supabaseAdmin
            .from('external_events')
            .update({
              relevance_checked: true,
              filter_reason: `Analysis failed after ${MAX_RETRIES} attempts: ${error.message}`
            })
            .eq('id', event.id)
        }
      }
    }

    console.log(`Analysis complete: ${scanned} scanned, ${alertsCreated} alerts`)

    return new Response(
      JSON.stringify({ success: true, message: 'Analysis complete', scanned, alertsCreated, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in intelligence analyzer:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
