-- ============================================================================
-- Seed Intelligence Module Test Data
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Get your organization_id (you'll need to replace this)
-- Run this first to get your org_id:
-- SELECT id, name FROM organizations;

-- Step 2: Replace YOUR_ORG_ID_HERE with actual org_id from step 1
-- Then run the rest of this script

DO $$
DECLARE
  v_org_id UUID;
  v_event_id_1 UUID;
  v_event_id_2 UUID;
  v_event_id_3 UUID;
  v_risk_code TEXT;
BEGIN
  -- Get first organization (or specify your org_id)
  SELECT id INTO v_org_id FROM organizations LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Please create an organization first.';
  END IF;

  RAISE NOTICE 'Using organization ID: %', v_org_id;

  -- Get a risk code to link to (or use default)
  SELECT risk_code INTO v_risk_code
  FROM risks
  WHERE organization_id = v_org_id
  LIMIT 1;

  IF v_risk_code IS NULL THEN
    v_risk_code := 'R-001';
    RAISE NOTICE 'No risks found. Using default risk code: %', v_risk_code;
  ELSE
    RAISE NOTICE 'Found risk code: %', v_risk_code;
  END IF;

  -- ========================================================================
  -- Create External Events
  -- ========================================================================

  RAISE NOTICE 'Creating external events...';

  -- Event 1: CBN Cybersecurity Guidelines
  INSERT INTO external_events (
    id,
    organization_id,
    source,
    event_type,
    title,
    summary,
    url,
    published_date,
    relevance_checked,
    fetched_at,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'CBN Nigeria',
    'Regulatory Change',
    'CBN Releases New Guidelines on Cybersecurity for Financial Institutions',
    'The Central Bank of Nigeria has issued comprehensive cybersecurity guidelines requiring all banks and financial institutions to implement enhanced security measures, including multi-factor authentication, regular security audits, and incident response plans.',
    'https://www.cbn.gov.ng/out/2024/cybersecurity-guidelines',
    NOW() - INTERVAL '2 days',
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_event_id_1;

  -- Event 2: Market Volatility
  INSERT INTO external_events (
    id,
    organization_id,
    source,
    event_type,
    title,
    summary,
    url,
    published_date,
    relevance_checked,
    fetched_at,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'SEC Nigeria',
    'Market Risk',
    'Stock Market Volatility Alert: NSE All-Share Index Drops 5%',
    'The Nigerian Stock Exchange has experienced significant volatility with the All-Share Index dropping 5% in a single trading session due to foreign portfolio outflows and economic uncertainty.',
    'https://www.sec.gov.ng/market-alert-2024',
    NOW() - INTERVAL '1 day',
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_event_id_2;

  -- Event 3: Data Breach
  INSERT INTO external_events (
    id,
    organization_id,
    source,
    event_type,
    title,
    summary,
    url,
    published_date,
    relevance_checked,
    fetched_at,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_org_id,
    'Reuters',
    'Operational Risk',
    'Major Bank Suffers Data Breach Affecting 2 Million Customers',
    'A leading commercial bank reported a cybersecurity breach that exposed personal and financial data of approximately 2 million customers. The incident highlights growing cybersecurity threats in the banking sector.',
    'https://reuters.com/banking-data-breach-2024',
    NOW() - INTERVAL '3 days',
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_event_id_3;

  RAISE NOTICE 'Created 3 external events';

  -- ========================================================================
  -- Create Intelligence Alerts
  -- ========================================================================

  RAISE NOTICE 'Creating intelligence alerts...';

  -- Alert 1: High priority - CBN Guidelines
  INSERT INTO intelligence_alerts (
    organization_id,
    event_id,
    risk_code,
    is_relevant,
    confidence_score,
    likelihood_change,
    impact_change,
    ai_reasoning,
    status,
    applied_to_risk,
    created_at
  ) VALUES (
    v_org_id,
    v_event_id_1,
    v_risk_code,
    true,
    85,
    1,
    2,
    'This CBN cybersecurity guideline is highly relevant to operational and compliance risks. It increases the likelihood of regulatory scrutiny and the impact could be significant if the organization fails to comply with the new requirements.',
    'pending',
    false,
    NOW() - INTERVAL '2 days'
  );

  -- Alert 2: Medium priority - Market Volatility
  INSERT INTO intelligence_alerts (
    organization_id,
    event_id,
    risk_code,
    is_relevant,
    confidence_score,
    likelihood_change,
    impact_change,
    ai_reasoning,
    status,
    applied_to_risk,
    created_at
  ) VALUES (
    v_org_id,
    v_event_id_2,
    v_risk_code,
    true,
    72,
    0,
    1,
    'Market volatility is moderately relevant to investment and market risks. While this specific event may not directly affect the organization, it indicates broader market instability that could impact operations.',
    'pending',
    false,
    NOW() - INTERVAL '1 day'
  );

  -- Alert 3: Critical - Data Breach
  INSERT INTO intelligence_alerts (
    organization_id,
    event_id,
    risk_code,
    is_relevant,
    confidence_score,
    likelihood_change,
    impact_change,
    ai_reasoning,
    status,
    applied_to_risk,
    created_at
  ) VALUES (
    v_org_id,
    v_event_id_3,
    v_risk_code,
    true,
    95,
    2,
    3,
    'This data breach is critically relevant to cybersecurity and operational risks. Similar threats could affect our organization. The incident significantly increases both the likelihood and potential impact of data breach scenarios.',
    'pending',
    false,
    NOW() - INTERVAL '3 days'
  );

  RAISE NOTICE 'Created 3 intelligence alerts';

  -- ========================================================================
  -- Summary
  -- ========================================================================

  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '✅ Intelligence module seeding complete!';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE 'External Events: 3';
  RAISE NOTICE 'Intelligence Alerts: 3';
  RAISE NOTICE 'Linked to Risk: %', v_risk_code;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Refresh your browser to see the new data!';
  RAISE NOTICE '   Go to: Intelligence tab → View events and alerts';

END $$;
