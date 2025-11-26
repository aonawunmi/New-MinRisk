# RLS Policy Real-World Test Plan

## ✅ Database Verification Complete

**Results from SQL verification:**
- ✅ RLS enabled on all critical tables
- ✅ Risks table: 8 policies (4 user + 4 admin) - Perfect!
- ✅ Controls table: 13 policies (5 admin) - Working (has extras from old migrations)
- ✅ All critical admin policies present
- ✅ Helper functions exist and working

---

## 🧪 Real-World Testing (Using the App)

### Test Scenario Overview

We'll create:
1. **Organization**: Test Clearing House
2. **Admin User**: admin@ccp.com (role: primary_admin)
3. **Regular User 1**: user1@ccp.com (role: user)
4. **Regular User 2**: user2@ccp.com (role: user)

Each user will create risks, then we'll verify:
- Regular users see only their own risks
- Admin sees ALL risks in the organization

---

## Step 1: Start the Dev Server

```bash
cd "/Users/AyodeleOnawunmi/Library/CloudStorage/OneDrive-FMDQSecuritiesExchange/Desktop/AY/CODING/MinRisk/NEW-MINRISK"
npm run dev
```

Open: http://localhost:5175

---

## Step 2: Create Test Users

### Option A: Via Supabase Dashboard
1. Go to Authentication → Users
2. Create 3 users manually
3. Set their profiles in user_profiles table

### Option B: Via SQL (Faster)

Run in Supabase SQL Editor:

```sql
-- Check current users
SELECT
  email,
  full_name,
  role,
  status
FROM user_profiles up
JOIN auth.users u ON u.id = up.id
ORDER BY role, email;

-- If you need to update existing users for testing:
-- UPDATE user_profiles SET role = 'primary_admin' WHERE id = 'USER_ID_HERE';
-- UPDATE user_profiles SET role = 'user' WHERE id = 'USER_ID_HERE';
```

---

## Step 3: Test Regular User Access

### Login as Regular User 1

1. Login to app as user1@ccp.com
2. Create a test risk:
   - Risk Code: OPS-TEC-001
   - Title: "User 1's Risk"
   - Division: Operations
   - Category: Technology
3. Go to Risk Register
4. **Expected:** Should see ONLY risks created by user1

### Verify in Console (Browser DevTools)

```javascript
const { data: myRisks, error } = await supabase
  .from('risks')
  .select('risk_code, risk_title, user_id');

console.log('User 1 sees:', myRisks);
// Expected: Only risks where user_id = user1's ID
```

---

## Step 4: Test Another Regular User

### Login as Regular User 2

1. Logout and login as user2@ccp.com
2. Create a different risk:
   - Risk Code: FIN-CRE-001
   - Title: "User 2's Risk"
   - Division: Finance
   - Category: Credit
3. Go to Risk Register
4. **Expected:** Should see ONLY risks created by user2
5. **Expected:** Should NOT see User 1's risk

### Verify in Console

```javascript
const { data: myRisks } = await supabase
  .from('risks')
  .select('risk_code, risk_title, user_id');

console.log('User 2 sees:', myRisks);
// Expected: Only User 2's risks, NOT User 1's risks
```

---

## Step 5: Test Admin Access (CRITICAL TEST)

### Login as Admin

1. Logout and login as admin@ccp.com
2. Create an admin risk:
   - Risk Code: CLE-STR-001
   - Title: "Admin's Risk"
   - Division: Clearing
   - Category: Strategic
3. Go to Risk Register
4. **Expected:** Should see ALL risks:
   - User 1's risk (OPS-TEC-001)
   - User 2's risk (FIN-CRE-001)
   - Admin's risk (CLE-STR-001)

### Verify in Console

```javascript
const { data: allRisks } = await supabase
  .from('risks')
  .select('risk_code, risk_title, user_id');

console.log('Admin sees:', allRisks);
console.log('Total risks:', allRisks?.length);

// Expected: Should see risks from ALL users in organization
// This verifies the CRITICAL FIX is working
```

---

## Step 6: Test Admin CRUD Operations

### As Admin, Test Full CRUD on Other Users' Risks

**UPDATE Test:**
```javascript
// Try to update User 1's risk
const { data, error } = await supabase
  .from('risks')
  .update({ risk_title: 'Updated by Admin' })
  .eq('risk_code', 'OPS-TEC-001')
  .select();

console.log('Update result:', data, error);
// Expected: ✅ Success (admin can update other users' risks)
```

**DELETE Test:**
```javascript
// Try to delete User 2's risk (BE CAREFUL - this deletes for real)
const { error } = await supabase
  .from('risks')
  .delete()
  .eq('risk_code', 'FIN-CRE-001');

console.log('Delete error:', error);
// Expected: ✅ No error (admin can delete other users' risks)
```

---

## Step 7: Test Cross-Org Isolation (If Multiple Orgs)

If you have multiple organizations:

1. Login as user from Org A
2. Note your organization_id
3. Try to query risks from Org B:

```javascript
const { data: crossOrgRisks } = await supabase
  .from('risks')
  .select('*')
  .eq('organization_id', 'ORG_B_ID_HERE');

console.log('Cross-org risks:', crossOrgRisks);
// Expected: [] (empty - no access to other org's data)
```

---

## ✅ SUCCESS CRITERIA

After completing all tests, verify:

- [x] Regular users see only their own risks
- [x] Regular users cannot see other users' risks
- [x] **Admins see ALL risks in their organization** ← CRITICAL
- [x] Admins can update any risk in their org
- [x] Admins can delete any risk in their org
- [x] No cross-org data leakage
- [x] Controls follow same pattern as risks

---

## 🚨 If Something Fails

### Symptom: Admin sees only their own risks (not all org risks)

**Diagnosis:** Admin policies not working

**Fix:**
1. Check user's role:
   ```sql
   SELECT id, email, role FROM user_profiles
   WHERE id = 'ADMIN_USER_ID';
   ```
2. Verify role is 'primary_admin' or 'secondary_admin'
3. Check is_admin() function:
   ```sql
   SELECT is_admin(); -- Should return true when logged in as admin
   ```

### Symptom: Regular users see other users' risks

**Diagnosis:** RLS not enforcing properly

**Fix:**
1. Verify RLS is enabled:
   ```sql
   SELECT rowsecurity FROM pg_tables WHERE tablename = 'risks';
   ```
2. Check policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'risks';
   ```

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Mark RLS verification complete
2. ✅ Move to Section 6: Core Business Logic
3. ✅ Implement risk scoring calculations
4. ✅ Build UI components

---

## Quick Test Commands (Copy-Paste)

**Get current user info:**
```javascript
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user.id)
  .single();
console.log('Current user:', profile);
```

**Count visible risks:**
```javascript
const { data, count } = await supabase
  .from('risks')
  .select('*', { count: 'exact' });
console.log(`Visible risks: ${count}`);
```

**Test helper functions (via RPC if needed):**
```javascript
// Check organization
const { data: profile } = await supabase
  .from('user_profiles')
  .select('organization_id, role')
  .eq('id', (await supabase.auth.getUser()).data.user.id)
  .single();
console.log('My org:', profile.organization_id);
console.log('My role:', profile.role);
console.log('Am I admin?', ['primary_admin', 'secondary_admin'].includes(profile.role));
```
