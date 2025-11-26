-- ============================================================================
-- MinRisk v2 Final Migration - Minimal additions only
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ADD OWNER_PROFILE_ID TO RISKS (if not exists)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'risks' AND column_name = 'owner_profile_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN owner_profile_id uuid REFERENCES user_profiles(id);

        UPDATE risks r
        SET owner_profile_id = r.user_id
        WHERE owner_profile_id IS NULL
        AND EXISTS (SELECT 1 FROM user_profiles WHERE id = r.user_id);

        CREATE INDEX idx_risks_owner ON risks(owner_profile_id);
    END IF;
END $$;

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
-- STEP 3: CREATE INVITATIONS TABLE (if not exists)
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

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_invitations" ON invitations;
CREATE POLICY "admin_invitations"
ON invitations FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id() AND is_admin());

-- ============================================================================
-- STEP 4: CREATE RISK ASSESSMENTS TABLE (if not exists)
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

ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_assessments" ON risk_assessments;
CREATE POLICY "admin_all_assessments"
ON risk_assessments FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id());

-- ============================================================================
-- STEP 5: CREATE HEATMAP CONFIG TABLE (if not exists)
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
-- STEP 6: CREATE ACCEPT INVITATION FUNCTION
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

COMMIT;
