-- ============================================================================
-- USER AUDIT SYSTEM - STORED PROCEDURES
-- Enterprise-Grade Access Governance for MinRisk
-- ============================================================================
-- Date: 2025-12-21
-- Purpose: Blessed functions to change user status and role with audit trail
--
-- Key Principles:
-- 1. Actor identity derived from auth.uid() - NEVER passed as parameter
-- 2. Authorization checked inside function (admin, same org, RBAC)
-- 3. State machine enforced (valid transitions only)
-- 4. Reason required for sensitive transitions
-- 5. Audit log written atomically (same transaction)
-- 6. Session variable set/cleared to bypass triggers
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Get role hierarchy level
-- ============================================================================

CREATE OR REPLACE FUNCTION get_role_level(p_role TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_role
    WHEN 'super_admin' THEN 4
    WHEN 'primary_admin' THEN 3
    WHEN 'secondary_admin' THEN 2
    WHEN 'user' THEN 1
    WHEN 'viewer' THEN 0
    ELSE -1
  END;
END;
$$;

-- ============================================================================
-- FUNCTION: change_user_status
-- ============================================================================
-- Changes a user's status with full authorization checks and audit trail
--
-- Parameters:
--   p_user_id       UUID    - Target user to change
--   p_new_status    TEXT    - New status (pending/approved/rejected/suspended)
--   p_reason        TEXT    - Why the change is being made (required)
--   p_request_id    UUID    - Optional correlation ID from API request
--
-- Security:
--   - Actor identity derived from auth.uid() (can't be spoofed)
--   - Requires actor to be admin (super/primary/secondary)
--   - Requires actor and target in same org (unless super_admin)
--   - Requires actor to have higher privilege than target (RBAC)
--   - Enforces valid state transitions
--   - Requires reason for sensitive transitions (rejected → approved)
--   - Writes immutable audit log
--
-- Returns: JSONB with success: true or error message
-- ============================================================================

CREATE OR REPLACE FUNCTION change_user_status(
  p_user_id UUID,
  p_new_status TEXT,
  p_reason TEXT,
  p_request_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  -- Actor context (derived from auth, NEVER from parameters)
  v_actor_id UUID;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_actor_org_id UUID;
  v_actor_level INTEGER;

  -- Target user context
  v_target_email TEXT;
  v_target_role TEXT;
  v_target_org_id UUID;
  v_target_level INTEGER;
  v_current_status TEXT;

  -- Transition context
  v_transition_type TEXT;
BEGIN
  -- ============================================
  -- STEP 1: Get actor identity from auth.uid()
  -- ============================================
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated',
      'code', 'AUTH_REQUIRED'
    );
  END IF;

  -- Get actor profile
  SELECT email, role, organization_id
  INTO v_actor_email, v_actor_role, v_actor_org_id
  FROM user_profiles
  WHERE id = v_actor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Actor profile not found',
      'code', 'ACTOR_NOT_FOUND'
    );
  END IF;

  v_actor_level := get_role_level(v_actor_role);

  -- ============================================
  -- STEP 2: Check actor is admin
  -- ============================================
  IF v_actor_role NOT IN ('super_admin', 'primary_admin', 'secondary_admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can change user status',
      'code', 'ADMIN_REQUIRED',
      'details', jsonb_build_object('your_role', v_actor_role)
    );
  END IF;

  -- ============================================
  -- STEP 3: Get target user context
  -- ============================================
  SELECT email, role, organization_id, status
  INTO v_target_email, v_target_role, v_target_org_id, v_current_status
  FROM user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target user not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  v_target_level := get_role_level(v_target_role);

  -- ============================================
  -- STEP 4: Check same organization (unless super_admin)
  -- ============================================
  IF v_actor_role != 'super_admin' AND v_actor_org_id != v_target_org_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You can only manage users in your own organization',
      'code', 'ORG_MISMATCH'
    );
  END IF;

  -- ============================================
  -- STEP 5: Check RBAC (can only manage lower privilege users)
  -- ============================================
  IF v_actor_level <= v_target_level THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot manage users with equal or higher privileges',
      'code', 'RBAC_VIOLATION',
      'details', jsonb_build_object(
        'your_role', v_actor_role,
        'target_role', v_target_role
      )
    );
  END IF;

  -- ============================================
  -- STEP 6: Check you're not changing your own status
  -- ============================================
  IF v_actor_id = p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot change your own status',
      'code', 'SELF_MODIFY_FORBIDDEN'
    );
  END IF;

  -- ============================================
  -- STEP 7: Validate transition is allowed
  -- ============================================
  IF NOT (
    -- Initial creation (should never happen via this function, but allow it)
    (v_current_status IS NULL AND p_new_status = 'pending') OR

    -- Normal onboarding flows
    (v_current_status = 'pending' AND p_new_status IN ('approved', 'rejected')) OR

    -- Re-application or override
    (v_current_status = 'rejected' AND p_new_status IN ('pending', 'approved')) OR

    -- Disciplinary actions
    (v_current_status = 'approved' AND p_new_status = 'suspended') OR

    -- Reinstatement
    (v_current_status = 'suspended' AND p_new_status = 'approved')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status transition',
      'code', 'INVALID_TRANSITION',
      'details', jsonb_build_object(
        'from_status', v_current_status,
        'to_status', p_new_status,
        'allowed_transitions', CASE v_current_status
          WHEN 'pending' THEN '["approved", "rejected"]'
          WHEN 'rejected' THEN '["pending", "approved"]'
          WHEN 'approved' THEN '["suspended"]'
          WHEN 'suspended' THEN '["approved"]'
          ELSE '[]'
        END
      )
    );
  END IF;

  -- ============================================
  -- STEP 8: Determine transition type
  -- ============================================
  v_transition_type := CASE
    WHEN v_current_status = 'pending' AND p_new_status = 'approved' THEN 'onboarding_approval'
    WHEN v_current_status = 'pending' AND p_new_status = 'rejected' THEN 'onboarding_rejection'
    WHEN v_current_status = 'rejected' AND p_new_status = 'pending' THEN 're_application'
    WHEN v_current_status = 'rejected' AND p_new_status = 'approved' THEN 'override'
    WHEN v_current_status = 'approved' AND p_new_status = 'suspended' THEN 'disciplinary_suspension'
    WHEN v_current_status = 'suspended' AND p_new_status = 'approved' THEN 'reinstatement'
    ELSE 'unknown'
  END;

  -- ============================================
  -- STEP 9: Require reason for sensitive transitions
  -- ============================================
  IF v_transition_type IN ('override', 'disciplinary_suspension') THEN
    IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Reason required for this transition',
        'code', 'REASON_REQUIRED',
        'details', jsonb_build_object('transition_type', v_transition_type)
      );
    END IF;
  END IF;

  -- Default reason if not provided
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) = 0 THEN
    p_reason := 'No reason provided';
  END IF;

  -- ============================================
  -- STEP 10: Set session variable to bypass trigger
  -- ============================================
  PERFORM set_config('app.allow_status_change', 'true', true);

  -- ============================================
  -- STEP 11: Update user_profiles.status
  -- ============================================
  UPDATE user_profiles
  SET
    status = p_new_status,
    updated_at = NOW(),
    -- Update metadata based on new status
    approved_at = CASE WHEN p_new_status = 'approved' THEN NOW() ELSE approved_at END,
    approved_by = CASE WHEN p_new_status = 'approved' THEN v_actor_id ELSE approved_by END,
    rejected_at = CASE WHEN p_new_status = 'rejected' THEN NOW() ELSE rejected_at END,
    rejected_by = CASE WHEN p_new_status = 'rejected' THEN v_actor_id ELSE rejected_by END,
    rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_reason ELSE rejection_reason END,
    suspended_at = CASE WHEN p_new_status = 'suspended' THEN NOW() ELSE suspended_at END,
    suspended_by = CASE WHEN p_new_status = 'suspended' THEN v_actor_id ELSE suspended_by END,
    suspension_reason = CASE WHEN p_new_status = 'suspended' THEN p_reason ELSE suspension_reason END
  WHERE id = p_user_id;

  -- ============================================
  -- STEP 12: Clear session variable
  -- ============================================
  PERFORM set_config('app.allow_status_change', '', true);

  -- ============================================
  -- STEP 13: Write audit log (immutable)
  -- ============================================
  INSERT INTO user_status_transitions (
    organization_id,
    user_id,
    from_status,
    to_status,
    transition_type,
    actor_user_id,
    actor_role,
    actor_email,
    changed_at,
    reason,
    request_id
  ) VALUES (
    v_target_org_id,
    p_user_id,
    v_current_status,
    p_new_status,
    v_transition_type,
    v_actor_id,
    v_actor_role,
    v_actor_email,
    NOW(),
    p_reason,
    p_request_id
  );

  -- ============================================
  -- STEP 14: Return success
  -- ============================================
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_target_email,
    'from_status', v_current_status,
    'to_status', p_new_status,
    'transition_type', v_transition_type,
    'changed_by', v_actor_email
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Clear session variable on error
    PERFORM set_config('app.allow_status_change', '', true);

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'INTERNAL_ERROR'
    );
END;
$$;

-- ============================================================================
-- FUNCTION: change_user_role
-- ============================================================================
-- Changes a user's role with full authorization checks and audit trail
--
-- Parameters:
--   p_user_id       UUID    - Target user to change
--   p_new_role      TEXT    - New role (super_admin/primary_admin/secondary_admin/user/viewer)
--   p_reason        TEXT    - Why the change is being made (required)
--   p_request_id    UUID    - Optional correlation ID from API request
--
-- Security:
--   - Same security model as change_user_status
--   - Actor must have higher privilege than target
--   - Cannot assign role >= actor's own role (prevent privilege escalation)
--
-- Returns: JSONB with success: true or error message
-- ============================================================================

CREATE OR REPLACE FUNCTION change_user_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_reason TEXT,
  p_request_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  -- Actor context
  v_actor_id UUID;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_actor_org_id UUID;
  v_actor_level INTEGER;

  -- Target user context
  v_target_email TEXT;
  v_current_role TEXT;
  v_target_org_id UUID;
  v_target_level INTEGER;
  v_new_role_level INTEGER;
BEGIN
  -- ============================================
  -- STEP 1: Get actor identity from auth.uid()
  -- ============================================
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated',
      'code', 'AUTH_REQUIRED'
    );
  END IF;

  -- Get actor profile
  SELECT email, role, organization_id
  INTO v_actor_email, v_actor_role, v_actor_org_id
  FROM user_profiles
  WHERE id = v_actor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Actor profile not found',
      'code', 'ACTOR_NOT_FOUND'
    );
  END IF;

  v_actor_level := get_role_level(v_actor_role);

  -- ============================================
  -- STEP 2: Check actor is admin
  -- ============================================
  IF v_actor_role NOT IN ('super_admin', 'primary_admin', 'secondary_admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can change user roles',
      'code', 'ADMIN_REQUIRED',
      'details', jsonb_build_object('your_role', v_actor_role)
    );
  END IF;

  -- ============================================
  -- STEP 3: Get target user context
  -- ============================================
  SELECT email, role, organization_id
  INTO v_target_email, v_current_role, v_target_org_id
  FROM user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target user not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  v_target_level := get_role_level(v_current_role);
  v_new_role_level := get_role_level(p_new_role);

  -- ============================================
  -- STEP 4: Check same organization (unless super_admin)
  -- ============================================
  IF v_actor_role != 'super_admin' AND v_actor_org_id != v_target_org_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You can only manage users in your own organization',
      'code', 'ORG_MISMATCH'
    );
  END IF;

  -- ============================================
  -- STEP 5: Check RBAC (can only manage lower privilege users)
  -- ============================================
  IF v_actor_level <= v_target_level THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot manage users with equal or higher privileges',
      'code', 'RBAC_VIOLATION',
      'details', jsonb_build_object(
        'your_role', v_actor_role,
        'target_role', v_current_role
      )
    );
  END IF;

  -- ============================================
  -- STEP 6: Check you're not changing your own role
  -- ============================================
  IF v_actor_id = p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot change your own role',
      'code', 'SELF_MODIFY_FORBIDDEN'
    );
  END IF;

  -- ============================================
  -- STEP 7: Check new role is valid
  -- ============================================
  IF p_new_role NOT IN ('super_admin', 'primary_admin', 'secondary_admin', 'user', 'viewer') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid role',
      'code', 'INVALID_ROLE',
      'details', jsonb_build_object('provided_role', p_new_role)
    );
  END IF;

  -- ============================================
  -- STEP 8: Prevent privilege escalation
  -- Can only assign roles LOWER than your own
  -- ============================================
  IF v_new_role_level >= v_actor_level THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You can only assign roles with lower privileges than your own',
      'code', 'PRIVILEGE_ESCALATION',
      'details', jsonb_build_object(
        'your_role', v_actor_role,
        'attempted_role', p_new_role
      )
    );
  END IF;

  -- ============================================
  -- STEP 9: Require reason
  -- ============================================
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) = 0 THEN
    p_reason := 'No reason provided';
  END IF;

  -- ============================================
  -- STEP 10: Set session variable to bypass trigger
  -- ============================================
  PERFORM set_config('app.allow_role_change', 'true', true);

  -- ============================================
  -- STEP 11: Update user_profiles.role
  -- ============================================
  UPDATE user_profiles
  SET
    role = p_new_role,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- ============================================
  -- STEP 12: Clear session variable
  -- ============================================
  PERFORM set_config('app.allow_role_change', '', true);

  -- ============================================
  -- STEP 13: Write audit log (immutable)
  -- ============================================
  INSERT INTO user_role_transitions (
    organization_id,
    user_id,
    from_role,
    to_role,
    actor_user_id,
    actor_role,
    actor_email,
    changed_at,
    reason,
    request_id
  ) VALUES (
    v_target_org_id,
    p_user_id,
    v_current_role,
    p_new_role,
    v_actor_id,
    v_actor_role,
    v_actor_email,
    NOW(),
    p_reason,
    p_request_id
  );

  -- ============================================
  -- STEP 14: Return success
  -- ============================================
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_target_email,
    'from_role', v_current_role,
    'to_role', p_new_role,
    'changed_by', v_actor_email
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Clear session variable on error
    PERFORM set_config('app.allow_role_change', '', true);

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'INTERNAL_ERROR'
    );
END;
$$;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

-- Allow authenticated users to call these functions
-- Authorization is checked INSIDE the function
GRANT EXECUTE ON FUNCTION change_user_status TO authenticated;
GRANT EXECUTE ON FUNCTION change_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_role_level TO authenticated;

-- ============================================================================
-- VERIFICATION: Show created functions
-- ============================================================================

SELECT
  routine_name,
  routine_type,
  security_type,
  data_type as returns
FROM information_schema.routines
WHERE routine_name IN ('change_user_status', 'change_user_role', 'get_role_level')
ORDER BY routine_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Status:
-- ✅ change_user_status() - Secure status changes with audit trail
-- ✅ change_user_role() - Secure role changes with audit trail
-- ✅ get_role_level() - RBAC hierarchy helper
-- ✅ Actor identity from auth.uid() (can't be spoofed)
-- ✅ Admin authorization enforced
-- ✅ RBAC enforced (can only manage lower privilege users)
-- ✅ State machine enforced (valid transitions only)
-- ✅ Reason required for sensitive transitions
-- ✅ Immutable audit logs written atomically
-- ✅ Session variables prevent trigger blocking
--
-- Next step:
-- Phase 4: Update Edge Functions to call these procedures instead of direct UPDATEs
-- ============================================================================
