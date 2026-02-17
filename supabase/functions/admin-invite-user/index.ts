// Edge Function: admin-invite-user (Clerk Version)
// Purpose: Org admins invite new users to their organization
// Flow:
//   1. Verify caller is admin (via Clerk JWT)
//   2. Create pending user_profiles entry
//   3. Create user directly in Clerk via Backend API
//   4. Immediately activate profile with clerk_id
//   5. Generate one-time sign-in token → magic link for instant access
//
// Required env vars: CLERK_SECRET_KEY, APP_URL
// Updated: 2026-02-17 (Magic link flow — world-class UX)

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
    if (existingProfile) {
      await supabaseAdmin
        .from("user_profiles")
        .update({
          full_name: fullName,
          role,
          organization_id: organizationId,
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

    // 6. Create user directly in Clerk via Backend API
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not set");
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing Clerk secret key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const clerkResponse = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [email],
        first_name: firstName,
        last_name: lastName,
        skip_password_checks: true,
        skip_password_requirement: true,
        public_metadata: {
          invited_role: role,
          invited_org_id: organizationId,
          invited_by: profile.id,
        },
      }),
    });

    const clerkResult = await clerkResponse.json();

    if (!clerkResponse.ok) {
      console.error("Clerk user creation failed:", clerkResult);
      const errorMsg = clerkResult?.errors?.[0]?.long_message
        || clerkResult?.errors?.[0]?.message
        || clerkResult?.message
        || "Failed to create Clerk user";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Directly activate the profile with the Clerk user ID (no webhook dependency)
    const { error: activateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        clerk_id: clerkResult.id,
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)
      .eq("status", "pending_invite");

    if (activateError) {
      console.error("Error activating profile:", activateError);
      // Non-fatal: the webhook can still activate it as backup
    }

    // 8. Generate one-time sign-in token for magic link
    let magicLink: string | null = null;
    try {
      const tokenResponse = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: clerkResult.id,
          expires_in_seconds: 604800, // 7 days
        }),
      });

      if (tokenResponse.ok) {
        const tokenResult = await tokenResponse.json();
        const appUrl = Deno.env.get("APP_URL") || "";
        magicLink = `${appUrl}?signin_token=${tokenResult.token}`;
      } else {
        console.warn("Failed to create sign-in token:", await tokenResponse.text());
      }
    } catch (tokenError) {
      console.warn("Sign-in token creation failed (non-fatal):", tokenError);
    }

    // 9. Track invitation
    await supabaseAdmin.from("user_invitations").insert({
      email,
      organization_id: organizationId,
      role,
      status: "accepted",
      created_by: profile.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: `Invited by admin as ${role}.`,
    }).then(({ error }) => {
      if (error) console.warn("Invitation tracking insert failed (non-fatal):", error.message);
    });

    console.log(`User created and activated: ${fullName} (${email}) as ${role} to org ${organizationId}, clerk_user_id=${clerkResult.id}`);

    return new Response(
      JSON.stringify({
        data: {
          email,
          full_name: fullName,
          role,
          organization_id: organizationId,
          status: "approved",
          clerk_user_id: clerkResult.id,
          magic_link: magicLink,
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
