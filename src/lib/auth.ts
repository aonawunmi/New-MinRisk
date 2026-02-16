import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';

/**
 * Authentication Service Layer
 *
 * Handles all authentication operations using Supabase Auth.
 * All operations use RLS-protected regular client.
 */

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  organizationId: string;
  role?: 'user' | 'secondary_admin' | 'primary_admin';
}

export interface AuthResult<T = User> {
  data: T | null;
  error: AuthError | Error | null;
}

/**
 * Sign in with email and password
 *
 * SECURITY: Validates user status after authentication.
 * Only users with status='approved' can sign in.
 * Suspended, rejected, or pending users are immediately signed out.
 *
 * @param credentials - User email and password
 * @returns Auth result with user data or error
 *
 * @example
 * const { data, error } = await signIn({
 *   email: 'admin1@acme.com',
 *   password: 'Admin123!'
 * });
 */
export async function signIn(
  credentials: SignInCredentials
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email.trim(),
      password: credentials.password,
    });

    if (error) {
      console.error('Sign in error:', error.message);
      return { data: null, error };
    }

    if (!data.user) {
      return {
        data: null,
        error: new Error('Sign in failed - no user returned'),
      };
    }

    // ⚠️ SECURITY: Check user status in user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('status')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Failed to load user profile:', profileError.message);
      await supabase.auth.signOut();
      return {
        data: null,
        error: new Error('Account verification failed. Please contact support.'),
      };
    }

    // Block login for non-approved users
    if (profile.status !== 'approved') {
      console.warn(`Login blocked - user status: ${profile.status}`, data.user.email);
      await supabase.auth.signOut();

      let errorMessage: string;
      switch (profile.status) {
        case 'pending':
          errorMessage = 'Your account is pending approval. Please wait for an administrator to approve your access.';
          break;
        case 'suspended':
          errorMessage = 'Your account has been suspended. Please contact your administrator for assistance.';
          break;
        case 'rejected':
          errorMessage = 'Your account access has been denied. Please contact your administrator.';
          break;
        default:
          errorMessage = 'Account access is restricted. Please contact support.';
      }

      return {
        data: null,
        error: new Error(errorMessage),
      };
    }

    console.log('Sign in successful:', data.user.email);
    return { data: data.user, error: null };
  } catch (err) {
    console.error('Unexpected sign in error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown sign in error'),
    };
  }
}

/**
 * Sign up a new user
 *
 * NOTE: This creates the auth.users record. The user_profiles record
 * should be created via a database trigger or separately.
 *
 * @param signUpData - User registration data
 * @returns Auth result with user data or error
 *
 * @example
 * const { data, error } = await signUp({
 *   email: 'newuser@acme.com',
 *   password: 'SecurePass123!',
 *   fullName: 'New User',
 *   organizationId: '11111111-1111-1111-1111-111111111111',
 *   role: 'user'
 * });
 */
export async function signUp(signUpData: SignUpData): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: signUpData.email.trim(),
      password: signUpData.password,
      options: {
        data: {
          full_name: signUpData.fullName,
          organization_id: signUpData.organizationId,
          role: signUpData.role || 'user',
        },
      },
    });

    if (error) {
      console.error('Sign up error:', error.message);
      return { data: null, error };
    }

    if (!data.user) {
      return {
        data: null,
        error: new Error('Sign up failed - no user returned'),
      };
    }

    console.log('Sign up successful:', data.user.email);
    return { data: data.user, error: null };
  } catch (err) {
    console.error('Unexpected sign up error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown sign up error'),
    };
  }
}

/**
 * Sign out the current user
 *
 * @returns Auth result with success or error
 *
 * @example
 * const { error } = await signOut();
 * if (!error) {
 *   console.log('Signed out successfully');
 * }
 */
export async function signOut(): Promise<{ error: AuthError | Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      // "Auth session missing" means session is already gone — treat as success
      if (error.message?.includes('session missing') || error.message?.includes('Session not found')) {
        console.log('Session already expired, clearing local state');
        return { error: null };
      }
      console.error('Sign out error:', error.message);
      return { error };
    }

    console.log('Sign out successful');
    return { error: null };
  } catch (err) {
    console.error('Unexpected sign out error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown sign out error'),
    };
  }
}

/**
 * Get the current session
 *
 * @returns Session object or null if not authenticated
 *
 * @example
 * const session = await getSession();
 * if (session) {
 *   console.log('Logged in as:', session.user.email);
 * }
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Get session error:', error.message);
      return null;
    }

    return data.session;
  } catch (err) {
    console.error('Unexpected get session error:', err);
    return null;
  }
}

/**
 * Get the current user
 *
 * @returns User object or null if not authenticated
 *
 * @example
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log('Current user:', user.email);
 * }
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Get user error:', error.message);
      return null;
    }

    return data.user;
  } catch (err) {
    console.error('Unexpected get user error:', err);
    return null;
  }
}

/**
 * Subscribe to auth state changes
 *
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 *
 * @example
 * const unsubscribe = onAuthStateChange((event, session) => {
 *   if (event === 'SIGNED_IN') {
 *     console.log('User signed in:', session?.user.email);
 *   }
 *   if (event === 'SIGNED_OUT') {
 *     console.log('User signed out');
 *   }
 * });
 *
 * // Later, to unsubscribe:
 * unsubscribe();
 */
export function onAuthStateChange(
  callback: (
    event: string,
    session: Session | null
  ) => void | Promise<void>
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Reset password for a user (sends reset email)
 *
 * @param email - User's email address
 * @returns Result with success or error
 *
 * @example
 * const { error } = await resetPassword('user@acme.com');
 * if (!error) {
 *   console.log('Password reset email sent');
 * }
 */
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | Error | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    );

    if (error) {
      console.error('Reset password error:', error.message);
      return { error };
    }

    console.log('Password reset email sent to:', email);
    return { error: null };
  } catch (err) {
    console.error('Unexpected reset password error:', err);
    return {
      error:
        err instanceof Error ? err : new Error('Unknown reset password error'),
    };
  }
}

/**
 * Update user password
 *
 * NOTE: User must be authenticated to update their password
 *
 * @param newPassword - New password
 * @returns Result with success or error
 *
 * @example
 * const { error } = await updatePassword('NewSecurePass123!');
 * if (!error) {
 *   console.log('Password updated successfully');
 * }
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: AuthError | Error | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Update password error:', error.message);
      return { error };
    }

    console.log('Password updated successfully');
    return { error: null };
  } catch (err) {
    console.error('Unexpected update password error:', err);
    return {
      error:
        err instanceof Error ? err : new Error('Unknown update password error'),
    };
  }
}

/**
 * Get current user's organization ID
 *
 * @returns Organization ID or null if not found
 *
 * @example
 * const orgId = await getCurrentOrgId();
 * if (orgId) {
 *   console.log('Organization ID:', orgId);
 * }
 */
export async function getCurrentOrgId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Get organization ID error:', error.message);
      return null;
    }

    return data?.organization_id || null;
  } catch (err) {
    console.error('Unexpected get organization ID error:', err);
    return null;
  }
}

/**
 * Get current user's profile ID (same as user ID)
 *
 * @returns Profile ID or null if not authenticated
 *
 * @example
 * const profileId = await getCurrentProfileId();
 * if (profileId) {
 *   console.log('Profile ID:', profileId);
 * }
 */
export async function getCurrentProfileId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user?.id || null;
  } catch (err) {
    console.error('Unexpected get profile ID error:', err);
    return null;
  }
}


/**
 * React hook for accessing authentication state
 * Returns current user and their profile
 *
 * SECURITY: Automatically signs out users if their status is not 'approved'.
 * This protects against:
 * - Admin suspending a user while they're actively logged in
 * - Admin rejecting a pending user while they're logged in
 * - Any status changes that should revoke access
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // ⚠️ SECURITY: Auto-logout if user status is not approved
    if (data && data.status !== 'approved') {
      console.warn(`User status changed to '${data.status}' - logging out`, data.email);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setLoading(false);

      // Show user-friendly message
      let message: string;
      switch (data.status) {
        case 'suspended':
          message = 'Your account has been suspended. You have been logged out.';
          break;
        case 'rejected':
          message = 'Your account access has been revoked. You have been logged out.';
          break;
        case 'pending':
          message = 'Your account is pending approval. You have been logged out.';
          break;
        default:
          message = 'Your account access has changed. You have been logged out.';
      }
      alert(message); // Simple alert for now - can be improved with toast notifications
      return;
    }

    setProfile(data);
    setLoading(false);
  }

  return { user, profile, loading };
}

