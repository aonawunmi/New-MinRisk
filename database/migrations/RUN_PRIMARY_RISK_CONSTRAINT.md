# How to Run Primary Risk Constraint Migration

**Priority 2 UAT Fix - Database Migration**

## Quick Steps

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

2. **Copy the migration SQL:**
   - File: `database/migrations/20251215_primary_risk_constraint.sql`
   - Or copy from below

3. **Paste into SQL Editor and click "Run"**

4. **Check the output:**
   - If `SUCCESS` → Constraint is now active ✅
   - If `WARNING` → You have violations that need manual cleanup ⚠️

---

## Migration SQL

```sql
-- Migration: Add Primary Risk Constraint to Incident-Risk Links
-- Date: 2025-12-15
-- Purpose: Ensure each incident has only ONE primary risk (ERM best practice)

-- Add unique constraint: one primary risk per incident
-- Using partial index to allow unlimited secondary/contributory/associated links
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_risk_per_incident
  ON incident_risk_links (incident_id)
  WHERE link_type = 'PRIMARY';

-- Add comment explaining the constraint
COMMENT ON INDEX unique_primary_risk_per_incident IS
  'Ensures each incident has exactly one PRIMARY risk. SECONDARY, CONTRIBUTORY, and ASSOCIATED risks are unlimited.';

-- Verify no existing data violates this constraint
DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT incident_id, COUNT(*) as primary_count
    FROM incident_risk_links
    WHERE link_type = 'PRIMARY'
    GROUP BY incident_id
    HAVING COUNT(*) > 1
  ) violations;

  IF violation_count > 0 THEN
    RAISE NOTICE 'WARNING: % incident(s) have multiple PRIMARY risks. Manual cleanup required before constraint can be enforced.', violation_count;
    RAISE NOTICE 'Run this query to see violations: SELECT incident_id, COUNT(*) as primary_count FROM incident_risk_links WHERE link_type = ''PRIMARY'' GROUP BY incident_id HAVING COUNT(*) > 1;';
  ELSE
    RAISE NOTICE 'SUCCESS: All incidents have 0 or 1 PRIMARY risk. Constraint is valid and will be enforced.';
  END IF;
END $$;
```

---

## What This Does

1. **Creates Partial Unique Index:**
   - Enforces: Only ONE PRIMARY link per incident
   - Allows: Unlimited SECONDARY, CONTRIBUTORY, ASSOCIATED links

2. **Validates Existing Data:**
   - Checks if any incidents already have multiple PRIMARY links
   - Provides diagnostic query if violations found

3. **ERM Best Practice:**
   - Each incident must have exactly one primary causal risk
   - This prevents governance confusion and accountability dilution

---

## If You See Violations

If the migration reports violations (incidents with multiple PRIMARY links):

1. **Find the violations:**
```sql
SELECT
  i.incident_code,
  i.title,
  COUNT(*) as primary_count,
  STRING_AGG(r.risk_code, ', ') as primary_risks
FROM incident_risk_links irl
JOIN incidents i ON i.id = irl.incident_id
JOIN risks r ON r.id = irl.risk_id
WHERE irl.link_type = 'PRIMARY'
GROUP BY i.id, i.incident_code, i.title
HAVING COUNT(*) > 1;
```

2. **Manually fix each incident:**
   - Decide which risk is truly the PRIMARY cause
   - Demote the others to SECONDARY or CONTRIBUTORY

3. **Example fix:**
```sql
-- Update incorrect PRIMARY links to SECONDARY
UPDATE incident_risk_links
SET link_type = 'SECONDARY'
WHERE id = '<link_id_to_demote>';
```

4. **Re-run the migration** after cleanup

---

## Verification After Migration

Check that constraint is active:

```sql
-- This should show your new index
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'incident_risk_links'
  AND indexname = 'unique_primary_risk_per_incident';
```

Test the constraint:

```sql
-- Try to create a duplicate PRIMARY link (should fail)
-- This will error with: "duplicate key value violates unique constraint"
INSERT INTO incident_risk_links (incident_id, risk_id, link_type)
VALUES ('<some_incident_id>', '<some_risk_id>', 'PRIMARY')
-- Only if that incident already has a PRIMARY link
```

---

## UI Enforcement

The UI has been updated to prevent duplicate PRIMARY links gracefully:

- `AddRiskLinkModal.tsx` now:
  - Checks for existing PRIMARY link on modal open
  - Displays warning if PRIMARY exists
  - Disables PRIMARY option in dropdown
  - Validates before submission
  - Shows clear error messages

---

**Status:** Migration ready to run
**Risk:** Low - creates index only, no data modification
**Rollback:** Can drop index if needed: `DROP INDEX IF EXISTS unique_primary_risk_per_incident;`
