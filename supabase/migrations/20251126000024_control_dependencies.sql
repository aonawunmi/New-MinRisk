-- Migration: Control Dependencies
-- Description: Define prerequisite, complementary, and alternative relationships between controls
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #9 (Nice-to-Have V2.0)

-- ============================================================================
-- CREATE CONTROL DEPENDENCIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  depends_on_control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,

  dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('prerequisite', 'complementary', 'alternative')),
  dependency_strength VARCHAR(15) NOT NULL CHECK (dependency_strength IN ('required', 'recommended', 'optional')),
  rationale TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(control_id, depends_on_control_id, dependency_type),
  CONSTRAINT no_self_dependency CHECK (control_id != depends_on_control_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_control_dep_control ON control_dependencies(control_id);
CREATE INDEX IF NOT EXISTS idx_control_dep_depends ON control_dependencies(depends_on_control_id);
CREATE INDEX IF NOT EXISTS idx_control_dep_org ON control_dependencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_control_dep_type ON control_dependencies(dependency_type);

-- ============================================================================
-- POPULATE CONTROL DEPENDENCIES
-- ============================================================================

INSERT INTO control_dependencies (organization_id, control_id, depends_on_control_id, dependency_type, dependency_strength, rationale)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c1.id,
  c2.id,
  dependency_type,
  dependency_strength,
  rationale
FROM (VALUES
  -- Identity & Access Management Dependencies
  ('CTL-001', 'CTL-002', 'prerequisite', 'required', 'MFA requires RBAC to define which roles require MFA'),
  ('CTL-003', 'CTL-002', 'prerequisite', 'required', 'PAM builds on RBAC for privileged role management'),
  ('CTL-005', 'CTL-003', 'complementary', 'recommended', 'Credential rotation enhances PAM security'),

  -- Network Security Dependencies
  ('CTL-006', 'CTL-007', 'complementary', 'recommended', 'Network segmentation works with firewall hardening'),
  ('CTL-008', 'CTL-006', 'prerequisite', 'recommended', 'IDS benefits from network segmentation for better visibility'),
  ('CTL-009', 'CTL-008', 'complementary', 'recommended', 'IPS complements IDS for active threat prevention'),
  ('CTL-018', 'CTL-006', 'prerequisite', 'required', 'Zero-trust requires network segmentation as foundation'),
  ('CTL-018', 'CTL-001', 'prerequisite', 'required', 'Zero-trust requires strong authentication (MFA)'),

  -- Endpoint Security Dependencies
  ('CTL-010', 'CTL-011', 'complementary', 'required', 'EDR effectiveness depends on timely patching'),
  ('CTL-011', 'CTL-017', 'prerequisite', 'recommended', 'Patching should be guided by vulnerability scanning'),

  -- Operational Resilience Dependencies
  ('CTL-019', 'CTL-020', 'alternative', 'optional', 'Load balancing or auto-scaling solve capacity issues'),
  ('CTL-021', 'CTL-019', 'prerequisite', 'recommended', 'Failover infrastructure benefits from load balancing'),
  ('CTL-022', 'CTL-020', 'complementary', 'recommended', 'Queue throttling works with auto-scaling'),

  -- Data Protection Dependencies
  ('CTL-038', 'CTL-041', 'prerequisite', 'required', 'Data masking requires data classification first'),
  ('CTL-039', 'CTL-041', 'prerequisite', 'required', 'Encryption at rest requires data classification'),
  ('CTL-040', 'CTL-041', 'prerequisite', 'recommended', 'Encryption in transit benefits from data classification'),
  ('CTL-043', 'CTL-041', 'prerequisite', 'required', 'PII/PHI enforcement requires data classification'),

  -- Data Quality Dependencies
  ('CTL-034', 'CTL-033', 'prerequisite', 'recommended', 'Data reconciliation is more effective with input validation'),
  ('CTL-035', 'CTL-033', 'prerequisite', 'required', 'Master data management requires data validation'),
  ('CTL-037', 'CTL-035', 'complementary', 'recommended', 'Checksum integrity complements master data management'),

  -- Governance Dependencies
  ('CTL-044', 'CTL-002', 'prerequisite', 'required', 'Segregation of duties requires RBAC implementation'),
  ('CTL-045', 'CTL-044', 'complementary', 'required', 'Approval workflows enforce segregation of duties'),
  ('CTL-048', 'CTL-049', 'complementary', 'recommended', 'Regulatory monitoring and policy audits work together'),

  -- Financial Controls Dependencies
  ('CTL-054', 'CTL-053', 'complementary', 'required', 'Capital buffer and liquidity monitoring work together'),
  ('CTL-055', 'CTL-053', 'prerequisite', 'recommended', 'Hedging strategy requires liquidity monitoring'),
  ('CTL-056', 'CTL-053', 'prerequisite', 'required', 'Stress testing requires liquidity monitoring data'),
  ('CTL-061', 'CTL-059', 'complementary', 'recommended', 'Fraud detection works with payment authorization limits'),

  -- HR Dependencies
  ('CTL-063', 'CTL-062', 'prerequisite', 'required', 'Competency certification requires mandatory training'),
  ('CTL-064', 'CTL-002', 'prerequisite', 'required', 'Access revocation requires RBAC to know what to revoke'),
  ('CTL-067', 'CTL-069', 'complementary', 'recommended', 'Burnout monitoring complements staffing thresholds'),

  -- Vendor Management Dependencies
  ('CTL-072', 'CTL-070', 'prerequisite', 'required', 'Vendor assessments inform SLA enforcement'),
  ('CTL-074', 'CTL-072', 'prerequisite', 'recommended', 'Vendor accreditation requires periodic assessments'),
  ('CTL-071', 'CTL-070', 'complementary', 'recommended', 'Multi-vendor redundancy complements SLA enforcement'),

  -- Infrastructure Dependencies
  ('CTL-085', 'CTL-084', 'prerequisite', 'required', 'Microservices architecture requires containerization'),
  ('CTL-086', 'CTL-085', 'complementary', 'recommended', 'Geo-distribution enhances microservices resilience'),
  ('CTL-087', 'CTL-086', 'alternative', 'optional', 'Standby systems or geo-distribution for resilience'),
  ('CTL-088', 'CTL-085', 'prerequisite', 'required', 'Chaos engineering requires microservices architecture'),
  ('CTL-089', 'CTL-084', 'prerequisite', 'required', 'Automated rollback requires containerization'),

  -- Disaster Recovery Dependencies
  ('CTL-091', 'CTL-090', 'prerequisite', 'required', 'Off-site backups implement RTO/RPO frameworks'),
  ('CTL-092', 'CTL-090', 'prerequisite', 'required', 'Recovery drills test RTO/RPO frameworks'),
  ('CTL-095', 'CTL-021', 'prerequisite', 'required', 'Service failover simulation requires failover infrastructure'),
  ('CTL-093', 'CTL-094', 'complementary', 'recommended', 'Crisis comms and PR damage control work together')

) AS mapping(control_code, depends_code, dependency_type, dependency_strength, rationale)
CROSS JOIN control_library c1
CROSS JOIN control_library c2
WHERE c1.control_code = mapping.control_code
  AND c2.control_code = mapping.depends_code
  AND c1.organization_id = '11111111-1111-1111-1111-111111111111'
  AND c2.organization_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (control_id, depends_on_control_id, dependency_type) DO NOTHING;

-- ============================================================================
-- CREATE VIEWS FOR DEPENDENCY ANALYSIS
-- ============================================================================

-- View: Control with Dependencies
CREATE OR REPLACE VIEW control_dependencies_view AS
SELECT
  c.id as control_id,
  c.organization_id,
  c.control_code,
  c.control_name,
  c.category,
  c.complexity,
  -- Dependency details
  cd.dependency_type,
  cd.dependency_strength,
  cd.rationale as dependency_rationale,
  -- Dependent control
  dc.control_code as depends_on_code,
  dc.control_name as depends_on_name,
  dc.category as depends_on_category,
  dc.complexity as depends_on_complexity,
  -- Risk context: is the dependent control already implemented?
  EXISTS(
    SELECT 1 FROM risk_controls rc
    WHERE rc.control_id = dc.id AND rc.status = 'active'
  ) as prerequisite_implemented
FROM control_library c
JOIN control_dependencies cd ON c.id = cd.control_id
JOIN control_library dc ON cd.depends_on_control_id = dc.id
WHERE c.status = 'active' AND dc.status = 'active'
ORDER BY c.control_code, cd.dependency_type, cd.dependency_strength;

-- View: Control Implementation Readiness (checks prerequisites)
CREATE OR REPLACE VIEW control_implementation_readiness AS
SELECT
  c.control_code,
  c.control_name,
  c.organization_id,
  c.category,
  c.complexity,
  c.cost,
  c.timeline,
  -- Prerequisites
  COUNT(cd.id) FILTER (WHERE cd.dependency_type = 'prerequisite') as prerequisite_count,
  COUNT(cd.id) FILTER (WHERE cd.dependency_type = 'prerequisite' AND cd.dependency_strength = 'required') as required_prerequisite_count,
  -- Prerequisite status
  STRING_AGG(
    dc.control_code || ' (' || cd.dependency_strength || ')',
    ', '
    ORDER BY cd.dependency_strength, dc.control_code
  ) FILTER (WHERE cd.dependency_type = 'prerequisite') as prerequisite_controls,
  -- Readiness assessment
  CASE
    WHEN COUNT(cd.id) FILTER (WHERE cd.dependency_type = 'prerequisite' AND cd.dependency_strength = 'required') = 0
      THEN 'Ready'
    ELSE 'Prerequisites Required'
  END as readiness_status
FROM control_library c
LEFT JOIN control_dependencies cd ON c.id = cd.control_id
LEFT JOIN control_library dc ON cd.depends_on_control_id = dc.id
WHERE c.status = 'active'
GROUP BY c.id, c.control_code, c.control_name, c.organization_id, c.category, c.complexity, c.cost, c.timeline
ORDER BY readiness_status, c.control_code;

-- View: Dependency Graph (for visualization)
CREATE OR REPLACE VIEW control_dependency_graph_view AS
SELECT
  c1.control_code as source_control,
  c1.control_name as source_name,
  cd.dependency_type,
  cd.dependency_strength,
  c2.control_code as target_control,
  c2.control_name as target_name,
  c1.organization_id,
  CASE cd.dependency_type
    WHEN 'prerequisite' THEN 1
    WHEN 'complementary' THEN 2
    WHEN 'alternative' THEN 3
  END as type_order,
  CASE cd.dependency_strength
    WHEN 'required' THEN 1
    WHEN 'recommended' THEN 2
    WHEN 'optional' THEN 3
  END as strength_order
FROM control_dependencies cd
JOIN control_library c1 ON cd.control_id = c1.id
JOIN control_library c2 ON cd.depends_on_control_id = c2.id
WHERE c1.status = 'active' AND c2.status = 'active'
ORDER BY type_order, strength_order, source_control;

-- View: Missing Prerequisites for Applied Controls
CREATE OR REPLACE VIEW missing_prerequisites_view AS
SELECT DISTINCT
  r.id as risk_id,
  r.organization_id,
  r.title as risk_title,
  c.control_code,
  c.control_name as control_applied,
  cd.dependency_strength,
  prereq.control_code as missing_prerequisite_code,
  prereq.control_name as missing_prerequisite_name,
  prereq.category as prerequisite_category,
  prereq.cost as prerequisite_cost,
  prereq.timeline as prerequisite_timeline,
  cd.rationale as why_needed
FROM risks r
JOIN risk_controls rc ON r.id = rc.risk_id AND rc.status = 'active'
JOIN control_library c ON rc.control_id = c.id
JOIN control_dependencies cd ON c.id = cd.control_id AND cd.dependency_type = 'prerequisite'
JOIN control_library prereq ON cd.depends_on_control_id = prereq.id
WHERE prereq.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM risk_controls rc2
    WHERE rc2.risk_id = r.id
      AND rc2.control_id = prereq.id
      AND rc2.status = 'active'
  )
ORDER BY r.organization_id, r.title, cd.dependency_strength, prereq.control_code;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get all prerequisites for a control (recursive)
CREATE OR REPLACE FUNCTION get_control_prerequisites(p_control_id UUID)
RETURNS TABLE(
  control_code VARCHAR,
  control_name VARCHAR,
  dependency_level INTEGER,
  dependency_strength VARCHAR
) AS $$
WITH RECURSIVE prereqs AS (
  -- Base case: direct prerequisites
  SELECT
    cd.depends_on_control_id as control_id,
    1 as level,
    cd.dependency_strength
  FROM control_dependencies cd
  WHERE cd.control_id = p_control_id
    AND cd.dependency_type = 'prerequisite'

  UNION

  -- Recursive case: prerequisites of prerequisites
  SELECT
    cd.depends_on_control_id,
    p.level + 1,
    cd.dependency_strength
  FROM prereqs p
  JOIN control_dependencies cd ON p.control_id = cd.control_id
  WHERE cd.dependency_type = 'prerequisite'
    AND p.level < 5 -- Limit recursion depth to prevent infinite loops
)
SELECT
  c.control_code,
  c.control_name,
  p.level,
  p.dependency_strength
FROM prereqs p
JOIN control_library c ON p.control_id = c.id
ORDER BY p.level, c.control_code;
$$ LANGUAGE SQL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE control_dependencies IS 'Defines prerequisite, complementary, and alternative relationships between controls';

COMMENT ON COLUMN control_dependencies.dependency_type IS 'Type: prerequisite (must implement first), complementary (work well together), alternative (either/or choice)';
COMMENT ON COLUMN control_dependencies.dependency_strength IS 'Strength: required (must have), recommended (should have), optional (nice to have)';

COMMENT ON VIEW control_dependencies_view IS 'Shows all control dependencies with details about dependent controls';
COMMENT ON VIEW control_implementation_readiness IS 'Assesses which controls are ready to implement vs. those requiring prerequisites';
COMMENT ON VIEW control_dependency_graph_view IS 'Graph data structure for visualizing control dependencies';
COMMENT ON VIEW missing_prerequisites_view IS 'Identifies applied controls missing their prerequisite controls, by risk';

COMMENT ON FUNCTION get_control_prerequisites IS 'Recursively retrieves all prerequisites for a given control up to 5 levels deep';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: Check what controls require MFA as a prerequisite
-- SELECT * FROM control_dependencies_view
-- WHERE depends_on_code = 'CTL-001' AND dependency_type = 'prerequisite';

-- Example 2: Get all prerequisites for Zero-Trust Network
-- SELECT * FROM get_control_prerequisites(
--   (SELECT id FROM control_library WHERE control_code = 'CTL-018' AND organization_id = '11111111-1111-1111-1111-111111111111')
-- );

-- Example 3: Find controls ready for implementation (no prerequisites)
-- SELECT * FROM control_implementation_readiness
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND readiness_status = 'Ready';

-- Example 4: Identify missing prerequisites for a specific risk
-- SELECT * FROM missing_prerequisites_view
-- WHERE risk_id = 'risk-uuid-here'
-- ORDER BY dependency_strength, missing_prerequisite_code;
