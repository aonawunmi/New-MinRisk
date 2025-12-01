-- Check if fix-cascade-delete.sql migration has been applied

-- Check 1: Does risk_control_links junction table exist?
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'risk_control_links'
    ) THEN '✅ risk_control_links table EXISTS'
    ELSE '❌ risk_control_links table MISSING (migration not applied)'
  END as junction_table_status;

-- Check 2: Does kri_risk_links table exist (with proper UUID structure)?
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'kri_risk_links'
    ) THEN '✅ kri_risk_links table EXISTS'
    ELSE '❌ kri_risk_links table MISSING'
  END as kri_links_status;

-- Check 3: Does controls table have control_code column?
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'controls' AND column_name = 'control_code'
    ) THEN '✅ controls.control_code column EXISTS'
    ELSE '❌ controls.control_code column MISSING'
  END as control_code_status;

-- Check 4: Is controls.risk_id nullable?
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'controls'
        AND column_name = 'risk_id'
        AND is_nullable = 'YES'
    ) THEN '✅ controls.risk_id is NULLABLE (correct)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'controls'
        AND column_name = 'risk_id'
    ) THEN '❌ controls.risk_id is NOT NULL (migration not applied)'
    ELSE '⚠️ controls table or risk_id column not found'
  END as risk_id_nullable_status;

-- Check 5: Do the helper views exist?
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_name = 'risks_with_controls'
    ) THEN '✅ risks_with_controls view EXISTS'
    ELSE '❌ risks_with_controls view MISSING'
  END as views_status;

-- Summary
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_control_links')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kri_risk_links')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'control_code')
     AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'risks_with_controls')
    THEN '✅✅✅ MIGRATION APPLIED - fix-cascade-delete.sql has been run'
    ELSE '❌❌❌ MIGRATION NOT APPLIED - You need to run fix-cascade-delete.sql'
  END as final_verdict;
