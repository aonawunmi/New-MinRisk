#!/bin/bash

# Deploy RSS Scanner Edge Function to Supabase
# Run this script to deploy the scan-rss-feeds function

echo "🚀 Deploying RSS Scanner Edge Function..."

# Check if logged in to Supabase
if ! npx supabase status &>/dev/null; then
  echo "📝 Not logged in to Supabase. Logging in now..."
  npx supabase login
fi

# Deploy the function
echo "📦 Deploying scan-rss-feeds function..."
npx supabase functions deploy scan-rss-feeds --project-ref qrxwgjjgaekalvaqzpuf

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "📍 Function URL:"
  echo "   https://qrxwgjjgaekalvaqzpuf.supabase.co/functions/v1/scan-rss-feeds"
  echo ""
  echo "🔑 Next steps:"
  echo "   1. Verify ANTHROPIC_API_KEY secret is set:"
  echo "      npx supabase secrets list --project-ref qrxwgjjgaekalvaqzpuf"
  echo ""
  echo "   2. Test manually (get token from Supabase dashboard):"
  echo "      curl -X POST 'https://qrxwgjjgaekalvaqzpuf.supabase.co/functions/v1/scan-rss-feeds' \\"
  echo "        -H 'Authorization: Bearer YOUR_JWT_TOKEN'"
  echo ""
  echo "   3. Set up daily cron:"
  echo "      Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions"
  echo "      Enable cron trigger: 0 2 * * * (daily at 2AM UTC)"
  echo ""
else
  echo ""
  echo "❌ Deployment failed. Check the error above."
  echo ""
  echo "💡 Troubleshooting:"
  echo "   - Ensure you're logged in: npx supabase login"
  echo "   - Check project ref: qrxwgjjgaekalvaqzpuf"
  echo "   - Verify files exist in supabase/functions/scan-rss-feeds/"
  echo ""
fi
