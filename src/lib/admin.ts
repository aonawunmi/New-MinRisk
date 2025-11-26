import { supabaseAdmin } from './supabase';
import type { UserProfile, UserRole, UserStatus } from './profiles';

/**
 * Admin Service Layer
 *
 * CRITICAL: All operations use supabaseAdmin (service role key)
 * which BYPASSES RLS policies. Use ONLY for admin operations.
 *
 * Operations:
 * - List all users in an organization
 * - List pending users
 * - Approve/reject user requests
 * - Update user roles
 * - Suspend/unsuspend users
 * - Invite new users
 */

export interface AdminResult<T = any> {
  data: T | null;
  error: Error | null;
}

/**
 * List all users in an organization
 *
 * BYPASSES RLS - Only call this from admin UI after verifying admin privileges
 *
 * @param organizationId - Organization ID
 * @returns List of user profiles
 *
 * @example
 * const { data: users, error } = await listUsersInOrganization('11111111-...');
 * if (users) {
 *   users.forEach(user => console.log(user.full_name, user.role));
 * }
 */
export async function listUsersInOrganization(
  organizationId: string
): Promise<AdminResult<UserProfile[]>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List users error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as UserProfile[]) || [], error: null };
  } catch (err) {
    console.error('Unexpected list users error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown list users error'),
    };
  }
}

/**
 * List pending users in an organization
 *
 * BYPASSES RLS - Only call from admin UI
 *
 * @param organizationId - Organization ID
 * @returns List of pending user profiles
 *
 * @example
 * const { data: pendingUsers, error } = await listPendingUsers('11111111-...');
 * if (pendingUsers) {
 *   console.log(`${pendingUsers.length} users awaiting approval`);
 * }
 */
export async function listPendingUsers(
  organizationId: string
): Promise<AdminResult<UserProfile[]>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List pending users error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as UserProfile[]) || [], error: null };
  } catch (err) {
    console.error('Unexpected list pending users error:', err);
    return {
      data: null,
      error:
        err instanceof Error ? err : new Error('Unknown list pending users error'),
    };
  }
}

/**
 * Approve a pending user
 *
 * BYPASSES RLS - Only call from admin UI after verifying admin privileges
 *
 * @param userId - User ID to approve
 * @param approvedBy - Admin user ID performing the approval
 * @returns Updated user profile
 *
 * @example
 * const { data, error } = await approveUser(
 *   '86f49b40-0f26-4536-9949-e270ecdd0c1e',
 *   '66a3242e-f321-4159-bfd2-4d4def4c656f'
 * );
 */
export async function approveUser(
  userId: string,
  approvedBy: string
): Promise<AdminResult<UserProfile>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Approve user error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('User approved successfully:', userId);
    return { data: data as UserProfile, error: null };
  } catch (err) {
    console.error('Unexpected approve user error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown approve user error'),
    };
  }
}

/**
 * Reject a pending user (sets status to suspended)
 *
 * BYPASSES RLS - Only call from admin UI
 *
 * @param userId - User ID to reject
 * @returns Updated user profile
 *
 * @example
 * const { error } = await rejectUser('86f49b40-0f26-4536-9949-e270ecdd0c1e');
 */
export async function rejectUser(
  userId: string
): Promise<AdminResult<UserProfile>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Reject user error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('User rejected successfully:', userId);
    return { data: data as UserProfile, error: null };
  } catch (err) {
    console.error('Unexpected reject user error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown reject user error'),
    };
  }
}

/**
 * Update a user's role
 *
 * BYPASSES RLS - Only call from admin UI after verifying admin privileges
 *
 * @param userId - User ID
 * @param newRole - New role to assign
 * @returns Updated user profile
 *
 * @example
 * const { data, error } = await updateUserRole(
 *   '62628e15-db07-4c5b-bd36-ee787721e1b2',
 *   'secondary_admin'
 * );
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<AdminResult<UserProfile>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update user role error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('User role updated successfully:', userId, '→', newRole);
    return { data: data as UserProfile, error: null };
  } catch (err) {
    console.error('Unexpected update role error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown update role error'),
    };
  }
}

/**
 * Update a user's status
 *
 * BYPASSES RLS - Only call from admin UI
 *
 * @param userId - User ID
 * @param newStatus - New status to set
 * @returns Updated user profile
 *
 * @example
 * const { error } = await updateUserStatus(
 *   '62628e15-db07-4c5b-bd36-ee787721e1b2',
 *   'suspended'
 * );
 */
export async function updateUserStatus(
  userId: string,
  newStatus: UserStatus
): Promise<AdminResult<UserProfile>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update user status error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('User status updated successfully:', userId, '→', newStatus);
    return { data: data as UserProfile, error: null };
  } catch (err) {
    console.error('Unexpected update status error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown update status error'),
    };
  }
}

/**
 * Invite a new user (creates user profile with pending status)
 *
 * NOTE: This creates the user_profiles record. The actual invitation email
 * should be sent separately via Supabase Auth invite functionality.
 *
 * BYPASSES RLS - Only call from admin UI
 *
 * @param userData - User data for invitation
 * @returns Created user profile
 *
 * @example
 * const { data, error } = await inviteUser({
 *   email: 'newuser@acme.com',
 *   fullName: 'New User',
 *   organizationId: '11111111-1111-1111-1111-111111111111',
 *   role: 'user'
 * });
 */
export async function inviteUser(userData: {
  id: string; // User ID from auth.users
  fullName: string;
  organizationId: string;
  role: UserRole;
}): Promise<AdminResult<UserProfile>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userData.id,
        organization_id: userData.organizationId,
        full_name: userData.fullName,
        role: userData.role,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Invite user error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('User invited successfully:', userData.fullName);
    return { data: data as UserProfile, error: null };
  } catch (err) {
    console.error('Unexpected invite user error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown invite user error'),
    };
  }
}

/**
 * Get a specific user profile by ID (admin view)
 *
 * BYPASSES RLS - Only call from admin UI
 *
 * @param userId - User ID
 * @returns User profile
 *
 * @example
 * const { data: user, error } = await getUserById('66a3242e-...');
 */
export async function getUserById(
  userId: string
): Promise<AdminResult<UserProfile>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get user by ID error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as UserProfile, error: null };
  } catch (err) {
    console.error('Unexpected get user error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown get user error'),
    };
  }
}

/**
 * Delete a user profile
 *
 * BYPASSES RLS - Only call from admin UI with extreme caution
 * NOTE: This will cascade delete to auth.users due to FK constraint
 *
 * @param userId - User ID to delete
 * @returns Success or error
 *
 * @example
 * const { error } = await deleteUser('86f49b40-0f26-4536-9949-e270ecdd0c1e');
 */
export async function deleteUser(
  userId: string
): Promise<AdminResult<void>> {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error('Admin client not configured - missing service role key'),
    };
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Delete user error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('User deleted successfully:', userId);
    return { data: null, error: null };
  } catch (err) {
    console.error('Unexpected delete user error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown delete user error'),
    };
  }
}


/**
 * Legacy data management functions
 * These are stubs for backward compatibility with old components
 * TODO: Implement proper organization data management
 */

export async function clearAllOrganizationData(organizationId: string): Promise<AdminResult<void>> {
  console.warn('clearAllOrganizationData: Not yet implemented in new auth system');
  return { data: null, error: new Error('Not implemented') };
}

export async function clearRiskRegisterData(organizationId: string): Promise<AdminResult<void>> {
  console.warn('clearRiskRegisterData: Not yet implemented in new auth system');
  return { data: null, error: new Error('Not implemented') };
}
