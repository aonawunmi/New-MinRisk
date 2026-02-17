/**
 * Authentication TypeScript Types
 *
 * Clean types for the new auth system.
 * Based on lib/profiles.ts but defined here for app use.
 */

export type UserRole =
  | 'primary_admin'
  | 'secondary_admin'
  | 'super_admin'
  | 'user'
  | 'viewer'
  | 'ORG_EDITOR'
  | 'ORG_VIEWER'
  | 'GUEST';

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface UserProfile {
  id: string;
  clerk_id: string | null;
  email: string | null;
  organization_id: string | null;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface RiskAssessment {
  id: string;
  organization_id: string;
  risk_id: string;
  assessor_profile_id: string;
  assessment_date: string;
  likelihood: number;
  impact: number;
  notes: string | null;
  created_at: string;
}

export interface HeatmapConfig {
  organization_id: string;
  likelihood_scale: number;
  impact_scale: number;
  scoring_scheme: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  organizationId: string;
}
