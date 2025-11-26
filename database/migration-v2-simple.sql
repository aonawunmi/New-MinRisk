-- ============================================================================
-- MinRisk v2 Simple Migration - Works with existing structure
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ADD OWNER_PROFILE_ID TO RISKS
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'risks' AND column_name = 'owner_profile_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN owner_profile_id uuid REFERENCES user_profiles(id);

        -- Backfill from user_id
        UPDATE risks r
        SET owner_profile_id = r.user_id
        WHERE owner_profile_id IS NULL
        AND EXISTS (SELECT 1 FROM user_profiles WHERE id = r.user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner_profile_id);

-- ============================================================================
-- STEP 2: CREATE RLS HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT current_user_role() IN ('primary_admin', 'secondary_admin');
$$;

-- ============================================================================
-- STEP 3: CREATE INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL,
  invited_by      uuid NOT NULL REFERENCES user_profiles(id),
  token           text NOT NULL UNIQUE,
  expires_at      timestamptz NOT NULL,
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);

-- ============================================================================
-- STEP 4: CREATE CONTROLS TABLE
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
-- STEP 5: CREATE RISK ASSESSMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_assessments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_id             uuid NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  assessor_profile_id uuid NOT NULL REFERENCES user_profiles(id),
  assessment_date     date NOT NULL,
  likelihood          int CHECK (likelihood BETWEEN 1 AND 5),
  impact              int CHECK (impact BETWEEN 1 AND 5),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessments_org ON risk_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_risk ON risk_assessments(risk_id);

-- ============================================================================
-- STEP 6: CREATE HEATMAP CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS heatmap_config (
  organization_id  uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  likelihood_scale int NOT NULL DEFAULT 5 CHECK (likelihood_scale BETWEEN 3 AND 10),
  impact_scale     int NOT NULL DEFAULT 5 CHECK (impact_scale BETWEEN 3 AND 10),
  scoring_scheme   jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 7: ENABLE RLS ON TABLES
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: CREATE RLS POLICIES - PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "admin_select_profiles_in_org" ON user_profiles;
CREATE POLICY "admin_select_profiles_in_org"
ON user_profiles FOR SELECT
USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "user_select_own_profile" ON user_profiles;
CREATE POLICY "user_select_own_profile"
ON user_profiles FOR SELECT
USING (id = current_profile_id());

DROP POLICY IF EXISTS "admin_update_profiles" ON user_profiles;
CREATE POLICY "admin_update_profiles"
ON user_profiles FOR UPDATE
USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "user_update_own_profile" ON user_profiles;
CREATE POLICY "user_update_own_profile"
ON user_profiles FOR UPDATE
USING (id = current_profile_id());

-- ============================================================================
-- STEP 9: CREATE RLS POLICIES - RISKS
-- ============================================================================
DROP POLICY IF EXISTS "admin_all_org_risks" ON risks;
CREATE POLICY "admin_all_org_risks"
ON risks FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "user_own_risks" ON risks;
CREATE POLICY "user_own_risks"
ON risks FOR ALL
USING (owner_profile_id = current_profile_id())
WITH CHECK (owner_profile_id = current_profile_id());

-- ============================================================================
-- STEP 10: CREATE RLS POLICIES - CONTROLS
-- ============================================================================
DROP POLICY IF EXISTS "admin_all_controls" ON controls;
CREATE POLICY "admin_all_controls"
ON controls FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id());

DROP POLICY IF EXISTS "user_own_controls" ON controls;
CREATE POLICY "user_own_controls"
ON controls FOR ALL
USING (owner_profile_id = current_profile_id())
WITH CHECK (owner_profile_id = current_profile_id());

-- ============================================================================
-- STEP 11: CREATE RLS POLICIES - ASSESSMENTS
-- ============================================================================
DROP POLICY IF EXISTS "admin_all_assessments" ON risk_assessments;
CREATE POLICY "admin_all_assessments"
ON risk_assessments FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id());

DROP POLICY IF EXISTS "user_own_assessments" ON risk_assessments;
CREATE POLICY "user_own_assessments"
ON risk_assessments FOR SELECT
USING (assessor_profile_id = current_profile_id());

-- ============================================================================
-- STEP 12: CREATE RLS POLICIES - INVITATIONS
-- ============================================================================
DROP POLICY IF EXISTS "admin_invitations" ON invitations;
CREATE POLICY "admin_invitations"
ON invitations FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id() AND is_admin());

-- ============================================================================
-- STEP 13: CREATE ACCEPT INVITATION FUNCTION
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
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  SELECT id INTO v_profile_id FROM user_profiles WHERE id = auth.uid();

  IF FOUND THEN
    RAISE EXCEPTION 'User already has a profile';
  END IF;

  INSERT INTO user_profiles (id, organization_id, role, status)
  VALUES (auth.uid(), v_invitation.organization_id, v_invitation.role, 'approved')
  RETURNING id INTO v_profile_id;

  UPDATE invitations SET accepted_at = now() WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'profile_id', v_profile_id);
END;
$$;

-- ============================================================================
-- STEP 14: CREATE UPDATE TRIGGER
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
BEFORE UPDATE ON risks FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_controls_updated_at ON controls;
CREATE TRIGGER update_controls_updated_at
BEFORE UPDATE ON controls FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
