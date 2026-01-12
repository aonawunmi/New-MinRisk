
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking Distinct Divisions in Risks Table...');
    const { data: riskDivisions, error: riskError } = await supabase
        .from('risks')
        .select('division');

    if (riskError) {
        console.error('Error fetching risks:', riskError);
    } else {
        // Unique divisions using Set
        const unique = [...new Set(riskDivisions.map(r => r.division))];
        console.log('Distinct Divisions in Risks:', unique);
    }

    console.log('\nChecking Divisions Table...');
    const { data: divisions, error: divError } = await supabase
        .from('divisions')
        .select('id, name');

    if (divError) {
        console.error('Error fetching divisions:', divError);
    } else {
        console.log('Divisions Table:', divisions);
    }
}

check();
