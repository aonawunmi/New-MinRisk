#!/bin/bash

# Quick test script for Risk Intelligence
# Usage: bash quick-test.sh your.email@example.com your_password

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: bash quick-test.sh your.email@example.com your_password"
  exit 1
fi

# Load environment variables
if [ -f .env.development ]; then
  export $(cat .env.development | grep -v '^#' | xargs)
elif [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

echo "🔍 Quick Risk Intelligence Test"
echo "================================"
echo ""

# Login
echo "📋 Logging in as: $EMAIL"
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Get organization
ORG_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${USER_ID}&select=organization_id" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

ORG_ID=$(echo $ORG_RESPONSE | grep -o '"organization_id":"[^"]*' | cut -d'"' -f4)
echo "✅ Organization ID: $ORG_ID"
echo ""

# Check risks
RISKS_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/risks?organization_id=eq.${ORG_ID}&status=in.(OPEN,MONITORING)&select=risk_code,risk_title" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

RISK_COUNT=$(echo $RISKS_RESPONSE | grep -o '"risk_code"' | wc -l | tr -d ' ')
echo "📊 Active Risks: $RISK_COUNT"
if [ "$RISK_COUNT" -eq 0 ]; then
  echo "⚠️  No active risks! Create some risks first."
  exit 1
fi
echo ""

# Create test event
echo "📋 Creating test ransomware threat event..."
TEST_EVENT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/external_events" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"organization_id\": \"${ORG_ID}\",
    \"title\": \"CRITICAL: Ransomware Group Targets Financial Institutions with New Encryption Malware\",
    \"summary\": \"A sophisticated ransomware group has launched coordinated attacks on multiple banks and financial institutions, encrypting critical trading systems and customer databases. The attackers are demanding millions in cryptocurrency and threatening to leak sensitive customer data. Cybersecurity experts warn this represents a significant escalation in financial sector threats. Affected organizations are working with law enforcement and incident response teams. Regulators have issued emergency alerts advising all financial institutions to immediately review their cybersecurity controls, backup systems, and incident response procedures.\",
    \"source\": \"Financial Security Alert Network\",
    \"event_type\": \"threat\",
    \"url\": \"https://example.com/ransomware-financial-attack-2025\",
    \"published_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"relevance_checked\": false
  }")

TEST_EVENT_ID=$(echo $TEST_EVENT | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TEST_EVENT_ID" ]; then
  echo "❌ Failed to create test event"
  exit 1
fi

echo "✅ Created event: $TEST_EVENT_ID"
echo ""

# Trigger AI analysis
echo "🤖 Triggering AI analysis..."
SCAN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/analyze-intelligence" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\": \"${TEST_EVENT_ID}\", \"minConfidence\": 70}")

echo "Scan Result:"
echo "$SCAN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SCAN_RESPONSE"
echo ""

# Check for alerts
echo "📋 Checking for new alerts..."
sleep 3

NEW_ALERTS=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/risk_intelligence_alerts?event_id=eq.${TEST_EVENT_ID}&select=id,risk_code,confidence_score,ai_reasoning,suggested_controls" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

ALERT_COUNT=$(echo $NEW_ALERTS | grep -o '"id"' | wc -l | tr -d ' ')

if [ "$ALERT_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS! Created $ALERT_COUNT alert(s)"
  echo ""
  echo "Alert Details:"
  echo "$NEW_ALERTS" | python3 -m json.tool 2>/dev/null || echo "$NEW_ALERTS"
  echo ""
  echo "🎉 Risk Intelligence System is working!"
  echo ""
  echo "Next: Check the UI at http://localhost:3000"
  echo "Go to: Risk Intelligence > Intelligence Alerts"
else
  echo "❌ No alerts created"
  echo ""
  echo "Possible issues:"
  echo "1. ANTHROPIC_API_KEY not set in Edge Function secrets"
  echo "2. AI confidence below 70%"
  echo "3. Check Edge Function logs:"
  echo "   https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions"
fi
