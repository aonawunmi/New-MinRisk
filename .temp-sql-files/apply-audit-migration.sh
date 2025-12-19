#!/bin/bash
# Apply Audit Trail Migration to Supabase
# Run this script to set up the audit trail system

echo "🔧 Applying Audit Trail Migration to Supabase..."
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

# Apply migration
psql "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" \
  -f supabase/migrations/20251204_audit_trail.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Audit Trail migration applied successfully!"
  echo ""
  echo "Verify by running:"
  echo "  SELECT COUNT(*) FROM audit_trail;"
  echo ""
else
  echo ""
  echo "❌ Migration failed. Check errors above."
  exit 1
fi
