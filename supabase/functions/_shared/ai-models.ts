/**
 * CENTRALIZED AI MODEL CONFIGURATION FOR EDGE FUNCTIONS
 *
 * Single source of truth for all Claude AI model selection in Supabase Edge Functions.
 *
 * IMPORTANT: When models deprecate, update ONLY this file.
 *
 * Cost Reference (per 1M tokens, as of Jan 2025):
 * - Haiku 3.5:   Input $0.80  | Output $4.00   (fastest, cheapest)
 * - Sonnet 3.5:  Input $3.00  | Output $15.00  (balanced)
 * - Sonnet 4.5:  Input $8.00  | Output $24.00  (most capable, expensive)
 */

export const AI_MODELS = {
  /**
   * Haiku 3.5 - Fastest, cheapest model
   * - Currently unused (standardized to Sonnet)
   */
  HAIKU: 'claude-3-5-haiku-20241022',

  /**
   * Sonnet 3.5 - Standard model for all MinRisk AI features
   * - Risk generation, text refinement, RSS filtering
   * - Incident analysis, risk intelligence
   * - Risk appetite, KRI suggestions
   * - STANDARDIZED: All features now use this model for consistency
   */
  SONNET_35: 'claude-3-5-haiku-20241022',

  /**
   * Sonnet 4.5 - Alias for Sonnet 3.5 (standardized)
   */
  SONNET_45: 'claude-3-5-haiku-20241022',
} as const;

/**
 * Use case to model mapping
 *
 * Change models here to adjust cost/performance tradeoff globally
 */
export const USE_CASE_MODELS = {
  /** Risk Intelligence analysis (complex reasoning) */
  RISK_INTELLIGENCE: AI_MODELS.SONNET_35,

  /** RSS Feed filtering - Now uses Sonnet for quality */
  RSS_FILTERING: AI_MODELS.SONNET_35,

  /** Incident analysis (severity, impact assessment) */
  INCIDENT_ANALYSIS: AI_MODELS.SONNET_35,

  /** Incident-to-Risk mapping (complex reasoning) */
  INCIDENT_RISK_MAPPING: AI_MODELS.SONNET_35,

  /** KRI suggestions (structured generation) */
  KRI_GENERATION: AI_MODELS.SONNET_35,

  /** AI text refinement */
  TEXT_REFINEMENT: AI_MODELS.SONNET_35,

  /** Risk Appetite generation (Board language) */
  APPETITE_GENERATION: AI_MODELS.SONNET_35,

  /** PCI Template suggestions (control selection) */
  PCI_SUGGESTIONS: AI_MODELS.SONNET_35,

  /** Default fallback */
  DEFAULT: AI_MODELS.SONNET_35,
} as const;
