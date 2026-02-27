-- Fix FK constraint on risk_intelligence_treatment_log
-- The fk_treatment_log_alert constraint was referencing the old intelligence_alerts
-- table instead of the current risk_intelligence_alerts table.
-- This caused "Acknowledge Advice" action to fail when accepting risk intelligence alerts.
--
-- Applied to staging via Management API on 2026-02-26.
-- This migration file captures the fix for reproducibility.

-- Drop the old FK pointing to intelligence_alerts (old table)
ALTER TABLE risk_intelligence_treatment_log
  DROP CONSTRAINT IF EXISTS fk_treatment_log_alert;

-- Add correct FK pointing to risk_intelligence_alerts (current table)
ALTER TABLE risk_intelligence_treatment_log
  ADD CONSTRAINT fk_treatment_log_alert
  FOREIGN KEY (alert_id) REFERENCES risk_intelligence_alerts(id) ON DELETE CASCADE;
