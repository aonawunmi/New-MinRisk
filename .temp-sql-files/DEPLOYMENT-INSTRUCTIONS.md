# 🚀 Audit Trail + Owner Transfer Migration - Deployment Instructions

**Date:** 2025-12-07
**Migration File:** `supabase/migrations/20251207_audit_and_owner_transfer.sql`
**Safety:** Rollback available in `ROLLBACK_20251207_audit_and_owner_transfer.sql`

---

## ✅ Pre-Deployment Checklist

- [ ] Dev server is running and app works
- [ ] No users actively editing risks right now
- [ ] Rollback script is ready
- [ ] Migration file reviewed and understood

---

## 📋 Deployment Steps (via Supabase Dashboard)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
2. Keep this tab open

### Step 2: Copy Migration SQL

1. Open file: `supabase/migrations/20251207_audit_and_owner_transfer.sql`
2. Copy **entire contents** (Ctrl+A, Ctrl+C)

### Step 3: Run Migration

1. Paste SQL into Supabase SQL Editor
2. Click **"Run"** (bottom right)
3. Wait for success message
4. **Expected output:** `Success. No rows returned`

### Step 4: Verify Migration

Run this verification query in SQL Editor:

```sql
-- Check tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('audit_trail', 'risk_owner_history');
-- Expected: 2 rows

-- Check triggers exist
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname LIKE 'audit_%' OR tgname = 'track_owner_transfers';
-- Expected: 4 rows

-- Check counts (should be 0 initially)
SELECT
  (SELECT COUNT(*) FROM audit_trail) as audit_count,
  (SELECT COUNT(*) FROM risk_owner_history) as transfer_count;
-- Expected: audit_count = 0, transfer_count = 0
```

### Step 5: Test Audit Trail Capture

1. Go to MinRisk app (http://localhost:5176 or production)
2. Edit any risk (change title or description)
3. Save the risk
4. Go back to Supabase SQL Editor
5. Run: `SELECT * FROM audit_trail ORDER BY performed_at DESC LIMIT 5;`
6. **Expected:** You should see the risk update logged

### Step 6: Test Owner Transfer Tracking

1. In MinRisk app, edit a risk
2. Change the Owner dropdown to a different user
3. Save
4. In Supabase SQL Editor, run:

```sql
SELECT * FROM risk_owner_history ORDER BY transferred_at DESC LIMIT 5;
```

5. **Expected:** You should see the owner transfer logged

### Step 7: Check Admin Panel Audit Trail

1. Go to MinRisk app
2. Navigate to: **Admin → Audit Trail**
3. **Expected:** You should see audit entries appear
4. Click on an entry to view details

---

## ⚠️ If Something Goes Wrong

### Symptoms of Problems:
- App crashes when editing risks
- Database errors in console
- Audit Trail tab shows errors
- Can't create/update risks

### Immediate Rollback:

1. Open Supabase SQL Editor
2. Open file: `ROLLBACK_20251207_audit_and_owner_transfer.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Verify triggers are removed: `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%';`
   (Should return 0 rows)

---

## 🔍 Debugging

### Check if triggers are firing:

```sql
-- Create a test risk (via app UI)
-- Then check:
SELECT * FROM audit_trail WHERE entity_type = 'risk' ORDER BY performed_at DESC LIMIT 5;
```

### Check if owner transfer is working:

```sql
-- Change risk owner (via app UI)
-- Then check:
SELECT * FROM risk_owner_history ORDER BY transferred_at DESC LIMIT 5;
```

### Check for errors in logs:

Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/logs/query

---

## ✅ Success Criteria

- [ ] Migration runs without errors
- [ ] 4 triggers exist (audit_risks, audit_controls, audit_user_profiles, track_owner_transfers)
- [ ] 2 tables exist (audit_trail, risk_owner_history)
- [ ] Editing a risk creates audit entry
- [ ] Changing owner creates transfer record
- [ ] Admin → Audit Trail shows entries
- [ ] No errors in app console
- [ ] App works normally

---

## 📝 What This Migration Does

### Part 1: Audit Trail
- Creates `audit_trail` table to log all system actions
- Adds triggers to automatically log:
  - Risk create/update/delete
  - Control create/update/delete
  - User create/update/delete
- Provides manual logging function for other actions
- Admin can view full audit history in Admin → Audit Trail

### Part 2: Owner Transfer Tracking
- Creates `risk_owner_history` table
- Adds trigger to log whenever risk owner changes
- Captures: previous owner, new owner, who made change, when, why
- Provides audit trail for ownership transfers (compliance requirement)

### Safety Features
- All triggers have null checks (won't crash if no user)
- Idempotent (can run multiple times safely)
- Uses DROP IF EXISTS for all objects
- Foreign keys with proper CASCADE/SET NULL
- RLS policies protect data
- Rollback script available

---

## 🎯 Next Steps After Deployment

1. Monitor app for 10-15 minutes
2. Create/edit a few risks to generate audit data
3. Check Admin → Audit Trail to see entries
4. If all looks good, proceed with owner transfer reason UI (next phase)

---

**Deployment Time Estimate:** 10-15 minutes
**Rollback Time (if needed):** 2 minutes
**Risk Level:** Low (triggers only fire on new changes, won't affect existing data)
