# Risk Appetite & Tolerance - Migration Instructions

## Errors You Got

### Error 1:
```
ERROR: 42809: referenced relation "kri_kci_library" is not a table
```

### Error 2 (when trying to fix):
```
ERROR: 42809: cannot create index on relation "kri_kci_library"
DETAIL: This operation is not supported for views.
```

## Root Cause
`kri_kci_library` exists in your Supabase database, but as a **VIEW** (not a TABLE). The appetite/tolerance module needs it as a table so it can store data and have foreign key relationships.

**Why it's a view:** An earlier migration may have created it as a read-only view, or it was manually created for testing.

---

## How to Fix - Run in This Exact Order

### Step 1: Convert KRI Library from VIEW to TABLE
**File:** `FIX_kri_library_view_to_table.sql` ⭐

1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
2. Open `FIX_kri_library_view_to_table.sql`
3. Copy entire contents
4. Paste into Supabase SQL Editor
5. Click **"Run"**
6. Wait for: `✅ kri_kci_library converted to TABLE successfully`

---

### Step 2: Create KRI Values + Appetite Tables
**File:** `20251213_kri_values_and_appetite.sql`

1. Stay in Supabase SQL Editor (or open new query)
2. Open `20251213_kri_values_and_appetite.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for: `✅ KRI Time-Series + Risk Appetite & Tolerance migration complete`

---

## Expected Success Messages

### After Step 1:
```
✅ kri_kci_library converted to TABLE successfully
   - Old view dropped (if existed)
   - Table created with proper schema
   - Indexes created
   - RLS policies enabled

📋 Next: Run 20251213_kri_values_and_appetite.sql
```

### After Step 2:
```
✅ KRI Time-Series + Risk Appetite & Tolerance migration complete
   - 1 KRI table created (kri_values - historical tracking)
   - 4 Appetite tables created
   - RLS policies enabled
   - Helper functions created
   - Audit triggers configured

📊 Next Steps:
   1. Start recording KRI values for trend analysis
   2. Create Risk Appetite Statement (Admin Panel)
   3. Define appetite categories for each risk type
   4. Configure tolerance metrics linked to KRIs
   5. Monitor appetite utilization dashboard
```

---

## What Gets Created

### Step 1 Creates:
- `kri_kci_library` - Definitions of KRIs and KCIs

### Step 2 Creates:
- `kri_values` - Historical time-series KRI data
- `risk_appetite_statements` - Board-approved appetite declarations
- `risk_appetite_categories` - Appetite per risk category
- `tolerance_metrics` - Quantitative thresholds (Green/Amber/Red)
- `appetite_breaches` - Breach events and remediation tracking

---

## Verification

After both steps complete, run this to verify:

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

You should see all 6 tables listed.

---

## Troubleshooting

**If Step 1 fails with "organizations table doesn't exist":**
- Run migrations from earlier phases first
- Check: `SELECT * FROM organizations LIMIT 1;`

**If Step 2 fails with "user_profiles doesn't exist":**
- Ensure auth system migrations have run
- Check: `SELECT * FROM user_profiles LIMIT 1;`

**If you want to start over:**
```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS appetite_breaches CASCADE;
DROP TABLE IF EXISTS tolerance_metrics CASCADE;
DROP TABLE IF EXISTS risk_appetite_categories CASCADE;
DROP TABLE IF EXISTS risk_appetite_statements CASCADE;
DROP TABLE IF EXISTS kri_values CASCADE;
DROP TABLE IF EXISTS kri_kci_library CASCADE;
```

Then run Step 1 and Step 2 again.
