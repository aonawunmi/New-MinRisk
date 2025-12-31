-- Fix RSS Sources category constraint to allow ANY categories
-- The previous constraint only allowed hardcoded values, but taxonomy can have custom categories

-- Step 1: Drop the restrictive check constraint
ALTER TABLE public.rss_sources DROP CONSTRAINT IF EXISTS rss_sources_categories_check;
ALTER TABLE public.rss_sources DROP CONSTRAINT IF EXISTS rss_sources_category_check;

-- Step 2: Add a more permissive constraint (just require non-empty array)
ALTER TABLE public.rss_sources
  ADD CONSTRAINT rss_sources_categories_check
  CHECK (
    category IS NOT NULL
    AND array_length(category, 1) > 0
  );

-- Done: Now any category text values are allowed in the array
COMMENT ON COLUMN public.rss_sources.category IS 'Array of categories for this RSS feed. Flexible - any category names are allowed.';
