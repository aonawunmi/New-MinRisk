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
    // Check auth state first — unauthenticated users should see the sign-in screen
    if (!isSignedIn || !clerkUser) {
      setProfile(null);
      setProfileStatus('no_profile');
      setLoading(false);
      return;
    }

    // For authenticated users, wait until the Clerk JWT is wired into Supabase
    if (!supabaseReady) return;

    try {
      // RLS on user_profiles: clerk_id = auth.jwt()->>'sub'
      // This returns only the current user's profile
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Load profile error:', error.message);
        setProfile(null);
        setProfileStatus('no_profile');
        setLoading(false);
        return;
      }

      // No profile found — try auto-claiming a pending invitation by email
      if (!data) {
        const email = clerkUser.primaryEmailAddress?.emailAddress;
        if (email) {
          console.log('No profile found for clerk_id, attempting to claim invitation for:', email);

          const { data: claimResult, error: claimError } = await supabase
            .rpc('claim_profile_by_email', { p_email: email });

          console.log('claim_profile_by_email result:', JSON.stringify({ claimResult, claimError }));

          if (claimError) {
            console.error('claim_profile_by_email RPC error:', JSON.stringify(claimError));
          }

          // Check for function-level auth error (auth.jwt() was null)
          // This can happen right after sign-up when the token isn't propagated yet
          if (!claimError && claimResult?.error === 'Not authenticated') {
            console.warn('Claim returned "Not authenticated" — JWT may not be ready yet');
            if (claimRetryCount.current < 3) {
              claimRetryCount.current += 1;
              console.log(`Retrying claim in 1.5s (attempt ${claimRetryCount.current}/3)...`);
              setTimeout(() => loadProfile(), 1500);
              return; // Don't set loading=false — keep showing Loading...
            }
            console.error('Claim failed after 3 retries — JWT not available');
          }

          if (!claimError && claimResult?.claimed) {
            console.log('Successfully claimed invitation, reloading profile...');
            claimRetryCount.current = 0;
            // Re-query the profile now that clerk_id is linked
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
          } else if (!claimError && claimResult && !claimResult.claimed && claimResult.reason) {
            console.log('Claim not successful:', claimResult.reason);
          }
        }

        setProfile(null);
        setProfileStatus('no_profile');
        setLoading(false);
        return;
      }

      // SECURITY: Only approved users get a profile
      if (data.status !== 'approved') {
        console.warn(`User status is '${data.status}' — access restricted`);
        setProfile(null);
        setProfileStatus('pending');
        setLoading(false);
        return;
      }

      setProfile(data);
      setProfileStatus('found');
    } catch (err) {
      console.error('Unexpected load profile error:', err);
      setProfile(null);
      setProfileStatus('no_profile');
    } finally {
      setLoading(false);
    }
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
    loading: !clerkLoaded || loading,
  };
}
