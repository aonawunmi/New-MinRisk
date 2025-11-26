-- ============================================================================
-- Add Missing Columns to Existing Tables (Step 1)
-- Run this FIRST to add all missing columns
-- ============================================================================

BEGIN;

-- Add missing columns to risks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_priority') THEN
        ALTER TABLE risks ADD COLUMN is_priority BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_priority to risks';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'relevant_period') THEN
        ALTER TABLE risks ADD COLUMN relevant_period TEXT;
        RAISE NOTICE 'Added relevant_period to risks';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'linked_incident_count') THEN
        ALTER TABLE risks ADD COLUMN linked_incident_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added linked_incident_count to risks';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'last_incident_date') THEN
        ALTER TABLE risks ADD COLUMN last_incident_date TIMESTAMPTZ;
        RAISE NOTICE 'Added last_incident_date to risks';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'last_intelligence_check') THEN
        ALTER TABLE risks ADD COLUMN last_intelligence_check TIMESTAMPTZ;
        RAISE NOTICE 'Added last_intelligence_check to risks';
    END IF;
END $$;

-- Add missing columns to incidents table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidents') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'ai_suggested_risks') THEN
            ALTER TABLE incidents ADD COLUMN ai_suggested_risks JSONB DEFAULT '[]';
            RAISE NOTICE 'Added ai_suggested_risks to incidents';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'ai_control_recommendations') THEN
            ALTER TABLE incidents ADD COLUMN ai_control_recommendations JSONB DEFAULT '[]';
            RAISE NOTICE 'Added ai_control_recommendations to incidents';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'linked_risk_codes') THEN
            ALTER TABLE incidents ADD COLUMN linked_risk_codes TEXT[] DEFAULT '{}';
            RAISE NOTICE 'Added linked_risk_codes to incidents';
        END IF;
    END IF;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Missing columns added successfully!';
  RAISE NOTICE '📋 Next: Run the full schema migration (complete-schema-v4-SAFE.sql)';
END $$;
