-- Create test pending users for approval workflow testing
-- Uses creative email addressing (+ trick) and unique test emails
-- Safe to run multiple times

-- Get the Acme organization ID
DO $$
DECLARE
  v_org_id UUID;
  v_user_id_1 UUID;
  v_user_id_2 UUID;
  v_user_id_3 UUID;
BEGIN
  -- Get Acme organization ID
  SELECT id INTO v_org_id
  FROM organizations
  WHERE name = 'Acme Risk Management'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Acme organization not found';
  END IF;

  -- Generate unique UUIDs for test users
  v_user_id_1 := gen_random_uuid();
  v_user_id_2 := gen_random_uuid();
  v_user_id_3 := gen_random_uuid();

  -- Test User 1: Using + addressing
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
    v_user_id_1,
    '00000000-0000-0000-0000-000000000000',
    'admin1+pending1@acme.com',
    crypt('213Capital$', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO user_profiles (
    id,
    organization_id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id_1,
    v_org_id,
    'admin1+pending1@acme.com',
    'Pending User One',
    'user',
    'pending',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Test User 2: Finance department
  v_user_id_2 := gen_random_uuid();

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
    v_user_id_2,
    '00000000-0000-0000-0000-000000000000',
    'finance.analyst@acme.com',
    crypt('213Capital$', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO user_profiles (
    id,
    organization_id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id_2,
    v_org_id,
    'finance.analyst@acme.com',
    'Finance Analyst',
    'viewer',
    'pending',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Test User 3: Requesting secondary_admin role
  v_user_id_3 := gen_random_uuid();

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
    v_user_id_3,
    '00000000-0000-0000-0000-000000000000',
    'risk.manager@acme.com',
    crypt('213Capital$', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO user_profiles (
    id,
    organization_id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id_3,
    v_org_id,
    'risk.manager@acme.com',
    'Risk Manager',
    'secondary_admin',
    'pending',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Created 3 test pending users';

END $$;

-- Verify pending users were created
SELECT
  up.email,
  up.full_name,
  up.role as requested_role,
  up.status,
  up.created_at,
  o.name as organization
FROM user_profiles up
JOIN organizations o ON o.id = up.organization_id
WHERE up.status = 'pending'
ORDER BY up.created_at DESC;
