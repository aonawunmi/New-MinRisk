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
 * Clerk token getter — set by ClerkSupabaseProvider when Clerk session is available.
 * Returns the Clerk JWT that Supabase validates via Third-Party Auth.
 */
let getToken: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(fn: (() => Promise<string | null>) | null) {
  getToken = fn;
}

/**
 * Get the current Clerk JWT token (for Edge Function calls).
 */
export async function getClerkToken(): Promise<string | null> {
  return getToken ? await getToken() : null;
}

/**
 * Supabase client — Uses Clerk JWT via Third-Party Auth
 *
 * Security Model (Updated Feb 2026 — Clerk Migration):
 * - Clerk handles all authentication (sign-in, sign-up, sessions)
 * - Supabase validates Clerk JWT via JWKS endpoint
 * - auth.jwt()->>'sub' returns the Clerk user ID
 * - RLS policies use clerk_user_uuid() helper to map Clerk ID → UUID
 * - Admin operations still use Edge Functions (service role server-side)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    if (!getToken) {
      console.log('[supabase] accessToken: no token getter set');
      return null;
    }
    const token = await getToken();
    if (!token) {
      console.warn('[supabase] accessToken: getter returned null');
    }
    return token ?? null;
  },
  global: {
    headers: {
      'x-client-info': 'minrisk-app',
    },
  },
});
