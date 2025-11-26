-- ============================================================================
-- Verify Tables Exist
-- Run this to check if Step 1 completed successfully
-- ============================================================================

-- Check if KRI tables exist
SELECT
  table_name,
  CASE
    WHEN table_name = 'kri_definitions' THEN '✓ Step 1 created this'
    WHEN table_name = 'kri_data_entries' THEN '✓ Step 1 created this'
    WHEN table_name = 'kri_alerts' THEN '✓ Step 1 created this'
    WHEN table_name = 'kri_risk_links' THEN '✓ Step 1 created this'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('kri_definitions', 'kri_data_entries', 'kri_alerts', 'kri_risk_links');

-- Check columns in kri_data_entries
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'kri_data_entries'
ORDER BY ordinal_position;
