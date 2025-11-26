/**
 * Seed Intelligence Module Test Data
 * Creates sample external events and intelligence alerts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.development') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Use service role to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.development');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedIntelligenceData() {
  console.log('🌱 Seeding Intelligence module test data...\n');

  try {
    // 1. Get first organization (using service role, no auth needed)
    console.log('1️⃣ Getting organization...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      console.error('❌ Could not find any organization');
      process.exit(1);
    }

    const orgId = orgs[0].id;
    console.log(`✅ Organization: ${orgs[0].name} (${orgId})\n`);

    // 2. Check if we have any risks to link to
    console.log('2️⃣ Checking for risks in register...');
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('risk_code, risk_title')
      .eq('organization_id', orgId)
      .limit(1);

    let riskCode = 'R-001';
    if (risks && risks.length > 0) {
      riskCode = risks[0].risk_code;
      console.log(`✅ Found risk: ${riskCode} - ${risks[0].risk_title}\n`);
    } else {
      console.log(`⚠️  No risks found. Will use default risk code: ${riskCode}\n`);
    }

    // 3. Create External Events
    console.log('3️⃣ Creating external events...');

    const events = [
      {
        organization_id: orgId,
        source: 'CBN Nigeria',
        event_type: 'Regulatory Change',
        title: 'CBN Releases New Guidelines on Cybersecurity for Financial Institutions',
        summary: 'The Central Bank of Nigeria has issued comprehensive cybersecurity guidelines requiring all banks and financial institutions to implement enhanced security measures, including multi-factor authentication, regular security audits, and incident response plans.',
        url: 'https://www.cbn.gov.ng/out/2024/cybersecurity-guidelines',
        published_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        relevance_checked: false,
        fetched_at: new Date().toISOString(),
      },
      {
        organization_id: orgId,
        source: 'SEC Nigeria',
        event_type: 'Market Risk',
        title: 'Stock Market Volatility Alert: NSE All-Share Index Drops 5%',
        summary: 'The Nigerian Stock Exchange has experienced significant volatility with the All-Share Index dropping 5% in a single trading session due to foreign portfolio outflows and economic uncertainty.',
        url: 'https://www.sec.gov.ng/market-alert-2024',
        published_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        relevance_checked: false,
        fetched_at: new Date().toISOString(),
      },
      {
        organization_id: orgId,
        source: 'Reuters',
        event_type: 'Operational Risk',
        title: 'Major Bank Suffers Data Breach Affecting 2 Million Customers',
        summary: 'A leading commercial bank reported a cybersecurity breach that exposed personal and financial data of approximately 2 million customers. The incident highlights growing cybersecurity threats in the banking sector.',
        url: 'https://reuters.com/banking-data-breach-2024',
        published_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        relevance_checked: false,
        fetched_at: new Date().toISOString(),
      },
    ];

    const { data: createdEvents, error: eventsError } = await supabase
      .from('external_events')
      .insert(events)
      .select();

    if (eventsError) {
      console.error('❌ Error creating events:', eventsError.message);
      process.exit(1);
    }

    console.log(`✅ Created ${createdEvents.length} external events\n`);

    // 4. Create Intelligence Alerts
    console.log('4️⃣ Creating intelligence alerts...');

    const alerts = [
      {
        organization_id: orgId,
        event_id: createdEvents[0].id,
        risk_code: riskCode,
        is_relevant: true,
        confidence_score: 85,
        likelihood_change: 1,
        impact_change: 2,
        ai_reasoning: 'This CBN cybersecurity guideline is highly relevant to operational and compliance risks. It increases the likelihood of regulatory scrutiny and the impact could be significant if the organization fails to comply with the new requirements.',
        status: 'pending',
        applied_to_risk: false,
      },
      {
        organization_id: orgId,
        event_id: createdEvents[1].id,
        risk_code: riskCode,
        is_relevant: true,
        confidence_score: 72,
        likelihood_change: 0,
        impact_change: 1,
        ai_reasoning: 'Market volatility is moderately relevant to investment and market risks. While this specific event may not directly affect the organization, it indicates broader market instability that could impact operations.',
        status: 'pending',
        applied_to_risk: false,
      },
      {
        organization_id: orgId,
        event_id: createdEvents[2].id,
        risk_code: riskCode,
        is_relevant: true,
        confidence_score: 95,
        likelihood_change: 2,
        impact_change: 2,
        ai_reasoning: 'This data breach is critically relevant to cybersecurity and operational risks. Similar threats could affect our organization. The incident significantly increases both the likelihood and potential impact of data breach scenarios.',
        status: 'pending',
        applied_to_risk: false,
      },
    ];

    const { data: createdAlerts, error: alertsError } = await supabase
      .from('intelligence_alerts')
      .insert(alerts)
      .select();

    if (alertsError) {
      console.error('❌ Error creating alerts:', alertsError.message);
      process.exit(1);
    }

    console.log(`✅ Created ${createdAlerts.length} intelligence alerts\n`);

    // 5. Summary
    console.log('═══════════════════════════════════════════');
    console.log('✅ Intelligence module seeding complete!');
    console.log('═══════════════════════════════════════════');
    console.log(`📰 External Events: ${createdEvents.length}`);
    console.log(`🚨 Intelligence Alerts: ${createdAlerts.length}`);
    console.log(`🔗 Linked to Risk: ${riskCode}`);
    console.log('\n💡 Refresh your browser to see the new data!');
    console.log('   Go to: Intelligence tab → View events and alerts\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the seeding
seedIntelligenceData();
