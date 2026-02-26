import { supabase, getClerkToken } from './supabase';
import type { UserProfile, UserRole, UserStatus } from './profiles';

/**
 * Admin Service Layer — CLERK VERSION
 *
 * Security: All operations call Edge Functions which verify admin privileges
 * server-side. The Clerk JWT is sent as the Authorization bearer token.
 *
 * Updated: Feb 2026 (Clerk Migration)
 */

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') + '/functions/v1';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export interface AdminResult<T = any> {
  data: T | null;
  error: Error | null;
}

/**
 * Helper: Call Edge Function with Clerk JWT authentication
 */
async function callEdgeFunction<T = any>(
  functionName: string,
  body: any
): Promise<AdminResult<T>> {
  try {
    const token = await getClerkToken();
    if (!token) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'x-clerk-token': token,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: new Error(result.error || 'Edge Function failed') };
    }

    return { data: result.data, error: result.error ? new Error(result.error) : null };
  } catch (err) {
    console.error(`Edge Function ${functionName} error:`, err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(`Unknown error calling ${functionName}`),
    };
  }
}

/**
 * List all users in an organization
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
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
  organizationId: string | null
): Promise<AdminResult<any[]>> {
  // If no organization ID (Super Admin), use the direct RPC which is safe
  if (!organizationId) {
    const { data, error } = await supabase.rpc('list_users_with_email', {
      p_organization_id: null
    });

    if (error) {
      console.error('RPC list_users_with_email failed:', error);
      return { data: null, error: new Error(error.message) };
    }
    return { data, error: null };
  }

  return callEdgeFunction<any[]>('admin-list-users', {
    organizationId,
    filterPending: false,
  });
}

/**
 * List pending users in an organization
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
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
  organizationId: string | null
): Promise<AdminResult<any[]>> {
  // If no organization ID (Super Admin), use the direct RPC which is safe
  if (!organizationId) {
    const { data, error } = await supabase.rpc('list_users_with_email', {
      p_organization_id: null
    });

    if (error) {
      console.error('RPC listPendingUsers failed:', error);
      return { data: null, error: new Error(error.message) };
    }
    // Client-side filter since our RPC returns all
    const pending = (data || []).filter((u: any) => u.status === 'pending');
    return { data: pending, error: null };
  }

  return callEdgeFunction<any[]>('admin-list-users', {
    organizationId,
    filterPending: true,
  });
}

/**
 * Approve a pending user
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
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
  return callEdgeFunction<UserProfile>('admin-manage-user', {
    action: 'approve',
    userId,
    approvedBy,
  });
}

/**
 * Reject a pending user (sets status to suspended)
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
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
  return callEdgeFunction<UserProfile>('admin-manage-user', {
    action: 'reject',
    userId,
  });
}

/**
 * Update a user's role
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
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
  return callEdgeFunction<UserProfile>('admin-manage-user', {
    action: 'update_role',
    userId,
    newRole,
  });
}

/**
 * Update a user's status
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
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
  return callEdgeFunction<UserProfile>('admin-manage-user', {
    action: 'update_status',
    userId,
    newStatus,
  });
}

/**
 * Invite a new user via email
 *
 * Sends an invitation email via Supabase Auth. The user receives an email,
 * clicks the link, sets their password, and is immediately active.
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
 *
 * @param userData - User data for invitation
 * @returns Invitation result
 *
 * @example
 * const { data, error } = await inviteUser({
 *   email: 'newuser@company.com',
 *   fullName: 'New User',
 *   organizationId: '11111111-1111-1111-1111-111111111111',
 *   role: 'user'
 * });
 */
export async function inviteUser(userData: {
  email: string;
  fullName: string;
  organizationId: string;
  role: UserRole;
}): Promise<AdminResult<UserProfile>> {
  return callEdgeFunction<UserProfile>('admin-invite-user', userData);
}

/**
 * Get a specific user profile by ID (admin view)
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
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
  return callEdgeFunction<UserProfile>('admin-manage-user', {
    action: 'get_by_id',
    userId,
  });
}

/**
 * Delete a user profile
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
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
  return callEdgeFunction<void>('admin-manage-user', {
    action: 'delete',
    userId,
  });
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
