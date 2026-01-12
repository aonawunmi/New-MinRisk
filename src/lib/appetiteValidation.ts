/**
 * Risk Appetite Chain Validation & Scoring Logic
 *
 * Critical Functions:
 * - Chain validation that BLOCKS approval (not advisory)
 * - Deterministic scoring (any RED = RED, any AMBER = AMBER, else GREEN)
 * - Category and enterprise-level status aggregation
 */

import { supabase } from './supabase';
import { evaluateMetricStatus } from './appetiteTolerance';
import type {
  AppetiteStatus,
  ChainValidationGap,
  ChainValidationResult,
  CategoryAppetiteStatus,
  EnterpriseAppetiteStatus,
  Result
} from './appetiteTolerance';

// Re-export types for convenience
export type {
  ChainValidationResult,
  EnterpriseAppetiteStatus,
  CategoryAppetiteStatus,
  AppetiteStatus,
  Result
} from './appetiteTolerance';

// ================================================================
// 3. CHAIN VALIDATION (BLOCKING)
// ================================================================

/**
 * Validate the complete appetite → tolerance → KRI chain
 *
 * CRITICAL: This validation BLOCKS approval, not just warns
 *
 * Checks:
 * 1. Every risk category has an appetite level
 * 2. Every appetite category has tolerance metrics
 * 3. Every tolerance metric has a linked KRI
 * 4. Every linked KRI has recent data (last 90 days)
 */
export async function validateAppetiteChain(
  organizationId: string
): Promise<ChainValidationResult> {

  const gaps: ChainValidationGap[] = [];

  // ----------------------------------------------------------------
  // CHECK 1: Risk categories without appetite definition
  // ----------------------------------------------------------------
  const { data: risksWithoutAppetite } = await supabase.rpc(
    'get_risk_categories_without_appetite',
    { org_id: organizationId }
  );

  // Fallback if RPC doesn't exist (will create in migration)
  if (!risksWithoutAppetite) {
    const { data: allCategories } = await supabase
      .from('risks')
      .select('category')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const { data: definedCategories } = await supabase
      .from('risk_appetite_categories')
      .select('risk_category')
      .eq('organization_id', organizationId);

    const uniqueRiskCats = [...new Set(allCategories?.map(r => r.category) || [])];
    const definedCats = new Set(definedCategories?.map(c => c.risk_category) || []);

    const missing = uniqueRiskCats.filter(cat => !definedCats.has(cat));

    if (missing.length > 0) {
      gaps.push({
        category: 'APPETITE STATEMENT',
        issue: `${missing.length} risk categories missing appetite definition`,
        severity: 'CRITICAL',
        details: `Categories: ${missing.join(', ')}`
      });
    }
  }

  // ----------------------------------------------------------------
  // CHECK 2: Appetite categories without tolerance metrics
  // ----------------------------------------------------------------
  const { data: categoriesWithoutMetrics } = await supabase
    .from('risk_appetite_categories')
    .select(`
      id,
      risk_category,
      tolerance_metrics!left(id)
    `)
    .eq('organization_id', organizationId);

  const categoriesMissingMetrics = categoriesWithoutMetrics?.filter(
    cat => !cat.tolerance_metrics || cat.tolerance_metrics.length === 0
  ) || [];

  if (categoriesMissingMetrics.length > 0) {
    gaps.push({
      category: 'TOLERANCE METRICS',
      issue: `${categoriesMissingMetrics.length} appetite categories without tolerance metrics`,
      severity: 'CRITICAL',
      details: `Categories: ${categoriesMissingMetrics.map(c => c.risk_category).join(', ')}`
    });
  }

  // ----------------------------------------------------------------
  // CHECK 3: Tolerance metrics without linked KRIs
  // ----------------------------------------------------------------
  const { data: metricsWithoutKRIs } = await supabase
    .from('tolerance_metrics')
    .select('id, metric_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('kri_id', null);

  if (metricsWithoutKRIs && metricsWithoutKRIs.length > 0) {
    gaps.push({
      category: 'KRI LINKAGE',
      issue: `${metricsWithoutKRIs.length} active tolerance metrics not linked to KRIs`,
      severity: 'CRITICAL',
      details: `Metrics: ${metricsWithoutKRIs.map(m => m.metric_name).join(', ')}`
    });
  }

  // ----------------------------------------------------------------
  // CHECK 4: Linked KRIs without recent data (WARNING, not CRITICAL)
  // ----------------------------------------------------------------
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: metricsWithKRIs } = await supabase
    .from('tolerance_metrics')
    .select('id, metric_name, kri_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .not('kri_id', 'is', null);

  if (metricsWithKRIs) {
    for (const metric of metricsWithKRIs) {
      const { data: recentData } = await supabase
        .from('kri_values')
        .select('id')
        .eq('kri_id', metric.kri_id!)
        .gte('value_date', ninetyDaysAgo.toISOString().split('T')[0])
        .limit(1)
        .single();

      if (!recentData) {
        gaps.push({
          category: 'KRI DATA',
          issue: `Metric "${metric.metric_name}" has no KRI data in last 90 days`,
          severity: 'WARNING',
          details: 'Tolerance thresholds cannot be enforced without active KRI monitoring'
        });
      }
    }
  }

  // ----------------------------------------------------------------
  // Return validation result
  // ----------------------------------------------------------------
  const criticalGaps = gaps.filter(g => g.severity === 'CRITICAL');

  return {
    isValid: criticalGaps.length === 0,
    gaps
  };
}

// ================================================================
// 4. BLOCKING APPROVAL LOGIC
// ================================================================

/**
 * Approve Risk Appetite Statement
 *
 * CRITICAL: Blocks approval if chain validation fails
 */
export async function approveRiskAppetiteStatement(
  statementId: string,
  approvedBy: string
): Promise<Result> {

  // Get organization ID
  const { data: statement } = await supabase
    .from('risk_appetite_statements')
    .select('organization_id')
    .eq('id', statementId)
    .single();

  if (!statement) {
    return { success: false, error: 'Statement not found' };
  }

  // BLOCKING VALIDATION
  const validation = await validateAppetiteChain(statement.organization_id);

  const criticalGaps = validation.gaps.filter(g => g.severity === 'CRITICAL');

  if (criticalGaps.length > 0) {
    return {
      success: false,
      error: `Cannot approve RAS: ${criticalGaps.length} critical gaps detected:\n\n` +
        criticalGaps.map(g => `• ${g.category}: ${g.issue}`).join('\n') +
        `\n\nResolve these issues before approval.`
    };
  }

  // Proceed with approval
  const { error } = await supabase
    .from('risk_appetite_statements')
    .update({
      status: 'APPROVED',
      approved_by: approvedBy,
      approved_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', statementId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Activate tolerance metric
 *
 * CRITICAL: Blocks activation if KRI not linked or has no data
 */
export async function activateToleranceMetric(
  metricId: string,
  activatedBy: string
): Promise<Result> {

  const { data: metric } = await supabase
    .from('tolerance_metrics')
    .select('kri_id, metric_name, organization_id')
    .eq('id', metricId)
    .single();

  if (!metric) {
    return { success: false, error: 'Metric not found' };
  }

  // BLOCK if no KRI linked
  if (!metric.kri_id) {
    return {
      success: false,
      error: 'Cannot activate tolerance metric: No KRI linked.\n\nPlease link a KRI before activation.'
    };
  }

  // BLOCK if KRI has no recent data
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: recentData } = await supabase
    .from('kri_values')
    .select('id')
    .eq('kri_id', metric.kri_id)
    .gte('value_date', ninetyDaysAgo.toISOString().split('T')[0])
    .limit(1)
    .single();

  if (!recentData) {
    return {
      success: false,
      error: 'Cannot activate tolerance metric: Linked KRI has no data in last 90 days.\n\nPlease ensure KRI is actively monitored before activation.'
    };
  }

  // Activate
  const { error } = await supabase
    .from('tolerance_metrics')
    .update({
      is_active: true,
      activated_by: activatedBy,
      activated_at: new Date().toISOString()
    })
    .eq('id', metricId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ================================================================
// 5. DETERMINISTIC SCORING LOGIC
// ================================================================

/**
 * Calculate appetite status for a single category
 *
 * Deterministic Rule:
 * - If ANY metric == RED → Category = RED
 * - Else if ANY metric == AMBER → Category = AMBER
 * - Else if ALL metrics == GREEN → Category = GREEN
 * - Else → Category = UNKNOWN (no data)
 */
export async function calculateCategoryStatus(
  organizationId: string,
  categoryId: string
): Promise<CategoryAppetiteStatus> {

  // Get category details
  const { data: category } = await supabase
    .from('risk_appetite_categories')
    .select('risk_category, appetite_level')
    .eq('id', categoryId)
    .single();

  if (!category) {
    throw new Error('Category not found');
  }

  // Get all active tolerance metrics for this category
  const { data: metrics } = await supabase
    .from('tolerance_metrics')
    .select('id, metric_name, kri_id, metric_type, green_min, green_max, amber_min, amber_max, red_min, red_max, directional_config')
    .eq('appetite_category_id', categoryId)
    .eq('is_active', true);

  if (!metrics || metrics.length === 0) {
    return {
      category_id: categoryId,
      category_name: category.risk_category,
      appetite_level: category.appetite_level,
      status: 'UNKNOWN',
      metrics: []
    };
  }

  // Evaluate each metric
  const metricStatuses = await Promise.all(
    metrics.map(async (metric) => {
      // Get latest KRI value
      const { data: latestValue } = await supabase
        .from('kri_values')
        .select('value, value_date')
        .eq('kri_id', metric.kri_id)
        .order('value_date', { ascending: false })
        .limit(1)
        .single();

      if (!latestValue) {
        return {
          id: metric.id,
          name: metric.metric_name,
          status: 'UNKNOWN' as AppetiteStatus,
          value: null,
          threshold: 'No data',
          last_updated: null
        };
      }

      // Evaluate status
      const evaluation = await evaluateMetricStatus(metric as any, latestValue.value);

      return {
        id: metric.id,
        name: metric.metric_name,
        status: evaluation.status,
        value: latestValue.value,
        threshold: evaluation.threshold,
        last_updated: latestValue.value_date
      };
    })
  );

  // DETERMINISTIC AGGREGATION
  let categoryStatus: AppetiteStatus = 'GREEN';

  if (metricStatuses.some(m => m.status === 'RED')) {
    categoryStatus = 'RED';
  } else if (metricStatuses.some(m => m.status === 'AMBER')) {
    categoryStatus = 'AMBER';
  } else if (metricStatuses.some(m => m.status === 'UNKNOWN')) {
    categoryStatus = 'UNKNOWN';
  } else if (metricStatuses.every(m => m.status === 'GREEN')) {
    categoryStatus = 'GREEN';
  }

  return {
    category_id: categoryId,
    category_name: category.risk_category,
    appetite_level: category.appetite_level,
    status: categoryStatus,
    metrics: metricStatuses
  };
}

/**
 * Calculate enterprise-wide appetite status
 *
 * Deterministic Rule (same as category):
 * - If ANY category == RED → Enterprise = RED
 * - Else if ANY category == AMBER → Enterprise = AMBER
 * - Else → Enterprise = GREEN
 */
export async function calculateEnterpriseAppetiteStatus(
  organizationId: string
): Promise<EnterpriseAppetiteStatus> {

  // Get all appetite categories
  const { data: categories } = await supabase
    .from('risk_appetite_categories')
    .select('id')
    .eq('organization_id', organizationId);

  if (!categories || categories.length === 0) {
    return {
      overall_status: 'UNKNOWN',
      categories: [],
      summary: {
        total_categories: 0,
        red_count: 0,
        amber_count: 0,
        green_count: 0,
        unknown_count: 0
      }
    };
  }

  // Calculate status for each category
  const categoryStatuses = await Promise.all(
    categories.map(cat => calculateCategoryStatus(organizationId, cat.id))
  );

  // DETERMINISTIC ENTERPRISE AGGREGATION
  let overallStatus: AppetiteStatus = 'GREEN';

  if (categoryStatuses.some(c => c.status === 'RED')) {
    overallStatus = 'RED';
  } else if (categoryStatuses.some(c => c.status === 'AMBER')) {
    overallStatus = 'AMBER';
  } else if (categoryStatuses.some(c => c.status === 'UNKNOWN')) {
    overallStatus = 'UNKNOWN';
  }

  // Summary counts
  const summary = {
    total_categories: categoryStatuses.length,
    red_count: categoryStatuses.filter(c => c.status === 'RED').length,
    amber_count: categoryStatuses.filter(c => c.status === 'AMBER').length,
    green_count: categoryStatuses.filter(c => c.status === 'GREEN').length,
    unknown_count: categoryStatuses.filter(c => c.status === 'UNKNOWN').length
  };

  return {
    overall_status: overallStatus,
    categories: categoryStatuses,
    summary
  };
}
