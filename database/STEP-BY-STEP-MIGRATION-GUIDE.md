# Step-by-Step Migration Guide

## ✅ Fixed Approach - 9 Simple Steps

This approach breaks the migrations into small, manageable steps to avoid SQL execution order issues.

---

## Prerequisites

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
2. Keep this guide open alongside

---

## KRI Monitoring Tables (Steps 1-3)

### Step 1: Create KRI Tables

**File:** `01-create-kri-tables-minimal.sql`

1. Open the file in your editor
2. Copy **entire contents**
3. Paste into Supabase SQL Editor
4. Click **Run** (or Cmd+Enter)
5. Wait for success message

✅ **Expected:** 4 tables created (kri_definitions, kri_data_entries, kri_alerts, kri_risk_links)

---

### Step 2: Add KRI Constraints

**File:** `02-add-kri-constraints.sql`

1. Click **New Query** in Supabase
2. Open the file
3. Copy all contents
4. Paste and Run

✅ **Expected:** Foreign keys, constraints, and indexes added

---

### Step 3: Add KRI Security

**File:** `03-add-kri-rls-policies.sql`

1. New Query
2. Copy all from file
3. Paste and Run

✅ **Expected:** RLS enabled with 16 policies + 1 trigger

---

## Risk Intelligence Tables (Steps 4-6)

### Step 4: Create Intelligence Tables

**File:** `04-create-intelligence-tables-minimal.sql`

1. New Query
2. Copy all
3. Paste and Run

✅ **Expected:** 3 tables created (external_events, intelligence_alerts, risk_intelligence_treatment_log)

---

### Step 5: Add Intelligence Constraints

**File:** `05-add-intelligence-constraints.sql`

1. New Query
2. Copy all
3. Paste and Run

✅ **Expected:** Foreign keys, constraints, and indexes added

---

### Step 6: Add Intelligence Security

**File:** `06-add-intelligence-rls-policies.sql`

1. New Query
2. Copy all
3. Paste and Run

✅ **Expected:** RLS enabled with 10 policies

---

## Incident Management Tables (Steps 7-9)

### Step 7: Create Incidents Tables

**File:** `07-create-incidents-tables-minimal.sql`

1. New Query
2. Copy all
3. Paste and Run

✅ **Expected:** 2 tables created (incidents, control_enhancement_plans)

---

### Step 8: Add Incidents Constraints

**File:** `08-add-incidents-constraints.sql`

1. New Query
2. Copy all
3. Paste and Run

✅ **Expected:** Foreign keys, constraints, and indexes added

---

### Step 9: Add Incidents Security

**File:** `09-add-incidents-rls-policies.sql`

1. New Query
2. Copy all
3. Paste and Run

✅ **Expected:** RLS enabled with 8 policies + 1 trigger

---

## Verification

After completing all 9 steps, run this verification query:

```sql
-- Check all tables were created
SELECT table_name,
       CASE
         WHEN table_name LIKE 'kri%' THEN 'KRI Monitoring'
         WHEN table_name LIKE '%event%' OR table_name LIKE '%intelligence%' THEN 'Risk Intelligence'
         WHEN table_name IN ('incidents', 'control_enhancement_plans') THEN 'Incident Management'
       END as module
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'kri%'
  OR table_name LIKE '%event%'
  OR table_name LIKE '%intelligence%'
  OR table_name IN ('incidents', 'control_enhancement_plans')
)
ORDER BY module, table_name;
```

**Expected Result:** 9 tables listed

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND (
  tablename LIKE 'kri%'
  OR tablename LIKE '%event%'
  OR tablename LIKE '%intelligence%'
  OR tablename IN ('incidents', 'control_enhancement_plans')
)
ORDER BY tablename;
```

**Expected Result:** All tables show `rowsecurity = t` (true)

---

## Troubleshooting

### Issue: "relation already exists"

**Solution:** Table already created - this is fine! Click **New Query** and continue to next step.

### Issue: "foreign key constraint violation"

**Solution:** You skipped a previous step. Go back and run the steps in order (1→2→3→4→5→6→7→8→9).

### Issue: SQL syntax error

**Solution:**
1. Make sure you copied the **entire file**
2. Make sure you're running in a **new query** each time
3. Don't skip any steps

---

## Quick Checklist

- [ ] Step 1: Create KRI tables ✅
- [ ] Step 2: Add KRI constraints ✅
- [ ] Step 3: Add KRI security ✅
- [ ] Step 4: Create Intelligence tables ✅
- [ ] Step 5: Add Intelligence constraints ✅
- [ ] Step 6: Add Intelligence security ✅
- [ ] Step 7: Create Incidents tables ✅
- [ ] Step 8: Add Incidents constraints ✅
- [ ] Step 9: Add Incidents security ✅
- [ ] Verification query shows 9 tables ✅
- [ ] RLS verification shows all enabled ✅

---

## What's Next?

After successful migration:

1. **Test KRI Module**
   - Open app → KRI tab
   - Create a KRI definition
   - Enter measurements

2. **Test Intelligence Module**
   - Open app → Intelligence tab
   - Add external event
   - Test AI analysis

3. **Test Incidents Module**
   - Open app → Incidents tab
   - Log an incident
   - Get AI suggestions

---

## Time Estimate

- **Total time:** 15-20 minutes
- **Per step:** 1-2 minutes
- **Verification:** 2 minutes

---

**Ready to start?** Open the SQL Editor and begin with Step 1! 🚀
