-- =====================================================
-- FUNCTION: create_invitation_admin
-- =====================================================
-- Purpose: Edge Function-compatible version of create_invitation()
-- Difference: Accepts p_created_by as parameter instead of using auth.uid()
-- This is needed because Edge Functions use the service role which
-- doesn't have an auth.uid() context.
--
-- Created: 2026-02-16
-- Part of: Auth/Invitation Overhaul
-- =====================================================

CREATE OR REPLACE FUNCTION create_invitation_admin(
  p_email VARCHAR(255),
  p_organization_id UUID,
  p_role VARCHAR(50),
  p_created_by UUID,
  p_expires_in_days INTEGER DEFAULT 7,
  p_notes TEXT DEFAULT NULL
)
RETURNS user_invitations AS $$
DECLARE
  v_code VARCHAR(8);
  v_expires_at TIMESTAMPTZ;
  v_invitation user_invitations;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  -- Calculate expiry
  v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;

  -- Generate unique invite code (retry on collision)
  LOOP
    v_code := generate_invite_code();
    v_attempt := v_attempt + 1;

    -- Check if code exists
    IF NOT EXISTS (SELECT 1 FROM user_invitations WHERE invite_code = v_code) THEN
      EXIT;
    END IF;

    -- Prevent infinite loop
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
    END IF;
  END LOOP;

  -- Create invitation record
  INSERT INTO user_invitations (
    invite_code,
    email,
    organization_id,
    role,
    status,
    expires_at,
    created_by,
    notes
  ) VALUES (
    v_code,
    LOWER(TRIM(p_email)),
    p_organization_id,
    p_role,
    'pending',
    v_expires_at,
    p_created_by,
    p_notes
  )
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
