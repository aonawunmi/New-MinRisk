-- ============================================================================
-- Fix kri_risk_links table - Add risk_code column if missing
-- Run this if you get "column kri_risk_links.risk_code does not exist" error
-- ============================================================================

-- Check current structure and add risk_code if it doesn't exist
DO $$
BEGIN
  -- Check if risk_code column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'kri_risk_links' 
    AND column_name = 'risk_code'
  ) THEN
    -- Add the risk_code column
    ALTER TABLE kri_risk_links ADD COLUMN risk_code TEXT;
    
    -- If risk_id column exists, try to populate risk_code from risks table
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'kri_risk_links' 
      AND column_name = 'risk_id'
    ) THEN
      -- Populate risk_code from the risks table using risk_id
      UPDATE kri_risk_links krl
      SET risk_code = r.risk_code
      FROM risks r
      WHERE krl.risk_id = r.id
      AND krl.risk_code IS NULL;
      
      -- Drop the old risk_id column (optional - uncomment if you want to clean up)
      -- ALTER TABLE kri_risk_links DROP COLUMN risk_id;
    END IF;
    
    -- Add constraint for non-null after migration (only if we have data)
    -- ALTER TABLE kri_risk_links ALTER COLUMN risk_code SET NOT NULL;
    
    RAISE NOTICE 'Added risk_code column to kri_risk_links table';
  ELSE
    RAISE NOTICE 'risk_code column already exists in kri_risk_links table';
  END IF;
  
  -- Create unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'unique_kri_risk_code'
  ) THEN
    ALTER TABLE kri_risk_links 
    ADD CONSTRAINT unique_kri_risk_code UNIQUE (kri_id, risk_code);
    RAISE NOTICE 'Added unique constraint for kri_id, risk_code';
  END IF;
  
  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_kri_risk_links_risk'
  ) THEN
    CREATE INDEX idx_kri_risk_links_risk ON kri_risk_links(risk_code);
    RAISE NOTICE 'Added index on risk_code column';
  END IF;
END $$;

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'kri_risk_links'
ORDER BY ordinal_position;
