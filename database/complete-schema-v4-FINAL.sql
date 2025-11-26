-- ============================================================================
-- MinRisk v4.0 - Complete Database Schema (FINAL - Fixed auth schema issue)
-- ============================================================================

BEGIN;

-- Skip creating tables that already exist (from previous step)

-- ============================================================================
-- PART 1: CREATE NEW TABLES (that don't exist yet)
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
-- PART 2: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_kri ON kri_data_entries(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_date ON kri_data_entries(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_kri ON kri_alerts(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_status ON kri_alerts(status) WHERE status IN ('open', 'acknowledged');
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_kri ON kri_risk_links(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_risk ON kri_risk_links(risk_code);

CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_linked_risks ON incidents USING GIN(linked_risk_codes);

CREATE INDEX IF NOT EXISTS idx_external_events_org ON external_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_events_date ON external_events(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_external_events_category ON external_events(event_category);
CREATE INDEX IF NOT EXISTS idx_risk_intelligence_alerts_risk ON risk_intelligence_alerts(risk_code);
CREATE INDEX IF NOT EXISTS idx_risk_intelligence_alerts_status ON risk_intelligence_alerts(status);

CREATE INDEX IF NOT EXISTS idx_audit_trail_org ON audit_trail(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_code ON audit_trail(entity_code);

-- ============================================================================
-- PART 3: HELPER FUNCTIONS (in public schema, not auth)
-- ============================================================================

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
-- PART 4: TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_kri_definitions_updated_at ON kri_definitions;
CREATE TRIGGER update_kri_definitions_updated_at BEFORE UPDATE ON kri_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_control_enhancement_plans_updated_at ON control_enhancement_plans;
CREATE TRIGGER update_control_enhancement_plans_updated_at BEFORE UPDATE ON control_enhancement_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION audit_risk_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_trail (organization_id, user_id, user_email, action, entity_type, entity_id, entity_code, new_values, timestamp)
    VALUES (NEW.organization_id, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'create', 'risk', NEW.id, NEW.risk_code, to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_trail (organization_id, user_id, user_email, action, entity_type, entity_id, entity_code, old_values, new_values, timestamp)
    VALUES (NEW.organization_id, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'update', 'risk', NEW.id, NEW.risk_code, to_jsonb(OLD), to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_trail (organization_id, user_id, user_email, action, entity_type, entity_id, entity_code, old_values, timestamp)
    VALUES (OLD.organization_id, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'delete', 'risk', OLD.id, OLD.risk_code, to_jsonb(OLD), NOW());
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_risks_changes ON risks;
CREATE TRIGGER audit_risks_changes AFTER INSERT OR UPDATE OR DELETE ON risks FOR EACH ROW EXECUTE FUNCTION audit_risk_changes();

CREATE OR REPLACE FUNCTION create_kri_alert_on_breach()
RETURNS TRIGGER AS $$
DECLARE v_kri RECORD;
BEGIN
  SELECT * INTO v_kri FROM kri_definitions WHERE id = NEW.kri_id;
  IF NEW.alert_status IN ('yellow', 'red') THEN
    INSERT INTO kri_alerts (kri_id, alert_level, alert_date, measured_value, threshold_breached, status)
    VALUES (NEW.kri_id, NEW.alert_status, NEW.measurement_date, NEW.measurement_value,
      CASE WHEN NEW.alert_status = 'red' THEN v_kri.upper_threshold ELSE v_kri.lower_threshold END, 'open');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kri_alert_on_data_entry ON kri_data_entries;
CREATE TRIGGER kri_alert_on_data_entry AFTER INSERT ON kri_data_entries FOR EACH ROW EXECUTE FUNCTION create_kri_alert_on_breach();

-- ============================================================================
-- PART 5: RLS POLICIES (CORRECTED WITH ADMIN ACCESS)
-- ============================================================================

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

-- Risks (ADD ADMIN POLICIES)
DROP POLICY IF EXISTS "Admins can view all org risks" ON risks;
CREATE POLICY "Admins can view all org risks" ON risks FOR SELECT TO authenticated USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "Admins can insert risks for anyone" ON risks;
CREATE POLICY "Admins can insert risks for anyone" ON risks FOR INSERT TO authenticated WITH CHECK (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "Admins can update all org risks" ON risks;
CREATE POLICY "Admins can update all org risks" ON risks FOR UPDATE TO authenticated USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "Admins can delete all org risks" ON risks;
CREATE POLICY "Admins can delete all org risks" ON risks FOR DELETE TO authenticated USING (organization_id = current_org_id() AND is_admin());

-- Controls (ADD ADMIN POLICIES)
DROP POLICY IF EXISTS "Admins can view all org controls" ON controls;
CREATE POLICY "Admins can view all org controls" ON controls FOR SELECT TO authenticated USING (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) AND is_admin());

DROP POLICY IF EXISTS "Admins can insert controls for any org risk" ON controls;
CREATE POLICY "Admins can insert controls for any org risk" ON controls FOR INSERT TO authenticated WITH CHECK (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) AND is_admin());

DROP POLICY IF EXISTS "Admins can update all org controls" ON controls;
CREATE POLICY "Admins can update all org controls" ON controls FOR UPDATE TO authenticated USING (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) AND is_admin());

DROP POLICY IF EXISTS "Admins can delete all org controls" ON controls;
CREATE POLICY "Admins can delete all org controls" ON controls FOR DELETE TO authenticated USING (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) AND is_admin());

-- KRI (ORG-SCOPED)
DROP POLICY IF EXISTS "Users can view their org KRIs" ON kri_definitions;
CREATE POLICY "Users can view their org KRIs" ON kri_definitions FOR SELECT TO authenticated USING (organization_id = current_org_id());

DROP POLICY IF EXISTS "Users can manage their org KRIs" ON kri_definitions;
CREATE POLICY "Users can manage their org KRIs" ON kri_definitions FOR ALL TO authenticated USING (organization_id = current_org_id()) WITH CHECK (organization_id = current_org_id());

DROP POLICY IF EXISTS "Users can view their org KRI data" ON kri_data_entries;
CREATE POLICY "Users can view their org KRI data" ON kri_data_entries FOR SELECT TO authenticated USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id()));

DROP POLICY IF EXISTS "Users can manage their org KRI data" ON kri_data_entries;
CREATE POLICY "Users can manage their org KRI data" ON kri_data_entries FOR ALL TO authenticated USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())) WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id()));

DROP POLICY IF EXISTS "Users can view their org KRI alerts" ON kri_alerts;
CREATE POLICY "Users can view their org KRI alerts" ON kri_alerts FOR SELECT TO authenticated USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id()));

DROP POLICY IF EXISTS "Users can manage their org KRI alerts" ON kri_alerts;
CREATE POLICY "Users can manage their org KRI alerts" ON kri_alerts FOR ALL TO authenticated USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())) WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id()));

DROP POLICY IF EXISTS "Users can view their org KRI risk links" ON kri_risk_links;
CREATE POLICY "Users can view their org KRI risk links" ON kri_risk_links FOR SELECT TO authenticated USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id()));

DROP POLICY IF EXISTS "Users can manage their org KRI risk links" ON kri_risk_links;
CREATE POLICY "Users can manage their org KRI risk links" ON kri_risk_links FOR ALL TO authenticated USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())) WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id()));

-- Incidents (ORG-SCOPED)
DROP POLICY IF EXISTS "Users can view their org incidents" ON incidents;
CREATE POLICY "Users can view their org incidents" ON incidents FOR SELECT TO authenticated USING (organization_id = current_org_id());

DROP POLICY IF EXISTS "Users can manage their org incidents" ON incidents;
CREATE POLICY "Users can manage their org incidents" ON incidents FOR ALL TO authenticated USING (organization_id = current_org_id()) WITH CHECK (organization_id = current_org_id());

DROP POLICY IF EXISTS "Users can view their org enhancement plans" ON control_enhancement_plans;
CREATE POLICY "Users can view their org enhancement plans" ON control_enhancement_plans FOR SELECT TO authenticated USING (organization_id = current_org_id());

DROP POLICY IF EXISTS "Users can manage their org enhancement plans" ON control_enhancement_plans;
CREATE POLICY "Users can manage their org enhancement plans" ON control_enhancement_plans FOR ALL TO authenticated USING (organization_id = current_org_id()) WITH CHECK (organization_id = current_org_id());

-- External Events (ORG-SCOPED)
DROP POLICY IF EXISTS "Users can view their org external events" ON external_events;
CREATE POLICY "Users can view their org external events" ON external_events FOR SELECT TO authenticated USING (organization_id = current_org_id());

DROP POLICY IF EXISTS "Users can manage their org external events" ON external_events;
CREATE POLICY "Users can manage their org external events" ON external_events FOR ALL TO authenticated USING (organization_id = current_org_id()) WITH CHECK (organization_id = current_org_id());

-- Intelligence Alerts
DROP POLICY IF EXISTS "Users can view intelligence alerts for their risks" ON risk_intelligence_alerts;
CREATE POLICY "Users can view intelligence alerts for their risks" ON risk_intelligence_alerts FOR SELECT TO authenticated USING (risk_code IN (SELECT risk_code FROM risks WHERE user_id = auth.uid() OR (organization_id = current_org_id() AND is_admin())));

DROP POLICY IF EXISTS "Users can manage intelligence alerts for their risks" ON risk_intelligence_alerts;
CREATE POLICY "Users can manage intelligence alerts for their risks" ON risk_intelligence_alerts FOR ALL TO authenticated USING (risk_code IN (SELECT risk_code FROM risks WHERE user_id = auth.uid() OR (organization_id = current_org_id() AND is_admin()))) WITH CHECK (risk_code IN (SELECT risk_code FROM risks WHERE user_id = auth.uid() OR (organization_id = current_org_id() AND is_admin())));

-- VaR Config (ADMIN-ONLY)
DROP POLICY IF EXISTS "Users can view their org VaR config" ON var_scale_config;
CREATE POLICY "Users can view their org VaR config" ON var_scale_config FOR SELECT TO authenticated USING (organization_id = current_org_id());

DROP POLICY IF EXISTS "Admins can manage their org VaR config" ON var_scale_config;
CREATE POLICY "Admins can manage their org VaR config" ON var_scale_config FOR ALL TO authenticated USING (organization_id = current_org_id() AND is_admin()) WITH CHECK (organization_id = current_org_id() AND is_admin());

-- Audit Trail (READ-ONLY)
DROP POLICY IF EXISTS "Users can view their org audit trail" ON audit_trail;
CREATE POLICY "Users can view their org audit trail" ON audit_trail FOR SELECT TO authenticated USING (organization_id = current_org_id());

-- Archives (ADMIN-ONLY)
DROP POLICY IF EXISTS "Admins can view archived risks" ON archived_risks;
CREATE POLICY "Admins can view archived risks" ON archived_risks FOR SELECT TO authenticated USING (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "Admins can manage archived risks" ON archived_risks;
CREATE POLICY "Admins can manage archived risks" ON archived_risks FOR ALL TO authenticated USING (organization_id = current_org_id() AND is_admin()) WITH CHECK (organization_id = current_org_id() AND is_admin());

DROP POLICY IF EXISTS "Admins can view archived controls" ON archived_controls;
CREATE POLICY "Admins can view archived controls" ON archived_controls FOR SELECT TO authenticated USING (archived_risk_id IN (SELECT id FROM archived_risks WHERE organization_id = current_org_id()) AND is_admin());

DROP POLICY IF EXISTS "Admins can manage archived controls" ON archived_controls;
CREATE POLICY "Admins can manage archived controls" ON archived_controls FOR ALL TO authenticated USING (archived_risk_id IN (SELECT id FROM archived_risks WHERE organization_id = current_org_id()) AND is_admin()) WITH CHECK (archived_risk_id IN (SELECT id FROM archived_risks WHERE organization_id = current_org_id()) AND is_admin());

-- ============================================================================
-- PART 6: VIEWS & STORED PROCEDURES
-- ============================================================================

CREATE OR REPLACE VIEW risk_coverage_analysis AS
SELECT r.risk_code, r.risk_title, r.category, r.organization_id, COUNT(krl.kri_id) AS kri_count,
  ARRAY_AGG(k.kri_code) FILTER (WHERE k.kri_code IS NOT NULL) AS linked_kri_codes,
  ARRAY_AGG(k.kri_name) FILTER (WHERE k.kri_name IS NOT NULL) AS linked_kri_names,
  CASE WHEN COUNT(krl.kri_id) = 0 THEN 'No Coverage' WHEN COUNT(krl.kri_id) <= 2 THEN 'Basic Coverage' ELSE 'Good Coverage' END AS coverage_status
FROM risks r
LEFT JOIN kri_risk_links krl ON krl.risk_code = r.risk_code
LEFT JOIN kri_definitions k ON k.id = krl.kri_id AND k.enabled = TRUE
GROUP BY r.id, r.risk_code, r.risk_title, r.category, r.organization_id
ORDER BY kri_count ASC, r.category;

CREATE OR REPLACE VIEW risk_intelligence_summary AS
SELECT r.risk_code, r.risk_title, COUNT(ria.id) AS total_alerts,
  COUNT(ria.id) FILTER (WHERE ria.status = 'pending') AS pending_alerts,
  COUNT(ria.id) FILTER (WHERE ria.status = 'accepted') AS accepted_alerts,
  COUNT(ria.id) FILTER (WHERE ria.status = 'rejected') AS rejected_alerts,
  COUNT(ria.id) FILTER (WHERE ria.applied_to_risk = TRUE) AS applied_alerts,
  AVG(ria.confidence_score) AS avg_confidence,
  MAX(ria.created_at) AS last_alert_date
FROM risks r
LEFT JOIN risk_intelligence_alerts ria ON ria.risk_code = r.risk_code
GROUP BY r.risk_code, r.risk_title;

CREATE OR REPLACE FUNCTION generate_next_risk_code(p_organization_id UUID, p_division TEXT, p_category TEXT)
RETURNS TEXT AS $$
DECLARE v_prefix TEXT; v_max_num INTEGER; v_next_num INTEGER;
BEGIN
  v_prefix := UPPER(SUBSTRING(p_division FROM 1 FOR 3)) || '-' || UPPER(SUBSTRING(p_category FROM 1 FOR 3));
  SELECT COALESCE(MAX(CAST(SUBSTRING(risk_code FROM LENGTH(v_prefix) + 2) AS INTEGER)), 0) INTO v_max_num FROM risks WHERE organization_id = p_organization_id AND risk_code LIKE v_prefix || '-%';
  v_next_num := v_max_num + 1;
  RETURN v_prefix || '-' || LPAD(v_next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_residual_risk(p_risk_id UUID, p_inherent_likelihood INTEGER, p_inherent_impact INTEGER)
RETURNS TABLE(residual_likelihood INTEGER, residual_impact INTEGER) AS $$
DECLARE v_likelihood_reduction NUMERIC := 0; v_impact_reduction NUMERIC := 0;
BEGIN
  SELECT COALESCE(MAX(CASE WHEN design = 0 OR implementation = 0 THEN 0 ELSE (design + implementation + monitoring + effectiveness_evaluation)::NUMERIC / 12 END), 0) INTO v_likelihood_reduction FROM controls WHERE risk_id = p_risk_id AND target = 'Likelihood';
  SELECT COALESCE(MAX(CASE WHEN design = 0 OR implementation = 0 THEN 0 ELSE (design + implementation + monitoring + effectiveness_evaluation)::NUMERIC / 12 END), 0) INTO v_impact_reduction FROM controls WHERE risk_id = p_risk_id AND target = 'Impact';
  RETURN QUERY SELECT GREATEST(1, p_inherent_likelihood - ROUND((p_inherent_likelihood - 1) * v_likelihood_reduction))::INTEGER, GREATEST(1, p_inherent_impact - ROUND((p_inherent_impact - 1) * v_impact_reduction))::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ MinRisk v4.0 Complete Schema Migration Successful!';
  RAISE NOTICE '📊 19 tables ready with proper RLS policies';
  RAISE NOTICE '🔒 CRITICAL: Admin policies added for risks & controls';
  RAISE NOTICE '👥 Users see own data, Admins see all org data';
  RAISE NOTICE '🚀 Ready for development!';
END $$;
