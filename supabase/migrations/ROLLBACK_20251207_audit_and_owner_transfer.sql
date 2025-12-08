-- =====================================================
-- ROLLBACK SCRIPT FOR AUDIT TRAIL + OWNER TRANSFER
-- Use this ONLY if the migration causes problems
-- Date: 2025-12-07
-- =====================================================

-- Drop triggers
DROP TRIGGER IF EXISTS audit_risks_trigger ON risks;
DROP TRIGGER IF EXISTS audit_controls_trigger ON controls;
DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
DROP TRIGGER IF EXISTS track_owner_transfers ON risks;

-- Drop functions
DROP FUNCTION IF EXISTS audit_risks_trigger();
DROP FUNCTION IF EXISTS audit_controls_trigger();
DROP FUNCTION IF EXISTS audit_user_profiles_trigger();
DROP FUNCTION IF EXISTS log_owner_transfer();
DROP FUNCTION IF EXISTS log_audit_entry(TEXT, TEXT, TEXT, JSONB);

-- Drop tables (CAUTION: This deletes ALL audit data!)
-- Comment out if you want to preserve data
DROP TABLE IF EXISTS risk_owner_history CASCADE;
DROP TABLE IF EXISTS audit_trail CASCADE;

-- Verification
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%' OR tgname = 'track_owner_transfers';
-- Should return 0 rows
