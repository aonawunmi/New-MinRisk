import { createClient } from '@supabase/supabase-js';
// Environment variables
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const supabaseServiceRoleKey = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
// Validation
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase env vars', { url: supabaseUrl, keyLen: supabaseAnonKey?.length ?? 0 });
}
/**
 * Regular Supabase client - Uses RLS policies
 * Use this for all user-facing operations
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
 * Admin Supabase client - BYPASSES RLS policies
 * Use ONLY for admin operations like:
 * - Listing all users in an organization
 * - Approving/rejecting pending users
 * - Changing user roles
 * - Inviting users
 *
 * IMPORTANT: Never expose this client to the frontend!
 * Only use in controlled admin functions.
 */
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null;
// Warn if service role key is missing (needed for admin operations)
if (!supabaseServiceRoleKey) {
    console.warn('Service role key not found - admin operations will not work');
}
