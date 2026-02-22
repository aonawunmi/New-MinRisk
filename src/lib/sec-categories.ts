/**
 * SEC Category Mapping Library
 *
 * Manages the mapping between an organization's internal risk categories
 * and the SEC Nigeria's 5 standardized risk categories for quarterly reporting.
 *
 * SEC Standard Categories:
 * 1. Strategic Risk
 * 2. Market Risk
 * 3. Regulatory Risk
 * 4. Operational Risk
 * 5. IT/Cyber Risk
 */

import { supabase } from './supabase';

// ============================================
// Types
// ============================================

export interface SecStandardCategory {
  id: string;
  code: string;           // 'STRATEGIC', 'MARKET', 'REGULATORY', 'OPERATIONAL', 'IT_CYBER'
  name: string;           // 'Strategic Risk', etc.
  description: string | null;
  display_order: number;
}

export interface SecCategoryMapping {
  id: string;
  organization_id: string;
  internal_category_name: string;
  sec_category_id: string;
  sec_category?: SecStandardCategory;
  created_at: string;
  updated_at: string;
}

export interface SecDefaultMapping {
  id: string;
  keyword_pattern: string;
  sec_category_id: string;
  priority: number;
}

export interface MappingSaveItem {
  internal_category_name: string;
  sec_category_id: string;
}

// ============================================
// SEC Standard Categories (Reference Data)
// ============================================

/**
 * Fetch all 5 SEC standard categories, ordered by display_order
 */
export async function getSecStandardCategories(): Promise<{
  data: SecStandardCategory[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_standard_categories')
      .select('*')
      .order('display_order');

    if (error) return { data: null, error };
    return { data: data as SecStandardCategory[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a single SEC standard category by code
 */
export async function getSecCategoryByCode(code: string): Promise<{
  data: SecStandardCategory | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_standard_categories')
      .select('*')
      .eq('code', code)
      .single();

    if (error) return { data: null, error };
    return { data: data as SecStandardCategory, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// ============================================
// Organization Category Mappings
// ============================================

/**
 * Get all SEC category mappings for an organization
 * Returns internal category names with their mapped SEC categories
 */
export async function getOrgSecMappings(organizationId: string): Promise<{
  data: SecCategoryMapping[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_category_mappings')
      .select(`
        *,
        sec_category:sec_standard_categories(*)
      `)
      .eq('organization_id', organizationId)
      .order('internal_category_name');

    if (error) return { data: null, error };
    return { data: data as SecCategoryMapping[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get default keyword-based mappings (used for auto-suggesting SEC categories)
 */
export async function getDefaultSecMappings(): Promise<{
  data: SecDefaultMapping[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sec_default_category_mappings')
      .select('*')
      .order('priority');

    if (error) return { data: null, error };
    return { data: data as SecDefaultMapping[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Suggest a SEC category for a given internal category name
 * Uses keyword matching against the defaults table
 */
export function suggestSecCategory(
  categoryName: string,
  defaults: SecDefaultMapping[]
): string | null {
  const lowerName = categoryName.toLowerCase();

  // Find the best matching keyword (by priority)
  const match = defaults
    .filter(d => lowerName.includes(d.keyword_pattern))
    .sort((a, b) => a.priority - b.priority)[0];

  return match ? match.sec_category_id : null;
}

/**
 * Save SEC category mappings for an organization
 * Uses upsert to handle both new mappings and updates
 */
export async function saveSecMappings(
  organizationId: string,
  mappings: MappingSaveItem[]
): Promise<{ error: Error | null }> {
  try {
    // Delete existing mappings for this org and re-insert
    // This is simpler than tracking individual changes
    const { error: deleteError } = await supabase
      .from('sec_category_mappings')
      .delete()
      .eq('organization_id', organizationId);

    if (deleteError) return { error: deleteError };

    // Insert new mappings
    if (mappings.length > 0) {
      const rows = mappings.map(m => ({
        organization_id: organizationId,
        internal_category_name: m.internal_category_name,
        sec_category_id: m.sec_category_id,
      }));

      const { error: insertError } = await supabase
        .from('sec_category_mappings')
        .insert(rows);

      if (insertError) return { error: insertError };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get the unique risk category names used by an organization
 * Queries the risks table to find all distinct category values
 */
export async function getOrgRiskCategoryNames(organizationId: string): Promise<{
  data: string[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('risks')
      .select('category')
      .eq('organization_id', organizationId)
      .eq('status', 'Open');

    if (error) return { data: null, error };

    // Extract unique category names
    const categories = [...new Set(
      (data || [])
        .map(r => r.category)
        .filter((c): c is string => c != null && c.trim() !== '')
    )].sort();

    return { data: categories, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Check if an organization has complete SEC category mappings
 * Returns unmapped categories (if any)
 */
export async function checkMappingCompleteness(organizationId: string): Promise<{
  data: {
    isComplete: boolean;
    totalCategories: number;
    mappedCategories: number;
    unmappedCategories: string[];
  } | null;
  error: Error | null;
}> {
  try {
    // Get all category names used in risks
    const { data: categories, error: catError } = await getOrgRiskCategoryNames(organizationId);
    if (catError) return { data: null, error: catError };

    // Get existing mappings
    const { data: mappings, error: mapError } = await getOrgSecMappings(organizationId);
    if (mapError) return { data: null, error: mapError };

    const mappedNames = new Set((mappings || []).map(m => m.internal_category_name));
    const allCategories = categories || [];
    const unmapped = allCategories.filter(c => !mappedNames.has(c));

    return {
      data: {
        isComplete: unmapped.length === 0,
        totalCategories: allCategories.length,
        mappedCategories: allCategories.length - unmapped.length,
        unmappedCategories: unmapped,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Automatically map any unmapped internal risk categories to SEC categories
 * using keyword-based matching. Does NOT overwrite existing user-configured mappings.
 * Categories that don't match any keyword default to OPERATIONAL.
 */
export async function autoMapUnmappedCategories(organizationId: string): Promise<{
  data: { autoMappedCount: number } | null;
  error: Error | null;
}> {
  try {
    // 1. Check what's unmapped
    const { data: mappingStatus, error: statusError } = await checkMappingCompleteness(organizationId);
    if (statusError || !mappingStatus) {
      return { data: null, error: statusError || new Error('Failed to check mapping status') };
    }

    if (mappingStatus.isComplete) {
      return { data: { autoMappedCount: 0 }, error: null };
    }

    const unmapped = mappingStatus.unmappedCategories;

    // 2. Load default keyword patterns
    const { data: defaults, error: defaultsError } = await getDefaultSecMappings();
    if (defaultsError || !defaults) {
      return { data: null, error: defaultsError || new Error('Failed to load default mappings') };
    }

    // 3. Get the OPERATIONAL category ID as fallback
    const { data: secCategories, error: secError } = await getSecStandardCategories();
    if (secError || !secCategories) {
      return { data: null, error: secError || new Error('Failed to load SEC categories') };
    }
    const operationalCat = secCategories.find(c => c.code === 'OPERATIONAL');
    const defaultSecId = operationalCat?.id;
    if (!defaultSecId) {
      return { data: null, error: new Error('OPERATIONAL SEC category not found') };
    }

    // 4. Build mappings for unmapped categories
    const newMappings = unmapped.map(categoryName => ({
      organization_id: organizationId,
      internal_category_name: categoryName,
      sec_category_id: suggestSecCategory(categoryName, defaults) || defaultSecId,
    }));

    if (newMappings.length === 0) {
      return { data: { autoMappedCount: 0 }, error: null };
    }

    // 5. Insert only new mappings (ignoreDuplicates protects existing ones)
    const { error: insertError } = await supabase
      .from('sec_category_mappings')
      .upsert(newMappings, { onConflict: 'organization_id,internal_category_name', ignoreDuplicates: true });

    if (insertError) {
      return { data: null, error: insertError };
    }

    return { data: { autoMappedCount: newMappings.length }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get risks grouped by their SEC category mapping for an organization
 * This is the core function used when building SEC submissions
 */
export async function getRisksGroupedBySECCategory(organizationId: string): Promise<{
  data: Record<string, {
    sec_category: SecStandardCategory;
    risks: Array<{
      id: string;
      risk_code: string;
      risk_title: string;
      category: string;
      likelihood_inherent: number;
      impact_inherent: number;
      residual_score: number | null;
      severity: string | null;
    }>;
    risk_count: number;
    avg_probability: number;
    avg_impact: number;
    avg_severity: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  }> | null;
  error: Error | null;
}> {
  try {
    // Fetch SEC categories
    const { data: secCategories, error: secError } = await getSecStandardCategories();
    if (secError || !secCategories) return { data: null, error: secError };

    // Fetch org's mappings
    const { data: mappings, error: mapError } = await getOrgSecMappings(organizationId);
    if (mapError) return { data: null, error: mapError };

    // Build mapping lookup: internal_category_name -> sec_category_id
    const categoryMap = new Map<string, string>();
    (mappings || []).forEach(m => {
      categoryMap.set(m.internal_category_name, m.sec_category_id);
    });

    // Fetch all open risks
    const { data: risks, error: riskError } = await supabase
      .from('risks')
      .select('id, risk_code, risk_title, category, likelihood_inherent, impact_inherent, residual_score, severity')
      .eq('organization_id', organizationId)
      .eq('status', 'Open')
      .order('risk_code');

    if (riskError) return { data: null, error: riskError };

    // Find default OPERATIONAL category for unmapped risks
    const operationalCat = secCategories.find(c => c.code === 'OPERATIONAL');
    const defaultSecId = operationalCat?.id || secCategories[0]?.id;

    // Group risks by SEC category
    const grouped: Record<string, {
      sec_category: SecStandardCategory;
      risks: Array<{
        id: string;
        risk_code: string;
        risk_title: string;
        category: string;
        likelihood_inherent: number;
        impact_inherent: number;
        residual_score: number | null;
        severity: string | null;
      }>;
      risk_count: number;
      avg_probability: number;
      avg_impact: number;
      avg_severity: number;
      critical_count: number;
      high_count: number;
      medium_count: number;
      low_count: number;
    }> = {};

    // Initialize all 5 SEC categories
    for (const sc of secCategories) {
      grouped[sc.code] = {
        sec_category: sc,
        risks: [],
        risk_count: 0,
        avg_probability: 0,
        avg_impact: 0,
        avg_severity: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
      };
    }

    // Assign each risk to its SEC category
    for (const risk of (risks || [])) {
      const secCatId = categoryMap.get(risk.category) || defaultSecId;
      const secCat = secCategories.find(c => c.id === secCatId);
      const code = secCat?.code || 'OPERATIONAL';

      if (grouped[code]) {
        grouped[code].risks.push({
          id: risk.id,
          risk_code: risk.risk_code,
          risk_title: risk.risk_title,
          category: risk.category,
          likelihood_inherent: risk.likelihood_inherent || 0,
          impact_inherent: risk.impact_inherent || 0,
          residual_score: risk.residual_score,
          severity: risk.severity,
        });
      }
    }

    // Calculate aggregates for each SEC category
    for (const code of Object.keys(grouped)) {
      const group = grouped[code];
      const riskList = group.risks;
      group.risk_count = riskList.length;

      if (riskList.length > 0) {
        group.avg_probability = riskList.reduce((sum, r) => sum + r.likelihood_inherent, 0) / riskList.length;
        group.avg_impact = riskList.reduce((sum, r) => sum + r.impact_inherent, 0) / riskList.length;
        group.avg_severity = riskList.reduce((sum, r) => sum + (r.likelihood_inherent * r.impact_inherent), 0) / riskList.length;
        group.critical_count = riskList.filter(r => r.severity === 'CRITICAL').length;
        group.high_count = riskList.filter(r => r.severity === 'HIGH').length;
        group.medium_count = riskList.filter(r => r.severity === 'MEDIUM').length;
        group.low_count = riskList.filter(r => r.severity === 'LOW').length;
      }

      // Round to 2 decimal places
      group.avg_probability = Math.round(group.avg_probability * 100) / 100;
      group.avg_impact = Math.round(group.avg_impact * 100) / 100;
      group.avg_severity = Math.round(group.avg_severity * 100) / 100;
    }

    return { data: grouped, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
