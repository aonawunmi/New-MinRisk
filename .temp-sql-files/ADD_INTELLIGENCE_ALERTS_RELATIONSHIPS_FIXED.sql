-- Add foreign key relationships for risk_intelligence_alerts table
-- This allows Supabase to automatically join related tables
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

-- STEP 1: Add unique constraint on risks.risk_code (required for foreign key)
-- First check if it already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'risks_risk_code_key'
    ) THEN
        ALTER TABLE public.risks
        ADD CONSTRAINT risks_risk_code_key UNIQUE (risk_code);
    END IF;
END $$;

-- STEP 2: Add foreign key to external_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_risk_intelligence_alerts_event'
    ) THEN
        ALTER TABLE public.risk_intelligence_alerts
        ADD CONSTRAINT fk_risk_intelligence_alerts_event
        FOREIGN KEY (event_id)
        REFERENCES public.external_events(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- STEP 3: Add foreign key to risks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_risk_intelligence_alerts_risk'
    ) THEN
        ALTER TABLE public.risk_intelligence_alerts
        ADD CONSTRAINT fk_risk_intelligence_alerts_risk
        FOREIGN KEY (risk_code)
        REFERENCES public.risks(risk_code)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Verify the relationships were created
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.risk_intelligence_alerts'::regclass
  AND contype = 'f'
ORDER BY conname;

-- Also verify the unique constraint on risks
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.risks'::regclass
  AND contype = 'u'
  AND conname = 'risks_risk_code_key';
