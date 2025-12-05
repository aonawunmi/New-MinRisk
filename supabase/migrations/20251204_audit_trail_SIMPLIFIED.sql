-- Audit Trail System Migration (SIMPLIFIED)
-- Creates comprehensive audit logging for all system actions
-- Date: 2025-12-04
-- USE THIS IF THE FULL MIGRATION FAILS

-- =====================================================
-- STEP 1: CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_code TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 2: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_at ON audit_trail(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_type ON audit_trail(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type ON audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_code ON audit_trail(entity_code);
CREATE INDEX IF NOT EXISTS idx_audit_trail_org_time ON audit_trail(organization_id, performed_at DESC);

-- =====================================================
-- STEP 3: RLS POLICIES
-- =====================================================

ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit trail in their org"
ON audit_trail FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "System can insert audit entries"
ON audit_trail FOR INSERT TO authenticated
WITH CHECK (true);

-- =====================================================
-- STEP 4: MANUAL LOGGING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION log_audit_entry(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_code TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
  END IF;

  -- Get user's organization
  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization';
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
    v_org_id,
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
-- STEP 5: AUTO-LOGGING TRIGGERS (RISKS)
-- =====================================================

CREATE OR REPLACE FUNCTION audit_risks_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_org_id := NEW.organization_id;

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
      v_org_id,
      v_user_id,
      'create',
      'risk',
      NEW.id,
      NEW.risk_code,
      to_jsonb(NEW),
      NOW()
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_org_id := NEW.organization_id;

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
      v_org_id,
      v_user_id,
      'update',
      'risk',
      NEW.id,
      NEW.risk_code,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;

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
      v_org_id,
      v_user_id,
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

-- Create trigger
DROP TRIGGER IF EXISTS audit_risks_trigger ON risks;
CREATE TRIGGER audit_risks_trigger
  AFTER INSERT OR UPDATE OR DELETE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION audit_risks_trigger();

-- =====================================================
-- STEP 6: AUTO-LOGGING TRIGGERS (CONTROLS)
-- =====================================================

CREATE OR REPLACE FUNCTION audit_controls_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_org_id := NEW.organization_id;

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
      v_org_id,
      v_user_id,
      'create',
      'control',
      NEW.id,
      NEW.control_code,
      to_jsonb(NEW),
      NOW()
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_org_id := NEW.organization_id;

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
      v_org_id,
      v_user_id,
      'update',
      'control',
      NEW.id,
      NEW.control_code,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;

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
      v_org_id,
      v_user_id,
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

-- Create trigger
DROP TRIGGER IF EXISTS audit_controls_trigger ON controls;
CREATE TRIGGER audit_controls_trigger
  AFTER INSERT OR UPDATE OR DELETE ON controls
  FOR EACH ROW
  EXECUTE FUNCTION audit_controls_trigger();

-- =====================================================
-- STEP 7: AUTO-LOGGING TRIGGERS (USER PROFILES)
-- =====================================================

CREATE OR REPLACE FUNCTION audit_user_profiles_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_org_id := NEW.organization_id;

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
      v_org_id,
      v_user_id,
      'create',
      'user',
      NEW.id,
      NEW.full_name,
      to_jsonb(NEW),
      NOW()
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_org_id := NEW.organization_id;

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
      v_org_id,
      v_user_id,
      'update',
      'user',
      NEW.id,
      NEW.full_name,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;

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
      v_org_id,
      v_user_id,
      'delete',
      'user',
      OLD.id,
      OLD.full_name,
      to_jsonb(OLD),
      NOW()
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
CREATE TRIGGER audit_user_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_profiles_trigger();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- You can verify the migration with:
-- SELECT COUNT(*) FROM audit_trail; -- Should return 0
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%'; -- Should show 3 triggers
