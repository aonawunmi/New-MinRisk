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
  owner: string;
  likelihood_inherent: number;
  impact_inherent: number;
  residual_likelihood?: number;
  residual_impact?: number;
  residual_score?: number;
  last_residual_calc?: string;
  status: string;
  period: string | null;
  is_priority: boolean;
  created_at: string;
  updated_at: string;
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
