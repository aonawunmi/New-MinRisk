-- Migration: Library Suggestions Approval Workflow
-- Description: Allow users to suggest additions to library registers with approval workflow
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #12 (Nice-to-Have V2.0)

-- ============================================================================
-- CREATE LIBRARY SUGGESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Suggestion type
  suggestion_type VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('root_cause', 'impact', 'control', 'indicator')),

  -- Suggested data (stored as JSON for flexibility)
  suggested_data JSONB NOT NULL,

  -- Justification
  justification TEXT NOT NULL,
  use_case_example TEXT, -- Example of how this would be used
  similar_existing_items TEXT, -- Why existing items don't cover this need

  -- Workflow status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision', 'appealed')),

  -- Submission
  submitted_by UUID REFERENCES user_profiles(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Review
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  rejection_reason TEXT,
  approval_notes TEXT,

  -- Appeal process
  appeal_submitted BOOLEAN DEFAULT false,
  appeal_reason TEXT,
  appeal_submitted_at TIMESTAMP WITH TIME ZONE,
  appeal_reviewed_by UUID REFERENCES user_profiles(id),
  appeal_reviewed_at TIMESTAMP WITH TIME ZONE,
  appeal_decision VARCHAR(20) CHECK (appeal_decision IN ('upheld', 'overturned', 'pending')),

  -- Implementation tracking (if approved)
  implemented BOOLEAN DEFAULT false,
  implemented_at TIMESTAMP WITH TIME ZONE,
  implemented_by UUID REFERENCES user_profiles(id),
  implemented_library_id UUID, -- ID of the created library item

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_org ON library_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON library_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON library_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_submitted_by ON library_suggestions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_suggestions_reviewed_by ON library_suggestions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_suggestions_submitted_at ON library_suggestions(submitted_at);

-- ============================================================================
-- TRIGGER: Update Timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_suggestion_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set reviewed_at when status changes to approved/rejected
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    NEW.reviewed_at := NOW();
  END IF;

  -- Set appeal_submitted_at when appeal is filed
  IF NEW.appeal_submitted = true AND OLD.appeal_submitted = false THEN
    NEW.appeal_submitted_at := NOW();
    NEW.status := 'appealed';
  END IF;

  -- Set implemented_at when implemented flag is set
  IF NEW.implemented = true AND OLD.implemented = false THEN
    NEW.implemented_at := NOW();
  END IF;

  -- Always update updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_suggestion_timestamps ON library_suggestions;
CREATE TRIGGER trigger_update_suggestion_timestamps
  BEFORE UPDATE ON library_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_suggestion_timestamps();

-- ============================================================================
-- CREATE VIEWS FOR SUGGESTION MANAGEMENT
-- ============================================================================

-- View: Pending Suggestions Queue
CREATE OR REPLACE VIEW pending_suggestions_view AS
SELECT
  ls.id,
  ls.organization_id,
  ls.suggestion_type,
  ls.suggested_data,
  ls.justification,
  ls.use_case_example,
  ls.status,
  -- Submitter
  sub.email as submitted_by_email,
  sub.name as submitted_by_name,
  ls.submitted_at,
  -- Days pending
  EXTRACT(DAY FROM (NOW() - ls.submitted_at)) as days_pending,
  -- Priority assessment
  CASE
    WHEN ls.suggestion_type = 'control' THEN 1  -- Controls highest priority
    WHEN ls.suggestion_type = 'indicator' THEN 2
    WHEN ls.suggestion_type = 'root_cause' THEN 3
    WHEN ls.suggestion_type = 'impact' THEN 4
  END as priority_order,
  -- SLA status
  CASE
    WHEN EXTRACT(DAY FROM (NOW() - ls.submitted_at)) > 14 THEN 'Overdue'
    WHEN EXTRACT(DAY FROM (NOW() - ls.submitted_at)) > 7 THEN 'Due Soon'
    ELSE 'On Track'
  END as review_sla_status
FROM library_suggestions ls
LEFT JOIN user_profiles sub ON ls.submitted_by = sub.id
WHERE ls.status = 'pending'
ORDER BY priority_order, ls.submitted_at ASC;

-- View: Suggestion Review Dashboard
CREATE OR REPLACE VIEW suggestion_review_dashboard_view AS
SELECT
  ls.organization_id,
  ls.suggestion_type,
  -- Status counts
  COUNT(*) as total_suggestions,
  COUNT(*) FILTER (WHERE ls.status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE ls.status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE ls.status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE ls.status = 'needs_revision') as revision_count,
  COUNT(*) FILTER (WHERE ls.status = 'appealed') as appealed_count,
  -- Implementation status
  COUNT(*) FILTER (WHERE ls.status = 'approved' AND ls.implemented = true) as implemented_count,
  COUNT(*) FILTER (WHERE ls.status = 'approved' AND ls.implemented = false) as approved_not_implemented,
  -- Metrics
  ROUND(
    COUNT(*) FILTER (WHERE ls.status = 'approved')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE ls.status IN ('approved', 'rejected')), 0) * 100,
    1
  ) as approval_rate_pct,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (ls.reviewed_at - ls.submitted_at)) / 86400)
    FILTER (WHERE ls.reviewed_at IS NOT NULL),
    1
  ) as avg_review_time_days,
  -- Oldest pending
  MIN(ls.submitted_at) FILTER (WHERE ls.status = 'pending') as oldest_pending_date
FROM library_suggestions ls
GROUP BY ls.organization_id, ls.suggestion_type
ORDER BY ls.suggestion_type;

-- View: User Contribution History
CREATE OR REPLACE VIEW user_contributions_view AS
SELECT
  ls.organization_id,
  sub.id as user_id,
  sub.email,
  sub.name,
  -- Contribution counts
  COUNT(*) as total_suggestions,
  COUNT(*) FILTER (WHERE ls.status = 'approved') as approved_suggestions,
  COUNT(*) FILTER (WHERE ls.status = 'rejected') as rejected_suggestions,
  COUNT(*) FILTER (WHERE ls.status = 'pending') as pending_suggestions,
  -- Implementation
  COUNT(*) FILTER (WHERE ls.implemented = true) as implemented_suggestions,
  -- Success rate
  ROUND(
    COUNT(*) FILTER (WHERE ls.status = 'approved')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE ls.status IN ('approved', 'rejected')), 0) * 100,
    1
  ) as approval_rate_pct,
  -- By type
  COUNT(*) FILTER (WHERE ls.suggestion_type = 'root_cause') as root_cause_suggestions,
  COUNT(*) FILTER (WHERE ls.suggestion_type = 'impact') as impact_suggestions,
  COUNT(*) FILTER (WHERE ls.suggestion_type = 'control') as control_suggestions,
  COUNT(*) FILTER (WHERE ls.suggestion_type = 'indicator') as indicator_suggestions,
  -- Timing
  MIN(ls.submitted_at) as first_suggestion_date,
  MAX(ls.submitted_at) as latest_suggestion_date
FROM library_suggestions ls
LEFT JOIN user_profiles sub ON ls.submitted_by = sub.id
GROUP BY ls.organization_id, sub.id, sub.email, sub.name
HAVING COUNT(*) > 0
ORDER BY approved_suggestions DESC, total_suggestions DESC;

-- View: Appealed Suggestions
CREATE OR REPLACE VIEW appealed_suggestions_view AS
SELECT
  ls.id,
  ls.organization_id,
  ls.suggestion_type,
  ls.suggested_data,
  -- Original review
  rev.email as original_reviewer_email,
  ls.reviewed_at,
  ls.rejection_reason,
  -- Appeal
  ls.appeal_reason,
  ls.appeal_submitted_at,
  EXTRACT(DAY FROM (NOW() - ls.appeal_submitted_at)) as days_since_appeal,
  -- Appeal review
  app_rev.email as appeal_reviewer_email,
  ls.appeal_reviewed_at,
  ls.appeal_decision,
  -- Submitter
  sub.email as submitter_email
FROM library_suggestions ls
LEFT JOIN user_profiles sub ON ls.submitted_by = sub.id
LEFT JOIN user_profiles rev ON ls.reviewed_by = rev.id
LEFT JOIN user_profiles app_rev ON ls.appeal_reviewed_by = app_rev.id
WHERE ls.appeal_submitted = true
ORDER BY
  CASE ls.appeal_decision
    WHEN 'pending' THEN 1
    WHEN 'upheld' THEN 2
    WHEN 'overturned' THEN 3
  END,
  ls.appeal_submitted_at ASC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Submit Suggestion
CREATE OR REPLACE FUNCTION submit_library_suggestion(
  p_organization_id UUID,
  p_suggestion_type VARCHAR,
  p_suggested_data JSONB,
  p_justification TEXT,
  p_use_case_example TEXT,
  p_submitted_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_suggestion_id UUID;
BEGIN
  -- Validate suggestion type
  IF p_suggestion_type NOT IN ('root_cause', 'impact', 'control', 'indicator') THEN
    RAISE EXCEPTION 'Invalid suggestion type: %', p_suggestion_type;
  END IF;

  -- Create suggestion
  INSERT INTO library_suggestions (
    organization_id, suggestion_type, suggested_data,
    justification, use_case_example, submitted_by
  )
  VALUES (
    p_organization_id, p_suggestion_type, p_suggested_data,
    p_justification, p_use_case_example, p_submitted_by
  )
  RETURNING id INTO v_suggestion_id;

  RETURN v_suggestion_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Approve Suggestion
CREATE OR REPLACE FUNCTION approve_suggestion(
  p_suggestion_id UUID,
  p_reviewed_by UUID,
  p_approval_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE library_suggestions
  SET
    status = 'approved',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    approval_notes = p_approval_notes,
    updated_at = NOW()
  WHERE id = p_suggestion_id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Function: Reject Suggestion
CREATE OR REPLACE FUNCTION reject_suggestion(
  p_suggestion_id UUID,
  p_reviewed_by UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE library_suggestions
  SET
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_suggestion_id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Function: Submit Appeal
CREATE OR REPLACE FUNCTION submit_appeal(
  p_suggestion_id UUID,
  p_appeal_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE library_suggestions
  SET
    appeal_submitted = true,
    appeal_reason = p_appeal_reason,
    appeal_submitted_at = NOW(),
    status = 'appealed',
    updated_at = NOW()
  WHERE id = p_suggestion_id AND status = 'rejected';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark Suggestion as Implemented
CREATE OR REPLACE FUNCTION mark_suggestion_implemented(
  p_suggestion_id UUID,
  p_implemented_by UUID,
  p_library_item_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE library_suggestions
  SET
    implemented = true,
    implemented_at = NOW(),
    implemented_by = p_implemented_by,
    implemented_library_id = p_library_item_id,
    updated_at = NOW()
  WHERE id = p_suggestion_id AND status = 'approved';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE library_suggestions IS 'User-submitted suggestions for additions to library registers with approval workflow';

COMMENT ON COLUMN library_suggestions.suggestion_type IS 'Type of library item: root_cause, impact, control, or indicator';
COMMENT ON COLUMN library_suggestions.suggested_data IS 'JSON object containing the proposed library item data';
COMMENT ON COLUMN library_suggestions.status IS 'Workflow status: pending, approved, rejected, needs_revision, appealed';
COMMENT ON COLUMN library_suggestions.appeal_submitted IS 'Whether submitter appealed a rejection';
COMMENT ON COLUMN library_suggestions.implemented IS 'Whether approved suggestion has been added to library';

COMMENT ON VIEW pending_suggestions_view IS 'Queue of suggestions awaiting review with SLA tracking';
COMMENT ON VIEW suggestion_review_dashboard_view IS 'Dashboard showing suggestion volume, approval rates, and review performance';
COMMENT ON VIEW user_contributions_view IS 'Track user contributions and approval success rates';
COMMENT ON VIEW appealed_suggestions_view IS 'Suggestions that have been appealed after rejection';

COMMENT ON FUNCTION submit_library_suggestion IS 'Submit a new suggestion for library addition';
COMMENT ON FUNCTION approve_suggestion IS 'Approve a pending suggestion';
COMMENT ON FUNCTION reject_suggestion IS 'Reject a pending suggestion with reason';
COMMENT ON FUNCTION submit_appeal IS 'Appeal a rejected suggestion';
COMMENT ON FUNCTION mark_suggestion_implemented IS 'Mark an approved suggestion as implemented in the library';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: Submit a new control suggestion
-- SELECT submit_library_suggestion(
--   'org-uuid',
--   'control',
--   '{"control_code": "CTL-096", "control_name": "API Rate Limiting", "category": "Cybersecurity", "complexity": "Intermediate"}'::jsonb,
--   'Needed to prevent API abuse and DDoS attacks',
--   'We recently experienced API overload from a bot; rate limiting would have prevented this',
--   'user-uuid'
-- );

-- Example 2: Review pending suggestions
-- SELECT * FROM pending_suggestions_view WHERE organization_id = 'YOUR_ORG_ID' ORDER BY days_pending DESC;

-- Example 3: Approve a suggestion
-- SELECT approve_suggestion(
--   'suggestion-uuid',
--   'reviewer-uuid',
--   'Good suggestion, addresses gap in API security controls'
-- );

-- Example 4: Reject with reason
-- SELECT reject_suggestion(
--   'suggestion-uuid',
--   'reviewer-uuid',
--   'This is already covered by CTL-008 (IDS) and CTL-030 (Real-time alerting)'
-- );

-- Example 5: View statistics
-- SELECT * FROM suggestion_review_dashboard_view WHERE organization_id = 'YOUR_ORG_ID';
