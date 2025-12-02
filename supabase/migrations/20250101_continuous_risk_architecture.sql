-- ============================================================================
-- CONTINUOUS RISK EVOLUTION ARCHITECTURE
-- Migration: Transition from period-centric to continuous risk management
-- ============================================================================

-- ============================================================================
-- 1. ACTIVE PERIOD TRACKING (Organization-level current period)
-- ============================================================================

CREATE TABLE IF NOT EXISTS active_period (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  current_period_year INT NOT NULL,
  current_period_quarter INT NOT NULL CHECK (current_period_quarter BETWEEN 1 AND 4),
  previous_period_year INT,
  previous_period_quarter INT CHECK (previous_period_quarter BETWEEN 1 AND 4),
  period_started_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_current_period CHECK (current_period_year >= 2020 AND current_period_year <= 2100)
);

COMMENT ON TABLE active_period IS 'Tracks the current active period for each organization';
COMMENT ON COLUMN active_period.current_period_year IS 'Current year (e.g., 2025)';
COMMENT ON COLUMN active_period.current_period_quarter IS 'Current quarter 1-4';

-- RLS for active_period
ALTER TABLE active_period ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org active period"
  ON active_period FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can update their org active period"
  ON active_period FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can insert their org active period"
  ON active_period FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================================
-- 2. UPDATE RISKS TABLE - Add continuous tracking fields
-- ============================================================================

-- Add new columns to risks table
ALTER TABLE risks ADD COLUMN IF NOT EXISTS created_period_year INT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS created_period_quarter INT CHECK (created_period_quarter BETWEEN 1 AND 4);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN risks.created_period_year IS 'Year when risk was first created (e.g., 2025)';
COMMENT ON COLUMN risks.created_period_quarter IS 'Quarter when risk was first created (1-4)';
COMMENT ON COLUMN risks.is_active IS 'Whether risk is active (false for closed risks)';

-- Update existing risks to populate period fields from created_at
UPDATE risks
SET
  created_period_year = EXTRACT(YEAR FROM created_at),
  created_period_quarter = CASE
    WHEN EXTRACT(MONTH FROM created_at) BETWEEN 1 AND 3 THEN 1
    WHEN EXTRACT(MONTH FROM created_at) BETWEEN 4 AND 6 THEN 2
    WHEN EXTRACT(MONTH FROM created_at) BETWEEN 7 AND 9 THEN 3
    ELSE 4
  END,
  is_active = CASE
    WHEN status IN ('CLOSED', 'ARCHIVED') THEN false
    ELSE true
  END
WHERE created_period_year IS NULL;

-- ============================================================================
-- 3. RISK HISTORY TABLE - Quarterly snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,

  -- Structured period representation
  period_year INT NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  period_quarter INT NOT NULL CHECK (period_quarter BETWEEN 1 AND 4),

  -- Snapshot metadata
  committed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  committed_by UUID REFERENCES user_profiles(id),
  change_type TEXT NOT NULL DEFAULT 'PERIOD_COMMIT',
  -- 'PERIOD_COMMIT' | 'STATUS_CHANGE' | 'OWNER_CHANGE' | 'RATING_CHANGE'

  -- Flattened key fields for fast querying
  risk_code TEXT NOT NULL,
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  category TEXT,
  division TEXT,
  department TEXT,
  owner TEXT,
  status TEXT NOT NULL,

  -- Risk ratings at snapshot time
  likelihood_inherent INT NOT NULL,
  impact_inherent INT NOT NULL,
  score_inherent INT NOT NULL,
  likelihood_residual INT,
  impact_residual INT,
  score_residual INT,

  -- Full snapshot (optional - for complex fields)
  snapshot_data JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT unique_risk_period UNIQUE (risk_id, period_year, period_quarter, change_type)
);

-- Indexes for fast queries
CREATE INDEX idx_risk_history_period ON risk_history(period_year, period_quarter);
CREATE INDEX idx_risk_history_org_period ON risk_history(organization_id, period_year, period_quarter);
CREATE INDEX idx_risk_history_risk ON risk_history(risk_id);
CREATE INDEX idx_risk_history_committed_at ON risk_history(committed_at DESC);

COMMENT ON TABLE risk_history IS 'Historical snapshots of risks at period boundaries';
COMMENT ON COLUMN risk_history.change_type IS 'Type of snapshot: PERIOD_COMMIT (quarterly) or event-based';
COMMENT ON COLUMN risk_history.snapshot_data IS 'Full risk state (JSONB) for complex fields not flattened';

-- RLS for risk_history
ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org risk history"
  ON risk_history FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "System can insert risk history"
  ON risk_history FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 4. PERIOD COMMITS LOG - Audit trail of period commits
-- ============================================================================

CREATE TABLE IF NOT EXISTS period_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Period committed
  period_year INT NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  period_quarter INT NOT NULL CHECK (period_quarter BETWEEN 1 AND 4),

  -- Commit metadata
  committed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  committed_by UUID REFERENCES user_profiles(id),

  -- Snapshot statistics
  risks_count INT NOT NULL,
  active_risks_count INT,
  closed_risks_count INT,
  controls_count INT,
  kris_count INT,
  incidents_count INT,

  -- Admin notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_org_period_commit UNIQUE (organization_id, period_year, period_quarter)
);

CREATE INDEX idx_period_commits_org ON period_commits(organization_id, period_year DESC, period_quarter DESC);

COMMENT ON TABLE period_commits IS 'Audit log of period commit actions';

-- RLS for period_commits
ALTER TABLE period_commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org period commits"
  ON period_commits FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can insert period commits"
  ON period_commits FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================================
-- 5. CONTROL ASSESSMENTS - Separate definition from quarterly evaluation
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Period assessed
  period_year INT NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  period_quarter INT NOT NULL CHECK (period_quarter BETWEEN 1 AND 4),

  -- Assessment metadata
  assessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assessed_by UUID REFERENCES user_profiles(id),

  -- DIME scores for this period
  design_score INT CHECK (design_score BETWEEN 0 AND 3),
  implementation_score INT CHECK (implementation_score BETWEEN 0 AND 3),
  monitoring_score INT CHECK (monitoring_score BETWEEN 0 AND 3),
  evaluation_score INT CHECK (evaluation_score BETWEEN 0 AND 3),

  -- Overall effectiveness (calculated or manually set)
  overall_effectiveness TEXT, -- 'Effective' | 'Partially Effective' | 'Ineffective'
  effectiveness_percentage INT, -- 0-100, calculated from DIME

  -- Testing results
  last_tested_date DATE,
  test_results TEXT,
  test_status TEXT, -- 'PASSED' | 'FAILED' | 'PARTIAL'

  -- Notes
  assessment_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_control_period_assessment UNIQUE (control_id, period_year, period_quarter)
);

CREATE INDEX idx_control_assessments_period ON control_assessments(period_year, period_quarter);
CREATE INDEX idx_control_assessments_control ON control_assessments(control_id);

COMMENT ON TABLE control_assessments IS 'Quarterly assessments of control effectiveness';
COMMENT ON COLUMN control_assessments.overall_effectiveness IS 'Calculated from DIME: (D+I+M+E)/12';

-- RLS for control_assessments
ALTER TABLE control_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org control assessments"
  ON control_assessments FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage their org control assessments"
  ON control_assessments FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 6. UPDATE INCIDENTS TABLE - Add period tracking and risk snapshot
-- ============================================================================

-- Add new columns to incidents table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS period_year INT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS period_quarter INT CHECK (period_quarter BETWEEN 1 AND 4);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS risk_code_at_time TEXT;

COMMENT ON COLUMN incidents.period_year IS 'Year when incident occurred';
COMMENT ON COLUMN incidents.period_quarter IS 'Quarter when incident occurred (1-4)';
COMMENT ON COLUMN incidents.risk_code_at_time IS 'Snapshot of risk code at time of incident (protects from code changes)';

-- Populate period fields from incident_date for existing incidents
UPDATE incidents
SET
  period_year = EXTRACT(YEAR FROM incident_date::timestamp),
  period_quarter = CASE
    WHEN EXTRACT(MONTH FROM incident_date::timestamp) BETWEEN 1 AND 3 THEN 1
    WHEN EXTRACT(MONTH FROM incident_date::timestamp) BETWEEN 4 AND 6 THEN 2
    WHEN EXTRACT(MONTH FROM incident_date::timestamp) BETWEEN 7 AND 9 THEN 3
    ELSE 4
  END
WHERE period_year IS NULL;

-- Create index for period-based queries
CREATE INDEX IF NOT EXISTS idx_incidents_period ON incidents(period_year, period_quarter);

-- ============================================================================
-- 7. UPDATE KRI VALUES TABLE - Add period tracking
-- ============================================================================

-- Add period tracking to KRI values (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kri_values') THEN
    ALTER TABLE kri_values ADD COLUMN IF NOT EXISTS period_year INT;
    ALTER TABLE kri_values ADD COLUMN IF NOT EXISTS period_quarter INT CHECK (period_quarter BETWEEN 1 AND 4);

    -- Populate from observed_at for existing values
    UPDATE kri_values
    SET
      period_year = EXTRACT(YEAR FROM observed_at),
      period_quarter = CASE
        WHEN EXTRACT(MONTH FROM observed_at) BETWEEN 1 AND 3 THEN 1
        WHEN EXTRACT(MONTH FROM observed_at) BETWEEN 4 AND 6 THEN 2
        WHEN EXTRACT(MONTH FROM observed_at) BETWEEN 7 AND 9 THEN 3
        ELSE 4
      END
    WHERE period_year IS NULL;

    CREATE INDEX IF NOT EXISTS idx_kri_values_period ON kri_values(period_year, period_quarter);
  END IF;
END $$;

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to get current period for an organization
CREATE OR REPLACE FUNCTION get_current_period(org_id UUID)
RETURNS TABLE(year INT, quarter INT) AS $$
BEGIN
  RETURN QUERY
  SELECT current_period_year, current_period_quarter
  FROM active_period
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to format period as display string
CREATE OR REPLACE FUNCTION format_period(year INT, quarter INT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'Q' || quarter || ' ' || year;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get next period
CREATE OR REPLACE FUNCTION get_next_period(year INT, quarter INT)
RETURNS TABLE(next_year INT, next_quarter INT) AS $$
BEGIN
  IF quarter = 4 THEN
    RETURN QUERY SELECT year + 1, 1;
  ELSE
    RETURN QUERY SELECT year, quarter + 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 9. MIGRATE OLD SNAPSHOTS TO NEW STRUCTURE
-- ============================================================================

-- Migrate data from old risk_snapshots to new risk_history
-- (If risk_snapshots table exists and contains data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_snapshots') THEN
    -- Extract snapshots and convert to risk_history format
    INSERT INTO risk_history (
      organization_id,
      risk_id,
      period_year,
      period_quarter,
      committed_at,
      committed_by,
      change_type,
      risk_code,
      risk_title,
      risk_description,
      category,
      division,
      department,
      owner,
      status,
      likelihood_inherent,
      impact_inherent,
      score_inherent,
      likelihood_residual,
      impact_residual,
      score_residual,
      snapshot_data
    )
    SELECT
      rs.organization_id,
      -- Try to find matching risk by risk_code
      COALESCE(r.id, gen_random_uuid()) as risk_id,
      -- Parse period string "Q3 2025" -> year=2025, quarter=3
      CAST(SUBSTRING(rs.period FROM '\d{4}') AS INT) as period_year,
      CAST(SUBSTRING(rs.period FROM 'Q(\d)') AS INT) as period_quarter,
      rs.snapshot_date as committed_at,
      rs.committed_by,
      'PERIOD_COMMIT' as change_type,
      risk_data->>'risk_code' as risk_code,
      risk_data->>'risk_title' as risk_title,
      risk_data->>'risk_description' as risk_description,
      risk_data->>'category' as category,
      risk_data->>'division' as division,
      risk_data->>'department' as department,
      risk_data->>'owner' as owner,
      risk_data->>'status' as status,
      CAST(risk_data->>'likelihood_inherent' AS INT) as likelihood_inherent,
      CAST(risk_data->>'impact_inherent' AS INT) as impact_inherent,
      CAST(risk_data->>'score_inherent' AS INT) as score_inherent,
      CAST(risk_data->>'likelihood_residual' AS INT) as likelihood_residual,
      CAST(risk_data->>'impact_residual' AS INT) as impact_residual,
      CAST(risk_data->>'score_residual' AS INT) as score_residual,
      risk_data as snapshot_data
    FROM risk_snapshots rs
    CROSS JOIN LATERAL jsonb_array_elements(rs.snapshot_data->'risks') AS risk_data
    LEFT JOIN risks r ON r.risk_code = risk_data->>'risk_code'
      AND r.organization_id = rs.organization_id
    ON CONFLICT (risk_id, period_year, period_quarter, change_type) DO NOTHING;

    RAISE NOTICE 'Migrated old risk_snapshots to risk_history';
  END IF;
END $$;

-- ============================================================================
-- 10. INITIALIZE ACTIVE PERIOD FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Set current period for organizations that don't have one yet
INSERT INTO active_period (
  organization_id,
  current_period_year,
  current_period_quarter
)
SELECT
  o.id,
  EXTRACT(YEAR FROM NOW())::INT,
  CASE
    WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 1 AND 3 THEN 1
    WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 4 AND 6 THEN 2
    WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 7 AND 9 THEN 3
    ELSE 4
  END
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM active_period ap WHERE ap.organization_id = o.id
)
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes
DO $$
BEGIN
  RAISE NOTICE '✅ Continuous Risk Evolution Architecture Migration Complete';
  RAISE NOTICE '';
  RAISE NOTICE 'New Tables Created:';
  RAISE NOTICE '  - active_period: Tracks current period per organization';
  RAISE NOTICE '  - risk_history: Historical snapshots with structured periods';
  RAISE NOTICE '  - period_commits: Audit log of period commits';
  RAISE NOTICE '  - control_assessments: Quarterly control effectiveness assessments';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Updated:';
  RAISE NOTICE '  - risks: Added created_period_year, created_period_quarter, is_active';
  RAISE NOTICE '  - incidents: Added period_year, period_quarter, risk_code_at_time';
  RAISE NOTICE '  - kri_values: Added period_year, period_quarter (if table exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper Functions:';
  RAISE NOTICE '  - get_current_period(org_id)';
  RAISE NOTICE '  - format_period(year, quarter)';
  RAISE NOTICE '  - get_next_period(year, quarter)';
END $$;
