-- Migration: Multiple Root Causes and Impacts per Risk
-- Description: Allow risks to have multiple contributing causes and impacts (primary + contributing)
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #8 (Important)

-- ============================================================================
-- CREATE JUNCTION TABLES FOR MANY-TO-MANY RELATIONSHIPS
-- ============================================================================

-- Risk → Root Causes (Many-to-Many)
CREATE TABLE IF NOT EXISTS risk_root_causes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  root_cause_id UUID NOT NULL REFERENCES root_cause_register(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  is_primary BOOLEAN DEFAULT false,
  contribution_percentage INTEGER CHECK (contribution_percentage BETWEEN 1 AND 100),
  rationale TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(risk_id, root_cause_id),
  CONSTRAINT fk_risk FOREIGN KEY (risk_id) REFERENCES risks(id),
  CONSTRAINT fk_root_cause FOREIGN KEY (root_cause_id) REFERENCES root_cause_register(id),
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Risk → Impacts (Many-to-Many)
CREATE TABLE IF NOT EXISTS risk_impacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  impact_id UUID NOT NULL REFERENCES impact_register(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  is_primary BOOLEAN DEFAULT false,
  severity_percentage INTEGER CHECK (severity_percentage BETWEEN 1 AND 100),
  rationale TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(risk_id, impact_id),
  CONSTRAINT fk_risk FOREIGN KEY (risk_id) REFERENCES risks(id),
  CONSTRAINT fk_impact FOREIGN KEY (impact_id) REFERENCES impact_register(id),
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_risk ON risk_root_causes(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_cause ON risk_root_causes(root_cause_id);
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_org ON risk_root_causes(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_primary ON risk_root_causes(is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_risk_impacts_risk ON risk_impacts(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_impact ON risk_impacts(impact_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_org ON risk_impacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_primary ON risk_impacts(is_primary) WHERE is_primary = true;

-- ============================================================================
-- MIGRATION: Move Existing Single Cause/Impact Data
-- ============================================================================

-- Migrate existing root_cause_id to risk_root_causes table (as primary)
INSERT INTO risk_root_causes (risk_id, root_cause_id, organization_id, is_primary, contribution_percentage, created_at)
SELECT
  r.id as risk_id,
  r.root_cause_id,
  r.organization_id,
  true as is_primary,
  100 as contribution_percentage,
  r.created_at
FROM risks r
WHERE r.root_cause_id IS NOT NULL
ON CONFLICT (risk_id, root_cause_id) DO NOTHING;

-- Migrate existing impact_id to risk_impacts table (as primary)
INSERT INTO risk_impacts (risk_id, impact_id, organization_id, is_primary, severity_percentage, created_at)
SELECT
  r.id as risk_id,
  r.impact_id,
  r.organization_id,
  true as is_primary,
  100 as severity_percentage,
  r.created_at
FROM risks r
WHERE r.impact_id IS NOT NULL
ON CONFLICT (risk_id, impact_id) DO NOTHING;

-- ============================================================================
-- UPDATE RISKS TABLE (Keep old columns for backward compatibility)
-- ============================================================================

-- Make old columns nullable (they're now deprecated but kept for compatibility)
ALTER TABLE risks
  ALTER COLUMN root_cause_id DROP NOT NULL,
  ALTER COLUMN impact_id DROP NOT NULL;

-- Add deprecation comments
COMMENT ON COLUMN risks.root_cause_id IS 'DEPRECATED: Use risk_root_causes table instead. Kept for backward compatibility only.';
COMMENT ON COLUMN risks.impact_id IS 'DEPRECATED: Use risk_impacts table instead. Kept for backward compatibility only.';

-- ============================================================================
-- TRIGGER: Ensure Exactly One Primary Cause/Impact
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_single_primary_cause()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a cause as primary, unset all others for this risk
  IF NEW.is_primary = true THEN
    UPDATE risk_root_causes
    SET is_primary = false, updated_at = NOW()
    WHERE risk_id = NEW.risk_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_primary = true;
  END IF;

  -- Ensure at least one cause is marked as primary (if this is the first cause)
  IF (SELECT COUNT(*) FROM risk_root_causes WHERE risk_id = NEW.risk_id AND is_primary = true) = 0 THEN
    NEW.is_primary := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_single_primary_impact()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting an impact as primary, unset all others for this risk
  IF NEW.is_primary = true THEN
    UPDATE risk_impacts
    SET is_primary = false, updated_at = NOW()
    WHERE risk_id = NEW.risk_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_primary = true;
  END IF;

  -- Ensure at least one impact is marked as primary (if this is the first impact)
  IF (SELECT COUNT(*) FROM risk_impacts WHERE risk_id = NEW.risk_id AND is_primary = true) = 0 THEN
    NEW.is_primary := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_primary_cause ON risk_root_causes;
CREATE TRIGGER trigger_enforce_primary_cause
  BEFORE INSERT OR UPDATE OF is_primary ON risk_root_causes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_cause();

DROP TRIGGER IF EXISTS trigger_enforce_primary_impact ON risk_impacts;
CREATE TRIGGER trigger_enforce_primary_impact
  BEFORE INSERT OR UPDATE OF is_primary ON risk_impacts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_impact();

-- ============================================================================
-- CREATE COMPREHENSIVE RISK DECOMPOSITION VIEW
-- ============================================================================

CREATE OR REPLACE VIEW risk_decomposition_view AS
SELECT
  r.id as risk_id,
  r.organization_id,
  r.title,
  r.event_description,
  r.status,
  r.inherent_likelihood,
  r.inherent_impact,
  (r.inherent_likelihood * r.inherent_impact) as inherent_score,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,

  -- Primary root cause
  rc_primary.cause_code as primary_cause_code,
  rc_primary.cause_name as primary_cause_name,
  rc_primary.category as primary_cause_category,

  -- All root causes (JSON array)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'cause_code', rc.cause_code,
        'cause_name', rc.cause_name,
        'category', rc.category,
        'is_primary', rrc.is_primary,
        'contribution_percentage', rrc.contribution_percentage,
        'rationale', rrc.rationale
      ) ORDER BY rrc.is_primary DESC, rc.cause_code
    ) FILTER (WHERE rc.id IS NOT NULL),
    '[]'::json
  ) as all_root_causes,

  -- Primary impact
  imp_primary.impact_code as primary_impact_code,
  imp_primary.impact_name as primary_impact_name,
  imp_primary.category as primary_impact_category,
  imp_primary.severity_level as primary_impact_severity,

  -- All impacts (JSON array)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'impact_code', imp.impact_code,
        'impact_name', imp.impact_name,
        'category', imp.category,
        'severity_level', imp.severity_level,
        'is_primary', ri.is_primary,
        'severity_percentage', ri.severity_percentage,
        'rationale', ri.rationale
      ) ORDER BY ri.is_primary DESC, imp.impact_code
    ) FILTER (WHERE imp.id IS NOT NULL),
    '[]'::json
  ) as all_impacts,

  -- Counts
  COUNT(DISTINCT rrc.id) as root_cause_count,
  COUNT(DISTINCT ri.id) as impact_count,
  COUNT(DISTINCT ctrl.id) as control_count

FROM risks r

-- Primary root cause
LEFT JOIN risk_root_causes rrc_primary ON r.id = rrc_primary.risk_id AND rrc_primary.is_primary = true
LEFT JOIN root_cause_register rc_primary ON rrc_primary.root_cause_id = rc_primary.id

-- All root causes
LEFT JOIN risk_root_causes rrc ON r.id = rrc.risk_id
LEFT JOIN root_cause_register rc ON rrc.root_cause_id = rc.id

-- Primary impact
LEFT JOIN risk_impacts ri_primary ON r.id = ri_primary.risk_id AND ri_primary.is_primary = true
LEFT JOIN impact_register imp_primary ON ri_primary.impact_id = imp_primary.id

-- All impacts
LEFT JOIN risk_impacts ri ON r.id = ri.risk_id
LEFT JOIN impact_register imp ON ri.impact_id = imp.id

-- Controls
LEFT JOIN risk_controls ctrl ON r.id = ctrl.risk_id AND ctrl.status = 'active'

GROUP BY
  r.id, r.title, r.event_description, r.organization_id, r.status,
  r.inherent_likelihood, r.inherent_impact, r.residual_likelihood, r.residual_impact, r.residual_score,
  rc_primary.cause_code, rc_primary.cause_name, rc_primary.category,
  imp_primary.impact_code, imp_primary.impact_name, imp_primary.category, imp_primary.severity_level

ORDER BY r.created_at DESC;

-- ============================================================================
-- VIEW: Risks with Multiple Causes/Impacts
-- ============================================================================

CREATE OR REPLACE VIEW complex_risks_view AS
SELECT
  r.id,
  r.organization_id,
  r.title,
  r.event_description,
  COUNT(DISTINCT rrc.id) as root_cause_count,
  COUNT(DISTINCT ri.id) as impact_count,
  STRING_AGG(DISTINCT rc.cause_code, ', ' ORDER BY rc.cause_code) as all_cause_codes,
  STRING_AGG(DISTINCT imp.impact_code, ', ' ORDER BY imp.impact_code) as all_impact_codes,
  r.inherent_score,
  r.residual_score
FROM risks r
LEFT JOIN risk_root_causes rrc ON r.id = rrc.risk_id
LEFT JOIN root_cause_register rc ON rrc.root_cause_id = rc.id
LEFT JOIN risk_impacts ri ON r.id = ri.risk_id
LEFT JOIN impact_register imp ON ri.impact_id = imp.id
GROUP BY r.id, r.title, r.event_description, r.organization_id, r.inherent_score, r.residual_score
HAVING COUNT(DISTINCT rrc.id) > 1 OR COUNT(DISTINCT ri.id) > 1
ORDER BY (COUNT(DISTINCT rrc.id) + COUNT(DISTINCT ri.id)) DESC;

-- ============================================================================
-- VIEW: Root Cause Contribution Analysis
-- ============================================================================

CREATE OR REPLACE VIEW root_cause_contribution_view AS
SELECT
  rc.organization_id,
  rc.cause_code,
  rc.cause_name,
  rc.category,
  rc.subcategory,
  COUNT(rrc.risk_id) as risk_count,
  COUNT(rrc.risk_id) FILTER (WHERE rrc.is_primary = true) as primary_in_risks,
  COUNT(rrc.risk_id) FILTER (WHERE rrc.is_primary = false) as contributing_in_risks,
  ROUND(AVG(rrc.contribution_percentage), 1) as avg_contribution_pct,
  STRING_AGG(DISTINCT r.title, '; ' ORDER BY r.title) FILTER (WHERE rrc.is_primary = true) as primary_risk_titles
FROM root_cause_register rc
LEFT JOIN risk_root_causes rrc ON rc.id = rrc.root_cause_id
LEFT JOIN risks r ON rrc.risk_id = r.id
WHERE rc.status = 'active'
GROUP BY rc.id, rc.cause_code, rc.cause_name, rc.category, rc.subcategory, rc.organization_id
HAVING COUNT(rrc.risk_id) > 0
ORDER BY risk_count DESC, primary_in_risks DESC;

-- ============================================================================
-- VIEW: Impact Severity Analysis
-- ============================================================================

CREATE OR REPLACE VIEW impact_severity_contribution_view AS
SELECT
  imp.organization_id,
  imp.impact_code,
  imp.impact_name,
  imp.category,
  imp.severity_level,
  COUNT(ri.risk_id) as risk_count,
  COUNT(ri.risk_id) FILTER (WHERE ri.is_primary = true) as primary_in_risks,
  COUNT(ri.risk_id) FILTER (WHERE ri.is_primary = false) as secondary_in_risks,
  ROUND(AVG(ri.severity_percentage), 1) as avg_severity_pct,
  STRING_AGG(DISTINCT r.title, '; ' ORDER BY r.title) FILTER (WHERE ri.is_primary = true) as primary_risk_titles
FROM impact_register imp
LEFT JOIN risk_impacts ri ON imp.id = ri.impact_id
LEFT JOIN risks r ON ri.risk_id = r.id
WHERE imp.status = 'active'
GROUP BY imp.id, imp.impact_code, imp.impact_name, imp.category, imp.severity_level, imp.organization_id
HAVING COUNT(ri.risk_id) > 0
ORDER BY risk_count DESC, primary_in_risks DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Add root cause to risk
CREATE OR REPLACE FUNCTION add_root_cause_to_risk(
  p_risk_id UUID,
  p_root_cause_id UUID,
  p_organization_id UUID,
  p_is_primary BOOLEAN DEFAULT false,
  p_contribution_percentage INTEGER DEFAULT NULL,
  p_rationale TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO risk_root_causes (risk_id, root_cause_id, organization_id, is_primary, contribution_percentage, rationale)
  VALUES (p_risk_id, p_root_cause_id, p_organization_id, p_is_primary, p_contribution_percentage, p_rationale)
  ON CONFLICT (risk_id, root_cause_id) DO UPDATE
  SET
    is_primary = EXCLUDED.is_primary,
    contribution_percentage = EXCLUDED.contribution_percentage,
    rationale = EXCLUDED.rationale,
    updated_at = NOW()
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Add impact to risk
CREATE OR REPLACE FUNCTION add_impact_to_risk(
  p_risk_id UUID,
  p_impact_id UUID,
  p_organization_id UUID,
  p_is_primary BOOLEAN DEFAULT false,
  p_severity_percentage INTEGER DEFAULT NULL,
  p_rationale TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO risk_impacts (risk_id, impact_id, organization_id, is_primary, severity_percentage, rationale)
  VALUES (p_risk_id, p_impact_id, p_organization_id, p_is_primary, p_severity_percentage, p_rationale)
  ON CONFLICT (risk_id, impact_id) DO UPDATE
  SET
    is_primary = EXCLUDED.is_primary,
    severity_percentage = EXCLUDED.severity_percentage,
    rationale = EXCLUDED.rationale,
    updated_at = NOW()
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE risk_root_causes IS 'Many-to-many relationship between risks and root causes, allowing multiple contributing causes per risk';
COMMENT ON TABLE risk_impacts IS 'Many-to-many relationship between risks and impacts, allowing multiple potential impacts per risk';

COMMENT ON COLUMN risk_root_causes.is_primary IS 'Indicates the primary root cause (exactly one per risk)';
COMMENT ON COLUMN risk_root_causes.contribution_percentage IS 'Estimated contribution of this cause to the overall risk (1-100%)';
COMMENT ON COLUMN risk_impacts.is_primary IS 'Indicates the primary impact (exactly one per risk)';
COMMENT ON COLUMN risk_impacts.severity_percentage IS 'Estimated severity of this impact if risk materializes (1-100%)';

COMMENT ON VIEW risk_decomposition_view IS 'Comprehensive view of risks showing all root causes and impacts with primary indicators';
COMMENT ON VIEW complex_risks_view IS 'Risks with multiple root causes or impacts';
COMMENT ON VIEW root_cause_contribution_view IS 'Analysis of how each root cause contributes to risks (primary vs contributing)';
COMMENT ON VIEW impact_severity_contribution_view IS 'Analysis of how each impact manifests across risks (primary vs secondary)';

COMMENT ON FUNCTION add_root_cause_to_risk IS 'Helper function to add a root cause to a risk with contribution percentage';
COMMENT ON FUNCTION add_impact_to_risk IS 'Helper function to add an impact to a risk with severity percentage';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: Add contributing root cause to existing risk
-- SELECT add_root_cause_to_risk(
--   'risk-uuid',
--   'root-cause-uuid',
--   'org-uuid',
--   false,  -- not primary
--   30,     -- contributes 30%
--   'Secondary cause: inadequate testing contributing to deployment failures'
-- );

-- Example 2: View risk decomposition
-- SELECT * FROM risk_decomposition_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 10;

-- Example 3: Find complex risks (multiple causes/impacts)
-- SELECT * FROM complex_risks_view WHERE organization_id = '11111111-1111-1111-1111-111111111111';

-- Example 4: Analyze root cause usage
-- SELECT * FROM root_cause_contribution_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' ORDER BY risk_count DESC;
