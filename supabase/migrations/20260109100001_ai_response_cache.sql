-- Migration: AI Response Caching Infrastructure
-- Description: Create tables for AI response caching and intelligence optimization
-- Branch: feature/ai-cost-optimization
-- Date: 2026-01-09

-- ============================================================================
-- PART 1: GENERAL AI RESPONSE CACHE
-- For Library Generation and Control Suggestions
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache identification
  cache_key TEXT UNIQUE NOT NULL,           -- SHA256 hash of input context
  feature TEXT NOT NULL,                     -- 'library_generation', 'control_suggestion', etc.
  
  -- Request context (for debugging/auditing)
  prompt_summary TEXT,                       -- Brief description of what was requested
  input_hash TEXT NOT NULL,                  -- Hash of full input for collision detection
  
  -- Cached response
  response JSONB NOT NULL,                   -- The AI response
  tokens_used INTEGER,                       -- Tokens consumed for this request
  model_version TEXT,                        -- e.g., 'claude-3-5-sonnet-20241022'
  
  -- Statistics
  hit_count INTEGER DEFAULT 0,               -- Times this cache entry was used
  last_hit_at TIMESTAMPTZ,                   -- Last time it was used
  
  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,           -- When this entry should be invalidated
  
  -- Organization scope (NULL = cross-org shared cache)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_response_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_feature ON ai_response_cache(feature);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_response_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_org ON ai_response_cache(organization_id);

-- ============================================================================
-- PART 2: INTELLIGENCE ANALYSIS CACHE
-- For cross-organization sharing of event analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS intelligence_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_hash TEXT UNIQUE NOT NULL,           -- Hash of event title + source URL
  event_title TEXT NOT NULL,                 -- For human readability
  event_source TEXT,                         -- Source URL/name
  
  -- Cached analysis (industry-agnostic)
  general_analysis JSONB NOT NULL,           -- {summary, key_themes, risk_domains}
  risk_category_mappings JSONB NOT NULL,     -- {category: relevance_score}
  suggested_impact_level TEXT,               -- 'low', 'medium', 'high', 'critical'
  
  -- AI metadata
  tokens_used INTEGER,
  model_version TEXT,
  confidence_score NUMERIC(3,2),             -- 0.00 to 1.00
  
  -- Statistics
  hit_count INTEGER DEFAULT 0,
  orgs_using INTEGER DEFAULT 0,              -- Number of orgs that used this analysis
  
  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,           -- Typically 7 days for news events
  
  -- Original event reference
  original_event_id UUID                     -- Optional link to external_events
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intel_cache_hash ON intelligence_analysis_cache(event_hash);
CREATE INDEX IF NOT EXISTS idx_intel_cache_expires ON intelligence_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_intel_cache_created ON intelligence_analysis_cache(created_at DESC);

-- ============================================================================
-- PART 3: EVENT DEDUPLICATION INDEX
-- For fast duplicate detection during RSS scanning
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_dedup_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dedup identification
  title_hash TEXT NOT NULL,                  -- Hash of normalized title
  title_words TEXT[] NOT NULL,               -- Tokenized words for Jaccard similarity
  source_domain TEXT,                        -- e.g., 'reuters.com'
  
  -- Reference
  external_event_id UUID REFERENCES external_events(id) ON DELETE CASCADE,
  
  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dedup_hash ON event_dedup_index(title_hash);
CREATE INDEX IF NOT EXISTS idx_dedup_expires ON event_dedup_index(expires_at);
CREATE INDEX IF NOT EXISTS idx_dedup_words ON event_dedup_index USING GIN(title_words);

-- ============================================================================
-- PART 4: FILTERED EVENTS LOG
-- Track events filtered by pre-filter for monitoring
-- ============================================================================

-- Add status column to external_events if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_events' AND column_name = 'filter_status'
  ) THEN
    ALTER TABLE external_events 
    ADD COLUMN filter_status TEXT DEFAULT 'pending',
    ADD COLUMN relevance_score INTEGER,
    ADD COLUMN filter_reason TEXT;
  END IF;
END $$;

-- Valid filter statuses: 'pending', 'analyzed', 'filtered_low_relevance', 'filtered_duplicate', 'cached'

-- ============================================================================
-- PART 5: RLS POLICIES
-- ============================================================================

ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dedup_index ENABLE ROW LEVEL SECURITY;

-- AI Response Cache: Org-specific entries visible only to that org, NULL org = shared
DO $$ BEGIN
CREATE POLICY "View own org or shared cache" ON ai_response_cache
  FOR SELECT USING (
    organization_id IS NULL OR
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Insert for authenticated" ON ai_response_cache
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Update hit count" ON ai_response_cache
  FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Intelligence Cache: Shared across all orgs (read-only for users)
DO $$ BEGIN
CREATE POLICY "View intel cache" ON intelligence_analysis_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Dedup Index: System table, accessible to authenticated users
DO $$ BEGIN
CREATE POLICY "View dedup index" ON event_dedup_index
  FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Insert dedup index" ON event_dedup_index
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PART 6: CACHE CLEANUP FUNCTION
-- Scheduled job to clean expired entries
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TABLE(table_name TEXT, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Clean ai_response_cache
  DELETE FROM ai_response_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'ai_response_cache';
  deleted_count := v_count;
  RETURN NEXT;
  
  -- Clean intelligence_analysis_cache
  DELETE FROM intelligence_analysis_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'intelligence_analysis_cache';
  deleted_count := v_count;
  RETURN NEXT;
  
  -- Clean event_dedup_index
  DELETE FROM event_dedup_index WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'event_dedup_index';
  deleted_count := v_count;
  RETURN NEXT;
END;
$$;

-- Grant execute to authenticated users (for admin cleanup)
GRANT EXECUTE ON FUNCTION cleanup_expired_cache() TO authenticated;
