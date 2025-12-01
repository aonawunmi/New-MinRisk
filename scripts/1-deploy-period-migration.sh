#!/bin/bash

# Script to deploy the period management migration to Supabase
# This creates the risk_snapshots table and related functions

echo "======================================"
echo "DEPLOYING PERIOD MANAGEMENT MIGRATION"
echo "======================================"
echo ""

# Check if .env.development exists
if [ ! -f .env.development ]; then
  echo "❌ Error: .env.development file not found"
  exit 1
fi

# Source environment variables
source .env.development

# Check if Supabase URL is set
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "❌ Error: VITE_SUPABASE_URL not set in .env.development"
  exit 1
fi

echo "📋 Migration file: supabase/migrations/20251201000003_period_management.sql"
echo "🎯 Target database: ${VITE_SUPABASE_URL}"
echo ""

# Read the migration file
MIGRATION_FILE="supabase/migrations/20251201000003_period_management.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found at $MIGRATION_FILE"
  exit 1
fi

echo "📖 Reading migration file..."
MIGRATION_SQL=$(cat "$MIGRATION_FILE")

echo "🚀 Deploying migration to Supabase..."
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new"
echo ""
echo "2. Copy the SQL from this file:"
echo "   $MIGRATION_FILE"
echo ""
echo "3. Paste into SQL Editor and click 'RUN'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Or, copy this command to open the file:"
echo "cat $MIGRATION_FILE | pbcopy"
echo ""

# Ask if migration was deployed
read -p "Have you deployed the migration? (y/n): " DEPLOYED

if [ "$DEPLOYED" != "y" ]; then
  echo "❌ Migration not deployed. Exiting."
  exit 1
fi

echo ""
echo "✅ Migration deployment confirmed!"
echo ""
echo "🔍 Verifying migration..."

# Create a verification SQL file
cat > /tmp/verify-period-migration.sql <<'EOF'
-- Verify risk_snapshots table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'risk_snapshots'
) as table_exists;

-- Count snapshots
SELECT COUNT(*) as snapshot_count FROM risk_snapshots;

-- Check helper functions exist
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'get_period_snapshot'
) as get_snapshot_fn_exists;

SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'compare_period_snapshots'
) as compare_fn_exists;
EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "VERIFICATION CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run these queries in Supabase SQL Editor to verify:"
echo ""
cat /tmp/verify-period-migration.sql
echo ""
echo "Expected results:"
echo "  - table_exists: true"
echo "  - snapshot_count: 0 (initially)"
echo "  - get_snapshot_fn_exists: true"
echo "  - compare_fn_exists: true"
echo ""
echo "✅ Migration deployment complete!"
echo ""
echo "Next step: Run ./scripts/2-seed-test-risks.sh"
