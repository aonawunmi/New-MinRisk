#!/bin/bash

# Database connection
DB_URL="postgresql://postgres.yqjfxzkqzqslqwspjfgo:iRkeDUhdYWcHmKFqgjvQvSsKzLEKJbaE@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
MIGRATION_FILE="supabase/migrations/20250101_continuous_risk_architecture.sql"

echo "Deploying Continuous Risk Architecture..."
echo "Database: AWS US-East-1 (Supabase)"
echo "Migration: $MIGRATION_FILE"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Applying migration..."

# Run psql and capture output
if psql "$DB_URL" -f "$MIGRATION_FILE"; then
    echo "✅ Migration applied successfully."
else
    echo "❌ Migration failed."
    exit 1
fi
