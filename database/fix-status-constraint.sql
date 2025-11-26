-- Fix status constraint to match the form values
-- The form sends: OPEN, MONITORING, CLOSED, ARCHIVED

-- Drop old constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Add new constraint with correct values
ALTER TABLE risks ADD CONSTRAINT risks_status_check
  CHECK (status IN ('OPEN', 'MONITORING', 'CLOSED', 'ARCHIVED'));

-- Verify the fix
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'risks'::regclass
  AND conname LIKE '%status%';
