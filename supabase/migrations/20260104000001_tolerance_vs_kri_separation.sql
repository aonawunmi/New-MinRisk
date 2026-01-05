-- =====================================================
-- TOLERANCE VS KRI SEPARATION - MINIMAL MIGRATION
-- =====================================================
-- Run this in Supabase SQL Editor
-- This version makes MINIMAL assumptions about existing schema
-- =====================================================

-- =====================================================
-- PART 1: ADD TOLERANCE LIMIT TO APPETITE CATEGORIES
-- =====================================================
ALTER TABLE risk_appetite_categories
ADD COLUMN IF NOT EXISTS tolerance_limit_value NUMERIC,
ADD COLUMN IF NOT EXISTS tolerance_limit_unit VARCHAR(50) DEFAULT 'count',
ADD COLUMN IF NOT EXISTS tolerance_limit_description TEXT,
ADD COLUMN IF NOT EXISTS tolerance_limit_direction VARCHAR(10) DEFAULT 'max';

-- =====================================================
-- PART 2: RENAME tolerance_metrics IF IT EXISTS
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tolerance_metrics') THEN
    ALTER TABLE tolerance_metrics RENAME TO appetite_kri_thresholds;
    
    ALTER TABLE appetite_kri_thresholds
    ADD COLUMN IF NOT EXISTS is_early_warning BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS linked_to_tolerance BOOLEAN DEFAULT true;
    
    RAISE NOTICE 'Renamed tolerance_metrics to appetite_kri_thresholds';
  ELSE
    RAISE NOTICE 'tolerance_metrics does not exist - skipping rename';
  END IF;
END $$;

-- =====================================================
-- PART 3: CREATE KRI ALERTS TABLE (standalone)
-- =====================================================
CREATE TABLE IF NOT EXISTS kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_threshold_id UUID,  -- Will reference appetite_kri_thresholds if it exists
  alert_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alert_level VARCHAR(10) NOT NULL CHECK (alert_level IN ('AMBER', 'RED')),
  current_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  description TEXT,
  trend_direction VARCHAR(10) CHECK (trend_direction IN ('improving', 'stable', 'worsening')),
  velocity_score INTEGER CHECK (velocity_score BETWEEN 1 AND 5),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'monitoring', 'resolved')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 4: CREATE TOLERANCE EXCEPTIONS TABLE (standalone)
-- =====================================================
CREATE TABLE IF NOT EXISTS tolerance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appetite_category_id UUID,  -- Will reference risk_appetite_categories
  exception_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('BREACH', 'CRITICAL')),
  current_value NUMERIC NOT NULL,
  tolerance_limit NUMERIC NOT NULL,
  variance_amount NUMERIC,
  variance_percentage NUMERIC,
  exception_reason TEXT NOT NULL,
  business_justification TEXT NOT NULL,
  compensating_controls TEXT,
  risk_assessment TEXT,
  status VARCHAR(30) DEFAULT 'PENDING_APPROVAL' 
    CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'REMEDIATED')),
  requested_by UUID,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  board_notified BOOLEAN DEFAULT false,
  board_notified_at TIMESTAMP WITH TIME ZONE,
  board_minutes_reference VARCHAR(100),
  regulator_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kri_alerts_status ON kri_alerts(status);
CREATE INDEX IF NOT EXISTS idx_tolerance_exceptions_status ON tolerance_exceptions(status);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
SELECT 'Migration complete!' AS result;
