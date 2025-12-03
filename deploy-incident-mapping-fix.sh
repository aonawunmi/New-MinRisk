#!/bin/bash
# Deploy Fixed AI Incident Mapping Edge Function
# Fixes duplicate key constraint error when re-running analysis

set -e

echo "🚀 Deploying Fixed AI Incident Mapping Edge Function..."
echo ""
echo "This fixes the duplicate key error when re-running AI analysis on incidents."
echo ""

# Check if logged in
if ! npx supabase projects list &>/dev/null; then
  echo "❌ Not logged in to Supabase CLI"
  echo ""
  echo "Please run one of these commands first:"
  echo "  1. npx supabase login"
  echo "  2. export SUPABASE_ACCESS_TOKEN=your_access_token"
  echo ""
  exit 1
fi

echo "✅ Authenticated with Supabase"
echo ""

# Deploy the function
echo "📦 Deploying analyze-incident-for-risk-mapping..."
npx supabase functions deploy analyze-incident-for-risk-mapping --project-ref qrxwgjjgaekalvaqzpuf

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing Instructions:"
echo "  1. Open your app at http://localhost:3000"
echo "  2. Go to Incidents → AI Review (ADMIN) tab"
echo "  3. Select an incident that already has suggestions"
echo "  4. Click 'Run AI Analysis' again"
echo "  5. Should now work without duplicate key error"
echo ""
echo "📊 View logs:"
echo "  Dashboard: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions/analyze-incident-for-risk-mapping/logs"
echo ""
