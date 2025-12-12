/**
 * RSS Feed Sources Configuration
 * Now loading from database (rss_sources table)
 *
 * Ported from old MinRisk scan-news.js (lines 24-41)
 * Upgraded to use database sources
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RSSSource {
  id?: string; // Database ID (optional for backward compatibility)
  name: string;
  url: string;
  category: 'regulatory' | 'market' | 'business' | 'cybersecurity' | 'environmental' | 'geopolitical' | 'operational' | 'social' | 'technology' | 'other';
  country?: 'Nigeria' | 'Global'; // Optional for backward compatibility
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
 * Get RSS sources from database (with fallback to defaults)
 * @param supabase - Supabase client
 * @param organizationId - Organization ID
 * @returns Array of active RSS sources
 */
export async function getRSSSources(
  supabase: SupabaseClient,
  organizationId: string
): Promise<RSSSource[]> {
  try {
    console.log(`📡 Loading RSS sources from database for org: ${organizationId}`);

    // Query active RSS sources for this organization
    const { data: sources, error } = await supabase
      .from('rss_sources')
      .select('id, name, url, category')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to load RSS sources from database:', error);
      console.log('⚠️  Falling back to default sources');
      return DEFAULT_RSS_SOURCES;
    }

    if (!sources || sources.length === 0) {
      console.log('⚠️  No active RSS sources found in database, using defaults');
      return DEFAULT_RSS_SOURCES;
    }

    console.log(`✅ Loaded ${sources.length} active RSS sources from database`);

    // Map database sources to RSSSource format
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      category: source.category as RSSSource['category'],
    }));
  } catch (error) {
    console.error('❌ Exception loading RSS sources:', error);
    console.log('⚠️  Falling back to default sources');
    return DEFAULT_RSS_SOURCES;
  }
}

/**
 * Update scan statistics for an RSS source
 * @param supabase - Supabase client
 * @param sourceId - RSS source ID
 * @param status - Scan status ('success' or 'failed')
 * @param eventsCount - Number of events fetched (0 if failed)
 * @param error - Error message (if failed)
 */
export async function updateScanStats(
  supabase: SupabaseClient,
  sourceId: string,
  status: 'success' | 'failed',
  eventsCount: number = 0,
  error: string | null = null
): Promise<void> {
  try {
    // Get current events_count to increment
    const { data: currentSource } = await supabase
      .from('rss_sources')
      .select('events_count')
      .eq('id', sourceId)
      .single();

    const newEventsCount = (currentSource?.events_count || 0) + eventsCount;

    // Update scan statistics
    const { error: updateError } = await supabase
      .from('rss_sources')
      .update({
        last_scanned_at: new Date().toISOString(),
        last_scan_status: status,
        last_scan_error: error,
        events_count: newEventsCount,
      })
      .eq('id', sourceId);

    if (updateError) {
      console.error(`❌ Failed to update scan stats for source ${sourceId}:`, updateError);
    } else {
      console.log(`  ✅ Updated scan stats: ${status}, ${eventsCount} events`);
    }
  } catch (err) {
    console.error(`❌ Exception updating scan stats for source ${sourceId}:`, err);
  }
}
