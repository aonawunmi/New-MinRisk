#!/bin/bash
# Apply All Admin Enhancement Migrations to Supabase
# Applies: Audit Trail + User Invitations
# Run this script to deploy all new features

echo "🚀 Applying All Admin Enhancement Migrations to Supabase..."
echo ""
echo "This will apply:"
echo "  1. Audit Trail (20251204_audit_trail.sql)"
echo "  2. User Invitations (20251205_user_invitations.sql)"
echo ""

# Check if PGPASSWORD is set
if [ -z "$PGPASSWORD" ]; then
  echo "⚠️  PGPASSWORD environment variable not set"
  echo "Set it with: export PGPASSWORD=your_database_password"
  echo ""
  read -sp "Enter database password: " DB_PASSWORD
  echo ""
  export PGPASSWORD="$DB_PASSWORD"
fi

# Database connection details (update these for your Supabase)
DB_HOST="aws-0-us-east-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.yqjfxzkqzqslqwspjfgo"

echo "Connecting to: $DB_HOST"
echo ""

# Counter for successful migrations
SUCCESS_COUNT=0
TOTAL_COUNT=2

# =====================================================
# Migration 1: Audit Trail
# =====================================================

echo "📝 [1/2] Applying Audit Trail Migration..."
echo "----------------------------------------"

psql "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" \
  -f supabase/migrations/20251204_audit_trail.sql

if [ $? -eq 0 ]; then
  echo "✅ Audit Trail migration applied successfully!"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
  echo "❌ Audit Trail migration failed!"
fi

echo ""
echo ""

# =====================================================
# Migration 2: User Invitations
# =====================================================

echo "📝 [2/2] Applying User Invitation Migration..."
echo "----------------------------------------"

psql "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" \
  -f supabase/migrations/20251205_user_invitations.sql

if [ $? -eq 0 ]; then
  echo "✅ User Invitation migration applied successfully!"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
  echo "❌ User Invitation migration failed!"
fi

echo ""
echo ""

# =====================================================
# Summary
# =====================================================

echo "========================================"
echo "MIGRATION SUMMARY"
echo "========================================"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
  echo "✅ All migrations applied successfully! ($SUCCESS_COUNT/$TOTAL_COUNT)"
  echo ""
  echo "📊 Verify migrations:"
  echo ""
  echo "  # Check audit trail table"
  echo "  SELECT COUNT(*) FROM audit_trail;"
  echo ""
  echo "  # Check invitations table"
  echo "  SELECT COUNT(*) FROM user_invitations;"
  echo ""
  echo "🧪 Test the features:"
  echo ""
  echo "  1. AUDIT TRAIL"
  echo "     - Navigate to: Admin Panel → Audit Trail"
  echo "     - Create/update a risk to generate audit entries"
  echo "     - Test filtering and search"
  echo "     - Export to CSV"
  echo ""
  echo "  2. HELP TAB"
  echo "     - Navigate to: Admin Panel → Help"
  echo "     - Search for topics"
  echo "     - Expand/collapse sections"
  echo ""
  echo "  3. USER INVITATIONS"
  echo "     - Navigate to: Admin Panel → User Management → Invitations"
  echo "     - Create a test invitation"
  echo "     - Copy the invite code"
  echo "     - Test signup with the code"
  echo ""
  echo "🎉 All features are ready to use!"
  echo ""
  exit 0
else
  echo "⚠️  Some migrations failed! ($SUCCESS_COUNT/$TOTAL_COUNT)"
  echo ""
  echo "Please review errors above and:"
  echo "  1. Check database connection"
  echo "  2. Verify you have admin privileges"
  echo "  3. Check if migrations were already applied"
  echo "  4. Review error messages for specific issues"
  echo ""
  exit 1
fi
