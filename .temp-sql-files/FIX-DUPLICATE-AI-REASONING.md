# Fix: Duplicate AI Reasoning Across Multiple Risks

**Date:** 2025-12-11
**Issue:** All alerts from the same event were showing identical generic AI reasoning
**Status:** ✅ FIXED

---

## Problem Description

When "Scan for Threats" created alerts for a single event affecting multiple risks, **all alerts showed the same generic reasoning**.

### Example (OLD BEHAVIOR - Bug):
Event: "West Africa Political Instability"

- Risk OPS-005 Alert: "Political instability increases operational disruption risks..."
- Risk OPS-006 Alert: "Political instability increases operational disruption risks..." (SAME!)
- Risk OPS-007 Alert: "Political instability increases operational disruption risks..." (SAME!)

All three alerts had **identical** AI reasoning, suggested controls, and impact assessments.

---

## Root Cause

The `analyze-intelligence` Edge Function was calling Claude AI **once per event**, getting a single analysis with:
- One generic `reasoning` string
- One array of `risk_codes`
- One set of `suggested_controls`
- One `impact_assessment`

Then it looped through all the risk codes and created **separate alerts** for each, but they all got the **same analysis data**.

### Code Location
File: `supabase/functions/analyze-intelligence/index.ts`

**Old Logic:**
```typescript
// Single AI call returns generic analysis
const analysis = await analyzeEventRelevance(event, risks, claudeApiKey)
// { reasoning: "generic text", risk_codes: ["OPS-005", "OPS-006"], ... }

// Loop creates multiple alerts with SAME reasoning
for (const riskCode of analysis.risk_codes) {
  const alert = {
    risk_code: riskCode,
    ai_reasoning: analysis.reasoning,  // ❌ SAME for all
    suggested_controls: analysis.suggested_controls,  // ❌ SAME for all
    impact_assessment: analysis.impact_assessment  // ❌ SAME for all
  }
}
```

---

## Solution

Updated the AI prompt to return **risk-specific analysis** for each affected risk in a structured format.

### New Prompt Structure
The AI now returns:
```json
{
  "is_relevant": true,
  "confidence": 85,
  "risk_analyses": [
    {
      "risk_code": "OPS-005",
      "reasoning": "Specific explanation for OPS-005...",
      "likelihood_change": 1,
      "impact_change": 0,
      "suggested_controls": ["Control for OPS-005...", "..."],
      "impact_assessment": "Impact specific to OPS-005..."
    },
    {
      "risk_code": "OPS-006",
      "reasoning": "Different reasoning for OPS-006...",
      "likelihood_change": 1,
      "impact_change": 1,
      "suggested_controls": ["Control for OPS-006...", "..."],
      "impact_assessment": "Impact specific to OPS-006..."
    }
  ]
}
```

### Updated Code
The `createRiskAlerts` function now processes each risk-specific analysis:

```typescript
// Loop through risk-specific analyses
for (const riskAnalysis of analysis.risk_analyses) {
  const alert = {
    risk_code: riskAnalysis.risk_code,
    ai_reasoning: riskAnalysis.reasoning,  // ✅ UNIQUE per risk
    suggested_controls: riskAnalysis.suggested_controls,  // ✅ TAILORED
    impact_assessment: riskAnalysis.impact_assessment  // ✅ SPECIFIC
  }
}
```

---

## Changes Made

### 1. Updated AI Prompt (lines 27-73)
- Ask for `risk_analyses` array instead of flat structure
- Emphasize **"Each risk must have UNIQUE, SPECIFIC reasoning"**
- Request tailored controls and impact for each risk

### 2. Updated `createRiskAlerts()` Function (lines 117-166)
- Changed from looping over `risk_codes` to `risk_analyses`
- Extract risk-specific data from each analysis object
- Preserve overall confidence score

### 3. Updated Logging (line 324)
- Extract risk codes from `risk_analyses` array
- Show which risks were identified in logs

---

## Deployment

✅ Edge Function deployed successfully:
```bash
npx supabase functions deploy analyze-intelligence --project-ref qrxwgjjgaekalvaqzpuf
```

---

## How to Test

### Via UI (Recommended):

1. Go to **Risk Intelligence** tab
2. Go to **External Events** sub-tab
3. Click **"Scan for Threats"** button
4. Wait for analysis to complete
5. Go to **Intelligence Alerts** sub-tab
6. Find alerts from the same event
7. **Verify:** Each alert should have **different, specific** reasoning

### What to Look For:

✅ **CORRECT (After Fix):**
- Event affects OPS-005, OPS-006, OPS-007
- Each alert has **unique** reasoning explaining how the event affects **that specific risk**
- Each alert has **tailored** controls relevant to **that risk area**
- Each alert has **specific** impact assessment for **that risk domain**

❌ **INCORRECT (Old Bug):**
- All alerts have identical generic text
- All alerts suggest the same controls
- All alerts have the same impact assessment

---

## Important Notes

### 1. Existing Alerts Are Not Affected
- This fix only applies to **NEW** analyses
- Existing alerts with duplicate reasoning will **not** be automatically updated
- You can delete old alerts and re-scan events to get new analysis

### 2. Only for Batch "Scan for Threats"
- This issue only affected batch scanning (multiple risks per event)
- Single-event auto-scan (when manually adding events) was not affected

### 3. "Scan for Threats" Not Generating Alerts Issue
- Still needs investigation with diagnostic SQL: `CHECK_UNANALYZED_EVENTS.sql`
- This fix addresses the **quality** of alerts, not the **quantity**

---

## Files Modified

1. `supabase/functions/analyze-intelligence/index.ts`
   - Lines 27-73: Updated AI prompt
   - Lines 117-166: Updated createRiskAlerts function
   - Line 324: Updated logging

---

## Next Steps

1. **Test the fix via UI** (see "How to Test" above)
2. **Run diagnostic SQL** to investigate why "Scan for Threats" might not be finding events:
   ```sql
   -- Run this in Supabase SQL Editor
   -- File: CHECK_UNANALYZED_EVENTS.sql

   SELECT
     COUNT(*) FILTER (WHERE relevance_checked = false) as unanalyzed_count,
     COUNT(*) FILTER (WHERE relevance_checked = true) as analyzed_count,
     COUNT(*) as total_events
   FROM public.external_events;
   ```

3. **Report results** so we can address the "no new threats" issue

---

## Summary

**Problem:** AI generated duplicate reasoning for all risks
**Cause:** Single AI call with generic analysis
**Solution:** Ask AI for risk-specific analysis array
**Status:** Deployed and ready to test
**Test:** Use "Scan for Threats" button and check alert uniqueness
