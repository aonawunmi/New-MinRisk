-- ================================================================
-- FIX: Migrate categories from SUPERSEDED to DRAFT statement
-- ================================================================
-- Moves all appetite categories from the old SUPERSEDED statement
-- to the new DRAFT statement so approval can proceed
-- ================================================================

-- Find the DRAFT and SUPERSEDED statements for each org
DO $$
DECLARE
  org_id UUID;
  draft_id UUID;
  superseded_id UUID;
  migrated_count INT;
BEGIN
  -- For each organization
  FOR org_id IN SELECT DISTINCT organization_id FROM risk_appetite_statements
  LOOP
    -- Find DRAFT statement
    SELECT id INTO draft_id
    FROM risk_appetite_statements
    WHERE organization_id = org_id AND status = 'DRAFT'
    ORDER BY version_number DESC
    LIMIT 1;

    -- Find SUPERSEDED statement
    SELECT id INTO superseded_id
    FROM risk_appetite_statements
    WHERE organization_id = org_id AND status = 'SUPERSEDED'
    ORDER BY version_number DESC
    LIMIT 1;

    -- If both exist, migrate categories
    IF draft_id IS NOT NULL AND superseded_id IS NOT NULL THEN
      UPDATE risk_appetite_categories
      SET statement_id = draft_id
      WHERE statement_id = superseded_id;

      GET DIAGNOSTICS migrated_count = ROW_COUNT;

      RAISE NOTICE 'Org %: Migrated % categories from SUPERSEDED to DRAFT', org_id, migrated_count;
    END IF;
  END LOOP;
END $$;

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Categories migrated to DRAFT statements';
  RAISE NOTICE '   You can now add tolerance metrics and approve the RAS';
END $$;
