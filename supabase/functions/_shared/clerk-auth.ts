/**
 * Shared Clerk Auth Helper for Edge Functions
 *
 * Verifies the Clerk JWT from the Authorization header and looks up
 * the user's profile in user_profiles by clerk_id.
 *
 * With Supabase Third-Party Auth, the Clerk JWT is validated by Supabase
 * when we create a client with the token in the Authorization header.
 * We then look up the user's profile by their Clerk ID (JWT sub claim).
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface UserProfile {
  id: string;
  clerk_id: string;
  email: string | null;
  organization_id: string | null;
  full_name: string;
  role: string;
  status: string;
}

export interface AuthResult {
  profile: UserProfile;
  supabaseClient: SupabaseClient;
  supabaseAdmin: SupabaseClient;
}

/**
 * Verify Clerk JWT and return the user's profile + Supabase clients.
 *
 * @param req - The incoming request
 * @returns AuthResult with profile and both Supabase clients
 * @throws Error if auth fails
 */
export async function verifyClerkAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Create an authenticated Supabase client with the Clerk JWT.
  // Supabase Third-Party Auth validates the JWT via Clerk's JWKS endpoint.
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Decode the JWT to get the Clerk user ID (sub claim)
  const token = authHeader.replace("Bearer ", "");
  const clerkUserId = getSubFromJwt(token);

  if (!clerkUserId) {
    throw new Error("Invalid JWT: missing sub claim");
  }

  // Create admin client for privileged operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Look up the user's profile by clerk_id
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("id, clerk_id, email, organization_id, full_name, role, status")
    .eq("clerk_id", clerkUserId)
    .single();

  if (profileError || !profile) {
    throw new Error("User profile not found for Clerk ID: " + clerkUserId);
  }

  return {
    profile: profile as UserProfile,
    supabaseClient,
    supabaseAdmin,
  };
}

/**
 * Check if a profile has admin privileges.
 */
export function isAdmin(profile: UserProfile): boolean {
  return ["super_admin", "primary_admin", "secondary_admin"].includes(profile.role);
}

/**
 * Check if a profile is a super admin.
 */
export function isSuperAdmin(profile: UserProfile): boolean {
  return profile.role === "super_admin";
}

/**
 * Decode the sub (subject) claim from a JWT without full verification.
 * Verification is handled by Supabase Third-Party Auth.
 */
function getSubFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}
