#!/bin/bash

# Master test script for historical risk period management
# Guides through all 4 phases of testing

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   HISTORICAL RISK PERIOD MANAGEMENT - TEST SUITE          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "This suite will guide you through testing all 4 phases:"
echo ""
echo "  📦 Phase 1: Period Commit Functionality"
echo "  🗺️  Phase 2: Historical Heatmap with Period Selector"
echo "  🔄 Phase 3: Side-by-Side Period Comparison"
echo "  📈 Phase 4: Period Analytics & Trend Tracking"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must be run from NEW-MINRISK root directory"
  exit 1
fi

# Check if scripts directory exists
if [ ! -d "scripts" ]; then
  echo "❌ Error: scripts/ directory not found"
  exit 1
fi

# Make all scripts executable
chmod +x scripts/*.sh

echo "Select an option:"
echo ""
echo "  1. 🚀 Full Test (Deploy → Seed → Commit → Verify)"
echo "  2. 📋 Individual Script Menu"
echo "  3. 🧹 Cleanup Test Data"
echo "  4. 📖 Show README"
echo "  5. ❌ Exit"
echo ""
read -p "Enter choice [1-5]: " CHOICE

case $CHOICE in
  1)
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "FULL TEST EXECUTION"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo "This will run all scripts in sequence:"
    echo "  1. Deploy migration"
    echo "  2. Seed test risks"
    echo "  3. Commit test periods"
    echo "  4. Verify all features"
    echo ""
    read -p "Continue? (y/n): " CONTINUE

    if [ "$CONTINUE" != "y" ]; then
      echo "❌ Cancelled"
      exit 0
    fi

    echo ""
    echo "──────────────────────────────────────────────────────────"
    echo "STEP 1/4: Deploy Migration"
    echo "──────────────────────────────────────────────────────────"
    bash scripts/1-deploy-period-migration.sh

    if [ $? -ne 0 ]; then
      echo "❌ Step 1 failed. Exiting."
      exit 1
    fi

    echo ""
    echo "──────────────────────────────────────────────────────────"
    echo "STEP 2/4: Seed Test Risks"
    echo "──────────────────────────────────────────────────────────"
    bash scripts/2-seed-test-risks.sh

    if [ $? -ne 0 ]; then
      echo "❌ Step 2 failed. Exiting."
      exit 1
    fi

    echo ""
    echo "──────────────────────────────────────────────────────────"
    echo "STEP 3/4: Commit Test Periods"
    echo "──────────────────────────────────────────────────────────"
    bash scripts/3-commit-test-periods.sh

    if [ $? -ne 0 ]; then
      echo "❌ Step 3 failed. Exiting."
      exit 1
    fi

    echo ""
    echo "──────────────────────────────────────────────────────────"
    echo "STEP 4/4: Verify Features"
    echo "──────────────────────────────────────────────────────────"
    bash scripts/4-verify-features.sh

    if [ $? -ne 0 ]; then
      echo "❌ Step 4 failed. Exiting."
      exit 1
    fi

    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "✅ FULL TEST COMPLETE!"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo "Next steps:"
    echo "  1. Start dev server: npm run dev"
    echo "  2. Login to your application"
    echo "  3. Test the UI:"
    echo "     • Navigate to Analytics tab"
    echo "     • Try all 4 sub-tabs (Heatmap, Comparison, Trends, Reports)"
    echo "     • Go to Admin → Period Management"
    echo "     • View committed periods"
    echo ""
    ;;

  2)
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "INDIVIDUAL SCRIPT MENU"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo "  1. Deploy Migration (Step 1)"
    echo "  2. Seed Test Risks (Step 2)"
    echo "  3. Commit Test Periods (Step 3)"
    echo "  4. Verify Features (Step 4)"
    echo "  5. Back to Main Menu"
    echo ""
    read -p "Enter choice [1-5]: " SCRIPT_CHOICE

    case $SCRIPT_CHOICE in
      1)
        bash scripts/1-deploy-period-migration.sh
        ;;
      2)
        bash scripts/2-seed-test-risks.sh
        ;;
      3)
        bash scripts/3-commit-test-periods.sh
        ;;
      4)
        bash scripts/4-verify-features.sh
        ;;
      5)
        bash scripts/test-period-management.sh
        ;;
      *)
        echo "❌ Invalid choice"
        ;;
    esac
    ;;

  3)
    echo ""
    bash scripts/5-cleanup-test-data.sh
    ;;

  4)
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "HISTORICAL RISK PERIOD MANAGEMENT - README"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo "📚 OVERVIEW"
    echo "──────────────────────────────────────────────────────────"
    echo "This feature enables organizations to commit end-of-period"
    echo "risk snapshots and track risk evolution over time."
    echo ""
    echo "✨ KEY FEATURES"
    echo "──────────────────────────────────────────────────────────"
    echo ""
    echo "Phase 1: Period Commit (Admin Panel)"
    echo "  • Commit risk snapshots at end of quarter/year"
    echo "  • Immutable JSONB storage of full risk state"
    echo "  • Period naming: Q1 2025, Q2 2025, etc."
    echo "  • View all committed periods in table"
    echo "  • Delete old snapshots if needed"
    echo ""
    echo "Phase 2: Historical Heatmap (Analytics Tab)"
    echo "  • View current risk heatmap (live data)"
    echo "  • Select any committed period to view historical state"
    echo "  • Visual indicators: LIVE vs HISTORICAL"
    echo "  • Period selector dropdown"
    echo "  • 5x5 or 6x6 matrix support"
    echo ""
    echo "Phase 3: Period Comparison (Analytics Tab)"
    echo "  • Side-by-side heatmap comparison"
    echo "  • Dual period selectors"
    echo "  • Comparison metrics: new/closed/changed risks"
    echo "  • Visual change indicators (red/green borders)"
    echo "  • Detailed change tracking sections"
    echo ""
    echo "Phase 4: Trend Analytics (Analytics Tab)"
    echo "  • Summary cards with trend indicators"
    echo "  • Line charts: Risk count over time"
    echo "  • Area charts: Risk level distribution"
    echo "  • Bar charts: Status distribution by period"
    echo "  • Risk migration analysis (escalations/de-escalations)"
    echo "  • Period comparison table"
    echo ""
    echo "🎯 USE CASES"
    echo "──────────────────────────────────────────────────────────"
    echo "  • Executive reporting on risk portfolio trends"
    echo "  • Quarterly/annual risk reviews"
    echo "  • Audit and compliance evidence"
    echo "  • Risk mitigation effectiveness tracking"
    echo "  • Pattern recognition (seasonal risks, etc.)"
    echo ""
    echo "🗂️  DATABASE SCHEMA"
    echo "──────────────────────────────────────────────────────────"
    echo "  • risk_snapshots table: Immutable period snapshots"
    echo "  • JSONB storage: Full risk details + summary"
    echo "  • Helper functions: get_period_snapshot, compare_period_snapshots"
    echo "  • RLS policies: Organization-level isolation"
    echo ""
    echo "📋 TESTING WORKFLOW"
    echo "──────────────────────────────────────────────────────────"
    echo "  1. Deploy migration → Creates risk_snapshots table"
    echo "  2. Seed test risks → 12 risks with various severities"
    echo "  3. Commit periods → Simulates Q1-Q4 2025 with evolution"
    echo "  4. Verify features → SQL checks all 4 phases work"
    echo "  5. Test UI → Manual testing in browser"
    echo ""
    echo "🔧 SCRIPTS AVAILABLE"
    echo "──────────────────────────────────────────────────────────"
    echo "  scripts/1-deploy-period-migration.sh"
    echo "  scripts/2-seed-test-risks.sh"
    echo "  scripts/3-commit-test-periods.sh"
    echo "  scripts/4-verify-features.sh"
    echo "  scripts/5-cleanup-test-data.sh"
    echo "  scripts/test-period-management.sh (this script)"
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo ""
    read -p "Press Enter to return to main menu..."
    bash scripts/test-period-management.sh
    ;;

  5)
    echo ""
    echo "👋 Goodbye!"
    exit 0
    ;;

  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac
