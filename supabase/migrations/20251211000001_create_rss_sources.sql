-- Create RSS Sources table for managing custom RSS feeds
CREATE TABLE IF NOT EXISTS public.rss_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Feed details
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., 'cybersecurity', 'regulatory', 'market', 'operational'

  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  last_scanned_at TIMESTAMPTZ,
  last_scan_status TEXT, -- 'success', 'failed', 'pending'
  last_scan_error TEXT,
  events_count INTEGER DEFAULT 0, -- Total events fetched from this source

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT rss_sources_url_unique UNIQUE (organization_id, url),
  CONSTRAINT rss_sources_category_check CHECK (category IN ('cybersecurity', 'regulatory', 'market', 'operational', 'geopolitical', 'environmental', 'social', 'technology', 'other'))
);

-- Add indexes
CREATE INDEX idx_rss_sources_org_id ON public.rss_sources(organization_id);
CREATE INDEX idx_rss_sources_is_active ON public.rss_sources(is_active);
CREATE INDEX idx_rss_sources_category ON public.rss_sources(category);
CREATE INDEX idx_rss_sources_last_scanned ON public.rss_sources(last_scanned_at);

-- Enable RLS
ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view RSS sources for their organization
CREATE POLICY "Users can view organization RSS sources"
  ON public.rss_sources
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

-- Only admins can insert RSS sources
CREATE POLICY "Admins can insert RSS sources"
  ON public.rss_sources
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can update RSS sources
CREATE POLICY "Admins can update RSS sources"
  ON public.rss_sources
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can delete RSS sources
CREATE POLICY "Admins can delete RSS sources"
  ON public.rss_sources
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_rss_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rss_sources_updated_at
  BEFORE UPDATE ON public.rss_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rss_sources_updated_at();

-- Seed default RSS sources (Nigerian + Global security feeds)
INSERT INTO public.rss_sources (organization_id, name, url, description, category, is_active, created_by)
SELECT
  o.id,
  feeds.name,
  feeds.url,
  feeds.description,
  feeds.category,
  true,
  (SELECT id FROM auth.users LIMIT 1) -- Use first user as creator
FROM public.organizations o
CROSS JOIN (
  VALUES
    -- Nigerian Sources
    ('Premium Times Nigeria', 'https://www.premiumtimesng.com/feed', 'Nigerian news and current affairs', 'geopolitical'),
    ('The Cable Nigeria', 'https://www.thecable.ng/feed', 'Nigerian news, politics, and security', 'geopolitical'),
    ('BusinessDay Nigeria', 'https://businessday.ng/feed', 'Nigerian business and economic news', 'market'),
    ('Punch Nigeria', 'https://punchng.com/feed/', 'Nigerian national news', 'geopolitical'),

    -- Cybersecurity Sources
    ('Krebs on Security', 'https://krebsonsecurity.com/feed/', 'Cybersecurity news and investigations', 'cybersecurity'),
    ('The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'Cybersecurity news and updates', 'cybersecurity'),
    ('Bleeping Computer', 'https://www.bleepingcomputer.com/feed/', 'Technology news and security alerts', 'cybersecurity'),
    ('Dark Reading', 'https://www.darkreading.com/rss.xml', 'Cybersecurity intelligence', 'cybersecurity'),

    -- Global Security Sources
    ('Reuters World News', 'https://www.reuters.com/rssFeed/worldNews', 'Global news and geopolitical events', 'geopolitical'),
    ('BBC Africa', 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', 'African news and events', 'geopolitical')
) AS feeds(name, url, description, category);

-- Add comment
COMMENT ON TABLE public.rss_sources IS 'Stores RSS feed sources for automated external event monitoring';
