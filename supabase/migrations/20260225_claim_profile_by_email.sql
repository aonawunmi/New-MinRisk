-- Migration: claim_profile_by_email
-- Purpose: Auto-link invited users to their pending profile on Clerk signup
-- Called by: src/lib/auth.ts useAuth() hook after Clerk signup
--
-- Flow:
--   1. Admin invites user → creates user_profiles row (status: 'pending_invite')
--   2. User signs up via Clerk → useAuth() can't find profile by clerk_id
--   3. useAuth() calls this RPC with the user's email
--   4. This function finds the pending_invite profile, links clerk_id, sets status='approved'
--   5. User gets immediate access (admin pre-approved by sending the invite)
--
-- SECURITY: SECURITY DEFINER so it can update profiles regardless of RLS.
-- The function validates auth.jwt() is present before proceeding.

CREATE OR REPLACE FUNCTION claim_profile_by_email(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clerk_id TEXT;
  v_profile_id UUID;
  v_current_status TEXT;
BEGIN
  -- Extract clerk_id from the JWT (set by Clerk Third-Party Auth)
  v_clerk_id := auth.jwt() ->> 'sub';

  IF v_clerk_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'error', 'Not authenticated');
  END IF;

  -- Normalize email to lowercase for matching
  p_email := lower(trim(p_email));

  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'No email provided');
  END IF;

  -- Check if this clerk_id already has a profile (prevent double-claim)
  SELECT id INTO v_profile_id
  FROM user_profiles
  WHERE clerk_id = v_clerk_id
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'Clerk ID already linked to a profile');
  END IF;

  -- Find a pending_invite profile matching this email
  SELECT id, status INTO v_profile_id, v_current_status
  FROM user_profiles
  WHERE lower(trim(email)) = p_email
    AND status = 'pending_invite'
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'No pending invitation found for this email');
  END IF;

  -- Link the Clerk ID and approve the profile
  UPDATE user_profiles
  SET clerk_id = v_clerk_id,
      status = 'approved',
      updated_at = NOW()
  WHERE id = v_profile_id;

  -- Also update the user_invitations record if one exists
  UPDATE user_invitations
  SET status = 'used',
      used_by = v_profile_id,
      used_at = NOW()
  WHERE lower(trim(email)) = p_email
    AND status = 'pending';

  RETURN jsonb_build_object('claimed', true);
END;
$$;

-- Grant execute to authenticated users (they need to call this after Clerk signup)
GRANT EXECUTE ON FUNCTION claim_profile_by_email(TEXT) TO authenticated;

-- Also grant to anon role in case the JWT is being processed during the transition
GRANT EXECUTE ON FUNCTION claim_profile_by_email(TEXT) TO anon;
