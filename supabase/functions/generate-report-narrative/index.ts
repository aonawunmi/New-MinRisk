/**
 * Generate Report Narrative Edge Function
 *
 * AI-powered narrative generation for stakeholder reports
 * Uses Claude to generate executive summaries and recommendations
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { USE_CASE_MODELS } from '../_shared/ai-models.ts';
import { verifyClerkAuth } from '../_shared/clerk-auth.ts';

interface ReportNarrativeRequest {
    reportType: 'ceo' | 'board' | 'regulatory';
    context: {
        totalRisks: number;
        highExtremeCount: number;
        avgResidualScore: number;
        controlEffectiveness: number;
        topRisks: Array<{
            risk_code: string;
            risk_title: string;
            category: string;
            level: string;
        }>;
        periodName: string;
        comparisonPeriodName?: string;
        incidentCount?: number;
        kriBreeches?: number;
    };
    regulator?: 'cbn' | 'sec' | 'pencom';
}

interface ReportNarrativeResponse {
    executiveSummary: string;
    recommendations: string[];
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
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

        const { reportType, context, regulator } = (await req.json()) as ReportNarrativeRequest;

        const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY not configured');
        }

        // Build the prompt based on report type
        let systemPrompt = '';
        let userPrompt = '';

        if (reportType === 'ceo') {
            systemPrompt = `You are a Chief Risk Officer writing an executive risk summary for the CEO. 
Your writing style should be:
- Concise and action-oriented
- Focused on strategic implications
- Clear about what requires executive attention
- Professional but accessible

Generate a brief executive summary (2-3 paragraphs) and 3-5 actionable recommendations.`;

            userPrompt = `Generate an executive risk summary based on these metrics:

Period: ${context.periodName}${context.comparisonPeriodName ? ` (compared to ${context.comparisonPeriodName})` : ''}
Total Active Risks: ${context.totalRisks}
High/Extreme Risks: ${context.highExtremeCount}
Average Residual Risk Score: ${context.avgResidualScore.toFixed(1)}
Control Effectiveness: ${context.controlEffectiveness.toFixed(0)}%

Top Risks:
${context.topRisks.slice(0, 5).map((r, i) => `${i + 1}. ${r.risk_code}: ${r.risk_title} (${r.category}, ${r.level})`).join('\n')}

Respond in JSON format:
{
  "executiveSummary": "...",
  "recommendations": ["...", "...", "..."]
}`;
        } else if (reportType === 'board') {
            systemPrompt = `You are a Chief Risk Officer presenting to the Board Risk Committee.
Your writing style should be:
- Formal and governance-focused
- Comprehensive but structured
- Highlight both achievements and concerns
- Reference risk appetite and tolerance

Generate a detailed executive summary (3-4 paragraphs) and 4-6 recommendations suitable for Board-level discussion.`;

            userPrompt = `Generate a Board Risk Committee summary based on these metrics:

Reporting Period: ${context.periodName}
Total Risks Under Management: ${context.totalRisks}
High/Extreme Priority Risks: ${context.highExtremeCount}
Average Residual Risk Score: ${context.avgResidualScore.toFixed(1)}
Aggregate Control Effectiveness: ${context.controlEffectiveness.toFixed(0)}%
${context.incidentCount !== undefined ? `Incidents This Period: ${context.incidentCount}` : ''}
${context.kriBreeches !== undefined ? `KRI Breaches: ${context.kriBreeches}` : ''}

Top Risks Requiring Board Attention:
${context.topRisks.slice(0, 10).map((r, i) => `${i + 1}. ${r.risk_code}: ${r.risk_title} (${r.category}, ${r.level})`).join('\n')}

Respond in JSON format:
{
  "executiveSummary": "...",
  "recommendations": ["...", "...", "...", "..."]
}`;
        } else {
            // Regulatory report
            const regulatorName = regulator === 'cbn' ? 'Central Bank of Nigeria' :
                regulator === 'sec' ? 'Securities and Exchange Commission' :
                    'National Pension Commission';

            systemPrompt = `You are a compliance officer drafting a risk management report for ${regulatorName}.
Your writing style should be:
- Formal and regulatory-compliant
- Reference applicable guidelines and circulars
- Focus on governance, controls, and oversight
- Demonstrate prudent risk management

Generate a compliance summary (2-3 paragraphs) and note any areas requiring regulatory attention.`;

            userPrompt = `Generate a regulatory compliance summary for ${regulatorName}:

Reporting Period: ${context.periodName}
Risk Register Size: ${context.totalRisks} risks
High Priority Risks: ${context.highExtremeCount}
Control Framework Effectiveness: ${context.controlEffectiveness.toFixed(0)}%

Respond in JSON format:
{
  "executiveSummary": "...",
  "recommendations": ["...", "...", "..."]
}`;
        }

        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: USE_CASE_MODELS.TEXT_REFINEMENT,
                max_tokens: 1500,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', errorText);
            throw new Error(`Claude API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.content?.[0]?.text || '';

        // Parse JSON from response
        let parsed: ReportNarrativeResponse;
        try {
            // Extract JSON from potential markdown code blocks
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch {
            // Fallback if parsing fails
            parsed = {
                executiveSummary: content,
                recommendations: [
                    'Review high-priority risks with management',
                    'Strengthen monitoring of key risk indicators',
                    'Update control procedures as needed',
                ],
            };
        }

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error generating narrative:', error);
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
