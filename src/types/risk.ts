/**
 * Risk Management TypeScript Types
 */

export interface Risk {
  id: string;
  organization_id: string;
  user_id: string;
  owner_profile_id: string | null;
  risk_code: string;
  risk_title: string;
  risk_description: string;
  division: string;
  department: string;
  category: string;
  owner: string; // Legacy TEXT field - kept for backward compatibility
  owner_id?: string | null; // New field - UUID reference to auth.users
  owner_email?: string; // Computed field from join with auth.users
  likelihood_inherent: number;
  impact_inherent: number;
  residual_likelihood?: number;
  residual_impact?: number;
  residual_score?: number;
  last_residual_calc?: string;
  status: string;
  period: string | null;
  is_priority: boolean;
  // New model fields - linking to global libraries
  root_cause_id?: string | null;
  impact_id?: string | null;
  event_text?: string | null;
  refined_risk_statement?: string | null;
  created_at: string;
  updated_at: string;
  created_period_year?: number | null;
  created_period_quarter?: number | null;
}

export interface Control {
  id: string;
  organization_id: string;
  risk_id: string;
  owner_profile_id: string | null;
  name: string;
  description: string | null;
  control_type: string | null;
  design_score: number | null;
  implementation_score: number | null;
  monitoring_score: number | null;
  evaluation_score: number | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RiskWithControls extends Risk {
  controls: Control[];
}
export type RiskCategory = string;
export type RiskStatus = string;
