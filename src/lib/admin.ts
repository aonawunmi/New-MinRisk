import { supabase } from './supabase';
import type { UserProfile, UserRole, UserStatus } from './profiles';

/**
 * Admin Service Layer - SECURE VERSION
 *
 * Security: All operations now call Edge Functions which verify admin privileges
 * server-side before using service role. Service role is NEVER exposed to client.
 *
 * Migration Date: 2025-12-21 (Security Hardening)
 *
 * Operations:
 * - List all users in an organization
 * - List pending users
 * - Approve/reject user requests
 * - Update user roles
 * - Suspend/unsuspend users
 * - Invite new users
 */

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') + '/functions/v1';

export interface AdminResult<T = any> {
  data: T | null;
  error: Error | null;
}

/**
 * Helper: Call Edge Function with authentication
 */
async function callEdgeFunction<T = any>(
  functionName: string,
  body: any
): Promise<AdminResult<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
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
  organizationId: string
): Promise<AdminResult<any[]>> {
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
  organizationId: string
): Promise<AdminResult<any[]>> {
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
 * Invite a new user (creates user profile with pending status)
 *
 * NOTE: This creates the user_profiles record. The actual invitation email
 * should be sent separately via Supabase Auth invite functionality.
 *
 * Security: Calls Edge Function which verifies admin privileges server-side
 *
 * @param userData - User data for invitation
 * @returns Created user profile
 *
 * @example
 * const { data, error } = await inviteUser({
 *   id: 'uuid-from-auth',
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
