-- Create RSS sources table
CREATE TABLE IF NOT EXISTS rss_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    category TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_scanned_at TIMESTAMPTZ,
    last_scan_status TEXT, -- 'success', 'failed'
    last_scan_error TEXT,
    events_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their organization's RSS sources"
    ON rss_sources FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage their organization's RSS sources"
    ON rss_sources FOR ALL
    USING (
        organization_id = (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
        AND
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
        )
    );

-- Create index for performance
CREATE INDEX idx_rss_sources_org_id ON rss_sources(organization_id);
CREATE INDEX idx_rss_sources_active ON rss_sources(is_active) WHERE is_active = true;
