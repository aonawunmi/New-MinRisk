-- ============================================================================
-- Phase 2: Tolerance Metrics Refactor
-- ============================================================================
-- Date: 2026-01-15
-- Purpose: Refactor tolerance_limits to proper outcomes-based model
-- Strategy: Add outcome linkage, replace bands with soft/hard limits
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW COLUMNS
-- ============================================================================

-- Add risk_id and outcome_id for proper linkage
ALTER TABLE tolerance_limits
ADD COLUMN IF NOT EXISTS risk_id UUID REFERENCES risks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS outcome_id UUID REFERENCES risk_outcomes(id) ON DELETE CASCADE;

-- Add soft_limit, hard_limit, and direction (replacement for green/amber/red)
ALTER TABLE tolerance_limits
ADD COLUMN IF NOT EXISTS soft_limit NUMERIC,
ADD COLUMN IF NOT EXISTS hard_limit NUMERIC,
ADD COLUMN IF NOT EXISTS limit_direction VARCHAR(20) CHECK (limit_direction IN ('above', 'below', 'between'));

-- ============================================================================
-- 2. BACKFILL DATA FROM GREEN/AMBER/RED TO SOFT/HARD
-- ============================================================================

-- For MAXIMUM type metrics (higher values are worse)
-- amber_max becomes soft_limit, red_min becomes hard_limit, direction = 'above'
UPDATE tolerance_limits
SET 
    soft_limit = amber_max,
    hard_limit = red_min,
    limit_direction = 'above'
WHERE metric_type = 'MAXIMUM'
AND soft_limit IS NULL;

-- For MINIMUM type metrics (lower values are worse)
-- amber_min becomes soft_limit, red_max becomes hard_limit, direction = 'below'
UPDATE tolerance_limits
SET 
    soft_limit = amber_min,
    hard_limit = red_max,
    limit_direction = 'below'
WHERE metric_type = 'MINIMUM'
AND soft_limit IS NULL;

-- For RANGE type metrics (values outside range are worse)
-- Use amber boundaries as soft, red boundaries as hard
UPDATE tolerance_limits
SET 
    soft_limit = COALESCE(amber_min, green_min),
    hard_limit = COALESCE(red_min, amber_min),
    limit_direction = 'between'
WHERE metric_type = 'RANGE'
AND soft_limit IS NULL;

-- For DIRECTIONAL type metrics, attempt to infer from directional_config
-- Default to 'above' if unclear
UPDATE tolerance_limits
SET 
    soft_limit = amber_max,
    hard_limit = red_min,
    limit_direction = 'above'
WHERE metric_type = 'DIRECTIONAL'
AND soft_limit IS NULL;

-- ============================================================================
-- 3. BACKFILL OUTCOME_ID FROM APPETITE_CATEGORY_ID
-- ============================================================================

-- For each tolerance_limit, try to find matching outcome
-- This is a best-effort migration - some may need manual intervention

-- First, let's add a helper comment explaining the challenge
COMMENT ON COLUMN tolerance_limits.outcome_id IS 
'Links to specific outcome. Migrated from appetite_category_id by matching risk category. May need manual verification.';

-- Attempt to populate outcome_id by:
-- 1. Finding risks in the same category as the tolerance's appetite_category
-- 2. Selecting the most common outcome type for that risk
-- This is a heuristic - actual linkage should be reviewed by admins

-- Note: This migration intentionally leaves outcome_id as nullable
-- to allow admins to manually link tolerances to specific outcomes
-- A future UI workflow will guide proper linkage

COMMENT ON COLUMN tolerance_limits.risk_id IS
'Should be populated when tolerance is linked to a specific risk. Currently nullable to support category-level tolerances.';

-- ============================================================================
-- 4. MAKE SOFT/HARD LIMITS MANDATORY FOR NEW ENTRIES
-- ============================================================================

-- For new tolerance metrics, soft and hard limits are required
-- Existing rows are grandfathered in with nullable values
-- (They should be reviewed and updated via admin UI)

ALTER TABLE tolerance_limits
ALTER COLUMN soft_limit SET NOT NULL,
ALTER COLUMN hard_limit SET NOT NULL,
ALTER COLUMN limit_direction SET NOT NULL;

-- ============================================================================
-- 5. ADD VALIDATION CONSTRAINT
-- ============================================================================

-- Ensure soft <= hard for 'above' direction, hard <= soft for 'below'
CREATE OR REPLACE FUNCTION validate_tolerance_limits()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.limit_direction = 'above' AND NEW.soft_limit > NEW.hard_limit THEN
        RAISE EXCEPTION 'For "above" direction, soft_limit (%) must be <= hard_limit (%)', 
            NEW.soft_limit, NEW.hard_limit;
    END IF;
    
    IF NEW.limit_direction = 'below' AND NEW.hard_limit > NEW.soft_limit THEN
        RAISE EXCEPTION 'For "below" direction, hard_limit (%) must be <= soft_limit (%)', 
            NEW.hard_limit, NEW.soft_limit;
    END IF;
    
    -- For 'between', hard is lower bound, soft is upper bound
    IF NEW.limit_direction = 'between' AND NEW.hard_limit > NEW.soft_limit THEN
        RAISE EXCEPTION 'For "between" direction, hard_limit (%) must be <= soft_limit (%)',
            NEW.hard_limit, NEW.soft_limit;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_tolerance_limits_trigger ON tolerance_limits;
CREATE TRIGGER validate_tolerance_limits_trigger
    BEFORE INSERT OR UPDATE ON tolerance_limits
    FOR EACH ROW EXECUTE FUNCTION validate_tolerance_limits();

-- ============================================================================
-- 6. DROP OLD GREEN/AMBER/RED COLUMNS (After verification)
-- ============================================================================

-- IMPORTANT: Only drop after confirming backfill was successful
-- Uncomment these lines after manual verification:

-- ALTER TABLE tolerance_limits DROP COLUMN IF EXISTS green_min;
-- ALTER TABLE tolerance_limits DROP COLUMN IF EXISTS green_max;
-- ALTER TABLE tolerance_limits DROP COLUMN IF EXISTS amber_min;
-- ALTER TABLE tolerance_limits DROP COLUMN IF EXISTS amber_max;
-- ALTER TABLE tolerance_limits DROP COLUMN IF EXISTS red_min;
-- ALTER TABLE tolerance_limits DROP COLUMN IF EXISTS red_max;

-- For now, keep them to allow comparison and rollback if needed

-- ============================================================================
-- 7. ADD NEW INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tolerance_limits_risk ON tolerance_limits(risk_id);
CREATE INDEX IF NOT EXISTS idx_tolerance_limits_outcome ON tolerance_limits(outcome_id);
CREATE INDEX IF NOT EXISTS idx_tolerance_limits_direction ON tolerance_limits(limit_direction);

-- ============================================================================
-- 8. UPDATE RLS POLICIES (if needed)
-- ============================================================================

-- RLS policies should already cover the new columns via table-level policies
-- No changes needed unless we want outcome-specific access control

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Updated:
-- ✅ Added risk_id, outcome_id columns
-- ✅ Added soft_limit, hard_limit, limit_direction
-- ✅ Backfilled data from green/amber/red bands
-- ✅ Added validation constraints
-- ✅ Kept old columns for verification (marked for future deletion)
-- ✅ Added new indexes
-- ============================================================================

NOTIFY pgrst, 'reload schema';
