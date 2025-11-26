-- Add user notes column to intelligence_alerts for user annotations
ALTER TABLE risk_intelligence_alerts
ADD COLUMN IF NOT EXISTS user_notes TEXT;

COMMENT ON COLUMN risk_intelligence_alerts.user_notes IS 'User annotations and observations about the alert';

-- Add soft delete column to treatment log
ALTER TABLE risk_intelligence_treatment_log
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN risk_intelligence_treatment_log.deleted_at IS 'Timestamp when log entry was soft-deleted by user';

-- Create index for soft delete queries (to exclude deleted entries)
CREATE INDEX IF NOT EXISTS idx_treatment_log_deleted ON risk_intelligence_treatment_log(deleted_at)
WHERE deleted_at IS NULL;
