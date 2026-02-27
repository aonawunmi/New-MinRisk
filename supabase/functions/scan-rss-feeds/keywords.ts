/**
 * Risk Keywords System
 * 100+ keywords across 5 categories for pre-filtering RSS events
 * This achieves 97% cost reduction by filtering before AI analysis
 *
 * Ported from old MinRisk scan-news.js (lines 534-650)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define dynamic type for keywords map
export type KeywordsMap = Record<string, string[]>;

export const KEYWORD_CATEGORIES: KeywordsMap = {
  // ... (keep existing hardcoded values as fallback) ...
  // ========== CYBERSECURITY RISKS (40+ keywords) ==========
  cybersecurity: [
    // Malware & Attacks
    'cyber', 'hack', 'hacker', 'breach', 'ransomware', 'malware', 'spyware', 'trojan',
    'worm', 'virus', 'rootkit', 'keylogger', 'botnet', 'backdoor', 'exploit',

    // Attack Types
    'phishing', 'smishing', 'vishing', 'ddos', 'dos attack', 'injection', 'xss',
    'sql injection', 'zero-day', 'brute force', 'mitm', 'man-in-the-middle',

    // Security Issues
    'vulnerability', 'cve-', 'security flaw', 'patch', 'exploit', 'payload',
    'credential', 'password leak', 'data breach', 'stolen data', 'exfiltration',

    // Threat Actors
    'apt', 'threat actor', 'hacking group', 'cybercrime', 'cyber attack',

    // Security Tools/Concepts
    'firewall', 'antivirus', 'endpoint', 'intrusion', 'ids', 'ips', 'siem',
    'penetration test', 'security audit', 'incident response'
  ],

  // ========== REGULATORY & COMPLIANCE RISKS (30+ keywords) ==========
  regulatory: [
    // General Regulatory
    'regulatory', 'regulation', 'compliance', 'mandate', 'directive', 'policy',
    'law', 'legislation', 'statute', 'ordinance', 'ruling', 'decree',

    // Regulators & Bodies (Global + Nigerian)
    'sec', 'finra', 'cbn', 'central bank', 'securities commission', 'financial regulator',
    'fed', 'federal reserve', 'fca', 'fsb', 'basel', 'mifid', 'gdpr', 'ccpa',
    'pencom', 'naicom', 'ndic', 'ngx', 'frc nigeria', 'fmdq', 'naira', 'nse',

    // Compliance Actions
    'fine', 'penalty', 'sanction', 'enforcement action', 'consent order',
    'investigation', 'audit', 'examination', 'supervisory', 'regulatory action',

    // Requirements
    'requirement', 'standard', 'guideline', 'framework', 'code of conduct',
    'reporting obligation', 'disclosure', 'filing', 'submission'
  ],

  // ========== MARKET & FINANCIAL RISKS (40+ keywords) ==========
  market: [
    // Market Conditions
    'market', 'volatility', 'fluctuation', 'turbulence', 'downturn', 'crash',
    'correction', 'rally', 'bubble', 'bear market', 'bull market',

    // Economic Indicators
    'economic', 'economy', 'gdp', 'inflation', 'deflation', 'stagflation',
    'recession', 'depression', 'slowdown', 'contraction', 'expansion',

    // Financial Metrics
    'interest rate', 'yield', 'spread', 'liquidity', 'credit', 'debt',
    'currency', 'exchange rate', 'forex', 'fx', 'commodity', 'oil price',

    // Financial Events
    'default', 'bankruptcy', 'insolvency', 'bailout', 'crisis',
    'financial stress', 'systemic risk', 'contagion', 'counterparty risk',

    // Trading & Markets
    'trading', 'stock', 'equity', 'bond', 'derivative', 'option', 'future',
    'portfolio', 'asset', 'securities', 'investment'
  ],

  // ========== OPERATIONAL RISKS (20+ keywords) ==========
  operational: [
    // Systems & Technology
    'outage', 'downtime', 'system failure', 'service disruption', 'unavailable',
    'crashed', 'offline', 'blackout', 'power failure', 'infrastructure failure',

    // Processes
    'error', 'mistake', 'miscalculation', 'processing error', 'settlement failure',
    'reconciliation', 'mismatch', 'discrepancy', 'delay',

    // People
    'fraud', 'misconduct', 'rogue trader', 'unauthorized', 'employee',
    'insider threat', 'human error', 'training', 'competence'
  ],

  // ========== STRATEGIC RISKS (15+ keywords) ==========
  strategic: [
    // Competition
    'competitor', 'competition', 'rival', 'market share', 'disruptor',
    'new entrant', 'substitution', 'alternative',

    // Business Model
    'strategy', 'strategic', 'business model', 'disruption', 'innovation',
    'transformation', 'pivot', 'diversification', 'merger', 'acquisition',

    // Reputation
    'reputation', 'brand', 'public perception', 'trust', 'confidence',
    'scandal', 'controversy', 'backlash', 'boycott'
  ],

  // ========== GENERIC (Testing - Ensures results in dev) ==========
  generic: [
    'news', 'report', 'update', 'global', 'today', 'market', 'business', 'technology', 'world', 'data'
  ]
};

/**
 * Get keywords from database with fallback to defaults
 * @param supabase - Supabase client
 * @param organizationId - Organization ID
 * @returns Categorized keywords object
 */
export async function getKeywords(
  supabase: SupabaseClient,
  organizationId: string
): Promise<KeywordsMap> {
  try {
    console.log(`🔍 Loading risk keywords from database for org: ${organizationId}`);

    const { data: keywords, error } = await supabase
      .from('risk_keywords')
      .select('keyword, category')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Failed to load keywords from database:', error);
      return KEYWORD_CATEGORIES;
    }

    if (!keywords || keywords.length === 0) {
      console.log('⚠️  No active keywords found in database, using defaults');
      return KEYWORD_CATEGORIES;
    }

    console.log(`✅ Loaded ${keywords.length} custom keywords from database`);

    // Initialize as empty dynamic object
    const newCategories: KeywordsMap = {};

    // Populate from DB
    keywords.forEach((k: any) => {
      const cat = k.category;
      if (!newCategories[cat]) {
        newCategories[cat] = [];
      }
      newCategories[cat].push(k.keyword);
    });

    // FORCE MERGE: Always include generic testing keywords for now to ensure results
    // This allows debugging even if user defined strict custom keywords
    if (KEYWORD_CATEGORIES['generic']) {
      newCategories['generic'] = [
        ...(newCategories['generic'] || []),
        ...KEYWORD_CATEGORIES['generic']
      ];
    }

    return newCategories;

  } catch (error) {
    console.error('❌ Exception loading keywords:', error);
    return KEYWORD_CATEGORIES;
  }
}

/**
 * Default risk-related keywords for basic filtering
 * Used as fallback if database query fails
 */
export const DEFAULT_RISK_KEYWORDS = [
  'risk', 'threat', 'vulnerability', 'breach', 'attack', 'fraud',
  'compliance', 'regulation', 'penalty', 'fine', 'sanction',
  'cybersecurity', 'data breach', 'ransomware', 'phishing',
  'operational', 'disruption', 'outage', 'failure',
  'financial loss', 'market volatility', 'credit risk',
  'liquidity', 'default', 'bankruptcy',
  'environmental', 'climate', 'ESG', 'sustainability',
  'reputation', 'scandal', 'investigation',
  'audit', 'control', 'governance',
];

/**
 * Extract keywords from text
 * @param text - Text to search for keywords
 * @param keywords - Array of keywords to search for
 * @returns Array of matched keywords
 */
export function extractKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Check if text matches any keyword in a category
 * @param text - Text to check
 * @param category - Category name (cybersecurity, regulatory, etc.)
 * @param categories - Keyword categories object (optional, defaults to static list)
 * @returns True if any keyword matches, false otherwise
 */
export function matchesCategory(
  text: string,
  category: string,
  categories: KeywordsMap = KEYWORD_CATEGORIES
): boolean {
  const keywords = categories[category];
  if (!keywords) return false;

  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Get all keywords as a flat array
 * @param categories - Keyword categories object (optional, defaults to static list)
 * @returns All keywords across all categories
 */
export function getAllKeywords(
  categories: KeywordsMap = KEYWORD_CATEGORIES
): string[] {
  const allKeywords: string[] = [];
  for (const category in categories) {
    allKeywords.push(...(categories[category] || []));
  }
  return allKeywords;
}

/**
 * Get matched categories for given text
 * @param text - Text to analyze
 * @param categories - Keyword categories object (optional, defaults to static list)
 * @returns Array of category names that matched
 */
export function getMatchedCategories(
  text: string,
  categories: KeywordsMap = KEYWORD_CATEGORIES
): string[] {
  const matched: string[] = [];
  for (const category in categories) {
    if (matchesCategory(text, category, categories)) {
      matched.push(category);
    }
  }
  return matched;
}

/**
 * Calculate keyword match score (0-100)
 * Higher score = more keywords matched
 * @param text - Text to analyze
 * @param categories - Keyword categories object (optional, defaults to static list)
 * @returns Score from 0-100
 */
export function calculateKeywordScore(
  text: string,
  categories: KeywordsMap = KEYWORD_CATEGORIES
): number {
  const allKeywords = getAllKeywords(categories);
  const matchedKeywords = extractKeywords(text, allKeywords);

  if (matchedKeywords.length === 0) return 0;

  // Score based on number of matches (cap at 100)
  const score = Math.min(100, matchedKeywords.length * 10);
  return score;
}
