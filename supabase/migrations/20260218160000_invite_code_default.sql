-- Add a default value for invite_code so inserts without an explicit code succeed.
-- Uses first 8 chars of a random UUID (e.g. 'a1b2c3d4').
ALTER TABLE user_invitations
  ALTER COLUMN invite_code SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
