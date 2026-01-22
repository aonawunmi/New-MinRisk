import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let SUPABASE_URL = process.env.VITE_SUPABASE_URL;
let SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Load env
const envFiles = ['.env.local', '.env.development', '.env'];
for (const file of envFiles) {
    if (SERVICE_ROLE_KEY && SUPABASE_URL) break;
    const envPath = path.join(__dirname, '..', file);
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
                if (key === 'VITE_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
                if (key === 'VITE_SUPABASE_SERVICE_ROLE_KEY' && !SERVICE_ROLE_KEY) SERVICE_ROLE_KEY = value;
            }
        });
    }
}
SUPABASE_URL = SUPABASE_URL || 'https://qrxwgjjgaekalvaqzpuf.supabase.co';

if (!SERVICE_ROLE_KEY) { process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function fixPermissions() {
    console.log('Applying permissions...');
    const setupSql = `
        GRANT SELECT ON tolerance_limits TO authenticated, service_role;
        GRANT SELECT ON appetite_kri_thresholds TO authenticated, service_role;
        GRANT SELECT ON tolerance_kri_coverage TO authenticated, service_role;
        GRANT EXTENSION ON tolerance_risk_signals TO authenticated, service_role; -- typo fix logic
        GRANT ALL ON tolerance_risk_signals TO authenticated, service_role;
        NOTIFY pgrst, 'reload schema';
    `;

    // We can't run multiple statements easily via rpc exec_sql sometimes if parsing is strict, but let's try.
    // Actually, splitting is safer.
    const statements = [
        "GRANT SELECT ON tolerance_limits TO authenticated, service_role",
        "GRANT SELECT ON appetite_kri_thresholds TO authenticated, service_role",
        "GRANT SELECT ON tolerance_kri_coverage TO authenticated, service_role",
        "GRANT ALL ON tolerance_risk_signals TO authenticated, service_role",
        "NOTIFY pgrst, 'reload schema'"
    ];

    for (const sql of statements) {
        const { error } = await supabase.rpc('exec_sql', { sql: sql + ';' });
        if (error && !error.message.includes('already exists')) console.warn('Warning:', error.message);
    }
    console.log('Permissions applied.');
}

fixPermissions();
