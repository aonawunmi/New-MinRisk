#!/bin/bash

# ========================================
# Deploy Incident Analysis Edge Function
# ========================================

echo "🚀 Deploying analyze-incident Edge Function..."
echo ""

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ ERROR: SUPABASE_ACCESS_TOKEN not set"
  echo ""
  echo "To get your access token:"
  echo "1. Go to: https://supabase.com/account/tokens"
  echo "2. Click 'Generate new token'"
  echo "3. Name it 'MinRisk Deployment'"
  echo "4. Copy the token"
  echo ""
  echo "Then run:"
  echo "export SUPABASE_ACCESS_TOKEN=\"your-token-here\""
  echo "$0"
  echo ""
  exit 1
fi

# Deploy the function
echo "📦 Deploying to Supabase..."
npx supabase functions deploy analyze-incident --project-ref qrxwgjjgaekalvaqzpuf

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Edge Function deployed successfully!"
  echo ""
  echo "Verify deployment at:"
  echo "https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions"
  echo ""
  echo "Next steps:"
  echo "1. ✅ Apply database migration (if not done)"
  echo "2. ✅ Verify ANTHROPIC_API_KEY secret is set"
  echo "3. 🧪 Start testing the Incident Module"
  echo ""
else
  echo ""
  echo "❌ Deployment failed!"
  echo "Check the error messages above."
  echo ""
  exit 1
fi
