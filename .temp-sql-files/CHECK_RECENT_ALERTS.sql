-- Check recently created alerts
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

SELECT
  id,
  risk_code,
  confidence_score,
  status,
  reasoning,
  created_at
FROM public.risk_intelligence_alerts
ORDER BY created_at DESC
LIMIT 25;

-- Count by status
SELECT
  status,
  COUNT(*) as alert_count
FROM public.risk_intelligence_alerts
GROUP BY status
ORDER BY status;
