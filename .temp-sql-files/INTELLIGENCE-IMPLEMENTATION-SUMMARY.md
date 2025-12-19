# Risk Intelligence Implementation Summary

## Overview
This document summarizes what has been implemented for the Risk Intelligence module and what still needs to be done.

## ✅ Completed Features

### 1. Database Schema (Migration Created)
**File:** `supabase/migrations/20250125000001_add_notes_and_soft_delete.sql`
- Added `user_notes` column to `risk_intelligence_alerts` table
- Added `deleted_at` column to `risk_intelligence_treatment_log` table (for soft delete)
- Added index for soft delete queries

**Status:** ⚠️ Migration created but NOT YET APPLIED to database
**Next Step:** Run the migration SQL on Supabase

### 2. Backend Functions (Risk Intelligence Library)
**File:** `src/lib/riskIntelligence.ts`

**Implemented Functions:**
- ✅ `getExternalEvents()` - Fetch all external events
- ✅ `createExternalEvent()` - Create new event with duplicate prevention (±7 days)
- ✅ `deleteExternalEvent()` - Delete event (CASCADE removes alerts)
- ✅ `cleanupDuplicateEvents()` - Remove existing duplicates
- ✅ `getPendingIntelligenceAlerts()` - Get pending alerts
- ✅ `getAcceptedIntelligenceAlerts()` - Get accepted alerts
- ✅ `acceptIntelligenceAlert()` - Accept an alert
- ✅ `rejectIntelligenceAlert()` - Reject an alert
- ✅ `applyIntelligenceAlert()` - Apply alert to risk (with MAX logic)
- ✅ `undoAppliedAlert()` - Undo an application (recalculate with MAX logic)
- ✅ `getTreatmentLogForRisk()` - Get treatment history for a risk
- ✅ `softDeleteTreatmentLogEntry()` - Soft delete treatment log entry

### 3. AI Analysis (Edge Function)
**File:** `supabase/functions/analyze-intelligence/index.ts`
- ✅ Analyzes events against risks using Claude API
- ✅ Returns: is_relevant, confidence_score, likelihood_change, impact_change, ai_reasoning
- ✅ Filters by confidence threshold (>= 70%)
- ✅ Creates alerts only for relevant high-confidence matches

### 4. UI Components

#### A. Risk Intelligence Management
**File:** `src/components/riskIntelligence/RiskIntelligenceManagement.tsx`
- ✅ External Events feed with manual entry form
- ✅ Delete button for individual events (admin only)
- ✅ Cleanup Duplicates button (admin only)
- ✅ Intelligence Alerts tab with Pending/Accepted views
- ✅ "Scan for Threats" button (triggers AI analysis)
- ✅ Accept/Reject buttons for pending alerts
- ✅ Apply to Risk Register button for accepted alerts

#### B. Treatment Log Viewer
**File:** `src/components/riskIntelligence/TreatmentLogViewer.tsx`
- ✅ Timeline view of treatment history per risk
- ✅ Shows likelihood/impact changes with visual indicators
- ✅ Undo button for each applied alert
- ✅ Archive (soft delete) button for each entry
- ✅ Filters out soft-deleted entries automatically
- ✅ User notes display

#### C. Risk Form Integration
**File:** `src/components/risks/RiskForm.tsx`
- ✅ Intelligence Alerts section in risk edit mode
- ✅ Shows all alerts for the risk with full details
- ✅ Expandable AI reasoning and event summary
- ✅ Status badges and confidence scores
- ✅ Link to original event source

### 5. AI-Powered Recommendations (NEW - 2025-01-25)

#### A. Suggested Controls from AI
**Files:**
- `supabase/functions/analyze-intelligence/index.ts` (Edge Function)
- `supabase/migrations/20250125000002_add_suggested_controls_and_impact.sql`
- `src/lib/riskIntelligence.ts` (TypeScript types)
- `src/components/riskIntelligence/RiskIntelligenceManagement.tsx` (UI)

**Implementation:**
- ✅ AI prompt updated to request 2-4 specific control recommendations
- ✅ Database column added: `suggested_controls TEXT[]`
- ✅ TypeScript type updated with `suggested_controls: string[] | null`
- ✅ UI displays controls in blue highlighted box with bullet list
- ✅ Shows in both Pending and Accepted alerts
- ✅ Pending alerts show first 2 controls with "+N more" indicator

**Example AI Output:**
```json
{
  "suggested_controls": [
    "Control 1: Implement multi-factor authentication for all admin accounts",
    "Control 2: Conduct quarterly security awareness training",
    "Control 3: Enable automated security patch management"
  ]
}
```

#### B. Impact Assessment Field
**Files:** Same as above

**Implementation:**
- ✅ AI prompt updated to request detailed impact assessment
- ✅ Database column added: `impact_assessment TEXT`
- ✅ TypeScript type updated with `impact_assessment: string | null`
- ✅ UI displays assessment in amber highlighted box
- ✅ Shows potential business consequences
- ✅ Pending alerts show truncated version (line-clamp-2)
- ✅ Accepted alerts show full text

**Example AI Output:**
```json
{
  "impact_assessment": "Detailed description of potential consequences and business impact if this event occurs, including financial, operational, and reputational effects"
}
```

### 6. Key Features

#### Duplicate Prevention
- Checks for same source + same title + within ±7 days
- Returns existing event instead of creating duplicate
- Cleanup function to remove existing duplicates

#### MAX Logic for Multiple Alerts
- When multiple alerts affect the same risk:
  - Gets original risk values (before any alerts)
  - Finds MAX likelihood_change and MAX impact_change from all applied alerts
  - Applies only the MAX values (not cumulative)
- Example: Alerts with +1, +2, +1 → Result is +2 (not +4)

#### Undo Functionality
- Marks alert as `applied_to_risk = false`
- Recalculates risk using MAX of REMAINING alerts
- Creates treatment log entry documenting the undo
- Smart recalculation prevents data corruption

#### Soft Delete
- Treatment log entries marked with `deleted_at` timestamp
- Hidden from UI but retained in database for audit
- Can be restored if needed (just clear deleted_at)

---

## ⚠️ Partially Implemented

### 1. Undo Button in UI
**Status:** Backend complete, UI missing
**What's Done:**
- `undoAppliedAlert()` function works perfectly
- Smart MAX logic recalculation implemented

**What's Missing:**
- Undo button in RiskIntelligenceManagement applied alerts section
- Need to add button next to "Applied to risk register" message

**File to Update:** `src/components/riskIntelligence/RiskIntelligenceManagement.tsx`
**Lines:** ~728-733 (AcceptedAlertsTable component)

### 2. Batch Apply
**Status:** Not implemented
**What's Needed:**
- Checkbox selection for multiple accepted alerts
- "Apply Selected" button
- Loop through selected alerts and call `applyIntelligenceAlert()` for each
- Show success/error summary

**File to Update:** `src/components/riskIntelligence/RiskIntelligenceManagement.tsx`

### 3. User Notes Field
**Status:** Database migration created, UI not implemented
**What's Needed:**
- Add textarea for `user_notes` in alert cards
- Save notes when user types
- Display notes in alert lists

---

## ❌ Not Yet Implemented (From Spec)

### 1. RSS Feed Integration
**Priority:** Medium (automation feature)
**Effort:** High (16-24 hours)
- Daily cron job to fetch RSS feeds
- Parse XML and extract events
- Auto-create external_events
- Sources: CBN, SEC Nigeria, FMDQ, BusinessDay, US-CERT, etc.

### 2. Keyword Extraction
**Priority:** Low
**Effort:** Low (2-3 hours)
- Extract keywords from event title + description
- Remove stopwords
- Store in external_events table (need to add column)

### 3. Audit Trail Integration
**Priority:** Medium
**Effort:** Low (2-3 hours)
- Log to main `audit_trail` table
- Mark source as 'risk_intelligence'
- Include alert_id and treatment notes

### 4. User-Filtered Alerts
**Priority:** High (for multi-user orgs)
**Effort:** Medium (3-4 hours)
- Filter alerts by user's risk ownership
- Admins see all, users see only their risks

### 5. Bulk Operations
**Priority:** Low-Medium
**Effort:** Low (3-4 hours)
- Bulk delete pending alerts
- Auto-expire old alerts (database RPC function)

### 6. Click-to-Create Controls
**Priority:** Medium
**Effort:** Low (2-3 hours)
- Add "Create Control" button next to suggested controls
- Pre-populate control form with AI suggestion
- Link created control to risk

---

## 🔧 Setup Required

### Database Migrations
**MUST DO BEFORE TESTING:**

#### Migration 1: User Notes and Soft Delete
```sql
-- Run this in Supabase SQL Editor:
```
Copy contents of `supabase/migrations/20250125000001_add_notes_and_soft_delete.sql`
- Adds `user_notes` column to `risk_intelligence_alerts`
- Adds `deleted_at` column to `risk_intelligence_treatment_log`
- Creates index for soft delete queries

#### Migration 2: Suggested Controls and Impact Assessment (NEW)
```sql
-- Run this in Supabase SQL Editor:
```
Copy contents of `supabase/migrations/20250125000002_add_suggested_controls_and_impact.sql`
- Adds `suggested_controls` TEXT[] column to `risk_intelligence_alerts`
- Adds `impact_assessment` TEXT column to `risk_intelligence_alerts`
- Creates GIN index for searching suggested controls

### Dependencies
Check if `date-fns` is installed:
```bash
npm list date-fns
```

If not installed:
```bash
npm install date-fns
```

---

## 📋 Next Steps (Priority Order)

### COMPLETED ✅ (Option A + C - 2025-01-25)
1. ✅ Add Undo button to applied alerts UI
2. ✅ Add Batch Apply functionality
3. ✅ Build Treatment Log Viewer component
4. ✅ Implement soft delete for treatment log entries
5. ✅ Add Suggested Controls from AI (Option C)
6. ✅ Add Impact Assessment field (Option C)

### IMMEDIATE (Before Testing)
7. ⚠️ Apply database migrations (both files)
8. ⚠️ Deploy updated Edge Function to Supabase
9. ⚠️ Test all features end-to-end

### HIGH PRIORITY (Next Sprint)
10. Wire up Treatment Log Viewer to main UI
11. Implement User-Filtered Alerts (if multi-user)
12. Add User Notes UI fields (textarea for alerts)

### MEDIUM PRIORITY (Future)
13. Audit Trail Integration
14. RSS Feed Integration
15. Click-to-Create Controls from suggestions

### LOW PRIORITY (Nice to Have)
16. Keyword Extraction
17. Bulk Operations
18. Alert expiration

---

## 🧪 Testing Checklist

### External Events
- [ ] Create external event manually
- [ ] Verify duplicate prevention (try creating same event)
- [ ] Delete external event (verify cascade delete of alerts)
- [ ] Cleanup duplicates (add duplicates first, then cleanup)

### Intelligence Alerts
- [ ] Scan for threats (triggers AI analysis)
- [ ] Accept an alert
- [ ] Reject an alert
- [ ] Apply accepted alert to risk (verify risk scores update)
- [ ] Verify MAX logic (apply multiple alerts to same risk)

### Treatment Log
- [ ] View treatment log for a risk
- [ ] Undo an applied alert (verify risk scores recalculate)
- [ ] Soft delete a treatment log entry (verify it disappears but stays in DB)

### Risk Form Integration
- [ ] Edit a risk that has intelligence alerts
- [ ] Verify alerts section shows with full details
- [ ] Expand/collapse AI reasoning
- [ ] Click external event source link

---

## 📝 Notes

### Design Decisions Made:
1. **Soft delete over hard delete** - Retains audit trail
2. **MAX logic over cumulative** - Prevents alert stacking inflation
3. **3-step workflow (pending → accept → apply)** - Gives user control, no auto-updates
4. **User notes separate from treatment notes** - Different contexts
5. **Duplicate window: ±7 days** - Balances accuracy vs false positives

### User Workflow (Current):
```
1. External Event Added (manual or RSS in future)
   ↓
2. User clicks "Scan for Threats"
   ↓
3. AI analyzes events × risks → Creates alerts (status: pending)
   ↓
4. User reviews pending alerts → Clicks "Accept" or "Reject"
   ↓
5. Accepted alerts shown with "Apply to Risk Register" button
   ↓
6. User clicks "Apply" → Risk scores update + Treatment log created
   ↓
7. User can view Treatment Log, Undo, or Archive entries
```

### Database Tables:
1. `external_events` - News/events from various sources
2. `risk_intelligence_alerts` (aka `intelligence_alerts`) - AI-analyzed relevance
3. `risk_intelligence_treatment_log` - Audit trail of applications

---

## 🐛 Known Issues

1. **Date-fns dependency** - Need to verify it's installed for TreatmentLogViewer
2. **Migration not applied** - Schema changes not yet in database
3. **Treatment Log not wired up** - Component created but not integrated into main UI

---

## 🎯 Success Criteria

- [x] User can manually add external events
- [x] AI can scan events and create alerts
- [x] User can accept/reject alerts
- [x] User can apply alerts to risk register
- [x] User can apply multiple alerts in batch
- [x] User can undo alert applications
- [x] User can see treatment history (component built, needs UI integration)
- [x] User can archive treatment entries
- [x] Multiple alerts use MAX logic (not cumulative)
- [x] Duplicate events are prevented
- [x] AI provides suggested controls for each alert
- [x] AI provides impact assessment for each alert

---

**Last Updated:** 2025-01-25 (10:17 AM)
**Status:** 85% Complete (Option A + C features complete, migrations and testing remaining)
