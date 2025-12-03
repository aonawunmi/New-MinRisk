/**
 * List all users in the database
 * Usage: node list-users.js
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read environment variables from .env.development
const envContent = fs.readFileSync('.env.development', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listUsers() {
  console.log('📋 Listing all users in database...\n');

  // Get users from auth.users table (service role can access this)
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message);
    process.exit(1);
  }

  // Get profiles
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, role, full_name, organization_id, status');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError.message);
    process.exit(1);
  }

  // Combine auth users with profiles
  const users = authUsers.users.map(authUser => {
    const profile = profiles?.find(p => p.id === authUser.id);
    return {
      email: authUser.email,
      role: profile?.role || 'user',
      full_name: profile?.full_name || '(no name)',
      status: profile?.status || 'unknown',
      organization_id: profile?.organization_id
    };
  });

  if (!users || users.length === 0) {
    console.log('No users found in database');
    process.exit(0);
  }

  // Sort by role
  users.sort((a, b) => {
    const roleOrder = { super_admin: 0, primary_admin: 1, secondary_admin: 2, admin: 3, user: 4 };
    return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
  });

  console.log(`Found ${users.length} users:\n`);
  console.log('Role'.padEnd(20), 'Email'.padEnd(35), 'Name'.padEnd(25), 'Status');
  console.log('-'.repeat(95));

  users.forEach(user => {
    const roleIcon = user.role === 'super_admin' ? '👑' :
                     user.role.includes('admin') ? '⚙️' : '👤';
    console.log(
      `${roleIcon} ${user.role}`.padEnd(20),
      (user.email || 'no email').padEnd(35),
      (user.full_name || '(no name)').padEnd(25),
      user.status
    );
  });

  console.log('\n💡 To seed incidents, run:');
  console.log('   node seed-sample-incidents.js <email>');
  console.log('\n   Example: node seed-sample-incidents.js ' + (users[0]?.email || 'admin@example.com'));
}

listUsers().catch(console.error);
