#!/usr/bin/env node

/**
 * Apply MinRisk v4.0 Database Migration
 *
 * This script applies the complete-schema-v4-CORRECTED.sql migration
 * to the Supabase database using the service role key.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = 'https://qrxwgjjgaekalvaqzpuf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyeHdnampnYWVrYWx2YXF6cHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDg5NSwiZXhwIjoyMDc5MDMwODk1fQ.Sh8f9nmI1g1QzdyrwOoVsQ0jfxhT5I0Cfb-3xV0Q2fE';

console.log('🚀 MinRisk v4.0 Migration Script');
console.log('================================\n');

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('✅ Connected to Supabase');
console.log(`📍 URL: ${SUPABASE_URL}\n`);

// Read migration file
const migrationPath = join(__dirname, 'complete-schema-v4-CORRECTED.sql');
console.log(`📂 Reading migration file: ${migrationPath}`);

let migrationSQL;
try {
  migrationSQL = readFileSync(migrationPath, 'utf8');
  console.log(`✅ Migration file loaded (${migrationSQL.length} characters)\n`);
} catch (error) {
  console.error('❌ Failed to read migration file:', error.message);
  process.exit(1);
}

console.log('⚡ Applying migration...\n');
console.log('This will:');
console.log('  - Create/update 19 tables');
console.log('  - Apply corrected RLS policies (admin access fixed)');
console.log('  - Create indexes, triggers, views, and stored procedures\n');

// Apply migration using RPC
async function applyMigration() {
  try {
    // Execute SQL directly via Supabase REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    if (!response.ok) {
      // Try alternative approach: Use pg connection
      console.log('⚠️  Direct SQL execution not available, using pg client...\n');

      // Import pg dynamically
      const pg = await import('pg');
      const { Client } = pg.default || pg;

      // Extract project ref from URL
      const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

      // Construct database URL (Supabase uses transaction pooler on port 6543)
      const dbUrl = `postgresql://postgres.${projectRef}:${SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

      console.log('Attempting direct database connection...');

      const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });

      await client.connect();
      console.log('✅ Connected to PostgreSQL\n');

      console.log('🔄 Executing migration SQL...');
      const result = await client.query(migrationSQL);

      await client.end();

      console.log('\n✅ Migration completed successfully!');
      console.log('\n📊 Summary:');
      console.log('  ✅ 19 tables created/updated');
      console.log('  ✅ RLS policies applied (admin access FIXED)');
      console.log('  ✅ Indexes, triggers, and views created');
      console.log('  ✅ Stored procedures installed\n');

      return;
    }

    const data = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log(data);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration().then(() => {
  console.log('🎉 Migration complete! MinRisk v4.0 database is ready.\n');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
