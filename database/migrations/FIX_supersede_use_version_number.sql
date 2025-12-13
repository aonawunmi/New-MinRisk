-- ================================================================
-- FIX: Update supersede functions to use version_number (not version)
-- ================================================================
-- Issue: Table uses version_number column, but RPC uses version
-- ================================================================

-- Function: Supersede an approved RAS (creates new draft)
CREATE OR REPLACE FUNCTION supersede_appetite_statement(
  statement_id UUID,
  new_effective_from DATE DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS UUID AS $$
DECLARE
  old_stmt RECORD;
  new_stmt_id UUID;
BEGIN
  -- Get old statement
  SELECT * INTO old_stmt
  FROM risk_appetite_statements
  WHERE id = statement_id;

  -- Validate: can only supersede APPROVED statements
  IF old_stmt.status != 'APPROVED' THEN
    RAISE EXCEPTION 'Can only supersede APPROVED statements. Current status: %', old_stmt.status;
  END IF;

  -- Mark old statement as SUPERSEDED
  UPDATE risk_appetite_statements
  SET
    status = 'SUPERSEDED',
    superseded_at = NOW(),
    effective_to = CURRENT_DATE
  WHERE id = statement_id;

  -- Create new DRAFT statement (using version_number, not version)
  INSERT INTO risk_appetite_statements (
    organization_id,
    statement_text,
    version_number,
    status,
    effective_from,
    supersedes_statement_id
  ) VALUES (
    old_stmt.organization_id,
    '', -- Empty, admin will fill it
    old_stmt.version_number + 1,
    'DRAFT',
    new_effective_from,
    statement_id
  ) RETURNING id INTO new_stmt_id;

  RETURN new_stmt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed supersede function to use version_number column';
END $$;
