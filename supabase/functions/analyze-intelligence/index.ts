// Supabase Edge Function for analyzing external events against risks
// Simplified version for NEW-MINRISK
// Updated: 2025-12-13

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { USE_CASE_MODELS } from '../_shared/ai-models.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

/**
 * Analyze event relevance to risks using Claude AI
 */
async function analyzeEventRelevance(event: any, risks: any[], claudeApiKey: string) {
  try {
    if (risks.length === 0) {
      console.log('   ⚠️ No risks available for analysis!')
      return { is_relevant: false }
    }

    const riskSummary = risks.map(r => `${r.risk_code}: ${r.risk_title}`).join('\n')

    const prompt = `You are analyzing if an external event is relevant to organizational risks for early warning monitoring.

EVENT:
Title: "${event.title}"
Type: ${event.event_type}
Summary: ${event.summary || 'N/A'}

ORGANIZATIONAL RISKS:
${riskSummary}

TASK:
1. Determine if this event is relevant to ANY of the listed risks
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
    },
    {
      "risk_code": "OPS-005",
      "reasoning": "Different, specific explanation for how this affects OPS-005 operations",
      "likelihood_change": 1,
      "impact_change": 1,
      "suggested_controls": ["Control specific to OPS-005", "Operational mitigation"],
      "impact_assessment": "Operational impact consequences specific to this risk"
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
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    })

    if (!response.ok) {
      console.error(`   ❌ Claude API error: ${response.status}`)
      return { is_relevant: false }
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || '{}'

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('   ❌ Could not extract JSON from AI response')
      console.error('   Response text:', text.substring(0, 500))
      return { is_relevant: false }
    }

    try {
      const analysis = JSON.parse(jsonMatch[0])
      return analysis
    } catch (parseError) {
      console.error('   ❌ JSON parse error:', parseError.message)
      console.error('   Attempted to parse:', jsonMatch[0].substring(0, 500))
      return { is_relevant: false }
    }

  } catch (error) {
    console.error('   ❌ Error in AI analysis:', error.message)
    return { is_relevant: false }
  }
}

/**
 * Create risk alerts from AI analysis
 */
async function createRiskAlerts(
  supabase: any,
  event: any,
  analysis: any,
  organizationId: string
) {
  let alertsCreated = 0

  if (!analysis.is_relevant) {
    return alertsCreated
  }

  // Check if we have the new format (risk_analyses array)
  if (!analysis.risk_analyses || !Array.isArray(analysis.risk_analyses) || analysis.risk_analyses.length === 0) {
    console.log(`   ⚠️ No risk_analyses array in response - AI may have returned invalid format`)
    return alertsCreated
  }

  // Process each risk-specific analysis
  for (const riskAnalysis of analysis.risk_analyses) {
    try {
      if (!riskAnalysis.risk_code) {
        console.log(`   ⚠️ Skipping analysis without risk_code`)
        continue
      }

      const alert = {
        event_id: event.id,
        risk_code: riskAnalysis.risk_code,
        confidence_score: (analysis.confidence || 70) / 100, // Convert 0-100 to 0-1 decimal
        suggested_likelihood_change: riskAnalysis.likelihood_change || 0,
        reasoning: riskAnalysis.reasoning || 'No reasoning provided',
        suggested_controls: riskAnalysis.suggested_controls || [],
        impact_assessment: riskAnalysis.impact_assessment || null,
        status: 'pending',
        applied_to_risk: false,
      }

      const { error } = await supabase
        .from('risk_intelligence_alerts')
        .insert(alert)

      if (!error) {
        alertsCreated++
        console.log(`   ✅ Created alert for ${riskAnalysis.risk_code}`)
      } else {
        console.log(`   ❌ Failed to insert alert: ${error.message}`)
      }
    } catch (error) {
      console.error(`   ❌ Error creating alert for ${riskAnalysis.risk_code}:`, error)
    }
  }

  return alertsCreated
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's organization
    console.log(`👤 Analyzing events for user: ${user.id}`)

    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ User profile not found:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const organizationId = profile.organization_id
    console.log(`🏢 User organization_id: ${organizationId}`)

    // Get Claude API key
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('VITE_ANTHROPIC_API_KEY')
    if (!claudeApiKey) {
      return new Response(
        JSON.stringify({ error: 'Claude API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const minConfidence = body.minConfidence ?? 70
    const eventId = body.eventId // Optional: analyze specific event
    const limit = body.limit || 50 // Optional: limit number of events to process

    console.log(`🚀 Starting intelligence analysis...`)
    console.log(`🎯 Minimum confidence threshold: ${minConfidence}%`)
    if (eventId) {
      console.log(`🎯 Analyzing specific event: ${eventId}`)
    } else {
      console.log(`🎯 Batch mode: processing up to ${limit} events`)
    }

    // Get events to analyze
    let eventsQuery = supabaseClient
      .from('external_events')
      .select('*')
      .eq('organization_id', organizationId)

    if (eventId) {
      // Analyze specific event (auto-scan mode)
      eventsQuery = eventsQuery.eq('id', eventId)
    } else {
      // Analyze all unchecked events (batch scan mode)
      eventsQuery = eventsQuery
        .eq('relevance_checked', false)
        .order('published_date', { ascending: false })
        .limit(limit)
    }

    const { data: events, error: eventsError } = await eventsQuery

    if (eventsError) {
      throw eventsError
    }

    if (!events || events.length === 0) {
      console.log('ℹ️ No unchecked events found')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No unchecked events to analyze',
          scanned: 0,
          alertsCreated: 0,
          errors: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${events.length} unchecked events`)

    // Get all active risks for organization
    const { data: risks, error: risksError } = await supabaseClient
      .from('risks')
      .select('risk_code, risk_title, risk_description, category')
      .eq('organization_id', organizationId)
      .in('status', ['OPEN', 'MONITORING'])

    if (risksError) {
      throw risksError
    }

    if (!risks || risks.length === 0) {
      console.log('⚠️ No active risks found')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No risks found to analyze against',
          scanned: 0,
          alertsCreated: 0,
          errors: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Loaded ${risks.length} active risks`)

    // Analyze each event
    let scanned = 0
    let alertsCreated = 0
    const errors: string[] = []

    for (const event of events) {
      try {
        console.log(`\n🔍 Analyzing: ${event.title.substring(0, 60)}...`)

        // Analyze relevance
        const analysis = await analyzeEventRelevance(event, risks, claudeApiKey)
        scanned++

        // Create alerts if relevant and meets confidence threshold
        if (analysis.is_relevant && analysis.confidence >= minConfidence) {
          const riskCodes = analysis.risk_analyses?.map((r: any) => r.risk_code) || []
          console.log(`   ✅ Relevant! Confidence: ${analysis.confidence}%, Risks: ${riskCodes.join(', ')}`)
          const created = await createRiskAlerts(supabaseClient, event, analysis, organizationId)
          alertsCreated += created
        } else if (analysis.is_relevant) {
          console.log(`   ⚠️ Relevant but below confidence threshold (${analysis.confidence}% < ${minConfidence}%)`)
        } else {
          console.log(`   ℹ️ Not relevant to organizational risks`)
        }

        // Mark event as checked
        await supabaseClient
          .from('external_events')
          .update({ relevance_checked: true })
          .eq('id', event.id)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Error analyzing event ${event.id}:`, error)
        errors.push(`Event ${event.id}: ${error.message}`)

        // Mark as checked even if error occurred
        await supabaseClient
          .from('external_events')
          .update({ relevance_checked: true })
          .eq('id', event.id)
      }
    }

    console.log(`\n✅ Analysis complete!`)
    console.log(`📊 Scanned: ${scanned} events`)
    console.log(`🚨 Alerts created: ${alertsCreated}`)
    if (errors.length > 0) {
      console.log(`⚠️ Errors: ${errors.length}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Analysis complete',
        scanned,
        alertsCreated,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in intelligence analyzer:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
