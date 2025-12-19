-- Migration: Add Primary Risk Constraint to Incident-Risk Links
-- Date: 2025-12-15
-- Purpose: Ensure each incident has only ONE primary risk (ERM best practice)

-- Add unique constraint: one primary risk per incident
-- Using partial index to allow unlimited secondary/contributory/associated links
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_risk_per_incident
  ON incident_risk_links (incident_id)
  WHERE link_type = 'PRIMARY';

-- Add comment explaining the constraint
COMMENT ON INDEX unique_primary_risk_per_incident IS
  'Ensures each incident has exactly one PRIMARY risk. SECONDARY, CONTRIBUTORY, and ASSOCIATED risks are unlimited.';

-- Verify no existing data violates this constraint
DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT incident_id, COUNT(*) as primary_count
    FROM incident_risk_links
    WHERE link_type = 'PRIMARY'
    GROUP BY incident_id
    HAVING COUNT(*) > 1
  ) violations;

  IF violation_count > 0 THEN
    RAISE NOTICE 'WARNING: % incident(s) have multiple PRIMARY risks. Manual cleanup required before constraint can be enforced.', violation_count;
    RAISE NOTICE 'Run this query to see violations: SELECT incident_id, COUNT(*) as primary_count FROM incident_risk_links WHERE link_type = ''PRIMARY'' GROUP BY incident_id HAVING COUNT(*) > 1;';
  ELSE
    RAISE NOTICE 'SUCCESS: All incidents have 0 or 1 PRIMARY risk. Constraint is valid and will be enforced.';
  END IF;
END $$;
