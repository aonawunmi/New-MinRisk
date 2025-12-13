# Risk Appetite & Tolerance - FINAL Migration Instructions

## What Happened (Error History)

### Error 1: `kri_kci_library` is not a table
**Cause:** It existed as a VIEW (not a TABLE)
**Fixed:** Created `FIX_kri_library_view_to_table.sql`

### Error 2: Column `status` does not exist
**Cause:** Incomplete tables from previous failed migrations
**Solution:** Complete cleanup + fresh migration in ONE file

---

## SIMPLE SOLUTION: Run ONE File

**File:** `COMPLETE_kri_and_appetite_migration.sql` ⭐

This single script does EVERYTHING:
1. ✅ Cleans up incomplete tables (if any exist)
2. ✅ Creates `kri_values` (historical time-series)
3. ✅ Creates 4 appetite/tolerance tables
4. ✅ Sets up RLS policies
5. ✅ Creates helper functions
6. ✅ Adds audit triggers

---

## How to Run (ONE STEP)

### Prerequisites Check

**Before running, verify kri_kci_library is a TABLE:**

```sql
-- Run this first in Supabase SQL Editor
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'kri_kci_library';
```

**Expected result:**
```
table_name       | table_type
kri_kci_library  | BASE TABLE
```

**If it says VIEW instead:**
Run `FIX_kri_library_view_to_table.sql` first, then come back here.

**If it returns no rows:**
Run `FIX_kri_library_view_to_table.sql` first, then come back here.

---

### Run the Migration

1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
2. Open `COMPLETE_kri_and_appetite_migration.sql`
3. Copy entire contents
4. Paste into Supabase SQL Editor
5. Click **"Run"**
6. Wait for success message

---

## Expected Success Message

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ KRI Time-Series + Risk Appetite & Tolerance migration COMPLETE

📊 Tables Created:
   1. kri_values - Historical KRI time-series data
   2. risk_appetite_statements - Board-approved appetite
   3. risk_appetite_categories - Appetite per risk category
   4. tolerance_metrics - Green/Amber/Red thresholds
   5. appetite_breaches - Breach events & remediation

🔐 Security:
   - RLS policies enabled on all tables
   - Multi-tenant isolation enforced
   - Role-based access (admin, cro, user)

⚙️  Functionality:
   - Helper functions created
   - Audit triggers configured
   - All 6 critical fixes applied

📋 Next Steps:
   1. Start recording KRI values for trend analysis
   2. Create Risk Appetite Statement (Admin Panel)
   3. Define appetite categories for each risk type
   4. Configure tolerance metrics linked to KRIs
   5. Monitor appetite utilization dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Verification

After migration completes, verify all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'kri_kci_library',
    'kri_values',
    'risk_appetite_statements',
    'risk_appetite_categories',
    'tolerance_metrics',
    'appetite_breaches'
  )
ORDER BY table_name;
```

You should see **6 tables** listed.

---

## What This Fixes

✅ **Completes KRI Infrastructure:**
- `kri_values` table for historical tracking (was missing)
- Enables trend analysis and DIRECTIONAL metrics
- Regulatory compliance (CBN/SEC expect KRI history)

✅ **Risk Appetite & Tolerance Module:**
- All 6 critical fixes applied
- Production-grade boundary management
- Idempotent breach detection
- Blocking chain validation
- Deterministic scoring

✅ **Proper Architecture:**
- Appetite → Tolerance → KRI chain complete
- Foreign key relationships enforced
- Multi-tenant security with RLS

---

## Troubleshooting

### If migration fails with "kri_kci_library does not exist":
1. Run `FIX_kri_library_view_to_table.sql` first
2. Then run `COMPLETE_kri_and_appetite_migration.sql`

### If migration fails with "organizations does not exist":
Your Supabase database is missing core tables. Check:
```sql
SELECT * FROM organizations LIMIT 1;
```

### If migration fails with "user_profiles does not exist":
Auth system not set up. Check:
```sql
SELECT * FROM user_profiles LIMIT 1;
```

### To start completely fresh:
```sql
-- WARNING: Deletes all data!
DROP TABLE IF EXISTS appetite_breaches CASCADE;
DROP TABLE IF EXISTS tolerance_metrics CASCADE;
DROP TABLE IF EXISTS risk_appetite_categories CASCADE;
DROP TABLE IF EXISTS risk_appetite_statements CASCADE;
DROP TABLE IF EXISTS kri_values CASCADE;
DROP TABLE IF EXISTS kri_kci_library CASCADE;
```

Then:
1. Run `FIX_kri_library_view_to_table.sql`
2. Run `COMPLETE_kri_and_appetite_migration.sql`

---

## What's Next

After successful migration:

### Immediate:
- Verify all 6 tables exist (query above)
- Check you can query them: `SELECT COUNT(*) FROM kri_values;`

### Development:
- Commit migrations to GitHub
- Build admin UI for appetite configuration
- Implement breach detection logic
- Create appetite utilization dashboard

### Testing:
- Create test Risk Appetite Statement
- Define appetite categories
- Configure tolerance metrics
- Link metrics to KRIs
- Record KRI values and test breach detection

---

## Files in This Migration

1. **COMPLETE_kri_and_appetite_migration.sql** ⭐ - Run this
2. **FIX_kri_library_view_to_table.sql** - Run ONLY if kri_kci_library is a VIEW
3. **DIAGNOSTIC_check_appetite_tables.sql** - Optional: Check current state
4. **README_FINAL_MIGRATION.md** - This file

---

## Architecture Notes

**Why KRI values table is critical:**
- Without historical data, tolerance metrics are meaningless
- DIRECTIONAL metrics require trend analysis (30-day lookback)
- Regulators expect KRI history for compliance evidence
- Breach detection needs actual measured values

**Why this is production-grade:**
- All 6 critical fixes from risk management expert review
- Proper foreign key relationships (appetite → tolerance → KRI)
- RLS for multi-tenant security
- Audit triggers for compliance
- Helper functions for ease of use

**This is NOT a workaround** - it's how mature risk management should work.
