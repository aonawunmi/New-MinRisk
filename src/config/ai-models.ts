/**
 * CENTRALIZED AI MODEL CONFIGURATION
 *
 * Single source of truth for all Claude AI model selection across the application.
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
   * - Appetite & Tolerance generation
   * - Simple analysis tasks
   * - Cost: ~10x cheaper than Sonnet 4.5
   */
  HAIKU: 'claude-3-5-haiku-20241022',

  /**
   * Sonnet 3.5 - Use for balanced tasks
   * - General purpose analysis
   * - Moderate complexity
   */
  SONNET_35: 'claude-3-5-sonnet-20250122',

  /**
   * Sonnet 4.5 - Use ONLY for complex reasoning
   * - Risk Intelligence deep analysis
   * - Multi-step reasoning
   * - Cost: 10x more expensive than Haiku
   */
  SONNET_45: 'claude-sonnet-4-5-20250929',
} as const;

/**
 * Use case to model mapping
 *
 * Change models here to adjust cost/performance tradeoff globally
 */
export const USE_CASE_MODELS = {
  /** Appetite & Tolerance generation (structured JSON) - Use cheapest */
  APPETITE_GENERATION: AI_MODELS.HAIKU,

  /** Risk Intelligence analysis (complex reasoning) - Use most capable */
  RISK_INTELLIGENCE: AI_MODELS.SONNET_45,

  /** RSS Feed filtering - Use cheapest */
  RSS_FILTERING: AI_MODELS.HAIKU,

  /** Default fallback */
  DEFAULT: AI_MODELS.HAIKU,
} as const;
