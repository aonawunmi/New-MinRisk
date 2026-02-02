/**
 * Edge Function: super-admin-invite-regulator
 *
 * Purpose: Allow super admins to invite regulator users
 *
 * Flow:
 * 1. Super admin provides email, name, and regulator IDs
 * 2. Function creates auth user with temp password
 * 3. Creates user_profile with role='regulator'
 * 4. Grants access to specified regulators in regulator_access table
 * 5. Sends invitation email with password reset link
 *
 * Security: Only callable by super_admin role
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface InviteRegulatorRequest {
  email: string;
  full_name: string;
  regulator_ids: string[]; // Array of regulator UUIDs
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify caller is super admin
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can invite regulator users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: InviteRegulatorRequest = await req.json();
    const { email, full_name, regulator_ids } = body;

    // Validate input
    if (!email || !full_name || !regulator_ids || regulator_ids.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: email, full_name, and regulator_ids are required',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate regulator IDs exist
    const { data: regulators, error: regulatorError } = await supabaseClient
      .from('regulators')
      .select('id, name')
      .in('id', regulator_ids);

    if (regulatorError || !regulators || regulators.length !== regulator_ids.length) {
      return new Response(
        JSON.stringify({ error: 'One or more regulator IDs are invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client for user creation
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Generate temporary password
    const tempPassword = crypto.randomUUID();

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({
          error: authError?.message || 'Failed to create user',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user profile with role='regulator'
    const { error: profileCreateError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role: 'regulator',
        organization_id: null, // Regulators don't belong to organizations
      });

    if (profileCreateError) {
      console.error('Error creating user profile:', profileCreateError);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({
          error: 'Failed to create user profile',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Grant access to specified regulators
    const accessRecords = regulator_ids.map((regulator_id) => ({
      user_id: authData.user.id,
      regulator_id,
      granted_by: user.id,
    }));

    const { error: accessError } = await supabaseAdmin
      .from('regulator_access')
      .insert(accessRecords);

    if (accessError) {
      console.error('Error granting regulator access:', accessError);
      // Clean up user and profile if access grant fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('user_profiles').delete().eq('id', authData.user.id);
      return new Response(
        JSON.stringify({
          error: 'Failed to grant regulator access',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send password reset email (user must set their own password)
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (resetError) {
      console.error('Error sending password reset email:', resetError);
      // Don't fail the whole operation if email fails
      // User is created and can be manually reset
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Regulator user invited successfully',
        user: {
          id: authData.user.id,
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
