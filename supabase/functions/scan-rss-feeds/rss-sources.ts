/**
 * RSS Feed Sources Configuration
 * Default sources covering Nigerian and global risk events
 *
 * Ported from old MinRisk scan-news.js (lines 24-41)
 */

export interface RSSSource {
  name: string;
  url: string;
  category: 'regulatory' | 'market' | 'business' | 'cybersecurity' | 'environmental';
  country: 'Nigeria' | 'Global';
}

/**
 * Default RSS sources (9 feeds)
 * These cover Nigerian regulatory, business news, and global cybersecurity/environmental threats
 */
export const DEFAULT_RSS_SOURCES: RSSSource[] = [
  // ========== NIGERIA REGULATORY (3 sources) ==========
  {
    name: 'Central Bank of Nigeria',
    url: 'https://www.cbn.gov.ng/rss/news.xml',
    category: 'regulatory',
    country: 'Nigeria'
  },
  {
    name: 'SEC Nigeria',
    url: 'https://sec.gov.ng/feed/',
    category: 'regulatory',
    country: 'Nigeria'
  },
  {
    name: 'FMDQ Group',
    url: 'https://fmdqgroup.com/feed/',
    category: 'market',
    country: 'Nigeria'
  },

  // ========== NIGERIA NEWS (3 sources) ==========
  {
    name: 'BusinessDay Nigeria',
    url: 'https://businessday.ng/feed/',
    category: 'business',
    country: 'Nigeria'
  },
  {
    name: 'The Guardian Nigeria',
    url: 'https://guardian.ng/feed/',
    category: 'business',
    country: 'Nigeria'
  },
  {
    name: 'Premium Times',
    url: 'https://www.premiumtimesng.com/feed',
    category: 'business',
    country: 'Nigeria'
  },

  // ========== GLOBAL CYBERSECURITY (2 sources) ==========
  {
    name: 'US-CERT Alerts',
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    category: 'cybersecurity',
    country: 'Global'
  },
  {
    name: 'SANS ISC',
    url: 'https://isc.sans.edu/rssfeed.xml',
    category: 'cybersecurity',
    country: 'Global'
  },

  // ========== GLOBAL ENVIRONMENTAL (1 source) ==========
  {
    name: 'UN Environment',
    url: 'https://www.unep.org/news-and-stories/rss.xml',
    category: 'environmental',
    country: 'Global'
  },
];

/**
 * Get RSS sources (defaults for now, database lookup in Phase 1.5)
 * @param organizationId - Organization ID (for future database lookup)
 * @returns Array of RSS sources
 */
export async function getRSSSources(organizationId: string): Promise<RSSSource[]> {
  // Phase 1: Return hardcoded defaults
  // Phase 1.5: Load from news_sources table

  console.log(`📡 Using ${DEFAULT_RSS_SOURCES.length} default RSS sources`);
  return DEFAULT_RSS_SOURCES;
}
