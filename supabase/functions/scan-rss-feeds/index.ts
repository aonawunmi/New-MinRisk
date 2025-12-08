/**
 * RSS Feed Scanner - Supabase Edge Function
 * Automated intelligence gathering for Risk Management
 *
 * Ported from old MinRisk scan-news.js (1,255 lines)
 * Adapted for Supabase Edge Functions and NEW-MINRISK architecture
 *
 * Features:
 * - 9+ RSS feeds (Nigerian + Global)
 * - 100+ keyword pre-filtering (97% cost reduction)
 * - Keyword fallback system
 * - Claude AI analysis
 * - Deduplication
 * - Alert creation
 *
 * Trigger: Daily cron (2AM UTC) or manual via API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DEFAULT_RSS_SOURCES, getRSSSources, type RSSSource } from './rss-sources.ts';
import { extractKeywords, getAllKeywords, matchesCategory, KEYWORD_CATEGORIES } from './keywords.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Configuration
const MAX_AGE_DAYS = 7; // Only process news from last 7 days
const MIN_CONFIDENCE = 0.6; // Minimum confidence to create alert
const ITEMS_PER_FEED = 10; // Take first 10 items per feed
const AI_RATE_LIMIT_MS = 1000; // 1 second between AI calls

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

/**
 * Parse a single RSS feed using Deno's native XML parser
 */
async function parseSingleFeed(source: RSSSource): Promise<{ items: RSSItem[]; error: string | null }> {
  try {
    console.log(`  📡 Parsing feed: ${source.name} (${source.url})`);

    // Fetch RSS feed with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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

    // Parse XML using DOMParser (Deno-compatible)
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    if (!doc) {
      throw new Error('Failed to parse XML');
    }

    // Extract items from RSS feed
    const itemElements = doc.querySelectorAll('item');
    const items: RSSItem[] = [];

    for (let i = 0; i < Math.min(itemElements.length, ITEMS_PER_FEED); i++) {
      const item = itemElements[i];

      const title = item.querySelector('title')?.textContent || 'Untitled';
      const description = item.querySelector('description')?.textContent || item.querySelector('summary')?.textContent || '';
      const link = item.querySelector('link')?.textContent || item.querySelector('guid')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || item.querySelector('published')?.textContent || new Date().toISOString();

      items.push({ title, description, link, pubDate });
    }

    console.log(`  ✅ Parsed ${items.length} items from ${source.name}`);
    return { items, error: null };

  } catch (error) {
    console.error(`  ❌ Error parsing ${source.name}:`, error.message);
    return { items: [], error: error.message };
  }
}

/**
 * Categorize event based on content
 */
function categorizeEvent(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();

  if (text.match(/cyber|hack|breach|malware|ransomware|phishing/i)) return 'cybersecurity';
  if (text.match(/regulat|compliance|SEC|CBN|penalty|fine/i)) return 'regulatory';
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
    console.error('  ⚠️ Duplicate check error:', error.message);
    return false; // Assume not duplicate if check fails
  }

  return data && data.length > 0;
}

/**
 * Store events in database
 */
async function storeEvents(
  supabase: any,
  parsedFeeds: ParsedFeed[],
  maxAgeDays: number,
  organizationId: string
): Promise<{ stored: number; events: any[]; stats: any }> {
  console.log(`\n📊 Storing events (maxAge: ${maxAgeDays} days)...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  const allKeywords = getAllKeywords();
  let stored = 0;
  const storedEvents = [];
  const stats = {
    total: 0,
    filtered_no_keywords: 0,
    filtered_too_old: 0,
    duplicates: 0,
    stored: 0,
    errors: 0,
  };

  for (const feedData of parsedFeeds) {
    for (const item of feedData.items) {
      stats.total++;

      // Extract keywords
      const keywords = extractKeywords(item.title + ' ' + item.description, allKeywords);
      const category = categorizeEvent(item.title, item.description);
      const publishedDate = new Date(item.pubDate);

      // Check age
      if (publishedDate < cutoffDate) {
        stats.filtered_too_old++;
        continue;
      }

      // Check keywords
      if (keywords.length === 0) {
        stats.filtered_no_keywords++;
        continue;
      }

      // Check duplicates
      if (await isDuplicate(supabase, organizationId, item.link)) {
        stats.duplicates++;
        continue;
      }

      // Store event
      const event = {
        organization_id: organizationId,
        title: item.title.substring(0, 500),
        summary: item.description.substring(0, 2000),
        source: feedData.source.name,
        source_url: item.link,
        event_type: category,
        url: item.link,
        published_date: publishedDate.toISOString(),
        fetched_at: new Date().toISOString(),
        relevance_checked: false,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('external_events')
        .insert(event)
        .select()
        .single();

      if (!error && data) {
        stored++;
        storedEvents.push(data);
        stats.stored++;
      } else {
        console.error(`  ❌ Insert error:`, error?.message);
        stats.errors++;
      }
    }
  }

  console.log(`  ✅ Stored ${stored} new events`);
  return { stored, events: storedEvents, stats };
}

/**
 * Load organizational risks for AI analysis
 */
async function loadRisks(supabase: any, organizationId: string): Promise<any[]> {
  console.log(`\n📊 Loading risks for organization ${organizationId}...`);

  const { data, error } = await supabase
    .from('risks')
    .select('risk_code, risk_title, risk_description, category, likelihood_inherent, impact_inherent')
    .eq('organization_id', organizationId)
    .order('risk_code');

  if (error) {
    console.error('  ❌ Error loading risks:', error.message);
    return [];
  }

  console.log(`  ✅ Loaded ${data?.length || 0} risks`);
  return data || [];
}

/**
 * Analyze event relevance using Claude AI
 */
async function analyzeEventRelevance(event: any, risks: any[], claudeApiKey: string): Promise<any> {
  try {
    if (risks.length === 0) {
      return { relevant: false };
    }

    const riskSummary = risks.map(r => `${r.risk_code}: ${r.risk_title}`).join('\n');

    const prompt = `TASK: Match this external event to relevant organizational risks for early warning monitoring.

EVENT TITLE: "${event.title}"
EVENT CATEGORY: ${event.event_type || 'Unknown'}
EVENT DESCRIPTION: ${event.summary || 'N/A'}

ORGANIZATIONAL RISKS TO CONSIDER:
${riskSummary}

MATCHING RULES - Apply these automatically:
1. IF event title/category contains "cyber", "hack", "breach", "ransomware", "malware", "phishing" → MATCH ALL "CYB" risks with confidence 0.5
2. IF event title/category contains "regulatory", "compliance", "SEC", "rule", "regulation" → MATCH ALL "REG" risks with confidence 0.5
3. IF event title/category contains "market", "volatility", "economic", "financial" → MATCH ALL "MKT" or "FIN" risks with confidence 0.5
4. IF event is about an incident at ANY organization → Consider as industry precedent, match similar risk types with confidence 0.4

IMPORTANT:
- This is for EARLY WARNING - err on the side of creating alerts
- Industry incidents = precedents for our organization
- External events show environmental changes that affect our risk landscape

Return ONLY this JSON format (no markdown, no explanations):
{"relevant": true, "risk_codes": ["STR-CYB-001"], "confidence": 0.5, "likelihood_change": 1, "reasoning": "Brief reason", "impact_assessment": "Brief impact", "suggested_controls": ["Control 1"]}

OR if truly no connection:
{"relevant": false}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    if (!response.ok) {
      console.error(`  ❌ Claude API error: ${response.status}`);
      return { relevant: false };
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '{}';

    // Extract JSON
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    const analysis = JSON.parse(jsonStr);
    return analysis;

  } catch (error) {
    console.error('  ❌ AI analysis error:', error.message);
    return { relevant: false };
  }
}

/**
 * Apply keyword fallback if AI returns no matches
 * This is the 97% cost-saving feature!
 */
function applyKeywordFallback(event: any, analysis: any, risks: any[]): any {
  if (analysis.relevant && analysis.risk_codes?.length > 0) {
    return analysis; // AI found matches, no fallback needed
  }

  const combinedText = `${event.title} ${event.summary} ${event.event_type}`.toLowerCase();
  const fallbackRiskCodes: string[] = [];
  const matchedKeywords: string[] = [];

  // Check each category
  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    for (const keyword of keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        // Map category to risk code prefix
        let riskPrefix = '';
        if (category === 'cybersecurity') riskPrefix = 'CYB';
        else if (category === 'regulatory') riskPrefix = 'REG';
        else if (category === 'market') riskPrefix = 'MKT';
        else if (category === 'operational') riskPrefix = 'OPE';
        else if (category === 'strategic') riskPrefix = 'STR';

        // Find matching risks
        const matchingRisks = risks.filter(r => r.risk_code.includes(riskPrefix));
        fallbackRiskCodes.push(...matchingRisks.map(r => r.risk_code));
        matchedKeywords.push(keyword);
        break; // Only need one match per category
      }
    }
  }

  if (fallbackRiskCodes.length > 0) {
    const uniqueRiskCodes = [...new Set(fallbackRiskCodes)];
    console.log(`  🎯 KEYWORD FALLBACK: ${matchedKeywords.length} keywords matched → ${uniqueRiskCodes.length} risks`);

    return {
      relevant: true,
      confidence: 0.5,
      risk_codes: uniqueRiskCodes,
      reasoning: `Keyword-based match: Event contains ${matchedKeywords.length} relevant keyword(s) [${matchedKeywords.slice(0, 3).join(', ')}] indicating potential relevance to ${uniqueRiskCodes.length} organizational risk(s)`,
      impact_assessment: 'External event demonstrates industry/environmental trend that may affect organizational risk landscape',
      suggested_controls: ['Monitor for similar incidents', 'Review affected risk controls', 'Assess potential impact'],
      likelihood_change: 1,
    };
  }

  return analysis; // No fallback match either
}

/**
 * Create risk alerts from analysis
 */
async function createRiskAlerts(
  supabase: any,
  storedEvents: any[],
  risks: any[],
  claudeApiKey: string,
  organizationId: string
): Promise<number> {
  console.log(`\n🤖 Analyzing ${storedEvents.length} events with AI...`);

  let alertsCreated = 0;

  for (const event of storedEvents) {
    try {
      console.log(`\n  🔍 Event: ${event.title.substring(0, 60)}...`);

      // AI analysis
      const analysis = await analyzeEventRelevance(event, risks, claudeApiKey);

      // Apply keyword fallback
      const finalAnalysis = applyKeywordFallback(event, analysis, risks);

      // Create alerts if confidence threshold met
      if (finalAnalysis.relevant && finalAnalysis.confidence >= MIN_CONFIDENCE && finalAnalysis.risk_codes?.length > 0) {
        console.log(`    ✅ Creating ${finalAnalysis.risk_codes.length} alerts (confidence: ${finalAnalysis.confidence})`);

        for (const riskCode of finalAnalysis.risk_codes) {
          const alert = {
            organization_id: organizationId,
            event_id: event.id,
            risk_code: riskCode,
            is_relevant: true,
            confidence_score: Math.round(finalAnalysis.confidence * 100),
            likelihood_change: finalAnalysis.likelihood_change || 0,
            impact_change: 0,
            ai_reasoning: finalAnalysis.reasoning || 'No reasoning provided',
            status: 'pending',
            applied_to_risk: false,
            created_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from('intelligence_alerts')
            .insert(alert);

          if (!error) {
            alertsCreated++;
          } else {
            console.error(`    ❌ Failed to insert alert:`, error.message);
          }
        }
      } else {
        console.log(`    ⏭️  Skipped (confidence: ${finalAnalysis.confidence}, threshold: ${MIN_CONFIDENCE})`);
      }

      // Mark event as analyzed
      await supabase
        .from('external_events')
        .update({ relevance_checked: true })
        .eq('id', event.id);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, AI_RATE_LIMIT_MS));

    } catch (error) {
      console.error(`  ❌ Error processing event:`, error.message);
    }
  }

  console.log(`\n  ✅ Created ${alertsCreated} alerts`);
  return alertsCreated;
}

/**
 * Main handler
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('\n🚀 RSS Feed Scanner starting...');

    // Initialize Supabase with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !claudeApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get organization ID from request or use first organization (for cron)
    let organizationId: string;

    if (req.headers.get('authorization')) {
      // Manual trigger - get organization from authenticated user
      const authHeader = req.headers.get('authorization')!;
      const token = authHeader.replace('Bearer ', '');

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        throw new Error('Authentication failed');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      organizationId = profile.organization_id;
    } else {
      // Cron trigger - scan for ALL organizations
      // For now, get first organization (Phase 1.5 will loop through all)
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (!orgs || orgs.length === 0) {
        throw new Error('No organizations found');
      }

      organizationId = orgs[0].id;
    }

    console.log(`📋 Organization ID: ${organizationId}`);

    // Step 1: Load RSS sources
    const sources = await getRSSSources(organizationId);
    console.log(`\n📡 Parsing ${sources.length} RSS feeds...`);

    // Step 2: Parse all feeds
    const parsedFeeds: ParsedFeed[] = [];
    for (const source of sources) {
      const result = await parseSingleFeed(source);
      if (result.items.length > 0) {
        parsedFeeds.push({ source, items: result.items });
      }
    }

    const totalItems = parsedFeeds.reduce((sum, feed) => sum + feed.items.length, 0);
    console.log(`\n  ✅ Total items found: ${totalItems}`);

    // Step 3: Store events (with keyword pre-filtering and deduplication)
    const storeResults = await storeEvents(supabase, parsedFeeds, MAX_AGE_DAYS, organizationId);

    // Step 4: Load risks
    const risks = await loadRisks(supabase, organizationId);

    // Step 5: Analyze events and create alerts
    let alertsCreated = 0;
    if (storeResults.events.length > 0 && risks.length > 0) {
      alertsCreated = await createRiskAlerts(
        supabase,
        storeResults.events,
        risks,
        claudeApiKey,
        organizationId
      );
    }

    // Summary
    const summary = {
      success: true,
      organization_id: organizationId,
      feeds_processed: sources.length,
      items_found: totalItems,
      events_stored: storeResults.stored,
      alerts_created: alertsCreated,
      stats: storeResults.stats,
      timestamp: new Date().toISOString(),
    };

    console.log('\n✅ RSS Feed Scanner completed successfully');
    console.log(JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ RSS Scanner error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
