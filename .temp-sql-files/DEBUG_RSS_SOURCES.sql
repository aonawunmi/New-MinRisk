-- Run this in Supabase SQL Editor to check current RSS sources
-- URL: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

SELECT
  id,
  name,
  category,
  pg_typeof(category) as category_type,
  array_length(category, 1) as num_categories,
  is_active,
  updated_at
FROM public.rss_sources
ORDER BY created_at DESC
LIMIT 10;
