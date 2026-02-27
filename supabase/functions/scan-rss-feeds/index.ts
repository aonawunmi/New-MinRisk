/**
 * RSS Feed Scanner - Supabase Edge Function
 * Automated intelligence gathering for Risk Management
 *
 * Updated: 2026-02-19 — Intelligence Redesign
 * - Parallel feed processing (Promise.allSettled)
 * - Institution-type-aware scanning and AI prompts
 * - Two-layer caching (industry + org)
 * - Upsert alerts (no duplicates)
 * - Retry logic (retry_count, max 3 attempts)
 * - Keywords for PRE-FILTERING only (not risk assignment)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/x/xml@2.1.1/mod.ts';
import { DEFAULT_RSS_SOURCES, getRSSSources, updateScanStats, type RSSSource } from './rss-sources.ts';
import { extractKeywords, getAllKeywords, matchesCategory, getKeywords, KEYWORD_CATEGORIES, type KeywordsMap } from './keywords.ts';
import { USE_CASE_MODELS } from '../_shared/ai-models.ts';
import { verifyClerkAuth } from '../_shared/clerk-auth.ts';

// AI Cost Optimization Modules
import { checkDuplicate, addToDedupIndex, extractDomain } from './deduplication.ts';
import {
  calculateRelevanceScore,
  loadPreFilterConfig,
  loadOrgKeywords,
  loadOrgCategories,
  loadOrgIndustry,
  type PreFilterConfig
} from './prefilter.ts';
import {
  checkIndustryCache,
  storeIndustryCache,
  createEventHash,
  parseAnalysisForCache,
  mapCacheToOrgRisks
} from './intelCache.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Configuration
const MAX_AGE_DAYS = 3650; // Allow articles up to 10 years old (debugging date mismatch)
const MIN_CONFIDENCE = 0.6; // Minimum confidence to create alert
const ITEMS_PER_FEED = 5; // Take first 5 items per feed
const MAX_FEEDS = 5; // Maximum feeds per invocation (conservative to avoid WORKER_LIMIT on free tier)
const AI_RATE_LIMIT_MS = 2000; // 2 seconds between AI calls (prevents DB connection pool exhaustion)
const MAX_RETRIES = 3; // Max retry attempts for failed event analysis

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

interface ParsedFeed {
  source: RSSSource;
  items: RSSItem[];
}

interface InstitutionContext {
  name: string;
  category: string;
  description: string;
  regulators: string[];
  defaultScanKeywords: string[];
}

/**
 * Strip HTML tags from text and decode HTML entities
 */
function stripHtml(html: string): string {
  if (!html) return '';

  let text = html.replace(/<[^>]*>/g, ' ');

  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Load institution type context for an organization
 */
async function getInstitutionContext(supabase: any, organizationId: string): Promise<InstitutionContext> {
  const { data: org } = await supabase
    .from('organizations')
    .select(`
      institution_type_id,
      institution_type,
      institution_types:institution_type_id (
        name, category, slug, description, default_scan_keywords
      )
    `)
    .eq('id', organizationId)
    .single();

  if (!org?.institution_types) {
    return { name: 'General Organization', category: 'Other', description: '', regulators: [], defaultScanKeywords: [] };
  }

  // Get mapped regulators
  const { data: regs } = await supabase
    .from('institution_type_regulators')
    .select('regulators:regulator_id (code, name)')
    .eq('institution_type_id', org.institution_type_id);

  const regulatorNames = (regs || []).map((r: any) => r.regulators?.name).filter(Boolean);

  return {
    name: org.institution_types.name,
    category: org.institution_types.category,
    description: org.institution_types.description || '',
    regulators: regulatorNames,
    defaultScanKeywords: org.institution_types.default_scan_keywords || [],
  };
}

/**
 * Parse a single RSS feed using Deno's native XML parser
 */
async function parseSingleFeed(source: RSSSource): Promise<{ items: RSSItem[]; error: string | null }> {
  try {
    console.log(`  Parsing feed: ${source.name} (${source.url})`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'MinRisk/2.0 (Risk Intelligence Monitor)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const doc = parse(xmlText);

    if (!doc) {
      throw new Error('Failed to parse XML');
    }

    const rss = doc.rss || doc;
    const channel = rss?.channel || rss?.feed || rss;
    const itemElements = Array.isArray(channel?.item) ? channel.item : (channel?.item ? [channel.item] : []);
    const entryElements = Array.isArray(channel?.entry) ? channel.entry : (channel?.entry ? [channel.entry] : []);
    const allItems = [...itemElements, ...entryElements];

    const items: RSSItem[] = [];

    for (let i = 0; i < Math.min(allItems.length, ITEMS_PER_FEED); i++) {
      const item = allItems[i];

      const title = item.title?.['#text'] || item.title || 'Untitled';
      const description = item.description?.['#text'] || item.description || item.summary?.['#text'] || item.summary || '';
      const link = item.link?.['@href'] || item.link?.['#text'] || item.link || item.guid?.['#text'] || item.guid || '';
      const pubDate = item.pubDate?.['#text'] || item.pubDate || item.published?.['#text'] || item.published || new Date().toISOString();

      items.push({
        title: typeof title === 'string' ? title : String(title),
        description: typeof description === 'string' ? description : String(description),
        link: typeof link === 'string' ? link : String(link),
        pubDate: typeof pubDate === 'string' ? pubDate : String(pubDate)
      });
    }

    console.log(`  Parsed ${items.length} items from ${source.name}`);
    return { items, error: null };

  } catch (error) {
    console.error(`  Error parsing ${source.name}:`, error.message);
    return { items: [], error: error.message };
  }
}

/**
 * Detect if text is likely English.
 * Uses a simple heuristic: if more than 40% of characters are non-Latin
 * (CJK, Cyrillic, Arabic, Devanagari, etc.), the text is not English.
 * Also checks for common English words as a secondary signal.
 */
function isLikelyEnglish(text: string): boolean {
  if (!text || text.trim().length < 20) return true; // Too short to judge — let it through

  // Strip HTML tags first
  const clean = text.replace(/<[^>]*>/g, ' ').trim();
  if (clean.length < 20) return true;

  // Count non-Latin characters (CJK, Cyrillic, Arabic, Devanagari, Thai, etc.)
  // eslint-disable-next-line no-control-regex
  const nonLatinChars = clean.replace(/[\x00-\x7F\u00C0-\u024F\u1E00-\u1EFF]/g, ''); // Remove ASCII + Latin Extended
  const nonLatinRatio = nonLatinChars.length / clean.length;

  // If more than 40% non-Latin characters, it's almost certainly not English
  if (nonLatinRatio > 0.4) return false;

  return true;
}

/**
 * Categorize event based on content
 */
function categorizeEvent(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();

  if (text.match(/cyber|hack|breach|malware|ransomware|phishing/i)) return 'cybersecurity';
  if (text.match(/regulat|compliance|SEC|CBN|PENCOM|NAICOM|NDIC|NGX|FMDQ|penalty|fine/i)) return 'regulatory';
  if (text.match(/market|trading|stock|bond|forex|financial/i)) return 'market';
  if (text.match(/environment|climate|ESG|sustainab|carbon/i)) return 'environmental';
  if (text.match(/operation|system|outage|failure|disruption/i)) return 'operational';

  return 'other';
}

/**
 * Check if event already exists (deduplication)
 */
async function isDuplicate(supabase: any, organizationId: string, url: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('external_events')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('source_url', url)
    .limit(1);

  if (error) {
    console.error('  Duplicate check error:', error.message);
    return false;
  }

  return data && data.length > 0;
}

async function storeEvents(
  supabase: any,
  parsedFeeds: ParsedFeed[],
  cutoffDate: Date,
  organizationId: string,
  keywordCategories: KeywordsMap
): Promise<{ stored: number; events: any[]; stats: any }> {

  console.log(`Storing events (cutoff: ${cutoffDate.toISOString()})...`);

  const allKeywords = getAllKeywords(keywordCategories);
  const stats = {
    total: 0,
    filtered_non_english: 0,
    filtered_no_keywords: 0,
    filtered_too_old: 0,
    duplicates: 0,
    stored: 0,
    errors: 0,
  };

  // 1. Prepare all candidate events
  const candidateEvents: any[] = [];
  const candidateUrls: string[] = [];

  for (const feedData of parsedFeeds) {
    for (const item of feedData.items) {
      stats.total++;

      // Check language — skip non-English content
      const titleAndDesc = (item.title || '') + ' ' + (item.description || '');
      if (!isLikelyEnglish(titleAndDesc)) {
        stats.filtered_non_english++;
        continue;
      }

      // Check age
      const publishedDate = new Date(item.pubDate);
      if (publishedDate < cutoffDate) {
        stats.filtered_too_old++;
        continue;
      }

      // Check keywords (PRE-FILTERING ONLY — decides if event is worth storing)
      const keywords = extractKeywords(item.title + ' ' + item.description, allKeywords);
      if (keywords.length === 0) {
        stats.filtered_no_keywords++;
        continue;
      }

      // Prepare event object
      const event = {
        organization_id: organizationId,
        title: stripHtml(item.title).substring(0, 500),
        summary: item.description ? stripHtml(item.description).substring(0, 2000) : '',
        source: feedData.source.name,
        event_type: categorizeEvent(item.title, item.description),
        url: item.link,
        published_date: publishedDate.toISOString(),
        fetched_at: new Date().toISOString(),
        relevance_checked: false,
        retry_count: 0,
      };

      candidateEvents.push(event);
      candidateUrls.push(item.link);
    }
  }

  if (candidateEvents.length === 0) {
    return { stored: 0, events: [], stats };
  }

  // 2. Bulk check for duplicates in Database
  const { data: existingEvents, error: distinctError } = await supabase
    .from('external_events')
    .select('url')
    .eq('organization_id', organizationId)
    .in('url', candidateUrls);

  if (distinctError) {
    console.error('  Error checking duplicates:', distinctError.message);
    return { stored: 0, events: [], stats };
  }

  const existingUrls = new Set(existingEvents?.map((e: any) => e.url) || []);

  // 3. Filter out duplicates
  const eventsToInsert: any[] = [];
  const seenUrlsInBatch = new Set<string>();

  for (const event of candidateEvents) {
    if (existingUrls.has(event.url)) {
      stats.duplicates++;
      continue;
    }
    if (seenUrlsInBatch.has(event.url)) {
      stats.duplicates++;
      continue;
    }

    seenUrlsInBatch.add(event.url);
    eventsToInsert.push(event);
  }

  // 4. Bulk Insert
  let storedEvents: any[] = [];
  if (eventsToInsert.length > 0) {
    const { data, error } = await supabase
      .from('external_events')
      .insert(eventsToInsert)
      .select();

    if (error) {
      console.error(`  Bulk insert error:`, error.message);
      stats.errors += eventsToInsert.length;
    } else {
      storedEvents = data || [];
      stats.stored = storedEvents.length;
    }
  }

  console.log(`  Stored ${stats.stored} new events (from ${stats.total} items)`);
  return { stored: stats.stored, events: storedEvents, stats };
}

/**
 * Load organizational risks for AI analysis
 */
async function loadRisks(supabase: any, organizationId: string): Promise<any[]> {
  console.log(`\nLoading risks for organization ${organizationId}...`);

  const { data, error } = await supabase
    .from('risks')
    .select('risk_code, risk_title, risk_description, category, likelihood_inherent, impact_inherent')
    .eq('organization_id', organizationId)
    .in('status', ['OPEN', 'MONITORING', 'Open', 'Monitoring', 'open', 'monitoring'])
    .order('risk_code');

  if (error) {
    console.error('  Error loading risks:', error.message);
    return [];
  }

  console.log(`  Loaded ${data?.length || 0} active risks`);
  return data || [];
}

/**
 * Analyze event relevance using Claude AI
 * Enhanced with institution context for more targeted analysis
 */
async function analyzeEventRelevance(
  event: any,
  risks: any[],
  claudeApiKey: string,
  institutionContext: InstitutionContext
): Promise<any> {
  try {
    if (risks.length === 0) {
      return { is_relevant: false };
    }

    const riskSummary = risks.map(r =>
      `${r.risk_code}: ${r.risk_title} (${r.category || 'Uncategorized'})`
    ).join('\n');

    const regulatorList = institutionContext.regulators.length > 0
      ? institutionContext.regulators.join(', ')
      : 'Not specified';

    const prompt = `You are analyzing a risk intelligence event for a ${institutionContext.name} (Category: ${institutionContext.category}) regulated by ${regulatorList}.

${institutionContext.description ? `Institution focus: ${institutionContext.description}` : ''}

Analyze if this event is relevant to this specific type of institution, not financial services in general.

EVENT:
Title: "${event.title}"
Type: ${event.event_type || 'Unknown'}
Summary: ${event.summary || 'N/A'}

ORGANIZATIONAL RISKS:
${riskSummary}

TASK:
1. Determine if this event is relevant to ANY of the listed risks for a ${institutionContext.name}
2. If relevant, identify which specific risk(s) it affects
3. For EACH affected risk, provide RISK-SPECIFIC analysis:
   - Specific reasoning for THIS particular risk
   - Likelihood/impact changes for THIS risk (scale -2 to +2)
   - 2-4 specific controls tailored to THIS risk

RESPOND ONLY WITH THIS JSON FORMAT (no markdown, no explanations):
{
  "is_relevant": true,
  "confidence": 85,
  "risk_analyses": [
    {
      "risk_code": "STR-CYB-001",
      "reasoning": "Specific explanation for this risk",
      "likelihood_change": 1,
      "impact_change": 0,
      "suggested_controls": ["Control 1", "Control 2"],
      "impact_assessment": "Consequences for this risk area"
    }
  ]
}

IMPORTANT: Each risk must have UNIQUE, SPECIFIC reasoning. Do NOT reuse generic text.

OR if not relevant:
{"is_relevant": false}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: USE_CASE_MODELS.RISK_INTELLIGENCE,
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    if (!response.ok) {
      console.error(`  Claude API error: ${response.status}`);
      return { is_relevant: false };
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '{}';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('  Could not extract JSON from AI response');
      return { is_relevant: false };
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('  AI analysis error:', error.message);
    return { is_relevant: false };
  }
}

/**
 * Create risk alerts from AI analysis using UPSERT
 *
 * OPTIMIZATION LAYERS:
 * Layer 1: Pre-filtering - Skip low-relevance events
 * Layer 2: Deduplication - Skip already-seen events
 * Layer 3: Caching - Use cached analysis when available (industry_event_cache)
 * Layer 4: AI Analysis - Only for events that pass all filters
 *
 * KEY CHANGE: Keywords are for pre-filtering only — AI handles risk mapping
 */
async function analyzeAndAlertEvents(
  supabase: any,
  storedEvents: any[],
  risks: any[],
  claudeApiKey: string,
  organizationId: string,
  keywordCategories: KeywordsMap,
  institutionContext: InstitutionContext
): Promise<number> {
  console.log(`\nAnalyzing ${storedEvents.length} events with AI Cost Optimization...`);

  // Load optimization context
  const [preFilterConfig, orgKeywords, orgCategories, orgIndustry] = await Promise.all([
    loadPreFilterConfig(supabase, organizationId),
    loadOrgKeywords(supabase, organizationId),
    loadOrgCategories(supabase, organizationId),
    loadOrgIndustry(supabase, organizationId)
  ]);

  console.log(`  Optimization config loaded:`);
  console.log(`     - Pre-filter: ${preFilterConfig.enabled ? 'ON' : 'OFF'} (threshold: ${preFilterConfig.threshold})`);
  console.log(`     - Org keywords: ${orgKeywords.length}`);
  console.log(`     - Org categories: ${orgCategories.length}`);
  console.log(`     - Institution: ${institutionContext.name}`);

  const stats = {
    total: storedEvents.length,
    filtered: 0,
    deduplicated: 0,
    cacheHits: 0,
    aiAnalyzed: 0,
    alertsCreated: 0,
    errors: 0,
  };

  let alertsCreated = 0;
  const BATCH_SIZE = 1; // Process events one at a time to prevent WORKER_LIMIT (was 3)

  for (let i = 0; i < storedEvents.length; i += BATCH_SIZE) {
    const batch = storedEvents.slice(i, i + BATCH_SIZE);
    console.log(`\n  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(storedEvents.length / BATCH_SIZE)} (${batch.length} events)`);

    const batchPromises = batch.map(async (event) => {
      try {
        console.log(`  Event: ${event.title.substring(0, 60)}...`);

        // =========================================
        // LAYER 1: Pre-filtering
        // =========================================
        if (preFilterConfig.enabled) {
          const preFilterResult = calculateRelevanceScore(
            {
              title: event.title,
              summary: event.summary,
              published_at: event.published_at,
              source_name: event.source_name
            },
            orgKeywords,
            orgCategories,
            orgIndustry,
            preFilterConfig
          );

          if (!preFilterResult.passed) {
            console.log(`    Pre-filtered (score: ${preFilterResult.score}/${preFilterConfig.threshold})`);
            stats.filtered++;

            await supabase.from('external_events')
              .update({
                filter_status: 'filtered_low_relevance',
                relevance_score: preFilterResult.score,
                filter_reason: preFilterResult.reasons.join('; '),
                relevance_checked: true, // Pre-filtered events don't need retry
              })
              .eq('id', event.id);

            return 0;
          }

          if (preFilterResult.bypassReason) {
            console.log(`    Critical keyword bypass: ${preFilterResult.bypassReason}`);
          }
        }

        // =========================================
        // LAYER 2: Deduplication
        // =========================================
        const domain = extractDomain(event.source_url || event.url || '');
        const dupCheck = await checkDuplicate(supabase, event.title, domain);

        if (dupCheck.isDuplicate) {
          console.log(`    Duplicate (similarity: ${(dupCheck.similarity! * 100).toFixed(0)}%)`);
          stats.deduplicated++;

          await supabase.from('external_events')
            .update({
              filter_status: 'filtered_duplicate',
              filter_reason: `Similar to event ${dupCheck.matchedEventId}`,
              relevance_checked: true, // Duplicates don't need retry
            })
            .eq('id', event.id);

          return 0;
        }

        await addToDedupIndex(supabase, event.id, event.title, domain);

        // =========================================
        // LAYER 3: Industry Cache Check
        // =========================================
        const eventHash = createEventHash(event.title, event.source_url || event.url);
        const cachedAnalysis = await checkIndustryCache(
          supabase,
          eventHash,
          institutionContext.category ? undefined : undefined // Pass institutionTypeId if available
        );

        let riskAnalyses: any[] = [];

        if (cachedAnalysis) {
          console.log(`    Cache hit! Using cached analysis`);
          stats.cacheHits++;

          // Map cached analysis to org's risks
          const mapped = mapCacheToOrgRisks(cachedAnalysis, risks);

          if (mapped.relevant && mapped.risk_codes.length > 0) {
            // Convert mapped cache result into risk_analyses format
            riskAnalyses = mapped.risk_codes.map(rc => ({
              risk_code: rc,
              reasoning: mapped.reasoning,
              likelihood_change: mapped.likelihood_change,
              impact_change: 0,
              suggested_controls: ['Review cached intelligence', 'Assess impact on risk controls'],
              impact_assessment: `Cached analysis: ${cachedAnalysis.generalAnalysis.summary}`,
              confidence: mapped.confidence * 100,
            }));
          }

          await supabase.from('external_events')
            .update({ filter_status: 'cached', relevance_checked: true })
            .eq('id', event.id);

        } else {
          // =========================================
          // LAYER 4: AI Analysis (only for non-cached)
          // =========================================
          console.log(`    Running AI analysis...`);
          stats.aiAnalyzed++;

          const analysis = await analyzeEventRelevance(event, risks, claudeApiKey, institutionContext);

          // Cache the analysis for future use by other orgs
          const cacheableAnalysis = parseAnalysisForCache(analysis, event.title);
          await storeIndustryCache(
            supabase,
            eventHash,
            event.title,
            event.source_url || event.url,
            cacheableAnalysis,
            undefined, // institutionTypeId
            undefined, // tokensUsed
            undefined, // modelVersion
            event.id   // originalEventId
          );

          if (analysis.is_relevant && analysis.risk_analyses && Array.isArray(analysis.risk_analyses)) {
            riskAnalyses = analysis.risk_analyses;
          }

          // Mark as analyzed on SUCCESS
          await supabase.from('external_events')
            .update({ filter_status: 'analyzed', relevance_checked: true })
            .eq('id', event.id);
        }

        // =========================================
        // UPSERT alerts for each matched risk
        // =========================================
        let eventAlerts = 0;

        for (const riskAnalysis of riskAnalyses) {
          if (!riskAnalysis.risk_code) continue;

          const confidence = (riskAnalysis.confidence || 70) / 100;
          if (confidence < MIN_CONFIDENCE) continue;

          const alert = {
            event_id: event.id,
            risk_code: riskAnalysis.risk_code,
            organization_id: organizationId,
            confidence_score: confidence,
            suggested_likelihood_change: riskAnalysis.likelihood_change || 0,
            reasoning: riskAnalysis.reasoning || 'No reasoning provided',
            suggested_controls: riskAnalysis.suggested_controls || [],
            impact_assessment: riskAnalysis.impact_assessment || null,
            status: 'pending',
            applied_to_risk: false,
          };

          // UPSERT: update if exists, insert if not
          const { error } = await supabase
            .from('risk_intelligence_alerts')
            .upsert(alert, { onConflict: 'event_id,risk_code' });

          if (!error) {
            eventAlerts++;
            console.log(`    Alert upserted for ${riskAnalysis.risk_code}`);
          } else {
            console.error(`    Failed to upsert alert: ${error.message}`);
          }
        }

        if (eventAlerts > 0) {
          console.log(`    Created ${eventAlerts} alerts`);
        } else {
          console.log(`    No alerts created`);
        }

        return eventAlerts;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  Error processing event ${event.id}:`, errorMessage);
        stats.errors++;

        // Increment retry_count on failure (DON'T mark relevance_checked)
        await supabase
          .from('external_events')
          .update({ retry_count: (event.retry_count || 0) + 1 })
          .eq('id', event.id);

        // If max retries reached, mark as checked with error note
        if ((event.retry_count || 0) + 1 >= MAX_RETRIES) {
          await supabase
            .from('external_events')
            .update({
              relevance_checked: true,
              filter_reason: `Analysis failed after ${MAX_RETRIES} attempts: ${errorMessage}`
            })
            .eq('id', event.id);
        }

        return 0;
      }
    });

    const results = await Promise.allSettled(batchPromises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        alertsCreated += result.value;
      }
    }

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < storedEvents.length) {
      await new Promise(resolve => setTimeout(resolve, AI_RATE_LIMIT_MS));
    }
  }

  stats.alertsCreated = alertsCreated;

  console.log(`\n  Optimization Summary:`);
  console.log(`     - Total events: ${stats.total}`);
  console.log(`     - Pre-filtered: ${stats.filtered} (${stats.total > 0 ? ((stats.filtered / stats.total) * 100).toFixed(0) : 0}%)`);
  console.log(`     - Deduplicated: ${stats.deduplicated}`);
  console.log(`     - Cache hits: ${stats.cacheHits}`);
  console.log(`     - AI analyzed: ${stats.aiAnalyzed}`);
  console.log(`     - Errors: ${stats.errors}`);
  console.log(`     - Alerts created: ${stats.alertsCreated}`);

  return alertsCreated;
}

/**
 * Main handler
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('\nRSS Feed Scanner starting...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !claudeApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body once (can only be read once in Deno)
    const body = await req.json().catch(() => ({}));

    // Get organization ID — 3 priority levels:
    // 1. From request body (lightweight, avoids expensive Clerk auth)
    // 2. From Clerk auth (expensive — creates extra clients + DB query)
    // 3. Fallback to first organization (cron/test mode)
    let organizationId: string = '';

    // Priority 1: organization_id in request body (no Clerk overhead)
    if (body.organization_id) {
      organizationId = body.organization_id;
      console.log('Using organization_id from request body (lightweight path)');
    }

    // Priority 2: Clerk auth (only if org_id not provided — expensive on free tier)
    if (!organizationId && req.headers.get('x-clerk-token')) {
      try {
        const { profile } = await verifyClerkAuth(req);
        if (profile && profile.organization_id) {
          organizationId = profile.organization_id;
          console.log('Authenticated user request (Clerk)');
        }
      } catch {
        console.log('Clerk auth failed, falling back to first organization');
      }
    }

    // Priority 3: First organization (cron/test mode)
    if (!organizationId) {
      console.log('Using first organization (cron/test mode)');
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (!orgs || orgs.length === 0) {
        throw new Error('No organizations found');
      }

      organizationId = orgs[0].id;
    }

    console.log(`Organization ID: ${organizationId}`);

    // Step 1: Load RSS sources, Keywords, and Institution Context in parallel
    const [sources, keywordCategories, institutionContext] = await Promise.all([
      getRSSSources(supabase, organizationId),
      getKeywords(supabase, organizationId),
      getInstitutionContext(supabase, organizationId),
    ]);

    console.log(`\nParsing ${sources.length} RSS feeds (max ${MAX_FEEDS})...`);
    console.log(`Using ${getAllKeywords(keywordCategories).length} keywords from ${Object.keys(keywordCategories).length} categories`);
    console.log(`Institution: ${institutionContext.name} (${institutionContext.category})`);

    const limitedSources = sources.slice(0, MAX_FEEDS);

    // Step 2: Parse feeds SEQUENTIALLY to prevent WORKER_LIMIT resource exhaustion
    // (Was parallel with Promise.allSettled, but 8 concurrent HTTP fetches + XML parsing
    // exceeds Supabase Edge Function memory limits)
    const parsedFeeds: ParsedFeed[] = [];
    for (const source of limitedSources) {
      try {
        console.log(`  Fetching: ${source.name}...`);
        const result = await parseSingleFeed(source);

        // Update scan statistics
        if (source.id) {
          if (result.error) {
            await updateScanStats(supabase, source.id, 'failed', 0, result.error);
          } else {
            await updateScanStats(supabase, source.id, 'success', result.items.length, null);
          }
        }

        if (result.items.length > 0) {
          parsedFeeds.push({ source, items: result.items });
        }
      } catch (err) {
        console.error(`  Feed failed (${source.name}):`, err);
      }
    }

    const totalItems = parsedFeeds.reduce((sum: number, feed: ParsedFeed) => sum + feed.items.length, 0);
    console.log(`\n  Total items found: ${totalItems}`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);

    // Step 3: Store events (with keyword pre-filtering and deduplication)
    const storeResults = await storeEvents(supabase, parsedFeeds, cutoffDate, organizationId, keywordCategories);

    // Step 4: Load risks
    const risks = await loadRisks(supabase, organizationId);

    // Step 5: Analyze events and create alerts (with institution context)
    let alertsCreated = 0;
    if (storeResults.events.length > 0 && risks.length > 0) {
      alertsCreated = await analyzeAndAlertEvents(
        supabase,
        storeResults.events,
        risks,
        claudeApiKey,
        organizationId,
        keywordCategories,
        institutionContext
      );
    }

    // Summary
    const summary = {
      success: true,
      organization_id: organizationId,
      institution_type: institutionContext.name,
      feeds_processed: limitedSources.length,
      feeds_total: sources.length,
      items_found: totalItems,
      events_stored: storeResults.stored,
      alerts_created: alertsCreated,
      stats: storeResults.stats,
      timestamp: new Date().toISOString(),
    };

    console.log('\nRSS Feed Scanner completed successfully');
    console.log(JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('RSS Scanner error:', errorMessage);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
