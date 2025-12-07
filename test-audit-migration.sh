#!/bin/bash

# =====================================================
# TEST SCRIPT FOR AUDIT TRAIL MIGRATION
# Verifies migration works before deploying to production
# =====================================================

echo "🔍 Testing Audit Trail Migration..."
echo ""

DB_URL="postgresql://postgres.yqjfxzkqzqslqwspjfgo:iRkeDUhdYWcHmKFqgjvQvSsKzLEKJbaE@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "📋 Step 1: Check if tables exist"
psql "$DB_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('audit_trail', 'risk_owner_history');"

echo ""
echo "📋 Step 2: Check if triggers exist"
psql "$DB_URL" -c "SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE 'audit_%' OR tgname = 'track_owner_transfers';"

echo ""
echo "📋 Step 3: Check if functions exist"
psql "$DB_URL" -c "SELECT proname FROM pg_proc WHERE proname IN ('audit_risks_trigger', 'audit_controls_trigger', 'audit_user_profiles_trigger', 'log_owner_transfer', 'log_audit_entry');"

echo ""
echo "📋 Step 4: Count audit entries"
psql "$DB_URL" -c "SELECT
  (SELECT COUNT(*) FROM audit_trail) as audit_count,
  (SELECT COUNT(*) FROM risk_owner_history) as transfer_count;"

echo ""
echo "✅ Test complete!"
