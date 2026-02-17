/**
 * Clerk Webhook Edge Function
 *
 * Handles Clerk webhook events to sync users and org memberships
 * into our user_profiles table.
 *
 * Events handled:
 *   user.created              → Insert new user_profiles row
 *   user.updated              → Update email / full_name
 *   user.deleted              → Deactivate (suspend) profile
 *   organizationMembership.created  → Set organization_id
 *   organizationMembership.updated  → Update organization_id
 *   organizationMembership.deleted  → Clear organization_id
 *
 * Webhook signature is verified using Svix headers.
 * Uses Supabase service-role client (bypasses RLS).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

// ── Helpers ──────────────────────────────────────────────────────────

/** Convert a base64-encoded string to Uint8Array. */
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verify Svix webhook signature.
 *
 * Clerk signs webhooks using Svix. The signature is an HMAC-SHA256
 * of `${svix_id}.${svix_timestamp}.${body}` using a secret derived
 * from the webhook signing secret.
 *
 * The CLERK_WEBHOOK_SECRET starts with "whsec_" followed by base64 content.
 */
async function verifySvixSignature(
  body: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing svix headers");
    return false;
  }

  // Reject timestamps older than 5 minutes (replay protection)
  const timestampSec = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSec) > 300) {
    console.error("Svix timestamp too old or too far in the future");
    return false;
  }

  // The secret starts with "whsec_" — strip that prefix and decode base64
  const secretBytes = base64ToUint8Array(secret.replace("whsec_", ""));

  // Construct the signed content: "{svix_id}.{svix_timestamp}.{body}"
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const encoder = new TextEncoder();

  // Import the key for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Compute expected signature
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedContent),
  );

  // Convert to base64
  const expectedB64 = btoa(
    String.fromCharCode(...new Uint8Array(signatureBytes)),
  );

  // Svix sends a comma-separated list of versioned signatures: "v1,<b64> v1,<b64>"
  // We need to match at least one.
  const signatures = svixSignature.split(" ");
  for (const sig of signatures) {
    const [version, value] = sig.split(",", 2);
    if (version === "v1" && value === expectedB64) {
      return true;
    }
  }

  console.error("Svix signature mismatch");
  return false;
}

// ── Main handler ─────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return new Response(
      JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Read body as text for signature verification
  const body = await req.text();

  // Verify webhook signature
  const isValid = await verifySvixSignature(body, req.headers, webhookSecret);
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: "Invalid webhook signature" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Parse the verified payload
  const event = JSON.parse(body);
  const eventType: string = event.type;

  console.log(`Clerk webhook received: ${eventType}`);

  // Create Supabase admin client (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    switch (eventType) {
      // ── User created ──────────────────────────────────────────────
      case "user.created": {
        const { id: clerkId, email_addresses, first_name, last_name } = event.data;

        const primaryEmail =
          email_addresses?.find(
            (e: { id: string }) => e.id === event.data.primary_email_address_id,
          )?.email_address ?? email_addresses?.[0]?.email_address ?? null;

        const fullName = [first_name, last_name].filter(Boolean).join(" ") || "New User";

        // Check if profile already exists by clerk_id (idempotency)
        const { data: existingByClerkId } = await supabaseAdmin
          .from("user_profiles")
          .select("id")
          .eq("clerk_id", clerkId)
          .maybeSingle();

        if (existingByClerkId) {
          console.log(`Profile already exists for clerk_id=${clerkId}, skipping`);
          break;
        }

        // Check if there's a pending invite profile matching this email.
        // Edge functions (invite-primary-admin, invite-user, invite-regulator)
        // pre-create profiles with status='pending_invite' and the correct
        // role/organization_id. We match by email and activate the profile.
        if (primaryEmail) {
          const { data: pendingProfile } = await supabaseAdmin
            .from("user_profiles")
            .select("id, role, organization_id, full_name")
            .eq("email", primaryEmail)
            .eq("status", "pending_invite")
            .maybeSingle();

          if (pendingProfile) {
            // Activate the pending invite — keep the pre-assigned role & org
            const { error: updateError } = await supabaseAdmin
              .from("user_profiles")
              .update({
                clerk_id: clerkId,
                full_name: pendingProfile.full_name || fullName,
                status: "approved",
                updated_at: new Date().toISOString(),
              })
              .eq("id", pendingProfile.id);

            if (updateError) {
              console.error("Update pending profile error:", updateError.message);
              throw updateError;
            }

            // Update invitation tracking record if it exists
            await supabaseAdmin
              .from("user_invitations")
              .update({ status: "accepted" })
              .eq("email", primaryEmail)
              .eq("status", "pending");

            console.log(`Activated pending invite for ${primaryEmail} as ${pendingProfile.role} (clerk_id=${clerkId})`);
            break;
          }
        }

        // No pending invite — create new profile as regular user
        const { error: insertError } = await supabaseAdmin
          .from("user_profiles")
          .insert({
            clerk_id: clerkId,
            email: primaryEmail,
            full_name: fullName,
            role: "user",
            status: "approved", // Clerk invitation IS the approval
          });

        if (insertError) {
          console.error("Insert user_profiles error:", insertError.message);
          throw insertError;
        }

        console.log(`Created profile for ${primaryEmail} (clerk_id=${clerkId})`);
        break;
      }

      // ── User updated ──────────────────────────────────────────────
      case "user.updated": {
        const { id: clerkId, email_addresses, first_name, last_name } = event.data;

        const primaryEmail =
          email_addresses?.find(
            (e: { id: string }) => e.id === event.data.primary_email_address_id,
          )?.email_address ?? email_addresses?.[0]?.email_address ?? null;

        const fullName = [first_name, last_name].filter(Boolean).join(" ");

        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (primaryEmail) updates.email = primaryEmail;
        if (fullName) updates.full_name = fullName;

        const { error: updateError } = await supabaseAdmin
          .from("user_profiles")
          .update(updates)
          .eq("clerk_id", clerkId);

        if (updateError) {
          console.error("Update user_profiles error:", updateError.message);
          throw updateError;
        }

        console.log(`Updated profile for clerk_id=${clerkId}`);
        break;
      }

      // ── User deleted ──────────────────────────────────────────────
      case "user.deleted": {
        const { id: clerkId } = event.data;

        // Soft-delete: set status to suspended
        const { error: deleteError } = await supabaseAdmin
          .from("user_profiles")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("clerk_id", clerkId);

        if (deleteError) {
          console.error("Deactivate user_profiles error:", deleteError.message);
          throw deleteError;
        }

        console.log(`Deactivated profile for clerk_id=${clerkId}`);
        break;
      }

      // ── Org membership created ────────────────────────────────────
      case "organizationMembership.created": {
        const { organization, public_user_data } = event.data;
        const clerkOrgId: string = organization.id;
        const clerkUserId: string = public_user_data.user_id;

        // Look up our organization by clerk_org_id
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("clerk_org_id", clerkOrgId)
          .maybeSingle();

        if (!org) {
          console.warn(`No organization found for clerk_org_id=${clerkOrgId}`);
          break;
        }

        // Set the user's organization_id
        const { error: orgError } = await supabaseAdmin
          .from("user_profiles")
          .update({
            organization_id: org.id,
            updated_at: new Date().toISOString(),
          })
          .eq("clerk_id", clerkUserId);

        if (orgError) {
          console.error("Set organization_id error:", orgError.message);
          throw orgError;
        }

        console.log(`Linked clerk_user=${clerkUserId} to org=${org.id}`);
        break;
      }

      // ── Org membership updated ────────────────────────────────────
      case "organizationMembership.updated": {
        const { organization, public_user_data } = event.data;
        const clerkOrgId: string = organization.id;
        const clerkUserId: string = public_user_data.user_id;

        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("clerk_org_id", clerkOrgId)
          .maybeSingle();

        if (!org) {
          console.warn(`No organization found for clerk_org_id=${clerkOrgId}`);
          break;
        }

        const { error: orgError } = await supabaseAdmin
          .from("user_profiles")
          .update({
            organization_id: org.id,
            updated_at: new Date().toISOString(),
          })
          .eq("clerk_id", clerkUserId);

        if (orgError) {
          console.error("Update organization_id error:", orgError.message);
          throw orgError;
        }

        console.log(`Updated org link for clerk_user=${clerkUserId} to org=${org.id}`);
        break;
      }

      // ── Org membership deleted ────────────────────────────────────
      case "organizationMembership.deleted": {
        const { public_user_data } = event.data;
        const clerkUserId: string = public_user_data.user_id;

        // Clear the user's organization_id
        const { error: orgError } = await supabaseAdmin
          .from("user_profiles")
          .update({
            organization_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("clerk_id", clerkUserId);

        if (orgError) {
          console.error("Clear organization_id error:", orgError.message);
          throw orgError;
        }

        console.log(`Cleared org for clerk_user=${clerkUserId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`Webhook handler error for ${eventType}:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
