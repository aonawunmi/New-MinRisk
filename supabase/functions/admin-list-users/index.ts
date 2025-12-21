// Edge Function: admin-list-users
// Replaces client-side supabaseAdmin operations for listing users
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

interface ListUsersRequest {
  organizationId: string;
  filterPending?: boolean; // If true, return only pending users
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
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = profile.role === 'super_admin' || profile.role === 'secondary_admin';
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const requestData: ListUsersRequest = await req.json();
    const { organizationId, filterPending } = requestData;

    // 4. Verify admin is querying their own organization (or super_admin can query any)
    if (profile.role !== 'super_admin' && profile.organization_id !== organizationId) {
      return new Response(
        JSON.stringify({ error: 'Cannot access users from different organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Use admin client to query user_profiles (bypasses RLS)
    let query = supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('organization_id', organizationId);

    if (filterPending) {
      query = query.eq('status', 'pending');
    }

    query = query.order('created_at', { ascending: false });

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('List users error:', profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Get emails from auth.users for each profile
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('List auth users error:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user emails' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Create a map of user_id -> email
    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]));

    // 8. Merge profiles with emails
    const usersWithEmail = (profiles || []).map(profile => ({
      ...profile,
      email: emailMap.get(profile.id) || '',
    }));

    console.log(`✅ Listed ${usersWithEmail.length} users for org ${organizationId} (pending: ${filterPending})`);

    return new Response(
      JSON.stringify({ data: usersWithEmail, error: null }),
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
