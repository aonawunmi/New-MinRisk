-- Reset all test user passwords to: TestPass123!
-- Safe to run in Supabase SQL Editor

-- Reset admin1@acme.com password
UPDATE auth.users
SET
  encrypted_password = crypt('TestPass123!', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'admin1@acme.com';

-- Reset user1@acme.com password
UPDATE auth.users
SET
  encrypted_password = crypt('TestPass123!', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'user1@acme.com';

-- Reset pending@acme.com password
UPDATE auth.users
SET
  encrypted_password = crypt('TestPass123!', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'pending@acme.com';

-- Reset admin2@gfs.com password
UPDATE auth.users
SET
  encrypted_password = crypt('TestPass123!', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'admin2@gfs.com';

-- Reset user2@gfs.com password
UPDATE auth.users
SET
  encrypted_password = crypt('TestPass123!', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'user2@gfs.com';

-- Verify updates
SELECT
  email,
  CASE
    WHEN encrypted_password IS NOT NULL THEN '✅ Password Set'
    ELSE '❌ No Password'
  END as password_status,
  updated_at
FROM auth.users
WHERE email IN (
  'admin1@acme.com',
  'user1@acme.com',
  'pending@acme.com',
  'admin2@gfs.com',
  'user2@gfs.com'
)
ORDER BY email;
