-- Quick check if alerts exist in database
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

-- Count alerts
SELECT
  'Total alerts in database' as check_type,
  COUNT(*) as count
FROM public.risk_intelligence_alerts;

-- Show recent alerts
SELECT
  id,
  risk_code,
  event_id,
  confidence_score,
  status,
  LEFT(reasoning, 80) as reasoning_preview,
  created_at
FROM public.risk_intelligence_alerts
ORDER BY created_at DESC
LIMIT 15;

-- Check if foreign keys exist
SELECT
  'Foreign key constraints' as check_type,
  COUNT(*) as count
FROM pg_constraint
WHERE conrelid = 'public.risk_intelligence_alerts'::regclass
  AND contype = 'f';
