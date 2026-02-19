/**
 * CENTRALIZED AI MODEL CONFIGURATION FOR EDGE FUNCTIONS
 *
 * Single source of truth for all Claude AI model selection in Supabase Edge Functions.
 *
 * IMPORTANT: When models deprecate, update ONLY this file.
 *
 * Cost Reference (per 1M tokens):
 * - Haiku 3.5:   Input $0.80  | Output $4.00   (fastest, cheapest — use for pre-filtering)
 * - Sonnet 4.5:  Input $8.00  | Output $24.00  (most capable — use for deep analysis)
 */

export const AI_MODELS = {
  /**
   * Haiku 3.5 - Use for high-volume, low-complexity tasks
   * - RSS pre-filtering, structured JSON generation
   * - Appetite/tolerance generation
   */
  HAIKU: 'claude-3-5-haiku-20241022',

  /**
   * Sonnet 4.5 - Use for complex reasoning tasks
   * - Risk intelligence deep analysis
   * - Incident analysis, risk mapping
   * - Any task requiring nuanced judgment
   */
  SONNET_45: 'claude-sonnet-4-5-20250514',
} as const;

/**
 * Use case to model mapping
 *
 * Haiku: high-volume pre-filtering (cheap, fast)
 * Sonnet: deep analysis where quality matters (capable, more expensive)
 */
export const USE_CASE_MODELS = {
  /** Risk Intelligence deep analysis — quality matters */
  RISK_INTELLIGENCE: AI_MODELS.SONNET_45,

  /** RSS Feed pre-filtering — high volume, use cheap model */
  RSS_FILTERING: AI_MODELS.HAIKU,

  /** Incident analysis (severity, impact assessment) — quality matters */
  INCIDENT_ANALYSIS: AI_MODELS.SONNET_45,

  /** Incident-to-Risk mapping (complex reasoning) — quality matters */
  INCIDENT_RISK_MAPPING: AI_MODELS.SONNET_45,

  /** KRI suggestions (structured generation) — moderate complexity */
  KRI_GENERATION: AI_MODELS.HAIKU,

  /** AI text refinement — moderate complexity */
  TEXT_REFINEMENT: AI_MODELS.HAIKU,

  /** Risk Appetite generation (Board language) — moderate complexity */
  APPETITE_GENERATION: AI_MODELS.HAIKU,

  /** PCI Template suggestions (control selection) — moderate complexity */
  PCI_SUGGESTIONS: AI_MODELS.HAIKU,

  /** Default fallback */
  DEFAULT: AI_MODELS.HAIKU,
} as const;
