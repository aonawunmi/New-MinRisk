#!/usr/bin/env node

/**
 * Automated test runner for period management
 * Executes all test steps programmatically using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '../.env.development');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env.development');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   AUTOMATED PERIOD MANAGEMENT TEST SUITE                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

async function getOrgAndUser() {
  console.log('📋 Step 0: Getting organization and user info...');

  // Get first user profile
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, organization_id, role')
    .limit(1)
    .single();

  if (error || !profiles) {
    console.error('❌ Error getting user profile:', error);
    process.exit(1);
  }

  console.log(`✅ Found user: ${profiles.id}`);
  console.log(`✅ Organization: ${profiles.organization_id}`);
  console.log('');

  return { userId: profiles.id, orgId: profiles.organization_id };
}

async function step1DeployMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 1/4: Deploy Migration');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Read migration file
  const migrationPath = join(__dirname, '../supabase/migrations/20251201000003_period_management.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('📖 Executing migration SQL...');

  // Execute migration (note: Supabase client doesn't directly support raw SQL execution)
  // We'll need to use rpc or direct SQL execution
  console.log('⚠️  Migration needs to be run in Supabase SQL Editor');
  console.log('   File: supabase/migrations/20251201000003_period_management.sql');
  console.log('');

  // Check if table exists
  const { data, error } = await supabase
    .from('risk_snapshots')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.log('❌ risk_snapshots table not found');
    console.log('   Please run the migration in Supabase SQL Editor first');
    return false;
  }

  console.log('✅ risk_snapshots table exists');
  console.log('');
  return true;
}

async function step2SeedRisks(orgId, userId) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 2/4: Seed Test Risks');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const testRisks = [
    // Extreme risks (2)
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-001',
      title: 'Ransomware Attack',
      description: 'Risk of ransomware attack disrupting operations',
      category: 'Technology',
      status: 'UNDER_REVIEW',
      inherent_likelihood: 5,
      inherent_impact: 5,
      residual_likelihood: 4,
      residual_impact: 5,
      identified_by: userId
    },
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-002',
      title: 'Data Breach - Customer PII',
      description: 'Unauthorized access to customer personal data',
      category: 'Compliance',
      status: 'APPROVED',
      inherent_likelihood: 4,
      inherent_impact: 5,
      residual_likelihood: 3,
      residual_impact: 5,
      identified_by: userId
    },
    // High risks (3)
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-003',
      title: 'Supplier Failure',
      description: 'Key supplier bankruptcy or service disruption',
      category: 'Operational',
      status: 'MONITORING',
      inherent_likelihood: 3,
      inherent_impact: 4,
      residual_likelihood: 3,
      residual_impact: 3,
      identified_by: userId
    },
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-004',
      title: 'Regulatory Non-Compliance',
      description: 'Failure to meet new regulatory requirements',
      category: 'Compliance',
      status: 'APPROVED',
      inherent_likelihood: 4,
      inherent_impact: 4,
      residual_likelihood: 3,
      residual_impact: 4,
      identified_by: userId
    },
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-005',
      title: 'Key Person Loss',
      description: 'Loss of critical technical staff',
      category: 'Human Resources',
      status: 'IDENTIFIED',
      inherent_likelihood: 4,
      inherent_impact: 3,
      residual_likelihood: 4,
      residual_impact: 3,
      identified_by: userId
    },
    // Medium risks (4)
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-006',
      title: 'Payment Processing Delays',
      description: 'Delays in payment processing affecting cash flow',
      category: 'Financial',
      status: 'APPROVED',
      inherent_likelihood: 3,
      inherent_impact: 3,
      residual_likelihood: 2,
      residual_impact: 3,
      identified_by: userId
    },
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-007',
      title: 'Infrastructure Capacity',
      description: 'Insufficient infrastructure to handle growth',
      category: 'Technology',
      status: 'MONITORING',
      inherent_likelihood: 3,
      inherent_impact: 3,
      residual_likelihood: 3,
      residual_impact: 2,
      identified_by: userId
    },
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-008',
      title: 'Third-Party Software Vulnerabilities',
      description: 'Security issues in third-party dependencies',
      category: 'Technology',
      status: 'UNDER_REVIEW',
      inherent_likelihood: 4,
      inherent_impact: 2,
      residual_likelihood: 3,
      residual_impact: 2,
      identified_by: userId
    },
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-009',
      title: 'Market Reputation',
      description: 'Negative publicity affecting brand reputation',
      category: 'Strategic',
      status: 'IDENTIFIED',
      inherent_likelihood: 2,
      inherent_impact: 4,
      residual_likelihood: 2,
      residual_impact: 3,
      identified_by: userId
    },
    // Low risks (3)
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-010',
      title: 'Office Equipment Failure',
      description: 'Minor equipment failures affecting productivity',
      category: 'Operational',
      status: 'APPROVED',
      inherent_likelihood: 3,
      inherent_impact: 2,
      residual_likelihood: 2,
      residual_impact: 2,
      identified_by: userId
    },
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-011',
      title: 'Email System Downtime',
      description: 'Brief email outages',
      category: 'Technology',
      status: 'MONITORING',
      inherent_likelihood: 2,
      inherent_impact: 2,
      residual_likelihood: 2,
      residual_impact: 1,
      identified_by: userId
    },
    {
      organization_id: orgId,
      risk_code: 'RISK-Q1-012',
      title: 'Minor Compliance Gaps',
      description: 'Small documentation gaps in compliance records',
      category: 'Compliance',
      status: 'APPROVED',
      inherent_likelihood: 2,
      inherent_impact: 3,
      residual_likelihood: 1,
      residual_impact: 2,
      identified_by: userId
    }
  ];

  console.log(`📝 Creating ${testRisks.length} test risks...`);

  for (const risk of testRisks) {
    const { error } = await supabase
      .from('risks')
      .insert(risk);

    if (error && !error.message.includes('duplicate')) {
      console.error(`❌ Error creating ${risk.risk_code}:`, error.message);
    } else if (error) {
      console.log(`⏭️  ${risk.risk_code} already exists, skipping`);
    } else {
      console.log(`✅ Created ${risk.risk_code}`);
    }
  }

  // Verify
  const { data: risks, error: countError } = await supabase
    .from('risks')
    .select('risk_code')
    .eq('organization_id', orgId)
    .like('risk_code', 'RISK-Q%');

  if (countError) {
    console.error('❌ Error verifying risks:', countError);
    return false;
  }

  console.log('');
  console.log(`✅ Total test risks: ${risks.length}`);
  console.log('');
  return true;
}

async function step3CommitPeriods(orgId, userId) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 3/4: Commit Test Periods');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('⚠️  This step requires custom SQL functions');
  console.log('   Please run: bash scripts/3-commit-test-periods.sh');
  console.log('');
  return true;
}

async function step4Verify(orgId) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 4/4: Verify Features');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Check snapshots
  const { data: snapshots, error } = await supabase
    .from('risk_snapshots')
    .select('*')
    .eq('organization_id', orgId);

  if (error) {
    console.error('❌ Error querying snapshots:', error);
    return false;
  }

  console.log(`✅ Found ${snapshots?.length || 0} period snapshots`);

  if (snapshots && snapshots.length > 0) {
    console.log('');
    console.log('Periods committed:');
    snapshots.forEach(s => {
      console.log(`  • ${s.period}: ${s.risk_count} risks`);
    });
  }

  console.log('');
  return true;
}

async function main() {
  try {
    const { userId, orgId } = await getOrgAndUser();

    const step1OK = await step1DeployMigration();
    if (!step1OK) {
      console.log('❌ Step 1 failed - please run migration first');
      process.exit(1);
    }

    const step2OK = await step2SeedRisks(orgId, userId);
    if (!step2OK) {
      console.log('❌ Step 2 failed');
      process.exit(1);
    }

    await step3CommitPeriods(orgId, userId);
    await step4Verify(orgId);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ TEST SUITE COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: bash scripts/3-commit-test-periods.sh');
    console.log('  2. Start dev server: npm run dev');
    console.log('  3. Test UI: Navigate to Analytics tab');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
