import { supabase } from './supabase';
import { getCurrentUser } from './auth';
/**
 * Get the current user's profile
 *
 * Uses RLS policy - user can only see their own profile
 *
 * @returns Profile data or null if not found
 *
 * @example
 * const { data: profile, error } = await getCurrentUserProfile();
 * if (profile) {
 *   console.log('User role:', profile.role);
 *   console.log('Organization:', profile.organization_id);
 * }
 */
export async function getCurrentUserProfile() {
    try {
        // Get current authenticated user
        const user = await getCurrentUser();
        if (!user) {
            return {
                data: null,
                error: new Error('No authenticated user'),
            };
        }
        // Query user profile (RLS will ensure user can only see their own)
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (error) {
            console.error('Get profile error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        if (!data) {
            return {
                data: null,
                error: new Error('Profile not found'),
            };
        }
        return { data: data, error: null };
    }
    catch (err) {
        console.error('Unexpected get profile error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown profile error'),
        };
    }
}
/**
 * Update the current user's profile
 *
 * NOTE: Only updateable fields are allowed (full_name)
 * Role and status changes must be done via admin service
 *
 * @param updates - Fields to update
 * @returns Updated profile or error
 *
 * @example
 * const { data, error } = await updateProfile({
 *   full_name: 'Updated Name'
 * });
 */
export async function updateProfile(updates) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return {
                data: null,
                error: new Error('No authenticated user'),
            };
        }
        // Update profile (RLS will ensure user can only update their own)
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
            .eq('id', user.id)
            .select()
            .single();
        if (error) {
            console.error('Update profile error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        console.log('Profile updated successfully');
        return { data: data, error: null };
    }
    catch (err) {
        console.error('Unexpected update profile error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown update profile error'),
        };
    }
}
/**
 * Check if current user can access a specific organization
 *
 * @param organizationId - Organization ID to check
 * @returns true if user belongs to the organization, false otherwise
 *
 * @example
 * const canAccess = await canAccessOrganization('11111111-1111-1111-1111-111111111111');
 * if (canAccess) {
 *   // Load organization data
 * }
 */
export async function canAccessOrganization(organizationId) {
    try {
        const { data: profile } = await getCurrentUserProfile();
        if (!profile) {
            return false;
        }
        // Super admins can access all organizations
        if (profile.role === 'super_admin') {
            return true;
        }
        // Regular users can only access their own organization
        return profile.organization_id === organizationId;
    }
    catch (err) {
        console.error('Error checking organization access:', err);
        return false;
    }
}
/**
 * Check if current user has admin privileges
 *
 * @returns true if user is super_admin, primary_admin, or secondary_admin
 *
 * @example
 * const isAdmin = await isUserAdmin();
 * if (isAdmin) {
 *   // Show admin features
 * }
 */
export async function isUserAdmin() {
    try {
        const { data: profile } = await getCurrentUserProfile();
        if (!profile) {
            return false;
        }
        return ['super_admin', 'primary_admin', 'secondary_admin'].includes(profile.role);
    }
    catch (err) {
        console.error('Error checking admin status:', err);
        return false;
    }
}
/**
 * Check if current user is a super admin
 *
 * @returns true if user is super_admin
 *
 * @example
 * const isSuperAdmin = await isSuperAdmin();
 * if (isSuperAdmin) {
 *   // Show super admin features
 * }
 */
export async function isSuperAdmin() {
    try {
        const { data: profile } = await getCurrentUserProfile();
        if (!profile) {
            return false;
        }
        return profile.role === 'super_admin';
    }
    catch (err) {
        console.error('Error checking super admin status:', err);
        return false;
    }
}
/**
 * Check if current user's status is approved
 *
 * @returns true if user status is 'approved'
 *
 * @example
 * const isApproved = await isUserApproved();
 * if (!isApproved) {
 *   // Show "pending approval" message
 * }
 */
export async function isUserApproved() {
    try {
        const { data: profile } = await getCurrentUserProfile();
        if (!profile) {
            return false;
        }
        return profile.status === 'approved';
    }
    catch (err) {
        console.error('Error checking approval status:', err);
        return false;
    }
}
/**
 * Get user's organization ID
 *
 * @returns Organization ID or null
 *
 * @example
 * const orgId = await getUserOrganizationId();
 * if (orgId) {
 *   // Query organization-scoped data
 * }
 */
export async function getUserOrganizationId() {
    try {
        const { data: profile } = await getCurrentUserProfile();
        return profile?.organization_id || null;
    }
    catch (err) {
        console.error('Error getting organization ID:', err);
        return null;
    }
}
