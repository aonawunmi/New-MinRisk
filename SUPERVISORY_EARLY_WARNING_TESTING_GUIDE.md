# Supervisory Early Warning System - Testing Guide

**Created:** February 2, 2026
**Branch:** upgrade-2026-01-31
**Preview URL:** https://new-minrisk-production-git-upgrade-2026-01-31-ayodele-onawunmis-projects.vercel.app

---

## 🎯 Overview

This guide will help you test all features of the Supervisory Early Warning System implementation across 7 days of development.

### What Was Built

1. **Day 1**: DIME Formula Update & Regulator Schema
2. **Day 2**: Master Taxonomy Migration
3. **Day 3**: Regulator User Management & Invitation
4. **Day 4**: Regulator Oversight Dashboard with Heatmap
5. **Days 5-6**: Regulatory Report Templates System
6. **Day 7**: Testing & Verification (This Document)

---

## 🧪 Test Scenarios

### **Test 1: DIME Formula Verification (Day 1)**

**Purpose:** Verify the new DIME formula is working correctly

**Steps:**
1. Login as an organization admin
2. Navigate to **Controls** tab
3. Open any existing control or create a new one
4. Set DIME scores:
   - Design (D) = 3
   - Implementation (I) = 3
   - Monitoring (M) = 3
   - Evaluation (E) = 3
5. Save and verify effectiveness

**Expected Results:**
- Effectiveness = `((3*3) + (3*3)) / 18 * 100` = **100%**
- If D=0 OR I=0 → Effectiveness = **0%** (Anti-greenwashing rule)

**Test Anti-Greenwashing:**
1. Set D=0, I=3, M=3, E=3
2. Expected: Effectiveness = **0%**

---

### **Test 2: Master Taxonomy Migration (Day 2)**

**Purpose:** Verify all risks are mapped to master categories

**Steps:**
1. Login as admin
2. Navigate to **Risks** tab
3. Click on different risks and check their categories

**Expected Results:**
- All risks should have a master category assigned
- No risks in "UNCLASSIFIED" category
- Categories mapped:
  - Financial Risk → CREDIT
  - Liquidity & Capital Risk → LIQUIDITY
  - Operational & Technology Risk → OPERATIONAL
  - Legal, Regulatory & Conduct Risk → LEGAL
  - Strategic & Business Risk → STRATEGIC
  - ESG & Sustainability Risk → ESG

**Database Verification:**
```sql
-- Run on staging database
SELECT
  rc.name as category_name,
  mrc.code as master_code,
  mrc.name as master_name,
  COUNT(r.id) as risk_count
FROM risks r
LEFT JOIN risk_categories rc ON r.category_id = rc.id
LEFT JOIN master_risk_categories mrc ON rc.master_category_id = mrc.id
WHERE r.status = 'OPEN'
GROUP BY rc.name, mrc.code, mrc.name
ORDER BY risk_count DESC;
```

---

### **Test 3: Super Admin Regulator Management (Day 3)**

**Purpose:** Test regulator user invitation and access management

**Prerequisites:** Login as **super_admin** role

**Steps:**

#### A. View Regulators
1. Navigate to **Admin** → **Regulators** tab
2. Verify all 4 regulators are visible:
   - CBN (Central Bank of Nigeria)
   - SEC (Securities and Exchange Commission)
   - PENCOM (National Pension Commission)
   - NAICOM (National Insurance Commission)

#### B. Invite Regulator User
1. Click **"Invite Regulator User"**
2. Fill in:
   - Email: `test-regulator@cbn.gov.ng`
   - Full Name: `Test CBN Regulator`
   - Assign to: ✅ CBN
3. Click **"Send Invitation"**

**Expected Results:**
- Success message: "Regulator user invited successfully!"
- User appears in "Regulator Users" table
- User receives password reset email

#### C. Edit Regulator Access
1. Find newly created user in table
2. Click **Edit** (pencil icon)
3. Change regulator assignment (e.g., add SEC)
4. Click **"Update Access"**

**Expected Results:**
- User now has access to both CBN and SEC organizations

---

### **Test 4: Regulator Dashboard (Day 4)**

**Purpose:** Test regulator oversight dashboard and heatmap

**Prerequisites:** Login as **regulator** role user (created in Test 3)

**Steps:**

#### A. Access Dashboard
1. Upon login, should automatically redirect to **"Oversight Dashboard"** tab
2. Verify only "Oversight Dashboard" tab is visible (no operational tabs)

#### B. View Metrics
1. Select regulator from dropdown (e.g., CBN)
2. Verify 4 metric cards display:
   - Total Organizations
   - Total Risks
   - Critical & High Risks
   - Risk Mitigation %

#### C. Organization Risk Profiles
1. Scroll to "Organization Risk Profiles" table
2. Verify columns:
   - Organization name
   - Institution Type
   - Total Risks
   - Critical/High/Medium/Low counts
   - Avg Inherent/Residual scores
   - Risk Reduction %

#### D. Risk Heatmap
1. Scroll to "Risk Heatmap: Organizations × Categories"
2. Verify:
   - Rows = Organizations
   - Columns = 7 master categories (CREDIT, MARKET, LIQUIDITY, etc.)
   - Color coding:
     - Red = Critical
     - Orange = High
     - Yellow = Medium
     - Green = Low
   - Each cell shows risk count and average score

**Expected Results:**
- Dashboard aggregates data across all assigned organizations
- Heatmap provides visual pattern detection
- All metrics calculate correctly

---

### **Test 5: Regulatory Report Generation (Days 5-6)**

**Purpose:** Test report generation and submission workflow

**Prerequisites:** Login as **organization admin**

**Steps:**

#### A. View Available Templates
1. Navigate to **Reports** tab
2. Verify 3 templates are visible:
   - CBN Monthly Risk Report
   - SEC Quarterly Risk & Compliance Report
   - PENCOM Annual Risk Assessment Report
3. Check template details (sections, metrics count)

#### B. Generate a Report
1. Click **"Generate Report"**
2. Select template: **CBN Monthly Risk Report**
3. Enter:
   - Report Name: `January 2026 CBN Risk Report`
   - Period Start: `2026-01-01`
   - Period End: `2026-01-31`
4. Click **"Generate Report"**

**Expected Results:**
- Success message: "Report generated successfully!"
- Report appears in "Generated Reports" table with status **Draft**

#### C. View Report
1. Click **"View"** on the generated report
2. Verify report sections:
   - Executive Summary (4 metric cards)
   - Risks by Category table
   - Top 10 Risks table
   - Controls & KRIs Summary

**Expected Metrics:**
- Total Risks count
- Critical/High risk counts
- Risk Reduction % calculation
- Category breakdown

#### D. Submit Report
1. Click **"Submit"** button on the report
2. Status should change from **Draft** → **Submitted**

---

### **Test 6: Regulator Report Review (Days 5-6)**

**Purpose:** Test regulator report review workflow

**Prerequisites:**
- Report submitted in Test 5
- Login as **regulator** role

**Steps:**

#### A. Access Submitted Reports
1. Navigate to **Oversight Dashboard** tab
2. Click **"📄 Submitted Reports"** sub-tab
3. Select regulator (e.g., CBN)

#### B. View Summary Cards
1. Verify 3 metric cards:
   - Total Submitted
   - Pending Review (should show 1 from Test 5)
   - Approved

#### C. Review Report
1. Find the submitted report in table
2. Verify details:
   - Organization name
   - Report name
   - Period dates
   - Submitted date
   - Status: **Submitted**
3. Click **"View"**

#### D. Approve Report
1. In view dialog, review report data
2. Click **"Approve Report"**
3. Status changes to **Approved**

**Expected Results:**
- Report visible to regulator
- Approval workflow functions correctly
- Status updates persist

---

### **Test 7: Role-Based Access Control**

**Purpose:** Verify RLS policies are working

**Test Matrix:**

| Role | Can See | Cannot See |
|------|---------|------------|
| **Super Admin** | All organizations, All regulators, Regulator management | - |
| **Regulator** | Assigned orgs only, Oversight dashboard, Submitted reports | Operational tabs, Other regulators' data |
| **Org Admin** | Own org data, Generate reports, Admin settings | Other orgs' data, Regulator dashboard |
| **User** | Own org operational data | Admin settings, Reports, Analytics |

**Steps:**
1. Login as each role type
2. Verify correct tabs are visible
3. Attempt to access restricted data (should fail gracefully)

---

## 🔍 Database Verification Queries

Run these on **staging database** to verify data integrity:

### Check Regulator Schema
```sql
-- View all regulators
SELECT * FROM regulators ORDER BY name;

-- View regulator users and their access
SELECT
  up.email,
  up.full_name,
  up.role,
  array_agg(r.name) as assigned_regulators
FROM user_profiles up
LEFT JOIN regulator_access ra ON up.id = ra.user_id
LEFT JOIN regulators r ON ra.regulator_id = r.id
WHERE up.role = 'regulator'
GROUP BY up.id, up.email, up.full_name, up.role;
```

### Check Master Taxonomy Migration
```sql
-- Verify all risks have master categories
SELECT
  COUNT(*) as total_risks,
  COUNT(rc.master_category_id) as risks_with_master_category,
  COUNT(*) FILTER (WHERE mrc.code = 'UNCLASSIFIED') as unclassified_count
FROM risks r
LEFT JOIN risk_categories rc ON r.category_id = rc.id
LEFT JOIN master_risk_categories mrc ON rc.master_category_id = mrc.id
WHERE r.status = 'OPEN';
```

### Check Report Templates
```sql
-- View all report templates
SELECT
  rt.name,
  r.code as regulator_code,
  rt.config->'sections' as sections_count,
  rt.is_active
FROM regulatory_report_templates rt
JOIN regulators r ON rt.regulator_id = r.id
ORDER BY r.code, rt.name;
```

### Check Generated Reports
```sql
-- View all generated reports
SELECT
  rr.report_name,
  o.name as organization,
  r.code as regulator,
  rr.status,
  rr.reporting_period_start,
  rr.reporting_period_end,
  rr.generated_at
FROM regulatory_reports rr
JOIN organizations o ON rr.organization_id = o.id
JOIN regulators r ON rr.regulator_id = r.id
ORDER BY rr.generated_at DESC;
```

---

## 📊 Key Metrics to Verify

After testing, verify these metrics are correct:

### DIME Formula
- ✅ Formula: `((D*I + M*E)/18)*100`
- ✅ Anti-greenwashing: D=0 OR I=0 → 0%
- ✅ Result range: 0-100%

### Master Taxonomy
- ✅ 7 master categories + UNCLASSIFIED
- ✅ All active risks mapped
- ✅ 0 risks in UNCLASSIFIED

### Regulator System
- ✅ 4 regulators seeded (CBN, SEC, PENCOM, NAICOM)
- ✅ Regulator users can be invited
- ✅ Access controlled by regulator_access table

### Reports
- ✅ 3 templates seeded
- ✅ Reports generate with correct data
- ✅ Workflow: draft → submitted → approved

---

## 🐛 Known Issues & Limitations

### Current Limitations:
1. **PDF Export**: Not yet implemented (placeholder button)
2. **Excel Export**: Not yet implemented
3. **Report Scheduling**: UI for automation not built yet
4. **Email Notifications**: Not configured for report submissions

### Future Enhancements:
1. PDF report generation with branded templates
2. Excel export with formatted sheets
3. Automated report scheduling (monthly/quarterly/annual)
4. Email notifications for report submissions and approvals
5. Report comparison (period-over-period analysis)
6. Custom report builder

---

## ✅ Test Completion Checklist

Mark each test as you complete it:

- [ ] Test 1: DIME Formula Verification
- [ ] Test 2: Master Taxonomy Migration
- [ ] Test 3: Super Admin Regulator Management
- [ ] Test 4: Regulator Dashboard
- [ ] Test 5: Regulatory Report Generation
- [ ] Test 6: Regulator Report Review
- [ ] Test 7: Role-Based Access Control
- [ ] Database Verification Queries
- [ ] Key Metrics Verification

---

## 🚀 Deployment Checklist

Before merging to `main`:

- [ ] All tests pass on staging
- [ ] Database migrations run successfully
- [ ] Edge Functions deployed to production
- [ ] Environment variables configured correctly
- [ ] User acceptance testing completed
- [ ] Documentation updated
- [ ] Backup of production database created

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue 1: "Template not found" error**
- **Cause:** Migration not run on database
- **Fix:** Run `20260202_01_regulatory_reports.sql` migration

**Issue 2: Regulator dashboard shows no data**
- **Cause:** No organizations assigned to regulator
- **Fix:** Use super admin to assign orgs to regulators via `organization_regulators` table

**Issue 3: Cannot invite regulator user**
- **Cause:** Edge Function not deployed
- **Fix:** Deploy `super-admin-invite-regulator` function to staging

**Issue 4: Reports not generating**
- **Cause:** No risks/controls data in organization
- **Fix:** Add sample risks and controls to organization first

---

## 📝 Testing Notes

Use this space to record your testing observations:

```
Date: ________________
Tester: ________________

Test 1 (DIME): ________________
Test 2 (Taxonomy): ________________
Test 3 (Regulator Mgmt): ________________
Test 4 (Dashboard): ________________
Test 5 (Report Gen): ________________
Test 6 (Report Review): ________________
Test 7 (RBAC): ________________

Overall Status: ☐ PASS  ☐ FAIL  ☐ NEEDS REVIEW

Notes:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**END OF TESTING GUIDE**

For questions or issues, refer to:
- `CLAUDE.md` - Development guide
- GitHub branch: `upgrade-2026-01-31`
- Deployment: Vercel preview URL above
