# Risk Register Enhancements - Deployment Guide

**Status:** Ready for Deployment
**Date:** 2025-11-26
**Migrations:** 12 enhancements (000016-000027)

---

## 📋 What's Being Deployed

### Critical Enhancements (MVP)
1. ✅ **Root Cause Register Expansion** - 23 → 45 causes
2. ✅ **Impact Register Expansion** - 11 → 30 impacts
3. ✅ **DIME Score Fixes** - Realistic variations
4. ✅ **KRI/KCI Mappings** - ~145 intelligent mappings

### Important Enhancements (V1.0)
5. ✅ **Implementation Guidance** - Full control documentation
6. ✅ **Residual Risk Calculation** - Automated with triggers
7. ✅ **Control Testing Framework** - Effectiveness tracking
8. ✅ **Multiple Causes/Impacts** - Flexible risk modeling

### Nice-to-Have Enhancements (V2.0)
9. ✅ **Control Dependencies** - Prerequisites & relationships
10. ✅ **Risk Appetite Framework** - Organizational thresholds
11. ✅ **KRI/KCI Breach Tracking** - Incident management
12. ✅ **Library Suggestions Workflow** - User contributions

---

## 🚀 Deployment Options

### Option A: Supabase Dashboard (Recommended for First-Time)

**Pros:** Visual, safe, you can review each migration
**Cons:** Manual process for 12 files

**Steps:**

1. **Get your Organization UUID:**
   ```sql
   -- Run in Supabase SQL Editor:
   SELECT id, name FROM organizations;
   ```
   Copy the `id` (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

2. **Prepare migrations:**
   ```bash
   bash prepare-deployment.sh
   # Enter your organization UUID when prompted
   ```

3. **Deploy via Dashboard:**
   - Open: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/editor
   - Go to **SQL Editor** → **New Query**
   - For each migration file (000016-000027):
     - Open the file in your editor
     - Copy all contents
     - Paste into SQL Editor
     - Click **Run**
     - Wait for success ✓
   - Repeat for all 12 files **in order**

---

### Option B: Combined SQL File (Fastest)

**Pros:** Single file, easy to review, one-click deployment
**Cons:** All-or-nothing, harder to troubleshoot

**Steps:**

1. **Prepare and generate combined SQL:**
   ```bash
   bash prepare-deployment.sh
   # Enter your organization UUID

   bash generate-deployment-sql.sh
   ```

2. **Deploy:**
   - Open Supabase SQL Editor
   - Open the generated `RISK_REGISTER_ENHANCEMENTS_*.sql` file
   - Copy all contents
   - Paste into SQL Editor
   - Click **Run**
   - Review verification output

---

### Option C: Supabase CLI (Developer Preferred)

**Pros:** Automatic, version controlled, professional
**Cons:** Requires CLI setup

**Steps:**

1. **Login to Supabase CLI:**
   ```bash
   npx supabase login
   ```

2. **Link your project:**
   ```bash
   npx supabase link --project-ref qrxwgjjgaekalvaqzpuf
   ```

3. **Prepare migrations:**
   ```bash
   bash prepare-deployment.sh
   # Enter your organization UUID
   ```

4. **Push to database:**
   ```bash
   npx supabase db push
   ```

---

## ⚠️ Pre-Deployment Checklist

- [ ] Database backup completed (or verified Supabase auto-backup)
- [ ] Organization UUID identified and validated
- [ ] Migrations tested with `bash test-migrations.sh` (46/46 passing)
- [ ] No active users in the system (or maintenance window scheduled)
- [ ] Reviewed at least one migration file to understand changes
- [ ] Backup of original migration files created automatically

---

## 🔍 Post-Deployment Verification

After deployment, run these queries in Supabase SQL Editor:

### 1. Check Data Counts
```sql
-- Should return 45
SELECT COUNT(*) as root_causes
FROM root_cause_register
WHERE organization_id = 'YOUR_ORG_UUID';

-- Should return 30
SELECT COUNT(*) as impacts
FROM impact_register
WHERE organization_id = 'YOUR_ORG_UUID';

-- Should return 95
SELECT COUNT(*) as controls
FROM control_library
WHERE organization_id = 'YOUR_ORG_UUID';

-- Should return 39 (20 KRIs + 19 KCIs)
SELECT COUNT(*) as indicators
FROM kri_kci_library
WHERE organization_id = 'YOUR_ORG_UUID';
```

### 2. Check New Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'risk_root_causes',
    'risk_impacts',
    'control_dependencies',
    'risk_appetite_statements',
    'indicator_breaches',
    'library_suggestions',
    'control_effectiveness_tests'
  )
ORDER BY table_name;
```

### 3. Test Key Functions
```sql
-- Test residual risk calculation
SELECT * FROM calculate_residual_risk(4, 5, 'some-risk-uuid'::uuid);

-- View root cause hierarchy
SELECT * FROM root_cause_hierarchy_view WHERE organization_id = 'YOUR_ORG_UUID' LIMIT 5;

-- Check DIME score variance
SELECT * FROM dime_variance_view WHERE organization_id = 'YOUR_ORG_UUID' ORDER BY dime_range DESC LIMIT 5;
```

---

## 🆘 Troubleshooting

### Problem: "Duplicate key violation" error

**Cause:** Migration was partially applied before
**Solution:**
```sql
-- Check what's already applied
SELECT * FROM supabase_migrations.schema_migrations
WHERE version >= '20251126000016'
ORDER BY version;

-- Delete partial migration records if needed
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20251126000XXX';  -- Replace XXX with problem migration

-- Re-run that specific migration
```

### Problem: "YOUR_ORG_ID not found" error

**Cause:** Placeholders weren't replaced
**Solution:**
```bash
# Restore backups
cp supabase/migrations/backups/LATEST_TIMESTAMP/* supabase/migrations/

# Re-run preparation
bash prepare-deployment.sh
```

### Problem: "Function already exists" error

**Cause:** Function was created in earlier attempt
**Solution:**
```sql
-- Drop and recreate (add to beginning of migration)
DROP FUNCTION IF EXISTS function_name CASCADE;
```

### Problem: Data counts don't match expected values

**Cause:** May have had pre-existing data
**Solution:** This is normal. New data adds to existing data. Verify new records exist:
```sql
-- Check for new root causes (RC-024 through RC-045)
SELECT cause_code, cause_name
FROM root_cause_register
WHERE cause_code >= 'RC-024'
  AND organization_id = 'YOUR_ORG_UUID';
```

---

## 🔄 Rollback Procedure

If something goes wrong and you need to rollback:

### Quick Rollback (Restore Files Only)
```bash
# Find latest backup
ls -lt supabase/migrations/backups/

# Restore original files
cp supabase/migrations/backups/TIMESTAMP/* supabase/migrations/
```

### Full Rollback (Database Changes)

**⚠️ Warning:** This will delete all enhancement data!

```sql
-- 1. Drop new tables (reverse order)
DROP TABLE IF EXISTS library_suggestions CASCADE;
DROP TABLE IF EXISTS indicator_breaches CASCADE;
DROP TABLE IF EXISTS risk_tolerance_exceptions CASCADE;
DROP TABLE IF EXISTS risk_appetite_statements CASCADE;
DROP TABLE IF EXISTS control_dependencies CASCADE;
DROP TABLE IF EXISTS control_effectiveness_tests CASCADE;
DROP TABLE IF EXISTS risk_impacts CASCADE;
DROP TABLE IF EXISTS risk_root_causes CASCADE;
DROP TABLE IF EXISTS impact_kci_mapping CASCADE;
DROP TABLE IF EXISTS root_cause_kri_mapping CASCADE;

-- 2. Drop added columns
ALTER TABLE control_library
  DROP COLUMN IF EXISTS implementation_guidance,
  DROP COLUMN IF EXISTS prerequisites,
  DROP COLUMN IF EXISTS success_criteria,
  DROP COLUMN IF EXISTS testing_guidance,
  DROP COLUMN IF EXISTS regulatory_references,
  DROP COLUMN IF EXISTS industry_standards,
  DROP COLUMN IF EXISTS automation_level;

ALTER TABLE risks
  DROP COLUMN IF EXISTS residual_likelihood,
  DROP COLUMN IF EXISTS residual_impact,
  DROP COLUMN IF EXISTS residual_score,
  DROP COLUMN IF EXISTS control_effectiveness_percentage,
  DROP COLUMN IF EXISTS residual_last_calculated;

-- 3. Delete added data
DELETE FROM root_cause_register WHERE cause_code >= 'RC-024';
DELETE FROM impact_register WHERE impact_code >= 'IMP-012';

-- 4. Remove migration records
DELETE FROM supabase_migrations.schema_migrations
WHERE version >= '20251126000016' AND version <= '20251126000027';
```

---

## 📞 Support

If you encounter issues:

1. **Check logs:** Supabase Dashboard → Logs → Postgres Logs
2. **Review error message:** Copy full error text
3. **Check migration order:** Ensure 000016-000027 applied in sequence
4. **Verify organization UUID:** Confirm it's valid and exists

---

## ✅ Success Indicators

You'll know deployment succeeded when:

- ✅ All 12 migrations show in `supabase_migrations.schema_migrations`
- ✅ Data counts match expected values (45, 30, 95, 39)
- ✅ New tables exist and are queryable
- ✅ Views return data without errors
- ✅ Risk creation in UI shows new features

---

**Ready to deploy?** Start with **Option B (Combined SQL File)** - it's the safest for first deployment!

```bash
bash prepare-deployment.sh
bash generate-deployment-sql.sh
```

Then open Supabase SQL Editor and paste the generated file.
