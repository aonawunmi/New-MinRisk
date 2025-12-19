-- Modify RSS Sources to support multiple categories per feed

-- Step 1: Drop the existing check constraint
ALTER TABLE public.rss_sources DROP CONSTRAINT IF EXISTS rss_sources_category_check;

-- Step 2: Change category column from TEXT to TEXT[] (array)
ALTER TABLE public.rss_sources
  ALTER COLUMN category TYPE TEXT[]
  USING ARRAY[category]; -- Convert existing single values to arrays

-- Step 3: Add new check constraint for array elements
ALTER TABLE public.rss_sources
  ADD CONSTRAINT rss_sources_categories_check
  CHECK (
    category IS NOT NULL
    AND array_length(category, 1) > 0
    AND category <@ ARRAY['cybersecurity', 'regulatory', 'market', 'operational', 'geopolitical', 'environmental', 'social', 'technology', 'other']::TEXT[]
  );

-- Step 4: Update the index to support array searches
DROP INDEX IF EXISTS idx_rss_sources_category;
CREATE INDEX idx_rss_sources_category ON public.rss_sources USING GIN(category);

-- Add helpful comment
COMMENT ON COLUMN public.rss_sources.category IS 'Array of categories for this RSS feed. Allows multiple categories like [''cybersecurity'', ''regulatory'']';
