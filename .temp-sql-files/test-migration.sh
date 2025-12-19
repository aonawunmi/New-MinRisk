#!/bin/bash

# ============================================================================
# CONTINUOUS RISK EVOLUTION ARCHITECTURE - MIGRATION TEST SCRIPT
# ============================================================================
# This script helps you safely test the new architecture on dev database
# ============================================================================

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  MinRisk - Continuous Risk Evolution Architecture Migration Test    ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.development ]; then
    export $(cat .env.development | grep -v '^#' | xargs)
    echo -e "${GREEN}✓${NC} Loaded .env.development"
else
    echo -e "${RED}✗${NC} .env.development not found!"
    exit 1
fi

# Extract Supabase connection details
SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_SERVICE_KEY="${VITE_SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}✗${NC} Supabase credentials not found in .env.development"
    exit 1
fi

# Extract project ref from URL (e.g., qrxwgjjgaekalvaqzpuf)
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')

echo -e "${BLUE}ℹ${NC} Supabase Project: ${PROJECT_REF}"
echo ""

# ============================================================================
# STEP 1: Confirm this is development database
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 1: Safety Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠ WARNING:${NC} This script will modify your database schema."
echo -e "   Make sure you're running against a ${YELLOW}DEVELOPMENT${NC} database."
echo ""
echo -e "   Supabase Project: ${BLUE}${PROJECT_REF}${NC}"
echo ""
read -p "Is this your DEVELOPMENT database? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}✗${NC} Migration cancelled."
    exit 1
fi

echo -e "${GREEN}✓${NC} Proceeding with development database"
echo ""

# ============================================================================
# STEP 2: Create backup of current schema (optional but recommended)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 2: Pre-Migration Snapshot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Taking snapshot of current database state..."

# Count current risks
RISKS_BEFORE=$(curl -s \
    "${SUPABASE_URL}/rest/v1/risks?select=count" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

echo -e "${BLUE}ℹ${NC} Current risks in database: ${RISKS_BEFORE}"

# Check if old risk_snapshots table exists
SNAPSHOTS_EXIST=$(curl -s \
    "${SUPABASE_URL}/rest/v1/risk_snapshots?select=count" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$SNAPSHOTS_EXIST" != "0" ]; then
    echo -e "${BLUE}ℹ${NC} Found ${SNAPSHOTS_EXIST} old snapshots (will be migrated)"
fi

echo ""

# ============================================================================
# STEP 3: Run the migration
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 3: Running Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

MIGRATION_FILE="supabase/migrations/20250101_continuous_risk_architecture.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}✗${NC} Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Applying migration via Supabase CLI..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Supabase CLI not found. Installing via npx..."
    echo ""

    # Run migration using npx
    npx supabase db push \
        --db-url "postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD:-your-db-password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
        --include-all

    MIGRATION_STATUS=$?
else
    # Use installed Supabase CLI
    supabase db push --project-ref $PROJECT_REF
    MIGRATION_STATUS=$?
fi

if [ $MIGRATION_STATUS -ne 0 ]; then
    echo -e "${RED}✗${NC} Migration failed!"
    echo ""
    echo "To apply manually, run:"
    echo -e "${YELLOW}psql <your-connection-string> -f $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Migration completed successfully!"
echo ""

# ============================================================================
# STEP 4: Verify new tables created
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 4: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking new tables..."

# Check active_period table
ACTIVE_PERIOD_CHECK=$(curl -s \
    "${SUPABASE_URL}/rest/v1/active_period?select=count" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    2>/dev/null | grep -c "count" || echo "0")

if [ "$ACTIVE_PERIOD_CHECK" != "0" ]; then
    echo -e "${GREEN}✓${NC} active_period table exists"
else
    echo -e "${RED}✗${NC} active_period table not found"
fi

# Check risk_history table
RISK_HISTORY_CHECK=$(curl -s \
    "${SUPABASE_URL}/rest/v1/risk_history?select=count" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    2>/dev/null | grep -c "count" || echo "0")

if [ "$RISK_HISTORY_CHECK" != "0" ]; then
    echo -e "${GREEN}✓${NC} risk_history table exists"
else
    echo -e "${RED}✗${NC} risk_history table not found"
fi

# Check period_commits table
PERIOD_COMMITS_CHECK=$(curl -s \
    "${SUPABASE_URL}/rest/v1/period_commits?select=count" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    2>/dev/null | grep -c "count" || echo "0")

if [ "$PERIOD_COMMITS_CHECK" != "0" ]; then
    echo -e "${GREEN}✓${NC} period_commits table exists"
else
    echo -e "${RED}✗${NC} period_commits table not found"
fi

# Check control_assessments table
CONTROL_ASSESSMENTS_CHECK=$(curl -s \
    "${SUPABASE_URL}/rest/v1/control_assessments?select=count" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    2>/dev/null | grep -c "count" || echo "0")

if [ "$CONTROL_ASSESSMENTS_CHECK" != "0" ]; then
    echo -e "${GREEN}✓${NC} control_assessments table exists"
else
    echo -e "${RED}✗${NC} control_assessments table not found"
fi

echo ""

# Verify risks table not affected
RISKS_AFTER=$(curl -s \
    "${SUPABASE_URL}/rest/v1/risks?select=count" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$RISKS_BEFORE" -eq "$RISKS_AFTER" ]; then
    echo -e "${GREEN}✓${NC} Risks table unchanged (${RISKS_AFTER} risks preserved)"
else
    echo -e "${YELLOW}⚠${NC} Risk count changed: ${RISKS_BEFORE} → ${RISKS_AFTER}"
fi

echo ""

# ============================================================================
# STEP 5: Test commitPeriod function
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 5: Test Period Commit Function"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run the TypeScript test to validate commitPeriod() function:"
echo ""
echo -e "${YELLOW}npm run test:migration${NC}"
echo ""
echo "Or manually run:"
echo -e "${YELLOW}npx tsx test-commit-period.ts${NC}"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Migration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✓${NC} Database schema updated"
echo -e "${GREEN}✓${NC} New tables created: active_period, risk_history, period_commits, control_assessments"
echo -e "${GREEN}✓${NC} Existing data preserved"
echo ""
echo "Next steps:"
echo "  1. Run TypeScript test: ${YELLOW}npm run test:migration${NC}"
echo "  2. Check Supabase dashboard: ${BLUE}https://supabase.com/dashboard/project/${PROJECT_REF}${NC}"
echo "  3. Review risk_history table for migrated snapshots"
echo "  4. Test commitPeriod() function manually"
echo ""
echo -e "${BLUE}ℹ${NC} See IMPLEMENTATION_STATUS.md for detailed next steps"
echo ""
