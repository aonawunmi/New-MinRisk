// Supabase Edge Function for AI-powered incident analysis
// Feature: AI-Powered Incident-to-Risk Linking & Control Adequacy Assessment
// Created: 2025-01-02
// Updated: 2025-12-13 - Centralized AI model configuration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { USE_CASE_MODELS } from '../_shared/ai-models.ts'
import { verifyClerkAuth } from '../_shared/clerk-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Configuration
const CLAUDE_API_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 2
const RETRY_DELAY = 1000 // 1 second

/**
 * Custom error class for better error categorization
 */
class AIAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AIAnalysisError'
  }
}

/**
 * Validate incident has minimum required fields
 */
function validateIncident(incident: any): void {
  if (!incident) {
    throw new AIAnalysisError(
      'Incident object is missing',
      'INVALID_INPUT',
      'Incident data is required for analysis.',
      false
    )
  }

  if (!incident.title || incident.title.trim().length === 0) {
    throw new AIAnalysisError(
      'Incident title is missing',
      'MISSING_TITLE',
      'Incident must have a title for meaningful analysis.',
      false
    )
  }

  if (!incident.description || incident.description.trim().length < 10) {
    throw new AIAnalysisError(
      'Incident description too short',
      'INSUFFICIENT_DESCRIPTION',
      'Please provide a detailed incident description (at least 10 characters) for accurate AI analysis.',
      false
    )
  }
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = CLAUDE_API_TIMEOUT,
  retries: number = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        throw new AIAnalysisError(
          'Rate limit exceeded',
          'RATE_LIMIT',
          `AI service is temporarily rate limited. ${retryAfter ? `Try again in ${retryAfter} seconds.` : 'Please try again in a few moments.'}`,
          true
        )
      }

      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new AIAnalysisError(
          'Authentication failed',
          'AUTH_ERROR',
          'AI service authentication failed. Please contact your administrator.',
          false
        )
      }

      return response

    } catch (error) {
      // Handle timeout
      if (error.name === 'AbortError') {
        if (attempt < retries) {
          console.log(`   ⏱️ Timeout on attempt ${attempt + 1}, retrying...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)))
          continue
        }
        throw new AIAnalysisError(
          'Request timeout',
          'TIMEOUT',
          'AI analysis took too long to respond. Please try again.',
          true
        )
      }

      // Handle network errors
      if (error.message.includes('fetch')) {
        if (attempt < retries) {
          console.log(`   🔌 Network error on attempt ${attempt + 1}, retrying...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)))
          continue
        }
        throw new AIAnalysisError(
          'Network error',
          'NETWORK_ERROR',
          'Unable to connect to AI service. Please check your connection and try again.',
          true
        )
      }

      // Re-throw AIAnalysisErrors
      if (error instanceof AIAnalysisError) {
        throw error
      }

      // Unknown error
      throw error
    }
  }

  throw new Error('Max retries exceeded')
}

/**
 * Analyze incident and suggest related risks with confidence scores
 */
async function suggestRisksForIncident(incident: any, risks: any[], claudeApiKey: string) {
  try {
    // Validate input
    validateIncident(incident)

    // Check if there are risks to analyze against
    if (risks.length === 0) {
      console.log('   ⚠️ No risks available for analysis!')
      throw new AIAnalysisError(
        'No risks in organization',
        'NO_RISKS',
        'Your organization has no active risks to compare this incident against. Please add risks to your risk register first.',
        false
      )
    }

    const riskDetails = risks.map((r, idx) =>
      `${idx + 1}. [${r.risk_code}] ${r.risk_title}
   Category: ${r.category || 'N/A'}
   Division: ${r.division || 'N/A'}
   Description: ${r.risk_description || 'N/A'}`
    ).join('\n\n')

    const prompt = `You are an expert risk management analyst. Analyze this incident and determine which existing organizational risks it relates to.

INCIDENT DETAILS:
Title: ${incident.title}
Type: ${incident.incident_type || 'N/A'}
Severity: ${incident.severity || 'N/A'}
Date: ${incident.incident_date || 'N/A'}
Division: ${incident.division || 'N/A'}
Department: ${incident.department || 'N/A'}
Description: ${incident.description || 'N/A'}
${incident.financial_impact ? `Financial Impact: $${incident.financial_impact}` : ''}
${incident.root_cause ? `Root Cause: ${incident.root_cause}` : ''}
${incident.impact_description ? `Impact: ${incident.impact_description}` : ''}

EXISTING ORGANIZATIONAL RISKS:
${riskDetails}

TASK:
Analyze which risks this incident is related to. For each relevant risk:
1. Determine the confidence level (0-100%)
2. Explain WHY this incident relates to that specific risk
3. Determine the relationship type:
   - "materialized": The risk actually occurred
   - "near_miss": Could have caused the risk to materialize
   - "control_failure": Shows a control for this risk failed

Only include risks with confidence >= 70%.

RESPOND WITH ONLY THIS JSON (no markdown, no explanations):
{
  "suggested_risks": [
    {
      "risk_code": "FIN-OPS-001",
      "risk_title": "Transaction Processing Errors",
      "confidence": 92,
      "reasoning": "Detailed explanation of why this incident relates to this risk. Reference specific details from both the incident and the risk description.",
      "link_type": "materialized"
    }
  ]
}`

    console.log(`   🤖 Calling Claude AI API...`)

    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: USE_CASE_MODELS.INCIDENT_ANALYSIS,
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`   ❌ Claude API error: ${response.status}`)
      console.error('   Error details:', errorBody)

      // Parse error details if possible
      try {
        const errorJson = JSON.parse(errorBody)
        if (errorJson.error?.message) {
          throw new AIAnalysisError(
            errorJson.error.message,
            'API_ERROR',
            `AI service error: ${errorJson.error.message}`,
            response.status >= 500
          )
        }
      } catch {}

      throw new AIAnalysisError(
        `HTTP ${response.status}`,
        'API_ERROR',
        'AI service returned an error. Please try again.',
        response.status >= 500
      )
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || '{}'

    console.log(`   📄 AI Response received (${text.length} chars)`)

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('   ❌ Could not extract JSON from AI response')
      console.error('   Raw response:', text.substring(0, 200))
      throw new AIAnalysisError(
        'Invalid AI response format',
        'PARSE_ERROR',
        'AI returned an unexpected response format. Please try again.',
        true
      )
    }

    try {
      const analysis = JSON.parse(jsonMatch[0])
      const suggestedRisks = analysis.suggested_risks || []

      console.log(`   ✅ Successfully parsed ${suggestedRisks.length} suggestions`)

      return suggestedRisks
    } catch (parseError) {
      console.error('   ❌ JSON parse error:', parseError.message)
      throw new AIAnalysisError(
        'Failed to parse AI response',
        'PARSE_ERROR',
        'AI response could not be interpreted. Please try again.',
        true
      )
    }

  } catch (error) {
    // Re-throw AIAnalysisErrors as-is
    if (error instanceof AIAnalysisError) {
      throw error
    }

    // Wrap unknown errors
    console.error('   ❌ Unexpected error in risk suggestion:', error.message)
    throw new AIAnalysisError(
      error.message,
      'UNKNOWN_ERROR',
      'An unexpected error occurred during analysis. Please try again.',
      true
    )
  }
}

/**
 * Assess control adequacy after an incident
 */
async function assessControlAdequacy(
  incident: any,
  risk: any,
  controls: any[],
  claudeApiKey: string
) {
  try {
    if (controls.length === 0) {
      return {
        assessment: 'Inadequate',
        reasoning: 'No controls are currently in place for this risk.',
        dime_adjustments: [],
        suggested_controls: [],
        priority: 'High'
      }
    }

    const controlDetails = controls.map((c, idx) =>
      `${idx + 1}. ${c.name}
   Description: ${c.description || 'N/A'}
   Type: ${c.control_type || 'N/A'}
   Target: ${c.target || 'N/A'}
   DIME Scores:
     - Design: ${c.design_score || 'N/A'}/4
     - Implementation: ${c.implementation_score || 'N/A'}/4
     - Monitoring: ${c.monitoring_score || 'N/A'}/4
     - Evaluation: ${c.evaluation_score || 'N/A'}/4`
    ).join('\n\n')

    const prompt = `You are a control effectiveness expert. An incident has occurred that relates to a specific risk. Analyze whether the existing controls were adequate.

RISK BEING ASSESSED:
Code: ${risk.risk_code}
Title: ${risk.risk_title}
Description: ${risk.risk_description || 'N/A'}
Category: ${risk.category || 'N/A'}
Inherent Likelihood: ${risk.likelihood_inherent}/5
Inherent Impact: ${risk.impact_inherent}/5

EXISTING CONTROLS:
${controlDetails}

INCIDENT THAT OCCURRED:
Title: ${incident.title}
Type: ${incident.incident_type}
Severity: ${incident.severity}
Description: ${incident.description || 'N/A'}
${incident.financial_impact ? `Financial Impact: $${incident.financial_impact}` : ''}
${incident.root_cause ? `Root Cause Analysis: ${incident.root_cause}` : ''}

TASK:
Assess whether the controls were adequate to prevent this incident. Consider:
1. Were controls designed correctly but not implemented properly?
2. Are there gaps in what controls exist?
3. What new controls should be added?

For DIME score adjustments, use this scale:
- 4: Excellent
- 3: Good
- 2: Fair
- 1: Poor
- 0: None/Failed

RESPOND WITH ONLY THIS JSON (no markdown):
{
  "assessment": "Adequate" | "Partially Adequate" | "Inadequate",
  "reasoning": "Explain why the incident occurred despite existing controls. Be specific about control failures or gaps.",
  "dime_adjustments": [
    {
      "control_id": "uuid from controls list",
      "control_name": "name of the control",
      "dimension": "design" | "implementation" | "monitoring" | "evaluation",
      "current_score": 3,
      "suggested_score": 1,
      "reason": "Specific reason for the adjustment based on incident evidence"
    }
  ],
  "suggested_controls": [
    {
      "name": "Descriptive control name",
      "description": "Detailed description of the control and how it prevents recurrence",
      "control_type": "preventive" | "detective" | "corrective",
      "target": "likelihood" | "impact",
      "expected_dime": {
        "design": 4,
        "implementation": 3,
        "monitoring": 3,
        "evaluation": 2
      },
      "implementation_priority": "High" | "Medium" | "Low"
    }
  ],
  "priority": "High" | "Medium" | "Low"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: USE_CASE_MODELS.INCIDENT_ANALYSIS,
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
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || '{}'

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('   ❌ Could not extract JSON from AI response')
      throw new Error('Invalid AI response format')
    }

    const assessment = JSON.parse(jsonMatch[0])
    return assessment

  } catch (error) {
    console.error('   ❌ Error in control assessment:', error.message)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify Clerk authentication
    let profile, supabaseClient, supabaseAdmin;
    try {
      ({ profile, supabaseClient, supabaseAdmin } = await verifyClerkAuth(req));
    } catch (authError) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Claude API key from environment
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!claudeApiKey) {
      throw new AIAnalysisError(
        'ANTHROPIC_API_KEY not configured',
        'CONFIG_ERROR',
        'AI service is not properly configured. Please contact your administrator to set up the ANTHROPIC_API_KEY.',
        false
      )
    }

    const { action, incident, risks, risk, controls } = await req.json()

    console.log(`📊 Incident Analysis Request: ${action}`)

    let result

    if (action === 'suggest_risks') {
      // Suggest which risks this incident relates to
      console.log(`   Analyzing incident: "${incident?.title || 'Unknown'}"`)
      console.log(`   Against ${risks?.length || 0} organizational risks`)

      result = await suggestRisksForIncident(incident, risks || [], claudeApiKey)

      console.log(`   ✅ Found ${result.length} suggested risk link(s)`)

    } else if (action === 'assess_controls') {
      // Assess control adequacy for a specific risk
      console.log(`   Assessing controls for risk: ${risk?.risk_code || 'Unknown'}`)
      console.log(`   ${controls?.length || 0} controls to evaluate`)

      validateIncident(incident)

      result = await assessControlAdequacy(incident, risk, controls || [], claudeApiKey)

      console.log(`   ✅ Assessment: ${result.assessment}`)

    } else {
      throw new AIAnalysisError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Invalid analysis request. Please try again.',
        false
      )
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Error:', error.message)

    // Handle AIAnalysisErrors with structured response
    if (error instanceof AIAnalysisError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.userMessage,
          error_code: error.code,
          retryable: error.retryable,
          technical_details: error.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: error.code === 'AUTH_ERROR' || error.code === 'CONFIG_ERROR' ? 401 : 400,
        }
      )
    }

    // Handle generic errors
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred. Please try again.',
        error_code: 'UNKNOWN_ERROR',
        retryable: true,
        technical_details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
