#!/bin/bash

# Script to seed test risks for period management testing
# Creates a variety of risks with different severities and statuses

echo "======================================"
echo "SEEDING TEST RISKS"
echo "======================================"
echo ""

# Source environment variables
if [ ! -f .env.development ]; then
  echo "❌ Error: .env.development file not found"
  exit 1
fi

source .env.development

# Get organization ID and user ID
echo "⚠️  You need to provide:"
echo "  1. Your organization_id (from user_profiles table)"
echo "  2. Your user_id (from user_profiles table)"
echo ""
read -p "Enter organization_id: " ORG_ID
read -p "Enter user_id: " USER_ID

if [ -z "$ORG_ID" ] || [ -z "$USER_ID" ]; then
  echo "❌ Error: organization_id and user_id are required"
  exit 1
fi

echo ""
echo "📝 Creating test risks for organization: $ORG_ID"
echo ""

# Create SQL to insert test risks
cat > /tmp/seed-test-risks.sql <<EOF
-- Seed test risks for period management testing
-- Organization: $ORG_ID
-- User: $USER_ID

-- Q1 2025 State: Initial risks identified
INSERT INTO risks (
  organization_id,
  risk_code,
  title,
  description,
  category,
  status,
  inherent_likelihood,
  inherent_impact,
  residual_likelihood,
  residual_impact,
  identified_by,
  created_at
) VALUES
-- Extreme risks (2)
('$ORG_ID', 'RISK-Q1-001', 'Ransomware Attack',
 'Risk of ransomware attack disrupting operations', 'Technology', 'UNDER_REVIEW',
 5, 5, 4, 5, '$USER_ID', NOW() - INTERVAL '90 days'),

('$ORG_ID', 'RISK-Q1-002', 'Data Breach - Customer PII',
 'Unauthorized access to customer personal data', 'Compliance', 'APPROVED',
 4, 5, 3, 5, '$USER_ID', NOW() - INTERVAL '85 days'),

-- High risks (3)
('$ORG_ID', 'RISK-Q1-003', 'Supplier Failure',
 'Key supplier bankruptcy or service disruption', 'Operational', 'MONITORING',
 3, 4, 3, 3, '$USER_ID', NOW() - INTERVAL '80 days'),

('$ORG_ID', 'RISK-Q1-004', 'Regulatory Non-Compliance',
 'Failure to meet new regulatory requirements', 'Compliance', 'APPROVED',
 4, 4, 3, 4, '$USER_ID', NOW() - INTERVAL '75 days'),

('$ORG_ID', 'RISK-Q1-005', 'Key Person Loss',
 'Loss of critical technical staff', 'Human Resources', 'IDENTIFIED',
 4, 3, 4, 3, '$USER_ID', NOW() - INTERVAL '70 days'),

-- Medium risks (4)
('$ORG_ID', 'RISK-Q1-006', 'Payment Processing Delays',
 'Delays in payment processing affecting cash flow', 'Financial', 'APPROVED',
 3, 3, 2, 3, '$USER_ID', NOW() - INTERVAL '65 days'),

('$ORG_ID', 'RISK-Q1-007', 'Infrastructure Capacity',
 'Insufficient infrastructure to handle growth', 'Technology', 'MONITORING',
 3, 3, 3, 2, '$USER_ID', NOW() - INTERVAL '60 days'),

('$ORG_ID', 'RISK-Q1-008', 'Third-Party Software Vulnerabilities',
 'Security issues in third-party dependencies', 'Technology', 'UNDER_REVIEW',
 4, 2, 3, 2, '$USER_ID', NOW() - INTERVAL '55 days'),

('$ORG_ID', 'RISK-Q1-009', 'Market Reputation',
 'Negative publicity affecting brand reputation', 'Strategic', 'IDENTIFIED',
 2, 4, 2, 3, '$USER_ID', NOW() - INTERVAL '50 days'),

-- Low risks (3)
('$ORG_ID', 'RISK-Q1-010', 'Office Equipment Failure',
 'Minor equipment failures affecting productivity', 'Operational', 'APPROVED',
 3, 2, 2, 2, '$USER_ID', NOW() - INTERVAL '45 days'),

('$ORG_ID', 'RISK-Q1-011', 'Email System Downtime',
 'Brief email outages', 'Technology', 'MONITORING',
 2, 2, 2, 1, '$USER_ID', NOW() - INTERVAL '40 days'),

('$ORG_ID', 'RISK-Q1-012', 'Minor Compliance Gaps',
 'Small documentation gaps in compliance records', 'Compliance', 'APPROVED',
 2, 3, 1, 2, '$USER_ID', NOW() - INTERVAL '35 days');

-- Show summary
SELECT
  category,
  status,
  COUNT(*) as count,
  ROUND(AVG(residual_likelihood * residual_impact), 1) as avg_risk_score
FROM risks
WHERE organization_id = '$ORG_ID'
  AND risk_code LIKE 'RISK-Q1-%'
GROUP BY category, status
ORDER BY category, status;

-- Show total counts
SELECT
  COUNT(*) as total_risks,
  SUM(CASE WHEN (residual_likelihood * residual_impact) >= 20 THEN 1 ELSE 0 END) as extreme_count,
  SUM(CASE WHEN (residual_likelihood * residual_impact) BETWEEN 12 AND 19 THEN 1 ELSE 0 END) as high_count,
  SUM(CASE WHEN (residual_likelihood * residual_impact) BETWEEN 6 AND 11 THEN 1 ELSE 0 END) as medium_count,
  SUM(CASE WHEN (residual_likelihood * residual_impact) BETWEEN 1 AND 5 THEN 1 ELSE 0 END) as low_count
FROM risks
WHERE organization_id = '$ORG_ID'
  AND risk_code LIKE 'RISK-Q1-%';
EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST DATA READY TO INSERT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 SQL file created: /tmp/seed-test-risks.sql"
echo ""
echo "This will create 12 test risks:"
echo "  • 2 Extreme risks"
echo "  • 3 High risks"
echo "  • 4 Medium risks"
echo "  • 3 Low risks"
echo ""
echo "Categories covered:"
echo "  • Technology (5 risks)"
echo "  • Compliance (3 risks)"
echo "  • Operational (2 risks)"
echo "  • Human Resources (1 risk)"
echo "  • Financial (1 risk)"
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new"
echo ""
echo "2. Run this command to copy SQL:"
echo "   cat /tmp/seed-test-risks.sql | pbcopy"
echo ""
echo "3. Paste into SQL Editor and click 'RUN'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Have you inserted the test risks? (y/n): " INSERTED

if [ "$INSERTED" != "y" ]; then
  echo "❌ Test risks not inserted. Exiting."
  exit 1
fi

echo ""
echo "✅ Test risks created successfully!"
echo ""
echo "Next step: Run ./scripts/3-commit-test-periods.sh"
