-- ============================================================================
-- Reset Password for admin1@acme.com
-- ============================================================================
-- This script resets the password for the existing admin1@acme.com user
-- New Password: 213Capital$
-- ============================================================================

-- Update password for admin1@acme.com
UPDATE auth.users
SET
  encrypted_password = crypt('213Capital$', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'admin1@acme.com';

-- Verify the update
SELECT
  id,
  email,
  created_at,
  updated_at,
  'Password reset to: 213Capital$' as message
FROM auth.users
WHERE email = 'admin1@acme.com';
