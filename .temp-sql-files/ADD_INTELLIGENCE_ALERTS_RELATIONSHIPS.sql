-- Add foreign key relationships for risk_intelligence_alerts table
-- This allows Supabase to automatically join related tables
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

-- 1. Add foreign key to external_events
ALTER TABLE public.risk_intelligence_alerts
ADD CONSTRAINT fk_risk_intelligence_alerts_event
FOREIGN KEY (event_id)
REFERENCES public.external_events(id)
ON DELETE CASCADE;

-- 2. Add foreign key to risks
ALTER TABLE public.risk_intelligence_alerts
ADD CONSTRAINT fk_risk_intelligence_alerts_risk
FOREIGN KEY (risk_code)
REFERENCES public.risks(risk_code)
ON DELETE CASCADE;

-- Verify the relationships were created
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.risk_intelligence_alerts'::regclass
  AND contype = 'f';
