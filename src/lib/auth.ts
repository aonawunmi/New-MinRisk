import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase, getClerkToken } from './supabase';
import { useClerkSupabaseReady } from './clerk-supabase';

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
  const { tokenReady } = useClerkSupabaseReady();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<'loading' | 'found' | 'no_profile' | 'pending'>('loading');

  const loadProfile = useCallback(async () => {
    if (!isSignedIn || !clerkUser) {
      setProfile(null);
      setProfileStatus('no_profile');
      setLoading(false);
      return;
    }

    // Verify we actually have a Clerk token before querying Supabase.
    // Without this, queries run as anonymous and silently return no results.
    const token = await getClerkToken();
    if (!token) {
      console.warn('useAuth: Clerk token not available, skipping profile load');
      return; // Don't set loading=false — we'll retry when tokenReady changes
    }

    console.log('useAuth: Loading profile for Clerk user:', clerkUser.id);

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
          console.log('Clerk user ID:', clerkUser.id);

          const { data: claimResult, error: claimError } = await supabase
            .rpc('claim_profile_by_email', { p_email: email });

          if (claimError) {
            console.error('claim_profile_by_email RPC error:', {
              message: claimError.message,
              code: claimError.code,
              details: claimError.details,
              hint: claimError.hint,
            });
          }

          if (!claimError && claimResult?.claimed) {
            console.log('Successfully claimed invitation, reloading profile...');
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
          } else if (claimResult && !claimResult.claimed) {
            console.log('Claim not successful:', claimResult.reason);
          } else if (claimResult?.error) {
            console.error('Claim function returned error:', claimResult.error);
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
  }, [clerkUser, isSignedIn]);

  // Only load profile when Clerk is loaded AND token bridge is ready.
  // This prevents the race condition where queries run before the
  // Clerk JWT is wired into the Supabase client.
  useEffect(() => {
    if (!clerkLoaded || !tokenReady) return;
    loadProfile();
  }, [clerkLoaded, tokenReady, loadProfile]);

  return {
    user: clerkUser ? {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
    } : null,
    profile,
    profileStatus,
    loading: !clerkLoaded || !tokenReady || loading,
  };
}
