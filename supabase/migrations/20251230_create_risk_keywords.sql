-- Create Risk Keywords table
CREATE TABLE IF NOT EXISTS risk_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('cybersecurity', 'regulatory', 'market', 'operational', 'strategic')),
    weight NUMERIC DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, keyword)
);

-- Enable RLS
ALTER TABLE risk_keywords ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their organization's keywords"
    ON risk_keywords FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage their organization's keywords"
    ON risk_keywords FOR ALL
    USING (
        organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
        )
    );

-- Create index for performance
CREATE INDEX idx_risk_keywords_org_cat ON risk_keywords(organization_id, category);
