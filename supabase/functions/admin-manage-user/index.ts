// Edge Function: admin-manage-user
// Replaces client-side supabaseAdmin operations for managing users
// Operations: approve, reject, update role, update status, delete user
// Security: Verifies admin role before executing, uses service role internally
// Created: 2025-12-21 (Security Hardening - Remove service role from client)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type UserRole = 'super_admin' | 'primary_admin' | 'secondary_admin' | 'user' | 'viewer';
type UserStatus = 'pending' | 'approved' | 'suspended';

interface ManageUserRequest {
  action: 'approve' | 'reject' | 'update_role' | 'update_status' | 'delete' | 'get_by_id';
  userId: string;

  // Optional fields depending on action
  approvedBy?: string; // For approve action
  newRole?: UserRole; // For update_role action
  newStatus?: UserStatus; // For update_status action
}

/**
 * Get role hierarchy level (higher number = higher privilege)
 * MUST match client-side implementation in UserManagement.tsx
 */
function getRoleLevel(role: UserRole): number {
  switch (role) {
    case 'super_admin':
      return 4;
    case 'primary_admin':
      return 3;
    case 'secondary_admin':
      return 2;
    case 'user':
      return 1;
    case 'viewer':
      return 0;
    default:
      return -1;
  }
}

/**
 * Check if current user can manage (view/edit) a target user
 * Rule: You can only manage users with STRICTLY LOWER privilege than yours
 * You CANNOT manage users at your level or above
 */
function canManageUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  const currentLevel = getRoleLevel(currentUserRole);
  const targetLevel = getRoleLevel(targetUserRole);

  // Can only manage users with STRICTLY LOWER privilege
  return currentLevel > targetLevel;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client with user's auth token (for verification)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client with service role (for privileged operations)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verify user is admin
    const { data: adminProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      console.error('Profile lookup failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = adminProfile.role === 'super_admin' || adminProfile.role === 'primary_admin' || adminProfile.role === 'secondary_admin';
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const requestData: ManageUserRequest = await req.json();
    const { action, userId, approvedBy, newRole, newStatus } = requestData;

    // 4. Get target user's profile to verify same organization AND role (for RBAC)
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Verify admin is managing users in their own organization (or super_admin)
    if (adminProfile.role !== 'super_admin' && adminProfile.organization_id !== targetProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot manage users from different organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. RBAC: Verify admin can manage target user (privilege hierarchy check)
    if (!canManageUser(adminProfile.role, targetProfile.role)) {
      console.error(`❌ RBAC violation: ${adminProfile.role} (level ${getRoleLevel(adminProfile.role)}) attempted to manage ${targetProfile.role} (level ${getRoleLevel(targetProfile.role)})`);
      return new Response(
        JSON.stringify({
          error: 'You cannot manage users with equal or higher privileges than your own',
          details: {
            yourRole: adminProfile.role,
            targetRole: targetProfile.role,
          }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Execute the requested action
    let result: any;
    let error: any;

    switch (action) {
      case 'approve':
        ({ data: result, error } = await supabaseAdmin
          .from('user_profiles')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: approvedBy || user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single());
        console.log(`✅ User approved: ${userId}`);
        break;

      case 'reject':
        ({ data: result, error } = await supabaseAdmin
          .from('user_profiles')
          .update({
            status: 'suspended',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single());
        console.log(`✅ User rejected: ${userId}`);
        break;

      case 'update_role':
        if (!newRole) {
          return new Response(
            JSON.stringify({ error: 'newRole is required for update_role action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // RBAC: Verify admin can only assign roles LOWER than their own
        const newRoleLevel = getRoleLevel(newRole);
        const adminRoleLevel = getRoleLevel(adminProfile.role);

        if (newRoleLevel >= adminRoleLevel) {
          console.error(`❌ RBAC violation: ${adminProfile.role} (level ${adminRoleLevel}) attempted to assign ${newRole} (level ${newRoleLevel})`);
          return new Response(
            JSON.stringify({
              error: 'You can only assign roles with lower privileges than your own',
              details: {
                yourRole: adminProfile.role,
                attemptedRole: newRole,
              }
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        ({ data: result, error } = await supabaseAdmin
          .from('user_profiles')
          .update({
            role: newRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single());
        console.log(`✅ User role updated: ${userId} → ${newRole}`);
        break;

      case 'update_status':
        if (!newStatus) {
          return new Response(
            JSON.stringify({ error: 'newStatus is required for update_status action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        ({ data: result, error } = await supabaseAdmin
          .from('user_profiles')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single());
        console.log(`✅ User status updated: ${userId} → ${newStatus}`);
        break;

      case 'delete':
        ({ data: result, error } = await supabaseAdmin
          .from('user_profiles')
          .delete()
          .eq('id', userId));
        console.log(`✅ User deleted: ${userId}`);
        break;

      case 'get_by_id':
        ({ data: result, error } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single());
        console.log(`✅ User retrieved: ${userId}`);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (error) {
      console.error(`❌ ${action} error:`, error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: result, error: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
