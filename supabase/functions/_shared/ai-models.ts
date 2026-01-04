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
   * Haiku 3.5 - Use for structured JSON generation
   * - RSS feed filtering
   * - Simple analysis tasks
   * - Cost: ~10x cheaper than Sonnet 3.5
   */
  HAIKU: 'claude-3-5-haiku-20241022',

  /**
   * Sonnet 3.5 - Use for balanced tasks
   * - General purpose analysis
   * - Moderate complexity
   */
  SONNET_35: 'claude-3-5-sonnet-latest',

  /**
   * Sonnet 3.5 (High capability fallback) - Use for complex reasoning
   * - Risk Intelligence deep analysis
   * - Multi-step reasoning
   * - Note: Temporarily aliased to Sonnet 3.5 until 4.5 is released/verified
   */
  SONNET_45: 'claude-3-5-sonnet-latest',
} as const;

/**
 * Use case to model mapping
 *
 * Change models here to adjust cost/performance tradeoff globally
 */
export const USE_CASE_MODELS = {
  /** Risk Intelligence analysis (complex reasoning) - Use most capable */
  RISK_INTELLIGENCE: AI_MODELS.SONNET_45,

  /** RSS Feed filtering - Use cheapest */
  RSS_FILTERING: AI_MODELS.HAIKU,

  /** Incident analysis (severity, impact assessment) - Use most capable */
  INCIDENT_ANALYSIS: AI_MODELS.SONNET_45,

  /** Incident-to-Risk mapping (complex reasoning) - Use most capable */
  INCIDENT_RISK_MAPPING: AI_MODELS.SONNET_45,

  /** KRI suggestions (structured generation) - Use balanced */
  KRI_GENERATION: AI_MODELS.SONNET_35,

  /** AI text refinement - Use cheapest */
  TEXT_REFINEMENT: AI_MODELS.HAIKU,

  /** Risk Appetite generation (Board language) - Use balanced */
  APPETITE_GENERATION: AI_MODELS.SONNET_35,

  /** Default fallback */
  DEFAULT: AI_MODELS.HAIKU,
} as const;
