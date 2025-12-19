#!/bin/bash

# Check and set Edge Function secrets

echo "🔐 Edge Function Secrets Check"
echo "=============================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$VITE_ANTHROPIC_API_KEY" ]; then
  echo "❌ VITE_ANTHROPIC_API_KEY not found in .env.local"
  echo ""
  echo "Please add it to .env.local:"
  echo "VITE_ANTHROPIC_API_KEY=sk-ant-api03-..."
  exit 1
fi

echo "✅ Found ANTHROPIC_API_KEY in .env.local: ${VITE_ANTHROPIC_API_KEY:0:20}..."
echo ""

echo "📋 To set this secret in Supabase Edge Functions, you have 2 options:"
echo ""
echo "OPTION 1: Via Supabase Dashboard (Recommended)"
echo "---------------------------------------------"
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Navigate to: Edge Functions > Secrets"
echo "4. Click 'Add Secret'"
echo "5. Name: ANTHROPIC_API_KEY"
echo "6. Value: ${VITE_ANTHROPIC_API_KEY}"
echo "7. Click 'Save'"
echo ""

echo "OPTION 2: Via Supabase CLI"
echo "-------------------------"
echo "Run this command:"
echo ""
echo "supabase secrets set ANTHROPIC_API_KEY=\"${VITE_ANTHROPIC_API_KEY}\" --project-ref YOUR_PROJECT_REF"
echo ""
echo "To find your project ref:"
echo "1. Go to Supabase Dashboard > Settings > API"
echo "2. Copy the 'Project Reference ID'"
echo ""

echo "=============================="
echo "After setting the secret:"
echo "1. Redeploy the Edge Function (or it will auto-redeploy)"
echo "2. Run: bash test-risk-intelligence.sh"
echo "=============================="
