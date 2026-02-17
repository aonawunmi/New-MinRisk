// Edge Function: admin-list-users
// Replaces client-side supabaseAdmin operations for listing users
// Security: Verifies admin role via Clerk auth before executing, uses service role internally
// Created: 2025-12-21 (Security Hardening - Remove service role from client)
// Updated: 2026-02-16 (Migrated to Clerk auth)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyClerkAuth, isAdmin } from '../_shared/clerk-auth.ts';

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
    // 1. Verify user is authenticated via Clerk
    let profile, supabaseClient, supabaseAdmin;
    try {
      ({ profile, supabaseClient, supabaseAdmin } = await verifyClerkAuth(req));
    } catch (authError) {
      console.error('Auth verification failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verify user is admin
    if (!isAdmin(profile)) {
      console.error(`❌ Admin check failed - User role: "${profile.role}" (expected: super_admin, primary_admin, or secondary_admin)`);
      return new Response(
        JSON.stringify({
          error: 'Admin access required',
          debug: `Current role: ${profile.role}, expected: super_admin, primary_admin, or secondary_admin`
        }),
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
    // Emails are now stored in user_profiles, no need to query auth.users
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

    console.log(`✅ Listed ${(profiles || []).length} users for org ${organizationId} (pending: ${filterPending})`);

    return new Response(
      JSON.stringify({ data: profiles || [], error: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
