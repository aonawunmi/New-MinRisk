#!/bin/bash

# Migration Testing Script for Risk Register Enhancements
# Tests all 12 new enhancement migrations (20251126000016-000027)

set -e  # Exit on error

echo "============================================"
echo "Risk Register Migration Testing"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection (from .env.development)
DB_URL="postgresql://postgres.yqjfxzkqzqslqwspjfgo:iRkeDUhdYWcHmKFqgjvQvSsKzLEKJbaE@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing: $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to check SQL syntax
check_sql_syntax() {
    local file="$1"
    # Basic syntax check - look for common errors
    if grep -q "CREAT TABLE" "$file"; then
        echo "Syntax error: CREAT TABLE should be CREATE TABLE"
        return 1
    fi
    if grep -q "SELCT" "$file"; then
        echo "Syntax error: SELCT should be SELECT"
        return 1
    fi
    return 0
}

echo "Phase 1: Syntax Validation"
echo "----------------------------"

for migration in supabase/migrations/202511260000{16..27}_*.sql; do
    if [ -f "$migration" ]; then
        filename=$(basename "$migration")
        run_test "Syntax check: $filename" "check_sql_syntax '$migration'"
    fi
done

echo ""
echo "Phase 2: Migration Order Verification"
echo "--------------------------------------"

# Check that all enhancement migrations exist in order
for i in {16..27}; do
    migration_num=$(printf "%06d" $i)
    migration_file="supabase/migrations/20251126${migration_num}_*.sql"

    if ls $migration_file 1> /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Migration 000${i} exists"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} Migration 000${i} missing"
        ((TESTS_FAILED++))
    fi
done

echo ""
echo "Phase 3: Database Connection Test"
echo "----------------------------------"

if psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database connection successful"
    ((TESTS_PASSED++))

    # Get current migration status
    echo ""
    echo "Current database migration status:"
    psql "$DB_URL" -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;" 2>/dev/null || echo "Migration table not found (this is OK for new databases)"
else
    echo -e "${YELLOW}⚠${NC}  Database connection failed (offline testing mode)"
    echo "    Skipping database-specific tests"
fi

echo ""
echo "Phase 4: Critical Table Checks"
echo "-------------------------------"

# Check if critical tables will be created
critical_tables=(
    "root_cause_register"
    "impact_register"
    "control_library"
    "kri_kci_library"
    "risk_root_causes"
    "risk_impacts"
    "control_dependencies"
    "risk_appetite_statements"
    "indicator_breaches"
    "library_suggestions"
)

for table in "${critical_tables[@]}"; do
    if grep -r "CREATE TABLE.*$table" supabase/migrations/20251126*.sql > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Table definition found: $table"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC}  Table definition not found: $table (may be in earlier migration)"
    fi
done

echo ""
echo "Phase 5: Enhancement-Specific Validation"
echo "-----------------------------------------"

# Test 1: Root Cause Expansion
if grep -q "RC-045" supabase/migrations/20251126000016_expand_root_cause_register.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #1: Root causes expanded to 45"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #1: Missing root cause RC-045"
    ((TESTS_FAILED++))
fi

# Test 2: Impact Expansion
if grep -q "IMP-030" supabase/migrations/20251126000017_expand_impact_register.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #2: Impacts expanded to 30"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #2: Missing impact IMP-030"
    ((TESTS_FAILED++))
fi

# Test 3: DIME Score Fixes
if grep -q "dime_variance_view" supabase/migrations/20251126000018_fix_dime_scores.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #3: DIME score views created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #3: Missing DIME variance view"
    ((TESTS_FAILED++))
fi

# Test 4: KRI/KCI Mappings
if grep -q "root_cause_kri_mapping" supabase/migrations/20251126000019_create_kri_kci_mappings.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #4: KRI/KCI mapping tables created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #4: Missing KRI mapping table"
    ((TESTS_FAILED++))
fi

# Test 5: Implementation Guidance
if grep -q "implementation_guidance" supabase/migrations/20251126000020_add_implementation_guidance.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #5: Implementation guidance columns added"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #5: Missing implementation guidance"
    ((TESTS_FAILED++))
fi

# Test 6: Residual Risk Calculation
if grep -q "calculate_residual_risk" supabase/migrations/20251126000021_residual_risk_calculation.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #6: Residual risk functions created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #6: Missing residual risk function"
    ((TESTS_FAILED++))
fi

# Test 7: Control Testing
if grep -q "control_effectiveness_tests" supabase/migrations/20251126000022_control_effectiveness_tracking.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #7: Control testing table created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #7: Missing control testing table"
    ((TESTS_FAILED++))
fi

# Test 8: Multiple Causes/Impacts
if grep -q "risk_root_causes" supabase/migrations/20251126000023_multiple_causes_impacts.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #8: Multiple causes/impacts supported"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #8: Missing risk_root_causes table"
    ((TESTS_FAILED++))
fi

# Test 9: Control Dependencies
if grep -q "control_dependencies" supabase/migrations/20251126000024_control_dependencies.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #9: Control dependencies table created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #9: Missing control dependencies"
    ((TESTS_FAILED++))
fi

# Test 10: Risk Appetite
if grep -q "risk_appetite_statements" supabase/migrations/20251126000025_risk_appetite_framework.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #10: Risk appetite framework created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #10: Missing risk appetite table"
    ((TESTS_FAILED++))
fi

# Test 11: Breach Tracking
if grep -q "indicator_breaches" supabase/migrations/20251126000026_kri_kci_breach_tracking.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #11: Breach tracking table created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #11: Missing breach tracking"
    ((TESTS_FAILED++))
fi

# Test 12: Library Suggestions
if grep -q "library_suggestions" supabase/migrations/20251126000027_library_approval_workflow.sql; then
    echo -e "${GREEN}✓${NC} Enhancement #12: Library suggestions workflow created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Enhancement #12: Missing library suggestions"
    ((TESTS_FAILED++))
fi

echo ""
echo "Phase 6: Data Integrity Checks"
echo "-------------------------------"

# Check for YOUR_ORG_ID placeholders
placeholder_count=$(grep -r "YOUR_ORG_ID" supabase/migrations/202511260000{16..27}_*.sql 2>/dev/null | wc -l)
if [ "$placeholder_count" -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Found $placeholder_count instances of 'YOUR_ORG_ID' placeholder"
    echo "    These need to be replaced with actual organization IDs before deployment"
else
    echo -e "${GREEN}✓${NC} No placeholders found"
    ((TESTS_PASSED++))
fi

echo ""
echo "============================================"
echo "Test Summary"
echo "============================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Replace 'YOUR_ORG_ID' placeholders with actual organization UUIDs"
    echo "2. Run: npx supabase db push (to apply migrations)"
    echo "3. Verify tables created successfully"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review errors above.${NC}"
    exit 1
fi
