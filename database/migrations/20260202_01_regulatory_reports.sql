/**
 * Migration: Regulatory Reports System
 *
 * Creates tables for:
 * - Report templates (CBN, SEC, PENCOM formats)
 * - Generated reports with scheduling
 * - Report sections and configurations
 */

-- =====================================================
-- 1. REPORT TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS regulatory_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_id UUID NOT NULL REFERENCES regulators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',

  -- Template configuration (JSON)
  config JSONB NOT NULL DEFAULT '{
    "sections": [],
    "metrics": [],
    "filters": {},
    "formatting": {}
  }'::jsonb,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(regulator_id, name)
);

-- Indexes
CREATE INDEX idx_report_templates_regulator ON regulatory_report_templates(regulator_id);
CREATE INDEX idx_report_templates_active ON regulatory_report_templates(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE regulatory_report_templates ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all templates
DROP POLICY IF EXISTS templates_super_admin ON regulatory_report_templates;
CREATE POLICY templates_super_admin ON regulatory_report_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Regulators can view their own templates
DROP POLICY IF EXISTS templates_regulator_view ON regulatory_report_templates;
CREATE POLICY templates_regulator_view ON regulatory_report_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM regulator_access ra
      WHERE ra.user_id = auth.uid()
        AND ra.regulator_id = regulatory_report_templates.regulator_id
    )
  );

-- =====================================================
-- 2. GENERATED REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS regulatory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES regulatory_report_templates(id) ON DELETE CASCADE,
  regulator_id UUID NOT NULL REFERENCES regulators(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Report metadata
  report_name TEXT NOT NULL,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),

  -- Report data (JSON snapshot)
  data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Export formats
  pdf_url TEXT,
  excel_url TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reports_template ON regulatory_reports(template_id);
CREATE INDEX idx_reports_regulator ON regulatory_reports(regulator_id);
CREATE INDEX idx_reports_organization ON regulatory_reports(organization_id);
CREATE INDEX idx_reports_period ON regulatory_reports(reporting_period_start, reporting_period_end);
CREATE INDEX idx_reports_status ON regulatory_reports(status);

-- RLS Policies
ALTER TABLE regulatory_reports ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all reports
DROP POLICY IF EXISTS reports_super_admin ON regulatory_reports;
CREATE POLICY reports_super_admin ON regulatory_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Regulators can view reports for their assigned organizations
DROP POLICY IF EXISTS reports_regulator_view ON regulatory_reports;
CREATE POLICY reports_regulator_view ON regulatory_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM regulator_access ra
      WHERE ra.user_id = auth.uid()
        AND ra.regulator_id = regulatory_reports.regulator_id
    )
  );

-- Organization admins can view and create their own reports
DROP POLICY IF EXISTS reports_org_admin ON regulatory_reports;
CREATE POLICY reports_org_admin ON regulatory_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = regulatory_reports.organization_id
        AND up.role IN ('primary_admin', 'secondary_admin')
    )
  );

-- =====================================================
-- 3. REPORT SCHEDULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS regulatory_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES regulatory_report_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Schedule configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'custom')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  month_of_year INTEGER CHECK (month_of_year BETWEEN 1 AND 12),

  -- Next run
  next_run_date DATE,
  last_run_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Notifications
  notify_emails TEXT[],

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_schedules_template ON regulatory_report_schedules(template_id);
CREATE INDEX idx_schedules_organization ON regulatory_report_schedules(organization_id);
CREATE INDEX idx_schedules_next_run ON regulatory_report_schedules(next_run_date) WHERE is_active = true;

-- RLS Policies
ALTER TABLE regulatory_report_schedules ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all schedules
DROP POLICY IF EXISTS schedules_super_admin ON regulatory_report_schedules;
CREATE POLICY schedules_super_admin ON regulatory_report_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Organization admins can manage their own schedules
DROP POLICY IF EXISTS schedules_org_admin ON regulatory_report_schedules;
CREATE POLICY schedules_org_admin ON regulatory_report_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = regulatory_report_schedules.organization_id
        AND up.role IN ('primary_admin', 'secondary_admin')
    )
  );

-- =====================================================
-- 4. SEED DEFAULT TEMPLATES
-- =====================================================

-- CBN Template (Central Bank of Nigeria)
INSERT INTO regulatory_report_templates (regulator_id, name, description, config)
SELECT
  r.id,
  'CBN Monthly Risk Report',
  'Monthly risk exposure and compliance report for Central Bank of Nigeria',
  '{
    "sections": [
      {"id": "executive_summary", "title": "Executive Summary", "order": 1},
      {"id": "risk_overview", "title": "Risk Overview", "order": 2},
      {"id": "credit_risk", "title": "Credit Risk", "order": 3},
      {"id": "market_risk", "title": "Market Risk", "order": 4},
      {"id": "liquidity_risk", "title": "Liquidity Risk", "order": 5},
      {"id": "operational_risk", "title": "Operational Risk", "order": 6},
      {"id": "compliance", "title": "Regulatory Compliance", "order": 7}
    ],
    "metrics": [
      "total_risks",
      "critical_high_risks",
      "risk_by_category",
      "avg_inherent_score",
      "avg_residual_score",
      "risk_mitigation_percentage",
      "control_effectiveness",
      "kri_breaches"
    ],
    "filters": {
      "categories": ["CREDIT", "MARKET", "LIQUIDITY", "OPERATIONAL", "LEGAL"],
      "severity_levels": ["CRITICAL", "HIGH"]
    },
    "formatting": {
      "include_heatmap": true,
      "include_trend_charts": true,
      "include_action_items": true
    }
  }'::jsonb
FROM regulators r
WHERE r.code = 'CBN'
ON CONFLICT (regulator_id, name) DO NOTHING;

-- SEC Template (Securities and Exchange Commission)
INSERT INTO regulatory_report_templates (regulator_id, name, description, config)
SELECT
  r.id,
  'SEC Quarterly Risk & Compliance Report',
  'Quarterly risk management and compliance report for Securities and Exchange Commission',
  '{
    "sections": [
      {"id": "executive_summary", "title": "Executive Summary", "order": 1},
      {"id": "market_risk", "title": "Market Risk Exposure", "order": 2},
      {"id": "credit_risk", "title": "Credit Risk & Counterparty", "order": 3},
      {"id": "operational_risk", "title": "Operational & Technology Risk", "order": 4},
      {"id": "legal_compliance", "title": "Legal & Compliance Risk", "order": 5},
      {"id": "esg_risk", "title": "ESG & Sustainability Risk", "order": 6},
      {"id": "incidents", "title": "Risk Events & Incidents", "order": 7}
    ],
    "metrics": [
      "total_risks",
      "risk_by_severity",
      "risk_by_category",
      "control_effectiveness_avg",
      "incident_count",
      "kri_status",
      "emerging_risks"
    ],
    "filters": {
      "categories": ["MARKET", "CREDIT", "OPERATIONAL", "LEGAL", "ESG"],
      "include_incidents": true
    },
    "formatting": {
      "include_heatmap": true,
      "include_trend_analysis": true,
      "include_recommendations": true
    }
  }'::jsonb
FROM regulators r
WHERE r.code = 'SEC'
ON CONFLICT (regulator_id, name) DO NOTHING;

-- PENCOM Template (National Pension Commission)
INSERT INTO regulatory_report_templates (regulator_id, name, description, config)
SELECT
  r.id,
  'PENCOM Annual Risk Assessment Report',
  'Annual comprehensive risk assessment report for National Pension Commission',
  '{
    "sections": [
      {"id": "executive_summary", "title": "Executive Summary", "order": 1},
      {"id": "risk_governance", "title": "Risk Governance Framework", "order": 2},
      {"id": "strategic_risk", "title": "Strategic & Business Risk", "order": 3},
      {"id": "operational_risk", "title": "Operational Risk", "order": 4},
      {"id": "liquidity_risk", "title": "Liquidity & Capital Risk", "order": 5},
      {"id": "compliance_risk", "title": "Regulatory Compliance", "order": 6},
      {"id": "risk_appetite", "title": "Risk Appetite & Tolerance", "order": 7},
      {"id": "forward_looking", "title": "Forward-Looking Risk Assessment", "order": 8}
    ],
    "metrics": [
      "total_risks",
      "risk_by_category",
      "risk_trend_12months",
      "control_coverage",
      "control_effectiveness",
      "risk_appetite_vs_actual",
      "emerging_risks",
      "risk_culture_indicators"
    ],
    "filters": {
      "categories": ["STRATEGIC", "OPERATIONAL", "LIQUIDITY", "LEGAL"],
      "include_trend_data": true,
      "period_months": 12
    },
    "formatting": {
      "include_executive_dashboard": true,
      "include_heatmap": true,
      "include_trend_charts": true,
      "include_recommendations": true,
      "include_action_plan": true
    }
  }'::jsonb
FROM regulators r
WHERE r.code = 'PENCOM'
ON CONFLICT (regulator_id, name) DO NOTHING;

-- =====================================================
-- 5. UPDATE TRIGGERS
-- =====================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_regulatory_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS regulatory_report_templates_updated_at ON regulatory_report_templates;
CREATE TRIGGER regulatory_report_templates_updated_at
  BEFORE UPDATE ON regulatory_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_regulatory_reports_updated_at();

DROP TRIGGER IF EXISTS regulatory_reports_updated_at ON regulatory_reports;
CREATE TRIGGER regulatory_reports_updated_at
  BEFORE UPDATE ON regulatory_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_regulatory_reports_updated_at();

DROP TRIGGER IF EXISTS regulatory_report_schedules_updated_at ON regulatory_report_schedules;
CREATE TRIGGER regulatory_report_schedules_updated_at
  BEFORE UPDATE ON regulatory_report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_regulatory_reports_updated_at();

-- =====================================================
-- VERIFICATION & COMMENTS
-- =====================================================

COMMENT ON TABLE regulatory_report_templates IS 'Templates for regulatory reports (CBN, SEC, PENCOM formats)';
COMMENT ON TABLE regulatory_reports IS 'Generated regulatory reports with snapshots and status tracking';
COMMENT ON TABLE regulatory_report_schedules IS 'Automated scheduling for regulatory report generation';

-- Verification
DO $$
DECLARE
  v_template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_template_count FROM regulatory_report_templates;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'REGULATORY REPORTS MIGRATION COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Report templates created: %', v_template_count;
  RAISE NOTICE 'Expected: 3 (CBN, SEC, PENCOM)';
  RAISE NOTICE '==============================================';
END $$;
