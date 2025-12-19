-- Fix duplicate risk codes and add foreign key relationships (SAFE VERSION)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new

-- STEP 1: Identify and remove duplicate risk codes
-- Keep the OLDEST record for each risk_code, delete the rest
WITH duplicate_risks AS (
  SELECT
    id,
    risk_code,
    ROW_NUMBER() OVER (PARTITION BY risk_code ORDER BY created_at ASC) as rn
  FROM public.risks
)
DELETE FROM public.risks
WHERE id IN (
  SELECT id
  FROM duplicate_risks
  WHERE rn > 1
);

-- STEP 2: Clean up orphaned intelligence alerts (alerts with missing events)
DELETE FROM public.risk_intelligence_alerts
WHERE event_id NOT IN (SELECT id FROM public.external_events);

-- Show how many orphaned alerts were removed
SELECT
  'Orphaned alerts removed' as message,
  (SELECT COUNT(*) FROM public.risk_intelligence_alerts WHERE event_id NOT IN (SELECT id FROM public.external_events)) as count;

-- STEP 3: Clean up orphaned intelligence alerts (alerts with missing risks)
DELETE FROM public.risk_intelligence_alerts
WHERE risk_code NOT IN (SELECT risk_code FROM public.risks);

-- Show how many orphaned alerts were removed
SELECT
  'Alerts with missing risks removed' as message,
  (SELECT COUNT(*) FROM public.risk_intelligence_alerts WHERE risk_code NOT IN (SELECT risk_code FROM public.risks)) as count;

-- STEP 4: Add unique constraint on risks.risk_code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'risks_risk_code_key'
    ) THEN
        ALTER TABLE public.risks
        ADD CONSTRAINT risks_risk_code_key UNIQUE (risk_code);
        RAISE NOTICE 'Added unique constraint on risks.risk_code';
    ELSE
        RAISE NOTICE 'Unique constraint on risks.risk_code already exists';
    END IF;
END $$;

-- STEP 5: Add foreign key to external_events
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
        RAISE NOTICE 'Added foreign key to external_events';
    ELSE
        RAISE NOTICE 'Foreign key to external_events already exists';
    END IF;
END $$;

-- STEP 6: Add foreign key to risks
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
        RAISE NOTICE 'Added foreign key to risks';
    ELSE
        RAISE NOTICE 'Foreign key to risks already exists';
    END IF;
END $$;

-- STEP 7: Verify all constraints were created
SELECT
  'Foreign key constraints on risk_intelligence_alerts' as check_type,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.risk_intelligence_alerts'::regclass
  AND contype = 'f'
ORDER BY conname;

-- STEP 8: Verify unique constraint on risks
SELECT
  'Unique constraint on risks' as check_type,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.risks'::regclass
  AND contype = 'u'
  AND conname = 'risks_risk_code_key';

-- STEP 9: Final verification - show risk code counts
SELECT
  'Risk code uniqueness check' as check_type,
  COUNT(DISTINCT risk_code) as unique_risk_codes,
  COUNT(*) as total_risks,
  CASE
    WHEN COUNT(DISTINCT risk_code) = COUNT(*) THEN 'All risk codes are unique ✓'
    ELSE 'WARNING: Still have duplicates!'
  END as status
FROM public.risks;

-- STEP 10: Show referential integrity status
SELECT
  'Referential integrity check' as check_type,
  (SELECT COUNT(*) FROM public.risk_intelligence_alerts WHERE event_id NOT IN (SELECT id FROM public.external_events)) as orphaned_event_refs,
  (SELECT COUNT(*) FROM public.risk_intelligence_alerts WHERE risk_code NOT IN (SELECT risk_code FROM public.risks)) as orphaned_risk_refs,
  CASE
    WHEN (SELECT COUNT(*) FROM public.risk_intelligence_alerts WHERE event_id NOT IN (SELECT id FROM public.external_events)) = 0
     AND (SELECT COUNT(*) FROM public.risk_intelligence_alerts WHERE risk_code NOT IN (SELECT risk_code FROM public.risks)) = 0
    THEN 'All references are valid ✓'
    ELSE 'WARNING: Orphaned references still exist!'
  END as status;
