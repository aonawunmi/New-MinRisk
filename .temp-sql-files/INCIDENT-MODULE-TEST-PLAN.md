# Incident Module Testing Plan

**Branch:** `feature/ai-incident-analysis`
**Date:** 2025-12-02
**Status:** Ready for Testing

---

## Implementation Summary

### ✅ Completed Features (Phases 1-5)

#### **Phase 1:** Fix broken import and add AI analysis schema
- Migration: `20250102000001_add_ai_incident_analysis.sql`
- Added AI columns to incidents table:
  - `ai_suggested_risks` (JSONB array)
  - `ai_control_recommendations` (JSONB object)
  - `ai_analysis_date` (timestamp)
  - `ai_analysis_status` (pending/analyzing/completed/failed)

#### **Phase 2:** Create analyze-incident Edge Function
- File: `supabase/functions/analyze-incident/index.ts`
- Features:
  - AI-powered risk linking with confidence scores
  - Control adequacy assessment
  - Enhanced error handling (Phase 5)
  - 30-second timeout with retries
  - Comprehensive validation

#### **Phase 3:** Implement AI-powered backend functions
- File: `src/lib/incidents.ts` (910 lines)
- **Core CRUD Functions:**
  - `getIncidents()` - Fetch all incidents for organization
  - `getIncidentById()` - Get single incident details
  - `getIncidentsByStatus()` - Filter by status
  - `getIncidentsBySeverity()` - Filter by severity
  - `getIncidentsByRisk()` - Get incidents linked to a risk
  - `createIncident()` - Create new incident
  - `updateIncident()` - Update incident details
  - `deleteIncident()` - Delete incident
  - `closeIncident()` - Close incident with resolution

- **Risk Linking Functions:**
  - `getIncidentRiskLinks()` - Get all risk links for incident
  - `linkIncidentToRisk()` - Manually link incident to risk
  - `unlinkIncidentFromRisk()` - Remove risk link
  - `updateIncidentRiskLink()` - Update link details

- **AI-Powered Functions:**
  - `suggestRisksForIncident()` - Get AI risk suggestions
  - `acceptRiskSuggestion()` - Accept and create risk link
  - `rejectRiskSuggestion()` - Reject AI suggestion
  - `assessControlAdequacy()` - AI control assessment
  - `acceptControlRecommendation()` - Apply control adjustments

- **Analytics Functions:**
  - `getIncidentStats()` - Statistics dashboard
  - `getRecentIncidents()` - Recent incidents (default: 30 days)
  - `getCriticalIncidents()` - High/critical severity only
  - `searchIncidents()` - Full-text search

- **Utility Functions:**
  - `getSeverityColor()` - Color coding for severity
  - `getStatusColor()` - Color coding for status
  - `formatIncidentNumber()` - Format incident numbers

#### **Phase 4:** Add AI-powered UI components
- File: `src/components/incidents/IncidentManagement.tsx` (497 lines)
- Features:
  - Incident list/table view
  - Create/Edit incident form
  - AI Risk Suggestions UI
  - AI Control Assessment UI
  - Risk linking interface
  - Status and severity filters

#### **Phase 5:** Comprehensive error handling and edge cases
- Enhanced Edge Function with:
  - Custom error classes
  - Input validation
  - Retry logic (max 2 retries)
  - Timeout handling (30 seconds)
  - Graceful degradation
  - User-friendly error messages

---

## Pre-Testing Checklist

### 1. **Database Migration** ⚠️ REQUIRED
```bash
# Run this SQL in Supabase SQL Editor:
# File: supabase/migrations/20250102000001_add_ai_incident_analysis.sql
```

**How to Apply:**
1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql
2. Create new query
3. Copy entire contents of migration file
4. Execute

**Verify Migration:**
```sql
-- Check if columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'incidents'
  AND column_name IN ('ai_suggested_risks', 'ai_control_recommendations', 'ai_analysis_date', 'ai_analysis_status');
```

Should return 4 rows.

### 2. **Deploy Edge Function** ⚠️ REQUIRED
```bash
npx supabase functions deploy analyze-incident --project-ref qrxwgjjgaekalvaqzpuf
```

**Verify Deployment:**
1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions
2. Check if `analyze-incident` function is listed
3. Check recent deployments

### 3. **Verify ANTHROPIC_API_KEY Secret**
```bash
# Check if secret is set
npx supabase secrets list --project-ref qrxwgjjgaekalvaqzpuf
```

Should show `ANTHROPIC_API_KEY` in the list.

If not set:
```bash
npx supabase secrets set ANTHROPIC_API_KEY="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" --project-ref qrxwgjjgaekalvaqzpuf
```

### 4. **Start Dev Server**
```bash
npm run dev
```

Access: http://localhost:5176 (or configured port)

---

## Test Cases

### **Test Suite 1: Incident CRUD Operations**

#### Test 1.1: Create New Incident
**Steps:**
1. Navigate to Incidents tab
2. Click "Report Incident" or "New Incident"
3. Fill in form:
   - Title: "Unauthorized access to client database"
   - Description: "Suspicious login activity detected"
   - Incident Type: "security"
   - Severity: "high"
   - Incident Date: Today
   - Impact Description: "Potential data breach"
   - Financial Impact: 50000
4. Submit form

**Expected Results:**
- ✅ Incident created successfully
- ✅ Incident number auto-generated (e.g., INC-001)
- ✅ Incident appears in list
- ✅ `ai_analysis_status` = 'pending'
- ✅ No console errors

#### Test 1.2: View Incident Details
**Steps:**
1. Click on created incident
2. Review all fields

**Expected Results:**
- ✅ All fields display correctly
- ✅ Timestamps formatted properly
- ✅ Severity badge colored correctly

#### Test 1.3: Update Incident
**Steps:**
1. Click "Edit" on incident
2. Update status to "investigating"
3. Add root cause: "Weak password policy"
4. Save changes

**Expected Results:**
- ✅ Changes saved successfully
- ✅ `updated_at` timestamp updated
- ✅ Changes reflected immediately

#### Test 1.4: Delete Incident
**Steps:**
1. Create a test incident
2. Click "Delete"
3. Confirm deletion

**Expected Results:**
- ✅ Incident removed from list
- ✅ Confirmation dialog shown
- ✅ Database record deleted

---

### **Test Suite 2: AI Risk Suggestions**

#### Test 2.1: Generate AI Risk Suggestions
**Prerequisites:**
- At least 3-5 active risks in risk register
- Incident created with detailed description

**Steps:**
1. Open incident details
2. Click "Get AI Risk Suggestions" or "Analyze Risks"
3. Wait for AI processing (10-30 seconds)

**Expected Results:**
- ✅ Loading indicator shown
- ✅ AI analysis completes without errors
- ✅ `ai_suggested_risks` populated with array
- ✅ Each suggestion has:
  - `risk_code`
  - `risk_title`
  - `confidence` (0-100)
  - `reasoning` (detailed explanation)
  - `link_type` (materialized/near_miss/control_failure)
  - `status` = 'pending'
- ✅ Suggestions sorted by confidence (highest first)
- ✅ `ai_analysis_status` = 'completed'

**Edge Cases to Test:**
- No active risks in register → Should show message
- Very long incident description → Should still process
- Network failure → Should show error message

#### Test 2.2: Accept AI Risk Suggestion
**Steps:**
1. From AI suggestions list
2. Click "Accept" on high-confidence suggestion (>80%)
3. Confirm acceptance

**Expected Results:**
- ✅ Suggestion status changed to 'accepted'
- ✅ Risk link created in `incident_risk_links` table
- ✅ Incident linked to risk in database
- ✅ Success message shown
- ✅ Link appears in "Linked Risks" section

#### Test 2.3: Reject AI Risk Suggestion
**Steps:**
1. Click "Reject" on a suggestion
2. Optionally add rejection reason
3. Confirm rejection

**Expected Results:**
- ✅ Suggestion status changed to 'rejected'
- ✅ No risk link created
- ✅ Suggestion moved to rejected list or hidden
- ✅ Incident `ai_suggested_risks` updated

#### Test 2.4: Accept Multiple Suggestions
**Steps:**
1. Generate AI suggestions
2. Accept 2-3 different risk suggestions
3. View incident risk links

**Expected Results:**
- ✅ All accepted risks linked to incident
- ✅ Multiple links visible in UI
- ✅ Each link has correct risk details

---

### **Test Suite 3: AI Control Adequacy Assessment**

#### Test 3.1: Generate Control Assessment
**Prerequisites:**
- Incident linked to at least one risk
- Risk has at least 2-3 controls

**Steps:**
1. Open incident details
2. Click "Assess Controls" or "Get AI Assessment"
3. Select a linked risk
4. Wait for AI processing

**Expected Results:**
- ✅ Loading indicator shown
- ✅ AI analysis completes
- ✅ `ai_control_recommendations` populated with:
  - `assessment` (Adequate/Partially Adequate/Inadequate)
  - `reasoning` (detailed explanation)
  - `dime_adjustments[]` (suggested control score changes)
  - `suggested_controls[]` (new controls to implement)
  - `priority` (High/Medium/Low)
  - `analyzed_at` (timestamp)

#### Test 3.2: View Control Recommendations
**Steps:**
1. Review AI control assessment
2. Expand "DIME Adjustments" section
3. Expand "Suggested Controls" section

**Expected Results:**
- ✅ Each DIME adjustment shows:
  - Control name
  - Dimension (Design/Implementation/Monitoring/Evaluation)
  - Current score vs Suggested score
  - Reason for adjustment
- ✅ Each suggested control shows:
  - Control name and description
  - Control type (Preventive/Detective/Corrective)
  - Target (Likelihood/Impact)
  - Expected DIME scores
  - Implementation priority

#### Test 3.3: Accept Control Recommendation
**Steps:**
1. From control recommendations
2. Click "Accept" on a DIME adjustment
3. Confirm application

**Expected Results:**
- ✅ Control DIME scores updated in database
- ✅ Control history logged
- ✅ Success message shown
- ✅ Residual risk recalculated

#### Test 3.4: Create New Control from Suggestion
**Steps:**
1. From suggested controls
2. Click "Create Control"
3. Pre-populated form opens
4. Submit

**Expected Results:**
- ✅ New control created
- ✅ Control linked to risk
- ✅ DIME scores set from suggestion
- ✅ Control appears in control register

---

### **Test Suite 4: Manual Risk Linking**

#### Test 4.1: Manually Link Incident to Risk
**Steps:**
1. Open incident details
2. Click "Link to Risk"
3. Select risk from dropdown
4. Select link type (materialized/near_miss/control_failure)
5. Add notes (optional)
6. Save link

**Expected Results:**
- ✅ Link created in database
- ✅ Link appears in "Linked Risks" section
- ✅ Link shows in both incident and risk views

#### Test 4.2: Update Risk Link
**Steps:**
1. Click "Edit" on existing link
2. Change link type
3. Update notes
4. Save changes

**Expected Results:**
- ✅ Link updated in database
- ✅ Changes reflected in UI

#### Test 4.3: Remove Risk Link
**Steps:**
1. Click "Remove" on link
2. Confirm removal

**Expected Results:**
- ✅ Link removed from database
- ✅ Link disappears from UI
- ✅ No cascading deletions

---

### **Test Suite 5: Incident Analytics**

#### Test 5.1: View Incident Statistics
**Steps:**
1. Navigate to Incidents Dashboard or Analytics
2. View incident stats

**Expected Results:**
- ✅ Total incidents count
- ✅ Breakdown by status
- ✅ Breakdown by severity
- ✅ Breakdown by incident type
- ✅ Charts/visualizations display correctly

#### Test 5.2: Filter Incidents
**Steps:**
1. Filter by status: "investigating"
2. Filter by severity: "critical"
3. Filter by date range
4. Combine multiple filters

**Expected Results:**
- ✅ Filters applied correctly
- ✅ Results update immediately
- ✅ Count reflects filtered results
- ✅ Clear filters works

#### Test 5.3: Search Incidents
**Steps:**
1. Search for "database"
2. Search for incident number
3. Search for keyword in description

**Expected Results:**
- ✅ Full-text search works
- ✅ Results highlighted
- ✅ No results message shown when appropriate

---

### **Test Suite 6: Error Handling & Edge Cases**

#### Test 6.1: AI Timeout Handling
**Steps:**
1. Create incident with very long description (>5000 chars)
2. Trigger AI analysis
3. Wait for timeout (30 seconds)

**Expected Results:**
- ✅ Timeout error caught gracefully
- ✅ User-friendly error message shown
- ✅ Retry option available
- ✅ No console errors crash app

#### Test 6.2: Invalid Input Validation
**Steps:**
1. Try creating incident with empty title
2. Try invalid severity value
3. Try invalid dates

**Expected Results:**
- ✅ Validation errors shown
- ✅ Form submission prevented
- ✅ Error messages clear and helpful

#### Test 6.3: Network Failure
**Steps:**
1. Disconnect internet
2. Try creating incident
3. Reconnect
4. Retry

**Expected Results:**
- ✅ Network error caught
- ✅ Error message shown
- ✅ Data not lost
- ✅ Retry successful after reconnection

#### Test 6.4: No Risks in Register
**Steps:**
1. Create incident in org with no risks
2. Try AI risk suggestions

**Expected Results:**
- ✅ Informative message shown
- ✅ No errors thrown
- ✅ Suggestion to create risks first

---

### **Test Suite 7: Cross-Module Integration**

#### Test 7.1: View Incidents from Risk
**Steps:**
1. Navigate to Risk Register
2. Open a risk with linked incidents
3. View "Related Incidents" section

**Expected Results:**
- ✅ All linked incidents shown
- ✅ Incident details visible
- ✅ Click to open incident

#### Test 7.2: Incident Impact on Risk Score
**Steps:**
1. Link critical incident to risk
2. Check if risk assessment updated
3. View risk history

**Expected Results:**
- ✅ Risk likelihood/impact potentially adjusted (if logic implemented)
- ✅ Change logged in risk history
- ✅ Audit trail created

#### Test 7.3: Control Failure Tracking
**Steps:**
1. Create incident with "control_failure" link type
2. Check control register
3. View control effectiveness tracking

**Expected Results:**
- ✅ Control marked as failed or partially effective
- ✅ Incident referenced in control history
- ✅ DIME scores potentially adjusted

---

## Security & Permissions Testing

### Test 8.1: Admin vs Regular User Permissions
**Steps:**
1. Log in as regular user
2. Try to create incident
3. Try to delete incident
4. Log in as admin
5. Perform same actions

**Expected Results:**
- ✅ Regular users: Can view, limited create/edit
- ✅ Admins: Full CRUD access
- ✅ Proper permission checks in UI and backend

### Test 8.2: Organization Isolation (RLS)
**Steps:**
1. Create incident in Org A
2. Log in as user from Org B
3. Try to view Org A's incidents

**Expected Results:**
- ✅ Cannot see other org's incidents
- ✅ API queries filtered by organization
- ✅ RLS policies enforced

---

## Performance Testing

### Test 9.1: Large Dataset Handling
**Steps:**
1. Create 50+ incidents
2. View incident list
3. Filter and search

**Expected Results:**
- ✅ List loads in <2 seconds
- ✅ Pagination works (if implemented)
- ✅ Filters responsive

### Test 9.2: AI Processing Time
**Steps:**
1. Track time for AI risk suggestions
2. Track time for control assessment

**Expected Results:**
- ✅ Risk suggestions: <30 seconds
- ✅ Control assessment: <30 seconds
- ✅ Timeout at 30 seconds enforced

---

## Test Results Template

```markdown
## Test Execution Report

**Date:** 2025-12-02
**Tested By:** [Name]
**Branch:** feature/ai-incident-analysis
**Environment:** Development

### Pre-Testing Checklist
- [ ] Database migration applied
- [ ] Edge Function deployed
- [ ] ANTHROPIC_API_KEY set
- [ ] Dev server running

### Test Results Summary
- **Total Tests:** 30+
- **Passed:** __
- **Failed:** __
- **Skipped:** __

### Critical Issues Found
1. [Issue description]
2. [Issue description]

### Minor Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]

### Overall Status
✅ READY FOR MERGE / ⚠️ NEEDS FIXES / ❌ MAJOR ISSUES
```

---

## Next Steps After Testing

1. **If All Tests Pass:**
   - Document any limitations
   - Create user guide
   - Merge to `main` branch
   - Deploy to staging

2. **If Issues Found:**
   - Log issues in TESTING-ISSUES-LOG.md
   - Fix critical issues
   - Re-test affected areas
   - Update documentation

3. **Post-Merge:**
   - Update Intelligence Module (as planned)
   - Test cross-module integration
   - Prepare for production deployment

---

**Ready to begin testing!** 🚀
