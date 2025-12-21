// Edge Function: admin-manage-user
// Replaces client-side supabaseAdmin operations for managing users
// Operations: approve, reject, update role, update status, delete user
// Security: Uses stored procedures with auth.uid() for audit trail
// Updated: 2025-12-21 (Phase 4 - Use stored procedures instead of direct UPDATEs)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type UserRole = 'super_admin' | 'primary_admin' | 'secondary_admin' | 'user' | 'viewer';
type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

interface ManageUserRequest {
  action: 'approve' | 'reject' | 'update_role' | 'update_status' | 'delete' | 'get_by_id';
  userId: string;

  // Optional fields depending on action
  approvedBy?: string; // For approve action (legacy, not used anymore)
  newRole?: UserRole; // For update_role action
  newStatus?: UserStatus; // For update_status action
  reason?: string; // Reason for the change (for audit trail)
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

    // Client with user's auth token (for RPC calls and verification)
    // IMPORTANT: Use this for RPC calls so auth.uid() works in stored procedures
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client with service role (for privileged operations like delete)
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

    const isAdmin = adminProfile.role === 'super_admin' ||
                   adminProfile.role === 'primary_admin' ||
                   adminProfile.role === 'secondary_admin';
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const requestData: ManageUserRequest = await req.json();
    const { action, userId, newRole, newStatus, reason } = requestData;

    // Generate request ID for correlation
    const requestId = crypto.randomUUID();

    console.log(`📋 Admin action: ${action} by ${user.id} on user ${userId} (request: ${requestId})`);

    // 4. Execute the requested action
    let result: any;
    let error: any;

    switch (action) {
      case 'approve':
        // Call stored procedure to approve user
        // The procedure will:
        // - Get actor from auth.uid()
        // - Verify authorization (admin, same org, RBAC)
        // - Update status to 'approved'
        // - Write audit log
        ({ data: result, error } = await supabaseClient.rpc('change_user_status', {
          p_user_id: userId,
          p_new_status: 'approved',
          p_reason: reason || 'User approved by admin',
          p_request_id: requestId,
        }));

        if (error) {
          console.error(`❌ Approve failed:`, error);
        } else if (result && !result.success) {
          console.error(`❌ Approve rejected by stored procedure:`, result);
          return new Response(
            JSON.stringify({ error: result.error, code: result.code, details: result.details }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`✅ User approved: ${userId} → ${result.email}`);
        }
        break;

      case 'reject':
        // Call stored procedure to reject user (set to 'rejected' status)
        ({ data: result, error } = await supabaseClient.rpc('change_user_status', {
          p_user_id: userId,
          p_new_status: 'rejected',
          p_reason: reason || 'User rejected by admin',
          p_request_id: requestId,
        }));

        if (error) {
          console.error(`❌ Reject failed:`, error);
        } else if (result && !result.success) {
          console.error(`❌ Reject rejected by stored procedure:`, result);
          return new Response(
            JSON.stringify({ error: result.error, code: result.code, details: result.details }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`✅ User rejected: ${userId} → ${result.email}`);
        }
        break;

      case 'update_role':
        if (!newRole) {
          return new Response(
            JSON.stringify({ error: 'newRole is required for update_role action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Call stored procedure to change role
        // The procedure will:
        // - Get actor from auth.uid()
        // - Verify authorization (admin, same org, RBAC, privilege escalation)
        // - Update role
        // - Write audit log
        ({ data: result, error } = await supabaseClient.rpc('change_user_role', {
          p_user_id: userId,
          p_new_role: newRole,
          p_reason: reason || `Role changed to ${newRole} by admin`,
          p_request_id: requestId,
        }));

        if (error) {
          console.error(`❌ Update role failed:`, error);
        } else if (result && !result.success) {
          console.error(`❌ Update role rejected by stored procedure:`, result);
          return new Response(
            JSON.stringify({ error: result.error, code: result.code, details: result.details }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`✅ User role updated: ${userId} → ${newRole}`);
        }
        break;

      case 'update_status':
        if (!newStatus) {
          return new Response(
            JSON.stringify({ error: 'newStatus is required for update_status action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Call stored procedure to change status
        ({ data: result, error } = await supabaseClient.rpc('change_user_status', {
          p_user_id: userId,
          p_new_status: newStatus,
          p_reason: reason || `Status changed to ${newStatus} by admin`,
          p_request_id: requestId,
        }));

        if (error) {
          console.error(`❌ Update status failed:`, error);
        } else if (result && !result.success) {
          console.error(`❌ Update status rejected by stored procedure:`, result);
          return new Response(
            JSON.stringify({ error: result.error, code: result.code, details: result.details }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`✅ User status updated: ${userId} → ${newStatus}`);
        }
        break;

      case 'delete':
        // Delete still uses service role (no audit trail needed for hard deletes)
        // TODO: Consider soft delete with audit trail in future
        ({ data: result, error } = await supabaseAdmin
          .from('user_profiles')
          .delete()
          .eq('id', userId));
        console.log(`✅ User deleted: ${userId}`);
        break;

      case 'get_by_id':
        // Read operation - no audit needed
        ({ data: result, error } = await supabaseClient
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
