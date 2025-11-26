-- ============================================================================
-- MinRisk v2 Database Migration - Actual Database Structure
-- ============================================================================
-- This migration works with the ACTUAL existing database structure
-- Database: minrisk-dev (Supabase)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: CREATE/UPDATE USER ROLES ENUM
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('primary_admin', 'secondary_admin', 'user', 'ORG_EDITOR', 'ORG_VIEWER', 'GUEST');
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORG_EDITOR' AND enumtypid = 'user_role'::regtype) THEN
            ALTER TYPE user_role ADD VALUE 'ORG_EDITOR';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORG_VIEWER' AND enumtypid = 'user_role'::regtype) THEN
            ALTER TYPE user_role ADD VALUE 'ORG_VIEWER';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GUEST' AND enumtypid = 'user_role'::regtype) THEN
            ALTER TYPE user_role ADD VALUE 'GUEST';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE BASE TABLES (IF NOT EXISTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id              uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       text,
  role            user_role NOT NULL DEFAULT 'user',
  status          text NOT NULL DEFAULT 'pending',
  approved_at     timestamptz,
  approved_by     uuid REFERENCES user_profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- ============================================================================
-- STEP 3: CREATE RLS HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id
  FROM user_profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM user_profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role::user_role
  FROM user_profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT current_user_role() IN ('primary_admin', 'secondary_admin');
$$;

-- ============================================================================
-- STEP 4: CREATE INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         user_role NOT NULL,
  invited_by   uuid NOT NULL REFERENCES user_profiles(id),
  token        text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  accepted_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT invitations_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- ============================================================================
-- STEP 5: ADD OWNER_PROFILE_ID TO EXISTING RISKS TABLE
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'risks' AND column_name = 'owner_profile_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN owner_profile_id uuid REFERENCES user_profiles(id);

        -- Try to backfill from user_id if it exists and references user_profiles
        UPDATE risks r
        SET owner_profile_id = r.user_id
        WHERE owner_profile_id IS NULL
        AND EXISTS (SELECT 1 FROM user_profiles WHERE id = r.user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_risks_org ON risks(organization_id);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);

-- ============================================================================
-- STEP 6: CREATE CONTROLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS controls (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_id               uuid NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  owner_profile_id      uuid REFERENCES user_profiles(id),
  name                  text NOT NULL,
  description           text,
  control_type          text,
  design_score          int CHECK (design_score BETWEEN 0 AND 3),
  implementation_score  int CHECK (implementation_score BETWEEN 0 AND 3),
  monitoring_score      int CHECK (monitoring_score BETWEEN 0 AND 3),
  evaluation_score      int CHECK (evaluation_score BETWEEN 0 AND 3),
  created_by_profile_id uuid REFERENCES user_profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_controls_org ON controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_controls_risk ON controls(risk_id);
CREATE INDEX IF NOT EXISTS idx_controls_owner ON controls(owner_profile_id);

-- ============================================================================
-- STEP 7: CREATE RISK ASSESSMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_assessments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_id               uuid NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  assessor_profile_id   uuid NOT NULL REFERENCES user_profiles(id),
  assessment_date       date NOT NULL,
  likelihood            int CHECK (likelihood BETWEEN 1 AND 5),
  impact                int CHECK (impact BETWEEN 1 AND 5),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessments_org ON risk_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_risk ON risk_assessments(risk_id);
CREATE INDEX IF NOT EXISTS idx_assessments_assessor ON risk_assessments(assessor_profile_id);

-- ============================================================================
-- STEP 8: CREATE HEATMAP CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS heatmap_config (
  organization_id       uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  likelihood_scale      int NOT NULL DEFAULT 5 CHECK (likelihood_scale BETWEEN 3 AND 10),
  impact_scale          int NOT NULL DEFAULT 5 CHECK (impact_scale BETWEEN 3 AND 10),
  scoring_scheme        jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 9: CREATE RISK SUMMARY VIEW
-- ============================================================================
CREATE OR REPLACE VIEW v_risk_summary AS
SELECT
  r.organization_id,
  r.id as risk_id,
  r.category,
  r.status,
  r.likelihood_inherent as residual_likelihood,
  r.impact_inherent as residual_impact
FROM risks r;

-- ============================================================================
-- STEP 10: IMPLEMENT RLS POLICIES
-- ============================================================================

-- 10.1: PROFILES RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_profiles_in_org" ON user_profiles;
CREATE POLICY "admin_select_profiles_in_org"
ON user_profiles FOR SELECT
USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "user_select_own_profile" ON user_profiles;
CREATE POLICY "user_select_own_profile"
ON user_profiles FOR SELECT
USING (id = current_profile_id());

DROP POLICY IF EXISTS "admin_update_profiles_in_org" ON user_profiles;
CREATE POLICY "admin_update_profiles_in_org"
ON user_profiles FOR UPDATE
USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "user_update_own_profile" ON user_profiles;
CREATE POLICY "user_update_own_profile"
ON user_profiles FOR UPDATE
USING (id = current_profile_id());

-- 10.2: RISKS RLS
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_all_org_risks" ON risks;
CREATE POLICY "admin_select_all_org_risks"
ON risks FOR SELECT
USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "user_select_own_risks" ON risks;
CREATE POLICY "user_select_own_risks"
ON risks FOR SELECT
USING (owner_profile_id = current_profile_id());

DROP POLICY IF EXISTS "admin_insert_risks" ON risks;
CREATE POLICY "admin_insert_risks"
ON risks FOR INSERT
WITH CHECK (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "editor_insert_own_risks" ON risks;
CREATE POLICY "editor_insert_own_risks"
ON risks FOR INSERT
WITH CHECK (
  organization_id = current_org_id()
  AND current_user_role() = 'ORG_EDITOR'
  AND owner_profile_id = current_profile_id()
);

DROP POLICY IF EXISTS "admin_update_org_risks" ON risks;
CREATE POLICY "admin_update_org_risks"
ON risks FOR UPDATE
USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "editor_update_own_risks" ON risks;
CREATE POLICY "editor_update_own_risks"
ON risks FOR UPDATE
USING (
  owner_profile_id = current_profile_id()
  AND current_user_role() = 'ORG_EDITOR'
);

-- 10.3: CONTROLS RLS
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_org_controls" ON controls;
CREATE POLICY "admin_select_org_controls"
ON controls FOR SELECT
USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "user_select_own_controls" ON controls;
CREATE POLICY "user_select_own_controls"
ON controls FOR SELECT
USING (owner_profile_id = current_profile_id());

DROP POLICY IF EXISTS "admin_modify_controls" ON controls;
CREATE POLICY "admin_modify_controls"
ON controls FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id());

DROP POLICY IF EXISTS "editor_modify_own_controls" ON controls;
CREATE POLICY "editor_modify_own_controls"
ON controls FOR ALL
USING (owner_profile_id = current_profile_id() AND current_user_role() = 'ORG_EDITOR')
WITH CHECK (owner_profile_id = current_profile_id());

-- 10.4: RISK ASSESSMENTS RLS
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_org_assessments" ON risk_assessments;
CREATE POLICY "admin_select_org_assessments"
ON risk_assessments FOR SELECT
USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "user_select_own_assessments" ON risk_assessments;
CREATE POLICY "user_select_own_assessments"
ON risk_assessments FOR SELECT
USING (assessor_profile_id = current_profile_id());

-- 10.5: INVITATIONS RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_invitations" ON invitations;
CREATE POLICY "admin_manage_invitations"
ON invitations FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id() AND is_admin());

-- ============================================================================
-- STEP 11: CREATE ACCEPT INVITATION RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation invitations;
  v_profile_id uuid;
BEGIN
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  SELECT id INTO v_profile_id
  FROM user_profiles
  WHERE id = auth.uid();

  IF FOUND THEN
    RAISE EXCEPTION 'User already has a profile';
  END IF;

  INSERT INTO user_profiles (id, organization_id, role, full_name, status)
  VALUES (
    auth.uid(),
    v_invitation.organization_id,
    v_invitation.role,
    NULL,
    'approved'
  )
  RETURNING id INTO v_profile_id;

  UPDATE invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'org_id', v_invitation.organization_id,
    'role', v_invitation.role
  );
END;
$$;

-- ============================================================================
-- STEP 12: UPDATE TIMESTAMPS TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_risks_updated_at ON risks;
CREATE TRIGGER update_risks_updated_at
BEFORE UPDATE ON risks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_controls_updated_at ON controls;
CREATE TRIGGER update_controls_updated_at
BEFORE UPDATE ON controls
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
