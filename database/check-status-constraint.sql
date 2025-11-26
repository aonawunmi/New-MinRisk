-- Check the status constraint on risks table
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'risks'::regclass
  AND conname LIKE '%status%';
