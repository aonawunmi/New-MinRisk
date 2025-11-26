import { supabase } from './supabase';

/**
 * Incident Management Service Layer
 *
 * Handles incident logging, AI-powered risk linking,
 * control adequacy assessment, and enhancement plans.
 *
 * Uses Anthropic Claude API for AI features.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Incident {
  id: string;
  organization_id: string;
  user_id: string;
  incident_code: string;
  title: string;
  description: string | null;
  incident_date: string;
  reported_by: string | null;
  division: string | null;
  department: string | null;
  incident_type: string | null;
  severity: number; // 1-5
  financial_impact: number | null;
  status: 'Reported' | 'Under Investigation' | 'Resolved' | 'Closed';
  root_cause: string | null;
  corrective_actions: string | null;
  ai_suggested_risks: any[]; // JSONB array
  ai_control_recommendations: any[]; // JSONB array
  linked_risk_codes: string[]; // TEXT array
  created_at: string;
  updated_at: string;
}

export interface CreateIncidentData {
  title: string;
  description?: string;
  incident_date: string;
  reported_by?: string;
  division?: string;
  department?: string;
  incident_type?: string;
  severity: number;
  financial_impact?: number;
  status?: 'Reported' | 'Under Investigation' | 'Resolved' | 'Closed';
  root_cause?: string;
  corrective_actions?: string;
}

export interface UpdateIncidentData extends Partial<CreateIncidentData> {
  id: string;
}

export interface ControlEnhancementPlan {
  id: string;
  organization_id: string;
  incident_id: string;
  risk_code: string;
  control_gap: string;
  enhancement_plan: string;
  target_completion_date: string | null;
  responsible_party: string | null;
  status: 'Planned' | 'In Progress' | 'Completed' | 'On Hold';
  created_at: string;
}

export interface CreateEnhancementPlanData {
  incident_id: string;
  risk_code: string;
  control_gap: string;
  enhancement_plan: string;
  target_completion_date?: string;
  responsible_party?: string;
  status?: 'Planned' | 'In Progress' | 'Completed' | 'On Hold';
}

export interface AIRiskSuggestion {
  risk_code: string;
  risk_title: string;
  confidence: number; // 0-100
  reasoning: string;
  suggested_linkage: 'direct' | 'indirect' | 'potential';
}

export interface AIControlAssessment {
  control_id?: string;
  control_description: string;
  adequacy_rating: 'adequate' | 'partially_adequate' | 'inadequate';
  confidence: number; // 0-100
  gaps_identified: string[];
  recommendations: string[];
  reasoning: string;
}

// ============================================================================
// INCIDENT CODE GENERATION
// ============================================================================

/**
 * Generate next incident code for organization
 * Format: INC-DIV-001
 */
async function generateIncidentCode(
  organizationId: string,
  division: string
): Promise<string> {
  try {
    // Get division prefix (first 3 letters, uppercase)
    const divPrefix = division.substring(0, 3).toUpperCase();

    // Find max number for this division
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('incident_code')
      .eq('organization_id', organizationId)
      .ilike('incident_code', `INC-${divPrefix}-%`);

    if (error) {
      console.error('Error fetching incidents for code generation:', error);
      // Fallback to timestamp-based code
      return `INC-${divPrefix}-${Date.now()}`;
    }

    // Extract numbers and find max
    let maxNum = 0;
    if (incidents && incidents.length > 0) {
      incidents.forEach((inc) => {
        const match = inc.incident_code.match(/INC-[A-Z]+-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
    }

    // Generate next code
    const nextNum = maxNum + 1;
    return `INC-${divPrefix}-${String(nextNum).padStart(3, '0')}`;
  } catch (err) {
    console.error('Unexpected error generating incident code:', err);
    // Fallback
    const divPrefix = division.substring(0, 3).toUpperCase();
    return `INC-${divPrefix}-${Date.now()}`;
  }
}

// ============================================================================
// INCIDENTS CRUD
// ============================================================================

/**
 * Get all incidents for the current user's organization
 */
export async function getIncidents(options?: {
  status?: string;
  division?: string;
  limit?: number;
}): Promise<{ data: Incident[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('incidents')
      .select('*')
      .order('incident_date', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.division) {
      query = query.eq('division', options.division);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get incidents error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get incidents error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get a single incident by ID
 */
export async function getIncident(
  incidentId: string
): Promise<{ data: Incident | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (error) {
      console.error('Get incident error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get incident error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create a new incident
 */
export async function createIncident(
  incidentData: CreateIncidentData
): Promise<{ data: Incident | null; error: Error | null }> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get user profile for organization_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    // Generate incident code
    const incidentCode = await generateIncidentCode(
      profile.organization_id,
      incidentData.division || 'GEN'
    );

    // Create incident
    const { data, error } = await supabase
      .from('incidents')
      .insert([
        {
          ...incidentData,
          organization_id: profile.organization_id,
          user_id: user.id,
          incident_code: incidentCode,
          status: incidentData.status || 'Reported',
          ai_suggested_risks: [],
          ai_control_recommendations: [],
          linked_risk_codes: [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create incident error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Incident created successfully:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected create incident error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Update an existing incident
 */
export async function updateIncident(
  incidentData: UpdateIncidentData
): Promise<{ data: Incident | null; error: Error | null }> {
  try {
    const { id, ...updates } = incidentData;

    const { data, error } = await supabase
      .from('incidents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update incident error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Incident updated successfully:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected update incident error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Delete an incident
 */
export async function deleteIncident(
  incidentId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', incidentId);

    if (error) {
      console.error('Delete incident error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Incident deleted successfully:', incidentId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected delete incident error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// AI-POWERED RISK LINKING
// ============================================================================

/**
 * Use AI to suggest relevant risks for an incident
 */
export async function suggestRisksForIncident(
  incident: Incident
): Promise<{ data: AIRiskSuggestion[] | null; error: Error | null }> {
  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        data: null,
        error: new Error('Anthropic API key not configured'),
      };
    }

    // Get all active risks
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('risk_code, risk_title, risk_description, category, division')
      .in('status', ['OPEN', 'MONITORING']);

    if (risksError) {
      return { data: null, error: new Error(risksError.message) };
    }

    if (!risks || risks.length === 0) {
      return { data: [], error: null };
    }

    const prompt = `You are analyzing an incident to identify related risks.

INCIDENT:
Code: ${incident.incident_code}
Title: ${incident.title}
Description: ${incident.description || 'No description'}
Division: ${incident.division || 'Not specified'}
Department: ${incident.department || 'Not specified'}
Type: ${incident.incident_type || 'Not specified'}
Severity: ${incident.severity}/5
Root Cause: ${incident.root_cause || 'Not yet identified'}

AVAILABLE RISKS:
${risks.map((r) => `- ${r.risk_code}: ${r.risk_title} (${r.category})`).join('\n')}

TASK:
Identify which risks are related to this incident. Consider:
1. Direct causal relationship
2. Same category or domain
3. Could this incident indicate the risk is materializing?
4. Could this incident worsen the risk's likelihood or impact?

Respond ONLY with valid JSON array:
[
  {
    "risk_code": "RISK-CODE",
    "risk_title": "Risk Title",
    "confidence": 85,
    "reasoning": "brief explanation",
    "suggested_linkage": "direct" or "indirect" or "potential"
  }
]

Only include risks with confidence >= 60. Return empty array [] if no relevant risks found.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return {
        data: null,
        error: new Error(`Claude API error: ${response.status}`),
      };
    }

    const result = await response.json();
    const contentText = result.content[0].text;

    // Extract JSON array from response
    const jsonMatch = contentText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { data: [], error: null };
    }

    const suggestions: AIRiskSuggestion[] = JSON.parse(jsonMatch[0]);

    console.log('AI risk suggestions generated:', suggestions.length);
    return { data: suggestions, error: null };
  } catch (err) {
    console.error('Unexpected suggest risks error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Save AI risk suggestions to incident
 */
export async function saveRiskSuggestions(
  incidentId: string,
  suggestions: AIRiskSuggestion[]
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('incidents')
      .update({
        ai_suggested_risks: suggestions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('Save risk suggestions error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Risk suggestions saved for incident:', incidentId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected save risk suggestions error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Link an incident to a risk
 */
export async function linkIncidentToRisk(
  incidentId: string,
  riskCode: string
): Promise<{ error: Error | null }> {
  try {
    // Get current incident
    const { data: incident, error: getError } = await supabase
      .from('incidents')
      .select('linked_risk_codes')
      .eq('id', incidentId)
      .single();

    if (getError) {
      return { error: new Error(getError.message) };
    }

    // Add risk code if not already linked
    const linkedCodes = incident.linked_risk_codes || [];
    if (!linkedCodes.includes(riskCode)) {
      linkedCodes.push(riskCode);

      const { error: updateError } = await supabase
        .from('incidents')
        .update({
          linked_risk_codes: linkedCodes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }
    }

    console.log('Incident linked to risk:', { incidentId, riskCode });
    return { error: null };
  } catch (err) {
    console.error('Unexpected link incident to risk error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// AI-POWERED CONTROL ADEQUACY ASSESSMENT
// ============================================================================

/**
 * Use AI to assess control adequacy based on incident
 */
export async function assessControlAdequacy(
  incident: Incident,
  riskCode: string
): Promise<{ data: AIControlAssessment[] | null; error: Error | null }> {
  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        data: null,
        error: new Error('Anthropic API key not configured'),
      };
    }

    // Get risk and its controls
    const { data: risk, error: riskError } = await supabase
      .from('risks')
      .select('*')
      .eq('risk_code', riskCode)
      .single();

    if (riskError) {
      return { data: null, error: new Error(riskError.message) };
    }

    const { data: controls, error: controlsError } = await supabase
      .from('controls')
      .select('*')
      .eq('risk_id', risk.id);

    if (controlsError) {
      return { data: null, error: new Error(controlsError.message) };
    }

    const prompt = `You are assessing if existing controls were adequate to prevent an incident.

INCIDENT THAT OCCURRED:
Title: ${incident.title}
Description: ${incident.description || 'No description'}
Severity: ${incident.severity}/5
Root Cause: ${incident.root_cause || 'Not yet identified'}
Corrective Actions: ${incident.corrective_actions || 'None specified'}

RISK:
Code: ${risk.risk_code}
Title: ${risk.risk_title}
Description: ${risk.risk_description}

EXISTING CONTROLS:
${
  controls && controls.length > 0
    ? controls
        .map(
          (c) =>
            `- ${c.description} (DIME: D=${c.design}/3, I=${c.implementation}/3, M=${c.monitoring}/3, E=${c.effectiveness_evaluation}/3)`
        )
        .join('\n')
    : 'No controls defined for this risk.'
}

TASK:
Assess each control's adequacy in preventing this incident. For each control (or if no controls exist, provide general assessment):

Respond ONLY with valid JSON array:
[
  {
    "control_description": "Description of control (or 'No controls' if none exist)",
    "adequacy_rating": "adequate" or "partially_adequate" or "inadequate",
    "confidence": 85,
    "gaps_identified": ["gap 1", "gap 2"],
    "recommendations": ["recommendation 1", "recommendation 2"],
    "reasoning": "brief explanation"
  }
]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return {
        data: null,
        error: new Error(`Claude API error: ${response.status}`),
      };
    }

    const result = await response.json();
    const contentText = result.content[0].text;

    // Extract JSON array from response
    const jsonMatch = contentText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { data: [], error: null };
    }

    const assessments: AIControlAssessment[] = JSON.parse(jsonMatch[0]);

    console.log('AI control assessments generated:', assessments.length);
    return { data: assessments, error: null };
  } catch (err) {
    console.error('Unexpected assess control adequacy error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Save AI control recommendations to incident
 */
export async function saveControlRecommendations(
  incidentId: string,
  assessments: AIControlAssessment[]
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('incidents')
      .update({
        ai_control_recommendations: assessments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('Save control recommendations error:', error.message);
      return { error: new Error(error.message) };
    }

    console.log('Control recommendations saved for incident:', incidentId);
    return { error: null };
  } catch (err) {
    console.error('Unexpected save control recommendations error:', err);
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// CONTROL ENHANCEMENT PLANS
// ============================================================================

/**
 * Get enhancement plans for an incident
 */
export async function getEnhancementPlans(
  incidentId: string
): Promise<{ data: ControlEnhancementPlan[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('control_enhancement_plans')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get enhancement plans error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected get enhancement plans error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Create a control enhancement plan
 */
export async function createEnhancementPlan(
  planData: CreateEnhancementPlanData
): Promise<{ data: ControlEnhancementPlan | null; error: Error | null }> {
  try {
    // Get user profile for organization_id
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    const { data, error } = await supabase
      .from('control_enhancement_plans')
      .insert([
        {
          ...planData,
          organization_id: profile.organization_id,
          status: planData.status || 'Planned',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create enhancement plan error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Enhancement plan created:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected create enhancement plan error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Update an enhancement plan
 */
export async function updateEnhancementPlan(
  planId: string,
  updates: Partial<CreateEnhancementPlanData>
): Promise<{ data: ControlEnhancementPlan | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('control_enhancement_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Update enhancement plan error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Enhancement plan updated:', data.id);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected update enhancement plan error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

// ============================================================================
// INCIDENT STATISTICS
// ============================================================================

/**
 * Get incident statistics
 */
export async function getIncidentStatistics(): Promise<{
  data: {
    total: number;
    by_status: Record<string, number>;
    by_severity: Record<number, number>;
    by_division: Record<string, number>;
    total_financial_impact: number;
    avg_resolution_time_days: number | null;
  } | null;
  error: Error | null;
}> {
  try {
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('*');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!incidents || incidents.length === 0) {
      return {
        data: {
          total: 0,
          by_status: {},
          by_severity: {},
          by_division: {},
          total_financial_impact: 0,
          avg_resolution_time_days: null,
        },
        error: null,
      };
    }

    // Calculate statistics
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<number, number> = {};
    const byDivision: Record<string, number> = {};
    let totalFinancialImpact = 0;
    let resolutionTimes: number[] = [];

    incidents.forEach((inc) => {
      // By status
      byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;

      // By severity
      bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;

      // By division
      if (inc.division) {
        byDivision[inc.division] = (byDivision[inc.division] || 0) + 1;
      }

      // Financial impact
      if (inc.financial_impact) {
        totalFinancialImpact += inc.financial_impact;
      }

      // Resolution time
      if (inc.status === 'Resolved' || inc.status === 'Closed') {
        const created = new Date(inc.created_at);
        const updated = new Date(inc.updated_at);
        const daysDiff = Math.floor(
          (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );
        resolutionTimes.push(daysDiff);
      }
    });

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : null;

    return {
      data: {
        total: incidents.length,
        by_status: byStatus,
        by_severity: bySeverity,
        by_division: byDivision,
        total_financial_impact: totalFinancialImpact,
        avg_resolution_time_days: avgResolutionTime,
      },
      error: null,
    };
  } catch (err) {
    console.error('Unexpected get incident statistics error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
