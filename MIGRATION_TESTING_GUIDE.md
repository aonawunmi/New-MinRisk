# Migration Testing Guide - Continuous Risk Evolution Architecture

---

## **Quick Start**

### **Step 1: Run Migration Script**

```bash
./test-migration.sh
```

This will:
- ✅ Load environment variables
- ✅ Verify you're on development database
- ✅ Apply SQL migration
- ✅ Create new tables (active_period, risk_history, period_commits, control_assessments)
- ✅ Verify tables created successfully
- ✅ Check risks table unchanged

### **Step 2: Test Period Commit Function**

```bash
npm run test:migration
```

This will:
- ✅ Authenticate current user
- ✅ Get organization and active period
- ✅ Call `commitPeriod()` function
- ✅ Verify risks NOT deleted (continuous model)
- ✅ Verify `risk_history` snapshots created
- ✅ Verify `active_period` advanced to next quarter

---

## **What Gets Tested**

### **Migration Script Tests:**

1. **Safety Check** - Confirms you're on development database
2. **Table Creation** - Verifies new tables exist:
   - `active_period`
   - `risk_history`
   - `period_commits`
   - `control_assessments`
3. **Data Preservation** - Confirms risks table unchanged
4. **Migration of Old Data** - Converts old `risk_snapshots` to new format

### **TypeScript Test Script:**

1. **Authentication** - Verifies user logged in
2. **Pre-Commit State** - Counts risks, checks active period
3. **Period Commit** - Executes `commitPeriod()` function
4. **Critical Test: Risks Preserved** - Verifies risks NOT deleted (continuous model)
5. **History Snapshots** - Confirms `risk_history` entries created
6. **Period Advancement** - Validates active period moved to next quarter

---

## **Expected Output**

### **Successful Migration:**

```
╔══════════════════════════════════════════════════════════════════════╗
║  MinRisk - Continuous Risk Evolution Architecture Migration Test    ║
╚══════════════════════════════════════════════════════════════════════╝

✓ Loaded .env.development
ℹ Supabase Project: qrxwgjjgaekalvaqzpuf

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 1: Safety Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠ WARNING: This script will modify your database schema.
   Make sure you're running against a DEVELOPMENT database.

✓ Proceeding with development database

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 2: Pre-Migration Snapshot
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ Current risks in database: 15

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 3: Running Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Migration completed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 4: Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ active_period table exists
✓ risk_history table exists
✓ period_commits table exists
✓ control_assessments table exists

✓ Risks table unchanged (15 risks preserved)
```

### **Successful Period Commit Test:**

```
╔══════════════════════════════════════════════════════════════════════╗
║     Test: Continuous Risk Evolution - Period Commit Function        ║
╚══════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 1: Authentication & Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Authenticated as: admin@minrisk.com
✓ Organization ID: abc-123-def

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 2: Pre-Commit State
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ Current risks in database: 15
ℹ Active period: Q4 2024

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 3: Committing Period
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ Committing period: Q4 2024

✓ Period committed successfully!

Commit details:
  - Period: Q4 2024
  - Risks snapshotted: 15
  - Active risks: 12
  - Closed risks: 3
  - Controls: 23

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 4: Verify Risks Preserved (Continuous Model)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Risks preserved: 15 risks (same as before) ✓
✓ Continuous risk model working correctly!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 5: Verify Risk History Snapshots
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Created 15 risk_history snapshots

Sample snapshot:
  - Risk: R-FIN-001 - Fraud Risk in Payment Processing
  - Inherent: L4 × I5 = 20
  - Residual: L2 × I4 = 8
  - Status: OPEN
  - Change type: PERIOD_COMMIT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 6: Verify Active Period Advanced
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Period advanced: Q4 2024 → Q1 2025 ✓
ℹ Previous period stored: Q4 2024

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ All tests passed!

Verified:
  ✓ Period committed successfully
  ✓ Risks preserved (continuous model)
  ✓ risk_history snapshots created
  ✓ active_period advanced to next quarter

Architecture working correctly! ✨
```

---

## **Troubleshooting**

### **Error: Migration file not found**

```bash
cd /path/to/NEW-MINRISK
ls -la supabase/migrations/
```

Ensure `20250101_continuous_risk_architecture.sql` exists.

### **Error: Not authenticated**

Before running `npm run test:migration`, log in to the app:
1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Log in as admin user
4. Then run the test

### **Error: Period already committed**

The test tries to commit the current active period. If it's already committed:

**Option A:** Delete the existing commit (development only!)
```sql
DELETE FROM period_commits
WHERE organization_id = 'your-org-id'
  AND period_year = 2024
  AND period_quarter = 4;

DELETE FROM risk_history
WHERE organization_id = 'your-org-id'
  AND period_year = 2024
  AND period_quarter = 4;
```

**Option B:** Manually advance to next period
```sql
UPDATE active_period
SET current_period_year = 2025,
    current_period_quarter = 1
WHERE organization_id = 'your-org-id';
```

### **Error: Supabase CLI not found**

The script will try to use `npx` as fallback. Alternatively, install Supabase CLI:

```bash
npm install -g supabase
```

---

## **Manual Database Connection**

If you prefer to run the SQL migration manually:

```bash
# Using psql directly
psql "postgresql://postgres.qrxwgjjgaekalvaqzpuf:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20250101_continuous_risk_architecture.sql

# Or via Supabase SQL Editor
# 1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql
# 2. Copy entire contents of 20250101_continuous_risk_architecture.sql
# 3. Paste and run
```

---

## **What to Check After Migration**

### **In Supabase Dashboard:**

1. **Table Editor** → Check new tables exist:
   - `active_period`
   - `risk_history`
   - `period_commits`
   - `control_assessments`

2. **View `active_period`:**
   - Should have one row per organization
   - `current_period_year` and `current_period_quarter` should be set
   - Defaults to current quarter if not previously set

3. **View `risk_history`:**
   - If you had old `risk_snapshots`, should see migrated data
   - Period stored as `period_year` + `period_quarter` (not "Q3 2025" text)

4. **View `risks` table:**
   - New columns: `created_period_year`, `created_period_quarter`, `is_active`
   - All existing risks preserved
   - No data loss

---

## **Next Steps After Successful Migration**

Once migration passes and period commit test succeeds:

1. ✅ **Build Period Management UI** (Admin panel)
   - Shows current active period
   - Button to commit period
   - Lists committed periods

2. ✅ **Build Risk History View**
   - Dropdown to select past periods
   - Read-only view of historical risks
   - Timeline view for individual risks

3. ✅ **Update Period Comparison**
   - Use new `risk_history` table
   - Support "Current vs Last Snapshot"
   - Show structured period formats

4. ✅ **Update Risk Register**
   - Remove period column
   - Add current period banner
   - Filter active risks by default

---

## **Rollback (If Needed)**

If you need to undo the migration:

```sql
-- Drop new tables
DROP TABLE IF EXISTS risk_history CASCADE;
DROP TABLE IF EXISTS period_commits CASCADE;
DROP TABLE IF EXISTS control_assessments CASCADE;
DROP TABLE IF EXISTS active_period CASCADE;

-- Remove new columns from existing tables
ALTER TABLE risks DROP COLUMN IF EXISTS created_period_year;
ALTER TABLE risks DROP COLUMN IF EXISTS created_period_quarter;
ALTER TABLE risks DROP COLUMN IF EXISTS is_active;

ALTER TABLE incidents DROP COLUMN IF EXISTS period_year;
ALTER TABLE incidents DROP COLUMN IF EXISTS period_quarter;
ALTER TABLE incidents DROP COLUMN IF EXISTS risk_code_at_time;
```

**⚠️ Warning:** This will delete historical data. Only do this in development!

---

## **Files Involved**

| File | Purpose |
|------|---------|
| `test-migration.sh` | Bash script to apply SQL migration and verify tables |
| `test-commit-period.ts` | TypeScript test for `commitPeriod()` function |
| `supabase/migrations/20250101_continuous_risk_architecture.sql` | Complete database schema migration |
| `src/lib/periods-v2.ts` | New period management library |
| `package.json` | Added `test:migration` script |

---

**Ready to test?** Run:

```bash
./test-migration.sh
```

Then:

```bash
npm run test:migration
```
