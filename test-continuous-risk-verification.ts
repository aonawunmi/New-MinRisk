
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY || !SUPABASE_URL) {
    console.error('❌ Error: VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_URL not found in environment');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyMigration() {
    console.log('🔍 Verifying Continuous Risk Architecture Migration...');

    // 1. Check if tables exist by querying them directly (anon role cannot access information_schema)
    console.log('Checking active_period access...');
    const { error: activePeriodError } = await supabase.from('active_period').select('count', { count: 'exact', head: true });

    if (activePeriodError) {
        console.error('❌ Could not access active_period:', activePeriodError.message);
    } else {
        console.log('✅ active_period is accessible');
    }

    console.log('Checking risk_history access...');
    const { error: historyError } = await supabase.from('risk_history').select('count', { count: 'exact', head: true });

    if (historyError) {
        console.error('❌ Could not access risk_history:', historyError.message);
    } else {
        console.log('✅ risk_history is accessible');
    }

    console.log('Checking period_commits access...');
    const { error: commitsError } = await supabase.from('period_commits').select('count', { count: 'exact', head: true });

    if (commitsError) {
        console.error('❌ Could not access period_commits:', commitsError.message);
    } else {
        console.log('✅ period_commits is accessible');
    }


    // 2. Risk columns check skipped (cannot access information_schema)

    // 3. Check active_period population
    const { data: activePeriods, error: apError } = await supabase
        .from('active_period')
        .select('*')
        .limit(5);

    if (apError) {
        console.error('❌ Error querying active_period:', apError);
    } else {
        console.log(`✅ Found ${activePeriods?.length} active_period records.`);
        if (activePeriods && activePeriods.length > 0) {
            console.log('Sample:', activePeriods[0]);
        } else {
            console.warn('⚠️ No active_period records found. Was initialization successful?');
        }
    }

    // 4. Check risk_history migration
    const { count: historyCount, error: migrationHistoryError } = await supabase
        .from('risk_history')
        .select('*', { count: 'exact', head: true });

    if (migrationHistoryError) {
        console.error('❌ Error querying risk_history:', migrationHistoryError);
    } else {
        console.log(`✅ Found ${historyCount} risk_history records (migrated snapshots).`);
    }

}

verifyMigration().catch(console.error);
