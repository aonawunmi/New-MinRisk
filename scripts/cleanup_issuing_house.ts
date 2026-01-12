
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log("Could not load .env.local, trying .env");
    dotenv.config();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. URL:', !!supabaseUrl, 'Key:', !!supabaseKey);
    console.log('Available Env Keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('Cleaning up "Issuing House" divisions...');

    // First count them
    const { count, error: countError } = await supabase
        .from('risks')
        .select('*', { count: 'exact', head: true })
        .eq('division', 'Issuing House');

    if (countError) {
        console.error('Error counting risks:', countError);
        return;
    }

    console.log(`Found ${count} risks with "Issuing House" division.`);

    if (count === 0) {
        console.log('No cleanup needed.');
        return;
    }

    // Update them to NULL (or empty string, but logic prefers NULL equivalent for consistency)
    // Analytics uses `risk.division || 'Unassigned'`, so null or '' both work.
    const { data, error } = await supabase
        .from('risks')
        .update({ division: '' }) // Set to empty string just to be safe if column is not nullable
        .eq('division', 'Issuing House')
        .select();

    if (error) {
        console.error('Error updating risks:', error);
    } else {
        console.log(`Successfully updated ${data.length} risks to have empty division.`);
    }
}

cleanup();
