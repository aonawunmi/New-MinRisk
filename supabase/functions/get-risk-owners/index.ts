// Edge Function: get-risk-owners
// Fetches risk owner information (full_name, email) using service role
// Security: Bypasses RLS to fetch user_profiles from same organization
// Created: 2025-12-22 (Security Hardening - Proper owner enrichment)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface GetRiskOwnersRequest {
  ownerIds: string[]; // Array of user profile UUIDs
}

interface OwnerInfo {
  id: string;
  full_name: string;
  email: string;
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

    // 2. Get user's organization
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const requestData: GetRiskOwnersRequest = await req.json();
    const { ownerIds } = requestData;

    if (!ownerIds || !Array.isArray(ownerIds) || ownerIds.length === 0) {
      return new Response(
        JSON.stringify({ data: {}, error: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Fetching ${ownerIds.length} risk owners for user ${user.id}`);

    // 4. Use admin client to query user_profiles (bypasses RLS)
    // Only fetch users from the same organization for security
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, organization_id')
      .in('id', ownerIds)
      .eq('organization_id', profile.organization_id);

    if (profilesError) {
      console.error('❌ Fetch profiles error:', profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Get emails from auth.users for each profile
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('❌ List auth users error:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user emails' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Create a map of user_id -> email
    const emailMap = new Map(authData.users.map(u => [u.id, u.email || '']));

    // 7. Build owner info map: owner_id -> {id, full_name, email}
    const ownerInfoMap: Record<string, OwnerInfo> = {};

    (profiles || []).forEach(profile => {
      ownerInfoMap[profile.id] = {
        id: profile.id,
        full_name: profile.full_name || 'Unknown',
        email: emailMap.get(profile.id) || 'No email',
      };
    });

    console.log(`✅ Fetched ${Object.keys(ownerInfoMap).length} owner profiles`);

    return new Response(
      JSON.stringify({ data: ownerInfoMap, error: null }),
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
