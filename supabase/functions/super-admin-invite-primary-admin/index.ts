// Edge Function: super-admin-invite-primary-admin (Clerk Invitations Version)
// Purpose: Super Admin invites the first Primary Admin for an organization
// Flow:
//   1. Verify caller is super_admin (via Clerk JWT)
//   2. Create pending user_profiles entry with role='primary_admin'
//   3. Send Clerk invitation email — user clicks link to create their account
//   4. After sign-up, claim_profile_by_email links their Clerk ID to the profile
//
// Required env vars: CLERK_SECRET_KEY, APP_URL
// Updated: 2026-02-18 (Clerk Invitations — user sets their own password)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyClerkAuth, isSuperAdmin } from "../_shared/clerk-auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface InvitePrimaryAdminRequest {
  organizationId: string;
  email: string;
  fullName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify caller is super_admin
    const { profile, supabaseAdmin } = await verifyClerkAuth(req);

    if (!isSuperAdmin(profile)) {
      return new Response(
        JSON.stringify({ error: "Only super_admin can invite primary admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request
    const { organizationId, email, fullName }: InvitePrimaryAdminRequest = await req.json();

    if (!organizationId || !email || !fullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: organizationId, email, fullName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: `Organization not found: ${organizationId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4a. Check if organization already has a primary admin
    const { count: existingAdminCount } = await supabaseAdmin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "primary_admin")
      .in("status", ["approved", "pending", "pending_invite"]);

    if (existingAdminCount && existingAdminCount > 0) {
      return new Response(
        JSON.stringify({ error: "This organization already has a Primary Admin. Revoke or remove the existing admin first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4b. Check if email already exists in user_profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, status, clerk_id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile && existingProfile.status !== "pending_invite") {
      return new Response(
        JSON.stringify({ error: `User with email already exists: ${email}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create or update pending user_profiles entry
    // clerk_id is NOT set yet — it will be linked after the user signs up via claim_profile_by_email
    if (existingProfile) {
      await supabaseAdmin
        .from("user_profiles")
        .update({
          full_name: fullName,
          role: "primary_admin",
          organization_id: organizationId,
          clerk_id: "",
          status: "pending_invite",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          email,
          full_name: fullName,
          role: "primary_admin",
          organization_id: organizationId,
          status: "pending_invite",
        });

      if (insertError) {
        console.error("Error creating pending profile:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create user profile: " + insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 6. Send Clerk invitation email
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not set");
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing Clerk secret key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "";

    const clerkResponse = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        redirect_url: appUrl,
        public_metadata: {
          invited_role: "primary_admin",
          invited_org_id: organizationId,
          invited_org_name: org.name,
          invited_by: profile.id,
          invited_name: fullName,
        },
        ignore_existing: true,
      }),
    });

    const clerkResult = await clerkResponse.json();

    if (!clerkResponse.ok) {
      console.error("Clerk invitation failed:", clerkResult);
      const errorMsg = clerkResult?.errors?.[0]?.long_message
        || clerkResult?.errors?.[0]?.message
        || clerkResult?.message
        || "Failed to send invitation email";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Track invitation
    await supabaseAdmin.from("user_invitations").insert({
      email,
      organization_id: organizationId,
      role: "primary_admin",
      status: "pending",
      created_by: profile.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: `Primary Admin invitation sent for ${org.name}. Clerk invitation ID: ${clerkResult.id}`,
    }).then(({ error }) => {
      if (error) console.warn("Invitation tracking insert failed (non-fatal):", error.message);
    });

    console.log(`Invitation email sent: ${fullName} (${email}) as primary_admin for org ${org.name}, clerk_invitation_id=${clerkResult.id}`);

    return new Response(
      JSON.stringify({
        data: {
          email,
          full_name: fullName,
          role: "primary_admin",
          organization_id: organizationId,
          organization_name: org.name,
          status: "pending_invite",
          invitation_sent: true,
        },
        error: null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
