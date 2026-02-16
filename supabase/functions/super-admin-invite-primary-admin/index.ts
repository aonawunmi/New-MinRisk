// Edge Function: super-admin-invite-primary-admin
// Purpose: Super Admin can invite the first Primary Admin for a new organization
// Security: Only super_admin role can call this
// Flow: Uses inviteUserByEmail - user receives email, clicks link, sets password
// Created: 2026-01-26
// Updated: 2026-02-16 (Auth Overhaul: removed auto-approval, added invite tracking)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
};

interface InvitePrimaryAdminRequest {
    organizationId: string;
    email: string;
    fullName: string;
}

serve(async (req: Request) => {
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

        // 2. Verify user is SUPER_ADMIN only
        const { data: adminProfile, error: profileError } = await supabaseClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !adminProfile) {
            console.error('Profile lookup failed:', profileError);
            return new Response(
                JSON.stringify({ error: 'User profile not found' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (adminProfile.role !== 'super_admin') {
            return new Response(
                JSON.stringify({ error: 'Only super_admin can invite primary admins' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Parse request body
        const requestData: InvitePrimaryAdminRequest = await req.json();
        const { organizationId, email, fullName } = requestData;

        // 4. Verify organization exists
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, name')
            .eq('id', organizationId)
            .single();

        if (orgError || !org) {
            return new Response(
                JSON.stringify({ error: `Organization not found: ${organizationId}` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        // 6. Create invitation tracking record in user_invitations table
        const { data: invitation, error: inviteRecordError } = await supabaseAdmin.rpc('create_invitation_admin', {
            p_email: email,
            p_organization_id: organizationId,
            p_role: 'primary_admin',
            p_created_by: user.id,
            p_expires_in_days: 7,
            p_notes: `Primary Admin invited by super admin for organization ${org.name}`,
        });

        if (inviteRecordError) {
            console.error('Error creating invitation record:', inviteRecordError);
            return new Response(
                JSON.stringify({ error: 'Failed to create invitation record: ' + inviteRecordError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const inviteCode = invitation?.invite_code;
        console.log(`Invitation record created: ${inviteCode} for ${email}`);

        // 7. Invite user via email - they will receive an invite link
        // The trigger `on_auth_user_created` will auto-create a user_profiles row
        // using the metadata below. User stays as 'pending' until admin approves.
        const appUrl = Deno.env.get('APP_URL') || supabaseUrl;
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: fullName,
                organization_id: organizationId,
                invited_by: user.id,
                role: 'primary_admin',
                invite_code: inviteCode,
            },
            redirectTo: `${appUrl}/auth/callback`,
        });

        if (inviteError || !inviteData.user) {
            console.error('Failed to invite user:', inviteError);
            return new Response(
                JSON.stringify({ error: inviteError?.message || 'Failed to send invite' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const newUserId = inviteData.user.id;

        // NOTE: No auto-approval. User profile stays as 'pending' (created by trigger).
        // Super Admin must manually approve via Admin Panel > Pending Approvals.

        console.log(`Primary Admin invite sent (pending approval): ${fullName} (${email}) for org ${org.name}`);

        return new Response(
            JSON.stringify({
                data: {
                    user_id: newUserId,
                    email: inviteData.user.email,
                    full_name: fullName,
                    role: 'primary_admin',
                    organization_id: organizationId,
                    organization_name: org.name,
                    status: 'pending',
                    invite_sent: true,
                    invite_code: inviteCode,
                },
                error: null,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error: unknown) {
        console.error('❌ Unexpected error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
