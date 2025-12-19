-- ================================================================
-- DIAGNOSTIC: Check KRI Table Structure
-- Run this in Supabase SQL Editor to understand current state
-- ================================================================

-- 1. Check if kri_kci_library exists and what type it is
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%kri%'
ORDER BY table_name;

-- 2. Check all tables that might be related to KRI
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%kri%' OR
    table_name LIKE '%indicator%' OR
    table_name LIKE '%kci%'
  )
ORDER BY table_name;

-- 3. If kri_kci_library is a view, show its definition
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'kri_kci_library'
  ) THEN
    RAISE NOTICE 'kri_kci_library is a VIEW, not a TABLE';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'kri_kci_library'
  ) THEN
    RAISE NOTICE 'kri_kci_library is a TABLE';
  ELSE
    RAISE NOTICE 'kri_kci_library does NOT exist';
  END IF;
END $$;

-- 4. Show columns if table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'kri_kci_library'
ORDER BY ordinal_position;
