import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

// Validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars',
    { url: supabaseUrl, keyLen: supabaseAnonKey?.length ?? 0 });
}

/**
 * Supabase client - Uses RLS policies for security
 *
 * Security Model (Updated Dec 2025):
 * - All queries go through Row-Level Security (RLS) policies
 * - Admin operations now handled via secure Edge Functions
 * - Service role key NEVER exposed to browser
 *
 * Use this for ALL operations:
 * - Reading user data (filtered by RLS)
 * - Creating/updating resources (validated by RLS)
 * - Calling Edge Functions (admin operations verified server-side)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'minrisk-auth', // Unique key to avoid conflicts
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'minrisk-app',
    },
  },
});

/**
 * ❌ REMOVED: supabaseAdmin client (Security Hardening - Dec 2025)
 *
 * Previously exposed service role key to browser - CRITICAL SECURITY RISK
 *
 * Admin operations now use Edge Functions:
 * - admin-list-users: List users in organization
 * - admin-manage-user: Approve/reject/role changes
 * - admin-invite-user: Create user invitations
 *
 * See src/lib/admin.ts for updated API
 */
