// Supabase Edge Function for analyzing external events against risks
// Simplified version for NEW-MINRISK
// Updated: 2025-11-25

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
2. If relevant, identify which risk(s) it affects
3. Assess the likely impact on risk likelihood/impact (scale -2 to +2, where +1 = slight increase, +2 = significant increase)
4. Provide clear reasoning
5. Suggest 2-4 specific controls or mitigation actions the organization should consider
6. Provide an impact assessment describing potential consequences if this event materializes

RESPOND ONLY WITH THIS JSON FORMAT (no markdown, no explanations):
{
  "is_relevant": true,
  "confidence": 85,
  "risk_codes": ["STR-CYB-001"],
  "likelihood_change": 1,
  "impact_change": 0,
  "reasoning": "Brief explanation of why this event is relevant and what changed",
  "suggested_controls": ["Control 1: Specific action to take", "Control 2: Another mitigation step", "Control 3: Additional measure"],
  "impact_assessment": "Detailed description of potential consequences and business impact if this event occurs"
}

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
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
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
      return { is_relevant: false }
    }

    const analysis = JSON.parse(jsonMatch[0])
    return analysis

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

  if (!analysis.is_relevant || !analysis.risk_codes || analysis.risk_codes.length === 0) {
    return alertsCreated
  }

  for (const riskCode of analysis.risk_codes) {
    try {
      const alert = {
        organization_id: organizationId,
        event_id: event.id,
        risk_code: riskCode,
        is_relevant: true,
        confidence_score: analysis.confidence || 70,
        likelihood_change: analysis.likelihood_change || 0,
        impact_change: analysis.impact_change || 0,
        ai_reasoning: analysis.reasoning || 'No reasoning provided',
        suggested_controls: analysis.suggested_controls || [],
        impact_assessment: analysis.impact_assessment || null,
        status: 'pending',
        applied_to_risk: false,
      }

      const { error } = await supabase
        .from('risk_intelligence_alerts')
        .insert(alert)

      if (!error) {
        alertsCreated++
        console.log(`   ✅ Created alert for ${riskCode}`)
      } else {
        console.log(`   ❌ Failed to insert alert: ${error.message}`)
      }
    } catch (error) {
      console.error(`   ❌ Error creating alert for ${riskCode}:`, error)
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
    const minConfidence = body.minConfidence || 70
    const eventId = body.eventId // Optional: analyze specific event

    console.log(`🚀 Starting intelligence analysis...`)
    console.log(`🎯 Minimum confidence threshold: ${minConfidence}%`)
    if (eventId) {
      console.log(`🎯 Analyzing specific event: ${eventId}`)
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
        .limit(50)
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
          console.log(`   ✅ Relevant! Confidence: ${analysis.confidence}%, Risks: ${analysis.risk_codes?.join(', ')}`)
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
        await new Promise(resolve => setTimeout(resolve, 1000))

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
