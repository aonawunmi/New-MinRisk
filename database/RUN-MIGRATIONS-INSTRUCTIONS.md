# 🚀 Run Database Migrations - Quick Start

## Recommended Method: Supabase SQL Editor (5 minutes)

This is the simplest and most reliable way to run the migrations.

### Step 1: Open Supabase Dashboard

Click this link or copy-paste to your browser:
```
https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
```

Or navigate manually:
1. Go to https://supabase.com/dashboard
2. Select project: **qrxwgjjgaekalvaqzpuf**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run Migration 1 - KRI Monitoring

1. Open file: `database/create-kri-tables.sql`
2. **Copy entire contents** (Cmd+A, Cmd+C)
3. **Paste** into Supabase SQL Editor
4. Click **Run** button (or Cmd+Enter)
5. Wait for "Success. No rows returned" message

✅ You should see: **4 tables created** (kri_definitions, kri_data_entries, kri_alerts, kri_risk_links)

### Step 3: Run Migration 2 - Risk Intelligence

1. Click **New Query** to create a fresh editor
2. Open file: `database/create-risk-intelligence-tables.sql`
3. **Copy entire contents**
4. **Paste** into editor
5. Click **Run**

✅ You should see: **3 tables created** (external_events, intelligence_alerts, risk_intelligence_treatment_log)

### Step 4: Run Migration 3 - Incident Management

1. Click **New Query** again
2. Open file: `database/create-incidents-tables.sql`
3. **Copy entire contents**
4. **Paste** into editor
5. Click **Run**

✅ You should see: **2 tables created** (incidents, control_enhancement_plans)

### Step 5: Verify Installation

Run this verification query in SQL Editor:

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

### Step 6: Verify RLS Policies

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity as rls_enabled
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

**Expected Result:** All tables show `rls_enabled = true`

---

## Alternative Method: Command Line (Advanced)

If you prefer command line and have `psql` installed:

### Get Connection String

1. Go to Supabase Dashboard → **Project Settings** → **Database**
2. Copy **Connection string** under **Connection pooling**
3. Replace `[YOUR-PASSWORD]` with your database password

### Run Migrations

```bash
cd database

# Run all at once
psql "YOUR_CONNECTION_STRING" -f create-kri-tables.sql
psql "YOUR_CONNECTION_STRING" -f create-risk-intelligence-tables.sql
psql "YOUR_CONNECTION_STRING" -f create-incidents-tables.sql

# Or use the master script
psql "YOUR_CONNECTION_STRING" -f run-all-migrations.sql
```

---

## Troubleshooting

### Issue: "permission denied"

**Solution:** You need to be logged in to Supabase with the account that owns this project.

### Issue: "relation already exists"

**Solution:** This is okay! It means the table was already created. You can:
- Skip this migration
- Or drop the table first (see MIGRATIONS-README.md Rollback section)

### Issue: "foreign key constraint"

**Solution:** Run migrations in order:
1. KRI tables first
2. Risk Intelligence second
3. Incidents third

### Issue: SQL syntax error

**Solution:**
1. Make sure you copied the **entire file**
2. Don't run the comment lines separately
3. Paste the whole file at once and click Run

---

## What's Next?

After successful migration:

✅ **KRI Monitoring** is now available
- Go to app → KRI tab
- Create your first KRI definition
- Enter measurements and see alerts

✅ **Risk Intelligence** is now available
- Go to app → Intelligence tab
- Add external events
- Let AI analyze relevance to risks

✅ **Incident Management** is now available
- Go to app → Incidents tab
- Log incidents
- Get AI-powered risk linking suggestions

---

## Need Help?

Check the detailed guide: `database/MIGRATIONS-README.md`

