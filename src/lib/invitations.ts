/**
 * User Invitation Management Library
 *
 * Functions for creating, validating, and managing user invitations.
 *
 * Flow:
 * 1. Admin creates invitation → invite code generated
 * 2. User signs up with invite code → auto-approved
 * 3. System marks invitation as used
 *
 * Benefits:
 * - Bypass pending approval flow
 * - Pre-assign roles
 * - Track invitation usage
 * - Revoke unused invitations
 */

import { supabase, supabaseAdmin } from './supabase';
import type { UserRole } from './profiles';

// =====================================================
// TYPES
// =====================================================

export type InvitationStatus = 'pending' | 'used' | 'revoked' | 'expired';

export interface UserInvitation {
  id: string;
  invite_code: string;
  email: string;
  organization_id: string;
  role: UserRole;
  status: InvitationStatus;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_by: string;
  created_at: string;
  revoked_by: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  notes: string | null;
}

export interface InvitationValidation {
  is_valid: boolean;
  invitation_id: string | null;
  organization_id: string | null;
  role: UserRole | null;
  error_message: string | null;
}

export interface CreateInvitationParams {
  email: string;
  organizationId: string;
  role: UserRole;
  expiresInDays?: number;
  notes?: string;
}

// =====================================================
// CREATE INVITATION
// =====================================================

/**
 * Create a new user invitation (admin only)
 *
 * Generates a unique 8-character invite code.
 * User who signs up with this code will be auto-approved.
 *
 * @param params - Invitation parameters
 * @returns Created invitation or error
 *
 * @example
 * const { data, error } = await createInvitation({
 *   email: 'newuser@company.com',
 *   organizationId: '11111111-1111-1111-1111-111111111111',
 *   role: 'user',
 *   expiresInDays: 7,
 *   notes: 'New team member'
 * });
 *
 * if (data) {
 *   console.log('Invite code:', data.invite_code);
 *   // Send invite code to user via email
 * }
 */
export async function createInvitation(
  params: CreateInvitationParams
): Promise<{ data: UserInvitation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('create_invitation', {
      p_email: params.email.trim(),
      p_organization_id: params.organizationId,
      p_role: params.role,
      p_expires_in_days: params.expiresInDays || 7,
      p_notes: params.notes || null,
    });

    if (error) {
      console.error('Create invitation error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as UserInvitation, error: null };
  } catch (err) {
    console.error('Unexpected create invitation error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error creating invitation'),
    };
  }
}

// =====================================================
// VALIDATE INVITATION (Public - used during signup)
// =====================================================

/**
 * Validate an invitation code (public function for signup flow)
 *
 * Checks if invite code is valid for the given email.
 * Does NOT mark as used - use useInvitation() after signup succeeds.
 *
 * @param inviteCode - 8-character invite code
 * @param email - Email address attempting to sign up
 * @returns Validation result
 *
 * @example
 * const { data, error } = await validateInvitation('ABC12345', 'user@company.com');
 *
 * if (data && data.is_valid) {
 *   console.log('Valid invite for org:', data.organization_id);
 *   console.log('User will be assigned role:', data.role);
 *   // Proceed with signup
 * } else {
 *   console.error('Invalid invite:', data?.error_message);
 * }
 */
export async function validateInvitation(
  inviteCode: string,
  email: string
): Promise<{ data: InvitationValidation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('validate_invitation', {
      p_invite_code: inviteCode.trim(),
      p_email: email.trim(),
    });

    if (error) {
      console.error('Validate invitation error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    // RPC returns array with single row
    const validation = Array.isArray(data) ? data[0] : data;

    return { data: validation as InvitationValidation, error: null };
  } catch (err) {
    console.error('Unexpected validate invitation error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error validating invitation'),
    };
  }
}

// =====================================================
// USE INVITATION (System function - called after signup)
// =====================================================

/**
 * Mark invitation as used (system function)
 *
 * Call this AFTER user successfully signs up with invite code.
 * Updates invitation status and records who used it.
 *
 * @param inviteCode - 8-character invite code
 * @param userId - UUID of user who just signed up
 * @returns Success or error
 *
 * @example
 * // After successful signup:
 * const { error } = await useInvitation('ABC12345', newUser.id);
 * if (error) {
 *   console.error('Failed to mark invitation as used:', error);
 * }
 */
export async function useInvitation(
  inviteCode: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('use_invitation', {
      p_invite_code: inviteCode.trim(),
      p_user_id: userId,
    });

    if (error) {
      console.error('Use invitation error:', error.message);
      return { success: false, error: new Error(error.message) };
    }

    const success = data === true;

    return { success, error: success ? null : new Error('Invitation not found or already used') };
  } catch (err) {
    console.error('Unexpected use invitation error:', err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Unknown error using invitation'),
    };
  }
}

// =====================================================
// LIST INVITATIONS (Admin only)
// =====================================================

/**
 * List invitations for an organization (admin only)
 *
 * Returns all invitations (pending, used, revoked, expired).
 * Use status filter for specific views.
 *
 * @param organizationId - Organization ID
 * @param status - Optional status filter
 * @returns List of invitations
 *
 * @example
 * // Get all pending invitations
 * const { data: pending } = await listInvitations(orgId, 'pending');
 *
 * // Get all invitations
 * const { data: all } = await listInvitations(orgId);
 */
export async function listInvitations(
  organizationId: string,
  status?: InvitationStatus
): Promise<{ data: UserInvitation[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('user_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('List invitations error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as UserInvitation[]) || [], error: null };
  } catch (err) {
    console.error('Unexpected list invitations error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error listing invitations'),
    };
  }
}

// =====================================================
// REVOKE INVITATION (Admin only)
// =====================================================

/**
 * Revoke a pending invitation (admin only)
 *
 * Cancelled invitations cannot be used.
 * Can only revoke pending invitations (not used/expired ones).
 *
 * @param invitationId - Invitation ID
 * @param reason - Optional reason for revocation
 * @returns Success or error
 *
 * @example
 * const { success, error } = await revokeInvitation(
 *   'uuid-here',
 *   'Position no longer available'
 * );
 */
export async function revokeInvitation(
  invitationId: string,
  reason?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('revoke_invitation', {
      p_invitation_id: invitationId,
      p_reason: reason || null,
    });

    if (error) {
      console.error('Revoke invitation error:', error.message);
      return { success: false, error: new Error(error.message) };
    }

    const success = data === true;

    return { success, error: success ? null : new Error('Invitation not found or already used') };
  } catch (err) {
    console.error('Unexpected revoke invitation error:', err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Unknown error revoking invitation'),
    };
  }
}

// =====================================================
// GET INVITATION BY CODE (Helper)
// =====================================================

/**
 * Get invitation details by code (helper function)
 *
 * @param inviteCode - 8-character invite code
 * @returns Invitation or null
 *
 * @example
 * const { data } = await getInvitationByCode('ABC12345');
 * if (data) {
 *   console.log('Invitation for:', data.email);
 * }
 */
export async function getInvitationByCode(
  inviteCode: string
): Promise<{ data: UserInvitation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single();

    if (error) {
      // Not found is expected, return null without error
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      console.error('Get invitation error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as UserInvitation, error: null };
  } catch (err) {
    console.error('Unexpected get invitation error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error getting invitation'),
    };
  }
}

// =====================================================
// DELETE INVITATION (Admin only - careful!)
// =====================================================

/**
 * Delete an invitation permanently (admin only - use with caution)
 *
 * Use revoke instead unless you need to completely remove the record.
 *
 * @param invitationId - Invitation ID
 * @returns Success or error
 */
export async function deleteInvitation(
  invitationId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: new Error('Admin client not configured'),
    };
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('Delete invitation error:', error.message);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected delete invitation error:', err);
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Unknown error deleting invitation'),
    };
  }
}

// =====================================================
// CLEANUP EXPIRED INVITATIONS (Scheduled job)
// =====================================================

/**
 * Mark expired pending invitations as expired
 *
 * Call this from a scheduled job (e.g., daily cron).
 *
 * @returns Number of invitations expired
 *
 * @example
 * const { count } = await cleanupExpiredInvitations();
 * console.log(`Expired ${count} invitations`);
 */
export async function cleanupExpiredInvitations(): Promise<{
  count: number;
  error: Error | null;
}> {
  if (!supabaseAdmin) {
    return {
      count: 0,
      error: new Error('Admin client not configured'),
    };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_invitations');

    if (error) {
      console.error('Cleanup expired invitations error:', error.message);
      return { count: 0, error: new Error(error.message) };
    }

    return { count: data || 0, error: null };
  } catch (err) {
    console.error('Unexpected cleanup error:', err);
    return {
      count: 0,
      error: err instanceof Error ? err : new Error('Unknown cleanup error'),
    };
  }
}
