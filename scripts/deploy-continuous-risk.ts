
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // Explicitly load dotenv

// Load environment variables from .env.development
dotenv.config({ path: '.env.development' });

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL not found in environment');
  console.log('Current env:', process.env);
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const MIGRATION_FILE = '20250101_continuous_risk_architecture.sql';

async function runMigration() {
  const filePath = path.join(__dirname, '..', 'supabase', 'migrations', MIGRATION_FILE);

  console.log(`\n📄 Reading: ${MIGRATION_FILE}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`Evaluating sql length: ${sql.length}`);

  try {
     // Use Supabase's SQL execution endpoint via pg driver or rpc if available. 
     // The original script used rpc('exec_sql'). Let's see if that exists.
     // If not, we might need to use the pg connection string if we had one, but we only have the service role key.
     // So we hope `exec_sql` RPC exists.
    
    // Attempt to split by statement first, basic splitting
    const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

      // We will try to run as a single query first? No, existing script splits it. 
      // But `exec_sql` might be able to handle multiple statements with pg.
      // But let's try the single remote procedure call first.
      
    // Actually, `exec_sql` is arguably a custom function. If it's not there, we fail.
    // The previous script used it, so it must exist.

    const { error } = await supabase.rpc('exec_sql', { sql: sql });
    
    if (error) {
         console.error('RPC Error:', error);
         // If generic RPC fails, it might be due to size or permissions.
         // Let's rely on the previous script's pattern of statement splitting if needed.
         // But for now, let's try sending the whole thing.
         throw error;
    }

    console.log(`   ✅ Successfully executed: ${MIGRATION_FILE}`);

  } catch (err: any) {
    console.error(`\n❌ Error executing ${MIGRATION_FILE}:`, err.message);
    throw err;
  }
}

runMigration().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
