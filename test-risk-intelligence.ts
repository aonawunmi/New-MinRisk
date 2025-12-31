
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.development' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
    console.log('\n🔍 Risk Intelligence System Diagnostic (Node.js)');
    console.log('==============================================\n');

    try {
        // 1. Login
        console.log('📋 Step 1: Login');
        const email = await askQuestion('   Enter email: ');
        const password = await askQuestion('   Enter password: ');

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim() // Trimming helps remove accidental whitespace/newlines
        });

        if (authError || !authData.session) {
            throw new Error(`Login failed: ${authError?.message}`);
        }

        console.log('   ✅ Logged in successfully');
        const token = authData.session.access_token;
        const user = authData.user;

        // 2. Get Organization
        console.log('\n📋 Step 2: Get Organization');
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            throw new Error(`Could not get profile: ${profileError?.message}`);
        }

        const orgId = profile.organization_id;
        console.log(`   ✅ Organization ID: ${orgId}`);

        // 3. Check Risks
        console.log('\n📋 Step 3: Checking Active Risks');
        const { data: risks, error: risksError } = await supabase
            .from('risks')
            .select('risk_code, risk_title')
            .eq('organization_id', orgId)
            .in('status', ['OPEN', 'MONITORING']);

        if (risksError) throw risksError;

        console.log(`   Found ${risks.length} active risks.`);
        if (risks.length === 0) {
            console.warn('   ⚠️  No active risks found! AI needs active risks to match against.');
        }

        // 4. Create Test Event
        console.log('\n📋 Step 4: Creating Test Event');
        const testEvent = {
            organization_id: orgId,
            title: "Major Ransomware Attack Hits Financial Sector - Banks Scramble",
            summary: "A sophisticated ransomware group launched coordinated attacks on multiple financial institutions, encrypting critical systems. Security experts warn this could be a larger campaign targeting the banking sector.",
            source: "Security News Network",
            event_type: "threat",
            url: "https://example.com/test-alert",
            published_date: new Date().toISOString(),
            relevance_checked: false
        };

        const { data: eventData, error: eventError } = await supabase
            .from('external_events')
            .insert(testEvent)
            .select()
            .single();

        if (eventError) throw eventError;
        console.log(`   ✅ Created test event: ${eventData.id}`);

        // 5. Trigger Analysis
        console.log('\n📋 Step 5: Triggering AI Analysis (Edge Function)');
        console.log('   Calling analyze-intelligence...');

        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-intelligence', {
            body: { eventId: eventData.id, minConfidence: 70 }
        });

        if (analysisError) {
            console.error('   ❌ Function call error:', analysisError);
            // Continue to check alerts anyway, sometimes function errs but work creates
        } else {
            console.log('   ✅ Function returned:', analysisData);
        }

        // 6. Check for Alerts
        console.log('\n📋 Step 6: Checking for New Alerts');
        // Wait a moment for async processing if needed
        await new Promise(r => setTimeout(r, 2000));

        const { data: alerts, error: alertsError } = await supabase
            .from('risk_intelligence_alerts')
            .select('*')
            .eq('event_id', eventData.id);

        if (alertsError) throw alertsError;

        if (alerts && alerts.length > 0) {
            console.log(`   ✅ SUCCESS! Created ${alerts.length} alert(s).`);
            alerts.forEach(a => {
                console.log(`      - [${a.risk_code}] Confidence: ${a.confidence_score}%`);
            });
        } else {
            console.log('   ❌ No alerts created.');
            console.log('   Check Supabase Dashboard Logs for: verify AI prompt/response.');
        }

    } catch (err: any) {
        console.error('\n❌ Error:', err.message);
    } finally {
        rl.close();
        process.exit(0);
    }
}

main();
