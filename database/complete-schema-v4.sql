-- ============================================================================
-- MinRisk v4.0 - Complete Database Schema
-- Based on SOLUTION_SPECIFICATION_DOCUMENT.md Section 4
-- ============================================================================
-- This migration creates the complete MinRisk ERM database schema including:
-- - Core tables (organizations, user_profiles, app_configs, risks, controls)
-- - KRI subsystem (kri_definitions, kri_data_entries, kri_alerts, kri_risk_links)
-- - Incident subsystem (incidents, control_enhancement_plans)
-- - Risk Intelligence (external_events, risk_intelligence_alerts, news_sources)
-- - VaR subsystem (var_scale_config)
-- - Audit & Archive (audit_trail, archived_risks, archived_controls)
-- - All indexes, triggers, RLS policies, views, and stored procedures
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: CORE TABLES
-- ============================================================================

-- organizations table (already exists, verify structure)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_profiles table (already exists, verify structure)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'primary_admin', 'secondary_admin', 'user')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- app_configs table (replaces risk_configs if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_configs') THEN
        ALTER TABLE IF EXISTS risk_configs RENAME TO app_configs_old;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS app_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  matrix_size INTEGER DEFAULT 5 CHECK (matrix_size IN (5, 6)),
  likelihood_labels JSONB DEFAULT '["Rare", "Unlikely", "Possible", "Likely", "Almost certain"]',
  impact_labels JSONB DEFAULT '["Minimal", "Low", "Moderate", "High", "Severe"]',
  divisions JSONB DEFAULT '["Clearing", "Operations", "Finance"]',
  departments JSONB DEFAULT '["Risk Management", "IT Ops", "Quant/Risk", "Treasury", "Trading"]',
  categories JSONB DEFAULT '["Strategic", "Credit", "Market", "Liquidity", "Operational", "Legal/Compliance", "Technology", "ESG", "Reputational"]',
  owners JSONB DEFAULT '[]',
  scanner_mode TEXT DEFAULT 'manual',
  scanner_confidence_threshold NUMERIC DEFAULT 0.7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- risks table (enhance if exists, create if not)
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  division TEXT NOT NULL,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  owner TEXT NOT NULL,
  likelihood_inherent INTEGER NOT NULL CHECK (likelihood_inherent >= 1 AND likelihood_inherent <= 6),
  impact_inherent INTEGER NOT NULL CHECK (impact_inherent >= 1 AND impact_inherent <= 6),
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Closed')),
  is_priority BOOLEAN DEFAULT FALSE,
  relevant_period TEXT,
  linked_incident_count INTEGER DEFAULT 0,
  last_incident_date TIMESTAMPTZ,
  last_intelligence_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, risk_code)
);

-- controls table (enhance if exists, create if not)
CREATE TABLE IF NOT EXISTS controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('Likelihood', 'Impact')),
  design INTEGER DEFAULT 0 CHECK (design >= 0 AND design <= 3),
  implementation INTEGER DEFAULT 0 CHECK (implementation >= 0 AND implementation <= 3),
  monitoring INTEGER DEFAULT 0 CHECK (monitoring >= 0 AND monitoring <= 3),
  effectiveness_evaluation INTEGER DEFAULT 0 CHECK (effectiveness_evaluation >= 0 AND effectiveness_evaluation <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: KRI SUBSYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kri_code TEXT NOT NULL UNIQUE,
  kri_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  indicator_type TEXT CHECK (indicator_type IN ('leading', 'lagging', 'concurrent')),
  measurement_unit TEXT,
  data_source TEXT,
  collection_frequency TEXT CHECK (collection_frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually')),
  target_value NUMERIC,
  lower_threshold NUMERIC,
  upper_threshold NUMERIC,
  threshold_direction TEXT CHECK (threshold_direction IN ('above', 'below', 'between')),
  responsible_user TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kri_data_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL,
  measurement_value NUMERIC NOT NULL,
  alert_status TEXT CHECK (alert_status IN ('green', 'yellow', 'red')),
  data_quality TEXT DEFAULT 'verified' CHECK (data_quality IN ('verified', 'estimated', 'provisional')),
  notes TEXT,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kri_id, measurement_date)
);

CREATE TABLE IF NOT EXISTS kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('yellow', 'red')),
  alert_date TIMESTAMPTZ NOT NULL,
  measured_value NUMERIC NOT NULL,
  threshold_breached NUMERIC NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kri_risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  ai_link_confidence NUMERIC CHECK (ai_link_confidence >= 0 AND ai_link_confidence <= 100),
  linked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kri_id, risk_code)
);

-- ============================================================================
-- PART 3: INCIDENT SUBSYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  incident_date DATE NOT NULL,
  reported_by TEXT,
  division TEXT,
  department TEXT,
  incident_type TEXT,
  severity INTEGER CHECK (severity >= 1 AND severity <= 5),
  financial_impact NUMERIC,
  status TEXT DEFAULT 'Reported' CHECK (status IN ('Reported', 'Under Investigation', 'Resolved', 'Closed')),
  root_cause TEXT,
  corrective_actions TEXT,
  ai_suggested_risks JSONB DEFAULT '[]',
  ai_control_recommendations JSONB DEFAULT '[]',
  linked_risk_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS control_enhancement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  control_gap TEXT NOT NULL,
  enhancement_plan TEXT NOT NULL,
  target_completion_date DATE,
  responsible_party TEXT,
  status TEXT DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Completed', 'On Hold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: RISK INTELLIGENCE SUBSYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source_name TEXT,
  source_url TEXT,
  published_date TIMESTAMPTZ,
  event_category TEXT CHECK (event_category IN ('cybersecurity', 'regulatory', 'market', 'environmental', 'operational', 'geopolitical')),
  keywords TEXT[],
  country TEXT,
  relevance_score NUMERIC CHECK (relevance_score >= 0 AND relevance_score <= 100),
  affected_risk_categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_code TEXT NOT NULL,
  event_id UUID REFERENCES external_events(id) ON DELETE CASCADE,
  suggested_likelihood_change INTEGER CHECK (suggested_likelihood_change >= -2 AND suggested_likelihood_change <= 2),
  reasoning TEXT NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  suggested_controls TEXT[],
  impact_assessment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  applied_to_risk BOOLEAN DEFAULT FALSE,
  treatment_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rss_url TEXT NOT NULL,
  category TEXT,
  country TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  last_fetch_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 5: VAR SUBSYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS var_scale_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  volatility_threshold_1 NUMERIC DEFAULT 5.0,
  volatility_threshold_2 NUMERIC DEFAULT 10.0,
  volatility_threshold_3 NUMERIC DEFAULT 20.0,
  volatility_threshold_4 NUMERIC DEFAULT 30.0,
  value_threshold_1 NUMERIC DEFAULT 1000000,
  value_threshold_2 NUMERIC DEFAULT 5000000,
  value_threshold_3 NUMERIC DEFAULT 10000000,
  value_threshold_4 NUMERIC DEFAULT 50000000,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- ============================================================================
-- PART 6: AUDIT & ARCHIVE SUBSYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'archive', 'restore', 'approve', 'reject', 'role_change', 'config_change', 'bulk_delete')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_code TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archived_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_risk_id UUID,
  risk_code TEXT NOT NULL,
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  division TEXT,
  department TEXT,
  category TEXT,
  owner TEXT,
  likelihood_inherent INTEGER,
  impact_inherent INTEGER,
  status TEXT,
  is_priority BOOLEAN,
  relevant_period TEXT,
  linked_incident_count INTEGER,
  last_incident_date TIMESTAMPTZ,
  last_intelligence_check TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT,
  archive_notes TEXT
);

CREATE TABLE IF NOT EXISTS archived_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_risk_id UUID NOT NULL REFERENCES archived_risks(id) ON DELETE CASCADE,
  original_control_id UUID,
  description TEXT,
  target TEXT,
  design INTEGER,
  implementation INTEGER,
  monitoring INTEGER,
  effectiveness_evaluation INTEGER
);

-- ============================================================================
-- PART 7: INDEXES
-- ============================================================================

-- Core tables indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_risks_organization ON risks(organization_id);
CREATE INDEX IF NOT EXISTS idx_risks_user ON risks(user_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_period ON risks(relevant_period);
CREATE INDEX IF NOT EXISTS idx_risks_priority ON risks(is_priority) WHERE is_priority = TRUE;
CREATE INDEX IF NOT EXISTS idx_controls_risk ON controls(risk_id);

-- KRI indexes
CREATE INDEX IF NOT EXISTS idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_kri ON kri_data_entries(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_date ON kri_data_entries(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_kri ON kri_alerts(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_status ON kri_alerts(status) WHERE status IN ('open', 'acknowledged');
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_kri ON kri_risk_links(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_risk ON kri_risk_links(risk_code);

-- Incident indexes
CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_linked_risks ON incidents USING GIN(linked_risk_codes);

-- Risk Intelligence indexes
CREATE INDEX IF NOT EXISTS idx_external_events_org ON external_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_events_date ON external_events(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_external_events_category ON external_events(event_category);
CREATE INDEX IF NOT EXISTS idx_risk_intelligence_alerts_risk ON risk_intelligence_alerts(risk_code);
CREATE INDEX IF NOT EXISTS idx_risk_intelligence_alerts_status ON risk_intelligence_alerts(status);

-- Audit Trail indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_org ON audit_trail(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_code ON audit_trail(entity_code);

-- ============================================================================
-- PART 8: HELPER FUNCTIONS
-- ============================================================================

-- Get current user's organization
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('primary_admin', 'secondary_admin', 'super_admin')
  FROM user_profiles
  WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Also create shorter versions for convenience
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT current_user_role() IN ('primary_admin', 'secondary_admin');
$$;

-- ============================================================================
-- PART 9: TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_configs_updated_at ON app_configs;
CREATE TRIGGER update_app_configs_updated_at BEFORE UPDATE ON app_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_risks_updated_at ON risks;
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_controls_updated_at ON controls;
CREATE TRIGGER update_controls_updated_at BEFORE UPDATE ON controls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kri_definitions_updated_at ON kri_definitions;
CREATE TRIGGER update_kri_definitions_updated_at BEFORE UPDATE ON kri_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_control_enhancement_plans_updated_at ON control_enhancement_plans;
CREATE TRIGGER update_control_enhancement_plans_updated_at BEFORE UPDATE ON control_enhancement_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trail trigger for risks
CREATE OR REPLACE FUNCTION audit_risk_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      user_email,
      action,
      entity_type,
      entity_id,
      entity_code,
      new_values,
      timestamp
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'create',
      'risk',
      NEW.id,
      NEW.risk_code,
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      user_email,
      action,
      entity_type,
      entity_id,
      entity_code,
      old_values,
      new_values,
      timestamp
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'update',
      'risk',
      NEW.id,
      NEW.risk_code,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_trail (
      organization_id,
      user_id,
      user_email,
      action,
      entity_type,
      entity_id,
      entity_code,
      old_values,
      timestamp
    ) VALUES (
      OLD.organization_id,
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'delete',
      'risk',
      OLD.id,
      OLD.risk_code,
      to_jsonb(OLD),
      NOW()
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_risks_changes ON risks;
CREATE TRIGGER audit_risks_changes
AFTER INSERT OR UPDATE OR DELETE ON risks
FOR EACH ROW EXECUTE FUNCTION audit_risk_changes();

-- KRI alert creation trigger
CREATE OR REPLACE FUNCTION create_kri_alert_on_breach()
RETURNS TRIGGER AS $$
DECLARE
  v_kri RECORD;
BEGIN
  -- Get KRI definition with thresholds
  SELECT * INTO v_kri FROM kri_definitions WHERE id = NEW.kri_id;

  -- Only create alert for Yellow or Red status
  IF NEW.alert_status IN ('yellow', 'red') THEN
    INSERT INTO kri_alerts (
      kri_id,
      alert_level,
      alert_date,
      measured_value,
      threshold_breached,
      status
    ) VALUES (
      NEW.kri_id,
      NEW.alert_status,
      NEW.measurement_date,
      NEW.measurement_value,
      CASE
        WHEN NEW.alert_status = 'red' THEN v_kri.upper_threshold
        ELSE v_kri.lower_threshold
      END,
      'open'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kri_alert_on_data_entry ON kri_data_entries;
CREATE TRIGGER kri_alert_on_data_entry
AFTER INSERT ON kri_data_entries
FOR EACH ROW EXECUTE FUNCTION create_kri_alert_on_breach();

-- ============================================================================
-- PART 10: ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_risk_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_enhancement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE var_scale_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_controls ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Risks RLS
DROP POLICY IF EXISTS "Users can view their own risks" ON risks;
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own risks" ON risks;
CREATE POLICY "Users can insert their own risks"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = auth.user_organization_id());

DROP POLICY IF EXISTS "Users can update their own risks" ON risks;
CREATE POLICY "Users can update their own risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own risks" ON risks;
CREATE POLICY "Users can delete their own risks"
  ON risks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Controls RLS
DROP POLICY IF EXISTS "Users can view controls for their risks" ON controls;
CREATE POLICY "Users can view controls for their risks"
  ON controls FOR SELECT
  TO authenticated
  USING (risk_id IN (SELECT id FROM risks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert controls for their risks" ON controls;
CREATE POLICY "Users can insert controls for their risks"
  ON controls FOR INSERT
  TO authenticated
  WITH CHECK (risk_id IN (SELECT id FROM risks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update controls for their risks" ON controls;
CREATE POLICY "Users can update controls for their risks"
  ON controls FOR UPDATE
  TO authenticated
  USING (risk_id IN (SELECT id FROM risks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete controls for their risks" ON controls;
CREATE POLICY "Users can delete controls for their risks"
  ON controls FOR DELETE
  TO authenticated
  USING (risk_id IN (SELECT id FROM risks WHERE user_id = auth.uid()));

-- KRI Definitions RLS (organization-scoped)
DROP POLICY IF EXISTS "Users can view their org KRIs" ON kri_definitions;
CREATE POLICY "Users can view their org KRIs"
  ON kri_definitions FOR SELECT
  TO authenticated
  USING (organization_id = auth.user_organization_id());

DROP POLICY IF EXISTS "Users can manage their org KRIs" ON kri_definitions;
CREATE POLICY "Users can manage their org KRIs"
  ON kri_definitions FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

-- KRI Data Entries RLS
DROP POLICY IF EXISTS "Users can view their org KRI data" ON kri_data_entries;
CREATE POLICY "Users can view their org KRI data"
  ON kri_data_entries FOR SELECT
  TO authenticated
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "Users can manage their org KRI data" ON kri_data_entries;
CREATE POLICY "Users can manage their org KRI data"
  ON kri_data_entries FOR ALL
  TO authenticated
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()));

-- KRI Alerts RLS
DROP POLICY IF EXISTS "Users can view their org KRI alerts" ON kri_alerts;
CREATE POLICY "Users can view their org KRI alerts"
  ON kri_alerts FOR SELECT
  TO authenticated
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "Users can manage their org KRI alerts" ON kri_alerts;
CREATE POLICY "Users can manage their org KRI alerts"
  ON kri_alerts FOR ALL
  TO authenticated
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()));

-- KRI Risk Links RLS
DROP POLICY IF EXISTS "Users can view their org KRI risk links" ON kri_risk_links;
CREATE POLICY "Users can view their org KRI risk links"
  ON kri_risk_links FOR SELECT
  TO authenticated
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "Users can manage their org KRI risk links" ON kri_risk_links;
CREATE POLICY "Users can manage their org KRI risk links"
  ON kri_risk_links FOR ALL
  TO authenticated
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = auth.user_organization_id()));

-- Incidents RLS (organization-scoped)
DROP POLICY IF EXISTS "Users can view their org incidents" ON incidents;
CREATE POLICY "Users can view their org incidents"
  ON incidents FOR SELECT
  TO authenticated
  USING (organization_id = auth.user_organization_id());

DROP POLICY IF EXISTS "Users can manage their org incidents" ON incidents;
CREATE POLICY "Users can manage their org incidents"
  ON incidents FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

-- External Events RLS (organization-scoped)
DROP POLICY IF EXISTS "Users can view their org external events" ON external_events;
CREATE POLICY "Users can view their org external events"
  ON external_events FOR SELECT
  TO authenticated
  USING (organization_id = auth.user_organization_id());

DROP POLICY IF EXISTS "Users can manage their org external events" ON external_events;
CREATE POLICY "Users can manage their org external events"
  ON external_events FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

-- Audit Trail RLS (organization-scoped, read-only for users)
DROP POLICY IF EXISTS "Users can view their org audit trail" ON audit_trail;
CREATE POLICY "Users can view their org audit trail"
  ON audit_trail FOR SELECT
  TO authenticated
  USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- PART 11: DATABASE VIEWS
-- ============================================================================

-- Risk Coverage Analysis View
CREATE OR REPLACE VIEW risk_coverage_analysis AS
SELECT
  r.risk_code,
  r.risk_title,
  r.category,
  r.organization_id,
  COUNT(krl.kri_id) AS kri_count,
  ARRAY_AGG(k.kri_code) FILTER (WHERE k.kri_code IS NOT NULL) AS linked_kri_codes,
  ARRAY_AGG(k.kri_name) FILTER (WHERE k.kri_name IS NOT NULL) AS linked_kri_names,
  CASE
    WHEN COUNT(krl.kri_id) = 0 THEN 'No Coverage'
    WHEN COUNT(krl.kri_id) <= 2 THEN 'Basic Coverage'
    ELSE 'Good Coverage'
  END AS coverage_status
FROM risks r
LEFT JOIN kri_risk_links krl ON krl.risk_code = r.risk_code
LEFT JOIN kri_definitions k ON k.id = krl.kri_id AND k.enabled = TRUE
GROUP BY r.id, r.risk_code, r.risk_title, r.category, r.organization_id
ORDER BY kri_count ASC, r.category;

-- Risk Intelligence Summary View
CREATE OR REPLACE VIEW risk_intelligence_summary AS
SELECT
  r.risk_code,
  r.risk_title,
  COUNT(ria.id) AS total_alerts,
  COUNT(ria.id) FILTER (WHERE ria.status = 'pending') AS pending_alerts,
  COUNT(ria.id) FILTER (WHERE ria.status = 'accepted') AS accepted_alerts,
  COUNT(ria.id) FILTER (WHERE ria.status = 'rejected') AS rejected_alerts,
  COUNT(ria.id) FILTER (WHERE ria.applied_to_risk = TRUE) AS applied_alerts,
  AVG(ria.confidence_score) AS avg_confidence,
  MAX(ria.created_at) AS last_alert_date
FROM risks r
LEFT JOIN risk_intelligence_alerts ria ON ria.risk_code = r.risk_code
GROUP BY r.risk_code, r.risk_title;

-- ============================================================================
-- PART 12: STORED PROCEDURES
-- ============================================================================

-- Generate next risk code
CREATE OR REPLACE FUNCTION generate_next_risk_code(
  p_organization_id UUID,
  p_division TEXT,
  p_category TEXT
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_max_num INTEGER;
  v_next_num INTEGER;
BEGIN
  -- Create prefix from first 3 letters
  v_prefix := UPPER(SUBSTRING(p_division FROM 1 FOR 3)) || '-' ||
              UPPER(SUBSTRING(p_category FROM 1 FOR 3));

  -- Find max number for this prefix
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(risk_code FROM LENGTH(v_prefix) + 2) AS INTEGER)
  ), 0) INTO v_max_num
  FROM risks
  WHERE organization_id = p_organization_id
    AND risk_code LIKE v_prefix || '-%';

  -- Increment
  v_next_num := v_max_num + 1;

  -- Return formatted code
  RETURN v_prefix || '-' || LPAD(v_next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Expire old intelligence alerts
CREATE OR REPLACE FUNCTION expire_old_intelligence_alerts()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE risk_intelligence_alerts
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Calculate residual risk
CREATE OR REPLACE FUNCTION calculate_residual_risk(
  p_risk_id UUID,
  p_inherent_likelihood INTEGER,
  p_inherent_impact INTEGER
) RETURNS TABLE(residual_likelihood INTEGER, residual_impact INTEGER) AS $$
DECLARE
  v_likelihood_reduction NUMERIC := 0;
  v_impact_reduction NUMERIC := 0;
BEGIN
  -- Calculate max effectiveness for Likelihood controls
  SELECT COALESCE(MAX(
    CASE
      WHEN design = 0 OR implementation = 0 THEN 0
      ELSE (design + implementation + monitoring + effectiveness_evaluation)::NUMERIC / 12
    END
  ), 0) INTO v_likelihood_reduction
  FROM controls
  WHERE risk_id = p_risk_id AND target = 'Likelihood';

  -- Calculate max effectiveness for Impact controls
  SELECT COALESCE(MAX(
    CASE
      WHEN design = 0 OR implementation = 0 THEN 0
      ELSE (design + implementation + monitoring + effectiveness_evaluation)::NUMERIC / 12
    END
  ), 0) INTO v_impact_reduction
  FROM controls
  WHERE risk_id = p_risk_id AND target = 'Impact';

  -- Apply reductions (clamp to minimum 1)
  RETURN QUERY SELECT
    GREATEST(1, p_inherent_likelihood - ROUND((p_inherent_likelihood - 1) * v_likelihood_reduction))::INTEGER,
    GREATEST(1, p_inherent_impact - ROUND((p_inherent_impact - 1) * v_impact_reduction))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ MinRisk v4.0 Complete Schema Migration Successful!';
  RAISE NOTICE '📊 Created/Updated: Core tables, KRI subsystem, Incidents, Intelligence, VaR, Audit & Archive';
  RAISE NOTICE '🔒 Applied: RLS policies, indexes, triggers, views, and stored procedures';
  RAISE NOTICE '🚀 Ready for application development!';
END $$;
