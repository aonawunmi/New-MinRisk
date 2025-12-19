-- Check for unanalyzed events
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

SELECT
  COUNT(*) FILTER (WHERE relevance_checked = false) as unanalyzed_count,
  COUNT(*) FILTER (WHERE relevance_checked = true) as analyzed_count,
  COUNT(*) as total_events
FROM public.external_events;

-- Show some unanalyzed events
SELECT
  id,
  title,
  source,
  event_type,
  relevance_checked,
  created_at
FROM public.external_events
WHERE relevance_checked = false
ORDER BY created_at DESC
LIMIT 10;
