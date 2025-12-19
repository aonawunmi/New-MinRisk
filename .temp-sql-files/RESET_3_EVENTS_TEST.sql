-- Reset just 3 events for quick testing
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

UPDATE public.external_events
SET relevance_checked = false
WHERE relevance_checked = true
  AND id IN (
    SELECT id
    FROM public.external_events
    WHERE relevance_checked = true
    ORDER BY created_at DESC
    LIMIT 3
  );

-- Check result
SELECT
  COUNT(*) FILTER (WHERE relevance_checked = false) as unanalyzed_count,
  COUNT(*) FILTER (WHERE relevance_checked = true) as analyzed_count
FROM public.external_events;
