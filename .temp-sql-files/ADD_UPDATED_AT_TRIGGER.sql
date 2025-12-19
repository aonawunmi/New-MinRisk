-- Add automatic updated_at trigger for rss_sources table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_rss_sources_updated_at ON public.rss_sources;

-- Create trigger
CREATE TRIGGER update_rss_sources_updated_at
  BEFORE UPDATE ON public.rss_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verify it works
COMMENT ON TRIGGER update_rss_sources_updated_at ON public.rss_sources
IS 'Automatically updates the updated_at timestamp when a row is modified';
