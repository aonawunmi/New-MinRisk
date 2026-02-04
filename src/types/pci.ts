/**
 * PCI Workflow TypeScript Types
 * Phase 1: Risk Response + Primary Control Instances + Secondary Controls
 */

// ============================================================================
// ENUMS
// ============================================================================

export type RiskResponseType =
  | 'avoid'
  | 'reduce_likelihood'
  | 'reduce_impact'
  | 'transfer_share'
  | 'accept';

export type PCIObjective = 'likelihood' | 'impact' | 'both';

export type SCDimension = 'D' | 'I' | 'M' | 'E';

export type SCCriticality = 'critical' | 'important' | 'optional';

export type SCStatus = 'yes' | 'partial' | 'no' | 'na';

export type PCIStatus = 'draft' | 'active' | 'retired' | 'not_applicable';

export type EvidenceRequestStatus =
  | 'open'
  | 'submitted'
  | 'rejected'
  | 'accepted'
  | 'cancelled'
  | 'closed';

export type ConfidenceLabel = 'low' | 'medium' | 'high';

// ============================================================================
// RISK RESPONSE
// ============================================================================

export interface RiskResponse {
  id: string;
  risk_id: string;
  response_type: RiskResponseType;
  response_rationale: string | null;
  ai_proposed_response: RiskResponseType | null;
  ai_response_rationale: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface CreateRiskResponseData {
  risk_id: string;
  response_type: RiskResponseType;
  response_rationale?: string;
  ai_proposed_response?: RiskResponseType;
  ai_response_rationale?: string;
}

export interface UpdateRiskResponseData {
  response_type?: RiskResponseType;
  response_rationale?: string;
}

// ============================================================================
// PCI TEMPLATES (Seed Library - Read Only)
// ============================================================================

export interface PCITemplate {
  id: string; // PCI-01 through PCI-16
  name: string;
  category: string;
  objective_default: PCIObjective;
  purpose: string;
  parameters_schema: PCIParametersSchema;
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PCIParametersSchema {
  required: string[];
  optional?: string[];
}

// ============================================================================
// SECONDARY CONTROL TEMPLATES (Seed Library - Read Only)
// ============================================================================

export interface SecondaryControlTemplate {
  id: string;
  pci_template_id: string;
  code: string; // D1, D2, I1, I2, I3, M1, M2, M3, E1, E2
  dimension: SCDimension;
  criticality: SCCriticality;
  prompt_text: string;
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PCI INSTANCES (The new "control" object)
// ============================================================================

export interface PCIInstance {
  id: string;
  organization_id: string;
  risk_id: string;
  pci_template_id: string;
  pci_template_version: string;
  objective: PCIObjective;
  statement: string | null;
  scope_boundary: string;
  method: string;
  target_threshold_standard: string | null;
  trigger_frequency: string;
  owner_role: string;
  owner_user_id: string | null;
  dependencies: string | null;
  status: PCIStatus;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  // Joined fields
  pci_template?: PCITemplate;
  secondary_control_instances?: SecondaryControlInstance[];
  derived_dime_score?: DerivedDIMEScore;
  confidence_score?: ConfidenceScore;
}

export interface CreatePCIInstanceData {
  risk_id: string;
  pci_template_id: string;
  objective?: PCIObjective;
  statement?: string;
  scope_boundary: string;
  method: string;
  target_threshold_standard?: string;
  trigger_frequency: string;
  owner_role: string;
  owner_user_id?: string;
  dependencies?: string;
}

export interface UpdatePCIInstanceData {
  objective?: PCIObjective;
  statement?: string;
  scope_boundary?: string;
  method?: string;
  target_threshold_standard?: string;
  trigger_frequency?: string;
  owner_role?: string;
  owner_user_id?: string;
  dependencies?: string;
  status?: PCIStatus;
}

// ============================================================================
// SECONDARY CONTROL INSTANCES (Attestations)
// ============================================================================

export interface SecondaryControlInstance {
  id: string;
  pci_instance_id: string;
  secondary_control_template_id: string;
  secondary_template_version: string;
  status: SCStatus | null;
  na_rationale: string | null;
  evidence_exists: boolean | null;
  notes: string | null;
  attested_by: string | null;
  attested_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  secondary_control_template?: SecondaryControlTemplate;
}

export interface UpdateSecondaryControlData {
  status?: SCStatus;
  na_rationale?: string;
  evidence_exists?: boolean;
  notes?: string;
}

// ============================================================================
// DERIVED DIME SCORES (System computed)
// ============================================================================

export interface DerivedDIMEScore {
  id: string;
  pci_instance_id: string;
  d_score: number;
  i_score: number;
  m_score: number;
  e_raw: number;
  e_final: number;
  cap_applied: boolean;
  cap_details: DIMECapDetails | null;
  computed_at: string;
  calc_trace: DIMECalcTrace | null;
}

export interface DIMECapDetails {
  caps_triggered: Array<{ dimension: SCDimension; code: string }>;
  d_capped: boolean;
  i_capped: boolean;
  m_capped: boolean;
  e_capped: boolean;
}

export interface DIMECalcTrace {
  secondary_controls: Array<{
    code: string;
    dimension: string;
    criticality: string;
    status: string;
    status_value?: number;
    weight?: number;
    contribution?: number;
    included: boolean;
    reason?: string;
  }>;
  dimension_totals: {
    D: { weighted_sum: number; weight_total: number; raw: number };
    I: { weighted_sum: number; weight_total: number; raw: number };
    M: { weighted_sum: number; weight_total: number; raw: number };
    E: { weighted_sum: number; weight_total: number; raw: number };
  };
  constrained_effectiveness: {
    e_raw: number;
    e_final: number;
    constrained_by: string;
  };
}

// ============================================================================
// CONFIDENCE SCORES (Per PCI)
// ============================================================================

export interface ConfidenceScore {
  id: string;
  pci_instance_id: string;
  confidence_score: number; // 0-100
  confidence_label: ConfidenceLabel;
  drivers: ConfidenceDriver[];
  computed_at: string;
}

export interface ConfidenceDriver {
  type: 'positive' | 'negative' | 'neutral';
  text: string;
  points: number;
}

// ============================================================================
// EVIDENCE REQUESTS
// ============================================================================

export interface EvidenceRequest {
  id: string;
  organization_id: string;
  risk_id: string | null;
  pci_instance_id: string | null;
  secondary_control_instance_id: string | null;
  requested_by: string;
  requested_at: string;
  due_date: string;
  status: EvidenceRequestStatus;
  notes: string | null;
  is_critical_scope: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEvidenceRequestData {
  risk_id?: string;
  pci_instance_id?: string;
  secondary_control_instance_id?: string;
  due_date: string;
  notes?: string;
  is_critical_scope?: boolean;
}

// ============================================================================
// EVIDENCE SUBMISSIONS
// ============================================================================

export interface EvidenceSubmission {
  id: string;
  evidence_request_id: string;
  submission_note: string;
  submitted_by: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision: 'accepted' | 'rejected' | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEvidenceSubmissionData {
  evidence_request_id: string;
  submission_note: string;
}

// ============================================================================
// G1 GATE RESULT
// ============================================================================

export interface G1GateResult {
  can_activate: boolean;
  validation_message: string;
  has_response: boolean;
  response_type: RiskResponseType | null;
  pci_count: number;
}

// ============================================================================
// RESPONSE → PCI MAPPING (for AI suggestions)
// ============================================================================

export const RESPONSE_PCI_PRIORITY: Record<RiskResponseType, string[]> = {
  reduce_likelihood: [
    'PCI-01', 'PCI-02', 'PCI-03', 'PCI-04', 'PCI-05', 'PCI-06',
    'PCI-07', 'PCI-09', 'PCI-10', 'PCI-11', 'PCI-12', 'PCI-16'
  ],
  reduce_impact: [
    'PCI-13', 'PCI-14', 'PCI-15', 'PCI-08', 'PCI-12'
  ],
  transfer_share: [
    'PCI-14', 'PCI-13'
  ],
  avoid: [
    'PCI-01', 'PCI-07', 'PCI-16', 'PCI-03'
  ],
  accept: [], // No PCIs recommended for accept
};

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

export const RESPONSE_TYPE_LABELS: Record<RiskResponseType, string> = {
  avoid: 'Avoid',
  reduce_likelihood: 'Reduce Likelihood',
  reduce_impact: 'Reduce Impact',
  transfer_share: 'Transfer / Share',
  accept: 'Accept',
};

export const RESPONSE_TYPE_DESCRIPTIONS: Record<RiskResponseType, string> = {
  avoid: 'Eliminate the risk by removing the activity or exposure entirely',
  reduce_likelihood: 'Implement controls to reduce the probability of occurrence',
  reduce_impact: 'Implement controls to reduce the severity if the risk materializes',
  transfer_share: 'Transfer or share the risk through insurance, contracts, or partnerships',
  accept: 'Accept the risk as-is without additional controls (within appetite)',
};

export const DIMENSION_LABELS: Record<SCDimension, string> = {
  D: 'Design',
  I: 'Implementation',
  M: 'Monitoring',
  E: 'Effectiveness',
};

export const CRITICALITY_LABELS: Record<SCCriticality, string> = {
  critical: 'Critical',
  important: 'Important',
  optional: 'Optional',
};

export const STATUS_LABELS: Record<SCStatus, string> = {
  yes: 'Yes',
  partial: 'Partial',
  no: 'No',
  na: 'N/A',
};

export const CONFIDENCE_COLORS: Record<ConfidenceLabel, string> = {
  low: 'text-red-600 bg-red-100',
  medium: 'text-amber-600 bg-amber-100',
  high: 'text-green-600 bg-green-100',
};

export const DIME_SCORE_COLORS = (score: number): string => {
  if (score >= 2.5) return 'text-green-600 bg-green-100';
  if (score >= 1.5) return 'text-amber-600 bg-amber-100';
  return 'text-red-600 bg-red-100';
};
