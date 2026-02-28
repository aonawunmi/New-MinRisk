// Edge Function: admin-invite-user (Clerk Invitations Version)
// Purpose: Org admins invite new users to their organization
// Flow:
//   1. Verify caller is admin (via Clerk JWT)
//   2. Create pending user_profiles entry
//   3. Send Clerk invitation email — user clicks link to create their account
//   4. After sign-up, claim_profile_by_email links their Clerk ID to the profile
//
// Required env vars: CLERK_SECRET_KEY, APP_URL
// Updated: 2026-02-18 (Clerk Invitations — user sets their own password)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyClerkAuth, isAdmin, isSuperAdmin } from "../_shared/clerk-auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

type UserRole = "secondary_admin" | "user";

interface InviteUserRequest {
  email: string;
  fullName: string;
  organizationId: string;
  role: UserRole;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify caller is admin
    const { profile, supabaseAdmin } = await verifyClerkAuth(req);

    if (!isAdmin(profile)) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request
    const { email, fullName, organizationId, role }: InviteUserRequest = await req.json();

    if (!email || !fullName || !organizationId || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, fullName, organizationId, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify admin is inviting to their own organization (super_admin can invite to any)
    if (!isSuperAdmin(profile) && profile.organization_id !== organizationId) {
      return new Response(
        JSON.stringify({ error: "Cannot invite users to different organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Check if email already exists in user_profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, status")
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
          role,
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
          id: crypto.randomUUID(),
          email,
          full_name: fullName,
          role,
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
          invited_role: role,
          invited_org_id: organizationId,
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
    const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { error: trackError } = await supabaseAdmin.from("user_invitations").insert({
      invite_code: inviteCode,
      email,
      organization_id: organizationId,
      role,
      status: "pending",
      created_by: profile.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: `Invited by admin as ${role}. Clerk invitation ID: ${clerkResult.id}`,
    });
    if (trackError) {
      console.error("❌ user_invitations insert failed:", trackError.message, trackError);
    }

    console.log(`Invitation email sent: ${fullName} (${email}) as ${role} to org ${organizationId}, clerk_invitation_id=${clerkResult.id}`);

    return new Response(
      JSON.stringify({
        data: {
          email,
          full_name: fullName,
          role,
          organization_id: organizationId,
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
