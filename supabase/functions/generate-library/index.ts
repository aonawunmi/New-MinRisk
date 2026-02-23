// Supabase Edge Function for AI-powered library generation
// Uses Claude to match custom taxonomy categories to seed library data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { verifyClerkAuth } from '../_shared/clerk-auth.ts'
import { USE_CASE_MODELS } from '../_shared/ai-models.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MatchRequest {
    categories: string[];       // User's taxonomy categories
    industryType: string;       // User's industry
    libraryType: 'root_cause' | 'impact' | 'control' | 'kri' | 'kci';
}

interface CategoryMatchResult {
    category: string;
    matchedDomains: string[];
    confidence: number;
}

// Use Claude to find semantic matches for custom category names
async function matchCategoryWithAI(
    category: string,
    availableDomains: string[],
    claudeApiKey: string
): Promise<CategoryMatchResult> {
    const prompt = `You are a risk management expert. Given a custom risk category name, identify which standard risk domains it relates to.

Category: "${category}"

Available standard domains:
${availableDomains.map(d => `- ${d}`).join('\n')}

Return a JSON object with:
- matchedDomains: array of matching domain names from the list above (be generous, include partial matches)
- confidence: number 0-100 indicating match confidence

Only return the JSON object, no explanations.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: USE_CASE_MODELS.LIBRARY_GENERATION,
                max_tokens: 500,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '{}';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                category,
                matchedDomains: result.matchedDomains || [],
                confidence: result.confidence || 50
            };
        }

        return { category, matchedDomains: [], confidence: 0 };
    } catch (error) {
        console.error('AI matching error:', error);
        return { category, matchedDomains: [], confidence: 0 };
    }
}

// Generate custom library items for categories with no matches
async function generateCustomItems(
    category: string,
    libraryType: string,
    industryType: string,
    claudeApiKey: string
): Promise<any[]> {
    const typePrompts: Record<string, string> = {
        root_cause: `Generate 3-5 root causes for the "${category}" risk category in the ${industryType} industry.
Return a JSON array with objects containing: code, name, description, severity_indicator (Low/Medium/High/Critical)`,
        impact: `Generate 3-5 potential impacts for the "${category}" risk category in the ${industryType} industry.
Return a JSON array with objects containing: code, name, description, severity_level (Minor/Moderate/Major/Severe/Catastrophic), impact_type (operational/financial/reputational/legal/strategic)`,
        control: `Generate 3-5 controls for the "${category}" risk category in the ${industryType} industry.
Return a JSON array with objects containing: code, name, description, control_type (preventive/detective/corrective), automation_level (Manual/Semi-Automated/Fully-Automated)`,
        kri: `Generate 2-3 Key Risk Indicators (KRIs) for the "${category}" risk category in the ${industryType} industry.
Return a JSON array with objects containing: code, name, description, measurement_unit, frequency (Daily/Weekly/Monthly/Quarterly), warning_threshold, critical_threshold`,
        kci: `Generate 2-3 Key Control Indicators (KCIs) for the "${category}" risk category in the ${industryType} industry.
Return a JSON array with objects containing: code, name, description, measurement_unit, frequency (Daily/Weekly/Monthly/Quarterly), target_value`
    };

    const prompt = `You are a risk management expert. ${typePrompts[libraryType] || typePrompts.root_cause}

Requirements:
- Use codes like AI-${libraryType.toUpperCase().substring(0, 2)}-001, AI-${libraryType.toUpperCase().substring(0, 2)}-002, etc.
- Be specific and actionable
- Only return the JSON array, no explanations`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: USE_CASE_MODELS.LIBRARY_GENERATION,
                max_tokens: 1500,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '[]';

        // Parse JSON array from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]);
            // Mark as AI-generated
            return items.map((item: any) => ({
                ...item,
                ai_generated: true,
                category: category
            }));
        }

        return [];
    } catch (error) {
        console.error('AI generation error:', error);
        return [];
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Authenticate user via Clerk
        let profile, supabaseClient, supabaseAdmin;
        try {
            ({ profile, supabaseClient, supabaseAdmin } = await verifyClerkAuth(req));
        } catch (authError) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!claudeApiKey) {
            throw new Error('ANTHROPIC_API_KEY not configured');
        }

        const { action, ...params } = await req.json();

        if (action === 'match_categories') {
            // Match custom categories to standard domains
            const { categories, availableDomains } = params;

            const results: CategoryMatchResult[] = [];
            for (const category of categories) {
                const match = await matchCategoryWithAI(category, availableDomains, claudeApiKey);
                results.push(match);
            }

            return new Response(
                JSON.stringify({ success: true, matches: results }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (action === 'generate_items') {
            // Generate custom items for a category
            const { category, libraryType, industryType } = params;

            const items = await generateCustomItems(category, libraryType, industryType, claudeApiKey);

            return new Response(
                JSON.stringify({ success: true, items }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error: any) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
