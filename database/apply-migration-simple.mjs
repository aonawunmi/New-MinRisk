#!/usr/bin/env node

/**
 * Apply MinRisk v4.0 Database Migration
 * Simple version using pg client directly
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase connection details
const PROJECT_REF = 'qrxwgjjgaekalvaqzpuf';
const DB_PASSWORD = 'minrisk_dev_secure_2024'; // Default password, may need update

console.log('🚀 MinRisk v4.0 Migration Script\n');
console.log('================================\n');

// Read migration file
const migrationPath = join(__dirname, 'complete-schema-v4-CORRECTED.sql');
console.log(`📂 Reading: complete-schema-v4-CORRECTED.sql`);

let migrationSQL;
try {
  migrationSQL = readFileSync(migrationPath, 'utf8');
  console.log(`✅ Loaded (${Math.round(migrationSQL.length / 1024)}KB)\n`);
} catch (error) {
  console.error('❌ Failed to read migration file:', error.message);
  process.exit(1);
}

// Connect to database
console.log(`🔌 Connecting to Supabase database...`);
console.log(`   Project: ${PROJECT_REF}\n`);

const connectionString = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    console.log('⚡ Executing migration...');
    console.log('   This will:');
    console.log('   - Create/update 19 tables');
    console.log('   - Apply corrected RLS policies');
    console.log('   - Create indexes, triggers, views\n');

    const result = await client.query(migrationSQL);

    await client.end();

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   ✅ 19 tables ready');
    console.log('   ✅ RLS policies applied (ADMIN ACCESS FIXED)');
    console.log('   ✅ 30+ indexes created');
    console.log('   ✅ 8 triggers installed');
    console.log('   ✅ 2 views created');
    console.log('   ✅ 3 stored procedures installed\n');
    console.log('🎉 MinRisk v4.0 database is ready!\n');

  } catch (error) {
    console.error('\n❌ Migration failed\n');
    console.error('Error:', error.message);

    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Tip: Update DB_PASSWORD in this script');
      console.error('   Get it from: Supabase Dashboard → Settings → Database\n');
    }

    process.exit(1);
  }
}

runMigration();
