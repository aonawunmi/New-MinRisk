/**
 * Control Types
 *
 * TypeScript types for risk controls with DIME framework.
 * Based on database schema from phase4-migration-ultra-safe.sql
 */

/**
 * Control type classification
 */
export type ControlType = 'preventive' | 'detective' | 'corrective';

/**
 * Control target - which risk dimension the control reduces
 */
export type ControlTarget = 'Likelihood' | 'Impact';

/**
 * DIME score values (0-3 scale)
 * 0 = Not implemented/Non-existent
 * 1 = Weak/Poor
 * 2 = Adequate/Good
 * 3 = Strong/Excellent
 */
export type DIMEScore = 0 | 1 | 2 | 3;

/**
 * DIME Framework scores for a control
 */
export interface DIMEScores {
  design_score: DIMEScore;
  implementation_score: DIMEScore;
  monitoring_score: DIMEScore;
  evaluation_score: DIMEScore;
}

/**
 * Control entity - represents a risk control measure
 */
export interface Control {
  id: string;
  organization_id: string;
  risk_id: string;
  control_code: string; // Auto-generated: CTRL-001, CTRL-002, etc.
  owner_profile_id: string | null;
  name: string;
  description: string | null;
  control_type: ControlType | null;
  target: ControlTarget;
  design_score: DIMEScore | null;
  implementation_score: DIMEScore | null;
  monitoring_score: DIMEScore | null;
  evaluation_score: DIMEScore | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Control with calculated effectiveness
 */
export interface ControlWithEffectiveness extends Control {
  effectiveness: number; // Average DIME score (0-3)
}

/**
 * Data for creating a new control
 */
export interface CreateControlData {
  control_code?: string; // Optional - will be auto-generated if not provided
  risk_id: string;
  name: string;
  description?: string;
  control_type?: ControlType;
  target: ControlTarget;
  design_score?: DIMEScore;
  implementation_score?: DIMEScore;
  monitoring_score?: DIMEScore;
  evaluation_score?: DIMEScore;
  owner_profile_id?: string;
}

/**
 * Data for updating an existing control
 */
export interface UpdateControlData {
  name?: string;
  description?: string;
  control_type?: ControlType;
  target?: ControlTarget;
  design_score?: DIMEScore;
  implementation_score?: DIMEScore;
  monitoring_score?: DIMEScore;
  evaluation_score?: DIMEScore;
  owner_profile_id?: string;
}

/**
 * Residual risk calculation result
 */
export interface ResidualRisk {
  residual_likelihood: number;
  residual_impact: number;
  residual_score: number;
}

/**
 * Control effectiveness summary for a risk
 */
export interface ControlSummary {
  total_controls: number;
  controls_targeting_likelihood: number;
  controls_targeting_impact: number;
  average_effectiveness: number;
  residual_risk: ResidualRisk;
}
