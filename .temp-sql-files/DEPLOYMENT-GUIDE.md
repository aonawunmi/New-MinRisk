# Admin Enhancements Deployment Guide

**Features:** Audit Trail, Help Documentation, User Invitations
**Branch:** `feature/admin-enhancements-core`
**Date:** 2025-12-05

---

## 📋 Overview

This guide covers deployment and testing of 3 new admin features:

1. **Audit Trail** - Complete activity logging with filtering and export
2. **Help Tab** - Comprehensive in-app documentation (9 sections)
3. **User Invitations** - Pre-approved invite codes for new users

---

## 🚀 Quick Deployment (5 minutes)

### Option A: One-Command Deployment

```bash
./apply-all-migrations.sh
```

This applies both database migrations in sequence and provides verification steps.

### Option B: Step-by-Step Deployment

```bash
# 1. Apply Audit Trail migration
./apply-audit-migration.sh

# 2. Apply User Invitation migration
./apply-invitation-migration.sh
```

### Option C: Manual via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql
2. Click "New Query"
3. Copy contents of `supabase/migrations/20251204_audit_trail.sql`
4. Execute
5. Repeat for `supabase/migrations/20251205_user_invitations.sql`

---

## 🔐 Database Connection Details

The scripts use these connection details (update if needed):

```bash
DB_HOST="aws-0-us-east-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.yqjfxzkqzqslqwspjfgo"
```

**Password:** The scripts will prompt for `PGPASSWORD` or you can set it:

```bash
export PGPASSWORD="your_database_password"
```

---

## ✅ Verification Steps

After applying migrations, verify success:

```sql
-- Check audit trail table exists
SELECT COUNT(*) FROM audit_trail;
-- Expected: 0 (empty table ready for use)

-- Check invitations table exists
SELECT COUNT(*) FROM user_invitations;
-- Expected: 0 (no invitations yet)

-- Check audit functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('log_audit_entry', 'audit_risks_trigger', 'audit_controls_trigger');
-- Expected: 3 rows

-- Check invitation functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('create_invitation', 'validate_invitation', 'use_invitation');
-- Expected: 3 rows
```

---

## 🧪 Testing Checklist

### Feature 1: Audit Trail

**Location:** Admin Panel → Audit Trail tab

**Test Cases:**

- [ ] **View Empty State**
  - Navigate to Audit Trail
  - Should show "No audit trail entries found"

- [ ] **Generate Audit Entry**
  - Go to Risk Register
  - Create or update a risk
  - Return to Audit Trail
  - Should see entry with "create" or "update" action

- [ ] **Test Filtering**
  - Filter by Action Type: "create"
  - Filter by Entity Type: "risk"
  - Filter by User (your name)
  - Clear filters

- [ ] **Test Search**
  - Enter risk code in search
  - Should filter results

- [ ] **View Details**
  - Click "View" button on an entry
  - Should show before/after values
  - For create: only "after" values
  - For update: both "before" and "after"

- [ ] **Export CSV**
  - Click "Export CSV" button
  - Should download file: `audit-trail-YYYY-MM-DD.csv`
  - Open CSV and verify data

**Expected Results:**
- All actions (create/update/delete) are logged automatically
- Filters work correctly
- Detail view shows change history
- CSV export contains all visible entries

---

### Feature 2: Help Documentation

**Location:** Admin Panel → Help tab

**Test Cases:**

- [ ] **Navigate to Help**
  - Go to Admin Panel
  - Click "Help" tab (7th tab)
  - Should show help interface

- [ ] **View Sections**
  - "Getting Started" should be expanded by default
  - 9 sections total visible

- [ ] **Expand/Collapse**
  - Click any collapsed section to expand
  - Click expanded section to collapse
  - Verify smooth animation

- [ ] **Test Search**
  - Type "audit" in search box
  - Should filter to Admin Panel section
  - Type "AI" in search box
  - Should show AI Features section
  - Clear search

- [ ] **Verify Content Accuracy**
  - Read through each section
  - Verify features match NEW-MINRISK
  - Check no references to un-ported features (VaR, RSS Phase 2)

**Expected Results:**
- All 9 sections load correctly
- Search filters sections in real-time
- Content is accurate and helpful
- No broken links or references

---

### Feature 3: User Invitations

**Location:** Admin Panel → User Management → Invitations tab

**Test Cases:**

#### Part A: Create Invitation

- [ ] **Open Invitation Dialog**
  - Navigate to User Management → Invitations
  - Click "Create Invitation" button
  - Dialog should open

- [ ] **Fill Form**
  - Email: `test@example.com`
  - Role: `User (View & Edit)`
  - Expires: `7 days (recommended)`
  - Notes: `Test invitation`
  - Click "Create Invitation"

- [ ] **View Generated Code**
  - Should see 8-character code (e.g., "ABC12XYZ")
  - Code should be uppercase
  - No confusing characters (0, O, 1, I)

- [ ] **Copy Code**
  - Click copy button
  - Should see "copied to clipboard" message
  - Paste somewhere to verify

- [ ] **Verify in List**
  - Close dialog
  - Should see invitation in "Pending" tab
  - Check email, role, expiry date

#### Part B: Test Signup Flow

**Option 1: If Signup Form is Integrated**

- [ ] **Navigate to Signup**
  - Open app in incognito window
  - Find signup form

- [ ] **Sign Up with Invite Code**
  - Full Name: `Test User`
  - Email: `test@example.com` (must match invitation)
  - Password: `TestPass123!`
  - Confirm Password: `TestPass123!`
  - Invite Code: [paste code from Part A]
  - Click "Sign Up"

- [ ] **Verify Success**
  - Should see "Account created successfully!"
  - Should redirect to login

- [ ] **Test Login**
  - Log in with `test@example.com` / `TestPass123!`
  - Should succeed immediately (no pending approval)

- [ ] **Check Invitation Status**
  - Log in as admin
  - Go to Invitations → "Used" tab
  - Should see invitation marked as "Used"
  - Should show who used it and when

**Option 2: If Signup Form Not Yet Integrated**

- [ ] **Manual Database Test**
  ```sql
  -- Validate invitation (simulates signup)
  SELECT * FROM validate_invitation('ABC12XYZ', 'test@example.com');
  -- Should return: is_valid = true

  -- Mark as used (simulates successful signup)
  SELECT use_invitation('ABC12XYZ', 'user-id-here');
  -- Should return: true

  -- Check status changed
  SELECT status FROM user_invitations WHERE invite_code = 'ABC12XYZ';
  -- Should return: 'used'
  ```

#### Part C: Error Cases

- [ ] **Invalid Code**
  - Try signup with code: `INVALID1`
  - Should show error: "Invalid invite code"

- [ ] **Wrong Email**
  - Try signup with valid code but different email
  - Should show error: "Invalid invite code or email"

- [ ] **Used Code**
  - Try to use same code again
  - Should show error: "Invitation has already been used"

- [ ] **Expired Code**
  - Create invitation with expiry: 1 day
  - Manually expire it:
    ```sql
    UPDATE user_invitations
    SET expires_at = NOW() - INTERVAL '1 day'
    WHERE invite_code = 'YOUR_CODE';
    ```
  - Try to use the code
  - Should show error: "Invitation has expired"

#### Part D: Revoke Invitation

- [ ] **Create New Invitation**
  - Create another test invitation
  - Copy the code

- [ ] **Revoke Before Use**
  - In Pending tab, click "Revoke" button
  - Enter reason: "Testing revocation"
  - Confirm

- [ ] **Verify Revoked**
  - Should move to "Revoked" tab
  - Should show revoke reason
  - Should show who revoked it

- [ ] **Try to Use Revoked Code**
  - Attempt signup with revoked code
  - Should show error: "Invitation has been revoked"

**Expected Results:**
- Invitation creation is instant
- Valid codes work immediately
- Invalid/used/expired codes show clear errors
- Admin can revoke unused invitations
- All status changes are tracked

---

## 🐛 Troubleshooting

### Migration Fails with "relation already exists"

**Cause:** Migrations already applied

**Solution:**
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables
WHERE tablename IN ('audit_trail', 'user_invitations');

-- If they exist, skip that migration
```

### "Permission denied" errors

**Cause:** Insufficient database privileges

**Solution:**
- Verify you're using the service role key (not anon key)
- Check database user has CREATE TABLE privileges
- Contact Supabase support if issue persists

### Audit Trail not showing entries

**Cause:** Triggers may not be firing

**Solution:**
```sql
-- Check triggers exist
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgname LIKE 'audit_%';

-- Should see 3 triggers (risks, controls, user_profiles)

-- Test manual logging
SELECT log_audit_entry('test', 'risk', 'TEST-001', NULL);
-- Should return UUID
```

### Invitation validation fails

**Cause:** RLS policies or function issues

**Solution:**
```sql
-- Test function directly
SELECT * FROM validate_invitation('ABC12XYZ', 'test@example.com');

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'user_invitations';
```

### Help Tab not showing

**Cause:** Component not imported or route issue

**Solution:**
- Check AdminPanel.tsx imports HelpTab
- Verify tab trigger has correct value="help"
- Check browser console for errors

---

## 📊 Feature Matrix

| Feature | Migration | Backend | UI | Tested |
|---------|-----------|---------|----|----|
| Audit Trail | ✅ | ✅ | ✅ | ⏳ |
| Help Documentation | N/A | N/A | ✅ | ⏳ |
| User Invitations | ✅ | ✅ | ✅ | ⏳ |

---

## 🔄 Rollback Plan

If you need to rollback these features:

### Remove Audit Trail
```sql
DROP TRIGGER IF EXISTS audit_risks_trigger ON risks;
DROP TRIGGER IF EXISTS audit_controls_trigger ON controls;
DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
DROP FUNCTION IF EXISTS audit_risks_trigger();
DROP FUNCTION IF EXISTS audit_controls_trigger();
DROP FUNCTION IF EXISTS audit_user_profiles_trigger();
DROP FUNCTION IF EXISTS log_audit_entry(TEXT, TEXT, TEXT, JSONB);
DROP TABLE IF EXISTS audit_trail;
```

### Remove User Invitations
```sql
DROP FUNCTION IF EXISTS cleanup_expired_invitations();
DROP FUNCTION IF EXISTS revoke_invitation(UUID, TEXT);
DROP FUNCTION IF EXISTS use_invitation(VARCHAR, UUID);
DROP FUNCTION IF EXISTS validate_invitation(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS create_invitation(VARCHAR, UUID, VARCHAR, INTEGER, TEXT);
DROP FUNCTION IF EXISTS generate_invite_code();
DROP TABLE IF EXISTS user_invitations;
```

### Revert Code
```bash
git checkout main
# Or
git revert <commit-hash>
```

---

## 📈 Next Steps

After successful deployment and testing:

1. **User Training**
   - Show admins the new Invitations tab
   - Demonstrate audit trail filtering
   - Point users to Help documentation

2. **Documentation Updates**
   - Update user manual with new features
   - Create video tutorials if needed
   - Add to onboarding checklist

3. **Monitoring**
   - Watch audit trail for performance issues
   - Monitor invitation usage patterns
   - Gather user feedback

4. **Future Features**
   - Feature 4: Archive Management (2 days)
   - Feature 5: Report Generation - PDF (4 days)

---

## 📞 Support

If you encounter issues:

1. Check this deployment guide
2. Review error messages in browser console
3. Check database logs in Supabase dashboard
4. Refer to feature documentation in Help tab

---

**Deployment completed by:** Claude Code
**Feature branch:** feature/admin-enhancements-core
**Commits:** 3 (Audit Trail, Help Tab, User Invitations)
