#!/bin/bash
# Simple migration runner - no prompts

echo "🚀 Running MinRisk Continuous Risk Evolution Migration..."
echo ""

cd "$(dirname "$0")"

# Check migration file exists
if [ ! -f "supabase/migrations/20250101_continuous_risk_architecture.sql" ]; then
    echo "❌ Migration file not found!"
    exit 1
fi

echo "📋 Migration file found"
echo ""
echo "Choose method:"
echo "  1) Manual (Copy/Paste to Supabase SQL Editor)"
echo "  2) Via psql command line"
echo ""

# For method 1 - show instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "METHOD 1: Supabase SQL Editor (Recommended)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new"
echo "2. Copy contents of: supabase/migrations/20250101_continuous_risk_architecture.sql"
echo "3. Paste into SQL Editor"
echo "4. Click RUN"
echo ""
echo "✅ Migration will create these tables:"
echo "   - active_period"
echo "   - risk_history"
echo "   - period_commits"
echo "   - control_assessments"
echo ""
