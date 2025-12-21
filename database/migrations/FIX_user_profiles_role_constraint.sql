-- Fix user_profiles role CHECK constraint to include all valid roles
-- Date: 2025-12-21
-- Issue: Constraint doesn't include primary_admin and viewer roles
-- Safe to run multiple times (idempotent)

-- Step 1: Drop the existing constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Step 2: Add updated constraint with all valid roles
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('super_admin', 'primary_admin', 'secondary_admin', 'user', 'viewer'));

-- Verify constraint was created
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'user_profiles_role_check';

-- Check current roles in use
SELECT DISTINCT role, COUNT(*) as count
FROM user_profiles
GROUP BY role
ORDER BY count DESC;
