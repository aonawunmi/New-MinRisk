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
/**
 * Invoke a Supabase Edge Function with proper Clerk auth.
 *
 * supabase.functions.invoke() doesn't work with Clerk Third-Party Auth because
 * the SDK's accessToken config sends the Clerk JWT as Authorization header,
 * but the Edge Function gateway expects the anon key there.
 *
 * This helper uses raw fetch() with dual headers:
 *   - Authorization + apikey: anon key (passes the Supabase gateway)
 *   - x-clerk-token: Clerk JWT (used by Edge Function's verifyClerkAuth())
 */
export async function invokeEdgeFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ data: any; error: any }> {
  try {
    const token = await getClerkToken();
    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        ...(token ? { 'x-clerk-token': token } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      return { data: null, error: new Error(errorData.error || errorData.message || `HTTP ${response.status}`) };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

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
