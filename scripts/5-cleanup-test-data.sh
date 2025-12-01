#!/bin/bash

# Script to cleanup test data for period management
# Removes all test risks and snapshots

echo "======================================"
echo "CLEANUP TEST DATA"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will DELETE:"
echo "   • All test risks (RISK-Q1-*, RISK-Q2-*, RISK-Q4-*)"
echo "   • All period snapshots (Q1-Q4 2025)"
echo ""
echo "This operation CANNOT be undone!"
echo ""

read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Cleanup cancelled."
  exit 0
fi

# Get organization ID
echo ""
echo "Enter your organization_id:"
read -p "Organization ID: " ORG_ID

if [ -z "$ORG_ID" ]; then
  echo "❌ Error: organization_id is required"
  exit 1
fi

echo ""
echo "🗑️  Generating cleanup SQL..."
echo ""

# Create cleanup SQL
cat > /tmp/cleanup-test-data.sql <<EOF
-- Cleanup test data for period management
-- Organization: $ORG_ID

-- Show what will be deleted
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT 'DATA TO BE DELETED' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Count test risks
SELECT
  'Test Risks' as data_type,
  COUNT(*) as count_to_delete
FROM risks
WHERE organization_id = '$ORG_ID'
  AND (
    risk_code LIKE 'RISK-Q1-%'
    OR risk_code LIKE 'RISK-Q2-%'
    OR risk_code LIKE 'RISK-Q4-%'
  );

-- Count snapshots
SELECT
  'Period Snapshots' as data_type,
  COUNT(*) as count_to_delete
FROM risk_snapshots
WHERE organization_id = '$ORG_ID'
  AND period LIKE '%2025';

-- Show risks to be deleted
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT 'RISKS TO BE DELETED' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT
  risk_code,
  title,
  category,
  status
FROM risks
WHERE organization_id = '$ORG_ID'
  AND (
    risk_code LIKE 'RISK-Q1-%'
    OR risk_code LIKE 'RISK-Q2-%'
    OR risk_code LIKE 'RISK-Q4-%'
  )
ORDER BY risk_code;

-- Show snapshots to be deleted
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT 'SNAPSHOTS TO BE DELETED' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT
  period,
  snapshot_date,
  risk_count,
  notes
FROM risk_snapshots
WHERE organization_id = '$ORG_ID'
  AND period LIKE '%2025'
ORDER BY snapshot_date;

-- Confirmation prompt
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '⚠️  REVIEW ABOVE DATA BEFORE PROCEEDING ⚠️' as warning;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- UNCOMMENT THE LINES BELOW TO EXECUTE DELETION:
-- ================================================

-- -- Delete test risks
-- DELETE FROM risks
-- WHERE organization_id = '$ORG_ID'
--   AND (
--     risk_code LIKE 'RISK-Q1-%'
--     OR risk_code LIKE 'RISK-Q2-%'
--     OR risk_code LIKE 'RISK-Q4-%'
--   );

-- -- Delete period snapshots
-- DELETE FROM risk_snapshots
-- WHERE organization_id = '$ORG_ID'
--   AND period LIKE '%2025';

-- -- Show confirmation
-- SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
-- SELECT '✅ TEST DATA DELETED' as status;
-- SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- -- Verify deletion
-- SELECT
--   'Remaining test risks' as data_type,
--   COUNT(*) as remaining_count
-- FROM risks
-- WHERE organization_id = '$ORG_ID'
--   AND (
--     risk_code LIKE 'RISK-Q1-%'
--     OR risk_code LIKE 'RISK-Q2-%'
--     OR risk_code LIKE 'RISK-Q4-%'
--   );

-- SELECT
--   'Remaining snapshots' as data_type,
--   COUNT(*) as remaining_count
-- FROM risk_snapshots
-- WHERE organization_id = '$ORG_ID'
--   AND period LIKE '%2025';

EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CLEANUP SQL GENERATED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 SQL file created: /tmp/cleanup-test-data.sql"
echo ""
echo "⚠️  IMPORTANT: Two-step process for safety:"
echo ""
echo "STEP 1: Review what will be deleted"
echo "────────────────────────────────────"
echo "1. Copy SQL to clipboard:"
echo "   cat /tmp/cleanup-test-data.sql | pbcopy"
echo ""
echo "2. Open Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new"
echo ""
echo "3. Paste and RUN (this shows what WILL be deleted)"
echo ""
echo "STEP 2: Execute deletion"
echo "────────────────────────"
echo "4. In the SQL, UNCOMMENT the deletion statements:"
echo "   • Remove '--' from lines under 'UNCOMMENT THE LINES BELOW'"
echo "   • This includes DELETE FROM risks and DELETE FROM risk_snapshots"
echo ""
echo "5. RUN again to execute the deletion"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Offer to copy to clipboard
if command -v pbcopy &> /dev/null; then
  read -p "Copy SQL to clipboard now? (y/n): " COPY_SQL
  if [ "$COPY_SQL" = "y" ]; then
    cat /tmp/cleanup-test-data.sql | pbcopy
    echo "✅ SQL copied to clipboard!"
    echo ""
    echo "Next: Paste into Supabase SQL Editor and follow the steps above."
  fi
fi

echo ""
echo "After cleanup, you can re-run the test scripts:"
echo "  1. ./scripts/2-seed-test-risks.sh"
echo "  2. ./scripts/3-commit-test-periods.sh"
echo "  3. ./scripts/4-verify-features.sh"
echo ""
