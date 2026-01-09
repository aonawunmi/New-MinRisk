/**
 * Intelligence Analysis Cache Module
 * 
 * Layer 4: Cross-Organization Cache
 * Caches AI analysis at event level to share across organizations
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CachedAnalysis {
    generalAnalysis: {
        summary: string;
        keyThemes: string[];
        riskDomains: string[];
    };
    categoryMappings: Record<string, number>;  // category -> relevance score (0-100)
    suggestedImpactLevel: 'low' | 'medium' | 'high' | 'critical';
    confidenceScore: number;
}

/**
 * Create a hash key for an event
 */
export function createEventHash(title: string, sourceUrl?: string): string {
    const normalizedTitle = title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Simple hash - combine title with source for uniqueness
    const input = `${normalizedTitle}|${sourceUrl || ''}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Check if we have a cached analysis for this event
 */
export async function getCachedAnalysis(
    supabase: any,
    eventHash: string
): Promise<CachedAnalysis | null> {
    const { data, error } = await supabase
        .from('intelligence_analysis_cache')
        .select('*')
        .eq('event_hash', eventHash)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !data) {
        return null;
    }

    // Update hit count
    await supabase
        .from('intelligence_analysis_cache')
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
 * Store analysis in cache for future use
 */
export async function cacheAnalysis(
    supabase: any,
    eventHash: string,
    eventTitle: string,
    eventSource: string | undefined,
    analysis: CachedAnalysis,
    tokensUsed?: number,
    modelVersion?: string,
    originalEventId?: string
): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await supabase.from('intelligence_analysis_cache').upsert({
        event_hash: eventHash,
        event_title: eventTitle,
        event_source: eventSource,
        general_analysis: analysis.generalAnalysis,
        risk_category_mappings: analysis.categoryMappings,
        suggested_impact_level: analysis.suggestedImpactLevel,
        confidence_score: analysis.confidenceScore,
        tokens_used: tokensUsed,
        model_version: modelVersion,
        original_event_id: originalEventId,
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        orgs_using: 1
    }, {
        onConflict: 'event_hash'
    });
}

/**
 * Map cached category analysis to organization's specific risks
 * 
 * Takes the generic category mappings from cache and matches
 * them to the organization's actual risk register
 */
export function mapCacheToOrgRisks(
    cachedAnalysis: CachedAnalysis,
    orgRisks: Array<{
        risk_code: string;
        category: string;
        risk_title: string;
    }>
): {
    relevant: boolean;
    confidence: number;
    risk_codes: string[];
    reasoning: string;
    likelihood_change: number;
} {
    const matchedRisks: string[] = [];
    let highestRelevance = 0;

    // Map cached category scores to org's risks
    for (const risk of orgRisks) {
        const categoryLower = risk.category?.toLowerCase() || '';

        // Check if any cached category mapping matches this risk's category
        for (const [cachedCategory, relevanceScore] of Object.entries(cachedAnalysis.categoryMappings)) {
            const cachedCategoryLower = cachedCategory.toLowerCase();

            // Fuzzy match categories
            if (categoryLower.includes(cachedCategoryLower) ||
                cachedCategoryLower.includes(categoryLower) ||
                categoriesAreSimilar(categoryLower, cachedCategoryLower)) {
                if (relevanceScore >= 50) {  // Only match if relevance is significant
                    matchedRisks.push(risk.risk_code);
                    highestRelevance = Math.max(highestRelevance, relevanceScore);
                }
            }
        }
    }

    // Determine likelihood change based on impact level
    const impactToChange: Record<string, number> = {
        'critical': 2,
        'high': 1,
        'medium': 0,
        'low': 0
    };

    return {
        relevant: matchedRisks.length > 0,
        confidence: highestRelevance / 100,
        risk_codes: [...new Set(matchedRisks)],  // Remove duplicates
        reasoning: `Matched via cached analysis: ${cachedAnalysis.generalAnalysis.summary}`,
        likelihood_change: impactToChange[cachedAnalysis.suggestedImpactLevel] || 0
    };
}

/**
 * Check if two category names are semantically similar
 */
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
    // Extract or infer category mappings
    const categoryMappings: Record<string, number> = aiResponse.categories || {};

    // If no explicit categories, try to infer from risk_codes reasoning
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
