-- =====================================================
-- USER INVITATION SYSTEM
-- =====================================================
-- Feature: Admin-generated invite codes for new users
-- Purpose: Allow admins to pre-approve users via invite codes
-- Benefit: Bypass pending approval flow for invited users
--
-- Created: 2025-12-05
-- Part of: Feature 3 - User Invitation (Option B Implementation)
-- =====================================================

-- =====================================================
-- TABLE: user_invitations
-- =====================================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invitation details
  invite_code VARCHAR(8) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,

  -- Organization and role
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'secondary_admin', 'primary_admin')),

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'revoked', 'expired')),

  -- Usage tracking
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,

  -- Audit fields
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,

  -- Metadata
  notes TEXT,

  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT used_fields_consistency CHECK (
    (status = 'used' AND used_by IS NOT NULL AND used_at IS NOT NULL) OR
    (status != 'used' AND used_by IS NULL AND used_at IS NULL)
  ),
  CONSTRAINT revoked_fields_consistency CHECK (
    (status = 'revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL) OR
    (status != 'revoked')
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Fast lookup by invite code (primary use case)
CREATE INDEX idx_invitations_code ON user_invitations(invite_code);

-- Fast lookup by email (check existing invites)
CREATE INDEX idx_invitations_email ON user_invitations(email);

-- Fast lookup by organization (admin list view)
CREATE INDEX idx_invitations_org_status ON user_invitations(organization_id, status);

-- Fast lookup by status (filter views)
CREATE INDEX idx_invitations_status ON user_invitations(status);

-- Fast lookup by expiry (cleanup job)
CREATE INDEX idx_invitations_expiry ON user_invitations(expires_at) WHERE status = 'pending';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view invitations in their organization
CREATE POLICY "Admins can view organization invitations"
ON user_invitations
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
      AND role IN ('primary_admin', 'secondary_admin')
      AND status = 'approved'
  )
);

-- Policy: Admins can create invitations for their organization
CREATE POLICY "Admins can create invitations"
ON user_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
      AND role IN ('primary_admin', 'secondary_admin')
      AND status = 'approved'
  )
  AND created_by = auth.uid()
);

-- Policy: Admins can update invitations in their organization (revoke)
CREATE POLICY "Admins can update organization invitations"
ON user_invitations
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
      AND role IN ('primary_admin', 'secondary_admin')
      AND status = 'approved'
  )
);

-- Policy: Public can validate invite codes (for signup flow)
-- This is handled by the validate_invitation function below

-- =====================================================
-- FUNCTION: Generate random 8-character invite code
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars (0,O,1,I)
  code VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(characters, floor(random() * length(characters) + 1)::int, 1);
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================
-- FUNCTION: Create invitation
-- =====================================================

CREATE OR REPLACE FUNCTION create_invitation(
  p_email VARCHAR(255),
  p_organization_id UUID,
  p_role VARCHAR(50),
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

  -- Create invitation
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
    auth.uid(),
    p_notes
  )
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Validate invitation (public - used during signup)
-- =====================================================

CREATE OR REPLACE FUNCTION validate_invitation(
  p_invite_code VARCHAR(8),
  p_email VARCHAR(255)
)
RETURNS TABLE (
  is_valid BOOLEAN,
  invitation_id UUID,
  organization_id UUID,
  role VARCHAR(50),
  error_message TEXT
) AS $$
DECLARE
  v_invitation user_invitations;
BEGIN
  -- Find invitation
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE invite_code = UPPER(TRIM(p_invite_code))
    AND LOWER(TRIM(email)) = LOWER(TRIM(p_email));

  -- Check if invitation exists
  IF v_invitation.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::VARCHAR(50), 'Invalid invitation code or email'::TEXT;
    RETURN;
  END IF;

  -- Check status
  IF v_invitation.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::VARCHAR(50),
      'Invitation has already been ' || v_invitation.status::TEXT;
    RETURN;
  END IF;

  -- Check expiry
  IF v_invitation.expires_at < NOW() THEN
    -- Auto-expire the invitation
    UPDATE user_invitations
    SET status = 'expired'
    WHERE id = v_invitation.id;

    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::VARCHAR(50), 'Invitation has expired'::TEXT;
    RETURN;
  END IF;

  -- Valid invitation
  RETURN QUERY SELECT TRUE, v_invitation.id, v_invitation.organization_id,
    v_invitation.role, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Use invitation (mark as used after signup)
-- =====================================================

CREATE OR REPLACE FUNCTION use_invitation(
  p_invite_code VARCHAR(8),
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE user_invitations
  SET
    status = 'used',
    used_by = p_user_id,
    used_at = NOW()
  WHERE invite_code = UPPER(TRIM(p_invite_code))
    AND status = 'pending'
    AND expires_at > NOW()
  RETURNING 1 INTO v_updated;

  RETURN v_updated IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Revoke invitation
-- =====================================================

CREATE OR REPLACE FUNCTION revoke_invitation(
  p_invitation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE user_invitations
  SET
    status = 'revoked',
    revoked_by = auth.uid(),
    revoked_at = NOW(),
    revoke_reason = p_reason
  WHERE id = p_invitation_id
    AND status = 'pending'
  RETURNING 1 INTO v_updated;

  RETURN v_updated IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Cleanup expired invitations (scheduled job)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_invitations IS 'Admin-generated invitation codes for pre-approved user registration';
COMMENT ON COLUMN user_invitations.invite_code IS 'Unique 8-character code (uppercase, no confusing chars)';
COMMENT ON COLUMN user_invitations.email IS 'Email address this invitation is for (case-insensitive)';
COMMENT ON COLUMN user_invitations.status IS 'pending: unused, used: registered, revoked: cancelled by admin, expired: past expiry date';
COMMENT ON COLUMN user_invitations.expires_at IS 'Invitation becomes invalid after this timestamp';

COMMENT ON FUNCTION create_invitation IS 'Create a new invitation code (admin only, via RLS)';
COMMENT ON FUNCTION validate_invitation IS 'Check if invitation code is valid for given email (public, used during signup)';
COMMENT ON FUNCTION use_invitation IS 'Mark invitation as used after successful signup (system function)';
COMMENT ON FUNCTION revoke_invitation IS 'Cancel a pending invitation (admin only)';
COMMENT ON FUNCTION cleanup_expired_invitations IS 'Mark expired pending invitations as expired (scheduled job)';
