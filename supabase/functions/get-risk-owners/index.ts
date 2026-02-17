// Edge Function: get-risk-owners
// Fetches risk owner information (full_name, email) using service role
// Security: Bypasses RLS to fetch user_profiles from same organization
// Created: 2025-12-22 (Security Hardening - Proper owner enrichment)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyClerkAuth } from '../_shared/clerk-auth.ts';

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
    // Verify Clerk authentication
    let profile, supabaseClient, supabaseAdmin;
    try {
      ({ profile, supabaseClient, supabaseAdmin } = await verifyClerkAuth(req));
    } catch (authError) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData: GetRiskOwnersRequest = await req.json();
    const { ownerIds } = requestData;

    if (!ownerIds || !Array.isArray(ownerIds) || ownerIds.length === 0) {
      return new Response(
        JSON.stringify({ data: {}, error: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching ${ownerIds.length} risk owners for user ${profile.id}`);

    // 4. Use admin client to query user_profiles (bypasses RLS)
    // Only fetch users from the same organization for security
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email, organization_id')
      .in('id', ownerIds)
      .eq('organization_id', profile.organization_id);

    if (profilesError) {
      console.error('Fetch profiles error:', profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Build owner info map: owner_id -> {id, full_name, email}
    // Emails are now stored in user_profiles, no need for auth.admin.listUsers()
    const ownerInfoMap: Record<string, OwnerInfo> = {};

    (profiles || []).forEach(p => {
      ownerInfoMap[p.id] = {
        id: p.id,
        full_name: p.full_name || 'Unknown',
        email: p.email || 'No email',
      };
    });

    console.log(`Fetched ${Object.keys(ownerInfoMap).length} owner profiles`);

    return new Response(
      JSON.stringify({ data: ownerInfoMap, error: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
});
