import { supabase, getClerkUserId } from './supabase';

/**
 * Profile Management Service Layer — CLERK VERSION
 *
 * With Clerk Third-Party Auth, the Supabase client includes the Clerk JWT.
 * RLS policies on user_profiles use: clerk_id = auth.jwt()->>'sub'
 * So queries automatically return only the current user's data.
 *
 * No need for getCurrentUser() — RLS handles identity.
 */

export type UserRole = 'super_admin' | 'primary_admin' | 'secondary_admin' | 'user' | 'viewer';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface UserProfile {
  id: string;
  clerk_id: string | null;
  email: string | null;
  organization_id: string | null;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileResult<T = UserProfile> {
  data: T | null;
  error: Error | null;
}

/**
 * Get the current user's profile.
 * RLS ensures only the authenticated user's profile is returned.
 */
export async function getCurrentUserProfile(): Promise<ProfileResult> {
  try {
    const clerkId = getClerkUserId();
    let query = supabase
      .from('user_profiles')
      .select('*');

    // Explicit filter prevents LIMIT 1 from returning wrong profile
    // when RLS allows visibility to multiple profiles (e.g., super_admin sees all)
    if (clerkId) {
      query = query.eq('clerk_id', clerkId);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
      console.error('Get profile error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Profile not found') };
    }

    return { data: data as UserProfile, error: null };
  } catch (err) {
    console.error('Unexpected get profile error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown profile error'),
    };
  }
}

/**
 * Update the current user's profile.
 * RLS ensures user can only update their own profile.
 */
export async function updateProfile(updates: {
  full_name?: string;
}): Promise<ProfileResult> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as UserProfile, error: null };
  } catch (err) {
    console.error('Unexpected update profile error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown update profile error'),
    };
  }
}

/**
 * Check if current user can access a specific organization.
 */
export async function canAccessOrganization(
  organizationId: string
): Promise<boolean> {
  try {
    const { data: profile } = await getCurrentUserProfile();
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    return profile.organization_id === organizationId;
  } catch {
    return false;
  }
}

/**
 * Check if current user has admin privileges.
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const { data: profile } = await getCurrentUserProfile();
    if (!profile) return false;
    return ['super_admin', 'primary_admin', 'secondary_admin'].includes(profile.role);
  } catch {
    return false;
  }
}

/**
 * Check if current user is a super admin.
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const { data: profile } = await getCurrentUserProfile();
    if (!profile) return false;
    return profile.role === 'super_admin';
  } catch {
    return false;
  }
}

/**
 * Check if current user's status is approved.
 */
export async function isUserApproved(): Promise<boolean> {
  try {
    const { data: profile } = await getCurrentUserProfile();
    if (!profile) return false;
    return profile.status === 'approved';
  } catch {
    return false;
  }
}

/**
 * Get user's organization ID.
 */
export async function getUserOrganizationId(): Promise<string | null> {
  try {
    const { data: profile } = await getCurrentUserProfile();
    return profile?.organization_id || null;
  } catch {
    return null;
  }
}
