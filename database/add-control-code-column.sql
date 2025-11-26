-- ============================================================================
-- Add control_code Column to controls Table
-- ============================================================================
-- Purpose: Add auto-generated control codes (CTRL-001, CTRL-002, etc.)
-- Safe to run multiple times (checks if column exists)
-- ============================================================================

DO $$
BEGIN
  -- Check if control_code column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'controls' AND column_name = 'control_code'
  ) THEN
    -- Add control_code column
    ALTER TABLE controls ADD COLUMN control_code VARCHAR(50);

    -- Generate codes for existing controls
    WITH numbered_controls AS (
      SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) as row_num
      FROM controls
      WHERE control_code IS NULL
    )
    UPDATE controls c
    SET control_code = 'CTRL-' || LPAD(nc.row_num::TEXT, 3, '0')
    FROM numbered_controls nc
    WHERE c.id = nc.id;

    -- Make it NOT NULL after populating
    ALTER TABLE controls ALTER COLUMN control_code SET NOT NULL;

    -- Add unique constraint
    ALTER TABLE controls ADD CONSTRAINT controls_control_code_unique
      UNIQUE (organization_id, control_code);

    RAISE NOTICE '✓ Added control_code column to controls table';
  ELSE
    RAISE NOTICE '✓ control_code column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT
  'control_code Column Added' AS status,
  COUNT(*) as controls_with_codes
FROM controls
WHERE control_code IS NOT NULL;
