-- Diagnose why "Scan for Threats" didn't create alerts
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

-- 1. Check if the test event was marked as checked
SELECT
  id,
  title,
  relevance_checked,
  created_at
FROM public.external_events
WHERE title LIKE '%Supply Chain%'
ORDER BY created_at DESC;

-- 2. Check if any alerts exist for that event
SELECT
  a.*,
  e.title as event_title
FROM public.risk_intelligence_alerts a
JOIN public.external_events e ON e.id = a.event_id
WHERE e.title LIKE '%Supply Chain%'
ORDER BY a.created_at DESC;

-- 3. Check how many ACTIVE risks exist in the database
SELECT
  status,
  COUNT(*) as risk_count
FROM public.risks
GROUP BY status
ORDER BY status;

-- 4. Show some active risks
SELECT
  risk_code,
  risk_title,
  status,
  category
FROM public.risks
WHERE status IN ('OPEN', 'MONITORING')
LIMIT 10;

-- 5. Check recent Edge Function logs (if visible)
-- This requires checking Supabase Dashboard > Edge Functions > analyze-intelligence > Logs
-- Look for entries with the event title or error messages
