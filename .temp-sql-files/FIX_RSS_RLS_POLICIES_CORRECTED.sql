-- Fix RLS policies for rss_sources table (CORRECTED)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
--
-- Issue: UPDATE succeeds but SELECT returns 0 rows due to RLS
-- Root cause: Need to ensure user can read back the row after update

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Admins can insert RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Admins can update RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Admins can delete RSS sources" ON public.rss_sources;

-- Create corrected policies

-- 1. SELECT: Users can view RSS sources for their organization
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

-- 2. INSERT: Only admins can insert RSS sources
CREATE POLICY "Admins can insert RSS sources"
  ON public.rss_sources
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'primary_admin')
    )
  );

-- 3. UPDATE: Only admins can update RSS sources
CREATE POLICY "Admins can update RSS sources"
  ON public.rss_sources
  FOR UPDATE
  USING (
    -- Can update rows in their organization if they're admin
    organization_id IN (
      SELECT organization_id
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'primary_admin')
    )
  )
  WITH CHECK (
    -- Updated row must still belong to their organization
    organization_id IN (
      SELECT organization_id
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'primary_admin')
    )
  );

-- 4. DELETE: Only admins can delete RSS sources
CREATE POLICY "Admins can delete RSS sources"
  ON public.rss_sources
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'primary_admin')
    )
  );

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'rss_sources'
ORDER BY policyname;
