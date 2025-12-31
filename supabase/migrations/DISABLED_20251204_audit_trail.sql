-- Audit Trail System Migration
-- Creates comprehensive audit logging for all system actions
-- Date: 2025-12-04

-- =====================================================
-- AUDIT TRAIL TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL, -- create, update, delete, archive, restore, approve, reject, etc.
  entity_type TEXT NOT NULL, -- risk, control, user, incident, kri, config, etc.
  entity_id UUID,
  entity_code TEXT, -- risk_code, control_code, etc.

  -- Change tracking
  old_values JSONB, -- Before state (for updates/deletes)
  new_values JSONB, -- After state (for creates/updates)
  metadata JSONB, -- Additional context (reason, notes, etc.)

  -- Session info
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_at ON audit_trail(performed_at DESC);

-- Filtering indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_type ON audit_trail(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type ON audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_code ON audit_trail(entity_code);

-- Composite index for common query pattern (org + time)
CREATE INDEX IF NOT EXISTS idx_audit_trail_org_time ON audit_trail(organization_id, performed_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Users can only view audit trail for their organization
CREATE POLICY "Users can view their organization's audit trail"
  ON audit_trail
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Only system can insert audit entries (via triggers or functions)
-- Users call logAuditEntry function which has SECURITY DEFINER
CREATE POLICY "System can insert audit entries"
  ON audit_trail
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No updates or deletes allowed (immutable log)
-- If cleanup needed, admin uses database tools directly

-- =====================================================
-- HELPER FUNCTION: Manual Audit Logging
-- =====================================================

CREATE OR REPLACE FUNCTION log_audit_entry(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_code TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_organization_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's organization
  SELECT organization_id INTO v_organization_id
  FROM user_profiles
  WHERE id = v_user_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Insert audit entry
  INSERT INTO audit_trail (
    organization_id,
    user_id,
    action_type,
    entity_type,
    entity_code,
    metadata,
    performed_at
  ) VALUES (
    v_organization_id,
    v_user_id,
    p_action_type,
    p_entity_type,
    p_entity_code,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUTOMATIC TRIGGERS FOR RISK CHANGES
-- =====================================================

-- Function to audit risk changes
CREATE OR REPLACE FUNCTION audit_risks_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      entity_code,
      new_values,
      performed_at
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'create',
      'risk',
      NEW.id,
      NEW.risk_code,
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      entity_code,
      old_values,
      new_values,
      performed_at
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'update',
      'risk',
      NEW.id,
      NEW.risk_code,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      entity_code,
      old_values,
      performed_at
    ) VALUES (
      OLD.organization_id,
      auth.uid(),
      'delete',
      'risk',
      OLD.id,
      OLD.risk_code,
      to_jsonb(OLD),
      NOW()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to risks table
DROP TRIGGER IF EXISTS audit_risks_changes ON risks;
CREATE TRIGGER audit_risks_changes
  AFTER INSERT OR UPDATE OR DELETE ON risks
  FOR EACH ROW EXECUTE FUNCTION audit_risks_trigger();

-- =====================================================
-- AUTOMATIC TRIGGERS FOR CONTROL CHANGES
-- =====================================================

-- Function to audit control changes
CREATE OR REPLACE FUNCTION audit_controls_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      entity_code,
      new_values,
      performed_at
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'create',
      'control',
      NEW.id,
      NEW.control_code,
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      entity_code,
      old_values,
      new_values,
      performed_at
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'update',
      'control',
      NEW.id,
      NEW.control_code,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      entity_code,
      old_values,
      performed_at
    ) VALUES (
      OLD.organization_id,
      auth.uid(),
      'delete',
      'control',
      OLD.id,
      OLD.control_code,
      to_jsonb(OLD),
      NOW()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to controls table
DROP TRIGGER IF EXISTS audit_controls_changes ON controls;
CREATE TRIGGER audit_controls_changes
  AFTER INSERT OR UPDATE OR DELETE ON controls
  FOR EACH ROW EXECUTE FUNCTION audit_controls_trigger();

-- =====================================================
-- AUTOMATIC TRIGGERS FOR USER PROFILE CHANGES
-- =====================================================

-- Function to audit user profile changes
CREATE OR REPLACE FUNCTION audit_users_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      new_values,
      performed_at
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'create',
      'user',
      NEW.id,
      jsonb_build_object(
        'full_name', NEW.full_name,
        'role', NEW.role,
        'status', NEW.status
      ),
      NOW()
    );
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log significant changes (role, status)
    IF OLD.role != NEW.role OR OLD.status != NEW.status THEN
      INSERT INTO audit_trail (
        organization_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_values,
        new_values,
        performed_at
      ) VALUES (
        NEW.organization_id,
        auth.uid(),
        'update',
        'user',
        NEW.id,
        jsonb_build_object(
          'role', OLD.role,
          'status', OLD.status
        ),
        jsonb_build_object(
          'role', NEW.role,
          'status', NEW.status
        ),
        NOW()
      );
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      old_values,
      performed_at
    ) VALUES (
      OLD.organization_id,
      auth.uid(),
      'delete',
      'user',
      OLD.id,
      jsonb_build_object(
        'full_name', OLD.full_name,
        'role', OLD.role
      ),
      NOW()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to user_profiles table
DROP TRIGGER IF EXISTS audit_users_changes ON user_profiles;
CREATE TRIGGER audit_users_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_users_trigger();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE audit_trail IS 'Comprehensive audit log of all system actions for compliance and security';
COMMENT ON COLUMN audit_trail.action_type IS 'Type of action: create, update, delete, archive, restore, approve, reject, etc.';
COMMENT ON COLUMN audit_trail.entity_type IS 'Entity affected: risk, control, user, incident, kri, config, etc.';
COMMENT ON COLUMN audit_trail.old_values IS 'State before change (JSONB) - for updates and deletes';
COMMENT ON COLUMN audit_trail.new_values IS 'State after change (JSONB) - for creates and updates';
COMMENT ON COLUMN audit_trail.metadata IS 'Additional context: reasons, notes, related entities';

COMMENT ON FUNCTION log_audit_entry IS 'Manual audit logging from client-side code for actions not covered by triggers';
COMMENT ON FUNCTION audit_risks_trigger IS 'Automatic audit logging for all risk table changes';
COMMENT ON FUNCTION audit_controls_trigger IS 'Automatic audit logging for all control table changes';
COMMENT ON FUNCTION audit_users_trigger IS 'Automatic audit logging for user profile changes (role, status)';
