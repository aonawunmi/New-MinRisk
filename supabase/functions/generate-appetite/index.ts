// Supabase Edge Function for Risk Appetite AI Generation
// Securely handles Anthropic API calls for the Risk Appetite framework

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { USE_CASE_MODELS } from '../_shared/ai-models.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Authenticate User
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        )

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized', details: userError }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Get API Key
        const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('VITE_ANTHROPIC_API_KEY')
        if (!claudeApiKey) {
            throw new Error('Server misconfiguration: Missing ANTHROPIC_API_KEY in secrets')
        }

        // 3. Parse Request
        let body;
        try {
            body = await req.json()
        } catch (e) {
            throw new Error('Invalid JSON body')
        }

        const { mode, context, ...params } = body

        // 4. Route to specific handler
        let result;
        switch (mode) {
            case 'generate_statement':
                result = await generateStatement(context, claudeApiKey);
                break;
            case 'generate_categories':
                result = await generateCategories(context, claudeApiKey);
                break;
            case 'generate_metrics':
                result = await generateMetrics(params.riskCategory, params.appetiteLevel, context, claudeApiKey);
                break;
            case 'generate_category_statement':
                result = await generateCategoryStatement(params.riskCategory, params.appetiteLevel, params.organizationName, params.enterpriseMeaning, claudeApiKey);
                break;
            case 'generate_summary_report':
                result = await generateSummaryReport(params.organizationName, params.categoryStatements, claudeApiKey);
                break;
            default:
                throw new Error(`Invalid generation mode: ${mode}`);
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error.message)
        // Return 200 OK with error field so client can read the message
        return new Response(
            JSON.stringify({ error: error.message, stack: error.stack }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// --- Logic Handlers ---

async function callClaude(prompt: string, apiKey: string, maxTokens: number = 1024) {
    const controller = new AbortController();
    // 50s timeout (under the 60s Edge Function limit)
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: USE_CASE_MODELS.APPETITE_GENERATION,
                max_tokens: maxTokens,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Claude API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('AI generation timed out (50s limit). Please try again.');
        }
        throw error;
    }
}

// 1. Generate Overall Statement
async function generateStatement(context: any, apiKey: string) {
    const periodText = context.currentPeriodYear && context.currentPeriodQuarter
        ? `Q${context.currentPeriodQuarter} ${context.currentPeriodYear}`
        : `Fiscal Year ${new Date().getFullYear()}`;

    // Construct constraint text from user's pre-configured inputs
    let specificConstraint = '';
    if (context.configuredAppetites && Array.isArray(context.configuredAppetites) && context.configuredAppetites.length > 0) {
        specificConstraint = `\n\nCRITICAL REQUIREMENT - PRE-DEFINED APPETITE LEVELS:
The Board has already agreed on the following appetite levels. Your statement MUST faithfully reflect these:
${context.configuredAppetites.map((a: any) => `- ${a.category}: ${a.level}`).join('\n')}
`;
    }

    const prompt = `You are a world-class Chief Risk Officer helping to draft a Risk Appetite Statement.

CONTEXT:
- Organization: ${context.organizationName || 'Financial Institution'}
- Industry: ${context.industry || 'Financial Services'}
- Current Period: ${periodText}
- Key Risk Categories: ${context.riskCategories.join(', ')}
${specificConstraint}

TASK:
Write a concise, Board-approved Risk Appetite Statement (2-3 paragraphs).

REQUIREMENTS:
1. Use professional, Board-level language
2. Reference specific risk categories${specificConstraint ? ' with their assigned levels' : ''}
3. Be clear about appetite levels (ZERO, LOW, MODERATE, HIGH)
4. Align with regulatory expectations (CBN, SEC, PENCOM)
5. Include time horizon referencing the Current Period above (${periodText})

EXAMPLE STRUCTURE:
"[Organization Name] maintains a [LEVEL] appetite for [category], recognizing [rationale].
We accept [LEVEL] appetite for [category] to [business objective], while ensuring [control statement].
We maintain ZERO tolerance for [category], as [compliance requirement]."

Generate the Risk Appetite Statement now:`;

    const text = await callClaude(prompt, apiKey);
    return { text };
}

// 2. Generate Categories
async function generateCategories(context: any, apiKey: string) {
    const riskContext = context.existingRisks && Array.isArray(context.existingRisks)
        ? context.existingRisks.map((r: any) =>
            `${r.category}: ${r.count} risks, avg inherent score ${r.avgInherentScore}`
        ).join('\n')
        : context.riskCategories.join('\n');

    const prompt = `You are a world-class Chief Risk Officer mapping risk appetite levels.

CONTEXT:
Risk Categories in the Organization:
${riskContext}

TASK:
For each risk category, recommend an appetite level (ZERO, LOW, MODERATE, HIGH) with rationale.

DEFINITIONS (Strictly apply these):
- ZERO: Risks that threaten regulatory licence, solvency, or fundamental trust are not acceptable under any circumstances
- LOW: Only limited, short-duration exposure is acceptable; breaches require immediate escalation and remediation
- MODERATE: Managed volatility is acceptable within approved limits and controls
- HIGH: Willingness to accept material volatility in pursuit of strategic objectives

OUTPUT FORMAT (JSON array):
[
  {
    "risk_category": "Credit Risk",
    "appetite_level": "MODERATE",
    "rationale": "Accept moderate credit exposure to support lending business, with robust underwriting and monitoring controls"
  },
  ...
]

Generate appetite categories now (JSON only, no explanation):`;

    const text = await callClaude(prompt, apiKey, 2048);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Failed to parse AI response as JSON');
    return JSON.parse(jsonMatch[0]);
}

// 3. Generate Tolerance Metrics
async function generateMetrics(riskCategory: string, appetiteLevel: string, context: any, apiKey: string) {
    const prompt = `You are a world-class Chief Risk Officer designing tolerance metrics.

CONTEXT:
- Risk Category: ${riskCategory}
- Appetite Level: ${appetiteLevel}
- Industry: ${context.industry || 'Financial Services'}

TASK:
Design 2-3 quantitative tolerance metrics for this category with Green/Amber/Red thresholds.

METRIC TYPES (use MAXIMUM, MINIMUM, or RANGE only):
- MAXIMUM: Upper limit (e.g., "VaR must not exceed X")
- MINIMUM: Lower limit (e.g., "Liquidity ratio must stay above X")
- RANGE: Between two values (e.g., "NPL ratio between X and Y")

IMPORTANT: Do NOT use DIRECTIONAL type - only MAXIMUM, MINIMUM, or RANGE.

THRESHOLD LOGIC:
- GREEN zone: Safe, within appetite
- AMBER zone: Warning, requires attention (30-day SLA for remediation)
- RED zone: Breach, urgent action required (7-day SLA, Board notification)

MATERIALITY TYPES:
- INTERNAL: Impact on the organization (traditional)
- EXTERNAL: Impact on customers/market (conduct lens)
- DUAL: Both internal and external impact

OUTPUT FORMAT (JSON array, 2-3 metrics):
[
  {
    "metric_name": "Non-Performing Loan Ratio",
    "metric_description": "Percentage of loans in default or near-default",
    "metric_type": "MAXIMUM",
    "unit": "%",
    "materiality_type": "INTERNAL",
    "green_max": 3.0,
    "amber_max": 5.0,
    "red_min": 5.0,
    "green_min": null,
    "amber_min": null,
    "red_max": null
  }
]

Generate tolerance metrics now (JSON only, no explanation):`;

    const text = await callClaude(prompt, apiKey, 2048);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Failed to parse AI response as JSON');
    return JSON.parse(jsonMatch[0]);
}

// 4. Generate Category Statement (with Global Definitions)
async function generateCategoryStatement(riskCategory: string, appetiteLevel: string, organizationName: string, enterpriseMeaning: string, apiKey: string) {
    const prompt = `You are a Chief Risk Officer writing a risk appetite statement for a specific risk category.

CRITICAL INSTRUCTION: You must use the EXACT enterprise meaning provided below. Do NOT redefine or reinterpret what the appetite level means. Your job is to APPLY this meaning to the specific risk category.

ENTERPRISE APPETITE LEVEL DEFINITION (DO NOT CHANGE):
Level: ${appetiteLevel}
Meaning: "${enterpriseMeaning}"

CONTEXT:
- Organization: ${organizationName || 'The organization'}
- Risk Category: ${riskCategory}
- Selected Appetite Level: ${appetiteLevel}

TASK:
Write a 2-3 sentence appetite statement for ${riskCategory} that:
1. States the organization's ${appetiteLevel} appetite for ${riskCategory}
2. APPLIES the enterprise meaning ("${enterpriseMeaning}") specifically to ${riskCategory}
3. Adds 1-2 category-specific examples or controls that align with this appetite level
4. Uses professional Board-level language

EXAMPLE OUTPUT FORMAT:
"${organizationName || 'The organization'} maintains a ${appetiteLevel} appetite for ${riskCategory}. [Apply the meaning to this category]. [Add specific controls or examples]."

Generate the appetite statement now (just the statement text, no explanation):`;

    const text = await callClaude(prompt, apiKey, 512);
    return { text: text.trim() };
}

// 5. Generate Summary Report
async function generateSummaryReport(organizationName: string, categoryStatements: any[], apiKey: string) {
    const categorySummary = categoryStatements.map(c =>
        `- ${c.category}: ${c.level} - "${c.statement}"`
    ).join('\n');

    const levelBreakdown = {
        ZERO: categoryStatements.filter(c => c.level === 'ZERO').map(c => c.category),
        LOW: categoryStatements.filter(c => c.level === 'LOW').map(c => c.category),
        MODERATE: categoryStatements.filter(c => c.level === 'MODERATE').map(c => c.category),
        HIGH: categoryStatements.filter(c => c.level === 'HIGH').map(c => c.category),
    };

    const prompt = `You are a Chief Risk Officer preparing a Risk Appetite Summary Report for Board presentation.

ORGANIZATION: ${organizationName}
DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

CONFIGURED APPETITE LEVELS BY CATEGORY:
${categorySummary}

SUMMARY BY LEVEL:
- Zero Tolerance: ${levelBreakdown.ZERO.length > 0 ? levelBreakdown.ZERO.join(', ') : 'None'}
- Low Appetite: ${levelBreakdown.LOW.length > 0 ? levelBreakdown.LOW.join(', ') : 'None'}
- Moderate Appetite: ${levelBreakdown.MODERATE.length > 0 ? levelBreakdown.MODERATE.join(', ') : 'None'}
- High Appetite: ${levelBreakdown.HIGH.length > 0 ? levelBreakdown.HIGH.join(', ') : 'None'}

TASK:
Generate a comprehensive Risk Appetite Summary Report that:
1. Opens with an executive summary paragraph
2. Groups risks by appetite level with brief explanations
3. Highlights any areas requiring Board attention
4. Uses professional, governance-appropriate language
5. Ends with a recommendation or assurance statement

Format the output with markdown headings (## and ###).
Keep the report concise (400-500 words).

Generate the Risk Appetite Summary Report now:`;

    const text = await callClaude(prompt, apiKey, 1500);
    return { text: text.trim() };
}
