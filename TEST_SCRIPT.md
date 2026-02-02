# MinRisk Supervisory Early Warning System - Test Script

**Date:** February 2, 2026
**Branch:** upgrade-2026-01-31
**Tester:** ___________________
**Duration:** ~30-45 minutes

---

## 🎯 Pre-Test Setup

### 1. Access the Staging Environment

**URL:** https://new-minrisk-production-git-staging-ayodele-onawunmis-projects.vercel.app
*(Or feature branch preview URL once deployed)*

### 2. Test User Accounts Needed

You'll need access to these role types:

| Role | Purpose | How to Get |
|------|---------|------------|
| **Super Admin** | Regulator management, system config | Existing super_admin account |
| **Org Admin** | Report generation, org management | Existing primary_admin account |
| **Regulator** | View oversight dashboard, approve reports | Create via Test #3 |

---

## 📋 TEST SCRIPT - FOLLOW IN ORDER

---

## **TEST 1: DIME Formula Update** ⏱️ 5 minutes

**Login as:** Organization Admin

### Steps:

1. [ ] Navigate to **Controls** tab
2. [ ] Click any existing control OR create new control
3. [ ] Set DIME scores as follows:

   **Test Case A: Perfect Control**
   - Design: `3`
   - Implementation: `3`
   - Monitoring: `3`
   - Evaluation: `3`
   - **Click Save**

   ✅ **PASS CRITERIA:** Effectiveness = **100%**

4. [ ] Edit the same control for Test Case B:

   **Test Case B: Anti-Greenwashing Rule**
   - Design: `0`
   - Implementation: `3`
   - Monitoring: `3`
   - Evaluation: `3`
   - **Click Save**

   ✅ **PASS CRITERIA:** Effectiveness = **0%**

5. [ ] Edit for Test Case C:

   **Test Case C: Partial Implementation**
   - Design: `2`
   - Implementation: `2`
   - Monitoring: `1`
   - Evaluation: `1`
   - **Click Save**

   ✅ **PASS CRITERIA:** Effectiveness = **33%**
   *Calculation: ((2×2) + (1×1)) / 18 × 100 = 27.78% ≈ 28%*

### Result: ☐ PASS  ☐ FAIL

**Notes:**
_____________________________________________

---

## **TEST 2: Master Taxonomy Verification** ⏱️ 3 minutes

**Login as:** Organization Admin

### Steps:

1. [ ] Navigate to **Risks** tab
2. [ ] Click **View** on 3-5 different risks
3. [ ] For each risk, verify the **Category** field shows:
   - A master category name (CREDIT, MARKET, LIQUIDITY, OPERATIONAL, LEGAL, STRATEGIC, ESG)
   - NOT "UNCLASSIFIED"
   - NOT a legacy category name

### Verification Table:

| Risk # | Risk Title | Category Shown | Master Category? |
|--------|-----------|----------------|------------------|
| 1 | _____________ | _____________ | ☐ Yes ☐ No |
| 2 | _____________ | _____________ | ☐ Yes ☐ No |
| 3 | _____________ | _____________ | ☐ Yes ☐ No |
| 4 | _____________ | _____________ | ☐ Yes ☐ No |
| 5 | _____________ | _____________ | ☐ Yes ☐ No |

✅ **PASS CRITERIA:** All risks show master category names, none show "UNCLASSIFIED"

### Result: ☐ PASS  ☐ FAIL

**Notes:**
_____________________________________________

---

## **TEST 3: Regulator User Invitation** ⏱️ 7 minutes

**Login as:** Super Admin

### Steps:

#### A. Navigate to Regulators Tab
1. [ ] Click **Admin** tab
2. [ ] Click **Regulators** sub-tab
3. [ ] Verify 4 regulators displayed:
   - ☐ CBN (Central Bank of Nigeria)
   - ☐ SEC (Securities and Exchange Commission)
   - ☐ PENCOM (National Pension Commission)
   - ☐ NAICOM (National Insurance Commission)

#### B. Invite Regulator User
4. [ ] Click **"Invite Regulator User"** button
5. [ ] Fill in the form:
   - **Email:** `test-regulator-[yourname]@test.com`
   - **Full Name:** `Test Regulator User`
   - **Assign to Regulators:** ✅ Check **CBN**
6. [ ] Click **"Send Invitation"**
7. [ ] Verify success message appears
8. [ ] Verify new user appears in "Regulator Users" table below

✅ **PASS CRITERIA:**
- Success message: "Regulator user invited successfully!"
- User appears in table with CBN badge
- User email shows correctly

#### C. Save Credentials for Later Tests
**Important:** Write down these credentials:
- Email: `test-regulator-[yourname]@test.com`
- We'll set password in next step

9. [ ] Open email inbox for the test email
10. [ ] Find password reset email
11. [ ] Click reset link and set password: `Test123!`
12. [ ] Write password here: ___________________

### Result: ☐ PASS  ☐ FAIL

**Notes:**
_____________________________________________

---

## **TEST 4: Regulator Dashboard & Heatmap** ⏱️ 8 minutes

**Login as:** The regulator user created in Test 3
**Credentials:** Email and password from Test 3

### Steps:

#### A. Verify Regulator-Only Access
1. [ ] After login, verify you see **ONLY:**
   - ☐ "🏛️ Oversight Dashboard" tab
   - ☐ NO other tabs (no Risks, Controls, Dashboard, etc.)

✅ **PASS CRITERIA:** Only "Oversight Dashboard" tab visible

#### B. View Risk Overview Tab
2. [ ] Verify you're on **"📊 Risk Overview"** sub-tab by default
3. [ ] Select **CBN** from regulator dropdown (top right)
4. [ ] Verify 4 metric cards display with numbers:

| Metric Card | Value Shown | Has Data? |
|-------------|-------------|-----------|
| Organizations | _______ | ☐ Yes ☐ No |
| Total Risks | _______ | ☐ Yes ☐ No |
| Critical & High | _______ | ☐ Yes ☐ No |
| Risk Mitigation % | _______% | ☐ Yes ☐ No |

#### C. Organization Risk Profiles Table
5. [ ] Scroll to **"Organization Risk Profiles"** section
6. [ ] Verify table has these columns:
   - ☐ Organization
   - ☐ Type
   - ☐ Total Risks
   - ☐ Critical
   - ☐ High
   - ☐ Avg Inherent
   - ☐ Avg Residual
   - ☐ Reduction
7. [ ] Count rows: ________ organizations displayed

#### D. Risk Heatmap
8. [ ] Scroll to **"Risk Heatmap: Organizations × Categories"**
9. [ ] Verify heatmap structure:
   - ☐ Rows = Organization names
   - ☐ Columns = 7 categories (CREDIT, MARKET, LIQUIDITY, OPERATIONAL, LEGAL, STRATEGIC, ESG)
   - ☐ Cells have colors (Red, Orange, Yellow, Green)
   - ☐ Each colored cell shows 2 numbers (count and score)

10. [ ] Verify legend at bottom:
    - ☐ Red = Critical
    - ☐ Orange = High
    - ☐ Yellow = Medium
    - ☐ Green = Low

✅ **PASS CRITERIA:**
- Dashboard loads without errors
- All metrics display correctly
- Heatmap shows color-coded risk data
- Can switch between regulators

### Result: ☐ PASS  ☐ FAIL

**Screenshot?** ☐ Yes (attach) ☐ No

**Notes:**
_____________________________________________

---

## **TEST 5: Generate Regulatory Report** ⏱️ 8 minutes

**Logout and Login as:** Organization Admin

### Steps:

#### A. Access Reports Tab
1. [ ] Navigate to **Reports** tab
2. [ ] Verify you see:
   - ☐ "Available Report Templates" section (3 templates)
   - ☐ "Generated Reports" section (table)

#### B. View Templates
3. [ ] Verify 3 templates shown:
   - ☐ CBN Monthly Risk Report
   - ☐ SEC Quarterly Risk & Compliance Report
   - ☐ PENCOM Annual Risk Assessment Report

4. [ ] Note template details for CBN:
   - Sections: _______ sections
   - Metrics: _______ metrics

#### C. Generate Report
5. [ ] Click **"Generate Report"** button
6. [ ] Fill in the form:
   - **Report Template:** Select **"CBN Monthly Risk Report"**
   - **Report Name:** `January 2026 Risk Report - Test`
   - **Period Start:** `2026-01-01`
   - **Period End:** `2026-01-31`
7. [ ] Click **"Generate Report"**
8. [ ] Wait for generation (should be ~2-5 seconds)
9. [ ] Verify success message

✅ **PASS CRITERIA:** "Report generated successfully!" message appears

#### D. View Generated Report
10. [ ] Find report in "Generated Reports" table:
    - ☐ Report name correct
    - ☐ Template shows "CBN Monthly Risk Report"
    - ☐ Period shows: 1/1/2026 - 1/31/2026
    - ☐ Status badge shows: **Draft** (gray/secondary color)

11. [ ] Click **"View"** button on the report
12. [ ] Verify report dialog shows:

**Executive Summary Cards:**
| Metric | Value | Shows? |
|--------|-------|--------|
| Total Risks | _______ | ☐ Yes ☐ No |
| Critical | _______ | ☐ Yes ☐ No |
| High | _______ | ☐ Yes ☐ No |
| Risk Reduction % | _______% | ☐ Yes ☐ No |

**Other Sections:**
- ☐ "Risks by Category" table visible
- ☐ "Top 10 Risks" table visible
- ☐ "Controls" summary visible
- ☐ "KRIs & Incidents" summary visible

13. [ ] Click **"Close"** button

#### E. Submit Report
14. [ ] Click **"Submit"** button next to the report (small icon)
15. [ ] Verify status changes from **Draft** to **Submitted** (blue badge)

✅ **PASS CRITERIA:**
- Report generates successfully
- All data sections populated
- Status workflow works (Draft → Submitted)

### Result: ☐ PASS  ☐ FAIL

**Notes:**
_____________________________________________

---

## **TEST 6: Regulator Report Review** ⏱️ 6 minutes

**Logout and Login as:** Regulator user (from Test 3)

### Steps:

#### A. Access Submitted Reports
1. [ ] Verify you're on **"Oversight Dashboard"** tab
2. [ ] Click **"📄 Submitted Reports"** sub-tab
3. [ ] Select **CBN** from dropdown (if not already selected)

#### B. View Summary Metrics
4. [ ] Verify 3 metric cards at top:

| Card | Value | Correct? |
|------|-------|----------|
| Total Submitted | _______ | ☐ Should be ≥1 |
| Pending Review | _______ | ☐ Should be ≥1 |
| Approved | _______ | ☐ Can be 0 |

✅ **PASS CRITERIA:** "Pending Review" shows at least 1 (the report from Test 5)

#### C. View Submitted Report
5. [ ] Find the report submitted in Test 5 in the table
6. [ ] Verify report details:
   - ☐ Organization name shows
   - ☐ Report name: "January 2026 Risk Report - Test"
   - ☐ Template: "CBN Monthly Risk Report"
   - ☐ Period: 1/1/2026 - 1/31/2026
   - ☐ Status badge: **Submitted** (blue)

7. [ ] Click **"View"** button

#### D. Review Report Content
8. [ ] In the dialog, verify:
   - ☐ Report title shows at top
   - ☐ "Submitted by [org name]" shows
   - ☐ Executive Summary section shows
   - ☐ Risks by Category table shows
   - ☐ All metrics match what you saw in Test 5

#### E. Approve Report
9. [ ] Click **"Approve Report"** button (green, at bottom right)
10. [ ] Dialog should close automatically
11. [ ] Verify in the table:
    - ☐ Status changed to **Approved** (green badge)
    - ☐ "Approve" button no longer visible for this report

12. [ ] Check summary cards again:
    - Pending Review: Should decrease by 1
    - Approved: Should increase by 1

✅ **PASS CRITERIA:**
- Report visible to regulator
- Approval workflow works
- Status updates correctly
- Metrics update in real-time

### Result: ☐ PASS  ☐ FAIL

**Notes:**
_____________________________________________

---

## **TEST 7: Role-Based Access Control** ⏱️ 5 minutes

**Purpose:** Verify each role sees only what they should

### Part A: Super Admin Access

**Login as:** Super Admin

1. [ ] Verify tabs visible:
   - ☐ Organizations
   - ☐ Regulators ← UNIQUE TO SUPER ADMIN
   - ☐ Plans & Pricing
   - ☐ Platform Metrics
   - ☐ Active Sessions
   - ☐ Audit Trail
   - ☐ Help

2. [ ] Can access **Regulators** tab: ☐ Yes ☐ No

✅ **PASS:** Only super admin sees "Regulators" tab

---

### Part B: Organization Admin Access

**Login as:** Organization Admin

3. [ ] Verify tabs visible:
   - ☐ Dashboard
   - ☐ Risks
   - ☐ Controls
   - ☐ Incidents
   - ☐ Analytics
   - ☐ KRI
   - ☐ Intel
   - ☐ **Reports** ← Should be visible
   - ☐ Admin

4. [ ] Can access **Reports** tab: ☐ Yes ☐ No
5. [ ] CANNOT see **Regulators** tab: ☐ Correct ☐ Wrong (shows tab)

✅ **PASS:** Admin sees Reports but NOT Regulators tab

---

### Part C: Regulator Access

**Login as:** Regulator user

6. [ ] Verify tabs visible:
   - ☐ **ONLY** "Oversight Dashboard" tab
   - ☐ NO operational tabs (Dashboard, Risks, Controls, etc.)
   - ☐ NO Admin tab

7. [ ] Within Oversight Dashboard, can switch between:
   - ☐ Risk Overview sub-tab
   - ☐ Submitted Reports sub-tab

✅ **PASS:** Regulator sees ONLY Oversight Dashboard with 2 sub-tabs

---

### Part D: Regular User Access (If Available)

**Login as:** User role (not admin)

8. [ ] Verify tabs visible:
   - ☐ Dashboard
   - ☐ Risks
   - ☐ Controls
   - ☐ Incidents
   - ☐ NO Analytics
   - ☐ NO KRI
   - ☐ NO Reports
   - ☐ NO Admin

✅ **PASS:** User sees only operational tabs, no admin/analytics features

---

### Result: ☐ PASS  ☐ FAIL

**Notes:**
_____________________________________________

---

## **BONUS TEST: Database Verification** ⏱️ 5 minutes

**Optional but Recommended**

### Connect to Staging Database:

```bash
psql "postgresql://postgres:213Capital%242026@db.oydbriokgjuwxndlsocd.supabase.co:5432/postgres"
```

### Run Verification Queries:

#### 1. Check Regulators Table
```sql
SELECT code, name, jurisdiction FROM regulators ORDER BY name;
```

✅ **PASS CRITERIA:** Returns 4 rows (CBN, SEC, PENCOM, NAICOM)

---

#### 2. Check Master Taxonomy Migration
```sql
SELECT
  COUNT(*) as total_risks,
  COUNT(rc.master_category_id) as with_master_category,
  COUNT(*) FILTER (WHERE mrc.code = 'UNCLASSIFIED') as unclassified
FROM risks r
LEFT JOIN risk_categories rc ON r.category_id = rc.id
LEFT JOIN master_risk_categories mrc ON rc.master_category_id = mrc.id
WHERE r.status = 'OPEN';
```

Results:
- Total Risks: _______
- With Master Category: _______
- Unclassified: _______

✅ **PASS CRITERIA:** `total_risks = with_master_category` AND `unclassified = 0`

---

#### 3. Check Report Templates
```sql
SELECT rt.name, r.code
FROM regulatory_report_templates rt
JOIN regulators r ON rt.regulator_id = r.id
WHERE rt.is_active = true
ORDER BY r.code;
```

✅ **PASS CRITERIA:** Returns 3 templates (CBN Monthly, SEC Quarterly, PENCOM Annual)

---

#### 4. Check Generated Reports
```sql
SELECT
  rr.report_name,
  rr.status,
  o.name as org_name,
  r.code as regulator_code
FROM regulatory_reports rr
JOIN organizations o ON rr.organization_id = o.id
JOIN regulators r ON rr.regulator_id = r.id
ORDER BY rr.generated_at DESC
LIMIT 5;
```

✅ **PASS CRITERIA:** Should show at least 1 report (from Test 5) with status 'approved'

---

### Database Test Result: ☐ PASS  ☐ FAIL

**Notes:**
_____________________________________________

---

## 📊 FINAL TEST SUMMARY

### Overall Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | DIME Formula | ☐ PASS ☐ FAIL | _______ |
| 2 | Master Taxonomy | ☐ PASS ☐ FAIL | _______ |
| 3 | Regulator Invitation | ☐ PASS ☐ FAIL | _______ |
| 4 | Regulator Dashboard | ☐ PASS ☐ FAIL | _______ |
| 5 | Report Generation | ☐ PASS ☐ FAIL | _______ |
| 6 | Report Review | ☐ PASS ☐ FAIL | _______ |
| 7 | Access Control | ☐ PASS ☐ FAIL | _______ |
| Bonus | Database Checks | ☐ PASS ☐ FAIL | _______ |

---

### Overall Assessment

**Total Tests:** 7 (+ 1 bonus)
**Passed:** _______
**Failed:** _______
**Pass Rate:** _______%

**Final Status:** ☐ READY FOR PRODUCTION  ☐ NEEDS FIXES  ☐ MAJOR ISSUES

---

### Critical Issues Found

List any blocking issues here:

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

### Minor Issues / Enhancements

List non-blocking issues:

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

## ✅ SIGN-OFF

**Tester Name:** _____________________
**Date Completed:** _____________________
**Time Taken:** _______ minutes

**Signature:** _____________________

---

## 📎 ATTACHMENTS

Attach screenshots of:
- [ ] Regulator dashboard heatmap
- [ ] Generated report view
- [ ] Regulator approval workflow
- [ ] Any errors encountered

---

**END OF TEST SCRIPT**

Save this document with results for your records.
