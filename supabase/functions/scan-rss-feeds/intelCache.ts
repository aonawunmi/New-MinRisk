/**
 * Two-Layer Intelligence Cache Module
 *
 * Layer 1 (SHARED): industry_event_cache — event detection + categorization, shared by institution type
 * Layer 2 (PRIVATE): org_analysis_cache — risk-specific analysis, private per organization
 *
 * Updated: 2026-02-19 (Intelligence Redesign)
 */

export interface CachedAnalysis {
    generalAnalysis: {
        summary: string;
        keyThemes: string[];
        riskDomains: string[];
    };
    categoryMappings: Record<string, number>;
    suggestedImpactLevel: 'low' | 'medium' | 'high' | 'critical';
    confidenceScore: number;
}

// ─── Hashing ───────────────────────────────────────────────────────

export function createEventHash(title: string, sourceUrl?: string): string {
    const normalizedTitle = title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const input = `${normalizedTitle}|${sourceUrl || ''}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

// ─── Layer 1: Industry Event Cache (SHARED by institution type) ────

/**
 * Check industry-level event cache scoped by institution type
 */
export async function checkIndustryCache(
    supabase: any,
    eventHash: string,
    institutionTypeId?: string
): Promise<CachedAnalysis | null> {
    let query = supabase
        .from('industry_event_cache')
        .select('*')
        .eq('event_hash', eventHash)
        .gt('expires_at', new Date().toISOString());

    if (institutionTypeId) {
        query = query.eq('institution_type_id', institutionTypeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;

    // Update hit count
    await supabase
        .from('industry_event_cache')
        .update({
            hit_count: (data.hit_count || 0) + 1,
            orgs_using: (data.orgs_using || 0) + 1
        })
        .eq('id', data.id);

    return {
        generalAnalysis: data.general_analysis,
        categoryMappings: data.risk_category_mappings,
        suggestedImpactLevel: data.suggested_impact_level,
        confidenceScore: data.confidence_score
    };
}

/**
 * Store event categorization in industry-level cache
 */
export async function storeIndustryCache(
    supabase: any,
    eventHash: string,
    eventTitle: string,
    eventSource: string | undefined,
    analysis: CachedAnalysis,
    institutionTypeId?: string,
    tokensUsed?: number,
    modelVersion?: string,
    originalEventId?: string
): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await supabase.from('industry_event_cache').upsert({
        event_hash: eventHash,
        event_title: eventTitle,
        event_source: eventSource,
        general_analysis: analysis.generalAnalysis,
        risk_category_mappings: analysis.categoryMappings,
        suggested_impact_level: analysis.suggestedImpactLevel,
        confidence_score: analysis.confidenceScore,
        institution_type_id: institutionTypeId || null,
        tokens_used: tokensUsed,
        model_version: modelVersion,
        original_event_id: originalEventId,
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        orgs_using: 1
    }, {
        // Use the new composite unique index
        ignoreDuplicates: true
    });
}

// ─── Layer 2: Org Analysis Cache (PRIVATE per org) ─────────────────

/**
 * Check org-specific analysis cache for a particular event + risk
 */
export async function checkOrgAnalysisCache(
    supabase: any,
    eventId: string,
    organizationId: string,
    riskCode: string
): Promise<any | null> {
    const { data } = await supabase
        .from('org_analysis_cache')
        .select('*')
        .eq('event_id', eventId)
        .eq('organization_id', organizationId)
        .eq('risk_code', riskCode)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    return data;
}

/**
 * Store org-specific analysis in private cache
 */
export async function storeOrgAnalysisCache(
    supabase: any,
    eventId: string,
    organizationId: string,
    riskCode: string,
    analysis: any,
    modelUsed?: string,
    tokensUsed?: number
): Promise<void> {
    await supabase
        .from('org_analysis_cache')
        .upsert({
            event_id: eventId,
            organization_id: organizationId,
            risk_code: riskCode,
            analysis_result: analysis,
            likelihood_change: analysis.likelihood_change || 0,
            impact_change: analysis.impact_change || 0,
            confidence: (analysis.confidence || 70) / 100,
            suggested_controls: analysis.suggested_controls || [],
            reasoning: analysis.reasoning || '',
            model_used: modelUsed,
            tokens_used: tokensUsed,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'event_id,organization_id,risk_code' });
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Map cached category analysis to organization's specific risks
 */
export function mapCacheToOrgRisks(
    cachedAnalysis: CachedAnalysis,
    orgRisks: Array<{ risk_code: string; category: string; risk_title: string }>
): {
    relevant: boolean;
    confidence: number;
    risk_codes: string[];
    reasoning: string;
    likelihood_change: number;
} {
    const matchedRisks: string[] = [];
    let highestRelevance = 0;

    for (const risk of orgRisks) {
        const categoryLower = risk.category?.toLowerCase() || '';

        for (const [cachedCategory, relevanceScore] of Object.entries(cachedAnalysis.categoryMappings)) {
            const cachedCategoryLower = cachedCategory.toLowerCase();

            if (categoryLower.includes(cachedCategoryLower) ||
                cachedCategoryLower.includes(categoryLower) ||
                categoriesAreSimilar(categoryLower, cachedCategoryLower)) {
                if (relevanceScore >= 50) {
                    matchedRisks.push(risk.risk_code);
                    highestRelevance = Math.max(highestRelevance, relevanceScore);
                }
            }
        }
    }

    const impactToChange: Record<string, number> = {
        'critical': 2, 'high': 1, 'medium': 0, 'low': 0
    };

    return {
        relevant: matchedRisks.length > 0,
        confidence: highestRelevance / 100,
        risk_codes: [...new Set(matchedRisks)],
        reasoning: `Matched via cached analysis: ${cachedAnalysis.generalAnalysis.summary}`,
        likelihood_change: impactToChange[cachedAnalysis.suggestedImpactLevel] || 0
    };
}

function categoriesAreSimilar(cat1: string, cat2: string): boolean {
    const synonyms: Record<string, string[]> = {
        'cyber': ['it', 'technology', 'digital', 'information security', 'infosec'],
        'operational': ['operations', 'process', 'business continuity'],
        'financial': ['market', 'credit', 'liquidity', 'investment'],
        'regulatory': ['compliance', 'legal', 'governance'],
        'strategic': ['business', 'competitive'],
        'reputational': ['brand', 'public relations']
    };

    for (const [key, similar] of Object.entries(synonyms)) {
        const allTerms = [key, ...similar];
        const cat1Match = allTerms.some(t => cat1.includes(t));
        const cat2Match = allTerms.some(t => cat2.includes(t));
        if (cat1Match && cat2Match) return true;
    }

    return false;
}

/**
 * Parse AI analysis output into cacheable format
 */
export function parseAnalysisForCache(
    aiResponse: {
        relevant?: boolean;
        confidence?: number;
        risk_codes?: string[];
        reasoning?: string;
        likelihood_change?: number;
        categories?: Record<string, number>;
        impact_level?: string;
        summary?: string;
        themes?: string[];
        domains?: string[];
    },
    eventTitle: string
): CachedAnalysis {
    const categoryMappings: Record<string, number> = aiResponse.categories || {};

    if (Object.keys(categoryMappings).length === 0 && aiResponse.reasoning) {
        const domains = ['cyber', 'operational', 'financial', 'regulatory', 'strategic'];
        for (const domain of domains) {
            if (aiResponse.reasoning.toLowerCase().includes(domain)) {
                categoryMappings[domain] = (aiResponse.confidence || 0.5) * 100;
            }
        }
    }

    return {
        generalAnalysis: {
            summary: aiResponse.summary || aiResponse.reasoning || eventTitle,
            keyThemes: aiResponse.themes || [],
            riskDomains: aiResponse.domains || Object.keys(categoryMappings)
        },
        categoryMappings,
        suggestedImpactLevel: (aiResponse.impact_level as any) ||
            (aiResponse.likelihood_change && aiResponse.likelihood_change >= 2 ? 'critical' :
                aiResponse.likelihood_change && aiResponse.likelihood_change >= 1 ? 'high' : 'medium'),
        confidenceScore: aiResponse.confidence || 0.5
    };
}
