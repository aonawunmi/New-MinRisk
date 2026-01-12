-- ============================================================================
-- RAF Phase 1: Complete Schema Migration
-- ============================================================================
-- Date: 2026-01-12
-- Branch: feature/raf-full-implementation
-- Purpose: Add missing RAF tables for limits, breaches, history, and risk linkage
-- ============================================================================

-- ============================================================================
-- 1. RISK LIMITS TABLE
-- Hard/soft limits with escalation rules attached to tolerance metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tolerance_id UUID NOT NULL REFERENCES appetite_kri_thresholds(id) ON DELETE CASCADE,
    
    -- Limit Values
    soft_limit NUMERIC NOT NULL,
    hard_limit NUMERIC NOT NULL,
    
    -- Limit Direction
    limit_direction VARCHAR(10) DEFAULT 'UPPER' CHECK (limit_direction IN ('UPPER', 'LOWER')),
    
    -- Escalation Configuration
    escalation_requirement TEXT,
    soft_notify_roles TEXT[] DEFAULT '{}',
    hard_notify_roles TEXT[] DEFAULT '{}',
    board_escalation_required BOOLEAN DEFAULT false,
    regulator_notification_required BOOLEAN DEFAULT false,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for risk_limits
ALTER TABLE risk_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org risk limits"
    ON risk_limits FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage org risk limits"
    ON risk_limits FOR ALL
    USING (
        organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'admin')
        )
    );

-- ============================================================================
-- 2. RISK BREACHES TABLE
-- Automatic breach logging when tolerances/limits are exceeded
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_breaches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tolerance_id UUID REFERENCES appetite_kri_thresholds(id) ON DELETE SET NULL,
    limit_id UUID REFERENCES risk_limits(id) ON DELETE SET NULL,
    kri_data_entry_id UUID REFERENCES kri_data_entries(id) ON DELETE SET NULL,
    
    -- Breach Details
    breach_type VARCHAR(20) NOT NULL CHECK (breach_type IN ('SOFT', 'HARD', 'CRITICAL')),
    breach_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    breach_value NUMERIC NOT NULL,
    threshold_value NUMERIC NOT NULL,
    variance_amount NUMERIC,
    variance_percentage NUMERIC,
    
    -- Breach Classification
    is_tolerance_breach BOOLEAN DEFAULT false,
    is_limit_breach BOOLEAN DEFAULT false,
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Root Cause Information
    root_cause TEXT,
    root_cause_category VARCHAR(100),
    business_justification TEXT,
    compensating_controls TEXT,
    
    -- Status Tracking
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 
        'ACKNOWLEDGED', 
        'INVESTIGATING', 
        'REMEDIATION_IN_PROGRESS',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'RESOLVED',
        'CLOSED'
    )),
    
    -- Escalation Tracking
    escalated_to_cro BOOLEAN DEFAULT false,
    escalated_to_cro_at TIMESTAMP WITH TIME ZONE,
    escalated_to_board BOOLEAN DEFAULT false,
    escalated_to_board_at TIMESTAMP WITH TIME ZONE,
    regulator_notified BOOLEAN DEFAULT false,
    regulator_notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Acknowledgment
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_notes TEXT,
    
    -- Resolution
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    resolution_actions TEXT,
    
    -- Board Approval (for exceptions)
    board_approved BOOLEAN DEFAULT false,
    board_approved_by UUID REFERENCES auth.users(id),
    board_approved_at TIMESTAMP WITH TIME ZONE,
    board_approval_rationale TEXT,
    exception_valid_until DATE,
    
    -- KRI Threshold Adjustment (auto-tightening)
    kri_threshold_tightened BOOLEAN DEFAULT false,
    kri_threshold_tightened_by_percent NUMERIC,
    kri_threshold_reset_allowed BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for risk_breaches
ALTER TABLE risk_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org breaches"
    ON risk_breaches FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage org breaches"
    ON risk_breaches FOR ALL
    USING (
        organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'admin')
        )
    );

-- ============================================================================
-- 3. RISK APPETITE HISTORY TABLE
-- Version control and audit trail for all appetite/tolerance changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_appetite_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Entity Reference
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
        'STATEMENT', 'CATEGORY', 'TOLERANCE', 'LIMIT', 'BREACH'
    )),
    entity_id UUID NOT NULL,
    
    -- Change Details
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'SUPERSEDE')),
    changed_field VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    
    -- Governance
    board_resolution_reference VARCHAR(100),
    
    -- User Information
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for risk_appetite_history
ALTER TABLE risk_appetite_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org appetite history"
    ON risk_appetite_history FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert appetite history"
    ON risk_appetite_history FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 4. ADD APPETITE LINKAGE TO RISKS TABLE
-- ============================================================================
DO $$
BEGIN
    -- Add appetite_category_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risks' AND column_name = 'appetite_category_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN appetite_category_id UUID REFERENCES risk_appetite_categories(id) ON DELETE SET NULL;
    END IF;
    
    -- Add RAF adjusted score
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risks' AND column_name = 'raf_adjusted_score'
    ) THEN
        ALTER TABLE risks ADD COLUMN raf_adjusted_score NUMERIC;
    END IF;
    
    -- Add out of appetite flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risks' AND column_name = 'out_of_appetite'
    ) THEN
        ALTER TABLE risks ADD COLUMN out_of_appetite BOOLEAN DEFAULT false;
    END IF;
    
    -- Add appetite multiplier
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risks' AND column_name = 'appetite_multiplier'
    ) THEN
        ALTER TABLE risks ADD COLUMN appetite_multiplier NUMERIC DEFAULT 1.0;
    END IF;
END $$;

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_risk_limits_tolerance ON risk_limits(tolerance_id);
CREATE INDEX IF NOT EXISTS idx_risk_limits_org ON risk_limits(organization_id);

CREATE INDEX IF NOT EXISTS idx_risk_breaches_org ON risk_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_breaches_tolerance ON risk_breaches(tolerance_id);
CREATE INDEX IF NOT EXISTS idx_risk_breaches_status ON risk_breaches(status) WHERE status NOT IN ('RESOLVED', 'CLOSED');
CREATE INDEX IF NOT EXISTS idx_risk_breaches_date ON risk_breaches(breach_date DESC);

CREATE INDEX IF NOT EXISTS idx_appetite_history_org ON risk_appetite_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_appetite_history_entity ON risk_appetite_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_appetite_history_date ON risk_appetite_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_risks_appetite_category ON risks(appetite_category_id) WHERE appetite_category_id IS NOT NULL;

-- ============================================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_risk_limits_updated_at ON risk_limits;
CREATE TRIGGER update_risk_limits_updated_at
    BEFORE UPDATE ON risk_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_risk_breaches_updated_at ON risk_breaches;
CREATE TRIGGER update_risk_breaches_updated_at
    BEFORE UPDATE ON risk_breaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. HISTORY LOGGING TRIGGER FUNCTION
-- Automatically log changes to appetite entities
-- ============================================================================
CREATE OR REPLACE FUNCTION log_appetite_change()
RETURNS TRIGGER AS $$
DECLARE
    v_entity_type VARCHAR(50);
    v_action VARCHAR(20);
BEGIN
    -- Determine entity type from table name
    CASE TG_TABLE_NAME
        WHEN 'risk_appetite_statements' THEN v_entity_type := 'STATEMENT';
        WHEN 'risk_appetite_categories' THEN v_entity_type := 'CATEGORY';
        WHEN 'appetite_kri_thresholds' THEN v_entity_type := 'TOLERANCE';
        WHEN 'risk_limits' THEN v_entity_type := 'LIMIT';
        WHEN 'risk_breaches' THEN v_entity_type := 'BREACH';
        ELSE v_entity_type := 'UNKNOWN';
    END CASE;
    
    -- Determine action
    CASE TG_OP
        WHEN 'INSERT' THEN v_action := 'CREATE';
        WHEN 'UPDATE' THEN v_action := 'UPDATE';
        WHEN 'DELETE' THEN v_action := 'DELETE';
    END CASE;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO risk_appetite_history (
            organization_id, entity_type, entity_id, action, old_value, changed_by
        ) VALUES (
            OLD.organization_id, v_entity_type, OLD.id, v_action, to_jsonb(OLD), auth.uid()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO risk_appetite_history (
            organization_id, entity_type, entity_id, action, old_value, new_value, changed_by
        ) VALUES (
            NEW.organization_id, v_entity_type, NEW.id, v_action, to_jsonb(OLD), to_jsonb(NEW), auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO risk_appetite_history (
            organization_id, entity_type, entity_id, action, new_value, changed_by
        ) VALUES (
            NEW.organization_id, v_entity_type, NEW.id, v_action, to_jsonb(NEW), auth.uid()
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply history logging triggers
DROP TRIGGER IF EXISTS log_appetite_statement_changes ON risk_appetite_statements;
CREATE TRIGGER log_appetite_statement_changes
    AFTER INSERT OR UPDATE OR DELETE ON risk_appetite_statements
    FOR EACH ROW EXECUTE FUNCTION log_appetite_change();

DROP TRIGGER IF EXISTS log_appetite_category_changes ON risk_appetite_categories;
CREATE TRIGGER log_appetite_category_changes
    AFTER INSERT OR UPDATE OR DELETE ON risk_appetite_categories
    FOR EACH ROW EXECUTE FUNCTION log_appetite_change();

DROP TRIGGER IF EXISTS log_tolerance_changes ON appetite_kri_thresholds;
CREATE TRIGGER log_tolerance_changes
    AFTER INSERT OR UPDATE OR DELETE ON appetite_kri_thresholds
    FOR EACH ROW EXECUTE FUNCTION log_appetite_change();

DROP TRIGGER IF EXISTS log_limit_changes ON risk_limits;
CREATE TRIGGER log_limit_changes
    AFTER INSERT OR UPDATE OR DELETE ON risk_limits
    FOR EACH ROW EXECUTE FUNCTION log_appetite_change();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created:
-- ✅ risk_limits - Hard/soft limits with escalation
-- ✅ risk_breaches - Automatic breach logging
-- ✅ risk_appetite_history - Version control/audit trail
-- ✅ Added appetite_category_id, raf_adjusted_score, out_of_appetite to risks
-- ✅ Indexes for performance
-- ✅ RLS policies for security
-- ✅ Automatic history logging triggers
-- ============================================================================
