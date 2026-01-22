import { supabase } from './supabase';

/**
 * KRI (Key Risk Indicator) Management Service Layer
 *
 * Handles KRI definitions, data entries, alerts, and risk linking.
 * All operations automatically scope to user's organization via RLS.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface KRIDefinition {
  id: string;
  organization_id: string;
  user_id: string;
  kri_code: string;
  kri_name: string;
  description: string | null;
  category: string | null;
  indicator_type: 'leading' | 'lagging' | 'concurrent' | null;
  measurement_unit: string | null;
  data_source: string | null;
  collection_frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually' | null;
  target_value: number | null;
  lower_threshold: number | null;
  upper_threshold: number | null;
  threshold_direction: 'above' | 'below' | 'between' | null;
  responsible_user: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  linked_risk_codes?: string[];
}

export interface CreateKRIData {
  kri_code?: string; // Optional - will be auto-generated if not provided
  kri_name: string;
  description?: string;
  category?: string;
  indicator_type?: 'leading' | 'lagging' | 'concurrent';
  measurement_unit?: string;
  data_source?: string;
  collection_frequency?: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
  target_value?: number;
  lower_threshold?: number;
  upper_threshold?: number;
  threshold_direction?: 'above' | 'below' | 'between';
  responsible_user?: string;
  enabled?: boolean;
}

export interface UpdateKRIData extends Partial<CreateKRIData> {
  id: string;
}

export interface KRIDataEntry {
  id: string;
  kri_id: string;  // Changed from kri_definition_id to kri_id
  measurement_date: string;
  measurement_value: number;
  alert_status: 'green' | 'yellow' | 'red' | null;
  data_quality: 'verified' | 'estimated' | 'provisional' | null;
  notes: string | null;
  entered_by: string | null;
  created_at: string;
}

export interface CreateKRIDataEntryInput {
  kri_id: string;  // Changed from kri_definition_id to kri_id
  measurement_value: number;
  measurement_date?: string;
  data_quality?: 'verified' | 'estimated' | 'provisional';
  notes?: string;
}

export interface KRIAlert {
  id: string;
  kri_id: string;
  alert_level: 'yellow' | 'red';
  alert_date: string;
  measured_value: number;
  threshold_breached: number;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  acknowledged_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  // Flattened from joins
  kri_code?: string;
  kri_name?: string;
}

export interface KRIRiskLink {
  id: string;
  kri_id: string;
  risk_id: string;
  risk_code?: string; // Optional - may or may not be populated
  ai_link_confidence: number | null;
  linked_by: string | null;
  created_at: string;
}

// ============================================================================
// KRI CODE GENERATION
// ============================================================================

/**
 * Generate a unique KRI code using database function
 * Format: KRI-001, KRI-002, KRI-003, etc.
 * - "KRI-" prefix
 * - Sequential 3-digit number
 * - Uses database-level locking to prevent race conditions
 */
async function generateKRICode(organizationId: string): Promise<string> {
  try {
    // Call database function for atomic code generation
    const { data, error } = await supabase
      .rpc('generate_next_kri_code', {
        p_organization_id: organizationId
      });

    if (error) {
      console.error('Error generating KRI code via database function:', error);
      // Fallback to timestamp-based code
      return `KRI-${Date.now().toString().slice(-3)}`;
    }

    if (!data) {
      console.warn('Database function returned no data, using timestamp fallback');
      return `KRI-${Date.now().toString().slice(-3)}`;
    }

    console.log('✅ Generated KRI code atomically:', data);
    return data;
  } catch (err) {
    console.error('Unexpected error generating KRI code:', err);
    // Fallback to timestamp-based code
    return `KRI-${Date.now().toString().slice(-3)}`;
  }
}

// ============================================================================
// KRI DEFINITIONS CRUD
// ============================================================================

/**
 * Get all KRI definitions for the current user's organization
 */
export async function getKRIDefinitions(): Promise<{
  data: KRIDefinition[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('kri_definitions')
      .select(`
        *,
        kri_risk_links (
          risk_id
        )
      `)
      .order('kri_code', { ascending: true });

    if (error) {
      console.error('Get KRI definitions error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    // Flatten the nested kri_risk_links data into linked_risk_codes array
    // Note: We store risk_id UUIDs now, but keep the field name for compatibility
    const krisWithLinks = data?.map((kri: any) => ({
      ...kri,
      linked_risk_codes: kri.kri_risk_links?.map((link: any) => link.risk_id).filter(Boolean) || [],
      kri_risk_links: undefined, // Remove nested data
    }));

    return { data: krisWithLinks, error: null };
  } catch (err) {
    console.error('Unexpected get KRI definitions error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get a single KRI definition by ID
 */
export async function getKRIDefinition(
  kriId: string
): Promise<{ data: KRIDefinition | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('kri_definitions')
      .select('*')
      .eq('id', kriId)
      .single();

    if (error) {
      console.error('Get KRI definition error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get KRI definition error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create a new KRI definition
 */
export async function createKRI(
  kriData: CreateKRIData
): Promise<{ data: KRIDefinition | null; error: Error | null }> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get user profile to get organization_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    // Auto-generate kri_code if not provided
    const kriCode = kriData.kri_code || await generateKRICode(profile.organization_id);

    const { data, error } = await supabase
      .from('kri_definitions')
      .insert([
        {
          ...kriData,
          kri_code: kriCode,
          organization_id: profile.organization_id,
          user_id: user.id,
          enabled: kriData.enabled !== undefined ? kriData.enabled : true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create KRI error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('KRI created successfully:', data.id, 'with code:', kriCode);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected create KRI error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Update an existing KRI definition
 */
export async function updateKRI(
  kriData: UpdateKRIData
): Promise<{ data: KRIDefinition | null; error: Error | null }> {
  try {
    const { id, ...updates } = kriData;

    const { data, error } = await supabase
      .from('kri_definitions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update KRI error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('KRI updated successfully:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected update KRI error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Delete a KRI definition permanently
 */
export async function deleteKRI(
  kriId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('kri_definitions')
      .delete()
      .eq('id', kriId);

    if (error) {
      console.error('Delete KRI error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('KRI deleted successfully:', kriId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected delete KRI error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// KRI DATA ENTRIES
// ============================================================================

/**
 * Get all data entries for a KRI
 */
export async function getKRIDataEntries(
  kriId: string,
  limit?: number
): Promise<{ data: KRIDataEntry[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('kri_data_entries')
      .select('*')
      .eq('kri_id', kriId)  // Changed from kri_definition_id to kri_id
      .order('measurement_date', { ascending: false });  // Order by measurement_date

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get KRI data entries error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get KRI data entries error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Calculate alert status based on KRI thresholds
 */
function calculateAlertStatus(
  value: number,
  kri: KRIDefinition
): 'green' | 'yellow' | 'red' {
  if (!kri.threshold_direction) return 'green';

  const lower = kri.lower_threshold;
  const upper = kri.upper_threshold;

  if (kri.threshold_direction === 'above') {
    // Alert if value exceeds upper threshold
    if (upper !== null && value > upper) return 'red';
    if (lower !== null && value > lower) return 'yellow';
    return 'green';
  } else if (kri.threshold_direction === 'below') {
    // Alert if value falls below lower threshold
    if (lower !== null && value < lower) return 'red';
    if (upper !== null && value < upper) return 'yellow';
    return 'green';
  } else if (kri.threshold_direction === 'between') {
    // Alert if value is outside range
    if (lower !== null && value < lower) return 'red';
    if (upper !== null && value > upper) return 'red';
    return 'green';
  }

  return 'green';
}

/**
 * Add a new KRI data entry
 */
export async function createKRIDataEntry(
  entryData: CreateKRIDataEntryInput
): Promise<{ data: KRIDataEntry | null; error: Error | null }> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get KRI definition to calculate alert status
    const { data: kri, error: kriError } = await getKRIDefinition(
      entryData.kri_id
    );

    if (kriError || !kri) {
      return { data: null, error: new Error('KRI definition not found') };
    }

    // Calculate alert status
    const alertStatus = calculateAlertStatus(entryData.measurement_value, kri);

    // Insert data entry
    const { data, error } = await supabase
      .from('kri_data_entries')
      .insert([
        {
          kri_id: entryData.kri_id,
          measurement_value: entryData.measurement_value,
          measurement_date: entryData.measurement_date || new Date().toISOString().split('T')[0],
          data_quality: entryData.data_quality || 'verified',
          notes: entryData.notes || null,
          alert_status: alertStatus,
          entered_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create KRI data entry error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    // If alert status is yellow or red, create an alert
    if (alertStatus === 'yellow' || alertStatus === 'red') {
      await createKRIAlert({
        kri_id: entryData.kri_id,
        alert_level: alertStatus,
        alert_date: new Date().toISOString(),
        measured_value: entryData.measurement_value,
        threshold_breached:
          alertStatus === 'red'
            ? kri.threshold_direction === 'above'
              ? kri.upper_threshold!
              : kri.lower_threshold!
            : kri.threshold_direction === 'above'
              ? kri.lower_threshold!
              : kri.upper_threshold!,
      });
    }

    console.log('KRI data entry created successfully:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected create KRI data entry error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// KRI ALERTS
// ============================================================================

/**
 * Get all alerts, optionally filtered by status
 */
export async function getKRIAlerts(
  status?: 'open' | 'acknowledged' | 'resolved' | 'dismissed'
): Promise<{ data: (KRIAlert & { kri_code?: string })[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('kri_alerts')
      .select(`
        *,
        kri_definitions (
          kri_code,
          kri_name
        )
      `)
      .order('alert_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get KRI alerts error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    // Flatten the nested kri_definitions data
    const flattenedData = data?.map((alert: any) => ({
      ...alert,
      kri_code: alert.kri_definitions?.kri_code,
      kri_name: alert.kri_definitions?.kri_name,
    }));

    return { data: flattenedData, error: null };
  } catch (err) {
    console.error('Unexpected get KRI alerts error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get all open alerts across all KRIs
 */
export async function getAllOpenKRIAlerts(): Promise<{
  data: KRIAlert[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('kri_alerts')
      .select(
        `
        *,
        kri_definitions (
          kri_code,
          kri_name,
          category
        )
      `
      )
      .eq('status', 'open')
      .order('alert_date', { ascending: false });

    if (error) {
      console.error('Get all open KRI alerts error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get all open KRI alerts error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create a KRI alert
 */
async function createKRIAlert(alertData: {
  kri_id: string;
  alert_level: 'yellow' | 'red';
  alert_date: string;
  measured_value: number;
  threshold_breached: number;
}): Promise<{ data: KRIAlert | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('kri_alerts')
      .insert([
        {
          ...alertData,
          status: 'open',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create KRI alert error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('KRI alert created:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected create KRI alert error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Acknowledge a KRI alert
 */
export async function acknowledgeKRIAlert(
  alertId: string,
  notes?: string
): Promise<{ error: Error | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('kri_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
        acknowledged_notes: notes || null,
      })
      .eq('id', alertId);

    if (error) {
      console.error('Acknowledge KRI alert error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('KRI alert acknowledged:', alertId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected acknowledge KRI alert error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Resolve a KRI alert
 */
export async function resolveKRIAlert(
  alertId: string,
  resolutionNotes: string
): Promise<{ error: Error | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('kri_alerts')
      .update({
        status: 'resolved',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes,
      })
      .eq('id', alertId);

    if (error) {
      console.error('Resolve KRI alert error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('KRI alert resolved:', alertId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected resolve KRI alert error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// KRI-RISK LINKING
// ============================================================================

/**
 * Link a KRI to a risk
 */
export async function linkKRIToRisk(
  kriId: string,
  riskCodeOrId: string,  // Can accept either risk_code or risk_id
  aiConfidence?: number
): Promise<{ data: KRIRiskLink | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Resolve to risk_id (UUID) - the database uses risk_id as the primary link
    let riskId = riskCodeOrId;

    // If it doesn't look like a UUID, look up the risk_id from risk_code
    if (!riskCodeOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: risk, error: riskError } = await supabase
        .from('risks')
        .select('id')
        .eq('risk_code', riskCodeOrId)
        .single();

      if (riskError || !risk) {
        return { data: null, error: new Error('Risk not found') };
      }

      riskId = risk.id;
    }

    const { data, error } = await supabase
      .from('kri_risk_links')
      .insert([
        {
          kri_id: kriId,
          risk_id: riskId,
          ai_link_confidence: aiConfidence || null,
          linked_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Link KRI to risk error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('KRI linked to risk:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected link KRI to risk error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get all KRIs linked to a risk
 */
export async function getKRIsForRisk(
  riskCodeOrId: string  // Can accept either risk_code or risk_id
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    // Resolve to risk_id (UUID) - the database uses risk_id as the primary link
    let riskId = riskCodeOrId;

    // If it doesn't look like a UUID, look up the risk_id from risk_code
    if (!riskCodeOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: risk, error: riskError } = await supabase
        .from('risks')
        .select('id')
        .eq('risk_code', riskCodeOrId)
        .single();

      if (riskError || !risk) {
        return { data: null, error: new Error('Risk not found') };
      }
      riskId = risk.id;
    }

    const { data, error } = await supabase
      .from('kri_risk_links')
      .select(
        `
        *,
        kri_definitions (
          *
        )
      `
      )
      .eq('risk_id', riskId);

    if (error) {
      console.error('Get KRIs for risk error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get KRIs for risk error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Unlink a KRI from a risk
 */
export async function unlinkKRIFromRisk(
  linkId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('kri_risk_links')
      .delete()
      .eq('id', linkId);

    if (error) {
      console.error('Unlink KRI from risk error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('KRI unlinked from risk:', linkId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected unlink KRI from risk error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// KRI COVERAGE ANALYSIS
// ============================================================================

/**
 * Get risks without KRI coverage
 */
export async function getRisksWithoutKRICoverage(): Promise<{
  data: any[] | null;
  error: Error | null;
}> {
  try {
    // Get all risks
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('id, risk_code, risk_title, category, division');

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    // Get all KRI-risk links (now using risk_id)
    const { data: links, error: linksError } = await supabase
      .from('kri_risk_links')
      .select('risk_id');

    if (linksError) {
      return { data: null, error: new Error(linksError.message) };
    }

    // Find risks without links (compare by ID now)
    const linkedRiskIds = new Set(links?.map((l) => l.risk_id) || []);
    const uncoveredRisks = risks?.filter(
      (r) => !linkedRiskIds.has(r.id)
    );

    return { data: uncoveredRisks || [], error: null };
  } catch (err) {
    console.error('Unexpected get risks without KRI coverage error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get KRI coverage statistics
 */
export async function getKRICoverageStats(): Promise<{
  data: {
    total_risks: number;
    covered_risks: number;
    uncovered_risks: number;
    coverage_percentage: number;
    total_kris: number;
    active_kris: number;
  } | null;
  error: Error | null;
}> {
  try {
    // Get total risks
    const { count: totalRisks, error: risksError } = await supabase
      .from('risks')
      .select('*', { count: 'exact', head: true });

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    // Get unique covered risks (now using risk_id)
    const { data: links, error: linksError } = await supabase
      .from('kri_risk_links')
      .select('risk_id');

    if (linksError) {
      return { data: null, error: new Error(linksError.message) };
    }

    const coveredRisks = new Set(links?.map((l) => l.risk_id) || []).size;

    // Get total KRIs
    const { count: totalKRIs, error: krisTotalError } = await supabase
      .from('kri_definitions')
      .select('*', { count: 'exact', head: true });

    if (krisTotalError) {
      return { data: null, error: new Error(krisTotalError.message) };
    }

    // Get active KRIs
    const { count: activeKRIs, error: krisActiveError } = await supabase
      .from('kri_definitions')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true);

    if (krisActiveError) {
      return { data: null, error: new Error(krisActiveError.message) };
    }

    const uncoveredRisks = (totalRisks || 0) - coveredRisks;
    const coveragePercentage =
      totalRisks && totalRisks > 0
        ? Math.round((coveredRisks / totalRisks) * 100)
        : 0;

    return {
      data: {
        total_risks: totalRisks || 0,
        covered_risks: coveredRisks,
        uncovered_risks: uncoveredRisks,
        coverage_percentage: coveragePercentage,
        total_kris: totalKRIs || 0,
        active_kris: activeKRIs || 0,
      },
      error: null,
    };
  } catch (err) {
    console.error('Unexpected get KRI coverage stats error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// AI-POWERED KRI SUGGESTIONS
// ============================================================================

export interface AIKRISuggestion {
  kri_name: string;
  description: string;
  category: string;
  indicator_type: 'leading' | 'lagging' | 'concurrent';
  measurement_unit: string;
  data_source: string;
  collection_frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
  target_value: number;
  lower_threshold: number;
  upper_threshold: number;
  threshold_direction: 'above' | 'below' | 'between';
  responsible_user: string;
  linked_risk_code?: string;
  reasoning: string;
}

/**
 * Use AI to generate KRI suggestions based on risks
 *
 * Analyzes existing risks and suggests relevant KRIs to monitor them
 */
export async function generateAIKRISuggestions(
  riskCode?: string
): Promise<{ data: AIKRISuggestion[] | null; error: Error | null }> {
  try {

    // Get the specific risk to analyze
    const query = supabase
      .from('risks')
      .select('risk_code, risk_title, category, risk_description, likelihood_inherent, impact_inherent');

    if (riskCode) {
      query.eq('risk_code', riskCode);
    } else {
      query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: risks, error: risksError } = await query;

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    if (!risks || risks.length === 0) {
      return {
        data: null,
        error: new Error('No risks found to generate KRIs from'),
      };
    }

    // Filter to specific risk if provided
    const targetRisks = riskCode
      ? risks.filter((r) => r.risk_code === riskCode)
      : risks;

    if (targetRisks.length === 0) {
      return {
        data: null,
        error: new Error('Risk not found'),
      };
    }

    // Build prompt for AI
    const prompt = `Analyze this risk and generate 3 - 5 specific, actionable KRI suggestions.

      RISKS:
${targetRisks.map((r) => `
- Code: ${r.risk_code}
- Title: ${r.risk_title}
- Category: ${r.category || 'Operational'}
- Description: ${r.risk_description || 'Not specified'}
- Likelihood: ${r.likelihood_inherent}/5
- Impact: ${r.impact_inherent}/5
`).join('\n')}

    CRITICAL: Your response must be ONLY a JSON array. No markdown, no code blocks, no explanation - just the raw JSON array starting with [ and ending with ].

    Each KRI object must have these exact fields:
    {
      "kri_name": "Clear name",
      "description": "What this measures",
      "category": "Risk category",
      "indicator_type": "leading" OR "lagging" OR "concurrent",
      "measurement_unit": "Count" OR "Percentage" OR "Days" etc,
      "data_source": "Where data comes from",
      "collection_frequency": "Daily" OR "Weekly" OR "Monthly" OR "Quarterly" OR "Annually",
      "target_value": number,
      "lower_threshold": number,
      "upper_threshold": number,
      "threshold_direction": "above" OR "below" OR "between",
      "responsible_user": "Role/team name",
      "linked_risk_code": "The risk code",
      "reasoning": "Why this KRI is effective"
    }

    Return the JSON array now: `;

    // Call AI via Supabase Edge Function (to avoid CORS issues)
    console.log('Calling Supabase Edge Function for AI KRI generation...');
    console.log('Sending prompt (first 200 chars):', prompt.substring(0, 200));

    const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-kri-suggestions', {
      body: { prompt },
    });

    console.log('Edge function response:', { functionData, functionError });

    if (functionError) {
      console.error('Edge function error:', functionError);
      return {
        data: null,
        error: new Error(functionError.message || 'Edge function failed'),
      };
    }

    if (functionData?.error) {
      console.error('AI error from edge function:', functionData.error);
      console.error('AI error details:', functionData.details);
      return {
        data: null,
        error: new Error(`AI Error: ${functionData.error}. ${functionData.details || ''} `),
      };
    }

    if (!functionData?.suggestions) {
      console.error('No suggestions in response:', functionData);
      return {
        data: null,
        error: new Error('No suggestions returned from AI'),
      };
    }

    console.log(`AI generated ${functionData.suggestions.length} KRI suggestions`);
    return { data: functionData.suggestions, error: null };
  } catch (err) {
    console.error('Unexpected AI KRI suggestion error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Generate AI KRI suggestions based on Tolerance Limits
 */
export async function generateAIKRISuggestionsForTolerance(
  tolerance: any // Typed as any to avoid circular imports, but effectively ToleranceLimit
): Promise<{ data: AIKRISuggestion[] | null; error: Error | null }> {
  try {
    // Build prompt for AI
    const prompt = `Analyze this Risk Tolerance Limit and generate 3 specific, actionable KRI suggestions that would effectively monitor it.

TOLERANCE LIMIT:
    - Metric Name: ${tolerance.metric_name}
    - Type: ${tolerance.metric_type}
    - Unit: ${tolerance.unit}
    - Green(Safe) Max: ${tolerance.green_max ?? 'N/A'}
    - Amber(Warning) Max: ${tolerance.amber_max ?? 'N/A'}
    - Red(Breach) Min: ${tolerance.red_min ?? 'N/A'}

    CRITICAL: Your response must be ONLY a JSON array.No markdown, no code blocks, no explanation - just the raw JSON array starting with [and ending with ].

    Each KRI object must have these exact fields:
    {
      "kri_name": "Clear name",
      "description": "What this measures",
      "category": "Operational",
      "indicator_type": "leading" OR "lagging" OR "concurrent",
      "measurement_unit": "${tolerance.unit}",
      "data_source": "Where data comes from",
      "collection_frequency": "Daily" OR "Weekly" OR "Monthly" OR "Quarterly" OR "Annually",
      "target_value": number(aligned with Green Max),
      "lower_threshold": number(aligned with Red Min if applicable),
      "upper_threshold": number(aligned with Amber Max if applicable),
      "threshold_direction": "above" OR "below" OR "outside",
      "responsible_user": "Role/team name",
      "reasoning": "Why this KRI covers this tolerance"
    }

    Return the JSON array now: `;

    // Call AI via Supabase Edge Function
    console.log('Calling Supabase Edge Function for Tolerance KRI generation...');

    const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-kri-suggestions', {
      body: { prompt },
    });

    if (functionError) {
      console.error('Edge function error:', functionError);
      return {
        data: null,
        error: new Error(functionError.message || 'Edge function failed'),
      };
    }

    if (functionData?.error) {
      return { data: null, error: new Error(`AI Error: ${functionData.error} `) };
    }

    if (!functionData?.suggestions) {
      return { data: null, error: new Error('No suggestions returned from AI') };
    }

    return { data: functionData.suggestions, error: null };
  } catch (err) {
    console.error('Unexpected AI KRI suggestion error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
