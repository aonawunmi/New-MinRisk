// Edge Function: super-admin-invite-regulator
// Purpose: Super Admin can invite regulator users and assign them to regulators
// Security: Only super_admin role can call this
// Pattern: Matches super-admin-invite-primary-admin for consistency

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

        // 4. Validate regulator IDs exist
        const { data: regulators, error: regulatorError } = await supabaseAdmin
            .from('regulators')
            .select('id, name')
            .in('id', regulator_ids);

        if (regulatorError || !regulators || regulators.length !== regulator_ids.length) {
            return new Response(
                JSON.stringify({ error: 'One or more regulator IDs are invalid' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 5. Create the regulator user via invitation email
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
                data: {
                    full_name,
                    role: 'regulator',
                },
            }
        );

        if (inviteError || !inviteData?.user) {
            console.error('Error inviting user:', inviteError);
            return new Response(
                JSON.stringify({
                    error: inviteError?.message || 'Failed to invite user',
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const newUserId = inviteData.user.id;

        // 6. Create user profile with role='regulator'
        const { error: profileCreateError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                id: newUserId,
                full_name,
                role: 'regulator',
                status: 'approved',
                organization_id: null,
            });

        if (profileCreateError) {
            console.error('Error creating user profile:', profileCreateError);
            // Clean up auth user if profile fails
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return new Response(
                JSON.stringify({
                    error: 'Failed to create user profile: ' + profileCreateError.message,
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 7. Grant access to specified regulators
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
            // Clean up on failure
            await supabaseAdmin.from('user_profiles').delete().eq('id', newUserId);
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return new Response(
                JSON.stringify({
                    error: 'Failed to grant regulator access: ' + accessError.message,
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 8. Success
        console.log(`Regulator user invited: ${email}, assigned to: ${regulators.map(r => r.name).join(', ')}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Regulator user invited successfully',
                user: {
                    id: newUserId,
                    email,
                    full_name,
                    regulators: regulators.map(r => r.name),
                },
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Internal server error',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
