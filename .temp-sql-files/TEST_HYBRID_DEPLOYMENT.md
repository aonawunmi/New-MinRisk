# Hybrid Architecture Deployment Testing Guide

**Date:** 2025-11-26
**Status:** Ready for Testing
**Estimated Time:** 30-45 minutes

---

## Test Environment

- **Database:** Supabase (qrxwgjjgaekalvaqzpuf)
- **Organizations:** 2 test organizations
- **Global Libraries:** Fully seeded (45 + 30 + 95 + 39 = 209 items)

---

## Test Plan Overview

We'll test in this order:
1. ✅ Global library accessibility
2. ✅ Unified views functionality
3. ✅ Enhancement views (residual risk, etc.)
4. ✅ RLS (organization isolation)
5. ✅ Application integration (if applicable)

---

## TEST 1: Verify Global Libraries Are Accessible

**Purpose:** Confirm all global data is queryable and complete

**SQL Tests:**

```sql
-- Test 1.1: Count all global libraries
SELECT
  (SELECT COUNT(*) FROM global_root_cause_library WHERE is_active = true) as root_causes,
  (SELECT COUNT(*) FROM global_impact_library WHERE is_active = true) as impacts,
  (SELECT COUNT(*) FROM global_control_library WHERE is_active = true) as controls,
  (SELECT COUNT(*) FROM global_kri_kci_library WHERE is_active = true) as indicators;

-- Expected: 45, 30, 95, 39
```

**✅ PASS CRITERIA:**
- root_causes = 45
- impacts = 30
- controls = 95
- indicators = 39

---

## TEST 2: Verify Unified Views Show Global Data

**Purpose:** Confirm views are combining global + org data correctly

**SQL Tests:**

```sql
-- Test 2.1: Root Cause Register View
SELECT COUNT(*), source
FROM root_cause_register
GROUP BY source;
-- Expected: At least 45 from 'global' source

-- Test 2.2: Impact Register View
SELECT COUNT(*), source
FROM impact_register
GROUP BY source;
-- Expected: At least 30 from 'global' source

-- Test 2.3: Control Library View
SELECT COUNT(*), source
FROM control_library
GROUP BY source;
-- Expected: At least 95 from 'global' source

-- Test 2.4: KRI/KCI Library View
SELECT COUNT(*), source
FROM kri_kci_library
GROUP BY source;
-- Expected: At least 39 from 'global' source
```

**✅ PASS CRITERIA:**
- All views return global data
- Source column correctly shows 'global'
- No errors when querying views

---

## TEST 3: Verify Sample Data Quality

**Purpose:** Check that global data has proper attributes

**SQL Tests:**

```sql
-- Test 3.1: Root Causes have categories
SELECT category, COUNT(*)
FROM global_root_cause_library
WHERE is_active = true
GROUP BY category
ORDER BY COUNT(*) DESC;
-- Expected: Multiple categories with counts

-- Test 3.2: Controls have DIME scores
SELECT
  AVG(design_score) as avg_design,
  AVG(implementation_score) as avg_implementation,
  AVG(monitoring_score) as avg_monitoring,
  AVG(evaluation_score) as avg_evaluation
FROM global_control_library
WHERE is_active = true;
-- Expected: All averages between 50-90

-- Test 3.3: KRIs vs KCIs distribution
SELECT indicator_type, COUNT(*)
FROM global_kri_kci_library
WHERE is_active = true
GROUP BY indicator_type;
-- Expected: KRI=20, KCI=19

-- Test 3.4: Impacts have categories
SELECT category, COUNT(*)
FROM global_impact_library
WHERE is_active = true
GROUP BY category
ORDER BY COUNT(*) DESC;
-- Expected: Multiple categories
```

**✅ PASS CRITERIA:**
- Root causes span multiple categories
- Controls have realistic DIME scores (not all 65)
- KRI/KCI split is correct
- Impacts have proper categorization

---

## TEST 4: Verify Mappings Work

**Purpose:** Confirm KRI/KCI mappings are functional

**SQL Tests:**

```sql
-- Test 4.1: Root Cause → KRI mappings exist
SELECT COUNT(*)
FROM global_root_cause_kri_mapping;
-- Expected: ~82-90 mappings

-- Test 4.2: Sample mapping with details
SELECT
  rc.cause_code,
  rc.cause_name,
  kri.indicator_code,
  kri.indicator_name,
  m.relevance_score
FROM global_root_cause_kri_mapping m
JOIN global_root_cause_library rc ON rc.id = m.global_root_cause_id
JOIN global_kri_kci_library kri ON kri.id = m.global_kri_id
LIMIT 5;
-- Expected: Readable mapping data

-- Test 4.3: Impact → KCI mappings exist
SELECT COUNT(*)
FROM global_impact_kci_mapping;
-- Expected: ~55-60 mappings

-- Test 4.4: Sample impact mapping
SELECT
  imp.impact_code,
  imp.impact_name,
  kci.indicator_code,
  kci.indicator_name,
  m.relevance_score
FROM global_impact_kci_mapping m
JOIN global_impact_library imp ON imp.id = m.global_impact_id
JOIN global_kri_kci_library kci ON kci.id = m.global_kci_id
LIMIT 5;
-- Expected: Readable mapping data
```

**✅ PASS CRITERIA:**
- Root Cause → KRI mappings: 82 records
- Impact → KCI mappings: 58 records
- Mappings show proper cause/impact → indicator relationships
- Relevance scores are reasonable (50-100)

---

## TEST 5: Verify Enhancement Views

**Purpose:** Confirm new feature views are operational

**SQL Tests:**

```sql
-- Test 5.1: Residual Risk View
SELECT COUNT(*) FROM residual_risk_view;
-- Expected: Should match number of risks with residual calculations

SELECT * FROM residual_risk_view LIMIT 3;
-- Expected: Shows risk_title, inherent_score, residual_score, risk_reduction, etc.

-- Test 5.2: Control Maturity View
SELECT * FROM control_maturity_view
ORDER BY overall_maturity DESC;
-- Expected: Shows control categories with maturity scores

-- Test 5.3: Risk Decomposition View
SELECT COUNT(*) FROM risk_decomposition_view;
-- Expected: Should match number of risks

SELECT * FROM risk_decomposition_view LIMIT 2;
-- Expected: Shows risk with all_root_causes and all_impacts as JSONB
```

**✅ PASS CRITERIA:**
- Residual risk view returns data for existing risks
- Control maturity view shows all control categories
- Risk decomposition view aggregates causes/impacts properly
- No SQL errors when querying views

---

## TEST 6: Test Organization Isolation (RLS)

**Purpose:** Verify organizations can't see each other's custom data

**Setup Required:**
You need to test with actual user accounts from different organizations.

**SQL Tests (as authenticated user):**

```sql
-- Test 6.1: Check current user context
SELECT
  auth.uid() as user_id,
  up.email,
  up.organization_id,
  o.name as organization_name
FROM user_profiles up
JOIN organizations o ON o.id = up.organization_id
WHERE up.id = auth.uid();
-- Expected: Shows your current user and org

-- Test 6.2: View org-specific customizations
SELECT COUNT(*)
FROM org_root_causes
WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid());
-- Expected: Should only see your org's customizations (likely 0 initially)

-- Test 6.3: Attempt to view another org's data
SELECT COUNT(*)
FROM org_root_causes
WHERE organization_id != (SELECT organization_id FROM user_profiles WHERE id = auth.uid());
-- Expected: Should return 0 (RLS blocks other org data)
```

**Manual Test:**
1. Log in as User A (Organization 1)
2. Create a custom root cause via org_root_causes table
3. Log out and log in as User B (Organization 2)
4. Query org_root_causes - should NOT see User A's custom cause
5. Query root_cause_register view - should see 45 global + 0 org-specific

**✅ PASS CRITERIA:**
- Users only see global data + their own org's customizations
- Users cannot query other organizations' custom data
- RLS policies are enforcing multi-tenancy

---

## TEST 7: Application Integration Test (UI)

**Purpose:** Verify the application UI works with new architecture

**Manual UI Tests:**

### 7.1: Create a New Risk

1. Open your MinRisk application (http://localhost:3000 or production URL)
2. Navigate to Risk Register
3. Click "Add New Risk"
4. **Check Root Cause Dropdown:**
   - Should show 45 global root causes
   - Should be categorized/organized
   - Select one (e.g., "RC-001: Inadequate internal controls")
5. **Check Impact Dropdown:**
   - Should show 30 global impacts
   - Select one (e.g., "IMP-001: Service disruption")
6. **Check Control Selection:**
   - Should show 95 global controls
   - Should display DIME scores
   - Select 1-2 controls
7. Fill in other required fields (title, likelihood, impact scores, etc.)
8. Save the risk

**✅ PASS CRITERIA:**
- Dropdowns populate with global library data
- No errors or empty dropdowns
- Risk saves successfully
- Risk appears in risk register

### 7.2: View Risk Details

1. Open the risk you just created
2. **Verify:**
   - Root cause shows correct name and description
   - Impact shows correct details
   - Controls show with DIME scores
   - All data is readable and formatted correctly

**✅ PASS CRITERIA:**
- All linked global library items display correctly
- No broken references or missing data
- UI renders properly

### 7.3: Test Residual Risk Calculation (if implemented)

1. For the risk you created, check if residual risk is calculated
2. **SQL Check:**
```sql
SELECT
  risk_title,
  inherent_likelihood,
  inherent_impact,
  inherent_score,
  residual_score,
  risk_reduction_percentage
FROM residual_risk_view
WHERE risk_title = 'YOUR_TEST_RISK_TITLE';
```

**✅ PASS CRITERIA:**
- Residual risk is calculated based on controls
- Risk reduction percentage is reasonable
- Calculation logic is working

---

## TEST 8: Performance Check

**Purpose:** Ensure views perform well

**SQL Tests:**

```sql
-- Test 8.1: View query performance
EXPLAIN ANALYZE
SELECT * FROM root_cause_register LIMIT 100;
-- Expected: Execution time < 50ms

EXPLAIN ANALYZE
SELECT * FROM control_library LIMIT 100;
-- Expected: Execution time < 100ms

-- Test 8.2: Join performance
EXPLAIN ANALYZE
SELECT
  rc.cause_name,
  kri.indicator_name,
  m.relevance_score
FROM global_root_cause_kri_mapping m
JOIN global_root_cause_library rc ON rc.id = m.global_root_cause_id
JOIN global_kri_kci_library kri ON kri.id = m.global_kri_id
LIMIT 50;
-- Expected: Execution time < 100ms
```

**✅ PASS CRITERIA:**
- All queries execute in reasonable time
- No significant performance degradation
- Indexes are being used (check EXPLAIN ANALYZE output)

---

## TEST 9: Backup Verification

**Purpose:** Confirm old data was backed up safely

**SQL Tests:**

```sql
-- Test 9.1: Check backup tables exist
SELECT tablename
FROM pg_tables
WHERE tablename LIKE '%_backup_20251126'
ORDER BY tablename;
-- Expected: List of backup tables (if migration occurred)

-- Test 9.2: Compare record counts (if backups exist)
-- Example for root causes:
SELECT
  (SELECT COUNT(*) FROM root_cause_register_backup_20251126) as backup_count,
  (SELECT COUNT(*) FROM root_cause_register) as current_count;
-- Expected: Current >= Backup (global data added)
```

**✅ PASS CRITERIA:**
- Backup tables exist (if migration occurred)
- No data loss
- Can restore from backups if needed

---

## TEST 10: Edge Cases & Error Handling

**Purpose:** Test boundary conditions

**SQL Tests:**

```sql
-- Test 10.1: Try to insert duplicate indicator code
INSERT INTO global_kri_kci_library (indicator_code, indicator_name)
VALUES ('KRI-001', 'Duplicate Test');
-- Expected: ERROR (unique constraint violation)

-- Test 10.2: Try to query with invalid org context
-- (Requires authenticated user session)
SELECT * FROM org_root_causes;
-- Expected: Only returns rows for authenticated user's org

-- Test 10.3: Verify NULL handling in views
SELECT COUNT(*)
FROM residual_risk_view
WHERE residual_score IS NULL;
-- Expected: Count of risks without residual calculations
```

**✅ PASS CRITERIA:**
- Constraints prevent invalid data
- RLS blocks unauthorized access
- Views handle NULL values gracefully

---

## Test Results Summary

Fill this in as you complete tests:

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Global Libraries Accessible | ⬜ | |
| 2 | Unified Views Working | ⬜ | |
| 3 | Data Quality Check | ⬜ | |
| 4 | Mappings Functional | ⬜ | |
| 5 | Enhancement Views | ⬜ | |
| 6 | RLS Organization Isolation | ⬜ | |
| 7 | Application UI Integration | ⬜ | |
| 8 | Performance Acceptable | ⬜ | |
| 9 | Backups Verified | ⬜ | |
| 10 | Edge Cases Handled | ⬜ | |

**Legend:**
- ✅ = Passed
- ❌ = Failed
- ⚠️ = Partial / Needs Review
- ⬜ = Not Yet Tested

---

## Issues Found

Document any issues here:

| Issue # | Description | Severity | Status | Resolution |
|---------|-------------|----------|--------|------------|
| | | | | |

---

## Sign-Off

- [ ] All critical tests passed
- [ ] Application is functional
- [ ] No data loss
- [ ] Performance is acceptable
- [ ] Ready for production use

**Tested By:** ___________________
**Date:** ___________________
**Signature:** ___________________

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark deployment as successful
2. 📝 Update team on new architecture
3. 🎓 Train users on new features (if applicable)
4. 🗑️ Schedule cleanup of backup tables (after 1-2 weeks)

If issues found:
1. Document all failures in "Issues Found" section
2. Review rollback procedure in HYBRID_DEPLOYMENT_GUIDE.md
3. Fix issues or rollback if critical
4. Re-test after fixes
