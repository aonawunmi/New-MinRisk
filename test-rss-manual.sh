#!/bin/bash

# Manual RSS Scanner Test
# Tests the scan-rss-feeds Edge Function before setting up automation

echo "📡 RSS Intelligence Scanner - Manual Test"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env.development ]; then
  export $(cat .env.development | grep -v '^#' | xargs)
elif [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

SUPABASE_URL="${VITE_SUPABASE_URL}"
SERVICE_KEY="${VITE_SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Error: Missing environment variables"
  echo "   VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY not found"
  echo ""
  echo "Make sure .env.development exists with these variables."
  exit 1
fi

echo "✅ Environment variables loaded"
echo "   Supabase URL: $SUPABASE_URL"
echo ""

# Check current event count
echo "📊 Step 1: Checking current event count..."
BEFORE_COUNT=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/external_events?select=count" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Range: 0-0" \
  2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

echo "   Current events in database: ${BEFORE_COUNT:-0}"
echo ""

# Trigger RSS scanner
echo "🚀 Step 2: Triggering RSS scanner..."
echo "   This may take 30-90 seconds..."
echo ""

START_TIME=$(date +%s)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/scan-rss-feeds" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "manual"}')

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "   HTTP Status: $HTTP_CODE"
echo "   Duration: ${DURATION}s"
echo ""

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "✅ Scanner executed successfully"
  echo ""
  echo "📋 Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""
else
  echo "❌ Scanner failed"
  echo "   Status Code: $HTTP_CODE"
  echo "   Response: $BODY"
  echo ""
  echo "🔍 Troubleshooting:"
  echo "   1. Check ANTHROPIC_API_KEY is set in Supabase Edge Function secrets"
  echo "   2. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions"
  echo "   3. Click 'scan-rss-feeds' → Logs to see error details"
  exit 1
fi

# Wait for events to be written
echo "⏳ Step 3: Waiting for database write (3 seconds)..."
sleep 3
echo ""

# Check new event count
echo "📊 Step 4: Checking for new events..."
AFTER_COUNT=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/external_events?select=count" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Range: 0-0" \
  2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

NEW_EVENTS=$((AFTER_COUNT - BEFORE_COUNT))

echo "   Events before: ${BEFORE_COUNT:-0}"
echo "   Events after: ${AFTER_COUNT:-0}"
echo "   New events: $NEW_EVENTS"
echo ""

if [ "$NEW_EVENTS" -gt 0 ]; then
  echo "✅ New events created!"
  echo ""
  echo "📋 Sample of recent events:"
  curl -s -X GET "${SUPABASE_URL}/rest/v1/external_events?select=id,title,source,published_date&order=created_at.desc&limit=5" \
    -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    2>/dev/null | python3 -m json.tool 2>/dev/null
else
  echo "⚠️ No new events created"
  echo ""
  echo "Possible reasons:"
  echo "1. All events were duplicates (already in system)"
  echo "2. RSS feeds returned no new content"
  echo "3. Events were outside 7-day window (too old)"
fi

echo ""

# Check for new alerts
echo "🔔 Step 5: Checking for new alerts..."
RECENT_ALERTS=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/intelligence_alerts?select=id,risk_code,confidence_score,created_at&order=created_at.desc&limit=5" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  2>/dev/null)

ALERT_COUNT=$(echo "$RECENT_ALERTS" | grep -o '"id"' | wc -l | tr -d ' ')

echo "   Recent alerts (last 5): $ALERT_COUNT found"
echo ""

if [ "$ALERT_COUNT" -gt 0 ]; then
  echo "📋 Alert details:"
  echo "$RECENT_ALERTS" | python3 -m json.tool 2>/dev/null
else
  echo "ℹ️  No alerts in system yet"
  echo "   Alerts are created when events match risks with high confidence (>60%)"
fi

echo ""
echo "=========================================="
echo "✅ Manual RSS Scanner Test Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. If events were created → RSS scanner is working correctly"
echo "2. Set up automated cron job (see CRON-SETUP-GUIDE.md)"
echo "3. Monitor Supabase Edge Function logs for any errors"
echo ""
echo "View logs at:"
echo "https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions"
echo ""
