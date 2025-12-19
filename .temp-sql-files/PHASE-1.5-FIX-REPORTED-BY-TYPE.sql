-- ============================================================
-- PHASE 1.5: FIX reported_by COLUMN TYPE
-- ============================================================
-- Problem: reported_by is TEXT but should be UUID
-- Fix: Drop view, convert to UUID, recreate view
-- Duration: 2-5 minutes
-- ============================================================

-- Step 1: Drop the incident_summary view (it depends on reported_by)
DROP VIEW IF EXISTS incident_summary CASCADE;

-- Step 2: Drop any existing data that can't be converted to UUID
DELETE FROM incidents WHERE reported_by IS NOT NULL AND reported_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 3: Change column type from TEXT to UUID
ALTER TABLE incidents ALTER COLUMN reported_by TYPE UUID USING reported_by::uuid;

-- Step 4: Add foreign key constraint to auth.users
ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS fk_incidents_reported_by;

ALTER TABLE incidents
  ADD CONSTRAINT fk_incidents_reported_by
  FOREIGN KEY (reported_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by);

-- Step 6: Recreate incident_summary view with proper schema
CREATE VIEW incident_summary AS
SELECT
  i.id,
  i.organization_id AS org_id,
  i.incident_code,
  i.title,
  i.description,
  i.original_description,
  i.is_description_amended,
  i.incident_type,
  i.severity,
  i.status,
  i.occurred_at,
  i.reported_at,
  i.reported_by,
  i.visibility_scope,
  i.attachment_references,
  i.resolved_at,
  i.closed_at,
  i.created_at,
  i.updated_at,
  i.linked_risk_codes,
  irl.risk_id AS linked_risk_id,
  r.risk_code AS linked_risk_code,
  r.risk_title AS linked_risk_title,
  up.full_name AS reporter_name,
  au.email AS reporter_email
FROM incidents i
LEFT JOIN incident_risk_links irl ON i.id = irl.incident_id
LEFT JOIN risks r ON irl.risk_id = r.id
LEFT JOIN user_profiles up ON i.reported_by = up.id
LEFT JOIN auth.users au ON i.reported_by = au.id;

COMMENT ON VIEW incident_summary IS
  'Comprehensive incident view with linked risk and reporter details. Used for dashboards and reporting.';

-- Step 7: Verify the fix
SELECT
  'reported_by type' as check_name,
  CASE
    WHEN data_type = 'uuid' THEN '✅ Fixed: now UUID'
    ELSE '❌ Still ' || data_type
  END as status
FROM information_schema.columns
WHERE table_name = 'incidents' AND column_name = 'reported_by'

UNION ALL

SELECT
  'incident_summary view',
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Recreated'
    ELSE '❌ Missing'
  END
FROM information_schema.views
WHERE table_name = 'incident_summary';
