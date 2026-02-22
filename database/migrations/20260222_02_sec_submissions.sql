-- Migration: 20260222_02_sec_submissions.sql
-- Purpose: Create SEC quarterly submission system tables
-- Date: 2026-02-22
-- Depends on: 20260222_01_sec_category_mapping.sql
-- Context: CMOs submit quarterly Risk Profile Reports to the SEC.
--          The SEC reviews and issues "No Objection" or requests revision.
--          Submissions include frozen snapshots of risk data and per-category narratives.

-- ==============================================
-- PART 1: SUBMISSION DEADLINES (Set by Regulator)
-- ==============================================

CREATE TABLE IF NOT EXISTS sec_submission_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_id UUID NOT NULL REFERENCES regulators(id) ON DELETE CASCADE,
  period TEXT NOT NULL,                         -- e.g., 'Q1 2026', 'Q2 2026'
  deadline_date DATE NOT NULL,                  -- When submissions are due
  grace_period_days INT DEFAULT 0,              -- Extra days after deadline before marking overdue
  is_active BOOLEAN DEFAULT true,
  notes TEXT,                                   -- Optional instructions from regulator
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(regulator_id, period)
);

COMMENT ON TABLE sec_submission_deadlines IS 'Quarterly submission deadlines set by the regulator';

CREATE INDEX IF NOT EXISTS idx_sec_deadlines_reg ON sec_submission_deadlines(regulator_id);
CREATE INDEX IF NOT EXISTS idx_sec_deadlines_period ON sec_submission_deadlines(period);
CREATE INDEX IF NOT EXISTS idx_sec_deadlines_active ON sec_submission_deadlines(regulator_id, is_active) WHERE is_active = true;


-- ==============================================
-- PART 2: SEC SUBMISSIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS sec_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  regulator_id UUID NOT NULL REFERENCES regulators(id) ON DELETE CASCADE,
  deadline_id UUID REFERENCES sec_submission_deadlines(id) ON DELETE SET NULL,
  period TEXT NOT NULL,                         -- e.g., 'Q1 2026'

  -- Status lifecycle: draft -> submitted -> under_review -> approved | revision_requested
  -- After revision: revision_requested -> draft (re-editing) -> submitted (resubmit)
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'under_review', 'approved', 'revision_requested')
  ),

  -- Submission audit trail
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Revision tracking
  revision_count INT DEFAULT 0,                 -- How many times the CMO has resubmitted

  -- Frozen snapshot of risk data at submission time (immutable once submitted)
  -- Structure: {
  --   organization: { name, institution_type },
  --   period, submitted_at,
  --   summary: { total_risks, by_sec_category: { STRATEGIC: { count, avg_probability, avg_impact, avg_severity, critical, high }, ... } },
  --   heatmap: { matrix: [[count, ...], ...], row_labels: ['1-Remote', ...], col_labels: ['1-Insignificant', ...] },
  --   risk_details: [{ risk_code, title, sec_category, likelihood, impact, rating }, ...],
  --   comparison: { previous_period, trends: { STRATEGIC: { current, previous, trend }, ... } }
  -- }
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Introduction narrative (customizable per submission)
  introduction_text TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One submission per org per regulator per period
  UNIQUE(organization_id, regulator_id, period)
);

COMMENT ON TABLE sec_submissions IS 'Quarterly SEC Risk Profile Report submissions from CMOs';

CREATE INDEX IF NOT EXISTS idx_sec_sub_org ON sec_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sec_sub_reg ON sec_submissions(regulator_id);
CREATE INDEX IF NOT EXISTS idx_sec_sub_period ON sec_submissions(period);
CREATE INDEX IF NOT EXISTS idx_sec_sub_status ON sec_submissions(status);
CREATE INDEX IF NOT EXISTS idx_sec_sub_reg_period ON sec_submissions(regulator_id, period);


-- ==============================================
-- PART 3: PER-CATEGORY NARRATIVES
-- ==============================================

CREATE TABLE IF NOT EXISTS sec_submission_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES sec_submissions(id) ON DELETE CASCADE,
  sec_category_id UUID NOT NULL REFERENCES sec_standard_categories(id) ON DELETE CASCADE,

  -- AI-generated draft (preserved for audit trail)
  ai_draft TEXT,
  ai_generated_at TIMESTAMPTZ,

  -- Human-edited final version (this is what gets submitted)
  final_narrative TEXT,

  -- Quantitative data for this category at snapshot time
  current_rating NUMERIC(6,2),                  -- Current period composite score (avg L*I)
  previous_rating NUMERIC(6,2),                 -- Previous period composite score
  trend TEXT CHECK (trend IN ('improving', 'stable', 'deteriorating')),
  risk_count INT DEFAULT 0,
  critical_count INT DEFAULT 0,
  high_count INT DEFAULT 0,
  medium_count INT DEFAULT 0,
  low_count INT DEFAULT 0,

  -- Per-risk detail for this category (for Profile Mapping sheet)
  -- Structure: [{ risk_code, risk_title, likelihood, impact, rating }, ...]
  risk_details JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One narrative per category per submission
  UNIQUE(submission_id, sec_category_id)
);

COMMENT ON TABLE sec_submission_narratives IS 'Per-SEC-category narrative commentary within a quarterly submission';

CREATE INDEX IF NOT EXISTS idx_sec_narr_sub ON sec_submission_narratives(submission_id);
CREATE INDEX IF NOT EXISTS idx_sec_narr_cat ON sec_submission_narratives(sec_category_id);


-- ==============================================
-- PART 4: SEC REVIEW COMMENTS
-- ==============================================

CREATE TABLE IF NOT EXISTS sec_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES sec_submissions(id) ON DELETE CASCADE,
  sec_category_id UUID REFERENCES sec_standard_categories(id),  -- NULL = general comment on whole submission
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'comment' CHECK (
    comment_type IN ('comment', 'revision_required', 'approval_note')
  ),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sec_review_comments IS 'Review comments from SEC regulators on CMO submissions';

CREATE INDEX IF NOT EXISTS idx_sec_review_sub ON sec_review_comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_sec_review_type ON sec_review_comments(comment_type);


-- ==============================================
-- PART 5: IMMUTABILITY TRIGGER
-- ==============================================

-- Prevent modification of snapshot_data after submission
CREATE OR REPLACE FUNCTION prevent_snapshot_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow modifications while in draft status
  IF OLD.status = 'draft' THEN
    RETURN NEW;
  END IF;

  -- Allow status changes (but not snapshot_data changes) after submission
  IF NEW.snapshot_data IS DISTINCT FROM OLD.snapshot_data THEN
    RAISE EXCEPTION 'Cannot modify snapshot data after submission. Status: %', OLD.status;
  END IF;

  -- Allow narrative modifications only when status is draft or revision_requested
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_snapshot_modification ON sec_submissions;
CREATE TRIGGER trg_prevent_snapshot_modification
  BEFORE UPDATE ON sec_submissions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_snapshot_modification();

COMMENT ON FUNCTION prevent_snapshot_modification IS 'Prevents modification of frozen snapshot data after submission';


-- Prevent modification of narratives after submission (unless in revision)
CREATE OR REPLACE FUNCTION prevent_narrative_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_submission_status TEXT;
BEGIN
  -- Get the parent submission's status
  SELECT status INTO v_submission_status
  FROM sec_submissions
  WHERE id = NEW.submission_id;

  -- Allow modifications only when submission is in draft or revision_requested status
  IF v_submission_status NOT IN ('draft', 'revision_requested') THEN
    -- Allow AI draft generation even when submitted (it doesn't change the final)
    IF NEW.final_narrative IS DISTINCT FROM OLD.final_narrative THEN
      RAISE EXCEPTION 'Cannot modify narrative when submission status is: %', v_submission_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_narrative_modification ON sec_submission_narratives;
CREATE TRIGGER trg_prevent_narrative_modification
  BEFORE UPDATE ON sec_submission_narratives
  FOR EACH ROW
  EXECUTE FUNCTION prevent_narrative_modification();


-- ==============================================
-- PART 6: RLS POLICIES
-- ==============================================

-- sec_submission_deadlines: Regulator can manage, org admins can read
ALTER TABLE sec_submission_deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_deadlines_super_admin ON sec_submission_deadlines;
CREATE POLICY sec_deadlines_super_admin ON sec_submission_deadlines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS sec_deadlines_regulator_manage ON sec_submission_deadlines;
CREATE POLICY sec_deadlines_regulator_manage ON sec_submission_deadlines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM regulator_access ra
      WHERE ra.user_id = auth.uid()
        AND ra.regulator_id = sec_submission_deadlines.regulator_id
    )
  );

DROP POLICY IF EXISTS sec_deadlines_org_read ON sec_submission_deadlines;
CREATE POLICY sec_deadlines_org_read ON sec_submission_deadlines
  FOR SELECT
  USING (
    -- Org members can read deadlines for their assigned regulators
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN organization_regulators oreg ON up.organization_id = oreg.organization_id
      WHERE up.id = auth.uid()
        AND oreg.regulator_id = sec_submission_deadlines.regulator_id
    )
  );


-- sec_submissions: CMO admins manage own, regulator reads assigned, super_admin all
ALTER TABLE sec_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_sub_super_admin ON sec_submissions;
CREATE POLICY sec_sub_super_admin ON sec_submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS sec_sub_org_manage ON sec_submissions;
CREATE POLICY sec_sub_org_manage ON sec_submissions
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
    )
  );

DROP POLICY IF EXISTS sec_sub_org_read ON sec_submissions;
CREATE POLICY sec_sub_org_read ON sec_submissions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sec_sub_regulator_read ON sec_submissions;
CREATE POLICY sec_sub_regulator_read ON sec_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM regulator_access ra
      WHERE ra.user_id = auth.uid()
        AND ra.regulator_id = sec_submissions.regulator_id
    )
  );

-- Regulator can update status fields (for review workflow)
DROP POLICY IF EXISTS sec_sub_regulator_review ON sec_submissions;
CREATE POLICY sec_sub_regulator_review ON sec_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM regulator_access ra
      WHERE ra.user_id = auth.uid()
        AND ra.regulator_id = sec_submissions.regulator_id
    )
  );


-- sec_submission_narratives: Follow parent submission permissions
ALTER TABLE sec_submission_narratives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_narr_super_admin ON sec_submission_narratives;
CREATE POLICY sec_narr_super_admin ON sec_submission_narratives
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS sec_narr_org_manage ON sec_submission_narratives;
CREATE POLICY sec_narr_org_manage ON sec_submission_narratives
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sec_submissions s
      WHERE s.id = sec_submission_narratives.submission_id
        AND s.organization_id IN (
          SELECT organization_id FROM user_profiles
          WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
        )
    )
  );

DROP POLICY IF EXISTS sec_narr_org_read ON sec_submission_narratives;
CREATE POLICY sec_narr_org_read ON sec_submission_narratives
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sec_submissions s
      WHERE s.id = sec_submission_narratives.submission_id
        AND s.organization_id IN (
          SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS sec_narr_regulator_read ON sec_submission_narratives;
CREATE POLICY sec_narr_regulator_read ON sec_submission_narratives
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sec_submissions s
      JOIN regulator_access ra ON ra.regulator_id = s.regulator_id
      WHERE s.id = sec_submission_narratives.submission_id
        AND ra.user_id = auth.uid()
    )
  );


-- sec_review_comments: Regulator can insert, org and regulator can read
ALTER TABLE sec_review_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sec_review_super_admin ON sec_review_comments;
CREATE POLICY sec_review_super_admin ON sec_review_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS sec_review_regulator_insert ON sec_review_comments;
CREATE POLICY sec_review_regulator_insert ON sec_review_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sec_submissions s
      JOIN regulator_access ra ON ra.regulator_id = s.regulator_id
      WHERE s.id = sec_review_comments.submission_id
        AND ra.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sec_review_regulator_read ON sec_review_comments;
CREATE POLICY sec_review_regulator_read ON sec_review_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sec_submissions s
      JOIN regulator_access ra ON ra.regulator_id = s.regulator_id
      WHERE s.id = sec_review_comments.submission_id
        AND ra.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sec_review_org_read ON sec_review_comments;
CREATE POLICY sec_review_org_read ON sec_review_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sec_submissions s
      WHERE s.id = sec_review_comments.submission_id
        AND s.organization_id IN (
          SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    )
  );


-- ==============================================
-- MIGRATION TRACKING
-- ==============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_migrations') THEN
    INSERT INTO _migrations (name, executed_at)
    VALUES ('20260222_02_sec_submissions', NOW())
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;
