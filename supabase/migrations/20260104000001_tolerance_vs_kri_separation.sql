-- =====================================================
-- TOLERANCE VS KRI SEPARATION MIGRATION
-- =====================================================
-- This migration properly separates:
-- 1. TOLERANCE LIMITS (hard boundaries - governance events)
-- 2. KRI THRESHOLDS (early warning signals - expected to breach)
-- Branch: feature/tolerance-vs-kri-separation
-- Date: 2026-01-04
-- =====================================================

-- =====================================================
-- PART 1: ADD TOLERANCE LIMIT TO APPETITE CATEGORIES
-- =====================================================
-- The tolerance limit is the HARD BOUNDARY - crossing it is a governance event

ALTER TABLE risk_appetite_categories
ADD COLUMN IF NOT EXISTS tolerance_limit_value NUMERIC,
ADD COLUMN IF NOT EXISTS tolerance_limit_unit VARCHAR(50) DEFAULT 'count',
ADD COLUMN IF NOT EXISTS tolerance_limit_description TEXT,
ADD COLUMN IF NOT EXISTS tolerance_limit_direction VARCHAR(10) DEFAULT 'max' 
  CHECK (tolerance_limit_direction IN ('max', 'min'));

COMMENT ON COLUMN risk_appetite_categories.tolerance_limit_value IS 
  'Hard boundary value - breaching this triggers a tolerance exception (governance event)';
COMMENT ON COLUMN risk_appetite_categories.tolerance_limit_unit IS 
  'Unit of measurement: count, %, $, days, etc.';
COMMENT ON COLUMN risk_appetite_categories.tolerance_limit_direction IS 
  'max = must not exceed, min = must not fall below';

-- =====================================================
-- PART 2: RENAME tolerance_metrics TO appetite_kri_thresholds
-- =====================================================
-- These are EARLY WARNING INDICATORS that operate INSIDE the tolerance limit
-- Green/Amber/Red thresholds are designed to be breached

-- First check if table exists and rename
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tolerance_metrics') THEN
    -- Rename the table
    ALTER TABLE tolerance_metrics RENAME TO appetite_kri_thresholds;
    
    -- Add clarifying columns
    ALTER TABLE appetite_kri_thresholds
    ADD COLUMN IF NOT EXISTS is_early_warning BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS linked_to_tolerance BOOLEAN DEFAULT true;
    
    RAISE NOTICE 'Renamed tolerance_metrics to appetite_kri_thresholds';
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS appetite_kri_thresholds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      appetite_category_id UUID NOT NULL REFERENCES risk_appetite_categories(id) ON DELETE CASCADE,
      
      -- KRI identification
      metric_name VARCHAR(255) NOT NULL,
      metric_description TEXT,
      metric_type VARCHAR(20) DEFAULT 'MAXIMUM' CHECK (metric_type IN ('MAXIMUM', 'MINIMUM', 'RANGE', 'DUAL')),
      unit VARCHAR(50),
      materiality_type VARCHAR(20) DEFAULT 'INTERNAL' CHECK (materiality_type IN ('INTERNAL', 'EXTERNAL', 'BOTH')),
      
      -- Early warning thresholds (DESIGNED TO BREACH)
      green_max NUMERIC,  -- Normal operating range
      amber_max NUMERIC,  -- Attention required
      red_min NUMERIC,    -- Imminent tolerance risk (NOT a breach - a warning)
      green_min NUMERIC,
      amber_min NUMERIC,
      red_max NUMERIC,
      
      -- Clarifying fields
      is_early_warning BOOLEAN DEFAULT true,
      linked_to_tolerance BOOLEAN DEFAULT true,
      
      -- Link to existing KRI library (optional)
      kri_id UUID REFERENCES org_kri_kci(id),
      
      -- Status and audit
      is_active BOOLEAN DEFAULT false,
      never_activated BOOLEAN DEFAULT true,
      version INTEGER DEFAULT 1,
      created_by UUID REFERENCES user_profiles(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE 'Created appetite_kri_thresholds table';
  END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_tolerance_metrics_org;
DROP INDEX IF EXISTS idx_tolerance_metrics_category;
CREATE INDEX IF NOT EXISTS idx_appetite_kri_thresholds_org ON appetite_kri_thresholds(organization_id);
CREATE INDEX IF NOT EXISTS idx_appetite_kri_thresholds_category ON appetite_kri_thresholds(appetite_category_id);

-- =====================================================
-- PART 3: CREATE SEPARATE TRACKING TABLES
-- =====================================================

-- KRI Alerts (expected, frequent, management-level)
CREATE TABLE IF NOT EXISTS kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kri_threshold_id UUID NOT NULL REFERENCES appetite_kri_thresholds(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alert_level VARCHAR(10) NOT NULL CHECK (alert_level IN ('AMBER', 'RED')),
  current_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  
  -- Context
  description TEXT,
  trend_direction VARCHAR(10) CHECK (trend_direction IN ('improving', 'stable', 'worsening')),
  velocity_score INTEGER CHECK (velocity_score BETWEEN 1 AND 5),
  
  -- Response
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'monitoring', 'resolved')),
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE kri_alerts IS 
  'Early warning alerts from KRI threshold breaches - expected and frequent, requires attention not governance action';

-- Tolerance Exceptions (rare, governance-level, Board/regulator reporting)
CREATE TABLE IF NOT EXISTS tolerance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appetite_category_id UUID NOT NULL REFERENCES risk_appetite_categories(id) ON DELETE CASCADE,
  
  -- Exception details
  exception_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('BREACH', 'CRITICAL')),
  current_value NUMERIC NOT NULL,
  tolerance_limit NUMERIC NOT NULL,
  variance_amount NUMERIC,
  variance_percentage NUMERIC,
  
  -- Governance context
  exception_reason TEXT NOT NULL,
  business_justification TEXT NOT NULL,
  compensating_controls TEXT,
  risk_assessment TEXT,
  
  -- Approval workflow (mandatory for tolerance breaches)
  status VARCHAR(30) DEFAULT 'PENDING_APPROVAL' 
    CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'REMEDIATED')),
  requested_by UUID REFERENCES user_profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Validity (exceptions must have end dates)
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  
  -- Board reporting
  board_notified BOOLEAN DEFAULT false,
  board_notified_at TIMESTAMP WITH TIME ZONE,
  board_minutes_reference VARCHAR(100),
  regulator_notified BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE tolerance_exceptions IS 
  'Governance-level tolerance breaches - rare, requires Board/regulator notification and formal approval';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kri_alerts_org ON kri_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_status ON kri_alerts(status);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_date ON kri_alerts(alert_date);

CREATE INDEX IF NOT EXISTS idx_tolerance_exceptions_org ON tolerance_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_tolerance_exceptions_status ON tolerance_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_tolerance_exceptions_date ON tolerance_exceptions(exception_date);

-- =====================================================
-- PART 4: UPDATE VIEWS FOR PROPER SEMANTICS
-- =====================================================

-- View: KRI Alert Dashboard (Management-level)
CREATE OR REPLACE VIEW kri_alert_dashboard AS
SELECT
  ka.id AS alert_id,
  ka.organization_id,
  akt.metric_name,
  rac.risk_category,
  rac.appetite_level,
  ka.alert_level,
  ka.current_value,
  ka.threshold_value,
  ka.trend_direction,
  ka.velocity_score,
  ka.status,
  ka.alert_date,
  -- Tolerance context
  rac.tolerance_limit_value,
  rac.tolerance_limit_unit,
  CASE 
    WHEN ka.current_value >= rac.tolerance_limit_value THEN 'IMMINENT_BREACH'
    WHEN ka.alert_level = 'RED' THEN 'ACT_NOW'
    ELSE 'MONITOR'
  END AS urgency_level
FROM kri_alerts ka
JOIN appetite_kri_thresholds akt ON ka.kri_threshold_id = akt.id
JOIN risk_appetite_categories rac ON akt.appetite_category_id = rac.id
ORDER BY 
  CASE ka.alert_level WHEN 'RED' THEN 1 ELSE 2 END,
  ka.alert_date DESC;

COMMENT ON VIEW kri_alert_dashboard IS 
  'Management dashboard for KRI alerts - shows early warning status relative to tolerance limits';

-- View: Tolerance Exception Report (Board/Regulator-level)
CREATE OR REPLACE VIEW tolerance_exception_report AS
SELECT
  te.id AS exception_id,
  te.organization_id,
  rac.risk_category,
  rac.appetite_level,
  te.severity,
  te.current_value,
  te.tolerance_limit,
  te.variance_percentage,
  te.exception_reason,
  te.business_justification,
  te.compensating_controls,
  te.status,
  te.valid_from,
  te.valid_until,
  te.board_notified,
  te.regulator_notified,
  te.exception_date,
  CASE 
    WHEN te.status = 'PENDING_APPROVAL' THEN 'REQUIRES_IMMEDIATE_ACTION'
    WHEN te.valid_until < CURRENT_DATE THEN 'EXPIRED'
    WHEN te.valid_until < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
    ELSE 'ACTIVE'
  END AS governance_status
FROM tolerance_exceptions te
JOIN risk_appetite_categories rac ON te.appetite_category_id = rac.id
ORDER BY 
  CASE te.status WHEN 'PENDING_APPROVAL' THEN 1 ELSE 2 END,
  te.exception_date DESC;

COMMENT ON VIEW tolerance_exception_report IS 
  'Board and regulator reporting view for tolerance exceptions - governance-level breaches';

-- =====================================================
-- PART 5: RLS POLICIES
-- =====================================================

ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolerance_exceptions ENABLE ROW LEVEL SECURITY;

-- KRI Alerts RLS
CREATE POLICY "Users can view kri_alerts in their org"
ON kri_alerts FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can manage kri_alerts in their org"
ON kri_alerts FOR ALL
USING (organization_id IN (
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
));

-- Tolerance Exceptions RLS
CREATE POLICY "Users can view tolerance_exceptions in their org"
ON tolerance_exceptions FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can manage tolerance_exceptions in their org"
ON tolerance_exceptions FOR ALL
USING (organization_id IN (
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
));

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary:
-- 1. Added tolerance_limit columns to risk_appetite_categories (hard boundary)
-- 2. Renamed tolerance_metrics to appetite_kri_thresholds (early warning)
-- 3. Created kri_alerts table (expected, frequent, management)
-- 4. Created tolerance_exceptions table (rare, governance, Board)
-- 5. Created semantic views with proper terminology
-- =====================================================
