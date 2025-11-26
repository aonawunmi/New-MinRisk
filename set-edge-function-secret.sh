#!/bin/bash

# Set Anthropic API Key in Supabase Edge Functions
# This reads from .env.development and sets it as a Supabase secret

echo "🔐 Setting Anthropic API Key in Supabase Edge Functions"
echo "======================================================="
echo ""

# Load environment variables
if [ -f .env.development ]; then
  export $(cat .env.development | grep -v '^#' | xargs)
else
  echo "❌ .env.development not found!"
  exit 1
fi

if [ -z "$VITE_ANTHROPIC_API_KEY" ]; then
  echo "❌ VITE_ANTHROPIC_API_KEY not found in .env.development"
  exit 1
fi

echo "✅ Found API key: ${VITE_ANTHROPIC_API_KEY:0:20}..."
echo ""

PROJECT_REF="qrxwgjjgaekalvaqzpuf"

echo "📋 Setting secret in Supabase project: $PROJECT_REF"
echo ""

# Try to set the secret
npx supabase secrets set ANTHROPIC_API_KEY="$VITE_ANTHROPIC_API_KEY" --project-ref "$PROJECT_REF"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Secret set successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Run the test: bash test-risk-intelligence.sh"
  echo "2. Or test via UI: Add a threat event manually"
else
  echo ""
  echo "⚠️  CLI method failed. Use Dashboard instead:"
  echo ""
  echo "1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/settings/functions"
  echo "2. Click 'Secrets' tab"
  echo "3. Add new secret:"
  echo "   Name: ANTHROPIC_API_KEY"
  echo "   Value: $VITE_ANTHROPIC_API_KEY"
  echo "4. Save"
fi
