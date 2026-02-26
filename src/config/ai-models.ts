/**
 * CENTRALIZED AI MODEL CONFIGURATION (CLIENT-SIDE)
 *
 * ⚠️  SINGLE SOURCE OF TRUTH for all Claude AI model IDs in browser/client code.
 *
 * IMPORTANT: When models deprecate, update ONLY this file (for client-side).
 *
 * TWIN FILE: supabase/functions/_shared/ai-models.ts (Edge Functions / Deno server)
 * Both files MUST use identical model IDs. Update both when changing models.
 *
 * Current Model IDs (verified from https://docs.anthropic.com/en/docs/about-claude/models):
 * - Haiku 4.5:   claude-haiku-4-5-20251001      | $1/MTok in, $5/MTok out  (fastest, pre-filtering)
 * - Sonnet 4:    claude-sonnet-4-20250514       | $3/MTok in, $15/MTok out (balanced, deep analysis)
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
  SONNET: 'claude-sonnet-4-20250514',
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

  /** Appetite & Tolerance generation (structured JSON) - Use cheapest */
  APPETITE_GENERATION: AI_MODELS.HAIKU,

  /** Default fallback */
  DEFAULT: AI_MODELS.HAIKU,
} as const;
