/**
 * Migration Runner for Blueprint v2
 *
 * Executes the migration-v2-blueprint.sql file against Supabase database
 * using the service role key for full admin access.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qrxwgjjgaekalvaqzpuf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyeHdnampnYWVrYWx2YXF6cHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDg5NSwiZXhwIjoyMDc5MDMwODk1fQ.Sh8f9nmI1g1QzdyrwOoVsQ0jfxhT5I0Cfb-3xV0Q2fE';

console.log('🚀 MinRisk Blueprint v2 Migration Runner\n');
console.log('Supabase URL:', SUPABASE_URL);
console.log('Using service role key:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...\n');

// Create Supabase client with service role (bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    // Read migration SQL file
    const sqlPath = join(__dirname, 'migration-v2-blueprint.sql');
    console.log('📄 Reading migration file:', sqlPath);
    const sql = readFileSync(sqlPath, 'utf8');
    console.log('✅ Migration file loaded (' + sql.length + ' bytes)\n');

    console.log('🔧 Executing migration...');
    console.log('⏳ This may take a moment...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error('❌ Migration failed:');
      console.error(error);
      console.error('\n');

      // Try direct SQL execution as fallback
      console.log('🔄 Attempting direct SQL execution...\n');

      // Split into individual statements and execute
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Found ${statements.length} SQL statements to execute\n`);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';

        // Skip comments and verification queries
        if (statement.startsWith('--') || statement.includes('POST-MIGRATION')) {
          continue;
        }

        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql_string: statement
          });

          if (stmtError) {
            console.error(`❌ Statement ${i + 1} failed:`, stmtError.message);
            errorCount++;
          } else {
            successCount++;
            if (i % 10 === 0) {
              console.log(`✅ Executed ${successCount} statements...`);
            }
          }
        } catch (err) {
          console.error(`❌ Statement ${i + 1} error:`, err.message);
          errorCount++;
        }
      }

      console.log('\n📊 Migration Summary:');
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${errorCount}`);

      if (errorCount > 0) {
        console.log('\n⚠️  Some statements failed. Please review errors above.');
        console.log('Note: Some errors may be expected (e.g., "already exists")');
      }

    } else {
      console.log('✅ Migration completed successfully!\n');
      console.log(data);
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...\n');
    await verifyMigration();

  } catch (error) {
    console.error('❌ Unexpected error during migration:');
    console.error(error);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('Checking role enum values...');
  const { data: roles, error: rolesError } = await supabase
    .rpc('get_enum_values', { enum_name: 'user_role' })
    .catch(() => ({ data: null, error: 'Function not found' }));

  if (roles) {
    console.log('✅ Roles:', roles);
  } else {
    console.log('⚠️  Could not verify roles');
  }

  console.log('\nChecking tables...');
  const tablesToCheck = ['user_profiles', 'organizations', 'risks', 'controls', 'invitations', 'risk_assessments', 'heatmap_config'];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: not found or error`);
    } else {
      console.log(`✅ ${table}: exists`);
    }
  }

  console.log('\n✅ Migration verification complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Check Supabase dashboard to verify changes');
  console.log('   2. Test login with admin1@acme.com');
  console.log('   3. Verify admin tab is visible');
  console.log('   4. Test creating a risk with ownership');
}

// Run migration
runMigration();
