-- Fix status constraint safely - update existing data first
-- Step 1: Check current status values
SELECT status, COUNT(*) as count
FROM risks
GROUP BY status
ORDER BY count DESC;

-- Step 2: Update existing invalid status values to valid ones
UPDATE risks
SET status = CASE
  WHEN status = 'Open' THEN 'OPEN'
  WHEN status = 'In Progress' THEN 'MONITORING'
  WHEN status = 'Closed' THEN 'CLOSED'
  WHEN status = 'active' THEN 'OPEN'
  WHEN status = 'inactive' THEN 'CLOSED'
  WHEN status = 'archived' THEN 'ARCHIVED'
  ELSE 'OPEN'  -- Default fallback
END
WHERE status NOT IN ('OPEN', 'MONITORING', 'CLOSED', 'ARCHIVED');

-- Step 3: Verify all status values are now valid
SELECT status, COUNT(*) as count
FROM risks
GROUP BY status
ORDER BY status;

-- Step 4: Drop old constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Step 5: Add new constraint with correct values
ALTER TABLE risks ADD CONSTRAINT risks_status_check
  CHECK (status IN ('OPEN', 'MONITORING', 'CLOSED', 'ARCHIVED'));

-- Step 6: Verify the fix
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'risks'::regclass
  AND conname LIKE '%status%';
