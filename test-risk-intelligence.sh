#!/bin/bash

# Test script for Risk Intelligence System
# This script helps diagnose why alerts aren't being created

echo "🔍 Risk Intelligence System Diagnostic"
echo "======================================"
echo ""

# Get Supabase credentials from .env.development or .env.local
if [ -f .env.development ]; then
  export $(cat .env.development | grep -v '^#' | xargs)
elif [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env.development or .env.local"
  exit 1
fi

echo "📋 Step 1: Login and get auth token"
echo "Please enter your email:"
read EMAIL
echo "Please enter your password:"
read -s PASSWORD
echo ""

# Login
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"
echo "User ID: $USER_ID"
echo ""

# Get organization_id
echo "📋 Step 2: Getting organization..."
ORG_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${USER_ID}&select=organization_id" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

ORG_ID=$(echo $ORG_RESPONSE | grep -o '"organization_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ORG_ID" ]; then
  echo "❌ Could not get organization_id"
  echo "$ORG_RESPONSE"
  exit 1
fi

echo "✅ Organization ID: $ORG_ID"
echo ""

# Check risks
echo "📋 Step 3: Checking active risks..."
RISKS_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/risks?organization_id=eq.${ORG_ID}&status=in.(OPEN,MONITORING)&select=risk_code,risk_title,status" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

RISK_COUNT=$(echo $RISKS_RESPONSE | grep -o '"risk_code"' | wc -l)
echo "Found $RISK_COUNT active risks:"
echo "$RISKS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RISKS_RESPONSE"
echo ""

if [ "$RISK_COUNT" -eq 0 ]; then
  echo "⚠️  No active risks found! The AI needs risks to analyze events against."
  echo "Please create some risks in the system first."
  exit 1
fi

# Check existing events
echo "📋 Step 4: Checking external events..."
EVENTS_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/external_events?organization_id=eq.${ORG_ID}&select=id,title,relevance_checked&order=created_at.desc&limit=5" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

EVENT_COUNT=$(echo $EVENTS_RESPONSE | grep -o '"id"' | wc -l)
echo "Found $EVENT_COUNT recent events:"
echo "$EVENTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$EVENTS_RESPONSE"
echo ""

# Check existing alerts
echo "📋 Step 5: Checking existing alerts..."
ALERTS_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/risk_intelligence_alerts?organization_id=eq.${ORG_ID}&select=id,risk_code,status,confidence_score&order=created_at.desc&limit=5" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

ALERT_COUNT=$(echo $ALERTS_RESPONSE | grep -o '"id"' | wc -l)
echo "Found $ALERT_COUNT recent alerts:"
echo "$ALERTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ALERTS_RESPONSE"
echo ""

# Create a test event that should trigger an alert
echo "📋 Step 6: Creating test event..."
echo "Creating a cybersecurity threat event that should match your risks..."

TEST_EVENT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/external_events" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"organization_id\": \"${ORG_ID}\",
    \"title\": \"Major Ransomware Attack Hits Financial Sector - Banks Scramble to Secure Systems\",
    \"summary\": \"A sophisticated ransomware group launched coordinated attacks on multiple financial institutions, encrypting critical systems and demanding millions in cryptocurrency. Security experts warn this could be the beginning of a larger campaign targeting the banking sector. Affected organizations are working with cybersecurity firms to restore operations and strengthen defenses. Regulators have issued emergency alerts advising all financial institutions to review their security postures immediately.\",
    \"source\": \"Security News Network\",
    \"event_type\": \"threat\",
    \"url\": \"https://example.com/ransomware-attack\",
    \"published_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"relevance_checked\": false
  }")

TEST_EVENT_ID=$(echo $TEST_EVENT | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TEST_EVENT_ID" ]; then
  echo "❌ Failed to create test event"
  echo "$TEST_EVENT"
  exit 1
fi

echo "✅ Created test event: $TEST_EVENT_ID"
echo ""

# Trigger manual scan
echo "📋 Step 7: Triggering AI analysis..."
echo "Calling Edge Function to analyze the event..."

SCAN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/analyze-intelligence" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventId\": \"${TEST_EVENT_ID}\",
    \"minConfidence\": 70
  }")

echo "Scan Response:"
echo "$SCAN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SCAN_RESPONSE"
echo ""

# Check if alerts were created
echo "📋 Step 8: Checking for new alerts..."
sleep 2

NEW_ALERTS=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/risk_intelligence_alerts?event_id=eq.${TEST_EVENT_ID}&select=id,risk_code,confidence_score,ai_reasoning" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

NEW_ALERT_COUNT=$(echo $NEW_ALERTS | grep -o '"id"' | wc -l)

if [ "$NEW_ALERT_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS! Created $NEW_ALERT_COUNT alert(s):"
  echo "$NEW_ALERTS" | python3 -m json.tool 2>/dev/null || echo "$NEW_ALERTS"
else
  echo "❌ No alerts were created"
  echo ""
  echo "🔍 Possible reasons:"
  echo "1. ANTHROPIC_API_KEY not set in Supabase Edge Function secrets"
  echo "2. AI didn't find the event relevant to your risks (confidence < 70%)"
  echo "3. Edge Function error (check Supabase logs)"
  echo ""
  echo "To debug further:"
  echo "1. Go to Supabase Dashboard > Edge Functions > analyze-intelligence > Logs"
  echo "2. Look for the AI response and any errors"
  echo "3. Check that ANTHROPIC_API_KEY is set in Edge Function secrets"
fi

echo ""
echo "======================================"
echo "🏁 Diagnostic Complete"
echo "======================================"
