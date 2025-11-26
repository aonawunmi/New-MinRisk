#!/usr/bin/env node

/**
 * Apply MinRisk v4.0 Complete Database Migration
 * Uses Supabase pooler connection with service role key
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://qrxwgjjgaekalvaqzpuf.supabase.co';
const PROJECT_REF = 'qrxwgjjgaekalvaqzpuf';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyeHdnampnYWVrYWx2YXF6cHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDg5NSwiZXhwIjoyMDc5MDMwODk1fQ.Sh8f9nmI1g1QzdyrwOoVsQ0jfxhT5I0Cfb-3xV0Q2fE';

console.log('\n🚀 MinRisk v4.0 - Complete Schema Migration');
console.log('===========================================\n');

// Read migration SQL
const migrationPath = join(__dirname, 'complete-schema-v4-CORRECTED.sql');
console.log(`📂 Loading migration file...`);

let migrationSQL;
try {
  migrationSQL = readFileSync(migrationPath, 'utf8');
  const sizeKB = Math.round(migrationSQL.length / 1024);
  console.log(`✅ Migration loaded (${sizeKB}KB)\n`);
} catch (error) {
  console.error('❌ Failed to read migration file:', error.message);
  process.exit(1);
}

console.log('📋 Migration includes:');
console.log('   • 19 tables (core, KRI, incidents, intelligence, VaR, audit)');
console.log('   • Corrected RLS policies (admin access FIXED)');
console.log('   • 30+ indexes for performance');
console.log('   • 8 triggers (auto-timestamps, audit, KRI alerts)');
console.log('   • 6 helper functions');
console.log('   • 2 database views');
console.log('   • 3 stored procedures\n');

// Construct connection string using service role key as password
const connectionString = `postgresql://postgres.${PROJECT_REF}:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

console.log(`🔌 Connecting to Supabase...`);
console.log(`   Project: ${PROJECT_REF}`);
console.log(`   Pooler:  aws-0-us-east-1\n`);

const client = new Client({
  host: `aws-0-us-east-1.pooler.supabase.com`,
  port: 6543,
  database: 'postgres',
  user: `postgres.${PROJECT_REF}`,
  password: SERVICE_ROLE_KEY,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function applyMigration() {
  try {
    console.log('⏳ Connecting...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    console.log('⚡ Executing migration SQL...');
    console.log('   (This may take 10-30 seconds)\n');

    const startTime = Date.now();
    await client.query(migrationSQL);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Migration executed successfully in ${duration}s\n`);

    await client.end();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Database Summary:');
    console.log('   ✅ 19 tables created/updated');
    console.log('   ✅ RLS policies applied (USER + ADMIN)');
    console.log('   ✅ Multi-tenancy enforced');
    console.log('   ✅ Admin can see all org data ← CRITICAL FIX');
    console.log('   ✅ Regular users see only their data');
    console.log('   ✅ Indexes, triggers, views installed');
    console.log('   ✅ Stored procedures ready\n');

    console.log('🚀 MinRisk v4.0 database is ready for development!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ MIGRATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('Error:', error.message);

    if (error.code) {
      console.error('Code:', error.code);
    }

    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Connection issue detected.');
      console.error('   The service role key might not work as password.');
      console.error('\n   To fix:');
      console.error('   1. Go to Supabase Dashboard → Settings → Database');
      console.error('   2. Copy the "Connection string" or "Database password"');
      console.error('   3. Update this script with the correct password\n');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.error('\n💡 Connection timeout.');
      console.error('   Check your internet connection and try again.\n');
    } else {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the migration
console.log('⏳ Starting migration...\n');
applyMigration();
