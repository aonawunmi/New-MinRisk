import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase } from './supabase';
import { useSupabaseReady } from './clerk-supabase';

/**
 * Authentication Service Layer — CLERK VERSION
 *
 * Clerk handles all authentication (sign-in, sign-up, sign-out, password reset).
 * This module provides:
 *   - useAuth() hook: Combines Clerk user state with Supabase user_profiles
 *   - getAuthenticatedProfile(): Shared helper for lib files
 *   - getCurrentOrgId() / getCurrentProfileId(): Convenience functions
 *
 * Functions REMOVED (now handled by Clerk):
 *   - signIn, signUp, signOut
 *   - resetPassword, updatePassword
 *   - getSession, getCurrentUser, onAuthStateChange
 */

/**
 * Get the current user's profile from Supabase.
 * With Clerk JWT + Third-Party Auth, RLS ensures only the
 * authenticated user's profile is returned.
 *
 * Used by lib files that need user context (risks.ts, incidents.ts, etc.)
 */
export async function getAuthenticatedProfile(): Promise<{
  id: string;
  organization_id: string | null;
  role: string;
  status: string;
  email: string | null;
  full_name: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, organization_id, role, status, email, full_name')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getAuthenticatedProfile error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Unexpected getAuthenticatedProfile error:', err);
    return null;
  }
}

/**
 * Get current user's organization ID
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const profile = await getAuthenticatedProfile();
  return profile?.organization_id || null;
}

/**
 * Get current user's profile ID (UUID)
 */
export async function getCurrentProfileId(): Promise<string | null> {
  const profile = await getAuthenticatedProfile();
  return profile?.id || null;
}

/**
 * React hook for accessing authentication state.
 * Combines Clerk user data with Supabase user_profiles.
 *
 * Returns:
 *   - user: Clerk user object (id, email)
 *   - profile: Supabase user_profiles row (role, status, org, etc.)
 *   - loading: true until both Clerk and profile are resolved
 *
 * SECURITY: Users with status !== 'approved' get a null profile,
 * which triggers the pending/denied screen in App.tsx.
 */
export function useAuth() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isSignedIn } = useClerkAuth();
  const supabaseReady = useSupabaseReady();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<'loading' | 'found' | 'no_profile' | 'pending'>('loading');
  const claimRetryCount = useRef(0);

  const loadProfile = useCallback(async () => {
    // Unauthenticated users — show sign-in screen
    if (!isSignedIn || !clerkUser) {
      setProfile(null);
      setProfileStatus('no_profile');
      setLoading(false);
      return;
    }

    // Wait for Clerk JWT to be wired into Supabase.
    // The return value's loading check includes (isSignedIn && !supabaseReady),
    // so the UI shows "Loading..." during this wait — NOT "Account Not Found".
    if (!supabaseReady) return;

    try {
      console.log('[useAuth] Loading profile for:', clerkUser.primaryEmailAddress?.emailAddress);

      // RLS on user_profiles: clerk_id = auth.jwt()->>'sub'
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useAuth] Profile query error:', error.message);
        // Don't return — still try the claim below
      }

      // Profile found by RLS (clerk_id already linked)
      if (data) {
        if (data.status !== 'approved') {
          console.warn(`[useAuth] User status is '${data.status}' — access restricted`);
          setProfile(null);
          setProfileStatus('pending');
          setLoading(false);
          return;
        }
        setProfile(data);
        setProfileStatus('found');
        setLoading(false);
        return;
      }

      // No profile found — try auto-claiming a pending invitation by email
      const email = clerkUser.primaryEmailAddress?.emailAddress;
      if (!email) {
        console.error('[useAuth] No email on Clerk user — cannot claim');
        setProfile(null);
        setProfileStatus('no_profile');
        setLoading(false);
        return;
      }

      console.log('[useAuth] No profile for clerk_id, claiming invitation for:', email);

      const { data: claimResult, error: claimError } = await supabase
        .rpc('claim_profile_by_email', { p_email: email });

      console.log('[useAuth] Claim result:', JSON.stringify({ claimResult, claimError }));

      // RPC transport error
      if (claimError) {
        console.error('[useAuth] Claim RPC error:', JSON.stringify(claimError));
        setProfile(null);
        setProfileStatus('no_profile');
        setLoading(false);
        return;
      }

      // Function returned "Not authenticated" (auth.jwt() was null in DB)
      // This can happen right after sign-up before the JWT fully propagates
      if (claimResult?.error === 'Not authenticated') {
        if (claimRetryCount.current < 3) {
          claimRetryCount.current += 1;
          console.log(`[useAuth] JWT not ready, retrying in 1.5s (${claimRetryCount.current}/3)...`);
          setTimeout(() => loadProfile(), 1500);
          return; // NO setLoading(false) — keep "Loading..." visible
        }
        console.error('[useAuth] Claim failed after 3 retries — JWT not available');
        setProfile(null);
        setProfileStatus('no_profile');
        setLoading(false);
        return;
      }

      // Claim succeeded
      if (claimResult?.claimed) {
        console.log('[useAuth] Claim successful! Reloading profile...');
        claimRetryCount.current = 0;
        // Re-query — clerk_id is now linked, RLS will match
        const { data: claimedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (claimedProfile && claimedProfile.status === 'approved') {
          setProfile(claimedProfile);
          setProfileStatus('found');
          setLoading(false);
          return;
        }
        console.warn('[useAuth] Claimed but re-query failed or status not approved');
      } else if (claimResult?.reason) {
        console.log('[useAuth] Claim declined:', claimResult.reason);
      }

      // No profile could be found or claimed
      setProfile(null);
      setProfileStatus('no_profile');
      setLoading(false);
    } catch (err) {
      console.error('[useAuth] Unexpected error:', err);
      setProfile(null);
      setProfileStatus('no_profile');
      setLoading(false);
    }
    // NOTE: No finally{setLoading(false)} — retry paths deliberately skip it
  }, [clerkUser, isSignedIn, supabaseReady]);

  useEffect(() => {
    claimRetryCount.current = 0;
    loadProfile();
  }, [loadProfile]);

  return {
    user: clerkUser ? {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
    } : null,
    profile,
    profileStatus,
    // CRITICAL: When signed in but Supabase JWT not wired yet, stay in loading state.
    // Without this, a stale loading=false from the initial !isSignedIn render causes
    // "Account Not Found" to flash before the profile query/claim ever runs.
    loading: !clerkLoaded || loading || (!!isSignedIn && !supabaseReady),
  };
}
