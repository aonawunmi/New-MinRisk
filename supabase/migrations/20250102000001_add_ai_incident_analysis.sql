-- =====================================================
-- Migration: Add AI Analysis Fields to Incidents
-- Feature: AI-Powered Incident Analysis
-- Branch: feature/ai-incident-analysis
-- Date: 2025-01-02
-- =====================================================
-- This migration adds fields to support AI-powered:
-- 1. Incident-to-risk linking with confidence scores
-- 2. Control adequacy assessment
-- =====================================================

-- Add AI analysis fields to incidents table
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS ai_suggested_risks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_control_recommendations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_analysis_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ai_analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (ai_analysis_status IN ('pending', 'analyzing', 'completed', 'failed'));

-- Create index for querying incidents with AI suggestions
CREATE INDEX IF NOT EXISTS idx_incidents_ai_status ON incidents(ai_analysis_status);
CREATE INDEX IF NOT EXISTS idx_incidents_ai_date ON incidents(ai_analysis_date DESC);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON COLUMN incidents.ai_suggested_risks IS 'JSONB array of AI-suggested risk links with confidence scores';
COMMENT ON COLUMN incidents.ai_control_recommendations IS 'JSONB object with AI-generated control adequacy assessment';
COMMENT ON COLUMN incidents.ai_analysis_date IS 'Timestamp when AI analysis was last performed';
COMMENT ON COLUMN incidents.ai_analysis_status IS 'Status of AI analysis: pending, analyzing, completed, failed';

-- =====================================================
-- STRUCTURE DOCUMENTATION
-- =====================================================
--
-- ai_suggested_risks format:
-- [
--   {
--     "risk_id": "uuid",
--     "risk_code": "FIN-OPS-001",
--     "risk_title": "Transaction Processing Errors",
--     "confidence": 0.92,
--     "reasoning": "This incident directly demonstrates...",
--     "status": "pending" | "accepted" | "rejected",
--     "suggested_at": "2025-01-02T10:00:00Z"
--   }
-- ]
--
-- ai_control_recommendations format:
-- {
--   "assessment": "Adequate" | "Partially Adequate" | "Inadequate",
--   "reasoning": "Analysis of why controls failed...",
--   "dime_adjustments": [
--     {
--       "control_id": "uuid",
--       "control_name": "Transaction Validation",
--       "dimension": "implementation",
--       "current_score": 3,
--       "suggested_score": 1,
--       "reason": "Control not implemented correctly..."
--     }
--   ],
--   "suggested_controls": [
--     {
--       "name": "Automated Transaction Validation",
--       "description": "Implement real-time validation...",
--       "control_type": "preventive",
--       "target": "likelihood",
--       "expected_dime": { "D": 4, "I": 3, "M": 3, "E": 2 }
--     }
--   ],
--   "priority": "High" | "Medium" | "Low",
--   "analyzed_at": "2025-01-02T10:00:00Z"
-- }
