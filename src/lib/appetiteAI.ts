/**
 * AI Assistant for Risk Appetite & Tolerance Configuration
 *
 * SECURE IMPLEMENTATION
 * Uses Supabase Edge Function 'generate-appetite' to proxy AI calls.
 * This prevents exposure of API keys in the client-side browser.
 */

import { supabase } from '@/lib/supabase';
import { APPETITE_LEVEL_DEFINITIONS, type AppetiteLevel } from './appetiteDefinitions';

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
 * Helper to call the secure Edge Function
 */
async function callAppetiteEdgeFunction(mode: string, params: any, context?: any) {
  // Get user session for authorization
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required to generate AI content');
  }

  const { data, error } = await supabase.functions.invoke('generate-appetite', {
    body: {
      mode,
      context,
      ...params
    }
  });

  if (error) {
    console.error(`Edge Function error (${mode}):`, error);
    throw new Error(error.message || 'AI service unavailable');
  }

  return data;
}

/**
 * Generate a category-specific appetite statement using FIXED global definitions
 */
export async function generateCategoryAppetiteStatement(
  riskCategory: string,
  appetiteLevel: AppetiteLevel,
  organizationName?: string
): Promise<string> {
  const levelDef = APPETITE_LEVEL_DEFINITIONS[appetiteLevel];

  const result = await callAppetiteEdgeFunction(
    'generate_category_statement',
    {
      riskCategory,
      appetiteLevel,
      organizationName,
      enterpriseMeaning: levelDef.enterpriseMeaning
    }
  );

  return result.text || 'Error generating statement';
}

/**
 * Generate a comprehensive Risk Appetite Summary Report
 */
export async function generateAppetiteSummaryReport(
  organizationName: string,
  categoryStatements: Array<{
    category: string;
    level: AppetiteLevel;
    statement: string;
  }>
): Promise<string> {
  const result = await callAppetiteEdgeFunction(
    'generate_summary_report',
    {
      organizationName,
      categoryStatements
    }
  );

  return result.text || 'Error generating report';
}

/**
 * Generate Risk Appetite Statement using AI (legacy - for overall statement)
 */
export async function generateAppetiteStatement(
  context: RiskContext
): Promise<string> {
  const result = await callAppetiteEdgeFunction(
    'generate_statement',
    {},
    context
  );

  return result.text || 'Error generating statement';
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
  const result = await callAppetiteEdgeFunction(
    'generate_categories',
    {},
    context
  );

  return Array.isArray(result) ? result : [];
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
  const result = await callAppetiteEdgeFunction(
    'generate_metrics',
    {
      riskCategory,
      appetiteLevel
    },
    context
  );

  return Array.isArray(result) ? result : [];
}

/**
 * Get organization context for AI suggestions
 */
export async function getOrganizationContext(
  organizationId: string,
  supabaseClient: any // keeping signature compatible, but file uses imported supabase
): Promise<RiskContext> {
  // Use passed client or fall back to imported client
  const client = supabaseClient || supabase;

  // Get organization details
  const { data: org } = await client
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  // Get ALL risk categories from taxonomy (not just categories with active risks)
  const { data: categories } = await client
    .from('risk_categories')
    .select('name')
    .order('name', { ascending: true });

  const categoryNames = categories?.map(c => c.name) || [];

  // Get existing risks for context (optional)
  const { data: risks } = await client
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
