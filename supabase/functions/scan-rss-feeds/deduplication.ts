/**
 * Deduplication Module for RSS Feed Scanner
 * 
 * Layer 2: Event Deduplication
 * Prevents analyzing the same news from multiple sources
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Tokenize a title into normalized words for Jaccard similarity
 */
export function tokenizeTitle(title: string): string[] {
    if (!title) return [];
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')  // Remove punctuation
        .split(/\s+/)              // Split on whitespace
        .filter(word => word.length > 2)  // Remove short words
        .filter(word => !STOP_WORDS.has(word));  // Remove stop words
}

/**
 * Common stop words to ignore in similarity comparison
 */
const STOP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'were', 'will',
    'more', 'when', 'who', 'may', 'says', 'said', 'from', 'with', 'this',
    'that', 'their', 'what', 'would', 'about', 'which', 'could', 'into'
]);

/**
 * Calculate Jaccard similarity between two word sets
 * Returns a value between 0 (no overlap) and 1 (identical)
 */
export function jaccardSimilarity(words1: string[], words2: string[]): number {
    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    // Calculate intersection
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    // Calculate union
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
}

/**
 * Create a hash of the title for fast lookup
 */
export function hashTitle(title: string): string {
    const words = tokenizeTitle(title).sort().join('|');
    // Simple hash - in production you might use crypto.subtle
    let hash = 0;
    for (let i = 0; i < words.length; i++) {
        const char = words.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
}

/**
 * Check if an event is a duplicate of recently seen events
 * 
 * @param supabase - Supabase client
 * @param title - Event title to check
 * @param sourceDomain - Source domain (events from same domain are always checked)
 * @param similarityThreshold - Minimum Jaccard similarity to consider duplicate (default 0.7)
 * @returns Object with isDuplicate flag and matched event ID if found
 */
export async function checkDuplicate(
    supabase: any,
    title: string,
    sourceDomain: string,
    similarityThreshold: number = 0.7
): Promise<{ isDuplicate: boolean; matchedEventId?: string; similarity?: number }> {
    const titleWords = tokenizeTitle(title);
    const titleHash = hashTitle(title);

    // Quick check: exact hash match
    const { data: exactMatch } = await supabase
        .from('event_dedup_index')
        .select('external_event_id')
        .eq('title_hash', titleHash)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

    if (exactMatch && exactMatch.length > 0) {
        return { isDuplicate: true, matchedEventId: exactMatch[0].external_event_id, similarity: 1.0 };
    }

    // Fuzzy check: Jaccard similarity against recent events
    // Only check events from the last 7 days
    const { data: recentEvents } = await supabase
        .from('event_dedup_index')
        .select('external_event_id, title_words')
        .gt('expires_at', new Date().toISOString())
        .limit(100);  // Limit to prevent performance issues

    if (!recentEvents || recentEvents.length === 0) {
        return { isDuplicate: false };
    }

    for (const event of recentEvents) {
        if (!event.title_words || !Array.isArray(event.title_words)) continue;

        const similarity = jaccardSimilarity(titleWords, event.title_words);
        if (similarity >= similarityThreshold) {
            return {
                isDuplicate: true,
                matchedEventId: event.external_event_id,
                similarity
            };
        }
    }

    return { isDuplicate: false };
}

/**
 * Add an event to the deduplication index
 */
export async function addToDedupIndex(
    supabase: any,
    eventId: string,
    title: string,
    sourceDomain: string
): Promise<void> {
    const titleWords = tokenizeTitle(title);
    const titleHash = hashTitle(title);

    await supabase.from('event_dedup_index').upsert({
        title_hash: titleHash,
        title_words: titleWords,
        source_domain: sourceDomain,
        external_event_id: eventId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()  // 7 days
    }, {
        onConflict: 'title_hash'
    });
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}
