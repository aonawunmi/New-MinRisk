#!/bin/bash

# Check what risks exist and why no alerts were created

EMAIL="admin1@acme.com"
PASSWORD="TestPass123!"

# Load environment
if [ -f .env.development ]; then
  export $(cat .env.development | grep -v '^#' | xargs)
fi

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

echo "🔍 Checking Your Risks"
echo "====================="
echo ""

# Login
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# Get risks
RISKS=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/risks?organization_id=eq.11111111-1111-1111-1111-111111111111&status=in.(OPEN,MONITORING)&select=risk_code,risk_title,category&order=category,risk_code&limit=50" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}")

echo "Your Active Risks (OPEN/MONITORING):"
echo "===================================="
echo "$RISKS" | python3 -m json.tool

echo ""
echo ""
echo "💡 Analysis:"
echo "============"
echo "The AI analyzes events against these risk titles."
echo ""
echo "Possible reasons for no alerts:"
echo "1. Risk titles don't mention 'ransomware', 'cyber', 'data breach', etc."
echo "2. AI confidence was below 70% threshold"
echo "3. Check Edge Function logs for AI reasoning:"
echo "   https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions"
echo ""
echo "Recommendation: Check if you have any cybersecurity-related risks."
