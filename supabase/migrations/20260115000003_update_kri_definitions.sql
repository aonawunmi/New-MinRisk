-- ============================================================================
-- Phase 1: Outcomes Model Foundation - Update KRI Definitions
-- ============================================================================
-- Date: 2026-01-15
-- Purpose: Add target, direction_of_goodness, rename thresholds to bounds
-- Strategy: Backfill existing data with sensible defaults
-- ============================================================================

-- ============================================================================
-- 1. CREATE DIRECTION_OF_GOODNESS ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'direction_of_goodness') THEN
        CREATE TYPE direction_of_goodness AS ENUM (
            'higher_is_better',
            'lower_is_better'
        );
    END IF;
END $$;

-- ============================================================================
-- 2. ADD NEW COLUMNS TO KRI_DEFINITIONS
-- ============================================================================

-- Add target (management intent)
ALTER TABLE kri_definitions
ADD COLUMN IF NOT EXISTS target NUMERIC;

-- Add direction of goodness
ALTER TABLE kri_definitions
ADD COLUMN IF NOT EXISTS direction_of_goodness direction_of_goodness;

-- Add data source and responsible owner
ALTER TABLE kri_definitions
ADD COLUMN IF NOT EXISTS data_source VARCHAR(255);

ALTER TABLE kri_definitions
ADD COLUMN IF NOT EXISTS responsible_owner UUID REFERENCES auth.users(id);

-- ============================================================================
-- 3. RENAME THRESHOLD COLUMNS TO BOUNDS (avoid confusion with tolerance limits)
-- ============================================================================

-- Check if old columns exist before renaming
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kri_definitions' 
        AND column_name = 'lower_threshold'
    ) THEN
        ALTER TABLE kri_definitions 
        RENAME COLUMN lower_threshold TO optional_lower_bound;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kri_definitions' 
        AND column_name = 'upper_threshold'
    ) THEN
        ALTER TABLE kri_definitions 
        RENAME COLUMN upper_threshold TO optional_upper_bound;
    END IF;
END $$;

-- ============================================================================
-- 4. BACKFILL EXISTING DATA WITH SENSIBLE DEFAULTS
-- ============================================================================

-- For existing KRIs without target, use middle of bounds or target_value if it exists
UPDATE kri_definitions
SET target = COALESCE(
    target_value,  -- Use existing target_value if present
    CASE 
        WHEN optional_lower_bound IS NOT NULL AND optional_upper_bound IS NOT NULL 
        THEN (optional_lower_bound + optional_upper_bound) / 2
        WHEN optional_upper_bound IS NOT NULL 
        THEN optional_upper_bound * 0.8  -- 80% of upper bound
        WHEN optional_lower_bound IS NOT NULL 
        THEN optional_lower_bound * 1.2  -- 120% of lower bound
        ELSE 0  -- Last resort default
    END
)
WHERE target IS NULL;

-- For existing KRIs without direction, infer from threshold_direction if present
UPDATE kri_definitions
SET direction_of_goodness = CASE 
    WHEN threshold_direction IN ('below', 'minimum') THEN 'lower_is_better'::direction_of_goodness
    WHEN threshold_direction IN ('above', 'maximum') THEN 'higher_is_better'::direction_of_goodness
    ELSE 'lower_is_better'::direction_of_goodness  -- Default assumption for risk metrics
END
WHERE direction_of_goodness IS NULL;

-- ============================================================================
-- 5. ADD CONSTRAINTS (after backfill)
-- ============================================================================

-- Make target and direction_of_goodness mandatory for new entries
ALTER TABLE kri_definitions
ALTER COLUMN target SET NOT NULL;

ALTER TABLE kri_definitions
ALTER COLUMN direction_of_goodness SET NOT NULL;

-- ============================================================================
-- 6. ADD VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_kri_target_bounds()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate that target is within optional bounds if they exist
    IF NEW.optional_lower_bound IS NOT NULL AND NEW.target < NEW.optional_lower_bound THEN
        RAISE EXCEPTION 'Target (%) cannot be below lower bound (%)', NEW.target, NEW.optional_lower_bound;
    END IF;
    
    IF NEW.optional_upper_bound IS NOT NULL AND NEW.target > NEW.optional_upper_bound THEN
        RAISE EXCEPTION 'Target (%) cannot be above upper bound (%)', NEW.target, NEW.optional_upper_bound;
    END IF;
    
    -- Validate bounds order
    IF NEW.optional_lower_bound IS NOT NULL 
       AND NEW.optional_upper_bound IS NOT NULL 
       AND NEW.optional_lower_bound > NEW.optional_upper_bound THEN
        RAISE EXCEPTION 'Lower bound (%) cannot be greater than upper bound (%)', 
            NEW.optional_lower_bound, NEW.optional_upper_bound;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS validate_kri_target_bounds_trigger ON kri_definitions;
CREATE TRIGGER validate_kri_target_bounds_trigger
    BEFORE INSERT OR UPDATE ON kri_definitions
    FOR EACH ROW EXECUTE FUNCTION validate_kri_target_bounds();

-- ============================================================================
-- 7. ADD HELPER VIEW FOR TARGET VS ACTUAL STATUS
-- ============================================================================

CREATE OR REPLACE VIEW kri_target_status AS
SELECT 
    kd.id AS kri_id,
    kd.kri_code,
    kd.kri_name,
    kd.target,
    kd.direction_of_goodness,
    ko.observed_value AS latest_actual,
    ko.observation_date AS latest_observation_date,
    CASE 
        WHEN ko.observed_value IS NULL THEN 'NO_DATA'
        WHEN kd.direction_of_goodness = 'higher_is_better' AND ko.observed_value >= kd.target THEN 'ON_TARGET'
        WHEN kd.direction_of_goodness = 'higher_is_better' AND ko.observed_value < kd.target THEN 'BELOW_TARGET'
        WHEN kd.direction_of_goodness = 'lower_is_better' AND ko.observed_value <= kd.target THEN 'ON_TARGET'
        WHEN kd.direction_of_goodness = 'lower_is_better' AND ko.observed_value > kd.target THEN 'ABOVE_TARGET'
        ELSE 'UNKNOWN'
    END AS target_status
FROM kri_definitions kd
LEFT JOIN LATERAL (
    SELECT observed_value, observation_date
    FROM kri_observations
    WHERE kri_id = kd.id
    AND status = 'approved'
    AND superseded_by IS NULL
    ORDER BY observation_date DESC, version_number DESC
    LIMIT 1
) ko ON true;

-- Grant access
GRANT SELECT ON kri_target_status TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Updated:
-- ✅ Added target column (mandatory)
-- ✅ Added direction_of_goodness enum and column (mandatory)
-- ✅ Renamed lower/upper_threshold → optional_lower/upper_bound
-- ✅ Added data_source and responsible_owner columns
-- ✅ Backfilled existing data with sensible defaults
-- ✅ Added validation constraints
-- ✅ Created kri_target_status view (performance vs target)
-- ============================================================================

NOTIFY pgrst, 'reload schema';
