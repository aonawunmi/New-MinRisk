# Hybrid Multi-Tenant Architecture - Deployment Guide

**Date:** 2025-11-26
**Architecture:** Global Foundation + Organization Customizations
**Status:** Ready for Deployment

---

## What Changed? (Important!)

### Previous Architecture (Per-Organization)
- Each organization had duplicate copies of all library data
- 2 organizations = 209 records × 2 = 418 records
- Difficult to update global taxonomy
- No way to share improvements across organizations

### New Architecture (Hybrid Global/Org)
- **ONE** global library shared by all organizations (209 records)
- Organizations can customize/extend/override global items
- Scalable: Database grows with customizations, not with org count
- Maintainable: Update global library once, all orgs benefit

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  GLOBAL FOUNDATION LAYER                     │
│                  (Shared by All Organizations)                │
├─────────────────────────────────────────────────────────────┤
│ • global_root_cause_library      (45 standard causes)       │
│ • global_impact_library           (30 standard impacts)      │
│ • global_control_library          (95 standard controls)     │
│ • global_kri_kci_library          (39 standard indicators)   │
│ • global_root_cause_kri_mapping   (~90 KRI mappings)         │
│ • global_impact_kci_mapping       (~55 KCI mappings)         │
│ • global_control_dependencies     (Control relationships)    │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            ORGANIZATION CUSTOMIZATION LAYER                  │
│               (Private to Each Organization)                 │
├─────────────────────────────────────────────────────────────┤
│ • org_root_causes         (Custom + overrides)               │
│ • org_impacts             (Custom + overrides)               │
│ • org_controls            (Custom + overrides)               │
│ • org_kri_kci             (Custom + overrides)               │
│ • org_root_cause_kri_mapping (Custom mappings)               │
│ • org_impact_kci_mapping     (Custom mappings)               │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   UNIFIED VIEW LAYER                         │
│        (What Users See - Global + Their Customizations)      │
├─────────────────────────────────────────────────────────────┤
│ • root_cause_register      (global + org, with RLS)          │
│ • impact_register          (global + org, with RLS)          │
│ • control_library          (global + org, with RLS)          │
│ • kri_kci_library          (global + org, with RLS)          │
│ • root_cause_kri_mapping   (global + org mappings)           │
│ • impact_kci_mapping       (global + org mappings)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Files

| Migration | File | Purpose |
|-----------|------|---------|
| 000030 | hybrid_root_cause_library.sql | Global 45 root causes + org customizations |
| 000031 | hybrid_impact_library.sql | Global 30 impacts + org customizations |
| 000032 | hybrid_control_library.sql | Global 95 controls (DIME + guidance) + org customizations |
| 000033 | hybrid_kri_kci_and_mappings.sql | Global 39 indicators + ~145 mappings + org customizations |
| 000034 | remaining_enhancements.sql | Residual risk, control testing, dependencies, risk appetite, breach tracking, suggestions |

**Total:** 5 comprehensive migrations (replaces the original 12 org-specific migrations)

---

## Key Features

### 1. Smart Data Migration (Works on Fresh or Existing Databases!)
- **Works on both fresh and existing databases!** Migrations check if old tables exist before migrating
- **If old tables exist:** Automatically copies data to global tables and backs up originals
- **If old tables don't exist:** Proceeds with global library seeding (no errors!)
- **Existing data is preserved** - No data loss, old tables renamed to `*_backup_20251126`
- **Safe for any database state** - Can run on fresh database or one with existing data

### 2. Row-Level Security (RLS)
- Organizations can only see global data + their own customizations
- Other organizations' custom items are completely invisible
- Secure multi-tenancy enforced at the database level

### 3. Backward Compatibility
- Views replace old tables with the same name
- Your existing application code continues to work
- Queries automatically see global + org data

### 4. Extensibility
- Organizations can add custom root causes/impacts/controls/indicators
- Organizations can override global items with their own versions
- Organizations can hide irrelevant global items

---

## Deployment Steps

### Step 1: Backup Database
```sql
-- Create a full backup (via Supabase Dashboard or CLI)
-- Dashboard: Settings → Database → Create Backup
```

### Step 2: Apply Migrations in Order

**Via Supabase Dashboard (Recommended):**

1. Open SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

2. Run Migration 000030 (Root Causes):
   - Open `supabase/migrations/20251126000030_hybrid_root_cause_library.sql`
   - Copy all contents
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success ✓

3. Run Migration 000031 (Impacts):
   - Open `supabase/migrations/20251126000031_hybrid_impact_library.sql`
   - Copy, paste, run
   - Wait for success ✓

4. Run Migration 000032 (Controls):
   - Open `supabase/migrations/20251126000032_hybrid_control_library.sql`
   - Copy, paste, run
   - Wait for success ✓

5. Run Migration 000033 (KRI/KCI + Mappings):
   - Open `supabase/migrations/20251126000033_hybrid_kri_kci_and_mappings.sql`
   - Copy, paste, run
   - Wait for success ✓

6. Run Migration 000034 (Remaining Enhancements):
   - Open `supabase/migrations/20251126000034_remaining_enhancements.sql`
   - Copy, paste, run
   - Wait for success ✓

**Estimated time:** 2-3 minutes total

---

## Post-Deployment Verification

### Step 1: Check Global Libraries

```sql
-- Verify global root causes (should be 45)
SELECT COUNT(*) as root_cause_count
FROM global_root_cause_library
WHERE is_active = true;

-- Verify global impacts (should be 30)
SELECT COUNT(*) as impact_count
FROM global_impact_library
WHERE is_active = true;

-- Verify global controls (should be 95)
SELECT COUNT(*) as control_count
FROM global_control_library
WHERE is_active = true;

-- Verify global indicators (should be 39)
SELECT COUNT(*) as indicator_count
FROM global_kri_kci_library
WHERE is_active = true;
```

### Step 2: Check Views Work

```sql
-- Users should see global + org data through views
SELECT COUNT(*) FROM root_cause_register;  -- Should show 45+ (global + org customizations)
SELECT COUNT(*) FROM impact_register;      -- Should show 30+
SELECT COUNT(*) FROM control_library;      -- Should show 95+
SELECT COUNT(*) FROM kri_kci_library;      -- Should show 39+
```

### Step 3: Test Organization Isolation (RLS)

```sql
-- As a user from Organization 1, should only see Organization 1's customizations
-- Global items should be visible to all

SELECT source, COUNT(*)
FROM root_cause_register
GROUP BY source;

-- Expected output:
-- source    | count
-- ----------+-------
-- global    | 45
-- custom    | (number of org-specific causes)
-- override  | (number of org-specific overrides)
```

### Step 4: Verify Mappings

```sql
-- Check root cause → KRI mappings
SELECT COUNT(*) FROM global_root_cause_kri_mapping;  -- Should be ~90

-- Check impact → KCI mappings
SELECT COUNT(*) FROM global_impact_kci_mapping;      -- Should be ~55
```

### Step 5: Test New Features

```sql
-- Test residual risk calculation
SELECT * FROM residual_risk_view LIMIT 5;

-- Test control effectiveness tracking
SELECT * FROM controls_due_for_testing_view LIMIT 5;

-- Test multiple causes per risk
SELECT * FROM risk_decomposition_view LIMIT 5;

-- Test breach tracking
SELECT * FROM active_breaches_view LIMIT 5;
```

---

## Application Changes Required

### Minimal Changes Needed!

The hybrid architecture is designed for backward compatibility. However, you may want to update:

### 1. Admin Features to Add (Optional)

**Global Library Management:**
```typescript
// Only super-admins can modify global libraries
if (user.role === 'super_admin') {
  // Show "Manage Global Library" section
  // Allow editing global_root_cause_library, etc.
}
```

**Organization Customization UI:**
```typescript
// Allow org admins to add custom items
function addCustomRootCause(orgId, causeData) {
  return supabase
    .from('org_root_causes')
    .insert({
      organization_id: orgId,
      ...causeData,
      is_custom: true
    });
}

// Allow org admins to override global items
function overrideGlobalControl(orgId, globalControlId, customGuidance) {
  return supabase
    .from('org_controls')
    .insert({
      organization_id: orgId,
      global_control_id: globalControlId,
      implementation_guidance: customGuidance,
      is_custom: false // This is an override, not a new item
    });
}
```

### 2. Display Source Indicator (Optional)

```typescript
// Show users which items are global vs custom
<Badge color={item.source === 'global' ? 'blue' : 'purple'}>
  {item.source === 'global' ? 'Standard' : 'Custom'}
</Badge>
```

### 3. Library Suggestion Workflow (Optional)

```typescript
// Allow users to suggest additions to global library
function suggestGlobalLibraryItem(orgId, suggestionData) {
  return supabase
    .from('library_suggestions')
    .insert({
      organization_id: orgId,
      suggestion_type: 'root_cause', // or 'impact', 'control', 'indicator'
      suggested_data: suggestionData,
      justification: 'Why this should be added to global library',
      status: 'pending'
    });
}
```

---

## Benefits Realized

### 1. Scalability
- **Before:** 2 orgs = 418 records | 10 orgs = 2,090 records | 100 orgs = 20,900 records
- **After:** 2 orgs = 209 records | 10 orgs = 209 records | 100 orgs = 209 records (+customizations)
- **Savings:** ~90% reduction in base data

### 2. Maintainability
- Update global library once → all orgs benefit immediately
- Security patches applied centrally
- Version control for global taxonomy

### 3. Flexibility
- Organizations can add custom items specific to their industry
- Organizations can override global guidance to match their processes
- Organizations can hide irrelevant global items

### 4. Multi-Tenancy
- Proper RLS ensures data isolation
- Each org sees: Global + Their customizations only
- No org can see another org's custom items

---

## Rollback Procedure

If something goes wrong:

### Quick Rollback (Restore Views to Tables)
```sql
-- Drop new views
DROP VIEW IF EXISTS root_cause_register CASCADE;
DROP VIEW IF EXISTS impact_register CASCADE;
DROP VIEW IF EXISTS control_library CASCADE;
DROP VIEW IF EXISTS kri_kci_library CASCADE;

-- Restore backup tables
ALTER TABLE root_cause_register_backup_20251126 RENAME TO root_cause_register;
ALTER TABLE impact_register_backup_20251126 RENAME TO impact_register;
ALTER TABLE control_library_backup_20251126 RENAME TO control_library;
ALTER TABLE kri_kci_library_backup_20251126 RENAME TO kri_kci_library;
ALTER TABLE root_cause_kri_mapping_backup_20251126 RENAME TO root_cause_kri_mapping;
ALTER TABLE impact_kci_mapping_backup_20251126 RENAME TO impact_kci_mapping;
```

### Full Rollback (Remove Global Tables)
```sql
-- Drop global tables (be careful - this removes all global data!)
DROP TABLE IF EXISTS global_root_cause_library CASCADE;
DROP TABLE IF EXISTS global_impact_library CASCADE;
DROP TABLE IF EXISTS global_control_library CASCADE;
DROP TABLE IF EXISTS global_kri_kci_library CASCADE;
DROP TABLE IF EXISTS global_root_cause_kri_mapping CASCADE;
DROP TABLE IF EXISTS global_impact_kci_mapping CASCADE;

-- Drop org customization tables
DROP TABLE IF EXISTS org_root_causes CASCADE;
DROP TABLE IF EXISTS org_impacts CASCADE;
DROP TABLE IF EXISTS org_controls CASCADE;
DROP TABLE IF EXISTS org_kri_kci CASCADE;
DROP TABLE IF EXISTS org_root_cause_kri_mapping CASCADE;
DROP TABLE IF EXISTS org_impact_kci_mapping CASCADE;

-- Restore backup tables (as above)
```

---

## Troubleshooting

### Issue: "Table already exists"

**Cause:** Migration was partially applied before

**Solution:**
```sql
-- Check what exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'global_%';

-- Drop the problematic table and re-run migration
DROP TABLE IF EXISTS global_root_cause_library CASCADE;
-- Then re-run migration 000030
```

### Issue: "No data in global libraries"

**Cause:** Data migration step failed

**Solution:**
```sql
-- Manually migrate from backup tables
INSERT INTO global_root_cause_library (cause_code, cause_name, ...)
SELECT DISTINCT ON (cause_code) cause_code, cause_name, ...
FROM root_cause_register_backup_20251126
ON CONFLICT (cause_code) DO NOTHING;
```

### Issue: "Users can't see global data"

**Cause:** RLS policies may be blocking

**Solution:**
```sql
-- Check RLS is enabled on org tables, NOT on global tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%root_cause%';

-- Global tables should have rowsecurity = false
-- Org tables should have rowsecurity = true
```

---

## Success Criteria

✅ All 5 migrations completed without errors
✅ Global libraries contain correct record counts (45, 30, 95, 39)
✅ Views return data (global + org customizations)
✅ RLS policies enforce organization isolation
✅ Residual risk calculation works
✅ Control effectiveness tracking operational
✅ Multiple causes/impacts per risk functional
✅ Application UI continues to work

---

## Next Steps After Deployment

1. **Test in Production**
   - Create test risks using global libraries
   - Verify calculations work correctly
   - Test organization isolation

2. **Update Application (Optional)**
   - Add "Custom Library Items" UI
   - Add "Suggest Global Addition" workflow
   - Show source indicators (global vs custom)

3. **Train Users**
   - Explain global vs organization-specific items
   - Show how to add custom items
   - Demonstrate override functionality

4. **Monitor Performance**
   - Check query performance on views
   - Monitor database size growth
   - Verify RLS overhead is acceptable

---

## Support

If you encounter issues during deployment:

1. Check Supabase Logs: Dashboard → Logs → Postgres Logs
2. Verify migration order: 000030 → 000031 → 000032 → 000033 → 000034
3. Check backup tables exist: `*_backup_20251126`
4. Test RLS policies with different user accounts

---

**Deployment Checklist:**

- [ ] Database backup created
- [ ] Migration 000030 applied (Root Causes)
- [ ] Migration 000031 applied (Impacts)
- [ ] Migration 000032 applied (Controls)
- [ ] Migration 000033 applied (KRI/KCI + Mappings)
- [ ] Migration 000034 applied (Remaining Enhancements)
- [ ] Post-deployment verification passed
- [ ] Application tested and functional
- [ ] Users trained on new architecture

**Ready to deploy? Start with Migration 000030!**
