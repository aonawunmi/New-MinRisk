-- Migration: Extend Risks Table for Event + Root Cause + Impact Model
-- Description: Add new columns to risks table to support structured risk model
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Add new columns to risks table
-- These columns are nullable to support both old and new risk models
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS event_text TEXT,
  ADD COLUMN IF NOT EXISTS root_cause_id UUID REFERENCES root_cause_register(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS impact_id UUID REFERENCES impact_register(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refined_risk_statement TEXT,
  ADD COLUMN IF NOT EXISTS auto_assigned_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS auto_assigned_subcategory VARCHAR(100),
  ADD COLUMN IF NOT EXISTS category_override VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subcategory_override VARCHAR(100);

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_risks_root_cause ON risks(root_cause_id);
CREATE INDEX IF NOT EXISTS idx_risks_impact ON risks(impact_id);
CREATE INDEX IF NOT EXISTS idx_risks_auto_category ON risks(auto_assigned_category);

-- Create a view that shows the effective category (override takes precedence)
CREATE OR REPLACE VIEW risk_effective_categories AS
SELECT
  r.id,
  r.risk_code,
  r.risk_title,
  r.event_text,
  r.root_cause_id,
  r.impact_id,
  r.refined_risk_statement,

  -- Effective category: use override if set, otherwise use auto-assigned
  COALESCE(r.category_override, r.auto_assigned_category, r.category) as effective_category,
  COALESCE(r.subcategory_override, r.auto_assigned_subcategory) as effective_subcategory,

  -- Flag to indicate if risk uses new model
  CASE
    WHEN r.root_cause_id IS NOT NULL AND r.impact_id IS NOT NULL THEN true
    ELSE false
  END as uses_new_model,

  r.status,
  r.likelihood_inherent,
  r.impact_inherent,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,
  r.organization_id,
  r.user_id,
  r.owner_profile_id,
  r.created_at,
  r.updated_at
FROM risks r;

-- Create function to automatically generate refined risk statement
CREATE OR REPLACE FUNCTION generate_refined_risk_statement(
  p_event_text TEXT,
  p_root_cause_name TEXT,
  p_impact_name TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN format(
    'Due to %s, %s, resulting in %s.',
    p_root_cause_name,
    p_event_text,
    p_impact_name
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-generate refined statement when event/root cause/impact change
CREATE OR REPLACE FUNCTION update_refined_risk_statement()
RETURNS TRIGGER AS $$
DECLARE
  v_root_cause_name TEXT;
  v_impact_name TEXT;
BEGIN
  -- Only generate if we have all three components
  IF NEW.event_text IS NOT NULL AND NEW.root_cause_id IS NOT NULL AND NEW.impact_id IS NOT NULL THEN
    -- Get root cause name
    SELECT cause_name INTO v_root_cause_name
    FROM root_cause_register
    WHERE id = NEW.root_cause_id;

    -- Get impact name
    SELECT impact_name INTO v_impact_name
    FROM impact_register
    WHERE id = NEW.impact_id;

    -- Generate refined statement
    IF v_root_cause_name IS NOT NULL AND v_impact_name IS NOT NULL THEN
      NEW.refined_risk_statement := generate_refined_risk_statement(
        NEW.event_text,
        v_root_cause_name,
        v_impact_name
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS risks_update_refined_statement ON risks;
CREATE TRIGGER risks_update_refined_statement
  BEFORE INSERT OR UPDATE OF event_text, root_cause_id, impact_id ON risks
  FOR EACH ROW
  EXECUTE FUNCTION update_refined_risk_statement();

-- Comments for documentation
COMMENT ON COLUMN risks.event_text IS 'NEW MODEL: The observable event/situation (what is happening)';
COMMENT ON COLUMN risks.root_cause_id IS 'NEW MODEL: Foreign key to root_cause_register (why it happens)';
COMMENT ON COLUMN risks.impact_id IS 'NEW MODEL: Foreign key to impact_register (consequence if it happens)';
COMMENT ON COLUMN risks.refined_risk_statement IS 'NEW MODEL: Auto-generated statement: "Due to [root cause], [event], resulting in [impact]"';
COMMENT ON COLUMN risks.auto_assigned_category IS 'NEW MODEL: AI-assigned risk category based on event + root cause + impact analysis';
COMMENT ON COLUMN risks.auto_assigned_subcategory IS 'NEW MODEL: AI-assigned risk subcategory';
COMMENT ON COLUMN risks.category_override IS 'NEW MODEL: Admin manual override of category';
COMMENT ON COLUMN risks.subcategory_override IS 'NEW MODEL: Admin manual override of subcategory';
