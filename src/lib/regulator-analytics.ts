/**
 * Regulator Analytics Library
 *
 * Functions for regulator dashboard analytics and reporting
 */

import { supabase } from './supabase';

export interface RegulatorDashboardMetrics {
  total_organizations: number;
  total_risks: number;
  critical_risks: number;
  high_risks: number;
  avg_inherent_score: number;
  avg_residual_score: number;
  organizations_by_type: Record<string, number>;
}

export interface OrganizationRiskSummary {
  organization_id: string;
  organization_name: string;
  institution_type: string | null;
  total_risks: number;
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  avg_inherent_score: number;
  avg_residual_score: number;
  risk_reduction_percentage: number;
}

export interface CategoryRiskBreakdown {
  master_category_code: string;
  master_category_name: string;
  risk_count: number;
  critical_count: number;
  high_count: number;
  avg_inherent: number;
  avg_residual: number;
}

export interface RegulatorHeatmapData {
  organization_name: string;
  institution_type: string | null;
  category_scores: Record<string, {
    risk_count: number;
    avg_score: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  }>;
}

/**
 * Get dashboard metrics for a specific regulator
 */
export async function getRegulatorDashboardMetrics(
  regulator_id: string
): Promise<{ data: RegulatorDashboardMetrics | null; error: Error | null }> {
  try {
    // Get organizations assigned to this regulator
    const { data: orgData, error: orgError } = await supabase
      .from('organization_regulators')
      .select('organization:organizations(id, name, institution_type)')
      .eq('regulator_id', regulator_id);

    if (orgError) {
      return { data: null, error: orgError };
    }

    const orgs = (orgData || []).map((o: any) => o.organization).filter(Boolean);
    const organizationIds = orgs.map((o: any) => o.id).filter(Boolean);

    if (organizationIds.length === 0) {
      return {
        data: {
          total_organizations: 0,
          total_risks: 0,
          critical_risks: 0,
          high_risks: 0,
          avg_inherent_score: 0,
          avg_residual_score: 0,
          organizations_by_type: {},
        },
        error: null,
      };
    }

    // Get risk statistics
    const { data: riskData, error: riskError } = await supabase
      .from('risks')
      .select('id, likelihood_inherent, impact_inherent, residual_score, severity')
      .in('organization_id', organizationIds)
      .eq('status', 'OPEN');

    if (riskError) {
      return { data: null, error: riskError };
    }

    const risks = riskData || [];
    const critical_risks = risks.filter(r => r.severity === 'CRITICAL').length;
    const high_risks = risks.filter(r => r.severity === 'HIGH').length;

    const avg_inherent_score =
      risks.length > 0
        ? risks.reduce((sum, r) => sum + (r.likelihood_inherent || 0) * (r.impact_inherent || 0), 0) /
          risks.length
        : 0;

    const avg_residual_score =
      risks.length > 0
        ? risks.reduce((sum, r) => sum + (r.residual_score || 0), 0) / risks.length
        : 0;

    // Count organizations by type
    const organizations_by_type: Record<string, number> = {};
    orgs.forEach((o: any) => {
      const type = o.institution_type || 'Unknown';
      organizations_by_type[type] = (organizations_by_type[type] || 0) + 1;
    });

    return {
      data: {
        total_organizations: organizationIds.length,
        total_risks: risks.length,
        critical_risks,
        high_risks,
        avg_inherent_score: Math.round(avg_inherent_score * 100) / 100,
        avg_residual_score: Math.round(avg_residual_score * 100) / 100,
        organizations_by_type,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get risk summary for each organization under a regulator
 */
export async function getOrganizationRiskSummaries(
  regulator_id: string
): Promise<{ data: OrganizationRiskSummary[] | null; error: Error | null }> {
  try {
    // Get organizations assigned to this regulator
    const { data: orgData, error: orgError } = await supabase
      .from('organization_regulators')
      .select('organization:organizations(id, name, institution_type)')
      .eq('regulator_id', regulator_id);

    if (orgError) {
      return { data: null, error: orgError };
    }

    const organizations: Array<{ id: string; name: string; institution_type: string | null }> =
      (orgData || []).map((o: any) => o.organization).filter(Boolean);

    if (organizations.length === 0) {
      return { data: [], error: null };
    }

    const summaries: OrganizationRiskSummary[] = [];

    for (const org of organizations) {
      // Get risks for this organization
      const { data: risks, error: riskError } = await supabase
        .from('risks')
        .select('likelihood_inherent, impact_inherent, residual_score, severity')
        .eq('organization_id', org.id)
        .eq('status', 'OPEN');

      if (riskError) continue;

      const riskList = risks || [];
      const critical_risks = riskList.filter(r => r.severity === 'CRITICAL').length;
      const high_risks = riskList.filter(r => r.severity === 'HIGH').length;
      const medium_risks = riskList.filter(r => r.severity === 'MEDIUM').length;
      const low_risks = riskList.filter(r => r.severity === 'LOW').length;

      const avg_inherent =
        riskList.length > 0
          ? riskList.reduce((sum, r) => sum + (r.likelihood_inherent || 0) * (r.impact_inherent || 0), 0) /
            riskList.length
          : 0;

      const avg_residual =
        riskList.length > 0
          ? riskList.reduce((sum, r) => sum + (r.residual_score || 0), 0) / riskList.length
          : 0;

      const risk_reduction = avg_inherent > 0 ? ((avg_inherent - avg_residual) / avg_inherent) * 100 : 0;

      summaries.push({
        organization_id: org.id,
        organization_name: org.name,
        institution_type: org.institution_type,
        total_risks: riskList.length,
        critical_risks,
        high_risks,
        medium_risks,
        low_risks,
        avg_inherent_score: Math.round(avg_inherent * 100) / 100,
        avg_residual_score: Math.round(avg_residual * 100) / 100,
        risk_reduction_percentage: Math.round(risk_reduction * 10) / 10,
      });
    }

    return { data: summaries, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get risk breakdown by master category for a regulator
 */
export async function getCategoryRiskBreakdown(
  regulator_id: string
): Promise<{ data: CategoryRiskBreakdown[] | null; error: Error | null }> {
  try {
    // Get organizations assigned to this regulator
    const { data: orgData, error: orgError } = await supabase
      .from('organization_regulators')
      .select('organization_id')
      .eq('regulator_id', regulator_id);

    if (orgError) {
      return { data: null, error: orgError };
    }

    const organizationIds = orgData?.map(o => o.organization_id) || [];

    if (organizationIds.length === 0) {
      return { data: [], error: null };
    }

    // Get risks with category information
    const { data: risks, error: riskError } = await supabase
      .from('risks')
      .select(`
        likelihood_inherent,
        impact_inherent,
        residual_score,
        severity,
        category:risk_categories(
          master_category:master_risk_categories(
            code,
            name
          )
        )
      `)
      .in('organization_id', organizationIds)
      .eq('status', 'OPEN');

    if (riskError) {
      return { data: null, error: riskError };
    }

    // Group by master category
    const categoryMap = new Map<string, {
      name: string;
      risks: any[];
    }>();

    risks?.forEach((risk: any) => {
      const masterCat = risk.category?.master_category;
      if (masterCat) {
        const key = masterCat.code;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, { name: masterCat.name, risks: [] });
        }
        categoryMap.get(key)!.risks.push(risk);
      }
    });

    const breakdown: CategoryRiskBreakdown[] = [];

    categoryMap.forEach((value, code) => {
      const categoryRisks = value.risks;
      const critical_count = categoryRisks.filter(r => r.severity === 'CRITICAL').length;
      const high_count = categoryRisks.filter(r => r.severity === 'HIGH').length;

      const avg_inherent =
        categoryRisks.length > 0
          ? categoryRisks.reduce((sum, r) => sum + (r.likelihood_inherent || 0) * (r.impact_inherent || 0), 0) /
            categoryRisks.length
          : 0;

      const avg_residual =
        categoryRisks.length > 0
          ? categoryRisks.reduce((sum, r) => sum + (r.residual_score || 0), 0) / categoryRisks.length
          : 0;

      breakdown.push({
        master_category_code: code,
        master_category_name: value.name,
        risk_count: categoryRisks.length,
        critical_count,
        high_count,
        avg_inherent: Math.round(avg_inherent * 100) / 100,
        avg_residual: Math.round(avg_residual * 100) / 100,
      });
    });

    return { data: breakdown.sort((a, b) => b.risk_count - a.risk_count), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get heatmap data: organizations x categories with severity coloring
 */
export async function getRegulatorHeatmapData(
  regulator_id: string
): Promise<{ data: RegulatorHeatmapData[] | null; error: Error | null }> {
  try {
    // Get organizations
    const { data: orgData, error: orgError } = await supabase
      .from('organization_regulators')
      .select('organization:organizations(id, name, institution_type)')
      .eq('regulator_id', regulator_id);

    if (orgError) {
      return { data: null, error: orgError };
    }

    const heatmapOrgs: Array<{ id: string; name: string; institution_type: string | null }> =
      (orgData || []).map((o: any) => o.organization).filter(Boolean);

    if (heatmapOrgs.length === 0) {
      return { data: [], error: null };
    }

    const heatmapData: RegulatorHeatmapData[] = [];

    for (const org of heatmapOrgs) {
      // Get risks grouped by master category
      const { data: risks, error: riskError } = await supabase
        .from('risks')
        .select(`
          residual_score,
          severity,
          category:risk_categories(
            master_category:master_risk_categories(
              code,
              name
            )
          )
        `)
        .eq('organization_id', org.id)
        .eq('status', 'OPEN');

      if (riskError) continue;

      // Group by category
      const categoryScores: Record<string, {
        risk_count: number;
        avg_score: number;
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
      }> = {};

      const categoryMap = new Map<string, { scores: number[]; severities: string[] }>();

      risks?.forEach((risk: any) => {
        const code = risk.category?.master_category?.code;
        if (code) {
          if (!categoryMap.has(code)) {
            categoryMap.set(code, { scores: [], severities: [] });
          }
          categoryMap.get(code)!.scores.push(risk.residual_score || 0);
          categoryMap.get(code)!.severities.push(risk.severity || 'LOW');
        }
      });

      categoryMap.forEach((value, code) => {
        const avg = value.scores.reduce((sum, s) => sum + s, 0) / value.scores.length;
        const hasCritical = value.severities.includes('CRITICAL');
        const hasHigh = value.severities.includes('HIGH');
        const hasMedium = value.severities.includes('MEDIUM');

        let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'LOW';
        if (hasCritical) severity = 'CRITICAL';
        else if (hasHigh) severity = 'HIGH';
        else if (hasMedium) severity = 'MEDIUM';

        categoryScores[code] = {
          risk_count: value.scores.length,
          avg_score: Math.round(avg * 100) / 100,
          severity,
        };
      });

      heatmapData.push({
        organization_name: org.name,
        institution_type: org.institution_type,
        category_scores: categoryScores,
      });
    }

    return { data: heatmapData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
