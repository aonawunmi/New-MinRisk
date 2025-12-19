#!/bin/bash
# Test script to verify AI generates unique reasoning per risk
# Run after deploying the updated analyze-intelligence function

set -e

echo "🧪 Testing Unique AI Reasoning per Risk"
echo "========================================"
echo ""

# Get API key from .env
SERVICE_KEY=$(cat .env.development | grep VITE_SUPABASE_SERVICE_ROLE_KEY | cut -d '=' -f2)
ANON_KEY=$(cat .env.development | grep VITE_SUPABASE_ANON_KEY | cut -d '=' -f2)

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ Could not find VITE_SUPABASE_SERVICE_ROLE_KEY in .env.development"
  exit 1
fi

echo "Step 0: Get organization ID"
echo "---------------------------"

# Get first organization from database
ORG_ID=$(curl -s \
  "https://qrxwgjjgaekalvaqzpuf.supabase.co/rest/v1/organizations?select=id&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | jq -r '.[0].id')

if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
  echo "❌ No organizations found in database"
  exit 1
fi

echo "✅ Using organization: $ORG_ID"
echo ""

echo "Step 1: Create a test event that affects multiple risks"
echo "--------------------------------------------------------"

# Create a test event about supply chain disruption (affects multiple risk types)
EVENT_RESPONSE=$(curl -s -X POST \
  "https://qrxwgjjgaekalvaqzpuf.supabase.co/rest/v1/external_events" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"organization_id\": \"$ORG_ID\",
    \"title\": \"Global Supply Chain Crisis: Component Shortages Affect Tech Sector\",
    \"summary\": \"Major semiconductor shortage affecting global tech manufacturers. Production delays expected for 6-12 months. Prices rising 30-50%. Alternative suppliers limited. Affects operations, finances, and strategic planning.\",
    \"event_type\": \"market\",
    \"source\": \"test\",
    \"relevance_checked\": false,
    \"published_date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }")

EVENT_ID=$(echo "$EVENT_RESPONSE" | jq -r 'if type=="array" then .[0].id else .id end')

if [ -z "$EVENT_ID" ] || [ "$EVENT_ID" = "null" ]; then
  echo "❌ Failed to create test event"
  echo "$EVENT_RESPONSE"
  exit 1
fi

echo "✅ Created test event: $EVENT_ID"
echo ""

echo "Step 2: Trigger AI analysis (analyze-intelligence function)"
echo "-----------------------------------------------------------"

ANALYZE_RESPONSE=$(curl -s -X POST \
  "https://qrxwgjjgaekalvaqzpuf.supabase.co/functions/v1/analyze-intelligence" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventId\": \"$EVENT_ID\",
    \"minConfidence\": 60
  }")

echo "$ANALYZE_RESPONSE" | jq '.'
echo ""

ALERTS_CREATED=$(echo "$ANALYZE_RESPONSE" | jq -r '.alertsCreated // 0')

if [ "$ALERTS_CREATED" -eq 0 ]; then
  echo "⚠️ No alerts created. Event might not be relevant or confidence too low."
  echo "Check Supabase Edge Function logs for details:"
  echo "https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions/analyze-intelligence/details"
  exit 0
fi

echo "✅ Created $ALERTS_CREATED alerts"
echo ""

echo "Step 3: Verify each alert has UNIQUE reasoning"
echo "----------------------------------------------"

# Get all alerts for this event
ALERTS=$(curl -s \
  "https://qrxwgjjgaekalvaqzpuf.supabase.co/rest/v1/risk_intelligence_alerts?event_id=eq.$EVENT_ID&select=risk_code,ai_reasoning,suggested_controls,impact_assessment" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY")

echo "$ALERTS" | jq -r '.[] | "
Risk: \(.risk_code)
Reasoning: \(.ai_reasoning)
Controls: \(.suggested_controls | join(", "))
Impact: \(.impact_assessment)
---"'

echo ""
echo "✅ Test complete!"
echo ""
echo "📊 EXPECTED RESULT:"
echo "   - Each risk should have DIFFERENT, SPECIFIC reasoning"
echo "   - Each risk should have TAILORED controls"
echo "   - Each risk should have SPECIFIC impact assessment"
echo ""
echo "❌ OLD BEHAVIOR (bug):"
echo "   - All risks had IDENTICAL generic reasoning"
echo "   - Same controls for all risks"
echo "   - Same impact assessment"
echo ""
echo "🧹 Cleanup: Delete test event"
curl -s -X DELETE \
  "https://qrxwgjjgaekalvaqzpuf.supabase.co/rest/v1/external_events?id=eq.$EVENT_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" > /dev/null

echo "✅ Test event deleted"
