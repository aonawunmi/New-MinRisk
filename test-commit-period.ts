/**
 * Test Script: Commit Period Function
 *
 * This script validates the new continuous risk evolution architecture:
 * 1. Tests commitPeriod() function
 * 2. Verifies risks are NOT deleted (continuous model)
 * 3. Checks risk_history snapshots created
 * 4. Validates active_period advancement
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.development' });

// Override import.meta.env for Node.js
(globalThis as any).import = {
  meta: {
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    }
  }
};

import { supabase } from './src/lib/supabase';
import {
  commitPeriod,
  getActivePeriod,
  getRiskHistoryForPeriod,
  getCommittedPeriods,
  formatPeriod,
  compareSnapshotPeriods,
  type Period
} from './src/lib/periods-v2';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: string, symbol: string, message: string) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function success(message: string) {
  log(colors.green, '✓', message);
}

function error(message: string) {
  log(colors.red, '✗', message);
}

function info(message: string) {
  log(colors.blue, 'ℹ', message);
}

function warn(message: string) {
  log(colors.yellow, '⚠', message);
}

function section(title: string) {
  console.log('\n' + colors.cyan + '━'.repeat(70) + colors.reset);
  console.log(colors.bright + '  ' + title + colors.reset);
  console.log(colors.cyan + '━'.repeat(70) + colors.reset + '\n');
}

async function main() {
  console.log('\n' + colors.bright + '╔══════════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.bright + '║     Test: Continuous Risk Evolution - Period Commit Function        ║' + colors.reset);
  console.log(colors.bright + '╚══════════════════════════════════════════════════════════════════════╝' + colors.reset);

  try {
    // ========================================================================
    // STEP 1: Get current user and organization
    // ========================================================================
    section('STEP 1: Authentication & Setup');

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      error('Not authenticated. Please log in first.');
      process.exit(1);
    }

    success(`Authenticated as: ${user.email}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      error('Could not load user profile');
      process.exit(1);
    }

    const orgId = profile.organization_id;
    success(`Organization ID: ${orgId}`);

    // ========================================================================
    // STEP 2: Check current state
    // ========================================================================
    section('STEP 2: Pre-Commit State');

    // Count current risks
    const { count: risksCount, error: risksError } = await supabase
      .from('risks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (risksError) {
      error(`Failed to count risks: ${risksError.message}`);
      process.exit(1);
    }

    info(`Current risks in database: ${risksCount}`);

    if (!risksCount || risksCount === 0) {
      warn('No risks found. Commit will create empty snapshot.');
      warn('Consider adding test risks first.');
    }

    // Get current active period
    const { data: activePeriod, error: periodError } = await getActivePeriod(orgId);

    if (periodError) {
      error(`Failed to get active period: ${periodError.message}`);
      process.exit(1);
    }

    if (!activePeriod) {
      error('No active period found');
      process.exit(1);
    }

    const currentPeriod: Period = {
      year: activePeriod.current_period_year,
      quarter: activePeriod.current_period_quarter,
    };

    info(`Active period: ${formatPeriod(currentPeriod)}`);

    // Check if period already committed
    const { data: existingCommits } = await getCommittedPeriods(orgId);
    const alreadyCommitted = existingCommits?.some(
      c => c.period_year === currentPeriod.year && c.period_quarter === currentPeriod.quarter
    );

    if (alreadyCommitted) {
      warn(`Period ${formatPeriod(currentPeriod)} already committed!`);
      warn('This test will fail. Choose a different period or delete the existing commit.');

      console.log('\nExisting committed periods:');
      existingCommits?.forEach(commit => {
        console.log(`  - ${formatPeriod({year: commit.period_year, quarter: commit.period_quarter})} (${commit.risks_count} risks)`);
      });

      process.exit(1);
    }

    // ========================================================================
    // STEP 3: Commit the period
    // ========================================================================
    section('STEP 3: Committing Period');

    info(`Committing period: ${formatPeriod(currentPeriod)}`);
    console.log('');

    const { data: commitResult, error: commitError } = await commitPeriod(
      orgId,
      currentPeriod,
      user.id,
      `Test commit from automated test script - ${new Date().toISOString()}`
    );

    if (commitError) {
      error(`Commit failed: ${commitError.message}`);
      process.exit(1);
    }

    success('Period committed successfully!');
    console.log('');
    console.log('Commit details:');
    console.log(`  - Period: ${formatPeriod({year: commitResult!.period_year, quarter: commitResult!.period_quarter})}`);
    console.log(`  - Risks snapshotted: ${commitResult!.risks_count}`);
    console.log(`  - Active risks: ${commitResult!.active_risks_count}`);
    console.log(`  - Closed risks: ${commitResult!.closed_risks_count}`);
    console.log(`  - Controls: ${commitResult!.controls_count}`);
    console.log(`  - Committed at: ${new Date(commitResult!.committed_at).toLocaleString()}`);

    // ========================================================================
    // STEP 4: Verify risks NOT deleted (critical!)
    // ========================================================================
    section('STEP 4: Verify Risks Preserved (Continuous Model)');

    const { count: risksCountAfter, error: risksAfterError } = await supabase
      .from('risks')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (risksAfterError) {
      error(`Failed to count risks after commit: ${risksAfterError.message}`);
      process.exit(1);
    }

    if (risksCountAfter === risksCount) {
      success(`Risks preserved: ${risksCountAfter} risks (same as before) ✓`);
      success('Continuous risk model working correctly!');
    } else {
      error(`Risk count changed: ${risksCount} → ${risksCountAfter}`);
      error('CRITICAL: Risks should NOT be deleted during commit!');
      process.exit(1);
    }

    // ========================================================================
    // STEP 5: Verify risk_history snapshots created
    // ========================================================================
    section('STEP 5: Verify Risk History Snapshots');

    const { data: historySnapshots, error: historyError } = await getRiskHistoryForPeriod(
      orgId,
      currentPeriod
    );

    if (historyError) {
      error(`Failed to load risk history: ${historyError.message}`);
      process.exit(1);
    }

    if (!historySnapshots || historySnapshots.length === 0) {
      error('No risk_history snapshots found!');
      process.exit(1);
    }

    success(`Created ${historySnapshots.length} risk_history snapshots`);

    // Show sample snapshot
    if (historySnapshots.length > 0) {
      const sample = historySnapshots[0];
      console.log('\nSample snapshot:');
      console.log(`  - Risk: ${sample.risk_code} - ${sample.risk_title}`);
      console.log(`  - Inherent: L${sample.likelihood_inherent} × I${sample.impact_inherent} = ${sample.score_inherent}`);
      console.log(`  - Residual: L${sample.likelihood_residual} × I${sample.impact_residual} = ${sample.score_residual}`);
      console.log(`  - Status: ${sample.status}`);
      console.log(`  - Change type: ${sample.change_type}`);
    }

    // ========================================================================
    // STEP 6: Verify active_period advanced
    // ========================================================================
    section('STEP 6: Verify Active Period Advanced');

    const { data: newActivePeriod, error: newPeriodError } = await getActivePeriod(orgId);

    if (newPeriodError || !newActivePeriod) {
      error('Failed to get new active period');
      process.exit(1);
    }

    const newPeriod: Period = {
      year: newActivePeriod.current_period_year,
      quarter: newActivePeriod.current_period_quarter,
    };

    const expectedNextPeriod = currentPeriod.quarter === 4
      ? { year: currentPeriod.year + 1, quarter: 1 }
      : { year: currentPeriod.year, quarter: currentPeriod.quarter + 1 };

    if (newPeriod.year === expectedNextPeriod.year && newPeriod.quarter === expectedNextPeriod.quarter) {
      success(`Period advanced: ${formatPeriod(currentPeriod)} → ${formatPeriod(newPeriod)} ✓`);
    } else {
      error(`Period advancement incorrect:`);
      error(`  Expected: ${formatPeriod(expectedNextPeriod)}`);
      error(`  Got: ${formatPeriod(newPeriod)}`);
      process.exit(1);
    }

    info(`Previous period stored: ${formatPeriod({year: newActivePeriod.previous_period_year!, quarter: newActivePeriod.previous_period_quarter!})}`);

    // ========================================================================
    // STEP 7: Summary
    // ========================================================================
    section('Test Summary');

    console.log(colors.green + '✓ All tests passed!' + colors.reset);
    console.log('');
    console.log('Verified:');
    console.log('  ✓ Period committed successfully');
    console.log('  ✓ Risks preserved (continuous model)');
    console.log('  ✓ risk_history snapshots created');
    console.log('  ✓ active_period advanced to next quarter');
    console.log('');
    console.log(colors.bright + 'Architecture working correctly! ✨' + colors.reset);
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Check Supabase dashboard for ${formatPeriod(currentPeriod)} data`);
    console.log('  2. Build Period Management UI (Admin panel)');
    console.log('  3. Build Risk History view component');
    console.log('  4. Update Period Comparison component');
    console.log('');

  } catch (err) {
    console.error('\n' + colors.red + '❌ Test failed with error:' + colors.reset);
    console.error(err);
    process.exit(1);
  }
}

// Run the test
main();
