# Cascade Delete Fix: Risk-Control-KRI Architecture

**Date:** 2025-11-27
**Status:** Ready for deployment
**Priority:** High - Architectural improvement

---

## The Problem

Previously, MinRisk used direct foreign key relationships with CASCADE DELETE:

```sql
controls (
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE
)
```

This meant:
- **Delete a risk** → **Controls are deleted** ❌
- **Delete a risk** → **KRI links are orphaned** ⚠️

This violated GRC industry best practices where Controls and KRIs should be reusable assets.

---

## The Solution

Implemented a **Junction Table Architecture** where:

1. **Controls exist independently** (no direct risk_id foreign key)
2. **KRIs exist independently** (no direct risk_id foreign key)
3. **Relationships managed via junction tables**:
   - `risk_control_links` (risk ↔ control)
   - `kri_risk_links` (risk ↔ KRI)

Now:
- **Delete a risk** → **Unlinks controls** (preserves them) ✅
- **Delete a risk** → **Unlinks KRIs** (preserves them) ✅
- **One control can mitigate multiple risks** ✅
- **One KRI can monitor multiple risks** ✅

---

## How It Works

### Before (Old Architecture)

```
risks table                controls table
┌─────────────┐           ┌─────────────┐
│ id (PK)     │◄──────────│ risk_id (FK)│ CASCADE DELETE
│ risk_code   │           │ name        │
│ risk_title  │           │ description │
└─────────────┘           └─────────────┘

❌ Delete risk → Controls deleted
```

### After (New Architecture)

```
risks table              risk_control_links         controls table
┌─────────────┐         ┌──────────────────┐      ┌─────────────┐
│ id (PK)     │◄────────│ risk_id (FK)     │      │ id (PK)     │
│ risk_code   │         │ control_id (FK)  │─────►│ control_code│
│ risk_title  │         │ created_by       │      │ name        │
└─────────────┘         │ created_at       │      │ description │
                        └──────────────────┘      └─────────────┘
                         CASCADE DELETE
                         (link only)

✅ Delete risk → Junction record deleted → Control preserved
```

---

## Database Changes

### 1. New Junction Tables

#### `risk_control_links`
```sql
CREATE TABLE risk_control_links (
  id UUID PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(risk_id, control_id)
);
```

#### `kri_risk_links` (updated)
```sql
CREATE TABLE kri_risk_links (
  id UUID PRIMARY KEY,
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,  -- Now UUID, not TEXT
  ai_link_confidence NUMERIC,
  linked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kri_id, risk_id)
);
```

### 2. Controls Table Changes

```sql
-- Add control_code column
ALTER TABLE controls ADD COLUMN control_code TEXT UNIQUE;

-- Make risk_id nullable (controls can exist independently)
ALTER TABLE controls ALTER COLUMN risk_id DROP NOT NULL;

-- Remove CASCADE DELETE constraint
ALTER TABLE controls DROP CONSTRAINT controls_risk_id_fkey;
```

### 3. Views for Easy Querying

```sql
-- Risks with their controls
CREATE VIEW risks_with_controls AS ...

-- Risks with their KRIs
CREATE VIEW risks_with_kris AS ...

-- Controls with their linked risks
CREATE VIEW controls_with_risks AS ...

-- KRIs with their linked risks
CREATE VIEW kris_with_risks AS ...
```

---

## Application Code Changes

### Updated Functions in `src/lib/risks.ts`

#### 1. `deleteRisk()` - Now unlinks instead of deleting
```typescript
export async function deleteRisk(riskId: string) {
  // Delete the risk
  // This will automatically cascade delete:
  // - risk_control_links (unlinks controls)
  // - kri_risk_links (unlinks KRIs)
  // - But NOT the actual controls or KRI definitions
}
```

#### 2. `getRiskById()` - Now uses junction table
```typescript
export async function getRiskById(riskId: string) {
  // Get controls via junction table
  const { data: controlLinks } = await supabase
    .from('risk_control_links')
    .select(`
      control_id,
      controls:control_id (*)
    `)
    .eq('risk_id', riskId);
}
```

#### 3. `addControl()` - Now creates control + link
```typescript
export async function addControl(riskId: string, controlData) {
  // 1. Create the control (independent)
  const control = await supabase.from('controls').insert(...)

  // 2. Link it to the risk
  await supabase.from('risk_control_links').insert({
    risk_id: riskId,
    control_id: control.id
  })
}
```

### New Helper Functions

```typescript
// Link existing control to a risk
linkControlToRisk(controlId, riskId)

// Unlink control from risk (keeps control)
unlinkControlFromRisk(controlId, riskId)

// Link existing KRI to a risk
linkKRIToRisk(kriId, riskId, aiConfidence?)

// Unlink KRI from risk (keeps KRI)
unlinkKRIFromRisk(kriId, riskId)

// Get all controls for a risk
getControlsForRisk(riskId)

// Get all risks for a control
getRisksForControl(controlId)
```

---

## Benefits

### 1. Industry Best Practices
- Aligns with GRC platforms (Archer, MetricStream, ServiceNow)
- Controls and KRIs are reusable assets
- Supports many-to-many relationships

### 2. Data Integrity
- No accidental deletion of controls/KRIs
- Orphaned records eliminated
- Proper referential integrity with UUIDs

### 3. Auditability
- Junction tables track who linked and when
- Controls maintain their full history
- KRIs maintain their measurement data

### 4. Flexibility
- One control can mitigate multiple risks
- One KRI can monitor multiple related risks
- Easy to relink if a risk is recreated

### 5. User Experience
- Bulk delete risks without losing controls
- Controls library becomes reusable
- KRI dashboard shows all linked risks

---

## Migration Impact

### What Gets Migrated
- ✅ All existing risk-control relationships preserved
- ✅ All existing KRI-risk links converted to UUID-based
- ✅ Old tables renamed with `_old` suffix (for backup)
- ✅ All data integrity maintained

### What Changes for Users
- ✅ Deleting risks no longer deletes controls (expected behavior)
- ✅ Controls can now be linked to multiple risks
- ✅ KRIs can now monitor multiple risks
- ✅ New "Unlink" option in UI (coming soon)

### What Stays the Same
- ✅ Risk register functionality
- ✅ Control management
- ✅ KRI monitoring
- ✅ All existing data

---

## Deployment Steps

### 1. Run the Migration

```bash
bash deploy-cascade-fix.sh
```

This will:
1. Open Supabase SQL Editor
2. Guide you to copy `database/fix-cascade-delete.sql`
3. Execute the migration
4. Verify the results

### 2. Verify Migration Success

Check the output panel for:
```
✅ CASCADE DELETE FIX COMPLETED

📋 What Changed:
  1. Controls now use junction table (risk_control_links)
  2. KRIs now use proper UUID-based junction table (kri_risk_links)
  3. Deleting a risk will UNLINK controls/KRIs, not delete them
  4. Created views for easy querying
```

### 3. Test the System

1. **Create a test risk**
2. **Add a control to the risk**
3. **Delete the risk**
4. **Verify the control still exists in the controls table**
5. **Check that the risk_control_links record was deleted**

---

## Rollback Plan

If issues arise, the migration script keeps backup tables:

- `kri_risk_links_old` - Original text-based KRI links
- Original controls table structure preserved

To rollback:
1. Rename `kri_risk_links_old` back to `kri_risk_links`
2. Re-add CASCADE DELETE constraint to controls table
3. Drop junction tables

---

## Future Enhancements

### 1. UI for Control Library
- View all controls across all risks
- Reuse controls across multiple risks
- Control effectiveness dashboard

### 2. UI for KRI Multi-Risk Monitoring
- See all risks a KRI monitors
- Breach impact analysis across risks
- KRI-risk correlation matrix

### 3. Control Reusability Analytics
- Most reused controls
- Control coverage heatmap
- Gap analysis by control type

---

## Questions & Answers

### Q: Can a control now be linked to multiple risks?
**A:** Yes! This is now supported and encouraged.

### Q: What happens to controls when I delete a risk?
**A:** The link is deleted, but the control is preserved. Think of it like unlinking, not deleting.

### Q: Can I manually unlink a control from a risk without deleting it?
**A:** Yes, use `unlinkControlFromRisk(controlId, riskId)` function.

### Q: Will this affect my existing data?
**A:** No, all existing data is migrated automatically. The migration is idempotent.

### Q: What if I want to permanently delete a control?
**A:** Use `deleteControl(controlId)` - this will remove the control and all its links.

### Q: Do KRIs work the same way?
**A:** Yes, KRIs also use junction tables now and can monitor multiple risks.

---

## Technical Reference

### Junction Table Design Pattern

This is a standard many-to-many relationship pattern:

```
Table A (1) ─────┐
                 ├──── Junction Table (M:N) ──────┐
Table B (1) ─────┘                                 └──── Enables M:N relationships
```

Benefits:
- Supports many-to-many relationships
- Clean separation of concerns
- Easy to query in both directions
- Maintains data integrity

### CASCADE DELETE Behavior

```sql
-- Old (cascade deletes child records)
FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE CASCADE
❌ Delete parent → Delete child

-- New (cascade deletes links, preserves entities)
risk_control_links:
  FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE CASCADE
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE
✅ Delete parent → Delete link → Preserve child
```

---

## Success Metrics

After deployment, you should see:
- ✅ Bulk delete works without deleting controls
- ✅ Controls can be reused across risks
- ✅ KRIs can monitor multiple risks
- ✅ No orphaned records in database
- ✅ Junction tables have proper RLS policies

---

## Support

If you encounter issues:
1. Check Supabase logs for errors
2. Verify junction tables exist: `SELECT * FROM risk_control_links LIMIT 1;`
3. Check views are created: `SELECT * FROM risks_with_controls LIMIT 1;`
4. Review migration output for any warnings

---

**Status:** Ready for deployment
**Next Steps:** Run `bash deploy-cascade-fix.sh` and follow the prompts
