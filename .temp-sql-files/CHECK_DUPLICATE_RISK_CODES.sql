-- Check for duplicate risk codes in the risks table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

-- Find all duplicate risk codes
SELECT
  risk_code,
  COUNT(*) as duplicate_count,
  string_agg(id::text, ', ') as risk_ids,
  string_agg(risk_title, ' | ') as risk_titles
FROM public.risks
GROUP BY risk_code
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, risk_code;

-- Show all details of duplicate risks
SELECT
  r.*
FROM public.risks r
WHERE risk_code IN (
  SELECT risk_code
  FROM public.risks
  GROUP BY risk_code
  HAVING COUNT(*) > 1
)
ORDER BY risk_code, created_at;
