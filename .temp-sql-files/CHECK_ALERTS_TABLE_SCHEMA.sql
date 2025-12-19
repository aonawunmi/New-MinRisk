-- Check the actual column names in risk_intelligence_alerts table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'risk_intelligence_alerts'
ORDER BY ordinal_position;
