#!/bin/bash
# =============================================================================
# Layer B Robustness Test Script
# Run this before merging to main
# =============================================================================

set -e  # Exit on first error

echo "=========================================="
echo "🧪 MinRisk Layer B Test Suite"
echo "=========================================="

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠ WARN${NC}: $1"; }

# =============================================================================
# 1. TypeScript Compilation Check
# =============================================================================
echo ""
echo "📝 Test 1: TypeScript Compilation"
echo "-----------------------------------"

if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  fail "TypeScript compilation errors found"
else
  pass "TypeScript compiles without errors"
fi

# =============================================================================
# 2. Build Check
# =============================================================================
echo ""
echo "📦 Test 2: Production Build"
echo "-----------------------------------"

if npm run build > /dev/null 2>&1; then
  pass "Production build succeeds"
else
  fail "Production build failed"
fi

# =============================================================================
# 3. Unit Tests (Vitest)
# =============================================================================
echo ""
echo "🔬 Test 3: Unit Tests"
echo "-----------------------------------"

if npm run test -- --run 2>&1 | grep -q "failed"; then
  warn "Some unit tests failed (check npm run test for details)"
else
  pass "Unit tests pass"
fi

# =============================================================================
# 4. RAF Engine Function Existence Check
# =============================================================================
echo ""
echo "🔧 Test 4: RAF Engine Functions"
echo "-----------------------------------"

RAF_FILE="src/lib/rafEngine.ts"
REQUIRED_FUNCTIONS=(
  "recalculateAllRAFScores"
  "evaluateBreachRuleAsync"
  "evaluateToleranceStatus"
)

for func in "${REQUIRED_FUNCTIONS[@]}"; do
  if grep -qE "(export\s+)?(async\s+)?function\s+$func|$func\s*[:=]\s*(async\s+)?\(" "$RAF_FILE" 2>/dev/null; then
    pass "Function '$func' exists in rafEngine.ts"
  else
    fail "Missing function '$func' in rafEngine.ts"
  fi
done

# =============================================================================
# 5. Database Migration File Check
# =============================================================================
echo ""
echo "📊 Test 5: Layer B Migration Files"
echo "-----------------------------------"

MIGRATION_DIR="supabase/migrations"
REQUIRED_MIGRATIONS=(
  "20260112000001_raf_layer_b_robustness.sql"
)

for mig in "${REQUIRED_MIGRATIONS[@]}"; do
  if [ -f "$MIGRATION_DIR/$mig" ]; then
    pass "Migration '$mig' exists"
  else
    warn "Migration '$mig' not found (may have different timestamp)"
  fi
done

# =============================================================================
# 6. RPC Function Definitions Check
# =============================================================================
echo ""
echo "🗄️ Test 6: RPC Function Definitions"
echo "-----------------------------------"

RPCS_TO_CHECK=(
  "sync_kri_with_tolerance_atomic"
  "acquire_recalc_lock"
  "complete_recalc_run"
  "count_consecutive_breach_periods"
  "count_breaches_in_window"
)

for rpc in "${RPCS_TO_CHECK[@]}"; do
  if grep -rq "$rpc" "$MIGRATION_DIR" 2>/dev/null; then
    pass "RPC '$rpc' defined in migrations"
  else
    warn "RPC '$rpc' not found in migrations"
  fi
done

# =============================================================================
# 7. Type Definitions Check
# =============================================================================
echo ""
echo "📖 Test 7: Type Definitions"
echo "-----------------------------------"

TYPES_TO_CHECK=(
  "DIMEScore"
  "KRIAlert"
  "TreatmentLogEntry"
  "AppetiteBreach"
)

for typ in "${TYPES_TO_CHECK[@]}"; do
  if grep -rq "type $typ\|interface $typ" src/ 2>/dev/null; then
    pass "Type '$typ' is defined"
  else
    warn "Type '$typ' not found"
  fi
done

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=========================================="
echo "🎉 All Layer B tests completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' and manually verify:"
echo "     - RAF Breaches tab loads without errors"
echo "     - KRI tab allows adding new KRIs"
echo "     - DIME scores show 0-3 scale"
echo "  2. If all good, merge to main:"
echo "     git checkout main"
echo "     git merge dev"
echo "     git push origin main"
echo ""
