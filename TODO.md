# MinRisk NEW - TODO & Known Issues

**Last Updated:** December 3, 2025
**Project Status:** Active Development - 60% Complete

---

## 🔴 **CRITICAL ISSUES** (Need Immediate Attention)

### 1. Incident Mapping Errors ✅ FIXED (Awaiting Deployment)
**Status:** ✅ **FIXED IN CODE** - Needs deployment
**Fixed Date:** December 3, 2025

#### Issue 1A: Duplicate Key Error
**Error:** `duplicate key value violates unique constraint "unique_incident_risk_model_suggestion"`
**Location:** `supabase/functions/analyze-incident-for-risk-mapping/index.ts:255`

**Root Cause:**
- Edge Function uses `.insert()` without checking for existing suggestions
- Database constraint prevents duplicate (incident_id + risk_id + ai_model_version)

**Fix Applied:**
- Modified `insertSuggestions()` function to delete old pending suggestions before inserting new ones
- Allows users to re-run AI analysis without errors
- Only deletes `status='pending'` suggestions (preserves accepted/rejected history)

#### Issue 1B: Alert Function Error
**Error:** `TypeError: Alert is not a function`
**Location:** `src/components/incidents/AdminIncidentReview.tsx:194`

**Root Cause:**
- Code tried to call `Alert({...})` as a function
- Alert is a React component, not a callable function

**Fix Applied:**
- Changed to use `setSuccessMessage()` pattern (consistent with rest of file)
- Shows success message when suggestion is rejected

**Deployment Required:**
```bash
# Deploy Edge Function fix
npx supabase functions deploy analyze-incident-for-risk-mapping --project-ref qrxwgjjgaekalvaqzpuf

# Frontend fix is already live (just reload page)
```

**Testing:**
1. Create test incident
2. Run AI analysis (should work)
3. Click "Run AI Analysis" again (should now work without errors)
4. Accept a suggestion (should show success message)
5. Reject a suggestion (should show success message, not error)

---

### 2. Risk Intelligence System Running Poorly ⚠️
**Status:** ⚠️ **NEEDS INVESTIGATION**
**Reported:** December 3, 2025
**Phase:** Phase 6 - Risk Intelligence System

**Symptoms:**
- System is "running poorly" (specific issues to be documented)
- May involve:
  - Slow performance
  - Incorrect threat analysis
  - Alert generation issues
  - Integration problems

**Components Affected:**
- `src/lib/riskIntelligence.ts` - Auto-scan on event creation
- `supabase/functions/analyze-intelligence/` - Edge Function
- `src/components/risks/RiskForm.tsx` - Treatment log viewer

**Investigation Needed:**
1. Check Edge Function logs for errors
2. Test event creation workflow end-to-end
3. Verify ANTHROPIC_API_KEY is configured
4. Check database for alert generation
5. Review user experience and performance metrics

**Possible Fixes:**
- [ ] Optimize Edge Function performance
- [ ] Fix alert relevance scoring
- [ ] Improve keyword matching
- [ ] Add better error handling
- [ ] Enhance user feedback

---

## 🟡 **HIGH PRIORITY** (Complete Before Production)

### 3. Phase 8: Continuous Evolution UI Components
**Status:** 🚧 **NOT STARTED**
**Phase:** Phase 8 - UI Updates
**Dependencies:** Database migration complete (Phase 7)

**Components to Build:**

#### 3.1 Risk History View Component
- [ ] Read-only risk register for past periods
- [ ] Period dropdown selector (Q3 2025, Q2 2025, etc.)
- [ ] Show risks as they existed at that time
- [ ] Click risk to see timeline across periods
- [ ] Location: `src/components/risks/RiskHistoryView.tsx`

#### 3.2 Updated Period Comparison UI
- [ ] Support "Current vs Last Snapshot" comparison
- [ ] Use new `risk_history` table instead of `risk_snapshots`
- [ ] Add visual indicators (LIVE vs HISTORICAL)
- [ ] Handle structured periods (year + quarter)
- [ ] Location: `src/components/analytics/PeriodComparison.tsx`

#### 3.3 Analytics with Historical Period Support
- [ ] Modify `getHeatmapData()` to use `risk_history`
- [ ] Support structured Period type
- [ ] Add "Current (Live)" option to dropdowns
- [ ] Maintain backward compatibility
- [ ] Location: `src/lib/analytics.ts`

#### 3.4 Period Management Admin UI
- [ ] Show current active period banner
- [ ] "Commit Period" button with confirmation dialog
- [ ] View committed periods history
- [ ] Period commit statistics dashboard
- [ ] Notes field for documenting period close
- [ ] Location: `src/components/admin/PeriodManagement.tsx`

#### 3.5 Updated Risk Register UI
- [ ] Remove redundant `period` column
- [ ] Add banner: "Current Period: Q4 2025"
- [ ] All risks implicitly belong to current period
- [ ] Filter: Show Active Risks (is_active=true) by default
- [ ] Option to include Closed Risks in view
- [ ] Location: `src/components/risks/RiskRegister.tsx`

#### 3.6 Control Assessments UI
- [ ] Pre-fill Q4 scores from Q3 (convenience)
- [ ] Require explicit "Confirm" or "Re-assess"
- [ ] Track assessment_date and assessed_by
- [ ] Calculate overall effectiveness from DIME
- [ ] Historical view of control effectiveness trends
- [ ] Location: `src/components/controls/ControlAssessments.tsx`

**Estimated Timeline:** 2-3 weeks

---

### 4. Database Migration Testing
**Status:** 🚧 **READY TO TEST**
**Phase:** Phase 7 - Continuous Risk Architecture

**Migration File:** `supabase/migrations/20250101_continuous_risk_architecture.sql`

**Testing Steps:**
- [ ] Run migration on development database
- [ ] Verify 4 new tables created:
  - [ ] `active_period`
  - [ ] `risk_history`
  - [ ] `period_commits`
  - [ ] `control_assessments`
- [ ] Test `commitPeriod()` function manually
- [ ] Verify data integrity after commit
- [ ] Check that risks persist (not deleted)
- [ ] Validate foreign key relationships
- [ ] Test rollback if needed

**Manual Test Script:**
```typescript
import { commitPeriod, getActivePeriod } from './src/lib/periods-v2';

const orgId = '[test-org-id]';
const userId = '[test-user-id]';
const period = { year: 2025, quarter: 1 };

const result = await commitPeriod(orgId, period, userId, 'Test commit');
console.log('Commit result:', result);
```

---

## 🟢 **MEDIUM PRIORITY** (Nice to Have)

### 5. Port ERM Reports from Old MinRisk
**Status:** 🔲 **PLANNED**
**Source:** `minrisk-starter` (original project)

**Features to Port:**
- [ ] AI-powered narrative generation
- [ ] Stakeholder-specific reports (Regulator/Board/CEO)
- [ ] Auto-regulator routing (Bank→CBN, Capital Markets→SEC)
- [ ] Word & PDF export with watermarks
- [ ] Risk velocity analysis
- [ ] Report template system

**Files to Review:**
- Old: `minrisk-starter/src/lib/report-generator.ts`
- Old: `minrisk-starter/src/lib/report-templates/`
- Old: `minrisk-starter/src/components/reports/`

**Estimated Timeline:** 1-2 weeks (already built, just needs porting)

---

### 6. Improve AI Suggestion UI/UX
**Status:** 🔲 **PLANNED**
**Phase:** Phase 4-5 Enhancement

**Improvements:**
- [ ] Add bulk accept/reject for multiple suggestions
- [ ] Allow ADMIN to edit suggestions before accepting
- [ ] Add "Suggest Alternative Risk" option
- [ ] Show suggestion history (accepted/rejected counts)
- [ ] Add confidence calibration metrics
- [ ] Email notifications for new suggestions

---

### 7. Risk Intelligence Phase 2: RSS Automation
**Status:** 🔲 **PLANNED**
**Dependencies:** Phase 6 fixes complete

**Features:**
- [ ] RSS feed ingestion system
- [ ] Intelligent pre-filtering (keyword matching)
- [ ] Category-based filtering
- [ ] ML-powered alert prioritization
- [ ] Daily digest emails
- [ ] Automated overnight processing

**Cost Optimization:**
- Without pre-filtering: $22,500/month ❌
- With 97% pre-filtering: $450/month ✅

**Implementation Plan:** See `INTELLIGENCE-IMPLEMENTATION-SUMMARY.md`

---

## 📋 **COMPLETED PHASES** ✅

### ✅ Phase 1-3: Core Foundation
- ✅ Database schema with clean auth (`role` column)
- ✅ Multi-tenant architecture with RLS
- ✅ Auth system (login/signup/logout)
- ✅ Risk Register with CRUD
- ✅ Control Register
- ✅ Enhanced heatmap
- ✅ Admin dashboard

### ✅ Phase 4-5: AI-Assisted Incident Mapping
- ✅ AI Edge Function deployed
- ✅ Claude Sonnet 4.5 integration
- ✅ Dual confidence tracking
- ✅ Admin review dashboard
- ✅ Historical pattern analysis
- ✅ Governance controls
- ✅ Complete audit trail

### ✅ Phase 7: Continuous Risk Architecture
- ✅ Database migration created
- ✅ `periods-v2.ts` library built
- ✅ `commitPeriod()` function implemented
- ✅ Continuous risk identity design
- ✅ Structured period representation

---

## 🐛 **KNOWN BUGS** (Low Priority)

### Bug #1: Auth Session Missing Warning on Load
**Severity:** Low (cosmetic)
**Error:** `Get user error: – "Auth session missing!"`
**When:** Page load before user logs in
**Impact:** Console warning only, no functional issue
**Fix:** Suppress warning for pre-login state

---

## 📊 **PROJECT METRICS**

**Overall Completion:** 60%

**Phase Breakdown:**
- ✅ Phase 1-3: Core Foundation - 100%
- ✅ Phase 4-5: AI Incident Mapping - 100%
- ⚠️ Phase 6: Risk Intelligence - 80% (needs fixes)
- ✅ Phase 7: Continuous Evolution (Backend) - 100%
- 🚧 Phase 8: Continuous Evolution (UI) - 0%
- 🔲 Phase 9: ERM Reports - 0%

**Lines of Code:**
- TypeScript: ~15,000 lines
- SQL Migrations: ~3,000 lines
- Edge Functions: ~800 lines

**Test Coverage:** Manual testing only (no automated tests yet)

---

## 🚀 **DEPLOYMENT CHECKLIST**

### Before Production:
- [ ] Fix Risk Intelligence issues (Phase 6)
- [ ] Deploy updated AI incident mapping Edge Function
- [ ] Complete Phase 8 UI components
- [ ] Run database migration on production
- [ ] End-to-end testing of all workflows
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation updates
- [ ] User training materials

### Edge Functions to Deploy:
```bash
# Deploy incident mapping fix
npx supabase functions deploy analyze-incident-for-risk-mapping --project-ref qrxwgjjgaekalvaqzpuf

# Verify intelligence function
npx supabase functions deploy analyze-intelligence --project-ref qrxwgjjgaekalvaqzpuf
```

---

## 📝 **NOTES FOR DEVELOPERS**

### Environment Setup
- **Database:** Supabase `qrxwgjjgaekalvaqzpuf`
- **Environment:** `.env.development`
- **Dev Server:** `npm run dev` (http://localhost:3000)

### Code Organization
- **Frontend:** `src/components/`
- **Backend Logic:** `src/lib/`
- **Edge Functions:** `supabase/functions/`
- **Migrations:** `supabase/migrations/`

### Key Design Decisions
1. **Hybrid Human-AI Workflow** - AI suggests, humans decide
2. **Continuous Risk Identity** - No cloning between periods
3. **Dual Confidence Tracking** - Both AI and admin confidence
4. **Organization-Level Isolation** - RLS policies

---

## 🎯 **NEXT SESSION PRIORITIES**

### Immediate (This Week):
1. ✅ Fix duplicate key error in incident mapping (DONE)
2. 🔴 Investigate and fix Risk Intelligence issues
3. 🔴 Deploy updated Edge Function
4. 🔴 Test end-to-end incident mapping workflow

### Short-term (Next 2 Weeks):
1. Complete Phase 8 UI components
2. Run database migration on dev
3. Test period commit workflow
4. User acceptance testing

### Long-term (Next Month):
1. Port ERM Reports from old MinRisk
2. Deploy to production
3. User training
4. Monitor performance and gather feedback

---

**Last Review:** December 3, 2025
**Next Review:** December 10, 2025

**Status Summary:** Project is in good shape with solid architecture. Main blockers are Risk Intelligence fixes (Phase 6) and completing UI for Continuous Evolution (Phase 8). Once these are complete, system will be production-ready.
