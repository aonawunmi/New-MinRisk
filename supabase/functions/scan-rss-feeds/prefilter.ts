/**
 * Pre-Filtering Module for RSS Feed Scanner
 * 
 * Layer 1: Intelligent Pre-Filtering
 * Calculates relevance score before sending to AI, reducing API costs by ~70%
 */

import { KeywordsMap, KEYWORD_CATEGORIES } from './keywords.ts';

export interface PreFilterConfig {
    enabled: boolean;
    threshold: number;           // Minimum score to pass to AI (default: 30)
    criticalKeywords: string[];  // Keywords that bypass filter entirely
}

export interface PreFilterResult {
    passed: boolean;
    score: number;
    reasons: string[];
    bypassReason?: string;       // If bypassed, why (e.g., "critical keyword: cyberattack")
}

/**
 * Default configuration - can be overridden by org settings
 */
export const DEFAULT_PREFILTER_CONFIG: PreFilterConfig = {
    enabled: true,
    threshold: 30,  // Conservative starting point
    criticalKeywords: [
        // Cybersecurity
        'cyberattack', 'ransomware', 'data breach', 'hacked',
        // Financial crisis
        'bank failure', 'market crash', 'default', 'bankruptcy',
        // Regulatory
        'SEC action', 'CBN directive', 'regulatory fine', 'sanction',
        // Operational
        'system outage', 'major disruption', 'operational failure'
    ]
};

/**
 * Calculate relevance score for an event based on multiple signals
 * 
 * Score components:
 * - Keyword matches: 10 points per org keyword match
 * - Category overlap: 15 points per category match
 * - Industry relevance: 25 points if matches org industry
 * - Recency: 10 points if < 24 hours old
 * - Source credibility: 5-10 points based on source tier
 * 
 * @param event - The external event to score
 * @param orgKeywords - Organization's risk keywords
 * @param orgCategories - Organization's risk categories
 * @param orgIndustry - Organization's industry type
 * @param config - Pre-filter configuration
 */
export function calculateRelevanceScore(
    event: {
        title: string;
        summary?: string;
        keywords?: string[];
        category?: string;
        published_at?: string;
        source_name?: string;
    },
    orgKeywords: string[],
    orgCategories: string[],
    orgIndustry?: string,
    config: PreFilterConfig = DEFAULT_PREFILTER_CONFIG
): PreFilterResult {
    let score = 0;
    const reasons: string[] = [];
    const eventText = `${event.title} ${event.summary || ''}`.toLowerCase();

    // Check for critical keywords first (bypass filter)
    for (const criticalKeyword of config.criticalKeywords) {
        if (eventText.includes(criticalKeyword.toLowerCase())) {
            return {
                passed: true,
                score: 100,
                reasons: [`Critical keyword bypass: "${criticalKeyword}"`],
                bypassReason: `Critical keyword: ${criticalKeyword}`
            };
        }
    }

    // 1. Keyword matching (10 points each, max 50)
    const keywordMatches: string[] = [];
    for (const keyword of orgKeywords) {
        if (eventText.includes(keyword.toLowerCase())) {
            keywordMatches.push(keyword);
        }
    }
    const keywordScore = Math.min(keywordMatches.length * 10, 50);
    if (keywordScore > 0) {
        score += keywordScore;
        reasons.push(`Keyword matches (${keywordMatches.length}): ${keywordMatches.slice(0, 3).join(', ')}${keywordMatches.length > 3 ? '...' : ''}`);
    }

    // 2. Category overlap (15 points each, max 45)
    const categoryMatches = matchCategories(eventText, orgCategories);
    const categoryScore = Math.min(categoryMatches.length * 15, 45);
    if (categoryScore > 0) {
        score += categoryScore;
        reasons.push(`Category overlap (${categoryMatches.length}): ${categoryMatches.join(', ')}`);
    }

    // 3. Industry relevance (25 points)
    if (orgIndustry && matchesIndustry(eventText, orgIndustry)) {
        score += 25;
        reasons.push(`Industry match: ${orgIndustry}`);
    }

    // 4. Recency bonus (10 points if < 24 hours)
    if (event.published_at) {
        const hoursOld = (Date.now() - new Date(event.published_at).getTime()) / (1000 * 60 * 60);
        if (hoursOld < 24) {
            score += 10;
            reasons.push(`Recent event (${Math.round(hoursOld)}h old)`);
        } else if (hoursOld < 72) {
            score += 5;
            reasons.push(`Moderately recent (${Math.round(hoursOld)}h old)`);
        }
    }

    // 5. Source credibility (5-10 points based on known sources)
    const sourceScore = getSourceCredibilityScore(event.source_name);
    if (sourceScore > 0) {
        score += sourceScore;
        reasons.push(`Source credibility: +${sourceScore}`);
    }

    return {
        passed: score >= config.threshold,
        score,
        reasons
    };
}

/**
 * Match event text against organization's risk categories
 */
function matchCategories(eventText: string, orgCategories: string[]): string[] {
    const matches: string[] = [];

    // Category keyword mappings
    const categoryKeywords: Record<string, string[]> = {
        'cyber': ['cyber', 'hack', 'breach', 'malware', 'ransomware', 'phishing', 'security'],
        'operational': ['operation', 'system', 'outage', 'failure', 'disruption', 'process'],
        'financial': ['financial', 'market', 'trading', 'credit', 'liquidity', 'investment'],
        'regulatory': ['regulat', 'compliance', 'SEC', 'CBN', 'PENCOM', 'penalty', 'fine', 'law'],
        'strategic': ['strategic', 'competition', 'market share', 'innovation', 'business model'],
        'reputational': ['reputation', 'brand', 'scandal', 'controversy', 'public', 'media'],
        'esg': ['environment', 'climate', 'ESG', 'sustainab', 'carbon', 'social', 'governance']
    };

    for (const category of orgCategories) {
        const categoryLower = category.toLowerCase();

        // Direct match
        if (eventText.includes(categoryLower)) {
            matches.push(category);
            continue;
        }

        // Partial match via keywords
        for (const [key, keywords] of Object.entries(categoryKeywords)) {
            if (categoryLower.includes(key)) {
                for (const keyword of keywords) {
                    if (eventText.includes(keyword)) {
                        matches.push(category);
                        break;
                    }
                }
                break;
            }
        }
    }

    return [...new Set(matches)]; // Remove duplicates
}

/**
 * Check if event is relevant to organization's industry
 */
function matchesIndustry(eventText: string, industry: string): boolean {
    const industryKeywords: Record<string, string[]> = {
        'financial_services': ['bank', 'finance', 'investment', 'trading', 'securities', 'insurance'],
        'healthcare': ['health', 'hospital', 'medical', 'pharma', 'patient', 'clinical'],
        'technology': ['tech', 'software', 'IT', 'digital', 'cloud', 'data', 'cyber'],
        'manufacturing': ['manufactur', 'factory', 'production', 'supply chain', 'industrial'],
        'retail': ['retail', 'consumer', 'store', 'shopping', 'e-commerce'],
        'energy': ['energy', 'oil', 'gas', 'power', 'renewable', 'electricity'],
        'government': ['government', 'public sector', 'regulatory', 'policy', 'federal', 'state']
    };

    const keywords = industryKeywords[industry.toLowerCase()] || [];

    for (const keyword of keywords) {
        if (eventText.includes(keyword.toLowerCase())) {
            return true;
        }
    }

    return false;
}

/**
 * Get credibility score based on source name
 */
function getSourceCredibilityScore(sourceName?: string): number {
    if (!sourceName) return 0;

    const sourceNameLower = sourceName.toLowerCase();

    // Tier 1: Major news agencies (10 points)
    const tier1 = ['reuters', 'bloomberg', 'associated press', 'financial times', 'wall street journal'];
    if (tier1.some(s => sourceNameLower.includes(s))) return 10;

    // Tier 2: Reputable business/tech sources (7 points)
    const tier2 = ['bbc', 'cnn', 'cnbc', 'techcrunch', 'the economist', 'forbes'];
    if (tier2.some(s => sourceNameLower.includes(s))) return 7;

    // Tier 3: Regional/specialized sources (5 points)
    const tier3 = ['vanguard', 'punch', 'thisday', 'guardian', 'businessday'];
    if (tier3.some(s => sourceNameLower.includes(s))) return 5;

    return 3; // Default credibility for unknown sources
}

/**
 * Load organization's pre-filter configuration from settings
 */
export async function loadPreFilterConfig(
    supabase: any,
    organizationId: string
): Promise<PreFilterConfig> {
    const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

    if (!org?.settings?.ai_optimization) {
        return DEFAULT_PREFILTER_CONFIG;
    }

    const aiOpt = org.settings.ai_optimization;

    return {
        enabled: aiOpt.enable_prefilter ?? true,
        threshold: aiOpt.prefilter_threshold ?? 30,
        criticalKeywords: aiOpt.critical_keywords ?? DEFAULT_PREFILTER_CONFIG.criticalKeywords
    };
}

/**
 * Load organization's risk keywords from database
 */
export async function loadOrgKeywords(
    supabase: any,
    organizationId: string
): Promise<string[]> {
    const { data } = await supabase
        .from('risk_keywords')
        .select('keyword')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

    return (data || []).map((k: any) => k.keyword.toLowerCase());
}

/**
 * Load organization's risk categories from database
 */
export async function loadOrgCategories(
    supabase: any,
    organizationId: string
): Promise<string[]> {
    const { data } = await supabase
        .from('risk_categories')
        .select('name')
        .eq('organization_id', organizationId);

    return (data || []).map((c: any) => c.name);
}

/**
 * Load organization's industry type
 */
export async function loadOrgIndustry(
    supabase: any,
    organizationId: string
): Promise<string | undefined> {
    const { data } = await supabase
        .from('organizations')
        .select('industry_type')
        .eq('id', organizationId)
        .single();

    return data?.industry_type;
}
