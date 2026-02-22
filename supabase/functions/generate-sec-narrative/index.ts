/**
 * Generate SEC Narrative Edge Function
 *
 * Generates AI draft narrative commentary for a specific SEC risk category
 * within a quarterly Risk Profile Report submission.
 *
 * The AI acts as a Chief Risk Officer drafting quarterly commentary for the
 * SEC Nigeria, analyzing the organization's risk data, trends, incidents,
 * and control effectiveness for the specified category.
 *
 * Uses Haiku model for cost efficiency (~$0.004 per category, ~$0.02 per full submission).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { AI_MODELS } from '../_shared/ai-models.ts';
import { verifyClerkAuth } from '../_shared/clerk-auth.ts';

interface SecNarrativeRequest {
  organization_id: string;
  sec_category_code: string;     // 'STRATEGIC' | 'MARKET' | 'REGULATORY' | 'OPERATIONAL' | 'IT_CYBER'
  period: string;                // e.g., 'Q1 2026'
  previous_period?: string;      // e.g., 'Q4 2025'
}

interface SecNarrativeResponse {
  narrative: string;
  key_observations: string[];
  risk_trend: 'improving' | 'stable' | 'deteriorating';
}

// SEC category descriptions for better AI context
const SEC_CATEGORY_CONTEXT: Record<string, string> = {
  STRATEGIC: 'Strategic Risk covers risks related to business strategy, competitive positioning, market direction, investment decisions, and long-term viability of the organization.',
  MARKET: 'Market Risk covers risks from financial market movements including interest rate, foreign exchange, equity, commodity price risks, and credit/counterparty exposure.',
  REGULATORY: 'Regulatory Risk covers risks from non-compliance with laws, regulations, SEC guidelines, licensing requirements, reporting obligations, and changes in regulatory environment.',
  OPERATIONAL: 'Operational Risk covers risks from inadequate or failed internal processes, people, systems, or external events including fraud, business continuity, and third-party risks.',
  IT_CYBER: 'IT/Cyber Risk covers risks from information technology systems, cybersecurity threats, data breaches, system failures, technology obsolescence, and digital infrastructure vulnerabilities.',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify Clerk authentication
    let profile, supabaseClient, supabaseAdmin;
    try {
      ({ profile, supabaseClient, supabaseAdmin } = await verifyClerkAuth(req));
    } catch (authError) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request
    const body = (await req.json()) as SecNarrativeRequest;
    const { organization_id, sec_category_code, period, previous_period } = body;

    if (!organization_id || !sec_category_code || !period) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id, sec_category_code, period' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify user belongs to this organization
    if (profile.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: organization mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Get API key
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // 5. Fetch risk data for this SEC category using admin client
    // Get the SEC category mapping for this org
    const { data: secCategory } = await supabaseAdmin
      .from('sec_standard_categories')
      .select('id, code, name')
      .eq('code', sec_category_code)
      .single();

    if (!secCategory) {
      return new Response(
        JSON.stringify({ error: `SEC category not found: ${sec_category_code}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all internal categories mapped to this SEC category
    const { data: mappings } = await supabaseAdmin
      .from('sec_category_mappings')
      .select('internal_category_name')
      .eq('organization_id', organization_id)
      .eq('sec_category_id', secCategory.id);

    const mappedCategoryNames = (mappings || []).map((m: any) => m.internal_category_name);

    // If no mappings, use a fallback approach based on the SEC category code
    let categoryFilter: string[];
    if (mappedCategoryNames.length > 0) {
      categoryFilter = mappedCategoryNames;
    } else {
      // Default fallback keywords per SEC category
      const defaults: Record<string, string[]> = {
        STRATEGIC: ['Strategic'],
        MARKET: ['Market', 'Credit', 'Financial', 'Liquidity'],
        REGULATORY: ['Compliance', 'Legal', 'Regulatory'],
        OPERATIONAL: ['Operational', 'Process', 'Fraud', 'Human'],
        IT_CYBER: ['Technology', 'Cyber', 'IT', 'Information'],
      };
      categoryFilter = defaults[sec_category_code] || ['Operational'];
    }

    // Fetch risks matching these categories
    let risksQuery = supabaseAdmin
      .from('risks')
      .select('risk_code, risk_title, category, description, likelihood_inherent, impact_inherent, likelihood_residual, impact_residual, status, risk_level')
      .eq('organization_id', organization_id)
      .in('status', ['OPEN', 'MONITORING', 'MITIGATING']);

    // Filter by mapped categories
    if (categoryFilter.length > 0) {
      risksQuery = risksQuery.in('category', categoryFilter);
    }

    const { data: risks } = await risksQuery;
    const currentRisks = risks || [];

    // 6. Fetch recent incidents related to these categories
    const { data: incidents } = await supabaseAdmin
      .from('incidents')
      .select('incident_code, title, severity, financial_impact, incident_date, incident_status')
      .eq('organization_id', organization_id)
      .eq('incident_status', 'ACTIVE')
      .order('incident_date', { ascending: false })
      .limit(10);

    // 7. Get organization info
    const { data: orgInfo } = await supabaseAdmin
      .from('organizations')
      .select('name, institution_type')
      .eq('id', organization_id)
      .single();

    // 8. Calculate risk statistics
    const totalRisks = currentRisks.length;
    const criticalRisks = currentRisks.filter(r => {
      const rating = (r.likelihood_inherent || 1) * (r.impact_inherent || 1);
      return rating >= 16;
    });
    const highRisks = currentRisks.filter(r => {
      const rating = (r.likelihood_inherent || 1) * (r.impact_inherent || 1);
      return rating >= 12 && rating < 16;
    });
    const avgRating = totalRisks > 0
      ? currentRisks.reduce((sum, r) => sum + (r.likelihood_inherent || 1) * (r.impact_inherent || 1), 0) / totalRisks
      : 0;

    // Build risk summary text
    const riskSummaryLines = currentRisks
      .sort((a, b) => {
        const ratingA = (a.likelihood_inherent || 1) * (a.impact_inherent || 1);
        const ratingB = (b.likelihood_inherent || 1) * (b.impact_inherent || 1);
        return ratingB - ratingA;
      })
      .slice(0, 10)
      .map((r, i) => {
        const rating = (r.likelihood_inherent || 1) * (r.impact_inherent || 1);
        return `${i + 1}. ${r.risk_code}: ${r.risk_title} (L=${r.likelihood_inherent}, I=${r.impact_inherent}, Rating=${rating.toFixed(1)}, Status: ${r.status})`;
      })
      .join('\n');

    // Build incident summary
    const incidentSummary = (incidents || []).length > 0
      ? (incidents || []).slice(0, 5).map((inc: any, i: number) =>
          `${i + 1}. ${inc.incident_code}: ${inc.title} (Severity: ${inc.severity}${inc.financial_impact ? `, Impact: $${inc.financial_impact}` : ''})`
        ).join('\n')
      : 'No recent incidents reported.';

    // 9. Build AI prompt
    const categoryContext = SEC_CATEGORY_CONTEXT[sec_category_code] || '';

    const systemPrompt = `You are a Chief Risk Officer at ${orgInfo?.name || 'a Capital Market Operator'} (${orgInfo?.institution_type || 'CMO'}) in Nigeria, drafting quarterly risk commentary for the Securities and Exchange Commission (SEC) of Nigeria.

Your task is to write professional, factual commentary for the "${secCategory.name}" section of the quarterly Risk Profile Report.

GUIDELINES:
- Write in third person (e.g., "The organization..." or "Management...")
- Be specific and reference actual risk data provided
- Note trends (improving, stable, or deteriorating)
- Mention key mitigation actions and their effectiveness
- Keep the tone professional, measured, and regulatory-appropriate
- Length: 3-5 paragraphs, approximately 200-400 words
- Do NOT make up specific numbers or risks not provided in the data
- If risk data is limited, acknowledge it professionally

${categoryContext}

Respond in JSON format:
{
  "narrative": "The full narrative text...",
  "key_observations": ["observation 1", "observation 2", "observation 3"],
  "risk_trend": "improving" | "stable" | "deteriorating"
}`;

    const userPrompt = `Generate the ${secCategory.name} narrative for ${period} quarterly submission.

RISK DATA SUMMARY:
- Total risks in this category: ${totalRisks}
- Critical risks (rating >= 16): ${criticalRisks.length}
- High risks (rating 12-15): ${highRisks.length}
- Average risk rating: ${avgRating.toFixed(1)}

TOP RISKS (sorted by rating):
${riskSummaryLines || 'No risks currently assigned to this category.'}

RECENT INCIDENTS:
${incidentSummary}

PERIOD: ${period}
${previous_period ? `PREVIOUS PERIOD: ${previous_period}` : 'No previous period data available for comparison.'}

Please generate the narrative commentary.`;

    // 10. Call Claude API
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODELS.HAIKU,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.content?.[0]?.text || '';

    // 11. Parse response
    let parsed: SecNarrativeResponse;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }

      // Validate required fields
      if (!parsed.narrative || !parsed.key_observations || !parsed.risk_trend) {
        throw new Error('Missing required fields in AI response');
      }

      // Normalize risk_trend
      if (!['improving', 'stable', 'deteriorating'].includes(parsed.risk_trend)) {
        parsed.risk_trend = 'stable';
      }
    } catch {
      // Fallback if parsing fails — use raw text as narrative
      parsed = {
        narrative: content.replace(/```json|```/g, '').trim(),
        key_observations: [
          `${totalRisks} risks identified in ${secCategory.name}`,
          criticalRisks.length > 0
            ? `${criticalRisks.length} critical risk(s) require immediate attention`
            : 'No critical risks identified',
          `Average risk rating: ${avgRating.toFixed(1)}`,
        ],
        risk_trend: avgRating >= 12 ? 'deteriorating' : avgRating >= 6 ? 'stable' : 'improving',
      };
    }

    console.log(`Generated SEC narrative for ${secCategory.name} (${organization_id}): ${parsed.narrative.length} chars`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating SEC narrative:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
