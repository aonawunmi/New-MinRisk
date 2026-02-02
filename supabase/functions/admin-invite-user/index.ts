// Edge Function: admin-invite-user
// Purpose: Invite new users via email (sends Supabase invite email)
// Security: Verifies admin role before executing, uses service role internally
// Updated: 2026-02-02 (Converted from invite-code to email-based invitations)
//
// IMPORTANT: There is a database trigger `on_auth_user_created` on auth.users
// that automatically creates a user_profiles row when inviteUserByEmail is called.
// The trigger reads role/full_name/organization_id from raw_user_meta_data.
// Therefore we must NOT insert a new profile - we UPDATE the trigger-created one.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type UserRole = 'secondary_admin' | 'user';

interface InviteUserRequest {
  email: string;
  fullName: string;
  organizationId: string;
  role: UserRole;
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
    const userData: InviteUserRequest = await req.json();
    const { email, fullName, organizationId, role } = userData;

    // Validate required fields
    if (!email || !fullName || !organizationId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, fullName, organizationId, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verify admin is inviting to their own organization (or super_admin can invite to any)
    if (adminProfile.role !== 'super_admin' && adminProfile.organization_id !== organizationId) {
      return new Response(
        JSON.stringify({ error: 'Cannot invite users to different organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some((u: { email?: string }) => u.email === email);
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: `User with email already exists: ${email}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Invite user via email
    // The trigger `on_auth_user_created` will auto-create a user_profiles row
    // using the metadata below. We then UPDATE it to set approved status.
    const appUrl = Deno.env.get('APP_URL') || supabaseUrl;
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        organization_id: organizationId,
        invited_by: user.id,
        role,
      },
      redirectTo: `${appUrl}/auth/callback`,
    });

    if (inviteError || !inviteData.user) {
      console.error('Error inviting user:', inviteError);
      return new Response(
        JSON.stringify({ error: inviteError?.message || 'Failed to invite user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = inviteData.user.id;

    // 7. UPDATE the trigger-created profile to approve immediately
    // Admin is explicitly inviting this person, so auto-approve.
    const { error: profileUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        organization_id: organizationId,
        full_name: fullName,
        role,
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', newUserId);

    if (profileUpdateError) {
      console.error('Error updating user profile:', profileUpdateError);
      console.warn('Profile update failed but user was created. Manual approval may be needed.');
    }

    console.log(`User invited: ${fullName} (${email}) as ${role} to org ${organizationId}`);

    return new Response(
      JSON.stringify({
        data: {
          user_id: newUserId,
          email: inviteData.user.email,
          full_name: fullName,
          role,
          organization_id: organizationId,
          status: 'approved',
          invite_sent: true,
        },
        error: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
