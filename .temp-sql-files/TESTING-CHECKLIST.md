# MinRisk Module Testing Checklist
**Date:** 2025-01-22
**Status:** In Progress

---

## Pre-Testing Setup

- [ ] Dev server running (`npm run dev`)
- [ ] Logged in as test user
- [ ] User has organization assigned
- [ ] Browser console open (check for errors)
- [ ] Network tab open (check API calls)

---

## Module 1: KRI Monitoring Testing

### 1.1 KRI Definition CRUD

**Create KRI Definition:**
- [ ] Navigate to KRI tab
- [ ] Click "Add KRI" or "New KRI" button
- [ ] Fill in KRI form:
  - [ ] KRI Name: "Login Failure Rate"
  - [ ] Category: "Security"
  - [ ] Indicator Type: "Lagging"
  - [ ] Measurement Unit: "Percentage"
  - [ ] Collection Frequency: "Daily"
  - [ ] Target Value: 1.0
  - [ ] Lower Threshold: 3.0
  - [ ] Upper Threshold: 5.0
  - [ ] Threshold Direction: "Above"
- [ ] Submit form
- [ ] ✅ Verify KRI code auto-generated (e.g., KRI-001)
- [ ] ✅ Verify KRI appears in list
- [ ] ✅ Check browser console - no errors
- [ ] ✅ Check Network tab - POST to kri_definitions succeeded

**Read KRI Definitions:**
- [ ] Refresh page
- [ ] ✅ Verify KRI still appears in list
- [ ] ✅ Verify all details displayed correctly
- [ ] Click on KRI to view details
- [ ] ✅ Verify all fields match what was entered

**Update KRI Definition:**
- [ ] Click "Edit" on KRI-001
- [ ] Change Target Value to 0.5
- [ ] Change Upper Threshold to 4.0
- [ ] Save changes
- [ ] ✅ Verify changes reflected immediately
- [ ] ✅ Check Network tab - PATCH/PUT succeeded
- [ ] Refresh page
- [ ] ✅ Verify changes persisted

**Delete KRI Definition (Optional - test at end):**
- [ ] Click "Delete" on a test KRI
- [ ] Confirm deletion
- [ ] ✅ Verify KRI removed from list
- [ ] ✅ Verify related data also deleted (cascade)

---

### 1.2 KRI Data Entry

**Add Measurement Data:**
- [ ] Select KRI-001 (Login Failure Rate)
- [ ] Click "Add Measurement" or "Enter Data"
- [ ] Fill in data entry form:
  - [ ] Measurement Date: Today's date
  - [ ] Measurement Value: 2.5 (below threshold - should be GREEN)
  - [ ] Data Quality: "Verified"
  - [ ] Notes: "Normal operations"
- [ ] Submit form
- [ ] ✅ Verify entry appears in data table
- [ ] ✅ Verify alert_status = "green"
- [ ] ✅ Check console - no errors
- [ ] ✅ Check Network tab - POST to kri_data_entries succeeded

**Add Yellow Alert Data:**
- [ ] Click "Add Measurement" again
- [ ] Fill in:
  - [ ] Measurement Date: Yesterday
  - [ ] Measurement Value: 3.5 (between lower and upper - should be YELLOW)
  - [ ] Data Quality: "Verified"
- [ ] Submit form
- [ ] ✅ Verify entry appears with yellow status
- [ ] ✅ Verify yellow alert created in kri_alerts table
- [ ] Check if alert notification appears
- [ ] ✅ Alert should show: measured_value=3.5, threshold_breached=3.0

**Add Red Alert Data:**
- [ ] Click "Add Measurement" again
- [ ] Fill in:
  - [ ] Measurement Date: 2 days ago
  - [ ] Measurement Value: 6.0 (above upper threshold - should be RED)
  - [ ] Data Quality: "Verified"
- [ ] Submit form
- [ ] ✅ Verify entry appears with red status
- [ ] ✅ Verify red alert created in kri_alerts table
- [ ] ✅ Alert should show: measured_value=6.0, threshold_breached=5.0

**View Data History:**
- [ ] View all measurements for KRI-001
- [ ] ✅ Verify all 3 entries appear
- [ ] ✅ Verify entries sorted by date (most recent first)
- [ ] ✅ Verify color coding (green, yellow, red)

---

### 1.3 KRI Alerts

**View Alerts:**
- [ ] Navigate to "Alerts" section or tab
- [ ] ✅ Verify 2 alerts appear (1 yellow, 1 red)
- [ ] ✅ Verify alert details correct:
  - Alert level
  - Alert date
  - Measured value
  - Threshold breached
  - Status (should be "open")

**Acknowledge Alert:**
- [ ] Click "Acknowledge" on yellow alert
- [ ] Add acknowledgment notes: "Investigating root cause"
- [ ] Submit
- [ ] ✅ Verify alert status changed to "acknowledged"
- [ ] ✅ Verify acknowledged_by = current user
- [ ] ✅ Verify acknowledged_at = current timestamp
- [ ] ✅ Verify notes saved

**Resolve Alert:**
- [ ] Click "Resolve" on red alert
- [ ] Add resolution notes: "Password policy updated"
- [ ] Submit
- [ ] ✅ Verify alert status changed to "resolved"
- [ ] ✅ Verify resolved_by = current user
- [ ] ✅ Verify resolved_at = current timestamp
- [ ] ✅ Verify resolution notes saved

---

### 1.4 KRI-to-Risk Linking

**Link KRI to Risk:**
- [ ] Select KRI-001
- [ ] Click "Link to Risk" or similar button
- [ ] Select a risk from risk register (e.g., "R-001")
- [ ] Optionally set AI confidence (or let AI suggest)
- [ ] Save link
- [ ] ✅ Verify link appears in kri_risk_links table
- [ ] ✅ Verify risk_code correct
- [ ] ✅ Verify linked_by = current user

**View Linked Risks:**
- [ ] View KRI details
- [ ] ✅ Verify linked risks section shows R-001
- [ ] Click on linked risk
- [ ] ✅ Verify navigates to risk details (if implemented)

**Unlink Risk:**
- [ ] Remove link to R-001
- [ ] ✅ Verify link removed from kri_risk_links
- [ ] ✅ Verify UI updates immediately

---

### 1.5 KRI Dashboard/Charts (if implemented)

- [ ] View KRI dashboard
- [ ] ✅ Verify trend chart displays historical data
- [ ] ✅ Verify threshold lines visible
- [ ] ✅ Verify color coding on chart
- [ ] ✅ Verify summary statistics accurate

---

## Module 2: Risk Intelligence Testing

### 2.1 External Events Management

**Add External Event:**
- [ ] Navigate to Intelligence tab
- [ ] Click "Add External Event"
- [ ] Fill in form:
  - [ ] Source: "News API"
  - [ ] Event Type: "Cybersecurity"
  - [ ] Title: "Major ransomware attack on financial sector"
  - [ ] Summary: "Multiple banks affected by coordinated attack"
  - [ ] URL: "https://example.com/news/ransomware"
  - [ ] Published Date: Today's date
- [ ] Submit form
- [ ] ✅ Verify event appears in events list
- [ ] ✅ Verify organization_id set correctly
- [ ] ✅ Verify relevance_checked = false
- [ ] ✅ Check console - no errors
- [ ] ✅ Check Network tab - POST to external_events succeeded

**View External Events:**
- [ ] View events list
- [ ] ✅ Verify event displayed with all details
- [ ] ✅ Verify events sorted by published_date (most recent first)

**Filter Events:**
- [ ] Filter by source "News API"
- [ ] ✅ Verify filtering works
- [ ] Clear filter
- [ ] ✅ Verify all events reappear

---

### 2.2 AI Relevance Analysis

**Analyze Event Relevance:**
- [ ] Select the ransomware event
- [ ] Click "Analyze Relevance" or "AI Analysis"
- [ ] System should analyze against all risks in register
- [ ] Wait for AI processing (may take 10-30 seconds)
- [ ] ✅ Verify AI analysis completes without errors
- [ ] ✅ Check console - should see API call to Anthropic
- [ ] ✅ Verify intelligence_alerts created

**View AI Suggestions:**
- [ ] View generated alerts
- [ ] ✅ Verify alerts show:
  - Risk code(s) affected
  - Relevance (is_relevant = true/false)
  - Confidence score (0-100)
  - Likelihood change (-2 to +2)
  - Impact change (-2 to +2)
  - AI reasoning text
  - Status = "pending"
- [ ] ✅ Verify alerts sorted by confidence score

---

### 2.3 Intelligence Alert Actions

**Accept Intelligence Alert:**
- [ ] Select a high-confidence alert (e.g., confidence > 80)
- [ ] Click "Accept"
- [ ] Review suggested changes to risk
- [ ] Confirm acceptance
- [ ] ✅ Verify alert status changed to "accepted"
- [ ] ✅ Verify reviewed_by = current user
- [ ] ✅ Verify reviewed_at = current timestamp
- [ ] ✅ Verify applied_to_risk = true
- [ ] ✅ Check risk was updated (likelihood/impact changed)
- [ ] ✅ Verify treatment log entry created
- [ ] ✅ Treatment log should show:
  - action_taken = "accept"
  - previous_likelihood
  - new_likelihood
  - previous_impact
  - new_impact
  - applied_by = current user

**Reject Intelligence Alert:**
- [ ] Select another alert
- [ ] Click "Reject"
- [ ] Add rejection reason: "Not applicable to our environment"
- [ ] Confirm rejection
- [ ] ✅ Verify alert status changed to "rejected"
- [ ] ✅ Verify reviewed_by = current user
- [ ] ✅ Verify applied_to_risk = false
- [ ] ✅ Verify risk NOT updated
- [ ] ✅ Verify treatment log entry created with action_taken = "reject"

---

### 2.4 Treatment Log Audit Trail

**View Treatment Log:**
- [ ] Navigate to treatment log or history
- [ ] ✅ Verify both actions appear (accept and reject)
- [ ] ✅ Verify log shows:
  - Alert ID
  - Risk code
  - Action taken
  - Before/after values (for accept)
  - Applied by (user)
  - Applied at (timestamp)
- [ ] ✅ Verify log sorted by applied_at (most recent first)

---

### 2.5 Mark Event as Checked

**Update Relevance Status:**
- [ ] After analyzing, mark event as checked
- [ ] ✅ Verify relevance_checked = true
- [ ] ✅ Verify UI indicates event has been processed

---

## Module 3: Incident Management Testing

### 3.1 Incident CRUD

**Create Incident:**
- [ ] Navigate to Incidents tab
- [ ] Click "Log Incident" or "New Incident"
- [ ] Fill in form:
  - [ ] Title: "Unauthorized access to client database"
  - [ ] Description: "Suspicious login activity detected"
  - [ ] Incident Date: Today's date
  - [ ] Reported By: "John Doe"
  - [ ] Division: "IT"
  - [ ] Department: "Security Operations"
  - [ ] Incident Type: "Data Breach"
  - [ ] Severity: 4 (High)
  - [ ] Financial Impact: 50000
  - [ ] Status: "Reported"
- [ ] Submit form
- [ ] ✅ Verify incident code auto-generated (e.g., INC-IT-001)
- [ ] ✅ Verify incident appears in list
- [ ] ✅ Verify organization_id and user_id set correctly
- [ ] ✅ Verify ai_suggested_risks = []
- [ ] ✅ Verify linked_risk_codes = []
- [ ] ✅ Check console - no errors
- [ ] ✅ Check Network tab - POST to incidents succeeded

**Read Incidents:**
- [ ] Refresh page
- [ ] ✅ Verify incident still appears
- [ ] Click to view incident details
- [ ] ✅ Verify all fields displayed correctly

**Update Incident:**
- [ ] Click "Edit" on incident
- [ ] Change status to "Under Investigation"
- [ ] Add root cause: "Weak password policy"
- [ ] Save changes
- [ ] ✅ Verify changes reflected
- [ ] ✅ Verify updated_at timestamp updated

---

### 3.2 AI Risk Suggestions

**Get AI Risk Suggestions:**
- [ ] Open incident INC-IT-001
- [ ] Click "Get AI Suggestions" or "Analyze Risks"
- [ ] Wait for AI processing (10-30 seconds)
- [ ] ✅ Verify AI analysis completes
- [ ] ✅ Verify ai_suggested_risks populated with array of suggestions
- [ ] ✅ Each suggestion should have:
  - risk_code
  - risk_title
  - confidence (0-100)
  - reasoning
  - suggested_linkage (direct/indirect/potential)
- [ ] ✅ Verify suggestions sorted by confidence

---

### 3.3 Link Incident to Risk

**Manual Link:**
- [ ] Select an AI suggestion OR manually choose a risk
- [ ] Click "Link to Risk"
- [ ] Select risk code (e.g., "R-SEC-001")
- [ ] Confirm link
- [ ] ✅ Verify risk code added to linked_risk_codes array
- [ ] ✅ Verify UI shows linked risk

**View Linked Risks:**
- [ ] View incident details
- [ ] ✅ Verify linked risks section shows all linked codes
- [ ] Click on linked risk
- [ ] ✅ Verify navigates to risk (if implemented)

**Unlink Risk:**
- [ ] Remove a linked risk
- [ ] ✅ Verify removed from linked_risk_codes array
- [ ] ✅ Verify UI updates

---

### 3.4 AI Control Assessment

**Get Control Recommendations:**
- [ ] Open incident
- [ ] Click "Assess Controls" or "Get AI Recommendations"
- [ ] Wait for AI processing
- [ ] ✅ Verify ai_control_recommendations populated
- [ ] ✅ Each recommendation should have:
  - control_description
  - adequacy_rating (adequate/partially_adequate/inadequate)
  - confidence (0-100)
  - gaps_identified (array)
  - recommendations (array)
  - reasoning

---

### 3.5 Control Enhancement Plans

**Create Enhancement Plan:**
- [ ] From incident or control assessment
- [ ] Click "Create Enhancement Plan"
- [ ] Fill in form:
  - [ ] Risk Code: "R-SEC-001"
  - [ ] Control Gap: "Lack of multi-factor authentication"
  - [ ] Enhancement Plan: "Implement MFA for all user accounts"
  - [ ] Target Completion Date: 30 days from now
  - [ ] Responsible Party: "IT Security Team"
  - [ ] Status: "Planned"
- [ ] Submit form
- [ ] ✅ Verify plan appears in enhancement plans table
- [ ] ✅ Verify organization_id and incident_id set correctly
- [ ] ✅ Check console - no errors
- [ ] ✅ Check Network tab - POST to control_enhancement_plans succeeded

**View Enhancement Plans:**
- [ ] View all enhancement plans
- [ ] ✅ Verify plan displayed with all details
- [ ] Filter by status "Planned"
- [ ] ✅ Verify filtering works
- [ ] Filter by incident
- [ ] ✅ Verify shows only plans for that incident

**Update Enhancement Plan:**
- [ ] Change status to "In Progress"
- [ ] Update responsible party
- [ ] Save changes
- [ ] ✅ Verify changes persisted

**Complete Enhancement Plan:**
- [ ] Change status to "Completed"
- [ ] ✅ Verify status updated

---

### 3.6 Incident Dashboard (if implemented)

- [ ] View incidents dashboard
- [ ] ✅ Verify incident count by status
- [ ] ✅ Verify incident count by severity
- [ ] ✅ Verify charts/visualizations display correctly

---

## Cross-Module Integration Testing

### Data Consistency

**KRI-to-Risk Linking:**
- [ ] Create KRI, link to risk R-001
- [ ] View risk R-001
- [ ] ✅ Verify KRI linkage visible from risk side (if implemented)

**Intelligence-to-Risk Updates:**
- [ ] Accept intelligence alert that changes risk
- [ ] View risk register
- [ ] ✅ Verify risk likelihood/impact updated
- [ ] View risk history
- [ ] ✅ Verify change logged with source = "intelligence"

**Incident-to-Risk Linking:**
- [ ] Link incident to risk R-001
- [ ] View risk R-001
- [ ] ✅ Verify incident linkage visible (if implemented)

---

## Security Testing (RLS)

### Organization Isolation

**Test with Second User:**
- [ ] Create second test user in different organization (or use existing)
- [ ] Log in as second user
- [ ] Navigate to KRI tab
- [ ] ✅ Verify CANNOT see first user's KRIs
- [ ] Navigate to Intelligence tab
- [ ] ✅ Verify CANNOT see first user's events/alerts
- [ ] Navigate to Incidents tab
- [ ] ✅ Verify CANNOT see first user's incidents
- [ ] ✅ This confirms RLS is working correctly

---

## Error Handling Testing

### Invalid Data

**KRI Module:**
- [ ] Try creating KRI with empty required fields
- [ ] ✅ Verify validation errors displayed
- [ ] Try entering measurement value with non-numeric characters
- [ ] ✅ Verify validation prevents submission

**Intelligence Module:**
- [ ] Try analyzing event with no risks in register
- [ ] ✅ Verify handles gracefully with message

**Incidents Module:**
- [ ] Try creating incident with severity outside 1-5 range
- [ ] ✅ Verify validation error
- [ ] Try setting invalid status
- [ ] ✅ Verify validation error

### API Errors

**Network Failure Simulation:**
- [ ] Disconnect internet (or use browser dev tools to simulate offline)
- [ ] Try creating a KRI
- [ ] ✅ Verify error message displayed
- [ ] ✅ Verify user can retry after reconnection

**AI API Errors:**
- [ ] Temporarily set invalid Anthropic API key in .env
- [ ] Try AI analysis
- [ ] ✅ Verify error handled gracefully
- [ ] ✅ Verify helpful error message shown
- [ ] Restore correct API key

---

## Performance Testing

### Data Volume

**KRI Module:**
- [ ] Create 10+ KRIs
- [ ] Add 20+ measurements per KRI
- [ ] ✅ Verify list loads quickly (< 2 seconds)
- [ ] ✅ Verify pagination works (if implemented)
- [ ] ✅ Verify sorting works

**Intelligence Module:**
- [ ] Create 20+ external events
- [ ] Generate 50+ intelligence alerts
- [ ] ✅ Verify list performance acceptable
- [ ] ✅ Verify filtering doesn't lag

**Incidents Module:**
- [ ] Create 15+ incidents
- [ ] ✅ Verify list loads quickly
- [ ] ✅ Verify search/filter responsive

---

## Browser Compatibility (Optional)

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] ✅ Verify all features work in all browsers

---

## Responsive Design (Optional)

- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] ✅ Verify UI adapts properly

---

## Final Verification

### Database Check

**Run in Supabase SQL Editor:**

```sql
-- Count all records created during testing
SELECT 'KRI Definitions' as table_name, COUNT(*) as count FROM kri_definitions
UNION ALL
SELECT 'KRI Data Entries', COUNT(*) FROM kri_data_entries
UNION ALL
SELECT 'KRI Alerts', COUNT(*) FROM kri_alerts
UNION ALL
SELECT 'KRI Risk Links', COUNT(*) FROM kri_risk_links
UNION ALL
SELECT 'External Events', COUNT(*) FROM external_events
UNION ALL
SELECT 'Intelligence Alerts', COUNT(*) FROM intelligence_alerts
UNION ALL
SELECT 'Treatment Log', COUNT(*) FROM risk_intelligence_treatment_log
UNION ALL
SELECT 'Incidents', COUNT(*) FROM incidents
UNION ALL
SELECT 'Enhancement Plans', COUNT(*) FROM control_enhancement_plans;
```

- [ ] ✅ Verify all counts match expected test data

### Console Errors

- [ ] Review browser console
- [ ] ✅ Verify no errors (red messages)
- [ ] ✅ Verify no warnings about deprecated features

### Network Errors

- [ ] Review Network tab
- [ ] ✅ Verify all API calls succeeded (200/201 status codes)
- [ ] ✅ Verify no 403 Forbidden (would indicate RLS issues)
- [ ] ✅ Verify no 500 errors (would indicate server issues)

---

## Test Summary

**Testing Completed:** [Date]
**Tested By:** [Name]

**Modules Tested:**
- [ ] KRI Monitoring - ✅ PASS / ❌ FAIL
- [ ] Risk Intelligence - ✅ PASS / ❌ FAIL
- [ ] Incident Management - ✅ PASS / ❌ FAIL

**Critical Issues Found:** [Number]
**Minor Issues Found:** [Number]
**Performance Issues:** [Number]

**Overall Status:** ✅ READY FOR PRODUCTION / ⚠️ NEEDS FIXES / ❌ MAJOR ISSUES

---

## Issues Log

| # | Module | Severity | Description | Status |
|---|--------|----------|-------------|--------|
| 1 | | | | |
| 2 | | | | |

---

## Next Steps After Testing

- [ ] Fix any critical issues found
- [ ] Document any feature gaps
- [ ] Create user documentation
- [ ] Prepare for production deployment
- [ ] Train end users
