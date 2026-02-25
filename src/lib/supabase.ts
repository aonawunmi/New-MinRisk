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
 * Clerk user ID — set by ClerkSupabaseProvider when Clerk session is available.
 * Used for explicit profile filtering (prevents LIMIT 1 from returning wrong profile
 * when RLS allows visibility to multiple profiles, e.g., super_admin sees all).
 */
let clerkUserId: string | null = null;

export function setClerkUserId(id: string | null) {
  clerkUserId = id;
}

export function getClerkUserId(): string | null {
  return clerkUserId;
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
    if (!getToken) return null;
    const token = await getToken();
    return token ?? null;
  },
  global: {
    headers: {
      'x-client-info': 'minrisk-app',
    },
  },
});
