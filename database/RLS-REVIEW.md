# RLS Policy Review for MinRisk v4.0

## CRITICAL FINDINGS

### The NEW-MINRISK Pattern (from Phases 1-2)

**Two-Client Architecture:**
1. **Regular Client (`supabase`)**: Uses RLS policies, for all user operations
2. **Admin Client (`supabaseAdmin`)**: BYPASSES RLS entirely, for admin-only operations

**From supabase.ts lines 27-35:**
```typescript
/**
 * Admin Supabase client - BYPASSES RLS policies
 * Use ONLY for admin operations like:
 * - Listing all users in an organization
 * - Approving/rejecting pending users
 * - Changing user roles
 * - Inviting users
 */
```

### The Correct RLS Pattern

**PostgreSQL allows MULTIPLE policies on the same table.**
- For SELECT: Policies are combined with OR logic
- For INSERT/UPDATE/DELETE: Policies are combined with OR logic

**Example from existing migration-final.sql (lines 105-108):**
```sql
CREATE POLICY "admin_all_assessments"
ON risk_assessments FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id());
```

### Required Pattern for Each Table

**For user-scoped tables (risks, incidents, etc.):**

1. **User Policy**: Allow users to access their own records
   ```sql
   CREATE POLICY "Users can view their own risks"
     ON risks FOR SELECT
     USING (user_id = auth.uid());
   ```

2. **Admin Policy**: Allow admins to access all org records
   ```sql
   CREATE POLICY "Admins can view all org risks"
     ON risks FOR SELECT
     USING (organization_id = current_org_id() AND is_admin());
   ```

**Result:**
- Regular users: See only their own records (Policy 1)
- Admins: See all org records (Policy 2 grants broader access)
- Both use the same `supabase` client - RLS handles the logic

**For org-scoped tables (KRI definitions, external events, etc.):**

Only one policy needed - already org-scoped:
```sql
CREATE POLICY "Users can view their org KRIs"
  ON kri_definitions FOR SELECT
  USING (organization_id = current_org_id());
```
This works for both users AND admins because both belong to same org.

---

## ISSUES IN CURRENT complete-schema-v4.sql

### ❌ PROBLEM: Missing Admin Policies

**Current risks table policies:**
```sql
-- Users can view their own risks
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**This is INCOMPLETE!** Admins cannot see other users' risks.

### ✅ SOLUTION: Add Admin Policies

**For risks table (and similarly for controls):**
```sql
-- Policy 1: Users can view their own risks
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Admins can view all org risks
CREATE POLICY "Admins can view all org risks"
  ON risks FOR SELECT
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());
```

Apply same pattern for:
- INSERT policies
- UPDATE policies
- DELETE policies

---

## CORRECTED POLICY STRUCTURE

### Risks Table (User-Scoped)

```sql
-- SELECT policies (OR logic)
DROP POLICY IF EXISTS "Users can view their own risks" ON risks;
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all org risks" ON risks;
CREATE POLICY "Admins can view all org risks"
  ON risks FOR SELECT
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());

-- INSERT policies (OR logic)
DROP POLICY IF EXISTS "Users can insert their own risks" ON risks;
CREATE POLICY "Users can insert their own risks"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = current_org_id());

DROP POLICY IF EXISTS "Admins can insert risks for anyone" ON risks;
CREATE POLICY "Admins can insert risks for anyone"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = current_org_id() AND is_admin());

-- UPDATE policies (OR logic)
DROP POLICY IF EXISTS "Users can update their own risks" ON risks;
CREATE POLICY "Users can update their own risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update all org risks" ON risks;
CREATE POLICY "Admins can update all org risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());

-- DELETE policies (OR logic)
DROP POLICY IF EXISTS "Users can delete their own risks" ON risks;
CREATE POLICY "Users can delete their own risks"
  ON risks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can delete all org risks" ON risks;
CREATE POLICY "Admins can delete all org risks"
  ON risks FOR DELETE
  TO authenticated
  USING (organization_id = current_org_id() AND is_admin());
```

### Controls Table (Cascades from Risks)

```sql
-- SELECT policies
DROP POLICY IF EXISTS "Users can view controls for their risks" ON controls;
CREATE POLICY "Users can view controls for their risks"
  ON controls FOR SELECT
  TO authenticated
  USING (risk_id IN (SELECT id FROM risks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all org controls" ON controls;
CREATE POLICY "Admins can view all org controls"
  ON controls FOR SELECT
  TO authenticated
  USING (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) AND is_admin());

-- Similar for INSERT, UPDATE, DELETE
```

### KRI Tables (Already Org-Scoped - OK)

```sql
-- No changes needed - already allows all org users
CREATE POLICY "Users can view their org KRIs"
  ON kri_definitions FOR SELECT
  TO authenticated
  USING (organization_id = current_org_id());
```
This works for both regular users and admins.

---

## TESTING CHECKLIST

Once migration is applied, test the following:

### ✅ Regular User Tests
1. User A creates risk R1
2. User A can view R1 ✓
3. User B (same org) CANNOT view R1 ✓
4. User C (different org) CANNOT view R1 ✓

### ✅ Admin User Tests
1. Admin creates risk R2
2. Admin can view R2 ✓
3. User A creates risk R3
4. Admin can view R3 (this was FAILING before!) ✓
5. Admin can update R3 ✓
6. Admin can delete R3 ✓

### ✅ Org-Scoped Tests (KRI, Incidents, etc.)
1. User A creates KRI K1
2. User B (same org) can view K1 ✓
3. Admin (same org) can view K1 ✓
4. User C (different org) CANNOT view K1 ✓

---

## SUMMARY

**Root Cause of Previous Failure:**
- Missing admin policies for user-scoped tables (risks, controls)
- Admins could only see their own risks, not all org risks

**Fix:**
- Add separate admin policies with `is_admin()` check
- Use PostgreSQL's OR logic to combine user and admin policies
- Maintain org isolation with `current_org_id()` check

**Result:**
- ✅ Regular users: See only their own data
- ✅ Admins: See all org data
- ✅ Multi-tenancy preserved
- ✅ No changes to application code needed
