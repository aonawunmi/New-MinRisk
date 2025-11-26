/**
 * Initialize risk_configs for Existing Organizations
 *
 * Creates a default risk_configs record for any organization that doesn't have one.
 *
 * Date: 2025-11-21
 */

-- ============================================================================
-- Insert default risk_configs for existing organizations
-- ============================================================================

INSERT INTO risk_configs (organization_id, matrix_size, active_period)
SELECT
  id,
  5,  -- Default 5x5 matrix
  'Q1 2025'  -- Default active period
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM risk_configs)
ON CONFLICT (organization_id) DO NOTHING;

-- Verification query
SELECT
  o.name AS organization_name,
  rc.matrix_size,
  rc.active_period,
  rc.created_at
FROM risk_configs rc
JOIN organizations o ON o.id = rc.organization_id;
