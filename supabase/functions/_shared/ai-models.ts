/**
 * CENTRALIZED AI MODEL CONFIGURATION FOR EDGE FUNCTIONS
 *
 * ⚠️  SINGLE SOURCE OF TRUTH for all Claude AI model IDs in Edge Functions.
 *
 * IMPORTANT: When models deprecate, update ONLY this file.
 * All Edge Functions import from here — never hardcode model IDs elsewhere.
 *
 * TWIN FILE: src/config/ai-models.ts (client-side browser code)
 * Both files MUST use identical model IDs. Update both when changing models.
 *
 * Current Model IDs (verified from https://docs.anthropic.com/en/docs/about-claude/models):
 * - Haiku 4.5:   claude-haiku-4-5-20251001      | $1/MTok in, $5/MTok out  (fastest, pre-filtering)
 * - Sonnet 4.5:  claude-sonnet-4-5-20250514    | $3/MTok in, $15/MTok out (balanced, deep analysis)
 * - Sonnet 4.6:  claude-sonnet-4-6             | $3/MTok in, $15/MTok out (latest balanced)
 * - Opus 4.6:    claude-opus-4-6               | $5/MTok in, $25/MTok out (most capable)
 */

export const AI_MODELS = {
  /**
   * Haiku 4.5 - Use for high-volume, low-complexity tasks
   * - RSS pre-filtering, structured JSON generation
   * - Appetite/tolerance generation, SEC narratives
   * - Fastest, cheapest option
   */
  HAIKU: 'claude-haiku-4-5-20251001',

  /**
   * Sonnet 4.5 - Use for complex reasoning tasks
   * - Risk intelligence deep analysis
   * - Incident analysis, risk mapping
   * - Any task requiring nuanced judgment
   */
  SONNET: 'claude-sonnet-4-5-20250514',
} as const;

/**
 * Use case to model mapping
 *
 * Change models here to adjust cost/performance tradeoff globally.
 *
 * Haiku:  high-volume pre-filtering (cheap, fast)
 * Sonnet: deep analysis where quality matters (capable, more expensive)
 */
export const USE_CASE_MODELS = {
  /** Risk Intelligence deep analysis — quality matters */
  RISK_INTELLIGENCE: AI_MODELS.SONNET,

  /** RSS Feed pre-filtering — high volume, use cheap model */
  RSS_FILTERING: AI_MODELS.HAIKU,

  /** Incident analysis (severity, impact assessment) — quality matters */
  INCIDENT_ANALYSIS: AI_MODELS.SONNET,

  /** Incident-to-Risk mapping (complex reasoning) — quality matters */
  INCIDENT_RISK_MAPPING: AI_MODELS.SONNET,

  /** KRI suggestions (structured generation) — moderate complexity */
  KRI_GENERATION: AI_MODELS.HAIKU,

  /** AI text refinement — moderate complexity */
  TEXT_REFINEMENT: AI_MODELS.HAIKU,

  /** Risk Appetite generation (Board language) — moderate complexity */
  APPETITE_GENERATION: AI_MODELS.HAIKU,

  /** PCI Template suggestions (control selection) — moderate complexity */
  PCI_SUGGESTIONS: AI_MODELS.HAIKU,

  /** SEC quarterly narrative generation — moderate complexity, cost-efficient */
  SEC_NARRATIVE: AI_MODELS.HAIKU,

  /** Library generation (AI category matching) — moderate complexity */
  LIBRARY_GENERATION: AI_MODELS.HAIKU,

  /** Default fallback */
  DEFAULT: AI_MODELS.HAIKU,
} as const;
