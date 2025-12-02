-- =====================================================================
-- Migration: Drop risk_snapshots table
-- Date: 2025-01-02
-- Description: Remove legacy risk_snapshots table as it has been replaced
--              by the risk_history table in the continuous risk architecture
-- =====================================================================

-- Drop the risk_snapshots table
-- This table stored snapshots as JSONB blobs with text-based periods
-- Replaced by risk_history table which uses structured periods and flattened columns
DROP TABLE IF EXISTS risk_snapshots CASCADE;

-- Note: The risk_history table provides the same functionality with:
--   - Structured periods (period_year INT, period_quarter INT)
--   - Flattened columns for faster queries
--   - Better indexing and query performance
--   - Full audit trail via period_commits table
