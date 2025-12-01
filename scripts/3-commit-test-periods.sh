#!/bin/bash

# Script to commit multiple test periods with evolving risk states
# Simulates Q1, Q2, Q3, Q4 2025 with changing risks

echo "======================================"
echo "COMMITTING TEST PERIODS"
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
echo "  1. Your organization_id"
echo "  2. Your user_id"
echo ""
read -p "Enter organization_id: " ORG_ID
read -p "Enter user_id: " USER_ID

if [ -z "$ORG_ID" ] || [ -z "$USER_ID" ]; then
  echo "❌ Error: organization_id and user_id are required"
  exit 1
fi

echo ""
echo "📅 This script will commit 4 periods: Q1, Q2, Q3, Q4 2025"
echo "   Each period will show risk evolution over time"
echo ""

# Create SQL for period progression
cat > /tmp/commit-test-periods.sql <<EOF
-- Commit Q1 2025 (Initial State)
-- This captures the current state we seeded
DO \$\$
DECLARE
  snapshot_data JSONB;
  risk_count INT;
BEGIN
  -- Build snapshot
  SELECT jsonb_build_object(
    'risks', jsonb_agg(
      jsonb_build_object(
        'risk_code', r.risk_code,
        'title', r.title,
        'category', r.category,
        'status', r.status,
        'inherent_likelihood', r.inherent_likelihood,
        'inherent_impact', r.inherent_impact,
        'residual_likelihood', r.residual_likelihood,
        'residual_impact', r.residual_impact,
        'residual_score', r.residual_likelihood * r.residual_impact
      )
    ),
    'summary', jsonb_build_object(
      'total_risks', COUNT(*),
      'extreme_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) >= 20 THEN 1 ELSE 0 END),
      'high_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 12 AND 19 THEN 1 ELSE 0 END),
      'medium_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 6 AND 11 THEN 1 ELSE 0 END),
      'low_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 1 AND 5 THEN 1 ELSE 0 END),
      'identified_count', SUM(CASE WHEN r.status = 'IDENTIFIED' THEN 1 ELSE 0 END),
      'under_review_count', SUM(CASE WHEN r.status = 'UNDER_REVIEW' THEN 1 ELSE 0 END),
      'approved_count', SUM(CASE WHEN r.status = 'APPROVED' THEN 1 ELSE 0 END),
      'monitoring_count', SUM(CASE WHEN r.status = 'MONITORING' THEN 1 ELSE 0 END),
      'closed_count', SUM(CASE WHEN r.status = 'CLOSED' THEN 1 ELSE 0 END)
    )
  ),
  COUNT(*)
  INTO snapshot_data, risk_count
  FROM risks r
  WHERE r.organization_id = '$ORG_ID'
    AND r.risk_code LIKE 'RISK-Q1-%';

  -- Insert snapshot
  INSERT INTO risk_snapshots (
    organization_id,
    period,
    snapshot_date,
    committed_by,
    risk_count,
    snapshot_data,
    notes
  ) VALUES (
    '$ORG_ID',
    'Q1 2025',
    NOW() - INTERVAL '90 days',
    '$USER_ID',
    risk_count,
    snapshot_data,
    'Initial state - 12 risks identified across all categories'
  );

  RAISE NOTICE '✅ Q1 2025 committed: % risks', risk_count;
END \$\$;

-- Q2 2025: Some risks mitigated, 1 new risk, 1 escalation
-- Update existing risks
UPDATE risks SET
  residual_likelihood = 3, residual_impact = 4,
  status = 'MONITORING'
WHERE organization_id = '$ORG_ID' AND risk_code = 'RISK-Q1-001'; -- Ransomware: mitigated from 4x5 to 3x4

UPDATE risks SET
  status = 'CLOSED'
WHERE organization_id = '$ORG_ID' AND risk_code = 'RISK-Q1-010'; -- Office equipment: closed

UPDATE risks SET
  residual_likelihood = 4, residual_impact = 4
WHERE organization_id = '$ORG_ID' AND risk_code = 'RISK-Q1-007'; -- Infrastructure: escalated to 4x4

-- Add new Q2 risk
INSERT INTO risks (
  organization_id, risk_code, title, description, category, status,
  inherent_likelihood, inherent_impact, residual_likelihood, residual_impact,
  identified_by, created_at
) VALUES (
  '$ORG_ID', 'RISK-Q2-001', 'AI Model Bias',
  'Bias in AI/ML models affecting decision fairness', 'Technology', 'IDENTIFIED',
  3, 4, 3, 4, '$USER_ID', NOW() - INTERVAL '60 days'
);

-- Commit Q2 2025
DO \$\$
DECLARE
  snapshot_data JSONB;
  risk_count INT;
BEGIN
  SELECT jsonb_build_object(
    'risks', jsonb_agg(
      jsonb_build_object(
        'risk_code', r.risk_code,
        'title', r.title,
        'category', r.category,
        'status', r.status,
        'inherent_likelihood', r.inherent_likelihood,
        'inherent_impact', r.inherent_impact,
        'residual_likelihood', r.residual_likelihood,
        'residual_impact', r.residual_impact,
        'residual_score', r.residual_likelihood * r.residual_impact
      )
    ),
    'summary', jsonb_build_object(
      'total_risks', COUNT(*) FILTER (WHERE r.status != 'CLOSED'),
      'extreme_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) >= 20 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'high_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 12 AND 19 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'medium_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 6 AND 11 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'low_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 1 AND 5 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'identified_count', SUM(CASE WHEN r.status = 'IDENTIFIED' THEN 1 ELSE 0 END),
      'under_review_count', SUM(CASE WHEN r.status = 'UNDER_REVIEW' THEN 1 ELSE 0 END),
      'approved_count', SUM(CASE WHEN r.status = 'APPROVED' THEN 1 ELSE 0 END),
      'monitoring_count', SUM(CASE WHEN r.status = 'MONITORING' THEN 1 ELSE 0 END),
      'closed_count', SUM(CASE WHEN r.status = 'CLOSED' THEN 1 ELSE 0 END)
    )
  ),
  COUNT(*) FILTER (WHERE r.status != 'CLOSED')
  INTO snapshot_data, risk_count
  FROM risks r
  WHERE r.organization_id = '$ORG_ID'
    AND (r.risk_code LIKE 'RISK-Q1-%' OR r.risk_code LIKE 'RISK-Q2-%');

  INSERT INTO risk_snapshots (
    organization_id, period, snapshot_date, committed_by, risk_count, snapshot_data, notes
  ) VALUES (
    '$ORG_ID', 'Q2 2025', NOW() - INTERVAL '60 days', '$USER_ID', risk_count, snapshot_data,
    'Ransomware mitigated (4x5→3x4), Infrastructure escalated (3x2→4x4), 1 risk closed, 1 new AI risk added'
  );

  RAISE NOTICE '✅ Q2 2025 committed: % risks', risk_count;
END \$\$;

-- Q3 2025: Further mitigation, 2 more risks closed, 1 de-escalation
UPDATE risks SET
  residual_likelihood = 2, residual_impact = 4,
  status = 'APPROVED'
WHERE organization_id = '$ORG_ID' AND risk_code = 'RISK-Q1-002'; -- Data breach: further mitigated

UPDATE risks SET
  status = 'CLOSED'
WHERE organization_id = '$ORG_ID' AND risk_code IN ('RISK-Q1-011', 'RISK-Q1-012'); -- Close 2 low risks

UPDATE risks SET
  residual_likelihood = 2, residual_impact = 3
WHERE organization_id = '$ORG_ID' AND risk_code = 'RISK-Q1-003'; -- Supplier: de-escalated to medium

-- Commit Q3 2025
DO \$\$
DECLARE
  snapshot_data JSONB;
  risk_count INT;
BEGIN
  SELECT jsonb_build_object(
    'risks', jsonb_agg(
      jsonb_build_object(
        'risk_code', r.risk_code,
        'title', r.title,
        'category', r.category,
        'status', r.status,
        'inherent_likelihood', r.inherent_likelihood,
        'inherent_impact', r.inherent_impact,
        'residual_likelihood', r.residual_likelihood,
        'residual_impact', r.residual_impact,
        'residual_score', r.residual_likelihood * r.residual_impact
      )
    ),
    'summary', jsonb_build_object(
      'total_risks', COUNT(*) FILTER (WHERE r.status != 'CLOSED'),
      'extreme_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) >= 20 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'high_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 12 AND 19 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'medium_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 6 AND 11 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'low_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 1 AND 5 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'identified_count', SUM(CASE WHEN r.status = 'IDENTIFIED' THEN 1 ELSE 0 END),
      'under_review_count', SUM(CASE WHEN r.status = 'UNDER_REVIEW' THEN 1 ELSE 0 END),
      'approved_count', SUM(CASE WHEN r.status = 'APPROVED' THEN 1 ELSE 0 END),
      'monitoring_count', SUM(CASE WHEN r.status = 'MONITORING' THEN 1 ELSE 0 END),
      'closed_count', SUM(CASE WHEN r.status = 'CLOSED' THEN 1 ELSE 0 END)
    )
  ),
  COUNT(*) FILTER (WHERE r.status != 'CLOSED')
  INTO snapshot_data, risk_count
  FROM risks r
  WHERE r.organization_id = '$ORG_ID'
    AND (r.risk_code LIKE 'RISK-Q1-%' OR r.risk_code LIKE 'RISK-Q2-%');

  INSERT INTO risk_snapshots (
    organization_id, period, snapshot_date, committed_by, risk_count, snapshot_data, notes
  ) VALUES (
    '$ORG_ID', 'Q3 2025', NOW() - INTERVAL '30 days', '$USER_ID', risk_count, snapshot_data,
    'Data breach further mitigated (3x5→2x4), Supplier de-escalated (3x3→2x3), 2 low risks closed'
  );

  RAISE NOTICE '✅ Q3 2025 committed: % risks', risk_count;
END \$\$;

-- Q4 2025: 2 new emerging risks, 1 more mitigation
INSERT INTO risks (
  organization_id, risk_code, title, description, category, status,
  inherent_likelihood, inherent_impact, residual_likelihood, residual_impact,
  identified_by, created_at
) VALUES
(
  '$ORG_ID', 'RISK-Q4-001', 'Quantum Computing Threat',
  'Emerging quantum computing threatening current encryption', 'Technology', 'IDENTIFIED',
  2, 5, 2, 5, '$USER_ID', NOW()
),
(
  '$ORG_ID', 'RISK-Q4-002', 'Supply Chain Cyberattack',
  'Third-party vendor compromise affecting supply chain', 'Technology', 'UNDER_REVIEW',
  4, 4, 4, 4, '$USER_ID', NOW()
);

UPDATE risks SET
  residual_likelihood = 3, residual_impact = 3
WHERE organization_id = '$ORG_ID' AND risk_code = 'RISK-Q1-004'; -- Regulatory: mitigated to medium

-- Commit Q4 2025
DO \$\$
DECLARE
  snapshot_data JSONB;
  risk_count INT;
BEGIN
  SELECT jsonb_build_object(
    'risks', jsonb_agg(
      jsonb_build_object(
        'risk_code', r.risk_code,
        'title', r.title,
        'category', r.category,
        'status', r.status,
        'inherent_likelihood', r.inherent_impact,
        'inherent_impact', r.inherent_impact,
        'residual_likelihood', r.residual_likelihood,
        'residual_impact', r.residual_impact,
        'residual_score', r.residual_likelihood * r.residual_impact
      )
    ),
    'summary', jsonb_build_object(
      'total_risks', COUNT(*) FILTER (WHERE r.status != 'CLOSED'),
      'extreme_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) >= 20 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'high_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 12 AND 19 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'medium_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 6 AND 11 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'low_count', SUM(CASE WHEN (r.residual_likelihood * r.residual_impact) BETWEEN 1 AND 5 AND r.status != 'CLOSED' THEN 1 ELSE 0 END),
      'identified_count', SUM(CASE WHEN r.status = 'IDENTIFIED' THEN 1 ELSE 0 END),
      'under_review_count', SUM(CASE WHEN r.status = 'UNDER_REVIEW' THEN 1 ELSE 0 END),
      'approved_count', SUM(CASE WHEN r.status = 'APPROVED' THEN 1 ELSE 0 END),
      'monitoring_count', SUM(CASE WHEN r.status = 'MONITORING' THEN 1 ELSE 0 END),
      'closed_count', SUM(CASE WHEN r.status = 'CLOSED' THEN 1 ELSE 0 END)
    )
  ),
  COUNT(*) FILTER (WHERE r.status != 'CLOSED')
  INTO snapshot_data, risk_count
  FROM risks r
  WHERE r.organization_id = '$ORG_ID'
    AND (r.risk_code LIKE 'RISK-Q1-%' OR r.risk_code LIKE 'RISK-Q2-%' OR r.risk_code LIKE 'RISK-Q4-%');

  INSERT INTO risk_snapshots (
    organization_id, period, snapshot_date, committed_by, risk_count, snapshot_data, notes
  ) VALUES (
    '$ORG_ID', 'Q4 2025', NOW(), '$USER_ID', risk_count, snapshot_data,
    '2 new emerging tech risks added (Quantum, Supply Chain), Regulatory mitigated to medium'
  );

  RAISE NOTICE '✅ Q4 2025 committed: % risks', risk_count;
END \$\$;

-- Show summary of all periods
SELECT
  period,
  snapshot_date,
  risk_count,
  (snapshot_data->'summary'->>'extreme_count')::int as extreme,
  (snapshot_data->'summary'->>'high_count')::int as high,
  (snapshot_data->'summary'->>'medium_count')::int as medium,
  (snapshot_data->'summary'->>'low_count')::int as low,
  notes
FROM risk_snapshots
WHERE organization_id = '$ORG_ID'
ORDER BY snapshot_date;
EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PERIOD PROGRESSION PLAN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📅 Q1 2025 (Initial State):"
echo "   • 12 risks total"
echo "   • 2 Extreme, 3 High, 4 Medium, 3 Low"
echo ""
echo "📅 Q2 2025 (90 days later):"
echo "   • Ransomware mitigated: 4x5 → 3x4 (Extreme → High)"
echo "   • Infrastructure escalated: 3x2 → 4x4 (Medium → High)"
echo "   • 1 risk closed (Office Equipment)"
echo "   • 1 new risk added (AI Model Bias)"
echo "   • Total: 12 risks (1 closed, 1 new)"
echo ""
echo "📅 Q3 2025 (120 days later):"
echo "   • Data Breach further mitigated: 3x5 → 2x4 (Extreme → High)"
echo "   • Supplier de-escalated: 3x3 → 2x3 (High → Medium)"
echo "   • 2 more low risks closed"
echo "   • Total: 10 risks (3 closed)"
echo ""
echo "📅 Q4 2025 (150 days later):"
echo "   • 2 new emerging risks (Quantum, Supply Chain)"
echo "   • Regulatory mitigated: 3x4 → 3x3 (High → Medium)"
echo "   • Total: 12 risks (net +2 new)"
echo ""
echo "Expected trends:"
echo "  ✅ Extreme risks: 2 → 1 → 0 → 1 (net reduction)"
echo "  ⚠️  High risks: 3 → 4 → 3 → 3 (controlled)"
echo "  📈 Medium risks: 4 → 4 → 5 → 6 (increasing)"
echo "  📉 Low risks: 3 → 3 → 2 → 2 (decreasing)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Copy SQL to clipboard:"
echo "   cat /tmp/commit-test-periods.sql | pbcopy"
echo ""
echo "2. Open Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new"
echo ""
echo "3. Paste and RUN the SQL"
echo ""
echo "This will:"
echo "  • Commit 4 periods (Q1-Q4 2025)"
echo "  • Update risks to simulate evolution"
echo "  • Show summary of all committed periods"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Have you committed all periods? (y/n): " COMMITTED

if [ "$COMMITTED" != "y" ]; then
  echo "❌ Periods not committed. Exiting."
  exit 1
fi

echo ""
echo "✅ All 4 periods committed successfully!"
echo ""
echo "Next step: Run ./scripts/4-verify-features.sh"
