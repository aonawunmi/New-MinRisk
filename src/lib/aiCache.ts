/**
 * AI Response Caching Utility
 * 
 * Provides selective caching for expensive AI operations:
 * - Library Generation (30-day TTL)
 * - Control Suggestions (7-day TTL)
 *
 * NOT cached (too personalized):
 * - Statement Refinement
 * - AI Risk Generation
 */

import { supabase } from './supabase';
import crypto from 'crypto';

export interface CacheConfig {
    feature: 'library_generation' | 'control_suggestion';
    ttlDays: number;
    organizationScoped: boolean;  // If true, cache is per-org
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
    library_generation: {
        feature: 'library_generation',
        ttlDays: 30,
        organizationScoped: false  // Industry-based, can share across orgs
    },
    control_suggestion: {
        feature: 'control_suggestion',
        ttlDays: 7,
        organizationScoped: false  // Category-based, can share
    }
};

/**
 * Generate a cache key from input parameters
 */
function generateCacheKey(feature: string, inputs: Record<string, any>): string {
    const inputString = JSON.stringify(inputs, Object.keys(inputs).sort());

    // Use a simple hash for browser compatibility
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
        const char = inputString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return `${feature}:${Math.abs(hash).toString(16)}`;
}

/**
 * Check if we have a valid cached response
 */
async function getCached<T>(
    cacheKey: string,
    organizationId?: string
): Promise<T | null> {
    let query = supabase
        .from('ai_response_cache')
        .select('response, hit_count')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString());

    if (organizationId) {
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    }

    const { data, error } = await query.single();

    if (error || !data) {
        return null;
    }

    // Update hit count (fire and forget)
    supabase
        .from('ai_response_cache')
        .update({
            hit_count: (data.hit_count || 0) + 1,
            last_hit_at: new Date().toISOString()
        })
        .eq('cache_key', cacheKey)
        .then(() => { });

    return data.response as T;
}

/**
 * Store response in cache
 */
async function setCache<T>(
    cacheKey: string,
    feature: string,
    response: T,
    ttlDays: number,
    promptSummary?: string,
    organizationId?: string
): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await supabase.from('ai_response_cache').upsert({
        cache_key: cacheKey,
        feature,
        prompt_summary: promptSummary,
        input_hash: cacheKey.split(':')[1],
        response,
        expires_at: expiresAt.toISOString(),
        organization_id: organizationId || null,
        hit_count: 0
    }, {
        onConflict: 'cache_key'
    });
}

/**
 * Main caching wrapper - check cache first, generate if miss
 */
export async function getCachedOrGenerate<T>(
    feature: 'library_generation' | 'control_suggestion',
    cacheInputs: Record<string, any>,
    generateFn: () => Promise<T>,
    options?: {
        promptSummary?: string;
        organizationId?: string;
        skipCache?: boolean;
    }
): Promise<{ data: T; fromCache: boolean }> {
    const config = CACHE_CONFIGS[feature];
    const cacheKey = generateCacheKey(feature, cacheInputs);

    // Skip cache if requested
    if (options?.skipCache) {
        const data = await generateFn();
        // Still store in cache for future use
        await setCache(
            cacheKey,
            feature,
            data,
            config.ttlDays,
            options?.promptSummary,
            config.organizationScoped ? options?.organizationId : undefined
        );
        return { data, fromCache: false };
    }

    // Check cache first
    const cached = await getCached<T>(
        cacheKey,
        config.organizationScoped ? options?.organizationId : undefined
    );

    if (cached !== null) {
        console.log(`[AI Cache] Cache HIT for ${feature}`);
        return { data: cached, fromCache: true };
    }

    console.log(`[AI Cache] Cache MISS for ${feature}, generating...`);

    // Generate fresh response
    const data = await generateFn();

    // Store in cache
    await setCache(
        cacheKey,
        feature,
        data,
        config.ttlDays,
        options?.promptSummary,
        config.organizationScoped ? options?.organizationId : undefined
    );

    return { data, fromCache: false };
}

/**
 * Clear cache for a specific feature or all cached entries
 */
export async function clearCache(feature?: string): Promise<{ deleted: number }> {
    let query = supabase.from('ai_response_cache').delete();

    if (feature) {
        query = query.eq('feature', feature);
    } else {
        // Delete all - need a condition for Supabase
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await query.select('id');

    return { deleted: data?.length || 0 };
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
    totalEntries: number;
    byFeature: Record<string, { count: number; totalHits: number }>;
    expiringWithin7Days: number;
}> {
    const { data: entries } = await supabase
        .from('ai_response_cache')
        .select('feature, hit_count, expires_at');

    if (!entries) {
        return { totalEntries: 0, byFeature: {}, expiringWithin7Days: 0 };
    }

    const byFeature: Record<string, { count: number; totalHits: number }> = {};
    let expiringWithin7Days = 0;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    for (const entry of entries) {
        const feature = entry.feature || 'unknown';
        if (!byFeature[feature]) {
            byFeature[feature] = { count: 0, totalHits: 0 };
        }
        byFeature[feature].count++;
        byFeature[feature].totalHits += entry.hit_count || 0;

        if (new Date(entry.expires_at) < sevenDaysFromNow) {
            expiringWithin7Days++;
        }
    }

    return {
        totalEntries: entries.length,
        byFeature,
        expiringWithin7Days
    };
}
