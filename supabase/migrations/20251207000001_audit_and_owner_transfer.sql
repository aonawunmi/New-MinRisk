-- =====================================================
-- AUDIT TRAIL + OWNER TRANSFER TRACKING
-- Combined Migration: Audit logging + Owner transfer history
-- Date: 2025-12-07
-- =====================================================

-- =====================================================
-- PART 1: AUDIT TRAIL SYSTEM
-- =====================================================

-- Create audit_trail table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_at ON audit_trail(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_type ON audit_trail(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type ON audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_code ON audit_trail(entity_code);
CREATE INDEX IF NOT EXISTS idx_audit_trail_org_time ON audit_trail(organization_id, performed_at DESC);

-- Enable RLS
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view audit trail in their org
DROP POLICY IF EXISTS "Users can view audit trail in their org" ON audit_trail;
CREATE POLICY "Users can view audit trail in their org"
ON audit_trail FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: System can insert audit entries
DROP POLICY IF EXISTS "System can insert audit entries" ON audit_trail;
CREATE POLICY "System can insert audit entries"
ON audit_trail FOR INSERT TO authenticated
WITH CHECK (true);

-- Manual logging function
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

-- Trigger function for risks
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

-- Create trigger for risks
DROP TRIGGER IF EXISTS audit_risks_trigger ON risks;
CREATE TRIGGER audit_risks_trigger
  AFTER INSERT OR UPDATE OR DELETE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION audit_risks_trigger();

-- Trigger function for controls
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

-- Create trigger for controls
DROP TRIGGER IF EXISTS audit_controls_trigger ON controls;
CREATE TRIGGER audit_controls_trigger
  AFTER INSERT OR UPDATE OR DELETE ON controls
  FOR EACH ROW
  EXECUTE FUNCTION audit_controls_trigger();

-- Trigger function for user_profiles
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

-- Create trigger for user_profiles
DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
CREATE TRIGGER audit_user_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_profiles_trigger();

-- =====================================================
-- PART 2: OWNER TRANSFER TRACKING
-- =====================================================

-- Create risk_owner_history table
CREATE TABLE IF NOT EXISTS risk_owner_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID REFERENCES risks(id) ON DELETE CASCADE,
  risk_code TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  previous_owner_id UUID REFERENCES auth.users(id),
  previous_owner_email TEXT,
  new_owner_id UUID REFERENCES auth.users(id),
  new_owner_email TEXT,
  transferred_by UUID REFERENCES auth.users(id),
  transferred_by_email TEXT,
  transferred_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  automated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_owner_history_risk ON risk_owner_history(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_owner_history_org ON risk_owner_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_owner_history_transferred_at ON risk_owner_history(transferred_at DESC);

-- Enable RLS
ALTER TABLE risk_owner_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view transfer history in their org
DROP POLICY IF EXISTS "Users can view transfer history in their org" ON risk_owner_history;
CREATE POLICY "Users can view transfer history in their org"
ON risk_owner_history FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: System can insert transfer records
DROP POLICY IF EXISTS "System can insert transfer records" ON risk_owner_history;
CREATE POLICY "System can insert transfer records"
ON risk_owner_history FOR INSERT TO authenticated
WITH CHECK (true);

-- Trigger function for owner transfers
CREATE OR REPLACE FUNCTION log_owner_transfer()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_email TEXT;
  v_new_email TEXT;
  v_transferrer_email TEXT;
BEGIN
  -- Only log if owner_id actually changed
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN

    -- Get previous owner email
    IF OLD.owner_id IS NOT NULL THEN
      SELECT email INTO v_prev_email
      FROM auth.users
      WHERE id = OLD.owner_id;
    END IF;

    -- Get new owner email
    IF NEW.owner_id IS NOT NULL THEN
      SELECT email INTO v_new_email
      FROM auth.users
      WHERE id = NEW.owner_id;
    END IF;

    -- Get current user email (who made the change)
    SELECT email INTO v_transferrer_email
    FROM auth.users
    WHERE id = auth.uid();

    -- Insert transfer record
    INSERT INTO risk_owner_history (
      risk_id,
      risk_code,
      organization_id,
      previous_owner_id,
      previous_owner_email,
      new_owner_id,
      new_owner_email,
      transferred_by,
      transferred_by_email,
      transferred_at,
      automated
    ) VALUES (
      NEW.id,
      NEW.risk_code,
      NEW.organization_id,
      OLD.owner_id,
      v_prev_email,
      NEW.owner_id,
      v_new_email,
      auth.uid(),
      v_transferrer_email,
      NOW(),
      FALSE
    );

    -- Also log to main audit trail
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      action_type,
      entity_type,
      entity_id,
      entity_code,
      metadata,
      performed_at
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'transfer_owner',
      'risk',
      NEW.id,
      NEW.risk_code,
      jsonb_build_object(
        'previous_owner', v_prev_email,
        'new_owner', v_new_email,
        'risk_title', NEW.risk_title
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for owner transfers
DROP TRIGGER IF EXISTS track_owner_transfers ON risks;
CREATE TRIGGER track_owner_transfers
  AFTER UPDATE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION log_owner_transfer();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- You can verify the migration with:
-- SELECT COUNT(*) FROM audit_trail;
-- SELECT COUNT(*) FROM risk_owner_history;
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%' OR tgname = 'track_owner_transfers';

-- Expected: 4 triggers (audit_risks_trigger, audit_controls_trigger, audit_user_profiles_trigger, track_owner_transfers)
