# Risk Intelligence System - Old vs New Comparison

**Date:** 2025-12-08
**Purpose:** Identify why NEW-MINRISK intelligence is "running poorly" compared to old MinRisk baseline

---

## Executive Summary

The old MinRisk Risk Intelligence System "worked excellently" because it was a **fully automated, RSS-powered, enterprise-grade solution** with robust fallback mechanisms and comprehensive workflows.

The NEW-MINRISK implementation is a **manual-entry MVP** that is missing critical automation features and has a **security vulnerability** (frontend exposing API keys).

---

## Architecture Comparison

### OLD MINRISK (Baseline - "Worked Excellently")

```
RSS Feeds (9+ sources) → Scan every 24h (Vercel Cron)
    ↓
Keyword Pre-Filter (100+ keywords, 5 categories)
    ↓
Deduplication (URL + title checking)
    ↓
Store in external_events
    ↓
Claude AI Analysis (with 100+ keyword fallback)
    ↓
Create Alerts in risk_intelligence_alerts
    ↓
Intelligence Dashboard (Pending Alerts)
    ↓
User Reviews: Accept/Dismiss
    ↓
Treatment Log (Accepted Alerts)
    ↓
User Manually Applies to Risk Register
    ↓
Audit Trail (who, when, what changed)
```

**Key Strengths:**
- **Automated:** Runs on cron, no user action needed
- **Comprehensive:** 9+ RSS feeds covering Nigerian and global sources
- **Smart Filtering:** 97% cost reduction via keyword pre-filter
- **Fallback System:** If Claude doesn't match, 100+ keywords catch it
- **Enterprise Workflow:** Accept → Treatment Log → Manual Application
- **Audit Trail:** Full treatment log with undo capability

---

### NEW-MINRISK (Current - "Running Poorly")

```
User Manually Adds Event
    ↓
createExternalEventWithAutoScan()
    ↓
Edge Function analyze-intelligence (correct)
    OR
    Frontend Direct Claude API Call (❌ SECURITY ISSUE)
    ↓
Create Alerts in intelligence_alerts
    ↓
Risk Intelligence Management UI
    ↓
User Reviews: Accept/Reject
    ↓
Apply to Risk Register (separate action)
    ↓
Treatment Log
```

**Key Weaknesses:**
- **Manual Entry Only:** No RSS automation, user must add each event
- **Security Vulnerability:** Frontend code calls Claude API directly (line 474-580 in riskIntelligence.ts)
- **Dual Implementation:** Edge Function exists but frontend also has its own Claude API call
- **No Keyword Fallback:** Relies solely on AI, no fallback if AI fails
- **Missing Features:** No bulk delete, no test alerts, no special actions
- **Less Context:** Alerts don't include risk_title/risk_description
- **Table Name Mismatch:** Uses `intelligence_alerts` not `risk_intelligence_alerts`

---

## Detailed Feature Comparison

| Feature | Old MinRisk | NEW-MINRISK | Impact |
|---------|-------------|-------------|--------|
| **RSS Automation** | ✅ 9+ feeds, cron job | ❌ None | **CRITICAL** - User must manually find/add events |
| **Keyword Pre-Filter** | ✅ 100+ keywords, 5 categories | ❌ None | High cost, slower processing |
| **Claude AI Analysis** | ✅ Server-side (api/scan-news.js) | ⚠️ Dual (Edge Function + Frontend) | **SECURITY ISSUE** |
| **Fallback System** | ✅ Keyword matching if AI fails | ❌ None | Missed alerts if AI doesn't match |
| **Bulk Delete Alerts** | ✅ Delete all pending | ❌ None | UX inconvenience |
| **Test Alert Function** | ✅ Create test alert | ❌ None | Hard to verify system works |
| **Treatment Log** | ✅ Emphasized workflow | ✅ Exists but underutilized | OK |
| **Undo Applied Alerts** | ✅ With treatment history | ✅ Implemented | OK |
| **Alert Context** | ✅ Includes risk_title, risk_description | ❌ Missing | Less context for users |
| **User Filtering** | ✅ Only YOUR risks (non-admin) | ❌ Not clear | Possible performance issue |
| **Special Actions** | ✅ analyzeExisting, clearAll, resetAnalysis | ❌ None | Hard to troubleshoot |
| **Deduplication** | ✅ URL + title matching | ✅ 7-day window | OK |
| **MAX Logic** | ❌ Simple cumulative | ✅ MAX change from all alerts | Better in NEW |

---

## Code-Level Issues

### 1. **SECURITY VULNERABILITY** - Frontend Claude API Calls

**File:** `NEW-MINRISK/src/lib/riskIntelligence.ts:474-580`

```typescript
export async function analyzeEventRelevance(
  event: ExternalEvent,
  risk: { risk_code: string; risk_title: string; ... }
): Promise<{ data: AIRelevanceAnalysis | null; error: Error | null }> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;  // ❌ Frontend API key

  const response = await fetch('https://api.anthropic.com/v1/messages', {  // ❌ Browser call
    method: 'POST',
    headers: {
      'x-api-key': apiKey,  // ❌ EXPOSED IN BROWSER
      'anthropic-version': '2023-06-01',
    },
    // ...
  });
}
```

**Problem:** This function is called from the frontend and exposes the Anthropic API key in the browser.

**Impact:**
- API key visible in browser DevTools
- Anyone can extract and use the key
- Potential for abuse and unexpected costs
- Violates security best practices

**Why This Exists:**
The Edge Function `analyze-intelligence` already exists and is correct. This frontend function is redundant and dangerous.

---

### 2. Table Name Mismatch

**Old MinRisk:**
- Table: `risk_intelligence_alerts`

**NEW-MINRISK:**
- Table: `intelligence_alerts`

**Impact:** Queries won't work if old schema is expected.

**Check:** Verify which table exists in NEW-MINRISK database.

---

### 3. Missing RSS Scanner

**Old MinRisk:** `api/scan-news.js` - Full RSS scanner with keyword filtering

**NEW-MINRISK:** No RSS implementation at all

**Code Comment (line 668-691 in NEW-MINRISK):**
```typescript
/**
 * Parse RSS feed (to be implemented with rss-parser package)
 * For now, this is a placeholder
 */
export async function parseRSSFeed(url: string) {
  // TODO: Install and use rss-parser npm package
  console.log('RSS parsing not yet implemented. Install rss-parser package.');
  return { items: [], error: null };
}
```

**Impact:** Users must manually add every single event. In old MinRisk, the system automatically scanned 9+ feeds daily.

---

### 4. User Filtering Logic Issue

**Old MinRisk (lines 283-396):**
```typescript
export async function loadRiskAlerts() {
  // Get user's risks
  let riskCodesQuery = supabase
    .from('risks')
    .select('risk_code')
    .eq('organization_id', profile.organization_id);

  // Regular users: only their own risks
  // Admin users: all org risks
  if (profile.role !== 'admin') {
    riskCodesQuery = riskCodesQuery.eq('user_id', user.id);
  }

  // Load alerts ONLY for those risk codes
  const alerts = await supabase
    .from('risk_intelligence_alerts')
    .in('risk_code', riskCodes);
}
```

**NEW-MINRISK (lines 589-630):**
```typescript
export async function getIntelligenceAlertsByStatus(status) {
  // NO user filtering!
  const { data, error } = await supabase
    .from('intelligence_alerts')
    .select('*')
    .eq('status', status);
}
```

**Impact:** NEW-MINRISK may be loading ALL alerts for ALL users in the org, causing performance issues and showing irrelevant alerts.

---

## Why Old MinRisk "Worked Excellently"

### 1. **Automated Intelligence Gathering**
Users didn't need to do anything. The system:
- Scanned 9+ RSS feeds daily
- Filtered by 100+ keywords across 5 risk categories
- Deduplicated events automatically
- Analyzed against ALL organizational risks
- Created alerts without user intervention

**Result:** Continuous, hands-free risk monitoring

### 2. **Intelligent Cost Optimization**
- **Keyword Pre-Filter:** 97% of events filtered out before AI analysis
- **Cost:** ~$450/month with pre-filtering vs $22,500/month without
- **Smart:** Only high-value events went to Claude AI

**Result:** Enterprise-scale operation at reasonable cost

### 3. **Robust Fallback System**
If Claude AI didn't match an event:
- 100+ keyword patterns across 5 categories
- Cybersecurity: ransomware, breach, phishing, malware, etc.
- Regulatory: compliance, SEC, CBN, regulatory, etc.
- Market: volatility, crash, inflation, devaluation, etc.
- Operational: outage, failure, disruption, etc.
- Strategic: merger, acquisition, competition, etc.

**Result:** Zero missed critical events

### 4. **Enterprise Workflow**
- **Alert Created** → User sees in dashboard
- **User Accepts** → Goes to Treatment Log (not auto-applied)
- **User Reviews Treatment Log** → Decides when/how to apply
- **User Applies to Risk** → Updates risk register with notes
- **Audit Trail** → Full history of who did what and when

**Result:** Controlled, documented risk updates

### 5. **Comprehensive Tooling**
Special actions for troubleshooting:
- `analyzeExisting` - Reprocess unanalyzed events
- `testAlert` - Create test alert to verify system
- `clearUnanalyzed` - Clean up failed events
- `clearAll` - Complete reset
- `resetAnalysis` - Re-run analysis

**Result:** Easy debugging and system verification

---

## Why NEW-MINRISK is "Running Poorly"

### 1. **Manual Labor Required**
Users must:
- Find threat events themselves
- Manually copy/paste into the system
- Do this continuously to maintain intelligence

**Result:** Low adoption, incomplete coverage, user fatigue

### 2. **Security Vulnerability**
Frontend calling Claude API directly means:
- API keys exposed in browser
- Potential for unauthorized use
- Compliance risk

**Result:** Production security issue

### 3. **Missing Automation**
No RSS feeds = No automated intelligence gathering

**Result:** System only as good as user's manual effort

### 4. **No Fallback Mechanism**
If Claude API:
- Is down
- Returns no matches
- Has rate limits

Then: **Zero alerts created** (vs old system which falls back to keywords)

**Result:** Unreliable intelligence coverage

### 5. **Incomplete Workflow**
Treatment log exists but:
- No bulk delete for cleaning up false positives
- No test alerts for verification
- No special actions for troubleshooting
- Less emphasis on manual treatment review

**Result:** Less control, harder to manage

---

## Root Cause Analysis

The NEW-MINRISK Risk Intelligence System was built as an **MVP (Minimum Viable Product)** for manual event entry with auto-scan.

**What was implemented:**
- Manual event creation ✅
- Auto-scan on create ✅
- Edge Function for server-side AI ✅
- Treatment log ✅
- Undo functionality ✅

**What was NOT implemented:**
- RSS automation ❌
- Keyword pre-filtering ❌
- Keyword fallback ❌
- Bulk operations ❌
- Special troubleshooting actions ❌
- User-level alert filtering ❌

**Why it's running poorly:**
1. Users expected automated RSS scanning (like old MinRisk)
2. Manual entry is tedious and incomplete
3. No fallback if AI fails to match
4. Security issue with frontend API calls
5. Missing enterprise tooling (bulk delete, test alerts, etc.)

---

## Recommendations

### Priority 1: Fix Security Vulnerability (URGENT)

**Problem:** Frontend calling Claude API directly (line 474-580)

**Fix:**
1. Remove `analyzeEventRelevance()` function from `src/lib/riskIntelligence.ts`
2. Use ONLY the Edge Function `analyze-intelligence` for all AI analysis
3. Update `scanRisksForRelevantEvents()` to call Edge Function instead

**Code Change:**
```typescript
// DELETE THIS ENTIRE FUNCTION (lines 474-580)
export async function analyzeEventRelevance() { ... }

// REPLACE with Edge Function call
export async function analyzeEventRelevance(event, risk) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${supabase.supabaseUrl}/functions/v1/analyze-intelligence`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        riskCode: risk.risk_code,
        minConfidence: 70,
      }),
    }
  );

  return await response.json();
}
```

---

### Priority 2: Restore RSS Automation

**Option A:** Port old MinRisk RSS scanner
- Copy `api/scan-news.js` logic
- Adapt to NEW-MINRISK architecture
- Deploy as Supabase Edge Function or Vercel Serverless Function

**Option B:** Build new RSS scanner using old as baseline
- Use same RSS sources (9+ feeds)
- Implement same keyword pre-filtering (100+ keywords)
- Add deduplication logic
- Deploy with cron schedule

**Estimated Effort:** 2-3 days

---

### Priority 3: Add Keyword Fallback System

**Copy from old MinRisk:**
- 100+ keywords across 5 risk categories
- Cybersecurity, Regulatory, Market, Operational, Strategic
- Fallback confidence: 0.5 (medium)
- Triggered when Claude returns no matches

**Implementation:**
1. Create keyword mapping file (port from old MinRisk)
2. Update Edge Function to include fallback logic
3. Test with events that Claude might miss

**Estimated Effort:** 1 day

---

### Priority 4: Restore Enterprise Tooling

**Add missing features:**
- Bulk delete pending alerts
- Test alert creation
- Special actions (analyzeExisting, clearAll, etc.)
- User-level alert filtering (non-admin sees only THEIR risk alerts)

**Implementation:**
1. Port functions from old MinRisk `riskIntelligence.ts`
2. Update Intelligence Dashboard UI
3. Add admin troubleshooting panel

**Estimated Effort:** 2-3 days

---

### Priority 5: Verify Table Schema

**Check which table exists:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('risk_intelligence_alerts', 'intelligence_alerts');
```

**If mismatch:**
- Rename table to match old schema
- OR update all queries to use new table name consistently

---

## Migration Path

### Phase 1: Security Fix (Day 1 - URGENT)
- Remove frontend Claude API calls
- Use ONLY Edge Function for AI analysis
- Deploy and verify

### Phase 2: RSS Automation (Week 1)
- Port RSS scanner from old MinRisk
- Implement as Edge Function
- Add cron schedule (daily)
- Test with real RSS feeds

### Phase 3: Keyword Fallback (Week 1)
- Port keyword system from old MinRisk
- Integrate into Edge Function
- Test fallback logic

### Phase 4: Enterprise Features (Week 2)
- Add bulk operations
- Add test alerts
- Add special actions
- Add user-level filtering
- Update UI

### Phase 5: Production Ready (Week 2-3)
- Full end-to-end testing
- Performance optimization
- Documentation
- User training

---

## Success Metrics

System will be "working excellently" again when:

1. **Automated:** RSS feeds scanned daily without user action
2. **Secure:** No frontend API key exposure
3. **Reliable:** Keyword fallback catches what AI misses
4. **Efficient:** 97% cost reduction via pre-filtering
5. **Complete:** All enterprise tooling restored
6. **Performant:** User-level filtering, no unnecessary data loading
7. **Auditable:** Full treatment log with undo capability

---

## Conclusion

The old MinRisk Risk Intelligence System "worked excellently" because it was a **fully-featured, automated, enterprise-grade solution**.

The NEW-MINRISK implementation is currently a **manual-entry MVP** with critical features missing and a security vulnerability.

**To restore excellence:**
1. Fix security issue (frontend API calls) - URGENT
2. Restore RSS automation
3. Add keyword fallback system
4. Restore enterprise tooling
5. Verify and fix table schema

**Estimated Total Effort:** 2-3 weeks for full restoration

**Recommended Approach:** Use old MinRisk as the **baseline architecture** and port features systematically to NEW-MINRISK.
