/**
 * AI Assistant for Risk Appetite & Tolerance Configuration
 *
 * Uses Claude AI to generate intelligent suggestions for:
 * 1. Risk Appetite Statements (Board-approved language)
 * 2. Appetite Categories (risk category → appetite level mapping)
 * 3. Tolerance Metrics (quantitative thresholds)
 */

import Anthropic from '@anthropic-ai/sdk';
import { USE_CASE_MODELS } from '@/config/ai-models';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

interface RiskContext {
  organizationName?: string;
  industry?: string;
  riskCategories: string[];
  currentPeriodYear?: number;
  currentPeriodQuarter?: number;
  existingRisks?: Array<{
    category: string;
    count: number;
    avgInherentScore: number;
  }>;
}

/**
 * Generate Risk Appetite Statement using AI
 */
export async function generateAppetiteStatement(
  context: RiskContext
): Promise<string> {
  const periodText = context.currentPeriodYear && context.currentPeriodQuarter
    ? `Q${context.currentPeriodQuarter} ${context.currentPeriodYear}`
    : `Fiscal Year ${new Date().getFullYear()}`;

  const prompt = `You are a world-class Chief Risk Officer helping to draft a Risk Appetite Statement.

CONTEXT:
- Organization: ${context.organizationName || 'Financial Institution'}
- Industry: ${context.industry || 'Financial Services'}
- Current Period: ${periodText}
- Key Risk Categories: ${context.riskCategories.join(', ')}

TASK:
Write a concise, Board-approved Risk Appetite Statement (2-3 paragraphs).

REQUIREMENTS:
1. Use professional, Board-level language
2. Reference specific risk categories
3. Be clear about appetite levels (ZERO, LOW, MODERATE, HIGH)
4. Align with regulatory expectations (CBN, SEC, PENCOM)
5. Include time horizon referencing the Current Period above (${periodText})

EXAMPLE STRUCTURE:
"[Organization Name] maintains a [LEVEL] appetite for [category], recognizing [rationale].
We accept [LEVEL] appetite for [category] to [business objective], while ensuring [control statement].
We maintain ZERO tolerance for [category], as [compliance requirement]."

Generate the Risk Appetite Statement now:`;

  const message = await anthropic.messages.create({
    model: USE_CASE_MODELS.APPETITE_GENERATION,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const textContent = message.content.find(c => c.type === 'text');
  return textContent ? (textContent as any).text : 'Error generating statement';
}

interface AppetiteCategory {
  risk_category: string;
  appetite_level: 'ZERO' | 'LOW' | 'MODERATE' | 'HIGH';
  rationale: string;
}

/**
 * Generate Appetite Categories using AI
 */
export async function generateAppetiteCategories(
  context: RiskContext
): Promise<AppetiteCategory[]> {
  const riskContext = context.existingRisks
    ? context.existingRisks.map(r =>
        `${r.category}: ${r.count} risks, avg inherent score ${r.avgInherentScore}`
      ).join('\n')
    : context.riskCategories.join('\n');

  const prompt = `You are a world-class Chief Risk Officer mapping risk appetite levels.

CONTEXT:
Risk Categories in the Organization:
${riskContext}

TASK:
For each risk category, recommend an appetite level (ZERO, LOW, MODERATE, HIGH) with rationale.

DEFINITIONS:
- ZERO: No tolerance for this risk (e.g., compliance violations, fraud)
- LOW: Minimal acceptable exposure (tight controls required)
- MODERATE: Balanced approach (standard controls)
- HIGH: Willing to accept significant exposure (for strategic objectives)

REGULATORY CONTEXT:
- Financial institutions typically have ZERO appetite for: Regulatory non-compliance, fraud, money laundering
- Typically LOW appetite for: Operational failures, reputational damage
- Typically MODERATE appetite for: Credit risk (within limits), market risk
- Typically HIGH appetite for: Strategic investments, innovation risk (with controls)

OUTPUT FORMAT (JSON array):
[
  {
    "risk_category": "Credit Risk",
    "appetite_level": "MODERATE",
    "rationale": "Accept moderate credit exposure to support lending business, with robust underwriting and monitoring controls"
  },
  ...
]

Generate appetite categories now (JSON only, no explanation):`;

  const message = await anthropic.messages.create({
    model: USE_CASE_MODELS.APPETITE_GENERATION,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const textContent = message.content.find(c => c.type === 'text');
  const text = textContent ? (textContent as any).text : '[]';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

interface ToleranceMetric {
  metric_name: string;
  metric_description: string;
  metric_type: 'RANGE' | 'MAXIMUM' | 'MINIMUM' | 'DIRECTIONAL';
  unit: string;
  materiality_type: 'INTERNAL' | 'EXTERNAL' | 'DUAL';
  green_max: number | null;
  amber_max: number | null;
  red_min: number | null;
  green_min: number | null;
  amber_min: number | null;
  red_max: number | null;
}

/**
 * Generate Tolerance Metrics using AI
 */
export async function generateToleranceMetrics(
  riskCategory: string,
  appetiteLevel: 'ZERO' | 'LOW' | 'MODERATE' | 'HIGH',
  context: RiskContext
): Promise<ToleranceMetric[]> {
  const prompt = `You are a world-class Chief Risk Officer designing tolerance metrics.

CONTEXT:
- Risk Category: ${riskCategory}
- Appetite Level: ${appetiteLevel}
- Industry: ${context.industry || 'Financial Services'}

TASK:
Design 2-3 quantitative tolerance metrics for this category with Green/Amber/Red thresholds.

METRIC TYPES (use MAXIMUM, MINIMUM, or RANGE only):
- MAXIMUM: Upper limit (e.g., "VaR must not exceed X")
- MINIMUM: Lower limit (e.g., "Liquidity ratio must stay above X")
- RANGE: Between two values (e.g., "NPL ratio between X and Y")

IMPORTANT: Do NOT use DIRECTIONAL type - only MAXIMUM, MINIMUM, or RANGE.

THRESHOLD LOGIC:
- GREEN zone: Safe, within appetite
- AMBER zone: Warning, requires attention (30-day SLA for remediation)
- RED zone: Breach, urgent action required (7-day SLA, Board notification)

MATERIALITY TYPES:
- INTERNAL: Impact on the organization (traditional)
- EXTERNAL: Impact on customers/market (conduct lens)
- DUAL: Both internal and external impact

EXAMPLE FOR CREDIT RISK (MODERATE appetite):
{
  "metric_name": "Non-Performing Loan Ratio",
  "metric_description": "Percentage of loans in default or near-default",
  "metric_type": "MAXIMUM",
  "unit": "%",
  "materiality_type": "INTERNAL",
  "green_max": 3.0,
  "amber_max": 5.0,
  "red_min": 5.0,
  "green_min": null,
  "amber_min": null,
  "red_max": null
}

OUTPUT FORMAT (JSON array, 2-3 metrics):
[...]

Generate tolerance metrics now (JSON only, no explanation):`;

  const message = await anthropic.messages.create({
    model: USE_CASE_MODELS.APPETITE_GENERATION,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const textContent = message.content.find(c => c.type === 'text');
  const text = textContent ? (textContent as any).text : '[]';

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Get organization context for AI suggestions
 */
export async function getOrganizationContext(
  organizationId: string,
  supabase: any
): Promise<RiskContext> {
  // Get organization details
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  // Get ALL risk categories from taxonomy (not just categories with active risks)
  const { data: categories } = await supabase
    .from('risk_categories')
    .select('name')
    .order('name', { ascending: true });

  const categoryNames = categories?.map(c => c.name) || [];

  // Get existing risks for context (optional)
  const { data: risks } = await supabase
    .from('risks')
    .select('category, score_inherent')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  // Calculate risk stats per category (only for categories with risks)
  const riskStats = categoryNames.map(category => {
    const categoryRisks = risks?.filter(r => r.category === category) || [];
    const avgScore = categoryRisks.length > 0
      ? categoryRisks.reduce((sum, r) => sum + (r.score_inherent || 0), 0) / categoryRisks.length
      : 0;

    return {
      category: category,
      count: categoryRisks.length,
      avgInherentScore: Math.round(avgScore * 10) / 10
    };
  });

  // Get current period from current date
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  return {
    organizationName: org?.name || 'Organization',
    industry: 'Financial Services', // Could be from org settings
    currentPeriodYear: currentYear,
    currentPeriodQuarter: currentQuarter,
    riskCategories: categoryNames,
    existingRisks: riskStats
  };
}
