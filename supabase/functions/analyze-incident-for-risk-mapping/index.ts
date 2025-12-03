// Supabase Edge Function for AI-powered incident-to-risk mapping
// Phase 4+5: AI-Assisted Risk Mapping with Historical Pattern Analysis
// Created: 2025-12-03
//
// This function:
// 1. Analyzes incidents against organization's risk register
// 2. Uses historical pattern matching for context
// 3. Inserts AI suggestions into incident_risk_ai_suggestions table
// 4. Tracks keywords, confidence, and reasoning for audit trail

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// AI Model Configuration
const AI_MODEL_VERSION = 'claude-3-5-sonnet-20241022'
const CLAUDE_API_TIMEOUT = 30000
const MIN_CONFIDENCE_THRESHOLD = 70 // Only suggest risks with >= 70% confidence

interface RiskSuggestion {
  risk_id: string
  risk_code: string
  risk_title: string
  confidence_score: number
  reasoning: string
  keywords_matched: string[]
  similar_incident_count: number
}

/**
 * Fetch historical pattern analysis for an incident
 */
async function getHistoricalPatterns(supabase: any, incidentId: string) {
  try {
    const { data, error } = await supabase
      .from('incident_pattern_analysis')
      .select('*')
      .eq('incident_id', incidentId)
      .single()

    if (error) {
      console.log(`   ℹ️ No historical patterns found: ${error.message}`)
      return null
    }

    return data
  } catch (error) {
    console.error('   ⚠️ Error fetching historical patterns:', error.message)
    return null
  }
}

/**
 * Call Claude AI to analyze incident and suggest risk mappings
 */
async function analyzeIncidentWithAI(
  incident: any,
  risks: any[],
  historicalPattern: any,
  claudeApiKey: string
): Promise<RiskSuggestion[]> {

  // Build risk context
  const riskDetails = risks.map((r, idx) =>
    `${idx + 1}. ID: ${r.id}
   Code: [${r.risk_code}]
   Title: ${r.title || r.risk_title}
   Category: ${r.category || 'N/A'}
   Division: ${r.division || 'N/A'}
   Description: ${r.description || r.risk_description || 'N/A'}
   Current Status: ${r.status}`
  ).join('\n\n')

  // Build historical context if available
  let historicalContext = ''
  if (historicalPattern && historicalPattern.similar_mapped_count > 0) {
    historicalContext = `\n\nHISTORICAL PATTERN INTELLIGENCE:
Similar incidents in the past (${historicalPattern.similar_mapped_count} occurrences) were most commonly mapped to:
- Risk Code: ${historicalPattern.most_common_risk_code || 'N/A'}
- Historical Confidence: ${historicalPattern.historical_confidence_pct || 0}%

This suggests a pattern worth considering, but analyze the current incident independently.`
  }

  const prompt = `You are an expert enterprise risk management analyst specializing in incident-to-risk classification.

Your task is to analyze an incident report and determine which organizational risks it relates to. This is critical for:
- Regulatory compliance and audit trails
- Risk exposure quantification
- Control effectiveness assessment
- Board-level risk reporting

INCIDENT DETAILS:
Title: ${incident.title}
Type: ${incident.incident_type || 'N/A'}
Severity: ${incident.severity} (1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL)
Date: ${incident.incident_date || 'N/A'}
Division: ${incident.division || 'N/A'}
Department: ${incident.department || 'N/A'}
Description: ${incident.description}
${incident.financial_impact ? `Financial Impact: ₦${incident.financial_impact}` : ''}
${incident.root_cause ? `Root Cause: ${incident.root_cause}` : ''}
${incident.impact_description ? `Impact: ${incident.impact_description}` : ''}
${historicalContext}

ORGANIZATIONAL RISK REGISTER (${risks.length} active risks):
${riskDetails}

CLASSIFICATION CRITERIA:
Consider these relationship types:
1. **MATERIALIZATION**: The risk actually occurred (incident is direct evidence)
2. **NEAR MISS**: The incident almost caused the risk to materialize
3. **CONTROL FAILURE**: The incident shows a control for this risk failed
4. **INDICATOR**: The incident is an early warning sign of this risk

CONFIDENCE SCORING GUIDANCE (0-100):
- 90-100%: Unambiguous, direct relationship (e.g., "Data breach" → "Cybersecurity Risk")
- 80-89%: Strong relationship with clear evidence in incident description
- 70-79%: Probable relationship based on incident characteristics
- 60-69%: Possible relationship but needs expert review → DO NOT SUGGEST (below threshold)
- <60%: Weak or speculative relationship → DO NOT SUGGEST

KEYWORD EXTRACTION:
Identify 3-8 specific keywords from the incident that match risk terminology.
Examples: ["ransomware", "encryption", "data loss"], ["payment", "settlement", "transaction error"]

REQUIREMENTS:
1. Only suggest risks with confidence >= ${MIN_CONFIDENCE_THRESHOLD}%
2. Rank suggestions by confidence (highest first)
3. Provide specific, audit-trail-quality reasoning
4. Extract relevant keywords for each suggestion
5. Be conservative - false positives erode trust in AI suggestions

RESPOND WITH ONLY THIS JSON (no markdown, no code blocks, no explanations):
{
  "suggestions": [
    {
      "risk_id": "uuid-from-risk-register",
      "risk_code": "FIN-OPS-001",
      "risk_title": "Transaction Processing Errors",
      "confidence_score": 85,
      "reasoning": "This incident directly demonstrates [SPECIFIC RISK] because [SPECIFIC EVIDENCE FROM INCIDENT]. The [INCIDENT CHARACTERISTIC] aligns with the risk description's mention of [RISK CHARACTERISTIC]. Financial impact of ₦X confirms materialization.",
      "keywords_matched": ["transaction", "error", "processing", "payment"],
      "relationship_type": "materialized"
    }
  ]
}`

  console.log(`   🤖 Calling Claude AI (${AI_MODEL_VERSION})...`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_API_TIMEOUT)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929', // Latest model
        max_tokens: 4096,
        temperature: 0.2, // Lower temperature for more consistent analysis
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`   ❌ Claude API error: ${response.status}`)
      console.error('   Error details:', errorBody)
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || '{}'

    console.log(`   📄 AI Response received (${text.length} chars)`)

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const analysis = JSON.parse(jsonText)
    const suggestions = analysis.suggestions || []

    // Filter and validate suggestions
    const validSuggestions = suggestions
      .filter((s: any) => s.confidence_score >= MIN_CONFIDENCE_THRESHOLD)
      .map((s: any) => ({
        risk_id: s.risk_id,
        risk_code: s.risk_code,
        risk_title: s.risk_title,
        confidence_score: Math.min(100, Math.max(0, s.confidence_score)),
        reasoning: s.reasoning || 'No specific reasoning provided',
        keywords_matched: Array.isArray(s.keywords_matched) ? s.keywords_matched : [],
        similar_incident_count: historicalPattern?.similar_mapped_count || 0
      }))

    console.log(`   ✅ Generated ${validSuggestions.length} high-confidence suggestions`)

    return validSuggestions

  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw new Error('AI analysis timeout - request took too long')
    }

    throw error
  }
}

/**
 * Insert AI suggestions into database
 * Handles re-analysis by deleting old pending suggestions first
 */
async function insertSuggestions(
  supabase: any,
  incidentId: string,
  organizationId: string,
  suggestions: RiskSuggestion[]
) {
  // First, delete any existing pending suggestions for this incident
  // This allows re-running analysis without duplicate key errors
  const { error: deleteError } = await supabase
    .from('incident_risk_ai_suggestions')
    .delete()
    .eq('incident_id', incidentId)
    .eq('status', 'pending')

  if (deleteError) {
    console.error('   ⚠️  Warning: Could not delete old suggestions:', deleteError.message)
    // Continue anyway - might not be critical
  }

  const records = suggestions.map(s => ({
    organization_id: organizationId,
    incident_id: incidentId,
    risk_id: s.risk_id,
    confidence_score: s.confidence_score,
    reasoning: s.reasoning,
    keywords_matched: s.keywords_matched,
    similar_incident_count: s.similar_incident_count,
    status: 'pending',
    ai_model_version: AI_MODEL_VERSION
  }))

  const { data, error } = await supabase
    .from('incident_risk_ai_suggestions')
    .insert(records)
    .select()

  if (error) {
    console.error('   ❌ Error inserting suggestions:', error.message)
    throw new Error(`Failed to save AI suggestions: ${error.message}`)
  }

  console.log(`   ✅ Inserted ${data.length} suggestions into database`)

  return data
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    if (!claudeApiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY - AI analysis is not configured')
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { incident_id } = await req.json()

    if (!incident_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'incident_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`\n📊 === AI RISK MAPPING ANALYSIS ===`)
    console.log(`   Incident ID: ${incident_id}`)

    // 1. Fetch incident details
    console.log(`   📋 Fetching incident details...`)
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incident_id)
      .single()

    if (incidentError || !incident) {
      throw new Error(`Incident not found: ${incident_id}`)
    }

    console.log(`   ✅ Incident: "${incident.title}"`)
    console.log(`   Organization: ${incident.organization_id}`)

    // 2. Fetch organization's active risks
    console.log(`   📋 Fetching organization risk register...`)
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('*')
      .eq('organization_id', incident.organization_id)
      .in('status', ['OPEN', 'MONITORING']) // Only active risks
      .order('risk_code')

    if (risksError) {
      throw new Error(`Failed to fetch risks: ${risksError.message}`)
    }

    console.log(`   ✅ Found ${risks.length} active risks to analyze`)

    if (risks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          suggestions: [],
          message: 'No active risks found in organization risk register'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 3. Fetch historical pattern analysis
    console.log(`   📊 Checking historical patterns...`)
    const historicalPattern = await getHistoricalPatterns(supabase, incident_id)

    if (historicalPattern) {
      console.log(`   ✅ Found ${historicalPattern.similar_mapped_count} similar past incidents`)
    }

    // 4. Call AI for analysis
    console.log(`   🧠 Running AI analysis...`)
    const suggestions = await analyzeIncidentWithAI(
      incident,
      risks,
      historicalPattern,
      claudeApiKey
    )

    // 5. Insert suggestions into database
    if (suggestions.length > 0) {
      console.log(`   💾 Saving ${suggestions.length} suggestions...`)
      await insertSuggestions(
        supabase,
        incident_id,
        incident.organization_id,
        suggestions
      )
    } else {
      console.log(`   ℹ️ No high-confidence suggestions generated (threshold: ${MIN_CONFIDENCE_THRESHOLD}%)`)
    }

    console.log(`   ✅ Analysis complete!`)
    console.log(`=================================\n`)

    return new Response(
      JSON.stringify({
        success: true,
        incident_id,
        suggestions_count: suggestions.length,
        suggestions: suggestions.map(s => ({
          risk_code: s.risk_code,
          risk_title: s.risk_title,
          confidence_score: s.confidence_score,
          keywords_matched: s.keywords_matched
        })),
        historical_context: historicalPattern ? {
          similar_count: historicalPattern.similar_mapped_count,
          most_common_risk: historicalPattern.most_common_risk_code,
          confidence: historicalPattern.historical_confidence_pct
        } : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        technical_details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
