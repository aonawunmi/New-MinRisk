#!/bin/bash

# Quick check script - verify Edge Function configuration

echo "🔍 Quick Risk Intelligence Check"
echo "================================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local file not found!"
  exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "✅ Environment variables loaded"
echo ""

echo "📋 Checking configuration..."
echo "VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}"
echo "VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."
echo "VITE_ANTHROPIC_API_KEY: ${VITE_ANTHROPIC_API_KEY:0:20}..."
echo ""

if [ -z "$VITE_ANTHROPIC_API_KEY" ]; then
  echo "⚠️  WARNING: VITE_ANTHROPIC_API_KEY not set in .env.local"
  echo "The AI analysis will not work without this key."
  echo ""
fi

echo "📋 Checking Edge Function deployment..."
FUNCTION_URL="${VITE_SUPABASE_URL}/functions/v1/analyze-intelligence"
echo "Edge Function URL: $FUNCTION_URL"
echo ""

echo "⚠️  IMPORTANT: For the Edge Function to work, you must:"
echo "1. Set the ANTHROPIC_API_KEY secret in Supabase Dashboard"
echo "   Dashboard > Edge Functions > analyze-intelligence > Secrets"
echo "   Add: ANTHROPIC_API_KEY = your_key_here"
echo ""
echo "2. Or set it via Supabase CLI:"
echo "   supabase secrets set ANTHROPIC_API_KEY=your_key_here"
echo ""

echo "================================"
echo "Next steps:"
echo "1. Run the full test: bash test-risk-intelligence.sh"
echo "2. Or test via the UI: Add an event manually and check for alerts"
echo "================================"
