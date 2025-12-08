# Phase 1: RSS Automation - Architecture Design

**Date:** 2025-12-08
**Status:** 🔨 IN PROGRESS - Architecture Design
**Part of:** Risk Intelligence System Restoration

---

## Executive Summary

Designing RSS automation for NEW-MINRISK based on old MinRisk's proven architecture, adapted for Supabase Edge Functions and modern NEW-MINRISK patterns.

---

## Old MinRisk RSS Scanner - Analysis

**File:** `api/scan-news.js` (1,255 lines)
**Platform:** Vercel serverless function
**Status:** ✅ Production-proven, "worked excellently"

### Key Components

#### 1. RSS Feed Sources (Lines 24-41)
```javascript
const NEWS_SOURCES = [
  // Nigeria Regulatory (3 sources)
  { name: 'Central Bank of Nigeria', url: 'https://www.cbn.gov.ng/rss/news.xml', category: 'regulatory', country: 'Nigeria' },
  { name: 'SEC Nigeria', url: 'https://sec.gov.ng/feed/', category: 'regulatory', country: 'Nigeria' },
  { name: 'FMDQ Group', url: 'https://fmdqgroup.com/feed/', category: 'market', country: 'Nigeria' },

  // Nigeria News (3 sources)
  { name: 'BusinessDay Nigeria', url: 'https://businessday.ng/feed/', category: 'business', country: 'Nigeria' },
  { name: 'The Guardian Nigeria', url: 'https://guardian.ng/feed/', category: 'business', country: 'Nigeria' },
  { name: 'Premium Times', url: 'https://www.premiumtimesng.com/feed', category: 'business', country: 'Nigeria' },

  // Global Cybersecurity (2 sources)
  { name: 'US-CERT Alerts', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', category: 'cybersecurity', country: 'Global' },
  { name: 'SANS ISC', url: 'https://isc.sans.edu/rssfeed.xml', category: 'cybersecurity', country: 'Global' },

  // Global Environmental (1 source)
  { name: 'UN Environment', url: 'https://www.unep.org/news-and-stories/rss.xml', category: 'environmental', country: 'Global' },
];
```

**Total:** 9 default RSS feeds
**Customizable:** Via `news_sources` database table (organization-specific)

---

#### 2. Keyword Pre-Filtering System

**DEFAULT_RISK_KEYWORDS (Lines 44-54):**
```javascript
const DEFAULT_RISK_KEYWORDS = [
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
```

**COMPREHENSIVE FALLBACK KEYWORDS (Lines 534-650):**

**Cybersecurity (40+ keywords):**
- Malware: cyber, hack, breach, ransomware, malware, spyware, trojan, worm, virus, rootkit, keylogger, botnet, backdoor, exploit
- Attacks: phishing, smishing, vishing, ddos, dos attack, injection, xss, sql injection, zero-day, brute force, mitm
- Security Issues: vulnerability, cve-, security flaw, patch, exploit, payload, credential, password leak, data breach, stolen data, exfiltration
- Threat Actors: apt, threat actor, hacking group, cybercrime, cyber attack
- Security Tools: firewall, antivirus, endpoint, intrusion, ids, ips, siem, penetration test, security audit, incident response

**Regulatory (30+ keywords):**
- General: regulatory, regulation, compliance, mandate, directive, policy, law, legislation, statute, ordinance, ruling, decree
- Regulators: sec, finra, cbn, central bank, securities commission, financial regulator, fed, federal reserve, fca, fsb, basel, mifid, gdpr, ccpa
- Actions: fine, penalty, sanction, enforcement action, consent order, investigation, audit, examination, supervisory, regulatory action
- Requirements: requirement, standard, guideline, framework, code of conduct, reporting obligation, disclosure, filing, submission

**Market & Financial (40+ keywords):**
- Market Conditions: market, volatility, fluctuation, turbulence, downturn, crash, correction, rally, bubble, bear market, bull market
- Economic: economic, economy, gdp, inflation, deflation, stagflation, recession, depression, slowdown, contraction, expansion
- Financial Metrics: interest rate, yield, spread, liquidity, credit, debt, currency, exchange rate, forex, fx, commodity, oil price
- Events: default, bankruptcy, insolvency, bailout, crisis, financial stress, systemic risk, contagion, counterparty risk
- Trading: trading, stock, equity, bond, derivative, option, future, portfolio, asset, securities, investment

**Operational (20+ keywords):**
- Systems: outage, downtime, system failure, service disruption, unavailable, crashed, offline, blackout, power failure, infrastructure failure
- Processes: error, mistake, miscalculation, processing error, settlement failure, reconciliation, mismatch, discrepancy, delay
- People: fraud, misconduct, rogue trader, unauthorized, employee, insider threat, human error, training, competence

**Strategic (15+ keywords):**
- Competition: competitor, competition, rival, market share, disruptor, new entrant, substitution, alternative
- Business Model: strategy, strategic, business model, disruption, innovation, transformation, pivot, diversification, merger, acquisition
- Reputation: reputation, brand, public perception, trust, confidence, scandal, controversy, backlash, boycott

**Total:** 100+ keywords across 5 risk categories

**Cost Savings:** 97% reduction (only 3% of events go to AI analysis)

---

#### 3. RSS Parser (Lines 135-160)

```javascript
async function parseSingleFeed(source) {
  const parser = new Parser({
    timeout: 10000,  // 10 seconds
    headers: {
      'User-Agent': 'MinRisk/1.0 (Risk Intelligence Monitor)',
    },
  });

  const feed = await parser.parseURL(source.url);

  const items = feed.items.slice(0, 10).map(item => ({
    title: item.title || 'Untitled',
    description: item.contentSnippet || item.content || item.title || '',
    link: item.link || item.guid || '',
    pubDate: item.pubDate || new Date().toISOString(),
  }));

  return { items, error: null };
}
```

**Key features:**
- Uses `rss-parser` npm package
- 10-second timeout per feed
- Takes first 10 items per feed
- Custom User-Agent for identification
- Graceful error handling

---

#### 4. Event Categorization (Lines 172-183)

```javascript
function categorizeEvent(title, description) {
  const text = (title + ' ' + description).toLowerCase();

  if (text.match(/cyber|hack|breach|malware|ransomware|phishing/i)) return 'cybersecurity';
  if (text.match(/regulat|compliance|SEC|CBN|penalty|fine/i)) return 'regulatory';
  if (text.match(/market|trading|stock|bond|forex|financial/i)) return 'market';
  if (text.match(/environment|climate|ESG|sustainab|carbon/i)) return 'environmental';
  if (text.match(/operation|system|outage|failure|disruption/i)) return 'operational';

  return 'other';
}
```

**Categories:** cybersecurity, regulatory, market, environmental, operational, other

---

#### 5. Deduplication Logic (Lines 238-250)

```javascript
// Check for duplicates by URL (more reliable)
const { data: existingByUrl } = await supabase
  .from('external_events')
  .select('id')
  .eq('organization_id', organizationId)
  .eq('source_url', item.link)
  .limit(1);

if (existingByUrl && existingByUrl.length > 0) {
  // Skip duplicate
  continue;
}
```

**Method:** URL-based deduplication
**Scope:** Organization-level
**Performance:** Indexed query, single row check

---

#### 6. Event Storage (Lines 188-315)

**Filtering criteria:**
1. **Age filter:** Only last N days (default 7)
2. **Keyword filter:** Must match at least one risk keyword
3. **Deduplication:** Check source_url

**Statuses:**
- `stored` - Event stored successfully
- `filtered` - No keywords matched
- `duplicate` - URL already exists
- `error` - Insert failed

**Database table:** `external_events`

---

#### 7. AI Analysis with Claude (Lines 396-494)

```javascript
async function analyzeEventRelevance(event, risks, claudeApiKey) {
  // Build prompt with ALL organizational risks
  const prompt = `TASK: Match this external event to relevant organizational risks...

  EVENT TITLE: "${event.title}"
  EVENT CATEGORY: ${event.event_category}
  EVENT DESCRIPTION: ${event.description}

  ORGANIZATIONAL RISKS TO CONSIDER:
  ${risks.map(r => `${r.risk_code}: ${r.risk_title}`).join('\n')}

  MATCHING RULES - Apply these automatically:
  1. IF event contains "cyber", "hack", "breach" → MATCH ALL "CYB" risks with confidence 0.5
  2. IF event contains "regulatory", "SEC", "rule" → MATCH ALL "REG" risks with confidence 0.5
  3. IF event contains "market", "volatility" → MATCH ALL "MKT" or "FIN" risks with confidence 0.5
  4. IF incident at ANY organization → Consider as precedent, match similar types with confidence 0.4

  Return JSON:
  {"relevant": true, "risk_codes": ["STR-CYB-001"], "confidence": 0.5, "likelihood_change": 1, "reasoning": "...", "impact_assessment": "...", "suggested_controls": ["..."]}
  `;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  return analysis;
}
```

**Features:**
- Analyzes against ALL organizational risks
- Built-in matching rules for common patterns
- Returns: risk_codes, confidence, likelihood_change, reasoning, impact_assessment, suggested_controls
- Temperature: 0.3 (deterministic)
- Max tokens: 1024

---

#### 8. Keyword Fallback Mechanism (Lines 522-664)

**THE 97% COST-SAVING FEATURE**

```javascript
// If AI returns no matches, apply keyword fallback
if (!analysis.relevant || !analysis.risk_codes || analysis.risk_codes.length === 0) {
  const combinedText = `${titleLower} ${descriptionLower} ${categoryLower}`;
  const fallbackRiskCodes = [];
  const matchedKeywords = [];

  // Check cybersecurity keywords
  for (const keyword of cyberKeywords) {
    if (combinedText.includes(keyword)) {
      fallbackRiskCodes.push(...risks.filter(r => r.risk_code.includes('CYB')).map(r => r.risk_code));
      matchedKeywords.push(keyword);
      break;
    }
  }

  // Repeat for regulatory, market, operational, strategic...

  if (fallbackRiskCodes.length > 0) {
    analysis.relevant = true;
    analysis.confidence = 0.5;
    analysis.risk_codes = uniqueRiskCodes;
    analysis.reasoning = `Keyword-based match: ${matchedKeywords.join(', ')}`;
  }
}
```

**How it works:**
1. AI analyzes first
2. If AI returns no matches, apply keyword fallback
3. Keyword match → Force relevance with confidence 0.5
4. Creates alerts automatically

**Cost impact:**
- Without pre-filtering: $22,500/month
- With pre-filtering: $450/month
- **Savings: 97%**

---

#### 9. Alert Creation (Lines 504-722)

```javascript
async function createRiskAlerts(storedEvents, risks, claudeApiKey, minConfidence = 0.6, scannerMode = 'ai') {
  let alertsCreated = 0;

  for (const event of storedEvents) {
    const analysis = await analyzeEventRelevance(event, risks, claudeApiKey);

    // Apply fallback if AI missed obvious keywords
    // (keyword fallback logic here)

    // Create alerts if confidence threshold met
    if (analysis.relevant && analysis.confidence >= minConfidence && analysis.risk_codes?.length > 0) {
      for (const riskCode of analysis.risk_codes) {
        const alert = {
          organization_id: event.organization_id,
          event_id: event.id,
          risk_code: riskCode,
          risk_title: riskDetails?.risk_title,
          risk_description: riskDetails?.risk_description,
          suggested_likelihood_change: analysis.likelihood_change || 0,
          reasoning: analysis.reasoning,
          confidence_score: analysis.confidence,
          suggested_controls: analysis.suggested_controls || [],
          impact_assessment: analysis.impact_assessment,
          status: 'pending',
        };

        await supabase
          .from('risk_intelligence_alerts')
          .insert(alert);

        alertsCreated++;
      }
    }

    // Mark event as analyzed
    await supabase
      .from('external_events')
      .update({ analyzed_at: new Date().toISOString() })
      .eq('id', event.id);

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return alertsCreated;
}
```

**Features:**
- Respects confidence threshold (default 0.6)
- Scanner mode: 'ai' or 'keyword'
- Rate limiting (1 second between AI calls)
- Marks events as analyzed
- Creates alerts in `risk_intelligence_alerts` table

---

#### 10. Special Actions

**analyzeExisting (Lines 916-1008):**
- Analyzes up to 50 unanalyzed events
- Uses scanner configuration from database
- Returns events_analyzed and alerts_created

**clearUnanalyzed (Lines 1011-1048):**
- Deletes unanalyzed events only
- Used for cleanup

**clearAll (Lines 1051-1087):**
- Complete reset, deletes ALL events
- Used for troubleshooting

**resetAnalysis (Lines 1090-1127):**
- Resets analyzed_at to NULL
- Allows re-analysis of events

**testAlert (Lines 829-913):**
- Creates a test alert manually
- Used to verify system works

---

#### 11. Authentication & Authorization

```javascript
// Extract user from Bearer token
const authHeader = req.headers.authorization;
const token = authHeader.substring(7);
const { data: { user }, error } = await supabase.auth.getUser(token);

// Get organization_id from user_profiles
const { data: profile } = await supabase
  .from('user_profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single();

const organizationId = profile.organization_id;
```

**Security:**
- Bearer token authentication
- Organization-scoped operations
- Service role key to bypass RLS (serverless function needs full access)

---

#### 12. User-Level Filtering (OBSOLETE)

**Old MinRisk (Lines 352-391):**
```javascript
async function loadRisks(userId) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', userId)
    .single();

  const isAdmin = profile.role === 'admin';

  let query = supabase
    .from('risks')
    .select('*')
    .order('risk_code');

  if (isAdmin) {
    query = query.eq('organization_id', profile.organization_id);  // All org risks
  } else {
    query = query.eq('user_id', userId);  // Only user's risks
  }

  const { data } = await query;
  return data;
}
```

**NEW-MINRISK:** This is now obsolete - all users see all organizational risks (Phase 0 decision).

---

## NEW-MINRISK Architecture Design

### Key Changes from Old MinRisk

| Feature | Old MinRisk | NEW-MINRISK | Reason |
|---------|-------------|-------------|--------|
| **Platform** | Vercel serverless function | Supabase Edge Function | Unified platform |
| **Table name** | `risk_intelligence_alerts` | `intelligence_alerts` | Simplified naming |
| **User filtering** | Admin vs user-level | Organization-level only | Phase 0 decision |
| **Cron** | Vercel Cron | Supabase Cron | Platform consistency |
| **RSS Parser** | `rss-parser` npm | Deno-compatible parser | Edge Function requirement |
| **Security** | Service role key | Edge Function auth | Better security model |

---

### NEW-MINRISK Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE CRON (Daily 2AM UTC)                  │
│  Triggers Edge Function: scan-rss-feeds                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        EDGE FUNCTION: scan-rss-feeds                        │
│                                                             │
│  1. Load RSS feed sources from database                     │
│  2. Load keyword configuration from database                │
│  3. Parse all RSS feeds (9+ sources)                        │
│  4. Pre-filter by keywords (97% cost reduction)             │
│  5. Filter by age (last 7 days)                             │
│  6. Check for duplicates (URL-based)                        │
│  7. Store events in external_events                         │
│  8. Load organizational risks                               │
│  9. Analyze events with Claude AI                           │
│ 10. Apply keyword fallback if AI returns no matches         │
│ 11. Create alerts in intelligence_alerts                    │
│ 12. Mark events as analyzed                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
         ┌────────────────┴─────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────────┐          ┌───────────────────────┐
│  external_events    │          │ intelligence_alerts   │
│  (Event storage)    │          │  (Alert storage)      │
│                     │          │                       │
│  - organization_id  │          │  - organization_id    │
│  - title            │          │  - event_id           │
│  - description      │          │  - risk_code          │
│  - source_name      │          │  - confidence_score   │
│  - source_url       │          │  - ai_reasoning       │
│  - published_date   │          │  - suggested_controls │
│  - event_category   │          │  - impact_assessment  │
│  - keywords[]       │          │  - status (pending)   │
│  - analyzed_at      │          │  - created_at         │
└─────────────────────┘          └───────────────────────┘
         │                                  │
         │                                  │
         └──────────────┬───────────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │   FRONTEND UI   │
               │                 │
               │  Risk          │
               │  Intelligence   │
               │  Management     │
               └─────────────────┘
```

---

### Edge Function Structure

**File:** `supabase/functions/scan-rss-feeds/index.ts`

```typescript
// Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// RSS parser: Use Deno-compatible RSS parser
// AI: Call Claude API (server-side secure)

serve(async (req) => {
  // Verify this is a cron request or authenticated user request
  // Load configuration from database
  // Execute RSS scanning workflow
  // Return stats
});
```

**Advantages:**
1. ✅ Server-side execution (no API key exposure)
2. ✅ Supabase-native (no external platform)
3. ✅ Access to database with service role
4. ✅ Cron scheduling built-in
5. ✅ Logging via Supabase dashboard

---

### Database Configuration Tables

**1. RSS Feed Sources (Optional)**

```sql
CREATE TABLE news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  country TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Risk Keywords (Optional)**

```sql
CREATE TABLE risk_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**3. Scanner Configuration (Optional)**

```sql
CREATE TABLE app_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  scanner_mode TEXT DEFAULT 'ai' CHECK (scanner_mode IN ('ai', 'keyword')),
  scanner_confidence_threshold NUMERIC DEFAULT 0.6,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**NOTE:** For Phase 1, we'll use hardcoded defaults. Database configuration is Phase 1.5 enhancement.

---

### RSS Feed Sources (Hardcoded Defaults)

```typescript
const DEFAULT_RSS_SOURCES = [
  // Nigeria Regulatory (3)
  { name: 'Central Bank of Nigeria', url: 'https://www.cbn.gov.ng/rss/news.xml', category: 'regulatory', country: 'Nigeria' },
  { name: 'SEC Nigeria', url: 'https://sec.gov.ng/feed/', category: 'regulatory', country: 'Nigeria' },
  { name: 'FMDQ Group', url: 'https://fmdqgroup.com/feed/', category: 'market', country: 'Nigeria' },

  // Nigeria News (3)
  { name: 'BusinessDay Nigeria', url: 'https://businessday.ng/feed/', category: 'business', country: 'Nigeria' },
  { name: 'The Guardian Nigeria', url: 'https://guardian.ng/feed/', category: 'business', country: 'Nigeria' },
  { name: 'Premium Times', url: 'https://www.premiumtimesng.com/feed', category: 'business', country: 'Nigeria' },

  // Global Cybersecurity (2)
  { name: 'US-CERT Alerts', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', category: 'cybersecurity', country: 'Global' },
  { name: 'SANS ISC', url: 'https://isc.sans.edu/rssfeed.xml', category: 'cybersecurity', country: 'Global' },

  // Global Environmental (1)
  { name: 'UN Environment', url: 'https://www.unep.org/news-and-stories/rss.xml', category: 'environmental', country: 'Global' },
];
```

---

### Keyword Categories (Hardcoded Defaults)

```typescript
const KEYWORD_CATEGORIES = {
  cybersecurity: [
    // Malware & Attacks (40+ keywords)
    'cyber', 'hack', 'hacker', 'breach', 'ransomware', 'malware', 'spyware', 'trojan',
    'worm', 'virus', 'rootkit', 'keylogger', 'botnet', 'backdoor', 'exploit',
    'phishing', 'smishing', 'vishing', 'ddos', 'dos attack', 'injection', 'xss',
    'sql injection', 'zero-day', 'brute force', 'mitm', 'man-in-the-middle',
    'vulnerability', 'cve-', 'security flaw', 'patch', 'exploit', 'payload',
    'credential', 'password leak', 'data breach', 'stolen data', 'exfiltration',
    'apt', 'threat actor', 'hacking group', 'cybercrime', 'cyber attack',
    'firewall', 'antivirus', 'endpoint', 'intrusion', 'ids', 'ips', 'siem',
    'penetration test', 'security audit', 'incident response'
  ],

  regulatory: [
    // Regulatory & Compliance (30+ keywords)
    'regulatory', 'regulation', 'compliance', 'mandate', 'directive', 'policy',
    'law', 'legislation', 'statute', 'ordinance', 'ruling', 'decree',
    'sec', 'finra', 'cbn', 'central bank', 'securities commission', 'financial regulator',
    'fed', 'federal reserve', 'fca', 'fsb', 'basel', 'mifid', 'gdpr', 'ccpa',
    'fine', 'penalty', 'sanction', 'enforcement action', 'consent order',
    'investigation', 'audit', 'examination', 'supervisory', 'regulatory action',
    'requirement', 'standard', 'guideline', 'framework', 'code of conduct',
    'reporting obligation', 'disclosure', 'filing', 'submission'
  ],

  market: [
    // Market & Financial (40+ keywords)
    'market', 'volatility', 'fluctuation', 'turbulence', 'downturn', 'crash',
    'correction', 'rally', 'bubble', 'bear market', 'bull market',
    'economic', 'economy', 'gdp', 'inflation', 'deflation', 'stagflation',
    'recession', 'depression', 'slowdown', 'contraction', 'expansion',
    'interest rate', 'yield', 'spread', 'liquidity', 'credit', 'debt',
    'currency', 'exchange rate', 'forex', 'fx', 'commodity', 'oil price',
    'default', 'bankruptcy', 'insolvency', 'bailout', 'crisis',
    'financial stress', 'systemic risk', 'contagion', 'counterparty risk',
    'trading', 'stock', 'equity', 'bond', 'derivative', 'option', 'future',
    'portfolio', 'asset', 'securities', 'investment'
  ],

  operational: [
    // Operational (20+ keywords)
    'outage', 'downtime', 'system failure', 'service disruption', 'unavailable',
    'crashed', 'offline', 'blackout', 'power failure', 'infrastructure failure',
    'error', 'mistake', 'miscalculation', 'processing error', 'settlement failure',
    'reconciliation', 'mismatch', 'discrepancy', 'delay',
    'fraud', 'misconduct', 'rogue trader', 'unauthorized', 'employee',
    'insider threat', 'human error', 'training', 'competence'
  ],

  strategic: [
    // Strategic (15+ keywords)
    'competitor', 'competition', 'rival', 'market share', 'disruptor',
    'new entrant', 'substitution', 'alternative',
    'strategy', 'strategic', 'business model', 'disruption', 'innovation',
    'transformation', 'pivot', 'diversification', 'merger', 'acquisition',
    'reputation', 'brand', 'public perception', 'trust', 'confidence',
    'scandal', 'controversy', 'backlash', 'boycott'
  ]
};
```

**Total:** 100+ keywords across 5 categories

---

## Implementation Plan

### Phase 1.1: Core RSS Scanner (Week 1, Days 1-3)

**Files to create:**
1. `supabase/functions/scan-rss-feeds/index.ts` - Main Edge Function
2. `supabase/functions/scan-rss-feeds/parser.ts` - RSS parsing logic
3. `supabase/functions/scan-rss-feeds/keywords.ts` - Keyword system
4. `supabase/functions/scan-rss-feeds/ai.ts` - Claude AI integration
5. `supabase/functions/scan-rss-feeds/dedup.ts` - Deduplication logic

**Tasks:**
1. Set up Edge Function boilerplate
2. Implement RSS parser (Deno-compatible)
3. Implement keyword pre-filtering
4. Implement event storage with deduplication
5. Implement AI analysis with Claude
6. Implement keyword fallback
7. Implement alert creation

**Success criteria:**
- ✅ Manually trigger Edge Function via Supabase dashboard
- ✅ Parse 9 RSS feeds successfully
- ✅ Store events in `external_events`
- ✅ Create alerts in `intelligence_alerts`
- ✅ Verify keyword fallback works

---

### Phase 1.2: Cron Scheduling (Week 1, Day 4)

**Tasks:**
1. Configure Supabase Cron to run daily at 2AM UTC
2. Test cron trigger
3. Verify logs in Supabase dashboard
4. Monitor for first automated run

**Success criteria:**
- ✅ Cron job runs daily automatically
- ✅ Logs show successful execution
- ✅ Alerts appear in dashboard

---

### Phase 1.3: Testing & Validation (Week 1, Days 5-7)

**Tasks:**
1. Monitor for 3 days
2. Validate alerts created
3. Check for duplicate events
4. Verify keyword fallback triggers
5. Measure cost (should be <$20/day)

**Success criteria:**
- ✅ 0 duplicate events
- ✅ Keyword fallback catches obvious events
- ✅ Alerts have proper confidence scores
- ✅ Cost under budget

---

### Phase 1.4: UI Integration (Week 2, Days 1-2)

**Tasks:**
1. Add "RSS Scanner Status" to Intelligence Dashboard
2. Show last scan time, events processed, alerts created
3. Add manual trigger button (admin only)
4. Add "View All Events" link

**Success criteria:**
- ✅ Users see when last scan ran
- ✅ Admin can manually trigger scan
- ✅ Stats display correctly

---

### Phase 1.5: Database Configuration (Week 2, Days 3-5)

**Tasks:**
1. Create `news_sources` table
2. Create `risk_keywords` table
3. Create `app_configs` table
4. Build admin UI for managing sources/keywords
5. Update Edge Function to load from database

**Success criteria:**
- ✅ Admin can add/remove RSS sources
- ✅ Admin can customize keywords
- ✅ Changes take effect on next scan

---

## Success Metrics

Phase 1 will be "working excellently" when:

1. ✅ **Automated:** RSS feeds scanned daily without user action
2. ✅ **Comprehensive:** 9+ feeds covering Nigerian and global sources
3. ✅ **Efficient:** 97% cost reduction via keyword pre-filtering
4. ✅ **Reliable:** Keyword fallback catches what AI misses
5. ✅ **Accurate:** Deduplication prevents duplicate alerts
6. ✅ **Transparent:** Users see scan stats and can trigger manually
7. ✅ **Cost-effective:** <$20/day for AI analysis (~$600/month)

---

## Next Steps

1. ✅ Architecture design complete
2. ⏳ Install Deno-compatible RSS parser
3. ⏳ Build Edge Function boilerplate
4. ⏳ Implement core RSS scanning logic
5. ⏳ Test end-to-end workflow

---

## Status: Ready for Implementation

Architecture design complete. Ready to build Edge Function.
