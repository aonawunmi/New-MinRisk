// Edge Function: super-admin-invite-regulator
// Purpose: Super Admin can invite regulator users and assign them to regulators
// Security: Only super_admin role can call this
// Pattern: Matches super-admin-invite-primary-admin for consistency
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

interface InviteRegulatorRequest {
    email: string;
    full_name: string;
    regulator_ids: string[];
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

        // 2. Verify user is super_admin
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
                JSON.stringify({ error: 'Only super_admin can invite regulator users' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Parse request body
        const body: InviteRegulatorRequest = await req.json();
        const { email, full_name, regulator_ids } = body;

        // Validate input
        if (!email || !full_name || !regulator_ids || regulator_ids.length === 0) {
            return new Response(
                JSON.stringify({
                    error: 'Missing required fields: email, full_name, and regulator_ids',
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 4. Check if email already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const emailExists = existingUsers?.users?.some((u: { email?: string }) => u.email === email);
        if (emailExists) {
            return new Response(
                JSON.stringify({ error: `User with email already exists: ${email}` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 5. Validate regulator IDs exist
        const { data: regulators, error: regulatorError } = await supabaseAdmin
            .from('regulators')
            .select('id, name')
            .in('id', regulator_ids);

        if (regulatorError || !regulators || regulators.length !== regulator_ids.length) {
            console.error('Regulator validation failed:', regulatorError);
            return new Response(
                JSON.stringify({ error: 'One or more regulator IDs are invalid' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 6. Invite user via email
        // The trigger `on_auth_user_created` will auto-create user_profiles row
        // using the metadata below. We pass role as 'regulator'.
        // PREREQUISITE: 'regulator' must exist in the user_role enum.
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name,
                role: 'regulator',
                invited_by: user.id,
            },
            redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/auth/callback`,
        });

        if (inviteError || !inviteData.user) {
            console.error('Error inviting user:', inviteError);
            return new Response(
                JSON.stringify({
                    error: inviteError?.message || 'Failed to invite user',
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const newUserId = inviteData.user.id;

        // 7. UPDATE the trigger-created profile to approve the user
        // The trigger already created profile with role='regulator', status='pending'
        // We approve immediately since super_admin is inviting directly
        const { error: profileUpdateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
                status: 'approved',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
            })
            .eq('id', newUserId);

        if (profileUpdateError) {
            console.error('Error updating user profile:', profileUpdateError);
            // Profile was created by trigger but update failed - user still exists
            // Don't delete - they can be manually approved later
            console.warn('Profile update failed but user was created. Manual approval may be needed.');
        }

        // 8. Grant access to specified regulators
        const accessRecords = regulator_ids.map((regulator_id) => ({
            user_id: newUserId,
            regulator_id,
            granted_by: user.id,
        }));

        const { error: accessError } = await supabaseAdmin
            .from('regulator_access')
            .insert(accessRecords);

        if (accessError) {
            console.error('Error granting regulator access:', accessError);
            return new Response(
                JSON.stringify({
                    error: 'User invited but failed to grant regulator access: ' + accessError.message,
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 9. Success
        console.log(`Regulator user invited: ${email}, assigned to: ${regulators.map(r => r.name).join(', ')}`);

        return new Response(
            JSON.stringify({
                data: {
                    user_id: newUserId,
                    email,
                    full_name,
                    role: 'regulator',
                    regulators: regulators.map(r => r.name),
                    status: 'approved',
                    invite_sent: true,
                },
                error: null,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error: unknown) {
        console.error('Unexpected error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
