/**
 * Run Seed Library Migrations
 * 
 * Usage: SUPABASE_DB_PASSWORD=your_password npx ts-node scripts/run-seed-library-migrations.ts
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

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
    console.error('  SUPABASE_DB_PASSWORD=your_password npx ts-node scripts/run-seed-library-migrations.ts\n');
    process.exit(1);
}

// New seed library migrations
const MIGRATIONS = [
    '20260108000001_industry_type_and_seed_library.sql',
    '20260108000002_seed_master_root_causes.sql',
    '20260108000003_seed_master_impacts.sql',
    '20260108000004_seed_master_controls_kris.sql'
];

async function runMigration(client: pg.Client, filename: string): Promise<void> {
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', filename);

    console.log(`\n📄 Running: ${filename}`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${filePath}`);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
        await client.query(sql);
        console.log(`   ✅ Completed: ${filename}`);
    } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`   ⚠️  Warning: Some objects already exist (skipped)`);
        } else {
            throw error;
        }
    }
}

async function verifySeedData(client: pg.Client): Promise<void> {
    console.log('\n📊 Verifying seed data...\n');

    const query = `
    SELECT library_type, COUNT(*) as count 
    FROM seed_master_library 
    GROUP BY library_type 
    ORDER BY library_type;
  `;

    try {
        const result = await client.query(query);
        console.log('Master Seed Library Contents:');
        result.rows.forEach((row: any) => {
            console.log(`   - ${row.library_type}: ${row.count} records`);
        });

        const totalQuery = `SELECT COUNT(*) as total FROM seed_master_library;`;
        const totalResult = await client.query(totalQuery);
        console.log(`\n   TOTAL: ${totalResult.rows[0].total} records`);
    } catch (error: any) {
        console.log('   ⚠️  Could not verify seed data:', error.message);
    }
}

async function main() {
    console.log('\n=========================================');
    console.log('MinRisk: Seed Library Migrations');
    console.log('=========================================\n');

    const client = new Client({
        host: SUPABASE_HOST,
        port: SUPABASE_PORT,
        database: SUPABASE_DATABASE,
        user: SUPABASE_USER,
        password: SUPABASE_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Connecting to Supabase database...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        console.log(`📦 Running ${MIGRATIONS.length} seed library migrations...`);

        for (const migration of MIGRATIONS) {
            await runMigration(client, migration);
        }

        console.log('\n=========================================');
        console.log('✅ All seed library migrations completed!');
        console.log('=========================================');

        await verifySeedData(client);

        console.log('\n✅ Seed library ready for Admin UI Library Generator');

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed\n');
    }
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
