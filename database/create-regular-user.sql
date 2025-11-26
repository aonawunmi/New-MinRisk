-- ============================================================================
-- Create Regular User for MinRisk v2
-- ============================================================================
-- This script creates a regular user (non-admin) for testing
-- Email: user@acme.com
-- Password: User123!
-- Role: user (regular user with edit access)
-- ============================================================================

-- Create the user in auth.users
DO $$
DECLARE
  v_user_id uuid := 'b2ca349a-48c1-4223-bae2-bb809489ab02';
BEGIN
  -- Insert into auth.users if not exists
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'user@acme.com',
    crypt('User123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Regular User"}',
    false,
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    encrypted_password = crypt('User123!', gen_salt('bf')),
    updated_at = NOW();

  -- Insert into auth.identities if not exists
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'user@acme.com'),
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, id) DO NOTHING;

END $$;

-- Create User Profile
INSERT INTO user_profiles (
  id,
  organization_id,
  full_name,
  role,
  status,
  approved_at,
  approved_by,
  created_at,
  updated_at
)
VALUES (
  'b2ca349a-48c1-4223-bae2-bb809489ab02',
  '11111111-1111-1111-1111-111111111111', -- ACME Corp
  'Regular User',
  'user', -- Regular user role
  'approved',
  NOW(),
  'a1ca349a-48c1-4223-bae2-bb809489ab01', -- Approved by admin
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Verify creation
SELECT
  'User Created' as step,
  up.id,
  up.full_name || ' (' || au.email || ')' as user_info,
  up.role,
  up.status
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.id = 'b2ca349a-48c1-4223-bae2-bb809489ab02';

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- You can now login with:
-- Email: user@acme.com
-- Password: User123!
-- Role: user (can edit risks)
-- ============================================================================
