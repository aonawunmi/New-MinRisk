-- Migration: Create Risk Appetite and Tolerance Tables
-- Stack: Supabase (PostgreSQL)
-- Date: 2026-01-09

-- 1. Risk Appetite Statements
CREATE TABLE IF NOT EXISTS risk_appetite_statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    statement_text TEXT NOT NULL,
    effective_from DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('DRAFT', 'APPROVED', 'SUPERSEDED', 'ARCHIVED')) DEFAULT 'DRAFT',
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, version_number)
);

-- RLS for risk_appetite_statements
ALTER TABLE risk_appetite_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org appetite statements"
    ON risk_appetite_statements FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage org appetite statements"
    ON risk_appetite_statements FOR ALL
    USING (
        organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'admin')
        )
    );

-- 2. Risk Appetite Categories
CREATE TABLE IF NOT EXISTS risk_appetite_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    statement_id UUID NOT NULL REFERENCES risk_appetite_statements(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    risk_category VARCHAR(100) NOT NULL,
    appetite_level VARCHAR(20) CHECK (appetite_level IN ('ZERO', 'LOW', 'MODERATE', 'HIGH')),
    rationale TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for risk_appetite_categories
ALTER TABLE risk_appetite_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org appetite categories"
    ON risk_appetite_categories FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage org appetite categories"
    ON risk_appetite_categories FOR ALL
    USING (
        organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'admin')
        )
    );

-- 3. Appetite KRI Thresholds (formerly tolerance_metrics)
CREATE TABLE IF NOT EXISTS appetite_kri_thresholds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    appetite_category_id UUID REFERENCES risk_appetite_categories(id) ON DELETE SET NULL,
    kri_id UUID, -- Optional link to KRI Library
    metric_name VARCHAR(255) NOT NULL,
    metric_description TEXT,
    metric_type VARCHAR(20) CHECK (metric_type IN ('RANGE', 'MAXIMUM', 'MINIMUM', 'DIRECTIONAL')),
    unit VARCHAR(50),
    materiality_type VARCHAR(20) CHECK (materiality_type IN ('INTERNAL', 'EXTERNAL', 'DUAL')),
    
    -- Thresholds
    green_min NUMERIC,
    green_max NUMERIC,
    amber_min NUMERIC,
    amber_max NUMERIC,
    red_min NUMERIC,
    red_max NUMERIC,
    directional_config JSONB, -- For directional metrics
    
    is_active BOOLEAN DEFAULT false,
    effective_from DATE,
    effective_to DATE,
    
    created_by UUID REFERENCES auth.users(id),
    activated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for appetite_kri_thresholds
ALTER TABLE appetite_kri_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org kri thresholds"
    ON appetite_kri_thresholds FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage org kri thresholds"
    ON appetite_kri_thresholds FOR ALL
    USING (
        organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'admin')
        )
    );

-- Indexes
CREATE INDEX idx_appetite_statements_org ON risk_appetite_statements(organization_id);
CREATE INDEX idx_appetite_categories_stmt ON risk_appetite_categories(statement_id);
CREATE INDEX idx_appetite_thresholds_org ON appetite_kri_thresholds(organization_id);
CREATE INDEX idx_appetite_thresholds_cat ON appetite_kri_thresholds(appetite_category_id);
