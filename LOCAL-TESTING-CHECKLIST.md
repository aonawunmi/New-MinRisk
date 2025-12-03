# Local Testing Checklist - VoidedIncidentsView & Void System
**Date:** 2025-12-03
**URL:** http://localhost:3000/
**Goal:** Verify all void system features work correctly before production deployment

---

## Pre-Testing Setup

### 1. Open Your Browser
- [ ] Navigate to: **http://localhost:3000/**
- [ ] Open DevTools: Press **F12** (Windows/Linux) or **Cmd+Option+I** (Mac)
- [ ] Go to Console tab - watch for any errors

### 2. Login as Admin
- [ ] Login with your admin account
- [ ] Email: `admin@ccp.com` (or your admin email)
- [ ] Verify you see the "Admin" tab in navigation

---

## Test Suite 1: Void Incident Feature

### Test 1A: Void from Main Incidents Tab
1. **Navigate:**
   - [ ] Click: **Incidents** tab (main navigation)
   - [ ] You should see list of incidents

2. **Select an Incident:**
   - [ ] Click on any incident to view details
   - [ ] Verify incident detail panel opens

3. **Void the Incident:**
   - [ ] Look for red **"Void Incident"** button (top-right area)
   - [ ] Click: "Void Incident"
   - [ ] Verify: Void dialog appears

4. **Complete Void Form:**
   - [ ] Enter reason: "Test void - duplicate entry"
   - [ ] Click: "Void Incident" (red button in dialog)
   - [ ] Verify: Success message appears
   - [ ] Verify: You're returned to incident list
   - [ ] Verify: Voided incident is NO LONGER in the list (filtered out)

**Expected Result:** ✅ Incident voided successfully and removed from active list

---

### Test 1B: Void from Risk Mapping Tab
1. **Navigate:**
   - [ ] Click: **Incidents** tab
   - [ ] Click: **Incident Risk Mapping** sub-tab
   - [ ] You should see incident-to-risk mapping interface

2. **Select Mapped Incident:**
   - [ ] Click on any mapped incident from the list
   - [ ] Verify incident details panel opens

3. **Void the Incident:**
   - [ ] Look for red **"Void Incident"** button
   - [ ] Click: "Void Incident"
   - [ ] Enter reason: "Test void - poorly captured data"
   - [ ] Click: "Void Incident" (confirm)

4. **Verify Behavior:**
   - [ ] Success message displays
   - [ ] Incident removed from mapped incidents view

**Expected Result:** ✅ Void works from both locations (main tab and risk mapping tab)

---

## Test Suite 2: VoidedIncidentsView (Admin Audit)

### Test 2A: Access Voided Incidents Tab
1. **Navigate:**
   - [ ] Click: **Incidents** tab
   - [ ] Click: **Incident Risk Mapping** sub-tab
   - [ ] Look for **3 tabs** at top:
     - "Pending Classification"
     - "Mapped Incidents"
     - **"Voided Incidents (Audit)"** ← NEW TAB

2. **Click Voided Tab:**
   - [ ] Click: "Voided Incidents (Audit)"
   - [ ] Verify: Table of voided incidents loads

**Expected Result:** ✅ New tab visible, table displays

---

### Test 2B: Verify Voided Incidents Display
1. **Check Table Columns:**
   - [ ] Incident Code (e.g., INC-001)
   - [ ] Title & Type
   - [ ] Severity Badge (color-coded)
   - [ ] Incident Date
   - [ ] Voided By (admin name & email)
   - [ ] Voided At (timestamp)
   - [ ] Void Reason (your test reasons)
   - [ ] Actions (History button)

2. **Verify Data:**
   - [ ] You should see the 2 incidents you just voided
   - [ ] Verify your admin name appears in "Voided By"
   - [ ] Verify void reasons match what you entered

**Expected Result:** ✅ All voided incidents display with correct data

---

### Test 2C: Search/Filter Functionality
1. **Search by Incident Code:**
   - [ ] Type incident code in search box (e.g., "INC-001")
   - [ ] Verify: Table filters to matching incident only
   - [ ] Clear search box
   - [ ] Verify: All incidents reappear

2. **Search by Void Reason:**
   - [ ] Type: "duplicate"
   - [ ] Verify: Only incidents with "duplicate" in reason show
   - [ ] Clear search

3. **Search by Admin Name:**
   - [ ] Type your admin name
   - [ ] Verify: Filters to incidents you voided
   - [ ] Clear search

**Expected Result:** ✅ Real-time search works across all fields

---

### Test 2D: Lifecycle History Dialog
1. **Open History:**
   - [ ] Click: **"History"** button on any voided incident
   - [ ] Verify: Dialog opens with lifecycle events

2. **Check History Content:**
   - [ ] Should show at least 2 events:
     - **CREATED** (when incident was first created)
     - **VOIDED** (when you just voided it)
   - [ ] VOIDED event should show:
     - Action badge (red "VOIDED")
     - Status transition (e.g., "ACTIVE → VOIDED")
     - Reason you entered
     - Your admin role
     - Timestamp

3. **Close Dialog:**
   - [ ] Click: "Close" button
   - [ ] Verify: Returns to voided incidents table

**Expected Result:** ✅ Complete audit trail visible with all details

---

## Test Suite 3: Risk Register Incident Counts

### Test 3A: Navigate to Risk Register
1. **Go to Risk Register:**
   - [ ] Click: **Risk Register** tab
   - [ ] Wait for risks to load

2. **Locate Incidents Column:**
   - [ ] Look for **"Incidents"** column (next to KRIs column)
   - [ ] Should show orange badges with AlertCircle icon
   - [ ] Numbers indicate how many incidents linked to each risk

**Expected Result:** ✅ Incidents column visible with counts

---

### Test 3B: View Incidents for a Risk
1. **Click Incident Count:**
   - [ ] Find a risk with incident count > 0
   - [ ] Click the orange badge with incident count
   - [ ] Verify: Dialog opens

2. **Check Incidents Dialog:**
   - [ ] Title shows: "Incidents for Risk: [RISK-CODE] - [Title]"
   - [ ] Each incident card shows:
     - Incident code & severity badge
     - Link type badge (PRIMARY, SECONDARY, etc.)
     - Title
     - Incident type and date
     - Financial impact (if any)
     - Description
     - Mapping notes (if any)

3. **Verify Active Filter:**
   - [ ] **IMPORTANT:** Voided incidents should NOT appear here
   - [ ] Only ACTIVE incidents should be shown
   - [ ] Count should reflect only active incidents

4. **Close Dialog:**
   - [ ] Click: "Close"
   - [ ] Returns to Risk Register

**Expected Result:** ✅ Incident counts accurate, dialog displays details, voided incidents excluded

---

## Test Suite 4: Console & Error Checking

### Test 4A: Browser Console
1. **Check Console:**
   - [ ] DevTools → Console tab
   - [ ] Look for any **red errors**
   - [ ] Yellow warnings are usually okay
   - [ ] Note any errors and share with me

2. **Network Tab:**
   - [ ] DevTools → Network tab
   - [ ] Reload page
   - [ ] Look for any **failed requests (red)**
   - [ ] All API calls should be green (200 OK)

**Expected Result:** ✅ No console errors, all network requests successful

---

## Test Suite 5: Edge Cases

### Test 5A: Empty States
1. **Test Empty Voided List:**
   - [ ] If you have a clean database with no voided incidents
   - [ ] Voided tab should show: "No voided incidents found"
   - [ ] Icon should display with friendly message

2. **Test Empty Search:**
   - [ ] Search for: "NONEXISTENT"
   - [ ] Should show: "No voided incidents match your search"

**Expected Result:** ✅ Friendly empty states display

---

### Test 5B: Void Validation
1. **Try Void Without Reason:**
   - [ ] Click "Void Incident" on any incident
   - [ ] Leave reason field **empty**
   - [ ] Click: "Void Incident" button
   - [ ] Should show error: "Please provide a reason for voiding this incident"
   - [ ] Should NOT void the incident

**Expected Result:** ✅ Validation prevents void without reason

---

## Test Suite 6: User Experience

### Test 6A: UI/UX Check
- [ ] Void button is clearly visible (red/destructive color)
- [ ] Void dialog has clear warning message
- [ ] Voided incidents tab has clear label
- [ ] Table is readable and well-formatted
- [ ] Severity badges have correct colors:
  - Low = Blue
  - Medium = Yellow
  - High = Orange
  - Critical = Red
- [ ] Search box has icon and placeholder text
- [ ] History button is clearly visible
- [ ] Dialog animations are smooth

**Expected Result:** ✅ Professional UI, clear user flow

---

### Test 6B: Responsive Design (Optional)
1. **Test Mobile View:**
   - [ ] DevTools → Toggle device toolbar (Ctrl+Shift+M)
   - [ ] Select: iPhone 12 Pro or similar
   - [ ] Navigate through all features
   - [ ] Verify: Tables are scrollable
   - [ ] Verify: Dialogs fit on screen

**Expected Result:** ✅ Works on mobile devices

---

## Final Verification

### System-Wide Check
- [ ] No data loss (voided incidents still in database, just hidden)
- [ ] Void action logged in lifecycle_history table
- [ ] Only admins can void incidents (RLS enforced)
- [ ] Voided incidents don't appear in normal incident lists
- [ ] Voided incidents don't count in risk register counts
- [ ] Search across all tabs works correctly
- [ ] No performance issues (page loads fast)

---

## Known Issues to Watch For

### Potential Issues (Report if you see these)
- **⚠️ Issue 1:** Void button not showing
  - **Cause:** User might not be admin
  - **Fix:** Login as admin user

- **⚠️ Issue 2:** Voided tab not visible
  - **Cause:** Browser cache
  - **Fix:** Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

- **⚠️ Issue 3:** Incidents still showing after void
  - **Cause:** Page not refreshed
  - **Fix:** Reload the incidents list

- **⚠️ Issue 4:** History dialog empty
  - **Cause:** Database migration not run
  - **Fix:** Check Supabase migration status

---

## Test Summary

### After Testing, Answer These:
1. **Did all void features work?** YES / NO
2. **Did the voided incidents tab load?** YES / NO
3. **Could you search/filter voided incidents?** YES / NO
4. **Did lifecycle history show correctly?** YES / NO
5. **Did incident counts in Risk Register work?** YES / NO
6. **Any console errors?** YES / NO (if yes, what?)
7. **Any UX issues or confusing parts?** YES / NO (if yes, what?)

### If all YES (except errors):
✅ **Ready for production deployment!**

### If any NO:
❌ **Report issues to me, and we'll fix them before deploying**

---

## Quick Test Path (Minimal - 5 minutes)

If you want a quick sanity check:
1. [ ] Login as admin
2. [ ] Void 1 incident from main incidents tab
3. [ ] Go to: Incidents → Risk Mapping → Voided Incidents tab
4. [ ] Verify voided incident appears
5. [ ] Click "History" button
6. [ ] Verify lifecycle history shows
7. [ ] Check console for errors (F12)

**If these 7 steps work, you're 95% ready for production.**

---

## Next Steps After Testing

### If Tests Pass:
1. Share results with me
2. I'll help deploy to Vercel
3. Test again on production URL
4. Go live!

### If Tests Fail:
1. Note which test failed
2. Copy any console errors
3. Share with me
4. We'll fix and re-test

---

**Happy Testing! 🧪**

**Questions while testing?** Just let me know which step you're on and what you're seeing.
