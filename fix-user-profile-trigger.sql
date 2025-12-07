-- Fix user profile creation issue
-- Run this in Supabase SQL Editor

-- STEP 1: Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- STEP 2: Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    full_name,
    organization_id,
    role,
    status
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    (new.raw_user_meta_data->>'organization_id')::uuid,
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    'pending'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 4: Manually fix the current user (xz12ar@yahoo.com)
-- Get the user's metadata first
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'organization_id' as org_id,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE id = '254ef943-2bd7-4a2a-a789-1a7576efc322';

-- Now create their profile manually
INSERT INTO public.user_profiles (
  id,
  full_name,
  organization_id,
  role,
  status
)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  (raw_user_meta_data->>'organization_id')::uuid as organization_id,
  COALESCE(raw_user_meta_data->>'role', 'user') as role,
  'approved' as status
FROM auth.users
WHERE id = '254ef943-2bd7-4a2a-a789-1a7576efc322'
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Verify the profile was created
SELECT * FROM user_profiles WHERE id = '254ef943-2bd7-4a2a-a789-1a7576efc322';
