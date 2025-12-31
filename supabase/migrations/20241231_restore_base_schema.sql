-- RESTORE BASE SCHEMA
-- Missing tables required by subsequent migrations

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'primary_admin', 'secondary_admin', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subscription_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    full_name TEXT,
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create App Configs Table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;

-- 5. Create Risks Table
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
  last_incident_date TIMESTAMP WITH TIME ZONE,
  last_intelligence_check TIMESTAMP WITH TIME ZONE,
  residual_likelihood INTEGER CHECK (residual_likelihood >= 1 AND residual_likelihood <= 6),
  residual_impact INTEGER CHECK (residual_impact >= 1 AND residual_impact <= 6),
  residual_score INTEGER,
  owner_profile_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, risk_code)
);

ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

-- 6. Create Controls Table
CREATE TABLE IF NOT EXISTS controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('Likelihood', 'Impact')),
  design INTEGER DEFAULT 0 CHECK (design >= 0 AND design <= 3),
  implementation INTEGER DEFAULT 0 CHECK (implementation >= 0 AND implementation <= 3),
  monitoring INTEGER DEFAULT 0 CHECK (monitoring >= 0 AND monitoring <= 3),
  effectiveness_evaluation INTEGER DEFAULT 0 CHECK (effectiveness_evaluation >= 0 AND effectiveness_evaluation <= 3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE controls ENABLE ROW LEVEL SECURITY;

-- 7. Create Incidents Table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- 8. Basic RLS Policies
-- Organizations: Users can view their own
DO $$ BEGIN
CREATE POLICY "Users can view own organization" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles: Users can view and update their own
DO $$ BEGIN
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT
    USING (id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE
    USING (id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Risks, Controls, Incidents: Basic Org Access
DO $$ BEGIN
CREATE POLICY "Users can view org risks" ON risks
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE POLICY "Users can view org controls" ON controls
    FOR SELECT USING (risk_id IN (SELECT id FROM risks WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE POLICY "Users can view org incidents" ON incidents
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;
