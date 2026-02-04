-- ============================================================================
-- MinRisk Phase 1a: PCI Workflow Schema Migration
-- Date: 2026-02-03
-- Description: Creates the foundation for Risk Response + PCI + Secondary Controls
--              + Derived DIME + Confidence + Evidence workflow
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

-- Risk Response Types
DO $$ BEGIN
    CREATE TYPE risk_response_type AS ENUM (
        'avoid',
        'reduce_likelihood',
        'reduce_impact',
        'transfer_share',
        'accept'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PCI Template Objective
DO $$ BEGIN
    CREATE TYPE pci_objective AS ENUM (
        'likelihood',
        'impact',
        'both'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Secondary Control Dimension
DO $$ BEGIN
    CREATE TYPE sc_dimension AS ENUM ('D', 'I', 'M', 'E');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Secondary Control Criticality
DO $$ BEGIN
    CREATE TYPE sc_criticality AS ENUM ('critical', 'important', 'optional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Secondary Control Status
DO $$ BEGIN
    CREATE TYPE sc_status AS ENUM ('yes', 'partial', 'no', 'na');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PCI Instance Status
DO $$ BEGIN
    CREATE TYPE pci_status AS ENUM ('draft', 'active', 'retired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Evidence Request Status
DO $$ BEGIN
    CREATE TYPE evidence_request_status AS ENUM (
        'open',
        'submitted',
        'rejected',
        'accepted',
        'cancelled',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Confidence Label
DO $$ BEGIN
    CREATE TYPE confidence_label AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PART 2: FEATURE FLAG
-- ============================================================================

-- Add feature flag column to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS pci_workflow_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN organizations.pci_workflow_enabled IS
'When true, new PCI workflow is active. Old free-text controls and manual DIME are disabled.';

-- ============================================================================
-- PART 3: UPDATE RISKS TABLE
-- ============================================================================

-- Add 'Active' and 'Draft' to valid risk statuses for G1 gate
-- First check current constraint and modify
ALTER TABLE risks
DROP CONSTRAINT IF EXISTS risks_status_check;

ALTER TABLE risks
ADD CONSTRAINT risks_status_check
CHECK (status IN ('Draft', 'Open', 'Active', 'In Progress', 'Closed', 'Retired'));

-- ============================================================================
-- PART 4: RISK RESPONSES TABLE (1:1 with risk)
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL UNIQUE REFERENCES risks(id) ON DELETE CASCADE,

    -- Confirmed response (user selection)
    response_type risk_response_type NOT NULL,
    response_rationale TEXT,

    -- AI proposal (optional, for audit trail)
    ai_proposed_response risk_response_type,
    ai_response_rationale TEXT,

    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE risk_responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_risk_responses_risk ON risk_responses(risk_id);

COMMENT ON TABLE risk_responses IS
'Stores the explicit risk treatment decision (1:1 with risk). Must be set before risk can be Active.';

-- ============================================================================
-- PART 5: PCI TEMPLATES TABLE (Seed Library)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pci_templates (
    id TEXT PRIMARY KEY, -- PCI-01 through PCI-16
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    objective_default pci_objective NOT NULL,
    purpose TEXT NOT NULL,
    parameters_schema JSONB NOT NULL DEFAULT '{}',
    version TEXT NOT NULL DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pci_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE pci_templates IS
'Seed library of 16 approved PCI archetypes. Global, not org-scoped.';

-- ============================================================================
-- PART 6: SECONDARY CONTROL TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS secondary_control_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pci_template_id TEXT NOT NULL REFERENCES pci_templates(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- D1, D2, I1, I2, I3, M1, M2, M3, E1, E2
    dimension sc_dimension NOT NULL,
    criticality sc_criticality NOT NULL,
    prompt_text TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(pci_template_id, code)
);

ALTER TABLE secondary_control_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sc_templates_pci ON secondary_control_templates(pci_template_id);
CREATE INDEX IF NOT EXISTS idx_sc_templates_dimension ON secondary_control_templates(dimension);
CREATE INDEX IF NOT EXISTS idx_sc_templates_criticality ON secondary_control_templates(criticality);

COMMENT ON TABLE secondary_control_templates IS
'10 secondary controls per PCI template (160 total). Defines the assurance checks.';

-- ============================================================================
-- PART 7: PCI INSTANCES TABLE (The new "control" object)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pci_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    pci_template_id TEXT NOT NULL REFERENCES pci_templates(id),
    pci_template_version TEXT NOT NULL DEFAULT '1.0', -- Frozen at creation

    -- Control instance details
    objective pci_objective NOT NULL, -- Default from template, editable
    statement TEXT, -- Generated from template + params, editable

    -- Parameters (validated server-side against template schema)
    scope_boundary TEXT NOT NULL,
    method TEXT NOT NULL,
    target_threshold_standard TEXT,
    trigger_frequency TEXT NOT NULL,
    owner_role TEXT NOT NULL,
    owner_user_id UUID REFERENCES auth.users(id),
    dependencies TEXT,

    -- Status
    status pci_status NOT NULL DEFAULT 'draft',

    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pci_instances ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pci_instances_org ON pci_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_pci_instances_risk ON pci_instances(risk_id);
CREATE INDEX IF NOT EXISTS idx_pci_instances_template ON pci_instances(pci_template_id);
CREATE INDEX IF NOT EXISTS idx_pci_instances_status ON pci_instances(status);

COMMENT ON TABLE pci_instances IS
'Parameterized instances of PCI templates attached to risks. Replaces free-text controls.';

-- ============================================================================
-- PART 8: SECONDARY CONTROL INSTANCES TABLE (Attestations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS secondary_control_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pci_instance_id UUID NOT NULL REFERENCES pci_instances(id) ON DELETE CASCADE,
    secondary_control_template_id UUID NOT NULL REFERENCES secondary_control_templates(id),
    secondary_template_version TEXT NOT NULL DEFAULT '1.0', -- Frozen at creation

    -- Attestation fields
    status sc_status, -- NULL = not yet attested
    na_rationale TEXT, -- Required if status = 'na'
    evidence_exists BOOLEAN, -- Required (true/false) when status != 'na'
    notes TEXT,

    -- Attestation metadata
    attested_by UUID REFERENCES auth.users(id),
    attested_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(pci_instance_id, secondary_control_template_id)
);

ALTER TABLE secondary_control_instances ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sc_instances_pci ON secondary_control_instances(pci_instance_id);
CREATE INDEX IF NOT EXISTS idx_sc_instances_template ON secondary_control_instances(secondary_control_template_id);
CREATE INDEX IF NOT EXISTS idx_sc_instances_status ON secondary_control_instances(status);
CREATE INDEX IF NOT EXISTS idx_sc_instances_attested ON secondary_control_instances(attested_at DESC);

COMMENT ON TABLE secondary_control_instances IS
'10 secondary controls per PCI instance. User attestations for each assurance check.';

-- Validation: na_rationale required when status = na, evidence_exists required when status != na
ALTER TABLE secondary_control_instances
ADD CONSTRAINT sc_na_rationale_required
CHECK (
    (status = 'na' AND na_rationale IS NOT NULL AND na_rationale != '')
    OR status != 'na'
    OR status IS NULL
);

ALTER TABLE secondary_control_instances
ADD CONSTRAINT sc_evidence_exists_required
CHECK (
    (status IN ('yes', 'partial', 'no') AND evidence_exists IS NOT NULL)
    OR status = 'na'
    OR status IS NULL
);

-- ============================================================================
-- PART 9: DERIVED DIME SCORES TABLE (System computed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS derived_dime_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pci_instance_id UUID NOT NULL UNIQUE REFERENCES pci_instances(id) ON DELETE CASCADE,

    -- Computed DIME scores (0-3 scale)
    d_score NUMERIC(4,2) NOT NULL CHECK (d_score >= 0 AND d_score <= 3),
    i_score NUMERIC(4,2) NOT NULL CHECK (i_score >= 0 AND i_score <= 3),
    m_score NUMERIC(4,2) NOT NULL CHECK (m_score >= 0 AND m_score <= 3),
    e_raw NUMERIC(4,2) NOT NULL CHECK (e_raw >= 0 AND e_raw <= 3),
    e_final NUMERIC(4,2) NOT NULL CHECK (e_final >= 0 AND e_final <= 3),

    -- Hard cap tracking
    cap_applied BOOLEAN NOT NULL DEFAULT FALSE,
    cap_details JSONB, -- {dimension: "D", capped_to: 1.0, triggered_by: ["D1"]}

    -- Computation metadata
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    calc_trace JSONB -- Full calculation trace for explainability
);

ALTER TABLE derived_dime_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dime_scores_pci ON derived_dime_scores(pci_instance_id);

COMMENT ON TABLE derived_dime_scores IS
'Computed DIME scores per PCI instance. One row per PCI, overwritten on recompute.';

-- ============================================================================
-- PART 10: CONFIDENCE SCORES TABLE (Per PCI)
-- ============================================================================

CREATE TABLE IF NOT EXISTS confidence_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pci_instance_id UUID NOT NULL UNIQUE REFERENCES pci_instances(id) ON DELETE CASCADE,

    -- Computed confidence
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    confidence_label confidence_label NOT NULL,
    drivers JSONB NOT NULL DEFAULT '[]', -- [{type: "positive"/"negative", text: "..."}]

    -- Computation metadata
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE confidence_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_confidence_scores_pci ON confidence_scores(pci_instance_id);
CREATE INDEX IF NOT EXISTS idx_confidence_scores_label ON confidence_scores(confidence_label);

COMMENT ON TABLE confidence_scores IS
'Computed confidence per PCI instance. One row per PCI, overwritten on recompute.';

-- ============================================================================
-- PART 11: EVIDENCE REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Scope (exactly one must be non-null) - XOR constraint below
    risk_id UUID REFERENCES risks(id) ON DELETE CASCADE,
    pci_instance_id UUID REFERENCES pci_instances(id) ON DELETE CASCADE,
    secondary_control_instance_id UUID REFERENCES secondary_control_instances(id) ON DELETE CASCADE,

    -- Request details
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date DATE NOT NULL,
    status evidence_request_status NOT NULL DEFAULT 'open',
    notes TEXT,

    -- For linking to critical secondary control (for penalty weighting)
    is_critical_scope BOOLEAN DEFAULT FALSE,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE evidence_requests ENABLE ROW LEVEL SECURITY;

-- XOR constraint: exactly one scope field must be non-null
ALTER TABLE evidence_requests
ADD CONSTRAINT evidence_request_scope_xor
CHECK (
    (risk_id IS NOT NULL AND pci_instance_id IS NULL AND secondary_control_instance_id IS NULL)
    OR (risk_id IS NULL AND pci_instance_id IS NOT NULL AND secondary_control_instance_id IS NULL)
    OR (risk_id IS NULL AND pci_instance_id IS NULL AND secondary_control_instance_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_evidence_requests_org ON evidence_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_risk ON evidence_requests(risk_id);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_pci ON evidence_requests(pci_instance_id);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_sc ON evidence_requests(secondary_control_instance_id);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_status ON evidence_requests(status);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_due ON evidence_requests(due_date);

COMMENT ON TABLE evidence_requests IS
'Evidence request workflow. Scope can be risk, PCI instance, or secondary control.';

-- ============================================================================
-- PART 12: EVIDENCE SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_request_id UUID NOT NULL REFERENCES evidence_requests(id) ON DELETE CASCADE,

    -- Submission details (no file upload in Phase 1, metadata only)
    submission_note TEXT NOT NULL,
    submitted_by UUID NOT NULL REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Review details
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    decision TEXT CHECK (decision IN ('accepted', 'rejected')),
    review_notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE evidence_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_evidence_submissions_request ON evidence_submissions(evidence_request_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_submitted ON evidence_submissions(submitted_at DESC);

COMMENT ON TABLE evidence_submissions IS
'Evidence submission responses. Phase 1: metadata only, no file attachments.';

-- ============================================================================
-- PART 13: TRIGGERS FOR updated_at
-- ============================================================================

-- Create or replace the generic updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all new tables
DROP TRIGGER IF EXISTS set_risk_responses_updated_at ON risk_responses;
CREATE TRIGGER set_risk_responses_updated_at
    BEFORE UPDATE ON risk_responses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_pci_templates_updated_at ON pci_templates;
CREATE TRIGGER set_pci_templates_updated_at
    BEFORE UPDATE ON pci_templates
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_sc_templates_updated_at ON secondary_control_templates;
CREATE TRIGGER set_sc_templates_updated_at
    BEFORE UPDATE ON secondary_control_templates
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_pci_instances_updated_at ON pci_instances;
CREATE TRIGGER set_pci_instances_updated_at
    BEFORE UPDATE ON pci_instances
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_sc_instances_updated_at ON secondary_control_instances;
CREATE TRIGGER set_sc_instances_updated_at
    BEFORE UPDATE ON secondary_control_instances
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_evidence_requests_updated_at ON evidence_requests;
CREATE TRIGGER set_evidence_requests_updated_at
    BEFORE UPDATE ON evidence_requests
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_evidence_submissions_updated_at ON evidence_submissions;
CREATE TRIGGER set_evidence_submissions_updated_at
    BEFORE UPDATE ON evidence_submissions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- PART 14: RLS POLICIES
-- ============================================================================

-- Helper function to get organization_id from risk_id
CREATE OR REPLACE FUNCTION get_org_from_risk(p_risk_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT organization_id FROM risks WHERE id = p_risk_id;
$$;

-- Helper function to get organization_id from pci_instance_id
CREATE OR REPLACE FUNCTION get_org_from_pci(p_pci_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT organization_id FROM pci_instances WHERE id = p_pci_id;
$$;

-- risk_responses: org-scoped via risk
CREATE POLICY "Users can view org risk_responses" ON risk_responses
    FOR SELECT USING (
        get_org_from_risk(risk_id) IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage risk_responses" ON risk_responses
    FOR ALL USING (
        get_org_from_risk(risk_id) IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
        )
    );

-- pci_templates: global read, super_admin write
CREATE POLICY "All users can view pci_templates" ON pci_templates
    FOR SELECT USING (true);

CREATE POLICY "Super admin can manage pci_templates" ON pci_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- secondary_control_templates: global read, super_admin write
CREATE POLICY "All users can view sc_templates" ON secondary_control_templates
    FOR SELECT USING (true);

CREATE POLICY "Super admin can manage sc_templates" ON secondary_control_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- pci_instances: org-scoped
CREATE POLICY "Users can view org pci_instances" ON pci_instances
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage pci_instances" ON pci_instances
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'user')
        )
    );

-- secondary_control_instances: via pci_instance org
CREATE POLICY "Users can view org sc_instances" ON secondary_control_instances
    FOR SELECT USING (
        get_org_from_pci(pci_instance_id) IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage sc_instances" ON secondary_control_instances
    FOR ALL USING (
        get_org_from_pci(pci_instance_id) IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'user')
        )
    );

-- derived_dime_scores: via pci_instance org (read-only for users, system writes)
CREATE POLICY "Users can view org dime_scores" ON derived_dime_scores
    FOR SELECT USING (
        get_org_from_pci(pci_instance_id) IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- confidence_scores: via pci_instance org (read-only for users, system writes)
CREATE POLICY "Users can view org confidence_scores" ON confidence_scores
    FOR SELECT USING (
        get_org_from_pci(pci_instance_id) IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- evidence_requests: org-scoped
CREATE POLICY "Users can view org evidence_requests" ON evidence_requests
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create evidence_requests" ON evidence_requests
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'user')
        )
    );

CREATE POLICY "Users can update own evidence_requests" ON evidence_requests
    FOR UPDATE USING (
        requested_by = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
        )
    );

-- evidence_submissions: org-scoped via request
CREATE POLICY "Users can view org evidence_submissions" ON evidence_submissions
    FOR SELECT USING (
        evidence_request_id IN (
            SELECT id FROM evidence_requests
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create evidence_submissions" ON evidence_submissions
    FOR INSERT WITH CHECK (
        evidence_request_id IN (
            SELECT id FROM evidence_requests
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles
                WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'user')
            )
        )
    );

CREATE POLICY "Admins can review evidence_submissions" ON evidence_submissions
    FOR UPDATE USING (
        evidence_request_id IN (
            SELECT id FROM evidence_requests
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles
                WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin')
            )
        )
    );

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
