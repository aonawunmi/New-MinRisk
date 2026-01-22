/**
 * Incident Management Module - TypeScript Types
 * Matches database schema from PHASE-1-SCHEMA-MIGRATION.sql
 */

// ============================================================
// ENUMS
// ============================================================

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED';

export type VisibilityScope =
  | 'REPORTER_ONLY'
  | 'DEPARTMENT'
  | 'INSTITUTION';

export type MappingSource =
  | 'USER_MANUAL'
  | 'ADMIN_MANUAL'
  | 'AI_SUGGESTION_ACCEPTED'
  | 'USER_REJECTED_AI'
  | 'SYSTEM_RULE';

export type AlertStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'archived';

// ============================================================
// ATTACHMENT TYPES
// ============================================================

export interface AttachmentReference {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  storagePath: string;
  uploadedBy: string;
}

// ============================================================
// CORE INCIDENT TYPE
// ============================================================

export interface Incident {
  id: string;
  organization_id: string;
  incident_code: string;
  title: string;
  description: string;
  original_description: string | null;
  is_description_amended: boolean;
  incident_type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred_at: string; // ISO timestamp
  reported_at: string; // ISO timestamp
  reported_by: string; // UUID of user
  visibility_scope: VisibilityScope;
  attachment_references: AttachmentReference[];
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  linked_risk_codes: string[]; // Array of risk codes
}

// ============================================================
// INCIDENT SUMMARY (from actual incident_summary view)
// ============================================================

export interface IncidentSummary {
  id: string;
  org_id: string;
  incident_code: string;
  title: string;
  description: string;
  incident_type: string;
  severity: number; // 1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL
  status: string;
  incident_date: string; // DATE
  financial_impact: number | null;
  created_at: string;
  linked_risks_count: number;
  linked_risk_ids: string[];
  linked_risk_titles: string[];
}

// ============================================================
// INCIDENT COMMENTS
// ============================================================

export interface IncidentComment {
  id: number;
  incident_id: string;
  organization_id: string;
  user_id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  // Populated from joins
  user_name?: string;
  user_email?: string;
}

// ============================================================
// INCIDENT AMENDMENTS (Admin-only audit trail)
// ============================================================

export interface IncidentAmendment {
  id: number;
  incident_id: string;
  organization_id: string;
  amended_by: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
  // Populated from joins
  amended_by_name?: string;
}

// ============================================================
// INCIDENT RISK MAPPING HISTORY (Admin-only provenance)
// ============================================================

export interface IncidentRiskMappingHistory {
  id: number;
  organization_id: string;
  incident_id: string;
  modified_by: string;
  old_risk_id: string | null;
  new_risk_id: string | null;
  mapping_source: MappingSource;
  reason: string | null;
  confidence_score: number | null;
  created_at: string;
  // Populated from joins
  modified_by_name?: string;
  old_risk_code?: string;
  new_risk_code?: string;
}

// ============================================================
// RISK INTELLIGENCE TYPES
// ============================================================

export interface RiskIntelligenceAlert {
  id: string;
  organization_id: string;
  risk_id: string;
  event_id: string;
  alert_type: string;
  severity: IncidentSeverity;
  confidence_score: number;
  reasoning: string;
  suggested_controls: string[];
  impact_assessment: string;
  status: AlertStatus;
  applied_to_risk: boolean;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // Populated from joins
  risk_code?: string;
  risk_title?: string;
  event_title?: string;
}

// ============================================================
// FORM INPUT TYPES (for creating/editing incidents)
// ============================================================

export interface CreateIncidentInput {
  title: string;
  description: string;
  incident_type: string;
  severity: IncidentSeverity;
  occurred_at: string; // ISO date string
  visibility_scope?: VisibilityScope;
  linked_risk_codes?: string[];
  financial_impact?: number | null;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  incident_type?: string;
  severity?: IncidentSeverity;
  occurred_at?: string;
  financial_impact?: number | null;
  // Status changes require admin role (enforced by trigger)
}

export interface CreateCommentInput {
  incident_id: string;
  comment_text: string;
  is_internal?: boolean; // Defaults to false for users, can be true for admins
}

// ============================================================
// RESPONSE TYPES (for API operations)
// ============================================================

export interface IncidentWithDetails extends IncidentSummary {
  comments: IncidentComment[];
  amendments?: IncidentAmendment[]; // Only for admins
  mapping_history?: IncidentRiskMappingHistory[]; // Only for admins
}

// ============================================================
// FILTER/SEARCH TYPES
// ============================================================

export interface IncidentFilters {
  status?: IncidentStatus[];
  severity?: IncidentSeverity[];
  incident_type?: string[];
  search?: string; // Search in title/description
  date_from?: string;
  date_to?: string;
  reported_by?: string; // For admin filtering
}

// ============================================================
// CONSTANTS
// ============================================================

export const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'text-blue-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
  { value: 'HIGH', label: 'High', color: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
];

export const STATUS_OPTIONS: { value: IncidentStatus; label: string; color: string }[] = [
  { value: 'OPEN', label: 'Open', color: 'bg-blue-100 text-blue-800' },
  { value: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' },
];

export const VISIBILITY_OPTIONS: { value: VisibilityScope; label: string; description: string }[] = [
  {
    value: 'REPORTER_ONLY',
    label: 'Reporter Only',
    description: 'Only you and administrators can view this incident'
  },
  {
    value: 'DEPARTMENT',
    label: 'Department',
    description: 'All users in your department can view (coming soon)'
  },
  {
    value: 'INSTITUTION',
    label: 'Institution',
    description: 'All users in your organization can view (coming soon)'
  },
];

// Helper functions
export const getSeverityColor = (severity: IncidentSeverity): string => {
  return SEVERITY_OPTIONS.find(opt => opt.value === severity)?.color || 'text-gray-600';
};

export const getStatusBadgeClass = (status: IncidentStatus): string => {
  return STATUS_OPTIONS.find(opt => opt.value === status)?.color || 'bg-gray-100 text-gray-800';
};
