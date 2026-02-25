import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase, getClerkUserId } from './supabase';
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
    const clerkId = getClerkUserId();
    let query = supabase
      .from('user_profiles')
      .select('id, organization_id, role, status, email, full_name');

    // Explicit filter prevents LIMIT 1 from returning wrong profile
    // when RLS allows visibility to multiple profiles (e.g., super_admin sees all)
    if (clerkId) {
      query = query.eq('clerk_id', clerkId);
    }

    const { data, error } = await query.limit(1).maybeSingle();

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
  const supabaseReady = useSupabaseReady();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<'loading' | 'found' | 'no_profile' | 'pending'>('loading');
  const claimRetryCount = useRef(0);

  const loadProfile = useCallback(async () => {
    if (!clerkUser) {
      setProfile(null);
      setProfileStatus('no_profile');
      setLoading(false);
      return;
    }

    // Wait for Clerk JWT to be wired into Supabase.
    // The loading return includes (clerkUser && !supabaseReady) so UI shows "Loading...".
    if (!supabaseReady) return;

    setLoading(true);
    try {
      // Explicit clerk_id filter ensures we get OUR profile, not another user's.
      // Without this, super_admin RLS visibility + LIMIT 1 could return wrong row.
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('clerk_id', clerkUser.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Profile query error:', error.message);
      }

      // Profile found by RLS (clerk_id already linked)
      if (data) {
        if (data.status !== 'approved') {
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
        setProfile(null);
        setProfileStatus('no_profile');
        setLoading(false);
        return;
      }

      const { data: claimResult, error: claimError } = await supabase
        .rpc('claim_profile_by_email', { p_email: email });

      if (claimError) {
        console.error('claim_profile_by_email error:', claimError.message);
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
          setTimeout(() => loadProfile(), 1500);
          return;
        }
        setProfile(null);
        setProfileStatus('no_profile');
        setLoading(false);
        return;
      }

      // Claim succeeded
      if (claimResult?.claimed) {
        claimRetryCount.current = 0;
        // Re-query with explicit clerk_id — now linked after claim
        const { data: claimedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('clerk_id', clerkUser.id)
          .limit(1)
          .maybeSingle();

        if (claimedProfile && claimedProfile.status === 'approved') {
          setProfile(claimedProfile);
          setProfileStatus('found');
          setLoading(false);
          return;
        }
      } else if (claimResult?.reason) {
        console.log('Claim declined:', claimResult.reason);
      }

      // No profile could be found or claimed
      setProfile(null);
      setProfileStatus('no_profile');
      setLoading(false);
    } catch (err) {
      console.error('Unexpected profile load error:', err);
      setProfile(null);
      setProfileStatus('no_profile');
      setLoading(false);
    }
    // NOTE: No finally{setLoading(false)} — retry paths deliberately skip it
  }, [clerkUser, supabaseReady]);

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
    // CRITICAL: When user exists but Supabase JWT not wired yet, stay in loading state.
    // Without this, a stale loading=false causes "Account Not Found" to flash
    // before the profile query/claim ever runs.
    loading: !clerkLoaded || loading || (!!clerkUser && !supabaseReady),
  };
}
