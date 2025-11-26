/**
 * Run Database Migrations Script
 *
 * Executes all Phase 2 & 3 database migrations on Supabase
 * Uses the service role key to bypass RLS and create tables
 *
 * Usage: npm run migrate
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qrxwgjjgaekalvaqzpuf.supabase.co';
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration files to run in order
const MIGRATIONS = [
  'create-kri-tables.sql',
  'create-risk-intelligence-tables.sql',
  'create-incidents-tables.sql'
];

/**
 * Execute SQL migration file
 */
async function runMigration(filename: string): Promise<void> {
  const filePath = path.join(__dirname, '..', 'database', filename);

  console.log(`\n📄 Reading: ${filename}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');

  // Remove comments and split into individual statements
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('/*') && stmt !== 'END');

  console.log(`   Found ${statements.length} SQL statements`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and empty lines
    if (statement.startsWith('/*') || statement.trim().length === 0) {
      continue;
    }

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // Check if error is benign (table already exists, etc.)
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key')
        ) {
          console.log(`   ⚠️  Skipped (already exists): Statement ${i + 1}`);
        } else {
          console.error(`\n❌ Error in statement ${i + 1}:`);
          console.error(statement.substring(0, 100) + '...');
          console.error('Error:', error.message);
          throw error;
        }
      } else {
        if ((i + 1) % 10 === 0) {
          console.log(`   ✅ Executed ${i + 1}/${statements.length} statements`);
        }
      }
    } catch (err: any) {
      console.error(`\n❌ Fatal error in statement ${i + 1}:`);
      console.error('Statement:', statement.substring(0, 200));
      console.error('Error:', err.message || err);
      throw err;
    }
  }

  console.log(`   ✅ Completed: ${filename}`);
}

/**
 * Alternative: Execute entire SQL file as one command
 */
async function runMigrationAsSingleQuery(filename: string): Promise<void> {
  const filePath = path.join(__dirname, '..', 'database', filename);

  console.log(`\n📄 Running: ${filename}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');

  try {
    // Use Supabase's SQL execution endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    console.log(`   ✅ Successfully executed: ${filename}`);
  } catch (err: any) {
    console.error(`\n❌ Error executing ${filename}:`, err.message);
    throw err;
  }
}

/**
 * Main migration runner
 */
async function main() {
  console.log('=========================================');
  console.log('MinRisk Phase 2 & 3 Database Migrations');
  console.log('=========================================');
  console.log(`\n🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📦 Migrations to run: ${MIGRATIONS.length}\n`);

  for (const migration of MIGRATIONS) {
    try {
      await runMigrationAsSingleQuery(migration);
    } catch (error) {
      console.error(`\n❌ Migration failed: ${migration}`);
      console.error('Stopping execution.');
      process.exit(1);
    }
  }

  console.log('\n=========================================');
  console.log('✅ All migrations completed successfully!');
  console.log('=========================================\n');

  // Verify tables were created
  console.log('Verifying table creation...\n');

  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .or('table_name.like.kri%,table_name.like.%event%,table_name.like.%intelligence%,table_name.in.(incidents,control_enhancement_plans)');

  if (error) {
    console.warn('⚠️  Could not verify tables (this is okay if tables exist)');
  } else if (tables) {
    console.log(`✅ Found ${tables.length} tables`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));
  }

  console.log('\n✅ Migration complete! You can now use:');
  console.log('   - KRI Monitoring features');
  console.log('   - Risk Intelligence features');
  console.log('   - Incident Management features\n');
}

// Run migrations
main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
