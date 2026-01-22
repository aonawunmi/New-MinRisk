-- ============================================================================
-- Seed Development Data for MinRisk v2
-- ============================================================================
-- This script creates test data for development including:
-- - Test organization (ACME Corp)
-- - Admin user (admin@acme.com / 213Capital$)
-- - Sample risk configuration
-- - Sample risks
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- Project: minrisk-dev (qrxwgjjgaekalvaqzpuf)
-- ============================================================================

-- Clean up existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM user_profiles WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'ACME Corp');
-- DELETE FROM organizations WHERE name = 'ACME Corp';

-- ============================================================================
-- 1. Create Test Organization
-- ============================================================================
INSERT INTO organizations (
  id,
  name,
  created_at,
  updated_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'ACME Corp',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================================================
-- 2. Create Risk Configuration for Organization
-- ============================================================================
INSERT INTO risk_configs (
  organization_id,
  likelihood_scale,
  impact_scale,
  risk_appetite,
  created_at,
  updated_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  5,
  5,
  'medium',
  NOW(),
  NOW()
)
ON CONFLICT (organization_id) DO UPDATE
SET
  likelihood_scale = EXCLUDED.likelihood_scale,
  impact_scale = EXCLUDED.impact_scale,
  risk_appetite = EXCLUDED.risk_appetite,
  updated_at = NOW();

-- ============================================================================
-- 3. Create Admin User in Supabase Auth
-- ============================================================================
-- NOTE: This creates the user in auth.users with email verification bypassed
-- Password: 213Capital$
-- Email: admin@acme.com

-- First, check if user exists
DO $$
DECLARE
  v_user_id uuid := 'a1ca349a-48c1-4223-bae2-bb809489ab01';
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
    'admin@acme.com',
    crypt('213Capital$', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin User"}',
    false,
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    encrypted_password = crypt('213Capital$', gen_salt('bf')),
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
    jsonb_build_object('sub', v_user_id::text, 'email', 'admin@acme.com'),
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, id) DO NOTHING;

END $$;

-- ============================================================================
-- 4. Create User Profile for Admin
-- ============================================================================
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
  'a1ca349a-48c1-4223-bae2-bb809489ab01',
  '11111111-1111-1111-1111-111111111111',
  'Admin User',
  'primary_admin',
  'approved',
  NOW(),
  NULL,
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

-- ============================================================================
-- 5. Create Sample Risks (Optional - for testing)
-- ============================================================================
INSERT INTO risks (
  id,
  organization_id,
  user_id,
  owner_profile_id,
  risk_code,
  risk_title,
  risk_description,
  division,
  department,
  category,
  owner,
  likelihood_inherent,
  impact_inherent,
  status,
  is_priority,
  created_at,
  updated_at
)
VALUES
  (
    'r1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'a1ca349a-48c1-4223-bae2-bb809489ab01',
    'a1ca349a-48c1-4223-bae2-bb809489ab01',
    'RISK-001',
    'Cybersecurity Breach',
    'Risk of unauthorized access to systems and data',
    'IT',
    'Information Security',
    'Technology',
    'Admin User',
    4,
    5,
    'active',
    true,
    NOW(),
    NOW()
  ),
  (
    'r2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'a1ca349a-48c1-4223-bae2-bb809489ab01',
    'a1ca349a-48c1-4223-bae2-bb809489ab01',
    'RISK-002',
    'Regulatory Compliance Failure',
    'Risk of non-compliance with industry regulations',
    'Legal',
    'Compliance',
    'Regulatory',
    'Admin User',
    3,
    4,
    'active',
    false,
    NOW(),
    NOW()
  ),
  (
    'r3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'a1ca349a-48c1-4223-bae2-bb809489ab01',
    'a1ca349a-48c1-4223-bae2-bb809489ab01',
    'RISK-003',
    'Operational Disruption',
    'Risk of business continuity interruption',
    'Operations',
    'Business Continuity',
    'Operational',
    'Admin User',
    2,
    4,
    'active',
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET
  risk_title = EXCLUDED.risk_title,
  risk_description = EXCLUDED.risk_description,
  updated_at = NOW();

-- ============================================================================
-- 6. Verification Query
-- ============================================================================
-- Check that everything was created successfully
SELECT
  'Organization Created' as step,
  o.id,
  o.name
FROM organizations o
WHERE o.id = '11111111-1111-1111-1111-111111111111'

UNION ALL

SELECT
  'Admin User Created' as step,
  up.id,
  up.full_name || ' (' || au.email || ')'
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.id = 'a1ca349a-48c1-4223-bae2-bb809489ab01'

UNION ALL

SELECT
  'Sample Risks Created' as step,
  COUNT(*)::text as id,
  'risks'
FROM risks
WHERE organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- You can now login with:
-- Email: admin@acme.com
-- Password: 213Capital$
-- ============================================================================
