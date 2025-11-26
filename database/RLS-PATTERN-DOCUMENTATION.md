# MinRisk RLS (Row Level Security) Pattern Documentation

**Date:** November 20, 2025
**Version:** 1.0
**Status:** ✅ Tested and Verified
**Author:** MinRisk Development Team

---

## Executive Summary

This document describes the **dual-policy RLS pattern** implemented in MinRisk to provide:
1. **User-level data isolation** - Regular users see only their own data
2. **Admin organization-wide access** - Admins see all data in their organization
3. **Multi-tenant security** - Organizations cannot see each other's data

**All tests passed successfully on November 20, 2025.**

---

## The Dual-Policy Pattern

### Concept

PostgreSQL RLS allows **multiple policies on the same table** that are combined with **OR logic**. We use this to create two separate access patterns:

1. **User Policy**: Grants access to records where `user_id = auth.uid()`
2. **Admin Policy**: Grants access to records where `organization_id = current_org_id() AND is_admin()`

**Result**:
- Regular users: Access only their own records (Policy 1)
- Admins: Access all records in their organization (Policy 2 grants broader access)
- Both use the same database client - RLS handles the logic automatically

---

## Implementation

### Helper Functions

First, create helper functions that RLS policies can use:

```sql
-- Get current user's organization ID
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM user_profiles
  WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('primary_admin', 'secondary_admin', 'super_admin')
  FROM user_profiles
  WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Risks Table Policies

#### SELECT Policies (View Access)

```sql
-- User Policy: Users can view their own risks
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin Policy: Admins can view all org risks
CREATE POLICY "Admins can view all org risks"
  ON risks FOR SELECT
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());
```

#### INSERT Policies (Create Access)

```sql
-- User Policy: Users can insert their own risks
CREATE POLICY "Users can insert their own risks"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = current_org_id());

-- Admin Policy: Admins can insert risks for anyone
CREATE POLICY "Admins can insert risks for anyone"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = current_org_id() AND is_admin());
```

#### UPDATE Policies (Edit Access)

```sql
-- User Policy: Users can update their own risks
CREATE POLICY "Users can update their own risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin Policy: Admins can update all org risks
CREATE POLICY "Admins can update all org risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());
```

#### DELETE Policies (Delete Access)

```sql
-- User Policy: Users can delete their own risks
CREATE POLICY "Users can delete their own risks"
  ON risks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin Policy: Admins can delete all org risks
CREATE POLICY "Admins can delete all org risks"
  ON risks FOR DELETE
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());
```

---

## Controls Table (Cascading Pattern)

Controls are owned by risks, so they cascade the access from the parent risk:

```sql
-- User Policy: Users can view controls for their risks
CREATE POLICY "Users can view controls for their risks"
  ON controls FOR SELECT
  TO authenticated
  USING (risk_id IN (
    SELECT id FROM risks WHERE user_id = auth.uid()
  ));

-- Admin Policy: Admins can view all org controls
CREATE POLICY "Admins can view all org controls"
  ON controls FOR SELECT
  TO authenticated
  USING (risk_id IN (
    SELECT id FROM risks WHERE organization_id = current_org_id()
  ) AND is_admin());

-- Similar patterns for INSERT, UPDATE, DELETE
```

---

## Org-Scoped Tables (KRI, Incidents, etc.)

Some tables are organization-scoped by nature (not user-scoped). These only need **one policy**:

```sql
-- KRI definitions are org-scoped
CREATE POLICY "Users can view their org KRIs"
  ON kri_definitions FOR SELECT
  TO authenticated
  USING (organization_id = current_org_id());

-- This works for both regular users AND admins
-- because both belong to the same organization
```

---

## Test Results (November 20, 2025)

### Test Environment

**Organizations:**
- Acme Risk Management (ID: 11111111-1111-1111-1111-111111111111)
- Global Financial Services (ID: 22222222-2222-2222-2222-222222222222)

**Users:**
- admin1@acme.com (primary_admin) - Acme org
- user1@acme.com (user) - Acme org
- pending@acme.com (user) - Acme org
- user2@gfs.com (user) - GFS org

### Test Results

#### ✅ Test 1: User Isolation (user1@acme.com)
- **Action**: user1 created 3 risks
- **Result**: user1 sees only their 3 risks
- **Status**: PASS

#### ✅ Test 2: User Isolation (pending@acme.com)
- **Action**: pending user logged in (before creating risks)
- **Expected**: See 0 risks (cannot see user1's risks)
- **Result**: Saw 0 risks
- **Status**: PASS

#### ✅ Test 3: User Creates Own Risk
- **Action**: pending@acme.com created 1 risk (FIN-CRE-001)
- **Result**: pending sees only 1 risk (their own)
- **Status**: PASS

#### ✅ Test 4: Admin Org-Wide Access (CRITICAL)
- **Action**: admin1@acme.com logged in
- **Expected**: See ALL 4 Acme risks (user1's 3 + pending's 1)
- **Result**: Saw 4 risks
- **Status**: PASS ✅ **THIS IS THE KEY TEST**

#### ✅ Test 5: Admin CRUD Operations
- **Action**: admin1@acme.com edited pending's risk (FIN-CRE-001)
- **Expected**: Update succeeds
- **Result**: Successfully updated
- **Status**: PASS

#### ✅ Test 6: Cross-Org Isolation
- **Action**: user2@gfs.com (different org) logged in
- **Expected**: See 0 Acme risks
- **Result**: Saw 0 risks
- **Status**: PASS

---

## Benefits of This Pattern

### 1. Database-Level Security
- Cannot be bypassed by application bugs
- Works even if frontend has vulnerabilities
- PostgreSQL enforces at query execution time

### 2. Simplified Application Code
- No conditional logic needed in application
- Same client for all users
- RLS automatically applies correct filters

### 3. Multi-Tenant Safe
- Organization isolation guaranteed
- Admins limited to their own organization
- Cross-org leakage impossible

### 4. Performance
- Policies use indexes on `user_id` and `organization_id`
- No additional overhead in application layer
- PostgreSQL optimizes policy evaluation

### 5. Maintainability
- Policies defined in one place (database)
- Easy to audit and verify
- Changes apply immediately to all queries

---

## Comparison with Alternatives

### ❌ Application-Layer Filtering (Rejected)

```typescript
// BAD: Application must remember to filter
async function loadRisks(userId, isAdmin, orgId) {
  let query = supabase.from('risks').select('*');

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('organization_id', orgId);
  }

  return query;
}
```

**Problems:**
- Easy to forget the filter
- Every query needs manual filtering
- Security bugs if developer makes mistake
- Testing requires checking all code paths

### ✅ RLS Dual-Policy (Implemented)

```typescript
// GOOD: Just query, RLS handles filtering automatically
async function loadRisks() {
  return supabase.from('risks').select('*');
}
```

**Benefits:**
- One line of code
- Cannot be bypassed
- Automatic for all queries
- Centralized in database

---

## Common Pitfalls to Avoid

### ❌ Org-Scoped User Policy

```sql
-- WRONG: This lets all org users see all org data!
CREATE POLICY "Users can view org risks"
  ON risks FOR SELECT
  USING (organization_id = current_org_id());
```

This was the bug we fixed! This policy would let user1@acme.com see pending@acme.com's risks.

### ✅ User-Scoped User Policy

```sql
-- CORRECT: Users only see their own data
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  USING (user_id = auth.uid());
```

### ❌ Mixing User and Admin Logic in One Policy

```sql
-- WRONG: Complex and hard to understand
CREATE POLICY "View risks"
  ON risks FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (organization_id = current_org_id() AND is_admin())
  );
```

While this works, it's harder to maintain and understand.

### ✅ Separate User and Admin Policies

```sql
-- CORRECT: Clear separation of concerns
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all org risks"
  ON risks FOR SELECT
  USING (organization_id = current_org_id() AND is_admin());
```

---

## Verification Queries

### Check RLS is Enabled

```sql
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'risks';
```

### List All Policies on Risks Table

```sql
SELECT
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'risks'
ORDER BY policyname;
```

### Count Policies by Type

```sql
SELECT
  tablename,
  COUNT(*) FILTER (WHERE policyname ILIKE '%admin%') as admin_policies,
  COUNT(*) FILTER (WHERE policyname ILIKE '%user%') as user_policies,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('risks', 'controls')
GROUP BY tablename;
```

**Expected for `risks` table:**
- 4 admin policies (SELECT, INSERT, UPDATE, DELETE)
- 4 user policies (SELECT, INSERT, UPDATE, DELETE)
- 8 total policies

---

## Migration Guide

If you need to apply this pattern to a new table:

### Step 1: Enable RLS

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

### Step 2: Add User Policies

```sql
CREATE POLICY "Users can view their own records"
  ON your_table FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own records"
  ON your_table FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = current_org_id());

CREATE POLICY "Users can update their own records"
  ON your_table FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own records"
  ON your_table FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

### Step 3: Add Admin Policies

```sql
CREATE POLICY "Admins can view all org records"
  ON your_table FOR SELECT
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());

CREATE POLICY "Admins can insert records for anyone"
  ON your_table FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = current_org_id() AND is_admin());

CREATE POLICY "Admins can update all org records"
  ON your_table FOR UPDATE
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());

CREATE POLICY "Admins can delete all org records"
  ON your_table FOR DELETE
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());
```

### Step 4: Verify

```sql
-- Test with regular user
SELECT * FROM your_table; -- Should see only own records

-- Test with admin user
SELECT * FROM your_table; -- Should see all org records
```

---

## Troubleshooting

### Users Can See Each Other's Data

**Symptom**: Regular users see other users' records in the same org

**Diagnosis**: Check the user SELECT policy
```sql
SELECT qual FROM pg_policies
WHERE tablename = 'your_table' AND policyname ILIKE '%user%view%';
```

**If it shows**: `organization_id = current_org_id()` ← **WRONG**
**Should be**: `user_id = auth.uid()` ← **CORRECT**

**Fix**: Drop and recreate the user policy with correct USING clause

### Admins Cannot See All Org Data

**Symptom**: Admins only see their own records, not all org records

**Diagnosis**: Check if admin SELECT policy exists
```sql
SELECT * FROM pg_policies
WHERE tablename = 'your_table' AND policyname ILIKE '%admin%view%';
```

**If empty**: Admin policy is missing
**Fix**: Create the admin SELECT policy

### Cross-Org Data Leakage

**Symptom**: Users from Org A can see Org B's data

**Diagnosis**: Check if policies include organization_id check
```sql
SELECT policyname, qual FROM pg_policies
WHERE tablename = 'your_table';
```

**Fix**: Ensure all admin policies include `organization_id = current_org_id()`

---

## Performance Considerations

### Indexes

Ensure these indexes exist for optimal RLS performance:

```sql
-- User-scoped tables
CREATE INDEX idx_risks_user_id ON risks(user_id);
CREATE INDEX idx_risks_organization_id ON risks(organization_id);

-- For cascading access (controls)
CREATE INDEX idx_controls_risk_id ON controls(risk_id);
```

### Query Planning

Check query plans to ensure indexes are used:

```sql
EXPLAIN ANALYZE
SELECT * FROM risks;
-- Should show index scan on user_id or organization_id
```

---

## Security Best Practices

1. **Never bypass RLS in application code** - Always use the regular authenticated client
2. **Use service role sparingly** - Only for admin operations that legitimately need to bypass RLS
3. **Test with multiple users** - Verify isolation works as expected
4. **Audit policy changes** - Review and test whenever RLS policies are modified
5. **Monitor for errors** - Set up alerts for RLS-related permission errors
6. **Document exceptions** - If you must bypass RLS, document why and how

---

## Compliance & Audit

### SOC 2 Compliance

This RLS pattern supports SOC 2 requirements:
- **Logical Access Controls**: User isolation enforced at database level
- **Data Segregation**: Multi-tenant isolation guaranteed
- **Audit Trail**: All policy changes logged in PostgreSQL

### GDPR Compliance

RLS supports GDPR by:
- **Data Minimization**: Users access only necessary data
- **Access Controls**: Fine-grained access control
- **Data Portability**: User data can be exported via user_id filter

---

## Future Enhancements

### Potential Additions

1. **Time-based Access**: Add temporal policies (e.g., archived data read-only)
2. **Field-Level Security**: Mask sensitive fields based on role
3. **Audit Logging**: Trigger-based logging of policy evaluations
4. **Dynamic Policies**: Policies that change based on data state

---

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- MinRisk Solution Specification Document v4.0

---

## Changelog

### 2025-11-20: Initial Implementation & Testing
- ✅ Implemented dual-policy pattern for risks table
- ✅ Implemented cascading policies for controls table
- ✅ Fixed user isolation bug (org-scoped → user-scoped)
- ✅ All 6 tests passed successfully
- ✅ Documentation created

---

## Contact

For questions about this RLS pattern:
- Review this document
- Check test results in `/database/TEST-PLAN.md`
- Reference implementation in `/database/complete-schema-v4-FINAL.sql`

---

**Document Status**: ✅ Complete and Verified
**Last Updated**: November 20, 2025
**Next Review**: When adding new user-scoped tables
