-- ================================================================
-- FIX: tolerance_metrics foreign key to use kri_definitions
-- ================================================================
-- Changes foreign key from kri_kci_library to kri_definitions
-- ================================================================

-- Drop old foreign key constraint
ALTER TABLE tolerance_metrics
DROP CONSTRAINT IF EXISTS tolerance_metrics_kri_id_fkey;

-- Add new foreign key constraint pointing to kri_definitions
ALTER TABLE tolerance_metrics
ADD CONSTRAINT tolerance_metrics_kri_id_fkey
FOREIGN KEY (kri_id)
REFERENCES kri_definitions(id)
ON DELETE SET NULL;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraint updated';
  RAISE NOTICE '   tolerance_metrics.kri_id now references kri_definitions.id';
END $$;
