#!/bin/bash

echo "🔐 Verifying Edge Function Secret Configuration"
echo "==============================================="
echo ""

echo "📋 Step 1: Check what secrets are currently set"
echo "Run this command to see all secrets:"
echo ""
echo "npx supabase secrets list --project-ref qrxwgjjgaekalvaqzpuf"
echo ""
echo "Press Enter to run it..."
read

npx supabase secrets list --project-ref qrxwgjjgaekalvaqzpuf

echo ""
echo "📋 Step 2: If ANTHROPIC_API_KEY is NOT in the list above, set it:"
echo ""
echo "Do you want to set it now? (y/n)"
read answer

if [ "$answer" = "y" ]; then
  if [ -f .env.development ]; then
    export $(cat .env.development | grep -v '^#' | xargs)
  fi

  echo ""
  echo "Setting ANTHROPIC_API_KEY..."
  npx supabase secrets set ANTHROPIC_API_KEY="$VITE_ANTHROPIC_API_KEY" --project-ref qrxwgjjgaekalvaqzpuf

  echo ""
  echo "✅ Secret set! The Edge Function will auto-redeploy."
  echo "Wait 30 seconds, then run: bash quick-test.sh admin1@acme.com TestPass123!"
else
  echo ""
  echo "Manual setup:"
  echo "1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/settings/functions"
  echo "2. Click 'Secrets' tab"
  echo "3. Add secret: ANTHROPIC_API_KEY = <your-api-key-from-.env.development>"
  echo "   (Find the key in .env.development file)"
fi
