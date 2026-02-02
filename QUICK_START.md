# 🚀 Quick Start - Supervisory Early Warning System Testing

**Date:** February 2, 2026
**Status:** ✅ Ready for Testing
**Time to Test:** 30-45 minutes

---

## 📍 WHERE TO START

### 1️⃣ **Access Staging Environment**

**Staging URL:** https://new-minrisk-production-git-staging-ayodele-onawunmis-projects.vercel.app

**OR Feature Branch Preview:**
https://new-minrisk-production-git-upgrade-2026-01-31-ayodele-onawunmis-projects.vercel.app

---

### 2️⃣ **Choose Your Testing Approach**

**Option A: Quick Test (10 minutes)**
- Login as super admin
- Check Regulators tab exists
- Invite one regulator user
- Login as regulator and view dashboard

**Option B: Full Test Script (30-45 minutes)**
- Open: `TEST_SCRIPT.md`
- Follow all 7 tests step-by-step
- Fill in checkboxes and results
- Get comprehensive coverage

**Option C: Guided Testing (Recommended)**
- Open: `SUPERVISORY_EARLY_WARNING_TESTING_GUIDE.md`
- Detailed explanations with screenshots
- SQL verification queries included
- Best for understanding features

---

## 🎯 WHAT TO TEST (Priority Order)

### 🔴 **Critical Features** (Must Test)

1. **Regulator Dashboard Heatmap**
   - Login as regulator user
   - View the Organizations × Categories heatmap
   - Verify color coding works

2. **Report Generation & Approval**
   - Generate a CBN report as org admin
   - Submit the report
   - Login as regulator and approve it

3. **DIME Formula**
   - Edit a control
   - Set D=3, I=3, M=3, E=3 → Should show 100%
   - Set D=0 → Should show 0%

### 🟡 **Important Features** (Should Test)

4. **Regulator User Invitation**
   - Super admin invites regulator user
   - Verify user receives email
   - Login as new regulator user

5. **Master Taxonomy**
   - View several risks
   - Verify all show master categories (not UNCLASSIFIED)

### 🟢 **Nice to Test**

6. **Role-Based Access**
   - Login as different roles
   - Verify correct tabs show/hide

7. **Database Queries**
   - Run SQL verification queries
   - Confirm data integrity

---

## 📁 DOCUMENTATION FILES

| File | Purpose | When to Use |
|------|---------|-------------|
| **TEST_SCRIPT.md** | Step-by-step executable test | When you want checkboxes and structured testing |
| **SUPERVISORY_EARLY_WARNING_TESTING_GUIDE.md** | Comprehensive guide with explanations | When you want to understand features deeply |
| **QUICK_START.md** (this file) | Quick reference | When you want to know what to test first |
| **CLAUDE.md** | Developer guide | When you need to understand the codebase |

---

## 🔑 TEST USERS YOU'LL NEED

### Existing Users
- **Super Admin:** Your existing super_admin account
- **Org Admin:** Your existing primary_admin account

### Users to Create
- **Regulator User:** Create via Test 3 in TEST_SCRIPT.md
  - Email: `test-regulator-[yourname]@test.com`
  - Assign to: CBN
  - Set password after email received

---

## ⚡ FASTEST TEST PATH (15 minutes)

If you're short on time, test these 3 things:

### Test 1: Regulator Dashboard (5 min)
```
1. Login as super admin
2. Admin → Regulators → Invite regulator user (email: test@test.com, assign to CBN)
3. Check email, set password
4. Login as regulator user
5. View "Oversight Dashboard" → should see heatmap
✅ PASS if heatmap shows colored cells with organization × category data
```

### Test 2: Report Generation (5 min)
```
1. Login as org admin
2. Reports tab → Generate Report
3. Select CBN template, set dates, generate
4. View report → should show metrics
5. Submit report
✅ PASS if report status changes from Draft → Submitted
```

### Test 3: Report Approval (5 min)
```
1. Login as regulator user (from Test 1)
2. Oversight Dashboard → Submitted Reports tab
3. Find the report from Test 2
4. Click View, then Approve
✅ PASS if status changes to Approved and metrics update
```

**If all 3 pass → System is working! ✅**

---

## 🐛 COMMON ISSUES & QUICK FIXES

### Issue: "No regulators shown"
**Fix:** Run this migration on staging:
```bash
psql "postgresql://postgres:213Capital%242026@db.oydbriokgjuwxndlsocd.supabase.co:5432/postgres" < database/migrations/20260131_01_regulator_schema.sql
```

### Issue: "Cannot generate report"
**Fix:** Check you have risks in your organization first

### Issue: "Regulator dashboard empty"
**Fix:** No organizations assigned to that regulator yet - this is normal if starting fresh

### Issue: "Invitation email not received"
**Fix:** Check Supabase Auth logs, or manually reset password via Supabase dashboard

---

## ✅ SUCCESS CRITERIA

**System is READY FOR PRODUCTION if:**

- ✅ All 4 regulators visible (CBN, SEC, PENCOM, NAICOM)
- ✅ Can invite regulator users successfully
- ✅ Regulator dashboard shows heatmap with colored cells
- ✅ Can generate reports from all 3 templates
- ✅ Report approval workflow functions
- ✅ DIME formula calculates correctly (100% for perfect control)
- ✅ All risks show master categories (0 UNCLASSIFIED)
- ✅ Role-based access works (regulator only sees dashboard)

**If 7/8 pass → READY** ✅
**If 5-6/8 pass → NEEDS MINOR FIXES** ⚠️
**If <5/8 pass → NEEDS REVIEW** ❌

---

## 📞 NEXT STEPS AFTER TESTING

### If Tests Pass:
1. ✅ Mark all tests complete in TEST_SCRIPT.md
2. ✅ Take screenshots of key features (heatmap, reports)
3. ✅ Merge `upgrade-2026-01-31` branch to `staging`
4. ✅ Run migrations on production database
5. ✅ Deploy Edge Function to production
6. ✅ Merge `staging` to `main`

### If Tests Fail:
1. ❌ Document issues in TEST_SCRIPT.md "Critical Issues" section
2. ❌ Share issues with development team (me!)
3. ❌ I'll fix and re-deploy for re-testing

---

## 🎯 YOUR TESTING GOAL

**Spend 30-45 minutes testing, then decide:**

| Decision | Criteria |
|----------|----------|
| **✅ APPROVE FOR PRODUCTION** | All critical features work, minor issues acceptable |
| **⚠️ APPROVE WITH FIXES** | Works but needs minor improvements |
| **❌ REJECT - NEEDS WORK** | Critical features broken or major issues |

---

## 📊 WHAT YOU'LL SEE

### Regulator Dashboard Heatmap
```
┌─────────────────┬────────┬────────┬───────────┬──────────────┬───────┬──────────┬─────┐
│ Organization    │ CREDIT │ MARKET │ LIQUIDITY │ OPERATIONAL  │ LEGAL │ STRATEGIC│ ESG │
├─────────────────┼────────┼────────┼───────────┼──────────────┼───────┼──────────┼─────┤
│ Bank A          │   🟥5  │   🟧3  │    🟨2    │      🟩1     │  🟧4  │    🟨2   │ 🟩1 │
│                 │  12.5  │  8.3   │    4.2    │      2.1     │  9.5  │    3.8   │ 1.2 │
├─────────────────┼────────┼────────┼───────────┼──────────────┼───────┼──────────┼─────┤
│ Insurance Co    │   🟧4  │   🟨3  │    🟩2    │      🟧5     │  🟨2  │    🟩1   │ 🟨3 │
│                 │  10.2  │  5.7   │    2.3    │     11.8     │  4.1  │    1.5   │ 6.2 │
└─────────────────┴────────┴────────┴───────────┴──────────────┴───────┴──────────┴─────┘

🟥 = Critical  🟧 = High  🟨 = Medium  🟩 = Low
Top number = Risk count | Bottom number = Avg score
```

### Report View
```
┌─────────────────────────────────────────┐
│ January 2026 CBN Risk Report            │
├─────────────────────────────────────────┤
│ Executive Summary                       │
│ ┌──────────┬──────────┬──────────┬─────┐│
│ │ Total: 45│Critical:8│ High: 12 │ Rdx │││
│ │          │          │          │ 35% │││
│ └──────────┴──────────┴──────────┴─────┘│
│                                         │
│ Risks by Category                       │
│ CREDIT: 15 risks (3 critical, 5 high)   │
│ OPERATIONAL: 12 risks (2 critical, 4 h) │
│ LIQUIDITY: 8 risks (1 critical, 2 high) │
│ ...                                     │
└─────────────────────────────────────────┘
```

---

## 💡 PRO TIPS

1. **Test in this order:** Super Admin → Org Admin → Regulator
2. **Keep credentials handy:** Write down test user emails/passwords
3. **Take screenshots:** Especially of the heatmap - looks impressive!
4. **Use real dates:** For reports, use current/recent dates
5. **Check both tabs:** Regulator dashboard has 2 sub-tabs

---

**Ready? Let's test! 🚀**

**Start here:** Open `TEST_SCRIPT.md` and begin Test 1.

---

**Questions? Issues?** I'm here to help! Just ask.
