# Phase 2 & 3 Database Migration Guide

## Quick Start

### Option 1: Run in Supabase SQL Editor (RECOMMENDED)

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
2. Copy the entire contents of `phase2-3-migration.sql`
3. Paste into SQL Editor
4. Click "Run" or press `Cmd/Ctrl + Enter`
5. Verify success by checking the verification queries at the bottom

### Option 2: Run via psql Command Line

```bash
psql "postgresql://postgres.yqjfxzkqzqslqwspjfgo:iRkeDUhdYWcHmKFqgjvQvSsKzLEKJbaE@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f phase2-3-migration.sql
```

---

## What This Migration Creates

### Tables (7 total)

#### Phase 2: KRI Monitoring (3 tables)
1. **kri_definitions** - KRI definitions with thresholds
2. **kri_data_entries** - KRI measurement data
3. **kri_alerts** - Alerts generated from threshold breaches

#### Phase 3A: Risk Intelligence (3 tables)
4. **external_events** - External events tracking
5. **intelligence_alerts** - AI-powered risk correlation alerts
6. **risk_intelligence_treatment_log** - Treatment action log

#### Phase 3B: Incidents (1 table)
7. **incidents** - Incident tracking and management

---

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled with dual-policy pattern:

**User Policy:**
- Users see only their own data (`user_id = auth.uid()`)

**Admin Policy:**
- Admins see all organization data
- Checks role: `admin`, `primary_admin`, or `super_admin`

### Multi-Tenant Isolation
- All tables linked to `organization_id`
- Foreign keys ensure data integrity
- Automatic scoping via RLS

---

## Verification Steps

After running the migration, verify success:

### 1. Check Tables Exist
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'kri_definitions', 'kri_data_entries', 'kri_alerts',
  'external_events', 'intelligence_alerts', 'risk_intelligence_treatment_log',
  'incidents'
)
ORDER BY table_name;
```

**Expected Result:** 7 tables

### 2. Check RLS is Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%kri%' OR tablename LIKE '%intelligence%' OR tablename = 'incidents'
ORDER BY tablename;
```

**Expected Result:** All tables should show `rowsecurity = true`

### 3. Check Policies Count
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND (tablename LIKE '%kri%' OR tablename LIKE '%intelligence%' OR tablename = 'incidents')
GROUP BY tablename
ORDER BY tablename;
```

**Expected Result:**
- kri_definitions: 5 policies
- kri_data_entries: 2 policies
- kri_alerts: 2 policies
- external_events: 2 policies
- intelligence_alerts: 2 policies
- risk_intelligence_treatment_log: 2 policies
- incidents: 5 policies

---

## Testing After Migration

### 1. Test KRI Definitions
```sql
-- As logged-in user
INSERT INTO kri_definitions (
  organization_id,
  user_id,
  kri_code,
  kri_name,
  kri_type
) VALUES (
  (SELECT organization_id FROM user_profiles WHERE id = auth.uid()),
  auth.uid(),
  'KRI-TEST-001',
  'Test KRI',
  'Quantitative'
);

-- Verify you can see it
SELECT * FROM kri_definitions WHERE kri_code = 'KRI-TEST-001';
```

### 2. Test External Events
```sql
INSERT INTO external_events (
  organization_id,
  title,
  description,
  source
) VALUES (
  (SELECT organization_id FROM user_profiles WHERE id = auth.uid()),
  'Test External Event',
  'Testing risk intelligence',
  'Manual Entry'
);

SELECT * FROM external_events ORDER BY created_at DESC LIMIT 1;
```

### 3. Test Incidents
```sql
INSERT INTO incidents (
  organization_id,
  user_id,
  incident_code,
  incident_title,
  severity
) VALUES (
  (SELECT organization_id FROM user_profiles WHERE id = auth.uid()),
  auth.uid(),
  'INC-TEST-001',
  'Test Incident',
  'Medium'
);

SELECT * FROM incidents WHERE incident_code = 'INC-TEST-001';
```

---

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop tables in reverse order (respects foreign keys)
DROP TABLE IF EXISTS risk_intelligence_treatment_log CASCADE;
DROP TABLE IF EXISTS intelligence_alerts CASCADE;
DROP TABLE IF EXISTS external_events CASCADE;
DROP TABLE IF EXISTS kri_alerts CASCADE;
DROP TABLE IF EXISTS kri_data_entries CASCADE;
DROP TABLE IF EXISTS kri_definitions CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
```

**WARNING:** This will delete all data in these tables!

---

## Common Issues

### Issue 1: Foreign Key Violations
**Error:** `relation "organizations" does not exist`
**Fix:** Ensure previous migrations have run (organizations, user_profiles tables must exist)

### Issue 2: RLS Policy Conflicts
**Error:** `policy "..." for table "..." already exists`
**Fix:** Migration uses `DROP POLICY IF EXISTS` - should not happen. If it does, manually drop conflicting policies.

### Issue 3: Function Not Found
**Error:** `function current_org_id() does not exist`
**Fix:** Previous migrations should have created helper functions. Check `/database/complete-schema-v4-FINAL.sql`

---

## Migration is Safe to Re-run

This migration uses:
- `CREATE TABLE IF NOT EXISTS` - Won't fail if tables exist
- `DROP POLICY IF EXISTS` - Replaces existing policies
- `CREATE INDEX IF NOT EXISTS` - Won't fail if indexes exist

**You can safely re-run this migration without data loss.**

---

## Next Steps After Migration

1. **Test in Browser:**
   - Navigate to http://localhost:5176
   - Try the KRI, Intelligence, and Incidents tabs
   - All features should now work!

2. **Create Sample Data:**
   - Add a few KRI definitions
   - Enter some KRI data
   - Create test incidents
   - Add external events

3. **Verify AI Features:**
   - Ensure `ANTHROPIC_API_KEY` is set in environment
   - Test Risk Intelligence event analysis
   - Test Incident risk suggestions

---

## Support

If you encounter issues:
1. Check the verification queries results
2. Review Supabase logs for errors
3. Ensure all previous migrations have run
4. Verify user_profiles table has correct role values

---

**Migration File:** `phase2-3-migration.sql`
**Date Created:** 2025-11-20
**Tables Created:** 7
**RLS Policies:** 22 total
**Indexes:** 18 total
