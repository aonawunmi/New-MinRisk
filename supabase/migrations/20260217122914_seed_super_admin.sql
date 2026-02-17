-- Fix: Add missing columns to audit_trail (required by audit trigger functions)
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS record_id UUID;
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS new_data JSONB;

-- Make user_id nullable in audit_trail (system operations have no user)
ALTER TABLE audit_trail ALTER COLUMN user_id DROP NOT NULL;

-- Temporarily disable user-defined triggers on user_profiles for seed insert
ALTER TABLE user_profiles DISABLE TRIGGER USER;

-- Seed the first super admin user (Ayodele Onawunmi)
INSERT INTO user_profiles (id, clerk_id, email, full_name, role, status)
VALUES (
  gen_random_uuid(),
  'user_39nT8qOadYrGvbgO9ShfzXF0q26',
  'ayodele.onawunmi@gmail.com',
  'Ayodele Onawunmi',
  'super_admin',
  'approved'
)
ON CONFLICT (clerk_id) DO UPDATE SET
  role = 'super_admin',
  status = 'approved',
  updated_at = NOW();

-- Re-enable user-defined triggers
ALTER TABLE user_profiles ENABLE TRIGGER USER;
