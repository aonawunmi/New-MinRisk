-- Reset events to unchecked so they can be analyzed again with the fixed Edge Function
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

-- Reset the last 20 events that were analyzed (adjust LIMIT as needed)
UPDATE public.external_events
SET relevance_checked = false
WHERE relevance_checked = true
  AND id IN (
    SELECT id
    FROM public.external_events
    WHERE relevance_checked = true
    ORDER BY created_at DESC
    LIMIT 20
  );

-- Check how many events are now ready for analysis
SELECT
  COUNT(*) FILTER (WHERE relevance_checked = false) as unanalyzed_count,
  COUNT(*) FILTER (WHERE relevance_checked = true) as analyzed_count,
  COUNT(*) as total_events
FROM public.external_events;
