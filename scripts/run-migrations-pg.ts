/**
 * Run Database Migrations using PostgreSQL Direct Connection
 *
 * This script connects directly to the Supabase PostgreSQL database
 * and executes all migration files in sequence.
 *
 * Usage: SUPABASE_DB_PASSWORD=your_password npm run migrate:pg
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection details
const SUPABASE_HOST = 'aws-0-us-east-1.pooler.supabase.com';
const SUPABASE_PORT = 5432;
const SUPABASE_DATABASE = 'postgres';
const SUPABASE_USER = 'postgres.qrxwgjjgaekalvaqzpuf';
const SUPABASE_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_PASSWORD) {
  console.error('\n❌ Error: SUPABASE_DB_PASSWORD environment variable not set');
  console.error('\nPlease run with:');
  console.error('  SUPABASE_DB_PASSWORD=your_password npm run migrate:pg\n');
  console.error('Get your password from:');
  console.error('  Supabase Dashboard → Settings → Database → Connection string\n');
  process.exit(1);
}

// Migration files in order
const MIGRATIONS = [
  'create-kri-tables.sql',
  'create-risk-intelligence-tables.sql',
  'create-incidents-tables.sql'
];

/**
 * Execute a single migration file
 */
async function runMigration(client: pg.Client, filename: string): Promise<void> {
  const filePath = path.join(__dirname, '..', 'database', filename);

  console.log(`\n📄 Running: ${filename}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');

  try {
    await client.query(sql);
    console.log(`   ✅ Completed: ${filename}`);
  } catch (error: any) {
    // Check if it's a benign error
    if (
      error.message.includes('already exists') ||
      error.message.includes('duplicate')
    ) {
      console.log(`   ⚠️  Warning: Some objects already exist (skipped)`);
    } else {
      throw error;
    }
  }
}

/**
 * Verify tables were created
 */
async function verifyTables(client: pg.Client): Promise<void> {
  console.log('\n📊 Verifying table creation...\n');

  const query = `
    SELECT table_name,
           CASE
             WHEN table_name LIKE 'kri%' THEN 'KRI Monitoring'
             WHEN table_name LIKE '%event%' OR table_name LIKE '%intelligence%' THEN 'Risk Intelligence'
             WHEN table_name IN ('incidents', 'control_enhancement_plans') THEN 'Incident Management'
           END as module
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND (
      table_name LIKE 'kri%'
      OR table_name LIKE '%event%'
      OR table_name LIKE '%intelligence%'
      OR table_name IN ('incidents', 'control_enhancement_plans')
    )
    ORDER BY module, table_name;
  `;

  const result = await client.query(query);

  if (result.rows.length === 0) {
    console.warn('⚠️  No tables found! Migration may have failed.');
    return;
  }

  console.log(`✅ Found ${result.rows.length} tables:\n`);

  let currentModule = '';
  result.rows.forEach((row: any) => {
    if (row.module !== currentModule) {
      currentModule = row.module;
      console.log(`\n${currentModule}:`);
    }
    console.log(`   - ${row.table_name}`);
  });

  console.log('');
}

/**
 * Check RLS status
 */
async function verifyRLS(client: pg.Client): Promise<void> {
  console.log('\n🔒 Verifying Row-Level Security...\n');

  const query = `
    SELECT tablename, rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    AND (
      tablename LIKE 'kri%'
      OR tablename LIKE '%event%'
      OR tablename LIKE '%intelligence%'
      OR tablename IN ('incidents', 'control_enhancement_plans')
    )
    ORDER BY tablename;
  `;

  const result = await client.query(query);

  const allEnabled = result.rows.every((row: any) => row.rls_enabled);

  if (allEnabled) {
    console.log(`✅ RLS enabled on all ${result.rows.length} tables\n`);
  } else {
    console.warn('⚠️  Some tables do not have RLS enabled:\n');
    result.rows
      .filter((row: any) => !row.rls_enabled)
      .forEach((row: any) => console.log(`   - ${row.tablename}`));
    console.log('');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n=========================================');
  console.log('MinRisk Phase 2 & 3 Database Migrations');
  console.log('=========================================\n');

  const client = new Client({
    host: SUPABASE_HOST,
    port: SUPABASE_PORT,
    database: SUPABASE_DATABASE,
    user: SUPABASE_USER,
    password: SUPABASE_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    console.log(`📦 Running ${MIGRATIONS.length} migrations...\n`);

    for (const migration of MIGRATIONS) {
      await runMigration(client, migration);
    }

    console.log('\n=========================================');
    console.log('✅ All migrations completed!');
    console.log('=========================================');

    // Verify
    await verifyTables(client);
    await verifyRLS(client);

    console.log('✅ Migration complete! You can now use:');
    console.log('   - KRI Monitoring features');
    console.log('   - Risk Intelligence features');
    console.log('   - Incident Management features\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed\n');
  }
}

// Run migrations
main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
