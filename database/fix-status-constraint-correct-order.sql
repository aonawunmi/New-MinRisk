-- Fix status constraint safely - CORRECT ORDER
-- Step 1: Check current status values
SELECT 'Current Status Values' as step, status, COUNT(*) as count
FROM risks
GROUP BY status
ORDER BY count DESC;

-- Step 2: DROP old constraint FIRST (so we can update the data)
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Step 3: NOW update existing invalid status values to valid ones
UPDATE risks
SET status = CASE
  WHEN status ILIKE 'Open' THEN 'OPEN'
  WHEN status ILIKE 'In Progress' THEN 'MONITORING'
  WHEN status ILIKE 'Closed' THEN 'CLOSED'
  WHEN status ILIKE 'active' THEN 'OPEN'
  WHEN status ILIKE 'inactive' THEN 'CLOSED'
  WHEN status ILIKE 'archived' THEN 'ARCHIVED'
  WHEN status = 'OPEN' THEN 'OPEN'  -- Keep if already correct
  WHEN status = 'MONITORING' THEN 'MONITORING'
  WHEN status = 'CLOSED' THEN 'CLOSED'
  WHEN status = 'ARCHIVED' THEN 'ARCHIVED'
  ELSE 'OPEN'  -- Default fallback
END;

-- Step 4: Verify all status values are now valid
SELECT 'Updated Status Values' as step, status, COUNT(*) as count
FROM risks
GROUP BY status
ORDER BY status;

-- Step 5: Add new constraint with correct values
ALTER TABLE risks ADD CONSTRAINT risks_status_check
  CHECK (status IN ('OPEN', 'MONITORING', 'CLOSED', 'ARCHIVED'));

-- Step 6: Verify the fix
SELECT
  'Final Constraint' as step,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'risks'::regclass
  AND conname LIKE '%status%';
