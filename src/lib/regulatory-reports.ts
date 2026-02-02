/**
 * Regulatory Reports Library
 *
 * Functions for generating and managing regulatory reports
 */

import { supabase } from './supabase';

export interface ReportTemplate {
  id: string;
  regulator_id: string;
  name: string;
  description: string | null;
  version: string;
  config: {
    sections: Array<{ id: string; title: string; order: number }>;
    metrics: string[];
    filters: Record<string, any>;
    formatting: Record<string, any>;
  };
  is_active: boolean;
  created_at: string;
}

export interface RegulatoryReport {
  id: string;
  template_id: string;
  regulator_id: string;
  organization_id: string | null;
  report_name: string;
  reporting_period_start: string;
  reporting_period_end: string;
  generated_at: string;
  data: Record<string, any>;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved';
  submitted_at: string | null;
}

export interface ReportSchedule {
  id: string;
  template_id: string;
  organization_id: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'custom';
  day_of_month: number | null;
  month_of_year: number | null;
  next_run_date: string | null;
  is_active: boolean;
}

/**
 * Get all report templates for a regulator
 */
export async function getReportTemplates(regulator_id?: string) {
  let query = supabase
    .from('regulatory_report_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (regulator_id) {
    query = query.eq('regulator_id', regulator_id);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Get a specific report template
 */
export async function getReportTemplate(template_id: string) {
  const { data, error } = await supabase
    .from('regulatory_report_templates')
    .select('*')
    .eq('id', template_id)
    .single();

  return { data, error };
}

/**
 * Generate report data for a template
 */
export async function generateReportData(
  template_id: string,
  organization_id: string,
  period_start: string,
  period_end: string
): Promise<{ data: any; error: Error | null }> {
  try {
    // Get template
    const { data: template, error: templateError } = await getReportTemplate(template_id);
    if (templateError || !template) {
      return { data: null, error: new Error('Template not found') };
    }

    // Get organization data
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization_id)
      .single();

    if (orgError) {
      return { data: null, error: orgError };
    }

    // Get risks for the period
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select(`
        *,
        category:risk_categories(
          id,
          name,
          master_category:master_risk_categories(
            code,
            name
          )
        )
      `)
      .eq('organization_id', organization_id)
      .eq('status', 'OPEN');

    if (risksError) {
      return { data: null, error: risksError };
    }

    // Get controls
    const { data: controls, error: controlsError } = await supabase
      .from('controls')
      .select('*')
      .eq('organization_id', organization_id);

    if (controlsError) {
      return { data: null, error: controlsError };
    }

    // Get KRIs
    const { data: kris, error: krisError } = await supabase
      .from('kris')
      .select('*')
      .eq('organization_id', organization_id);

    // Get incidents for the period
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('*')
      .eq('organization_id', organization_id)
      .gte('incident_date', period_start)
      .lte('incident_date', period_end);

    // Calculate metrics
    const riskList = risks || [];
    const total_risks = riskList.length;
    const critical_risks = riskList.filter(r => r.severity === 'CRITICAL').length;
    const high_risks = riskList.filter(r => r.severity === 'HIGH').length;
    const medium_risks = riskList.filter(r => r.severity === 'MEDIUM').length;
    const low_risks = riskList.filter(r => r.severity === 'LOW').length;

    // Calculate averages
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

    // Group risks by category
    const risksByCategory: Record<string, any[]> = {};
    riskList.forEach(risk => {
      const categoryCode = risk.category?.master_category?.code || 'UNCLASSIFIED';
      if (!risksByCategory[categoryCode]) {
        risksByCategory[categoryCode] = [];
      }
      risksByCategory[categoryCode].push(risk);
    });

    // Calculate control effectiveness
    const controlList = controls || [];
    const controlsWithDIME = controlList.filter(
      c => c.design_score != null && c.implementation_score != null
    );
    const avg_control_effectiveness =
      controlsWithDIME.length > 0
        ? controlsWithDIME.reduce((sum, c) => sum + (c.effectiveness_percentage || 0), 0) /
          controlsWithDIME.length
        : 0;

    // Build report data
    const reportData = {
      organization: {
        id: org.id,
        name: org.name,
        institution_type: org.institution_type,
      },
      period: {
        start: period_start,
        end: period_end,
        generated_at: new Date().toISOString(),
      },
      executive_summary: {
        total_risks,
        critical_risks,
        high_risks,
        medium_risks,
        low_risks,
        avg_inherent_score: Math.round(avg_inherent * 100) / 100,
        avg_residual_score: Math.round(avg_residual * 100) / 100,
        risk_reduction_percentage: Math.round(risk_reduction * 10) / 10,
      },
      risks: {
        total: total_risks,
        by_severity: {
          CRITICAL: critical_risks,
          HIGH: high_risks,
          MEDIUM: medium_risks,
          LOW: low_risks,
        },
        by_category: Object.keys(risksByCategory).map(code => ({
          category: code,
          count: risksByCategory[code].length,
          critical: risksByCategory[code].filter(r => r.severity === 'CRITICAL').length,
          high: risksByCategory[code].filter(r => r.severity === 'HIGH').length,
        })),
        top_risks: riskList
          .sort((a, b) => (b.residual_score || 0) - (a.residual_score || 0))
          .slice(0, 10)
          .map(r => ({
            id: r.id,
            title: r.title,
            category: r.category?.master_category?.name,
            severity: r.severity,
            inherent_score: (r.likelihood_inherent || 0) * (r.impact_inherent || 0),
            residual_score: r.residual_score,
          })),
      },
      controls: {
        total: controlList.length,
        with_dime: controlsWithDIME.length,
        avg_effectiveness: Math.round(avg_control_effectiveness * 10) / 10,
      },
      kris: {
        total: kris?.length || 0,
        breached: kris?.filter(k => k.status === 'BREACHED').length || 0,
      },
      incidents: {
        total: incidents?.length || 0,
        by_severity: {
          CRITICAL: incidents?.filter(i => i.severity === 'CRITICAL').length || 0,
          HIGH: incidents?.filter(i => i.severity === 'HIGH').length || 0,
          MEDIUM: incidents?.filter(i => i.severity === 'MEDIUM').length || 0,
          LOW: incidents?.filter(i => i.severity === 'LOW').length || 0,
        },
      },
    };

    return { data: reportData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create a new regulatory report
 */
export async function createRegulatoryReport(
  template_id: string,
  organization_id: string,
  report_name: string,
  period_start: string,
  period_end: string
): Promise<{ data: any; error: Error | null }> {
  try {
    // Generate report data
    const { data: reportData, error: dataError } = await generateReportData(
      template_id,
      organization_id,
      period_start,
      period_end
    );

    if (dataError || !reportData) {
      return { data: null, error: dataError || new Error('Failed to generate report data') };
    }

    // Get template to find regulator_id
    const { data: template, error: templateError } = await getReportTemplate(template_id);
    if (templateError || !template) {
      return { data: null, error: new Error('Template not found') };
    }

    // Insert report
    const { data: report, error: insertError } = await supabase
      .from('regulatory_reports')
      .insert({
        template_id,
        regulator_id: template.regulator_id,
        organization_id,
        report_name,
        reporting_period_start: period_start,
        reporting_period_end: period_end,
        data: reportData,
        status: 'draft',
      })
      .select()
      .single();

    if (insertError) {
      return { data: null, error: insertError };
    }

    return { data: report, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get reports for an organization
 */
export async function getOrganizationReports(organization_id: string) {
  const { data, error } = await supabase
    .from('regulatory_reports')
    .select(`
      *,
      template:regulatory_report_templates(
        name,
        regulator:regulators(
          name,
          code
        )
      )
    `)
    .eq('organization_id', organization_id)
    .order('generated_at', { ascending: false });

  return { data, error };
}

/**
 * Get reports for a regulator (all organizations)
 */
export async function getRegulatorReports(regulator_id: string) {
  const { data, error } = await supabase
    .from('regulatory_reports')
    .select(`
      *,
      organization:organizations(
        name,
        institution_type
      ),
      template:regulatory_report_templates(
        name
      )
    `)
    .eq('regulator_id', regulator_id)
    .order('generated_at', { ascending: false });

  return { data, error };
}

/**
 * Update report status
 */
export async function updateReportStatus(
  report_id: string,
  status: 'draft' | 'submitted' | 'reviewed' | 'approved'
) {
  const updates: any = { status };

  if (status === 'submitted') {
    updates.submitted_at = new Date().toISOString();
  }
  if (status === 'reviewed' || status === 'approved') {
    updates.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('regulatory_reports')
    .update(updates)
    .eq('id', report_id)
    .select()
    .single();

  return { data, error };
}

/**
 * Create report schedule
 */
export async function createReportSchedule(
  template_id: string,
  organization_id: string,
  frequency: 'monthly' | 'quarterly' | 'annual',
  day_of_month?: number
) {
  const { data, error } = await supabase
    .from('regulatory_report_schedules')
    .insert({
      template_id,
      organization_id,
      frequency,
      day_of_month,
      is_active: true,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Get schedules for an organization
 */
export async function getOrganizationSchedules(organization_id: string) {
  const { data, error } = await supabase
    .from('regulatory_report_schedules')
    .select(`
      *,
      template:regulatory_report_templates(
        name,
        regulator:regulators(
          name,
          code
        )
      )
    `)
    .eq('organization_id', organization_id)
    .order('created_at', { ascending: false });

  return { data, error };
}
