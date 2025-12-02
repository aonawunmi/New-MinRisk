/**
 * Supabase Client for Node.js Tests
 * Uses process.env instead of import.meta.env
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.development' });

const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase credentials in .env.development');
  console.error('Required:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
