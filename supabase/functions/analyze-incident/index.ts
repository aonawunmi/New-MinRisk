// Supabase Edge Function for AI-powered incident analysis
// Feature: AI-Powered Incident-to-Risk Linking & Control Adequacy Assessment
// Created: 2025-01-02

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

/**
 * Analyze incident and suggest related risks with confidence scores
 */
async function suggestRisksForIncident(incident: any, risks: any[], claudeApiKey: string) {
  try {
    if (risks.length === 0) {
      console.log('   ⚠️ No risks available for analysis!')
      return []
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
Type: ${incident.incident_type}
Severity: ${incident.severity}
Date: ${incident.incident_date}
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
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
      const errorBody = await response.text()
      console.error('   Error details:', errorBody)
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || '{}'

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('   ❌ Could not extract JSON from AI response')
      console.error('   Raw response:', text)
      return []
    }

    const analysis = JSON.parse(jsonMatch[0])
    return analysis.suggested_risks || []

  } catch (error) {
    console.error('   ❌ Error in risk suggestion:', error.message)
    throw error
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
        model: 'claude-sonnet-4-5-20250929',
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
    // Get Claude API key from environment
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!claudeApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const { action, incident, risks, risk, controls } = await req.json()

    console.log(`📊 Incident Analysis Request: ${action}`)

    let result

    if (action === 'suggest_risks') {
      // Suggest which risks this incident relates to
      console.log(`   Analyzing incident: "${incident.title}"`)
      console.log(`   Against ${risks?.length || 0} organizational risks`)

      result = await suggestRisksForIncident(incident, risks || [], claudeApiKey)

      console.log(`   ✅ Found ${result.length} suggested risk link(s)`)

    } else if (action === 'assess_controls') {
      // Assess control adequacy for a specific risk
      console.log(`   Assessing controls for risk: ${risk?.risk_code}`)
      console.log(`   ${controls?.length || 0} controls to evaluate`)

      result = await assessControlAdequacy(incident, risk, controls || [], claudeApiKey)

      console.log(`   ✅ Assessment: ${result.assessment}`)

    } else {
      throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Error:', error.message)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
