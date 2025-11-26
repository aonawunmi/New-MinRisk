-- Add suggested controls and impact assessment columns to intelligence_alerts
-- These are AI-generated recommendations for risk treatment

ALTER TABLE risk_intelligence_alerts
ADD COLUMN IF NOT EXISTS suggested_controls TEXT[];

COMMENT ON COLUMN risk_intelligence_alerts.suggested_controls IS 'AI-suggested controls/mitigations for this risk event (array of strings)';

ALTER TABLE risk_intelligence_alerts
ADD COLUMN IF NOT EXISTS impact_assessment TEXT;

COMMENT ON COLUMN risk_intelligence_alerts.impact_assessment IS 'AI-generated assessment of potential business impact if event materializes';

-- Create index for searching suggested controls
CREATE INDEX IF NOT EXISTS idx_intelligence_suggested_controls ON risk_intelligence_alerts USING GIN (suggested_controls)
WHERE suggested_controls IS NOT NULL;
