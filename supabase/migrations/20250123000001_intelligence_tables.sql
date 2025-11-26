-- Create external_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  event_type TEXT,
  url TEXT,
  published_date DATE,
  relevance_checked BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create risk_intelligence_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS risk_intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES external_events(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  is_relevant BOOLEAN DEFAULT TRUE,
  confidence_score INTEGER,
  likelihood_change INTEGER DEFAULT 0,
  impact_change INTEGER DEFAULT 0,
  ai_reasoning TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  applied_to_risk BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_risk FOREIGN KEY (risk_code) REFERENCES risks(risk_code) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_external_events_org ON external_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_events_checked ON external_events(relevance_checked);
CREATE INDEX IF NOT EXISTS idx_alerts_org ON risk_intelligence_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON risk_intelligence_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_event ON risk_intelligence_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_alerts_risk ON risk_intelligence_alerts(risk_code);

-- Enable RLS
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_intelligence_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_events
DROP POLICY IF EXISTS "Users can view external events from their organization" ON external_events;
CREATE POLICY "Users can view external events from their organization"
  ON external_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert external events for their organization" ON external_events;
CREATE POLICY "Users can insert external events for their organization"
  ON external_events FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update external events from their organization" ON external_events;
CREATE POLICY "Users can update external events from their organization"
  ON external_events FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete external events from their organization" ON external_events;
CREATE POLICY "Users can delete external events from their organization"
  ON external_events FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for risk_intelligence_alerts
DROP POLICY IF EXISTS "Users can view intelligence alerts from their organization" ON risk_intelligence_alerts;
CREATE POLICY "Users can view intelligence alerts from their organization"
  ON risk_intelligence_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert intelligence alerts for their organization" ON risk_intelligence_alerts;
CREATE POLICY "Users can insert intelligence alerts for their organization"
  ON risk_intelligence_alerts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update intelligence alerts from their organization" ON risk_intelligence_alerts;
CREATE POLICY "Users can update intelligence alerts from their organization"
  ON risk_intelligence_alerts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete intelligence alerts from their organization" ON risk_intelligence_alerts;
CREATE POLICY "Users can delete intelligence alerts from their organization"
  ON risk_intelligence_alerts FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
