# Risk Intelligence System - Strategic Implementation Plan
## The Bible for NEW-MINRISK Intelligence Development

**Date Created:** 2025-12-08
**Status:** AUTHORITATIVE GUIDE
**Approach:** Stabilize → Restore → Evolve
**Timeline:** 14 weeks (3.5 months)

---

## Table of Contents

1. [Strategic Context](#strategic-context)
2. [Why Old MinRisk "Worked Excellently"](#why-old-minrisk-worked-excellently)
3. [Why NEW-MINRISK Is "Running Poorly"](#why-new-minrisk-is-running-poorly)
4. [Critical Realizations](#critical-realizations)
5. [Integration Priority Ranking](#integration-priority-ranking)
6. [Why Option B (Not Option A)](#why-option-b-not-option-a)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Success Criteria](#success-criteria)
9. [Architectural Principles](#architectural-principles)

---

## Strategic Context

### The Fundamental Question

**Should NEW-MINRISK restore the old Intelligence System 1:1, or evolve it into something more integrated, scalable, and aligned with modern MinRisk architecture?**

### The Answer

**BOTH — but in sequence:**
1. **First:** Restore baseline functionality (security + RSS automation)
2. **Then:** Evolve with deep integrations (KRI → Incident → Appetite → Controls → Regulator)

### Why This Approach

NEW-MINRISK is a **platform rebuild**, not a code migration:
- New UI architecture (React 18, TypeScript, Vite)
- New backend (Supabase, not Firebase)
- New auth system (RLS, profiles, roles)
- New module structure (clean separation)
- New deployment (Render, Edge Functions)

**Blindly replicating old code would be architectural regression.**
**But jumping to integrations on unstable foundations would be architectural suicide.**

---

## Why Old MinRisk "Worked Excellently"

The old implementation fully matched the specification and user expectations:

### ✅ **Automated Intelligence Gathering**
- **9+ RSS feeds** (CBN, SEC Nigeria, FMDQ, BusinessDay, Guardian, US-CERT, SANS, UN Environment, Premium Times)
- **Daily cron job** (Vercel Serverless Function scheduled)
- **Keyword pre-filtering** (100+ keywords across 5 risk categories: Cybersecurity, Regulatory, Market, Operational, Strategic)
- **Deduplication** (URL + title matching within 7-day window)
- **Zero user intervention** (hands-free operation)

**Result:** Continuous, automated risk monitoring

### ✅ **Intelligent Cost Optimization**
- **97% cost reduction** via keyword pre-filter
- **$450/month with pre-filtering** vs **$22,500/month without**
- Only high-value events sent to Claude AI

**Result:** Enterprise-scale operation at reasonable cost

### ✅ **Robust Fallback System**
If Claude AI didn't match an event:
- **100+ keyword patterns** automatically triggered
- Categories covered:
  - **Cybersecurity:** ransomware, breach, phishing, malware, zero-day, etc.
  - **Regulatory:** compliance, SEC, CBN, regulatory, circular, directive, etc.
  - **Market:** volatility, crash, inflation, devaluation, forex, interest rate, etc.
  - **Operational:** outage, failure, disruption, fraud, error, etc.
  - **Strategic:** merger, acquisition, competition, market entry, etc.

**Result:** Zero missed critical events

### ✅ **Server-Side AI Only**
- API calls from **Vercel Edge Function** (`api/scan-news.js`)
- Used `process.env.ANTHROPIC_API_KEY` (backend environment variable)
- **Never exposed API key to browser**

**Result:** Secure, compliant, production-grade

### ✅ **Enterprise Workflow**
1. **Alert Created** → User sees in Intelligence Dashboard
2. **User Accepts** → Goes to Treatment Log (NOT auto-applied)
3. **User Reviews Treatment Log** → Decides when/how to apply
4. **User Applies to Risk** → Updates risk register with notes
5. **Audit Trail** → Full history of who did what and when

**Result:** Controlled, documented risk updates

### ✅ **User-Level Filtering**
- **Admin users:** See ALL org risk alerts
- **Regular users:** See ONLY alerts for THEIR risks
- Performance optimized (no unnecessary data loading)

**Result:** Relevant, fast, secure

### ✅ **Comprehensive Tooling**
Special actions for troubleshooting:
- `analyzeExisting` - Reprocess unanalyzed events
- `testAlert` - Create test alert to verify system
- `clearUnanalyzed` - Clean up failed events
- `clearAll` - Complete reset
- `resetAnalysis` - Re-run analysis

**Result:** Easy debugging and system verification

---

## Why NEW-MINRISK Is "Running Poorly"

NEW-MINRISK was built as an **MVP for manual event entry with auto-scan**. It violates the specification and baseline expectations:

### ❌ **No RSS Automation**
**Missing:**
- RSS feed integration
- Automated scanning
- Cron job scheduling

**Impact:**
- Users must manually find and add every event
- Low adoption, incomplete coverage, user fatigue
- No continuous monitoring

### ❌ **CRITICAL SECURITY VULNERABILITY**
**Problem:**
- Frontend code (`src/lib/riskIntelligence.ts:474-580`) calls Claude API directly
- `import.meta.env.VITE_ANTHROPIC_API_KEY` exposes API key in browser
- Anyone can extract key from DevTools and abuse it

**Impact:**
- Production security issue
- Compliance risk
- Potential for unauthorized API usage and unexpected costs

### ❌ **No Keyword Fallback**
**Missing:**
- Keyword matching system
- Fallback when AI fails

**Impact:**
- If Claude API is down, has rate limits, or returns no matches → **zero alerts created**
- Unreliable intelligence coverage

### ❌ **No User-Level Filtering**
**Problem:**
- `getIntelligenceAlertsByStatus()` loads ALL alerts for ALL users
- No filtering by user's risk codes

**Impact:**
- Performance issues (loading irrelevant data)
- Users see alerts for risks they don't own
- Confusing UX

### ❌ **Missing Enterprise Tooling**
**Missing:**
- Bulk delete pending alerts
- Test alert creation
- Special troubleshooting actions
- Observability tools

**Impact:**
- Hard to manage false positives
- Difficult to verify system works
- No debugging capabilities

### ❌ **Table Name Mismatch**
**Problem:**
- OLD: `risk_intelligence_alerts`
- NEW: `intelligence_alerts`

**Impact:**
- Schema inconsistency
- Query mismatches if old schema expected

---

## Critical Realizations

### 1. NEW-MINRISK Is A Rebuild, Not A Port

**This changes everything:**
- Comparing NEW-MINRISK to OLD-MINRISK is apples to oranges
- NEW-MINRISK has modern architecture that enables:
  - Event-driven intelligence
  - Deep cross-module integration (KRI, Incident, Appetite)
  - Real-time responsiveness
  - Scalable, cloud-native architecture
  - Multi-tenant intelligence with sector awareness

**Replicating the old system would be architectural regression.**

### 2. But NEW-MINRISK Is Not Stable Enough For Integrations Yet

**Reality check:**
- Foundation is still being tightened (RLS, access control, DIME, KRI UI, incidents)
- Core modules are not fully mature
- Building KRI/Incident integrations now = regression hell
- Cannot evolve a moving target

**Jumping to integrations before stabilizing = architectural suicide.**

### 3. The Correct Path Is: Stabilize → Restore → Evolve

**Not:**
- ❌ Port old code exactly (regression)
- ❌ Jump to integrations immediately (instability)

**But:**
- ✅ Fix security + stabilize foundation
- ✅ Restore baseline RSS automation
- ✅ THEN build integrations on stable base

---

## Integration Priority Ranking

When integrations are built (AFTER stabilization), this is the sequence:

### 🥇 **Priority #1: KRI Auto-Triggering**

**Why this MUST be first:**
- ✅ **Highest regulatory value** - CBN, SEC, Basel frameworks expect KRI monitoring
- ✅ **Immediate client value** - Quantifiable, measurable impact
- ✅ **Clear data structure** - KRI thresholds are numeric, intelligence changes are quantifiable
- ✅ **Direct risk measurement** - Not subjective, not theoretical
- ✅ **Makes intelligence operational** - System DOES something, not just shows data

**What it enables:**
```
External Event: "CBN raises interest rate to 18%"
    ↓
Intelligence Analysis: Affects "MKT-FIN-003: Interest rate volatility"
    ↓
KRI Check: "Interest Rate Delta" threshold = 2%, current = 1.5%
    ↓
ACTION: Update KRI to 3% → Auto-trigger breach alert
    ↓
Risk Manager notification: "KRI breach detected due to CBN policy change"
```

**Strategic Impact:**
- Transforms MinRisk from dashboard → decision engine
- Creates audit trail of intelligence-driven actions
- Builds trust in AI analysis (quantifiable outcomes)
- Regulators see: *"This organization knows what's happening before we do"*

---

### 🥈 **Priority #2: Incident Auto-Creation**

**Why this follows KRI naturally:**
- ✅ **KRI = Forward-looking** (leading indicators)
- ✅ **Incident = Backward-looking** (actualized events)
- ✅ **Together = Complete risk picture**

**What it enables:**
```
External Event: "Ransomware attack on Nigerian bank reported"
    ↓
Intelligence Analysis: Relevant to "CYB-SEC-001: Ransomware risk"
    ↓
ACTION 1: Check KRI "Cyber Incident Frequency" → Update counter
    ↓
ACTION 2: Auto-create incident draft
    ↓
Incident Manager: "Draft incident created from intelligence alert"
    ↓
User reviews, confirms, adds details → Incident logged
```

**Why this matters for regulators:**
- OpRisk frameworks (Basel II/III) **require** incident logging
- Intelligence → Incident shows external awareness
- Creates audit trail: "We saw this threat, logged it, treated it"

**Strategic Impact:**
- Makes intelligence actionable immediately
- Reduces manual incident creation burden
- Shows supervisory maturity

---

### 🥉 **Priority #3: Appetite Tracking**

**Why this is #3, not #1:**
- ⚠️ **Requires stable KRI + Incident data** to be meaningful
- ⚠️ **Board-level feature**, not operational
- ⚠️ **Quarterly/annual review** cycle, not daily
- ⚠️ **Abstract concept** for most users

**But still critical because:**
- ✅ **Regulatory expectation** (ORSA, ICAAP, RAF)
- ✅ **Executive visibility** (shows how environment affects strategy)
- ✅ **Governance signal** (intelligence → appetite = mature risk culture)

**What it enables:**
```
Multiple cybersecurity incidents → Likelihood increases → Residual risk rises
    ↓
System calculates: "Cyber risk exposure increased from $2M to $3.5M"
    ↓
Appetite dashboard: "Cyber appetite consumption: 85% (was 70%)"
    ↓
Board sees: "External threat environment affecting our risk appetite"
```

**Strategic Impact:**
- Elevates MinRisk to board-level tool
- Shows dynamic risk environment
- Enables appetite breach alerts

---

### 4️⃣ **Priority #4: Control Recommendations**

**Why this is #4:**
- ⚠️ **Requires mature control library** taxonomy
- ⚠️ **AI recommendations need trust** (can't be first feature)
- ⚠️ **High noise potential** if not tuned
- ⚠️ **Variable by institution** (every org has different controls)

**But valuable as differentiator:**
- ✅ **Impressive demo feature**
- ✅ **Shows AI sophistication**
- ✅ **Reduces risk treatment burden**

**What it enables:**
```
Intelligence: "Ransomware attack on financial institution"
    ↓
AI Analysis: Suggests 4 controls
    ✓ Multi-factor authentication (matches: CTL-IAM-001)
    ✓ Offline backups (matches: CTL-BCP-003)
    ✓ Endpoint detection (matches: CTL-CYB-007)
    ✓ Security awareness training (matches: CTL-HR-012)
    ↓
User: "Click to link these controls to the affected risk"
```

**Strategic Impact:**
- Demonstrates AI value beyond pattern matching
- Accelerates risk treatment
- Creates control-risk linkage

**This is "wow factor feature", not core value proposition.**

---

### 5️⃣ **Priority #5: Regulator Dashboard**

**Why this MUST be last:**
- ❌ **Empty without upstream integrations**
- ❌ **Regulators will see through shallow dashboards**
- ❌ **Requires ALL data flows to be validated**
- ❌ **High expectations, low tolerance for errors**

**But massive strategic value:**
- ✅ **Differentiates MinRisk from competitors**
- ✅ **Enables multi-entity oversight**
- ✅ **Shows sector-wide risk trends**
- ✅ **Positions MinRisk as regulatory infrastructure**

**What it enables:**
```
Regulator logs in → Sees:
  ✓ Cross-entity KRI trends
  ✓ Sector-wide incident correlation
  ✓ Appetite consumption by institution
  ✓ Intelligence event impact analysis
  ✓ Root cause pattern detection
```

**Strategic Impact:**
- Positions MinRisk as industry standard
- Creates regulatory moat (switching cost)
- Enables supervisory early warning

**This is the crown jewel — but you don't build the crown before the skeleton.**

---

## Why Option B (Not Option A)

### Option A: Quick Security Fix → Full Evolution (REJECTED)

**Assumptions:**
- Foundation is firm
- Core modules are reliable
- Integrations won't introduce cascading bugs
- Incident module is mature
- KRI infrastructure is stable
- Intelligence module is architecturally isolated

**Reality:**
- ❌ **None of these are true yet**
- ❌ NEW-MINRISK is still tightening bolts (RLS, access control, DIME, KRI UI, incidents)
- ❌ Jumping to 12-week integration sprint = regression hell

**Risks:**
- Regressions in core features
- Developer context overload
- Architectural drift
- UX inconsistencies
- Troubleshooting hell

**Verdict:** ❌ **Not viable. Too much complexity too early.**

---

### Option B: Stabilize → Restore → Then Evolve (ACCEPTED)

**Approach:**
1. **Week 1:** Fix security + stabilize foundation
2. **Week 2-3:** Restore RSS automation + verify stable
3. **Week 4+:** Build integrations in priority order

**Why this is the ONLY defensible path:**

1️⃣ **Cannot evolve a moving target**
- Building KRI auto-triggering on unstable intelligence/incident pipeline = architectural suicide

2️⃣ **Must re-establish working baseline**
- RSS automation + keyword fallback = predictable behavior
- Predictable behavior = dependable triggers
- Dependable triggers = safe integration

3️⃣ **Security MUST be fixed before any expansion**
- No regulator will take MinRisk seriously with API key exposed

4️⃣ **Need observability before complexity**
- Bulk delete, test tools, logs, filtering = non-negotiable foundations

5️⃣ **Dev velocity will collapse if you skip stabilization**
- Evolving on weak foundations means each new feature breaks three others

**Verdict:** ✅ **This is the correct path. Not negotiable.**

---

## Implementation Roadmap

### 🔧 **PHASE 0: Stabilization (Week 1)**

**Goal:** Fix critical security issue and stabilize foundation

#### Day 1: URGENT Security Fix

**Problem:**
- `src/lib/riskIntelligence.ts:474-580` - Frontend calling Claude API directly
- `import.meta.env.VITE_ANTHROPIC_API_KEY` exposed in browser

**Fix:**
1. **Remove** `analyzeEventRelevance()` function from frontend (lines 474-580)
2. **Use ONLY** Edge Function `analyze-intelligence` for all AI analysis
3. Update `scanRisksForRelevantEvents()` to call Edge Function instead of frontend API
4. Test thoroughly
5. Deploy immediately

**Code Changes:**
```typescript
// DELETE THIS ENTIRE FUNCTION (lines 474-580 in src/lib/riskIntelligence.ts)
export async function analyzeEventRelevance() { ... }

// REPLACE with Edge Function call
export async function analyzeEventRelevance(event, risk) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { data: null, error: new Error('Not authenticated') };
  }

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

  if (!response.ok) {
    return { data: null, error: new Error(`Analysis failed: ${response.statusText}`) };
  }

  return await response.json();
}
```

**Verification:**
- ✅ No `VITE_ANTHROPIC_API_KEY` references in frontend code
- ✅ All AI analysis goes through Edge Function
- ✅ Browser DevTools shows no API key exposure
- ✅ Test event analysis works end-to-end

**Outcome:** ✅ Production security vulnerability eliminated

---

#### Day 2-3: Table Schema Verification

**Check:**
```sql
-- Verify which table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('risk_intelligence_alerts', 'intelligence_alerts');

-- Check columns match specification
\d intelligence_alerts  -- or risk_intelligence_alerts
```

**If mismatch:**
- Option A: Rename table to match spec (`risk_intelligence_alerts`)
- Option B: Update all queries to use current name consistently

**Decision:** Use `intelligence_alerts` (current) and update documentation

**Outcome:** ✅ Schema clarity established

---

#### Day 4-5: User-Level Filtering

**Problem:**
- `getIntelligenceAlertsByStatus()` loads ALL alerts
- No filtering by user's risk codes

**Fix:**
```typescript
export async function getIntelligenceAlertsByStatus(
  status: 'pending' | 'accepted' | 'rejected'
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Get user profile (for role + org)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { data: null, error: new Error('Profile not found') };
    }

    // Get user's risk codes
    let riskCodesQuery = supabase
      .from('risks')
      .select('risk_code')
      .eq('organization_id', profile.organization_id);

    // Filter by user's risks (unless admin)
    if (!['primary_admin', 'secondary_admin', 'super_admin'].includes(profile.role)) {
      riskCodesQuery = riskCodesQuery.eq('owner_id', user.id);
    }

    const { data: userRisks, error: risksError } = await riskCodesQuery;

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    if (!userRisks || userRisks.length === 0) {
      return { data: [], error: null }; // User has no risks
    }

    const riskCodes = userRisks.map(r => r.risk_code);

    // Load alerts for user's risk codes only
    const { data, error } = await supabase
      .from('intelligence_alerts')
      .select(`*, external_events (*)`)
      .eq('status', status)
      .in('risk_code', riskCodes)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
```

**Outcome:** ✅ Users see only relevant alerts, performance optimized

---

#### Day 6-7: Basic Enterprise Tooling

**Add:**

1. **Bulk Delete Pending Alerts**
```typescript
export async function bulkDeletePendingAlerts(): Promise<{
  success: boolean;
  count: number;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, count: 0, error: new Error('Not authenticated') };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, count: 0, error: new Error('Profile not found') };
    }

    // Count pending alerts
    const { count } = await supabase
      .from('intelligence_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .eq('status', 'pending');

    // Delete all pending alerts
    const { error } = await supabase
      .from('intelligence_alerts')
      .delete()
      .eq('organization_id', profile.organization_id)
      .eq('status', 'pending');

    if (error) {
      return { success: false, count: 0, error: new Error(error.message) };
    }

    return { success: true, count: count || 0, error: null };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
```

2. **Test Alert Creation**
```typescript
export async function createTestAlert(): Promise<{
  success: boolean;
  alertId: string | null;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, alertId: null, error: new Error('Not authenticated') };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, alertId: null, error: new Error('Profile not found') };
    }

    // Get a risk to link to
    const { data: risks } = await supabase
      .from('risks')
      .select('risk_code')
      .eq('organization_id', profile.organization_id)
      .limit(1);

    if (!risks || risks.length === 0) {
      return {
        success: false,
        alertId: null,
        error: new Error('No risks found to link test alert'),
      };
    }

    // Create test event
    const { data: event } = await supabase
      .from('external_events')
      .insert({
        organization_id: profile.organization_id,
        source: 'TEST',
        event_type: 'Test Event',
        title: 'Test Intelligence Alert',
        summary: 'This is a test event to verify the intelligence system works.',
        url: null,
        published_date: new Date().toISOString(),
        relevance_checked: true,
      })
      .select()
      .single();

    if (!event) {
      return {
        success: false,
        alertId: null,
        error: new Error('Failed to create test event'),
      };
    }

    // Create test alert
    const { data: alert, error: alertError } = await supabase
      .from('intelligence_alerts')
      .insert({
        organization_id: profile.organization_id,
        event_id: event.id,
        risk_code: risks[0].risk_code,
        is_relevant: true,
        confidence_score: 85,
        likelihood_change: 1,
        impact_change: 0,
        ai_reasoning: 'This is a test alert created to verify the intelligence system.',
        status: 'pending',
        applied_to_risk: false,
      })
      .select()
      .single();

    if (alertError || !alert) {
      return {
        success: false,
        alertId: null,
        error: new Error('Failed to create test alert'),
      };
    }

    return { success: true, alertId: alert.id, error: null };
  } catch (err) {
    return {
      success: false,
      alertId: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
```

3. **Add UI Buttons in Intelligence Dashboard**
```typescript
// In RiskIntelligenceManagement.tsx

import { bulkDeletePendingAlerts, createTestAlert } from '../../lib/riskIntelligence';

// Add state
const [bulkDeleting, setBulkDeleting] = useState(false);
const [creatingTest, setCreatingTest] = useState(false);

// Bulk delete handler
const handleBulkDelete = async () => {
  if (!confirm('Delete all pending alerts? This cannot be undone.')) return;

  setBulkDeleting(true);
  const { success, count, error } = await bulkDeletePendingAlerts();

  if (success) {
    alert(`Deleted ${count} pending alerts`);
    loadAlerts(); // Refresh list
  } else {
    alert(`Error: ${error?.message}`);
  }
  setBulkDeleting(false);
};

// Test alert handler
const handleCreateTest = async () => {
  setCreatingTest(true);
  const { success, alertId, error } = await createTestAlert();

  if (success) {
    alert('Test alert created successfully');
    loadAlerts(); // Refresh list
  } else {
    alert(`Error: ${error?.message}`);
  }
  setCreatingTest(false);
};

// Add buttons in header
<div className="flex gap-2">
  <Button onClick={handleBulkDelete} disabled={bulkDeleting} variant="destructive" size="sm">
    {bulkDeleting ? 'Deleting...' : 'Delete All Pending'}
  </Button>
  <Button onClick={handleCreateTest} disabled={creatingTest} variant="outline" size="sm">
    {creatingTest ? 'Creating...' : 'Create Test Alert'}
  </Button>
</div>
```

**Outcome:** ✅ Observability and troubleshooting tools in place

---

#### Week 1 Summary

**Completed:**
- ✅ Security vulnerability fixed (frontend API calls removed)
- ✅ Table schema verified and documented
- ✅ User-level filtering implemented
- ✅ Bulk delete pending alerts added
- ✅ Test alert creation added
- ✅ Basic observability tools in place

**Outcome:** ✅ System is secure, stable, and usable

---

### 📡 **PHASE 1: Restore Intelligence Baseline (Week 2-3)**

**Goal:** Restore RSS automation + keyword fallback to match old MinRisk baseline

#### Week 2: RSS Scanner Implementation

**Architecture:**
```
RSS Feeds (9 sources) → Parse → Deduplicate → Store → Trigger Analysis
```

**Create Edge Function:** `supabase/functions/scan-rss-feeds/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// RSS Sources (Nigerian focus + global security)
const RSS_SOURCES = [
  // Nigerian Regulatory
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
  // Nigerian News
  {
    name: 'BusinessDay Nigeria',
    url: 'https://businessday.ng/feed/',
    category: 'market',
    country: 'Nigeria'
  },
  {
    name: 'The Guardian Nigeria',
    url: 'https://guardian.ng/feed/',
    category: 'operational',
    country: 'Nigeria'
  },
  {
    name: 'Premium Times',
    url: 'https://www.premiumtimesng.com/feed',
    category: 'operational',
    country: 'Nigeria'
  },
  // Global Security
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
  // Environmental
  {
    name: 'UN Environment',
    url: 'https://www.unep.org/news-and-stories/rss.xml',
    category: 'environmental',
    country: 'Global'
  }
];

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get organization ID from request (or scan for all orgs)
    const { organizationId } = await req.json();

    let eventsStored = 0;
    let errors: string[] = [];

    // Fetch each RSS feed
    for (const source of RSS_SOURCES) {
      try {
        console.log(`Fetching RSS from ${source.name}...`);

        const response = await fetch(source.url);
        if (!response.ok) {
          errors.push(`Failed to fetch ${source.name}: ${response.statusText}`);
          continue;
        }

        const xmlText = await response.text();

        // Parse XML (basic parsing for RSS 2.0 format)
        const items = parseRSSItems(xmlText);

        console.log(`Found ${items.length} items from ${source.name}`);

        // Store events
        for (const item of items) {
          // Check for duplicates
          const { data: existing } = await supabase
            .from('external_events')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('title', item.title)
            .eq('source', source.name)
            .maybeSingle();

          if (existing) {
            console.log(`Skipping duplicate: ${item.title}`);
            continue;
          }

          // Insert new event
          const { error: insertError } = await supabase
            .from('external_events')
            .insert({
              organization_id: organizationId,
              source: source.name,
              event_type: source.category,
              title: item.title,
              summary: item.description,
              url: item.link,
              published_date: item.pubDate,
              relevance_checked: false,
            });

          if (insertError) {
            errors.push(`Failed to insert ${item.title}: ${insertError.message}`);
          } else {
            eventsStored++;
          }
        }
      } catch (err) {
        errors.push(`Error processing ${source.name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventsStored,
        sourcesScanned: RSS_SOURCES.length,
        errors: errors.length > 0 ? errors : null,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Basic RSS parser (supports RSS 2.0)
function parseRSSItems(xmlText: string): Array<{
  title: string;
  description: string;
  link: string;
  pubDate: string;
}> {
  const items: any[] = [];

  // Extract items using regex (simple approach for RSS 2.0)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const matches = xmlText.matchAll(itemRegex);

  for (const match of matches) {
    const itemXml = match[1];

    const title = extractTag(itemXml, 'title');
    const description = extractTag(itemXml, 'description');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');

    if (title && pubDate) {
      items.push({
        title: stripCDATA(title),
        description: stripCDATA(description) || '',
        link: link || '',
        pubDate: new Date(pubDate).toISOString(),
      });
    }
  }

  return items;
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '');
}
```

**Deploy:**
```bash
npx supabase functions deploy scan-rss-feeds --project-ref qrxwgjjgaekalvaqzpuf
```

**Set up daily cron job** (via Supabase Dashboard or cron service):
- Schedule: Daily at 2 AM
- Endpoint: `https://qrxwgjjgaekalvaqzpuf.supabase.co/functions/v1/scan-rss-feeds`
- Payload: `{ "organizationId": "..." }`

**Outcome:** ✅ RSS feeds scanned daily, events stored automatically

---

#### Week 3: Keyword Fallback System

**Add to Edge Function** `analyze-intelligence/index.ts`:

```typescript
// Keyword patterns (100+ keywords across 5 categories)
const KEYWORD_FALLBACK = {
  cybersecurity: [
    'ransomware', 'malware', 'phishing', 'breach', 'hack', 'cyber attack',
    'data leak', 'vulnerability', 'zero-day', 'ddos', 'botnet', 'trojan',
    'spyware', 'exploit', 'security patch', 'firewall', 'encryption',
    'authentication', 'credential', 'password', 'two-factor', 'endpoint',
  ],
  regulatory: [
    'regulation', 'compliance', 'regulatory', 'directive', 'circular',
    'cbn', 'sec', 'fmdq', 'basel', 'amendment', 'policy', 'guideline',
    'requirement', 'supervision', 'enforcement', 'penalty', 'sanction',
    'audit', 'inspection', 'reporting', 'disclosure', 'mandate',
  ],
  market: [
    'volatility', 'crash', 'recession', 'inflation', 'devaluation',
    'interest rate', 'forex', 'exchange rate', 'currency', 'naira',
    'dollar', 'liquidity', 'market risk', 'credit risk', 'default',
    'bond yield', 'equity', 'commodity', 'oil price', 'trading halt',
  ],
  operational: [
    'outage', 'failure', 'disruption', 'fraud', 'error', 'incident',
    'system down', 'power outage', 'network', 'downtime', 'service',
    'business continuity', 'disaster recovery', 'backup', 'contingency',
    'operational risk', 'process failure', 'human error', 'technology',
  ],
  strategic: [
    'merger', 'acquisition', 'competition', 'market entry', 'partnership',
    'strategy', 'expansion', 'restructuring', 'divestment', 'consolidation',
    'market share', 'innovation', 'digital transformation', 'fintech',
    'disrupt', 'new entrant', 'regulatory change', 'political risk',
  ],
};

// Fallback matching function
function checkKeywordMatch(
  eventTitle: string,
  eventSummary: string,
  riskCategory: string
): { matched: boolean; confidence: number; reason: string } {
  const text = `${eventTitle} ${eventSummary}`.toLowerCase();

  // Get keywords for risk category
  const categoryMap: Record<string, keyof typeof KEYWORD_FALLBACK> = {
    'Cybersecurity': 'cybersecurity',
    'Regulatory': 'regulatory',
    'Market Risk': 'market',
    'Operational Risk': 'operational',
    'Strategic Risk': 'strategic',
  };

  const fallbackCategory = categoryMap[riskCategory];
  if (!fallbackCategory) {
    return { matched: false, confidence: 0, reason: 'No keyword category mapping' };
  }

  const keywords = KEYWORD_FALLBACK[fallbackCategory];
  const matchedKeywords = keywords.filter(keyword => text.includes(keyword));

  if (matchedKeywords.length > 0) {
    return {
      matched: true,
      confidence: 0.5 + (matchedKeywords.length * 0.1), // 50% + 10% per keyword
      reason: `Keyword match: ${matchedKeywords.join(', ')}`,
    };
  }

  return { matched: false, confidence: 0, reason: 'No keyword match' };
}

// Use in main analysis flow
async function analyzeEvent(event, risks) {
  // Try AI analysis first
  const aiAnalysis = await callClaudeAPI(event, risks);

  if (aiAnalysis && aiAnalysis.confidence > 0.7) {
    // High confidence AI result, use it
    return aiAnalysis;
  }

  // AI failed or low confidence - try keyword fallback
  console.log('AI analysis inconclusive, trying keyword fallback...');

  for (const risk of risks) {
    const fallbackResult = checkKeywordMatch(
      event.title,
      event.summary || '',
      risk.category
    );

    if (fallbackResult.matched) {
      console.log(`Fallback match for risk ${risk.risk_code}: ${fallbackResult.reason}`);

      return {
        risk_code: risk.risk_code,
        is_relevant: true,
        confidence: fallbackResult.confidence,
        likelihood_change: 1, // Conservative +1
        impact_change: 0,
        reasoning: `FALLBACK MATCH: ${fallbackResult.reason}`,
      };
    }
  }

  return null; // No match
}
```

**Outcome:** ✅ Keyword fallback ensures no critical events are missed

---

#### Week 2-3 Summary

**Completed:**
- ✅ RSS scanner Edge Function deployed
- ✅ 9 RSS sources configured (Nigerian + global)
- ✅ Daily cron job scheduled
- ✅ Deduplication logic implemented
- ✅ Keyword fallback system (100+ keywords, 5 categories)
- ✅ AI + fallback analysis flow working

**Outcome:** ✅ Feature parity with old MinRisk baseline

---

### 🎯 **PHASE 2: KRI Auto-Triggering (Week 4-5)**

**Goal:** First intelligence integration - KRI auto-triggering

**Architecture:**
```
Intelligence Alert Applied → Update Risk → Check KRIs → Create KRI Alert (if breach)
```

**Implementation:** See detailed implementation in Priority #1 section above

**Outcome:** ✅ Intelligence → KRI → Alert working end-to-end

---

### 🎯 **PHASE 3: Incident Auto-Creation (Week 6-7)**

**Goal:** Second intelligence integration - incident draft auto-creation

**Architecture:**
```
High-Confidence Intelligence Event → Create Incident Draft → User Reviews → Finalize
```

**Implementation:** See detailed implementation in Priority #2 section above

**Outcome:** ✅ Intelligence → Incident → Operational workflow complete

---

### 🎯 **PHASE 4: Appetite Tracking (Week 8-9)**

**Goal:** Third intelligence integration - appetite consumption tracking

**Implementation:** See detailed implementation in Priority #3 section above

**Outcome:** ✅ Intelligence → Appetite → Board visibility

---

### 🎯 **PHASE 5: Control Recommendations (Week 10-11)**

**Goal:** Fourth intelligence integration - AI-suggested controls

**Implementation:** See detailed implementation in Priority #4 section above

**Outcome:** ✅ Intelligence → Control recommendations → Treatment acceleration

---

### 🎯 **PHASE 6: Regulator Dashboard (Week 12-14)**

**Goal:** Final intelligence integration - cross-entity regulator view

**Implementation:** See detailed implementation in Priority #5 section above

**Outcome:** ✅ Crown jewel complete - full regulatory visibility

---

## Success Criteria

The Risk Intelligence System will be "working excellently" again when:

### ✅ **Phase 0-1 Success (Weeks 1-3):**
1. **Secure:** No frontend API key exposure
2. **Automated:** RSS feeds scanned daily without user action
3. **Reliable:** Keyword fallback catches what AI misses
4. **Efficient:** 97% cost reduction via pre-filtering (when implemented)
5. **Performant:** User-level filtering, no unnecessary data loading
6. **Observable:** Bulk delete, test alerts, troubleshooting tools work

### ✅ **Phase 2-6 Success (Weeks 4-14):**
7. **Integrated - KRI:** Intelligence events trigger KRI threshold checks automatically
8. **Integrated - Incident:** High-confidence events create incident drafts automatically
9. **Integrated - Appetite:** Risk changes update appetite consumption in real-time
10. **Integrated - Controls:** AI suggests controls mapped to library
11. **Integrated - Regulator:** Cross-entity intelligence view available
12. **Auditable:** Full audit trail of intelligence-driven actions

### ✅ **Overall System Success:**
- ✅ Continuous automated monitoring (no user intervention)
- ✅ Zero security vulnerabilities
- ✅ Deep integration with KRI, Incident, Appetite modules
- ✅ Enterprise-grade tooling and observability
- ✅ Regulator-credible audit trails
- ✅ Board-level appetite visibility
- ✅ Scalable, cloud-native architecture

---

## Architectural Principles

### 1. **Stability Before Evolution**
- Never build integrations on unstable foundations
- Stabilize → Restore → Evolve (in that order)
- Cannot evolve a moving target

### 2. **Security First**
- No frontend API calls to Claude
- All AI analysis via server-side Edge Functions
- API keys in backend environment variables only
- Zero tolerance for exposed secrets

### 3. **Modularity & Isolation**
- Intelligence system should work standalone
- Integrations should be optional, not required
- Failures in one module should not cascade
- Clear boundaries between modules

### 4. **Event-Driven Architecture**
- Intelligence events trigger actions (not polls)
- KRI checks triggered by intelligence (not scheduled)
- Incident drafts created by high-confidence events
- Real-time updates, not batch processing

### 5. **User-Level Data Filtering**
- Regular users see only THEIR risk alerts
- Admin users see ALL org risk alerts
- Performance optimized (load only relevant data)
- Clear role-based access control

### 6. **Observability & Debugging**
- Bulk operations for management
- Test tools for verification
- Comprehensive logging
- Audit trails for compliance

### 7. **AI with Fallback**
- Primary: Claude AI analysis
- Fallback: Keyword matching (100+ patterns)
- Never rely solely on external API
- Graceful degradation if AI fails

### 8. **Cost Optimization**
- Keyword pre-filtering before AI analysis
- Batch processing where possible
- Cache results appropriately
- Monitor API usage

### 9. **Regulatory Compliance**
- Full audit trail of all actions
- Intelligence-driven actions logged
- User attribution for all changes
- Timestamps for all events

### 10. **Scalable & Cloud-Native**
- Edge Functions for serverless processing
- Cron jobs for automated scanning
- Database-driven configuration
- Horizontal scaling ready

---

## Document Status

**Version:** 1.0
**Last Updated:** 2025-12-08
**Status:** ACTIVE - This is the authoritative guide
**Next Review:** After Phase 1 completion (Week 3)

**Approval:**
- [x] Strategic approach validated
- [x] Implementation sequence confirmed
- [x] Integration priorities ranked
- [x] Security requirements defined

**This document is THE BIBLE for Risk Intelligence System development.**

All implementation decisions must align with the principles and roadmap defined here.

---

**END OF STRATEGIC DOCUMENT**
