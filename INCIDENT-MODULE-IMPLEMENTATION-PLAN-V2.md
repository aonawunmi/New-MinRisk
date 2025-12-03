# MinRisk Incident Module - Implementation Plan V2
**Revised Based on Risk Assessment Feedback**
**Date:** 2025-12-03
**Status:** Approved for Implementation

---

## Phase 1: Database Schema Redesign (60 min)

### 1.1 Data Migration Preparation

**Current State Assessment:**
```sql
-- Check existing incident data
SELECT
  COUNT(*) as total_incidents,
  COUNT(DISTINCT severity) as severity_values,
  ARRAY_AGG(DISTINCT severity) as unique_severities
FROM incidents;

-- Check existing status values
SELECT DISTINCT status FROM incidents;
```

**Severity Migration (INTEGER → TEXT):**
```sql
-- Step 1: Add temporary column
ALTER TABLE incidents ADD COLUMN severity_text TEXT;

-- Step 2: Migrate data with explicit mapping
UPDATE incidents SET severity_text = CASE
  WHEN severity = 1 THEN 'LOW'
  WHEN severity = 2 THEN 'LOW'
  WHEN severity = 3 THEN 'MEDIUM'
  WHEN severity = 4 THEN 'HIGH'
  WHEN severity = 5 THEN 'CRITICAL'
  ELSE 'MEDIUM' -- default for any unexpected values
END;

-- Step 3: Drop old column
ALTER TABLE incidents DROP COLUMN severity;

-- Step 4: Rename new column
ALTER TABLE incidents RENAME COLUMN severity_text TO severity;

-- Step 5: Add constraint
ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check
  CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

-- Step 6: Make NOT NULL
ALTER TABLE incidents ALTER COLUMN severity SET NOT NULL;
```

**Status Migration:**
```sql
-- Step 1: Update existing values to new model
UPDATE incidents SET status = CASE
  WHEN LOWER(status) IN ('reported', 'open') THEN 'OPEN'
  WHEN LOWER(status) LIKE '%invest%' THEN 'UNDER_REVIEW'
  WHEN LOWER(status) LIKE '%resolv%' THEN 'RESOLVED'
  WHEN LOWER(status) LIKE '%clos%' THEN 'CLOSED'
  ELSE 'OPEN'
END WHERE status NOT IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED');

-- Step 2: Update constraint
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED'));
```

### 1.2 Schema Modifications

**Rename Column with Code Impact Tracking:**
```sql
-- Step 1: Rename column
ALTER TABLE incidents RENAME COLUMN incident_date TO occurred_at;

-- Step 2: Update incident_summary view (if exists)
DROP VIEW IF EXISTS incident_summary CASCADE;
-- Will recreate after all changes

-- Step 3: Document code locations to update:
-- - src/lib/incidents.ts
-- - src/components/incidents/IncidentManagement.tsx
-- - Any API endpoints using incident_date
```

**Add New Columns:**
```sql
ALTER TABLE incidents
  -- Timestamp fields
  ADD COLUMN reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Visibility control
  ADD COLUMN visibility_scope TEXT DEFAULT 'REPORTER_ONLY'
    CHECK (visibility_scope IN ('REPORTER_ONLY', 'DEPARTMENT', 'INSTITUTION')),

  -- Attachments with defined JSON schema
  -- Schema: [{ path: string, filename: string, mime_type: string, size_bytes: number, uploaded_at: timestamp }]
  ADD COLUMN attachment_references JSONB DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(attachment_references) = 'array'),

  -- Immutability tracking
  ADD COLUMN original_description TEXT,
  ADD COLUMN is_description_amended BOOLEAN DEFAULT FALSE;

-- Backfill original_description for existing records
UPDATE incidents SET original_description = description WHERE original_description IS NULL;

-- Add comment for JSON schema documentation
COMMENT ON COLUMN incidents.attachment_references IS
  'JSON array schema: [{ path: string, filename: string, mime_type: string, size_bytes: number, uploaded_at: ISO timestamp }]';

-- Consider indexing visibility_scope if needed for future queries
-- CREATE INDEX idx_incidents_visibility_scope ON incidents(visibility_scope);
```

### 1.3 Create Amendments Table (Instead of JSONB Log)

**Rationale:** Separate table is more queryable, normalized, and audit-friendly than JSONB array.

```sql
CREATE TABLE incident_amendments (
  id BIGSERIAL PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  amended_by UUID NOT NULL REFERENCES auth.users(id),
  field_name TEXT NOT NULL, -- 'description', 'severity', 'status', etc.
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_amendments_incident ON incident_amendments(incident_id);
CREATE INDEX idx_amendments_org ON incident_amendments(organization_id);
CREATE INDEX idx_amendments_created ON incident_amendments(created_at DESC);

COMMENT ON TABLE incident_amendments IS
  'Append-only audit log of all changes to incident fields after initial submission.';
```

### 1.4 Create Mapping History Table

```sql
CREATE TABLE incident_risk_mapping_history (
  id BIGSERIAL PRIMARY KEY, -- Using BIGSERIAL for high-volume logging
  organization_id UUID NOT NULL REFERENCES organizations(id),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  modified_by UUID NOT NULL REFERENCES auth.users(id),
  old_risk_id UUID REFERENCES risks(id),
  new_risk_id UUID REFERENCES risks(id),
  mapping_source TEXT NOT NULL CHECK (mapping_source IN (
    'USER_MANUAL',
    'ADMIN_MANUAL',
    'AI_SUGGESTION_ACCEPTED',
    'USER_REJECTED_AI',
    'SYSTEM_RULE'
  )),
  reason TEXT,
  confidence_score NUMERIC(5,2), -- For AI suggestions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mapping_history_incident ON incident_risk_mapping_history(incident_id);
CREATE INDEX idx_mapping_history_org ON incident_risk_mapping_history(organization_id);
CREATE INDEX idx_mapping_history_created ON incident_risk_mapping_history(created_at DESC);
CREATE INDEX idx_mapping_history_source ON incident_risk_mapping_history(mapping_source);

COMMENT ON TABLE incident_risk_mapping_history IS
  'Complete provenance log of incident-to-risk mapping decisions. Used for audit and AI model improvement.';
```

### 1.5 Create Comments Table (with Organization Context)

```sql
CREATE TABLE incident_comments (
  id BIGSERIAL PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL, -- Explicit org context for RLS
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- True = admin-only visibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key to organizations
  CONSTRAINT fk_comments_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_comments_incident ON incident_comments(incident_id);
CREATE INDEX idx_comments_user ON incident_comments(user_id);
CREATE INDEX idx_comments_org ON incident_comments(organization_id);
CREATE INDEX idx_comments_internal ON incident_comments(is_internal);

COMMENT ON COLUMN incident_comments.is_internal IS
  'If TRUE, only visible to ADMIN/RISK_MANAGER roles. Used for investigative, disciplinary, or regulatory-sensitive dialogue.';
```

### 1.6 Create State Transition Validation Function

**Rationale:** Database-level enforcement prevents illegal state transitions.

```sql
CREATE OR REPLACE FUNCTION validate_incident_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  v_is_admin := (v_user_role IN ('admin', 'super_admin'));

  -- Users cannot change status (beyond initial OPEN)
  IF NOT v_is_admin AND OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'Only administrators can change incident status';
  END IF;

  -- Validate allowed transitions (even for admins)
  IF OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
    -- OPEN → UNDER_REVIEW, RESOLVED, REJECTED
    IF OLD.status = 'OPEN' AND NEW.status NOT IN ('UNDER_REVIEW', 'RESOLVED', 'REJECTED') THEN
      RAISE EXCEPTION 'Invalid status transition from OPEN to %', NEW.status;
    END IF;

    -- UNDER_REVIEW → RESOLVED, REJECTED
    IF OLD.status = 'UNDER_REVIEW' AND NEW.status NOT IN ('RESOLVED', 'REJECTED') THEN
      RAISE EXCEPTION 'Invalid status transition from UNDER_REVIEW to %', NEW.status;
    END IF;

    -- RESOLVED → CLOSED
    IF OLD.status = 'RESOLVED' AND NEW.status != 'CLOSED' THEN
      RAISE EXCEPTION 'Invalid status transition from RESOLVED to %', NEW.status;
    END IF;

    -- CLOSED and REJECTED are terminal states
    IF OLD.status IN ('CLOSED', 'REJECTED') THEN
      RAISE EXCEPTION 'Cannot change status from terminal state %', OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_incident_status
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION validate_incident_status_transition();

COMMENT ON FUNCTION validate_incident_status_transition() IS
  'Enforces incident status state machine: prevents illegal transitions and restricts status changes to admins only.';
```

### 1.7 Centralized Role/Org Lookup Function

**Rationale:** Avoid repeating subquery logic in every RLS policy.

```sql
CREATE OR REPLACE FUNCTION get_current_user_context()
RETURNS TABLE (
  user_id UUID,
  organization_id UUID,
  role TEXT,
  is_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.organization_id,
    up.role,
    (up.role IN ('admin', 'super_admin')) as is_admin
  FROM user_profiles up
  WHERE up.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_current_user_context() IS
  'Single source of truth for current user org and role. Used by all RLS policies.';
```

---

## Phase 2: Row Level Security (RLS) Policies (45 min)

### 2.1 Enable RLS on All Tables

```sql
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_risk_mapping_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_risk_links ENABLE ROW LEVEL SECURITY;
```

### 2.2 Incidents Table Policies

```sql
-- DROP existing policies if any
DROP POLICY IF EXISTS "Users see own incidents" ON incidents;
DROP POLICY IF EXISTS "Admins see all org incidents" ON incidents;

-- SELECT: Users see only their own incidents
CREATE POLICY "incidents_select_user"
  ON incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND incidents.reported_by = ctx.user_id
    )
  );

-- SELECT: Admins see all org incidents
CREATE POLICY "incidents_select_admin"
  ON incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: Users can create incidents in their org
CREATE POLICY "incidents_insert_user"
  ON incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND incidents.reported_by = ctx.user_id
    )
  );

-- UPDATE: Users can only update their own open incidents (limited fields)
CREATE POLICY "incidents_update_user"
  ON incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND incidents.reported_by = ctx.user_id
        AND incidents.status = 'OPEN'
    )
  );

-- UPDATE: Admins can update any org incident
CREATE POLICY "incidents_update_admin"
  ON incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- DELETE: Only admins can delete (soft delete preferred in production)
CREATE POLICY "incidents_delete_admin"
  ON incidents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );
```

### 2.3 Comments Table Policies

```sql
-- SELECT: Users see public comments on incidents they can access
CREATE POLICY "comments_select_public"
  ON incident_comments FOR SELECT
  USING (
    is_internal = FALSE
    AND incident_id IN (
      SELECT id FROM incidents -- Inherits incident access rules
    )
  );

-- SELECT: Admins see all comments (public + internal) in their org
CREATE POLICY "comments_select_admin"
  ON incident_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: Users can add public comments to incidents they can see
CREATE POLICY "comments_insert_user"
  ON incident_comments FOR INSERT
  WITH CHECK (
    is_internal = FALSE
    AND incident_id IN (SELECT id FROM incidents)
    AND EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.organization_id = ctx.organization_id
        AND incident_comments.user_id = ctx.user_id
    )
  );

-- INSERT: Admins can add internal comments
CREATE POLICY "comments_insert_admin"
  ON incident_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- UPDATE: Users can only edit their own public comments (within time window?)
CREATE POLICY "comments_update_user"
  ON incident_comments FOR UPDATE
  USING (
    is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.user_id = ctx.user_id
    )
  );
```

### 2.4 Mapping History Policies (Admin-Only Visibility)

```sql
-- SELECT: Only admins can view mapping history
CREATE POLICY "mapping_history_select_admin"
  ON incident_risk_mapping_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_risk_mapping_history.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: System creates mapping history entries
-- (No user-facing INSERT policy - controlled by backend functions)
CREATE POLICY "mapping_history_insert_system"
  ON incident_risk_mapping_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_risk_mapping_history.organization_id = ctx.organization_id
    )
  );
```

### 2.5 Amendments Table Policies (Admin-Only)

```sql
-- SELECT: Only admins see amendment history
CREATE POLICY "amendments_select_admin"
  ON incident_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_amendments.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: System-controlled only
CREATE POLICY "amendments_insert_system"
  ON incident_amendments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_amendments.organization_id = ctx.organization_id
    )
  );
```

---

## Phase 3: Backend Functions (90 min)

### 3.1 Centralized Service Architecture

**File Structure:**
```
src/lib/incidents/
├── index.ts              # Main exports
├── incidentService.ts    # Core CRUD with access control
├── mappingService.ts     # Risk mapping with history tracking
├── commentService.ts     # Comment management
├── attachmentService.ts  # File upload/download
├── escalationService.ts  # Alert rules
└── types.ts             # TypeScript interfaces
```

### 3.2 Type Definitions (`types.ts`)

```typescript
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
export type VisibilityScope = 'REPORTER_ONLY' | 'DEPARTMENT' | 'INSTITUTION';
export type MappingSource = 'USER_MANUAL' | 'ADMIN_MANUAL' | 'AI_SUGGESTION_ACCEPTED' | 'USER_REJECTED_AI' | 'SYSTEM_RULE';

export interface Incident {
  id: string;
  organization_id: string;
  incident_code: string;
  title: string;
  description: string;
  original_description: string;
  is_description_amended: boolean;
  incident_type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred_at: string;
  reported_at: string;
  reported_by: string;
  reporter_email?: string;
  division?: string;
  department?: string;
  financial_impact?: number;
  root_cause?: string;
  corrective_actions?: string;
  visibility_scope: VisibilityScope;
  attachment_references: AttachmentReference[];
  ai_suggested_risks?: AISuggestion[];
  ai_control_recommendations?: any;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface AttachmentReference {
  path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface AISuggestion {
  risk_id: string;
  risk_code: string;
  risk_title: string;
  confidence: number;
  reasoning: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface MappingHistoryEntry {
  id: number;
  incident_id: string;
  modified_by: string;
  old_risk_id?: string;
  new_risk_id?: string;
  mapping_source: MappingSource;
  reason?: string;
  confidence_score?: number;
  created_at: string;
}

export interface IncidentComment {
  id: number;
  incident_id: string;
  user_id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}
```

### 3.3 Core Service (`incidentService.ts`)

**Key Principles:**
- Never trust frontend filtering - always enforce org/role checks
- Use RLS but add explicit checks for clarity
- Log all state changes
- AI failures never block submission

```typescript
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentUserProfile, isUserAdmin } from '@/lib/profiles';
import type { Incident, IncidentSeverity } from './types';

// Get incidents with backend filtering enforcement
export async function getIncidents(): Promise<{ data: Incident[] | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data: profile, error: profileError } = await getCurrentUserProfile();
    if (profileError || !profile) {
      return { data: null, error: profileError || new Error('No profile found') };
    }

    const isAdmin = await isUserAdmin();

    // Backend enforces: Users see only own, Admins see all org
    let query = supabase
      .from('incidents')
      .select('*')
      .eq('organization_id', profile.organization_id);

    // Additional filter for non-admins (defense in depth)
    if (!isAdmin) {
      query = query.eq('reported_by', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    return { data: data as Incident[] | null, error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// Create incident with AI trigger (non-blocking)
export async function createIncident(
  incidentData: {
    title: string;
    description: string;
    incident_type: string;
    severity: IncidentSeverity;
    occurred_at: string;
    division?: string;
    department?: string;
    financial_impact?: number;
  }
): Promise<{ data: Incident | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data: profile } = await getCurrentUserProfile();
    if (!profile) {
      return { data: null, error: new Error('No profile found') };
    }

    // Generate incident code
    const { data: codeData, error: codeError } = await supabase.rpc(
      'generate_incident_number',
      { p_org_id: profile.organization_id }
    );
    if (codeError) {
      return { data: null, error: codeError };
    }

    const incident_code = codeData as string;

    // Create incident with immutable original_description
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        organization_id: profile.organization_id,
        reported_by: user.id,
        reporter_email: user.email,
        incident_code,
        title: incidentData.title,
        description: incidentData.description,
        original_description: incidentData.description, // Immutable
        incident_type: incidentData.incident_type,
        severity: incidentData.severity,
        occurred_at: incidentData.occurred_at,
        reported_at: new Date().toISOString(),
        division: incidentData.division,
        department: incidentData.department,
        financial_impact: incidentData.financial_impact,
        status: 'OPEN',
        visibility_scope: 'REPORTER_ONLY',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Trigger AI analysis asynchronously (non-blocking)
    triggerAIAnalysis(data.id, profile.organization_id).catch(err => {
      console.error('AI analysis failed (non-blocking):', err);
      // Log to monitoring system but don't fail incident creation
    });

    return { data: data as Incident, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// AI trigger (async, failure-tolerant)
async function triggerAIAnalysis(incidentId: string, orgId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('analyze-incident', {
      body: { incident_id: incidentId, organization_id: orgId }
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    // Log but never throw - AI is assistive only
    console.error('AI analysis error:', error);
    // TODO: Send to monitoring/logging service
  }
}

// Update incident with amendment tracking
export async function updateIncident(
  incidentId: string,
  updates: Partial<Incident>,
  reason?: string
): Promise<{ data: Incident | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const isAdmin = await isUserAdmin();

    // Get current incident
    const { data: current, error: fetchError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (fetchError || !current) {
      return { data: null, error: fetchError || new Error('Incident not found') };
    }

    // Track amendments
    const amendments: Array<{ field: string; old_value: string; new_value: string }> = [];

    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = current[field];
      if (oldValue !== newValue && field !== 'updated_at') {
        amendments.push({
          field,
          old_value: String(oldValue),
          new_value: String(newValue)
        });
      }
    }

    // Apply updates
    const { data, error } = await supabase
      .from('incidents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        ...(updates.description && updates.description !== current.description
          ? { is_description_amended: true }
          : {}
        )
      })
      .eq('id', incidentId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Log amendments
    if (amendments.length > 0) {
      await supabase.from('incident_amendments').insert(
        amendments.map(amendment => ({
          incident_id: incidentId,
          organization_id: current.organization_id,
          amended_by: user.id,
          field_name: amendment.field,
          old_value: amendment.old_value,
          new_value: amendment.new_value,
          reason: reason || null
        }))
      );
    }

    return { data: data as Incident, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// Additional functions: getIncidentById, deleteIncident, etc.
```

### 3.4 Mapping Service (`mappingService.ts`)

```typescript
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { isUserAdmin } from '@/lib/profiles';
import type { MappingSource } from './types';

export async function linkIncidentToRisk(
  incidentId: string,
  riskId: string,
  source: MappingSource,
  reason?: string,
  confidenceScore?: number
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: new Error('Not authenticated') };
    }

    // Get incident and risk to verify org consistency
    const { data: incident } = await supabase
      .from('incidents')
      .select('organization_id')
      .eq('id', incidentId)
      .single();

    const { data: risk } = await supabase
      .from('risks')
      .select('organization_id')
      .eq('id', riskId)
      .single();

    if (!incident || !risk) {
      return { success: false, error: new Error('Incident or risk not found') };
    }

    if (incident.organization_id !== risk.organization_id) {
      return { success: false, error: new Error('Organization mismatch: cannot link incident to risk from different institution') };
    }

    // Get current mapping (if any)
    const { data: currentLink } = await supabase
      .from('incident_risk_links')
      .select('risk_id')
      .eq('incident_id', incidentId)
      .maybeSingle();

    const oldRiskId = currentLink?.risk_id || null;

    // Create or update link
    const { error: linkError } = await supabase
      .from('incident_risk_links')
      .upsert({
        incident_id: incidentId,
        risk_id: riskId,
        linked_by: user.id,
        linked_at: new Date().toISOString()
      });

    if (linkError) {
      return { success: false, error: linkError };
    }

    // Log mapping history
    const { error: historyError } = await supabase
      .from('incident_risk_mapping_history')
      .insert({
        organization_id: incident.organization_id,
        incident_id: incidentId,
        modified_by: user.id,
        old_risk_id: oldRiskId,
        new_risk_id: riskId,
        mapping_source: source,
        reason: reason || null,
        confidence_score: confidenceScore || null
      });

    if (historyError) {
      console.error('Failed to log mapping history:', historyError);
      // Don't fail the operation, but log the issue
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export async function acceptAISuggestion(
  incidentId: string,
  riskId: string,
  confidence: number
): Promise<{ success: boolean; error: Error | null }> {
  return linkIncidentToRisk(
    incidentId,
    riskId,
    'AI_SUGGESTION_ACCEPTED',
    'User accepted AI suggestion',
    confidence
  );
}

export async function rejectAISuggestion(
  incidentId: string,
  riskId: string,
  reason?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: new Error('Not authenticated') };
    }

    const { data: incident } = await supabase
      .from('incidents')
      .select('organization_id')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return { success: false, error: new Error('Incident not found') };
    }

    // Log rejection in mapping history
    const { error } = await supabase
      .from('incident_risk_mapping_history')
      .insert({
        organization_id: incident.organization_id,
        incident_id: incidentId,
        modified_by: user.id,
        old_risk_id: riskId,
        new_risk_id: null,
        mapping_source: 'USER_REJECTED_AI',
        reason: reason || 'User rejected AI suggestion'
      });

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export async function getMappingHistory(incidentId: string) {
  // Admin-only access enforced by RLS
  const { data, error } = await supabase
    .from('incident_risk_mapping_history')
    .select(`
      *,
      modified_by_profile:user_profiles!modified_by(full_name, email),
      old_risk:risks!old_risk_id(risk_code, risk_title),
      new_risk:risks!new_risk_id(risk_code, risk_title)
    `)
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  return { data, error };
}
```

---

## Phase 4: Attachments with Supabase Storage (60 min)

### 4.1 Storage Bucket Configuration

**Bucket Structure:**
```
incident-attachments/
├── {org_id}/
│   ├── {incident_id}/
│   │   ├── {timestamp}_{filename}
│   │   └── ...
```

**Setup Script:**
```typescript
// Run once via Supabase dashboard or CLI
async function setupIncidentAttachmentsBucket() {
  const { data, error } = await supabase.storage.createBucket('incident-attachments', {
    public: false, // Private bucket
    fileSizeLimit: 20971520, // 20MB
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'text/csv',
      'text/plain',
      'text/x-log'
    ]
  });

  // Set RLS policies for bucket access
  // (Done via Supabase Dashboard > Storage > Policies)
}
```

**Storage RLS Policies:**
```sql
-- Users can upload to their org's incidents
CREATE POLICY "Users upload to own incidents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'incident-attachments'
    AND auth.uid() IN (
      SELECT reported_by FROM incidents
      WHERE id = (storage.foldername(name))[2]::uuid
        AND organization_id = (storage.foldername(name))[1]::uuid
    )
  );

-- Users can read attachments of incidents they can see
CREATE POLICY "Users read accessible incident attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'incident-attachments'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT id FROM incidents
    )
  );
```

### 4.2 Attachment Service (`attachmentService.ts`)

```typescript
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import type { AttachmentReference } from './types';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/csv',
  'text/plain',
  'text/x-log'
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES_PER_INCIDENT = 10;

export async function uploadAttachment(
  incidentId: string,
  organizationId: string,
  file: File
): Promise<{ data: AttachmentReference | null; error: Error | null }> {
  try {
    // Validate file type (server-side, don't trust client)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { data: null, error: new Error(`File type ${file.type} not allowed`) };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { data: null, error: new Error(`File size exceeds 20MB limit`) };
    }

    // Check existing attachment count
    const { data: incident } = await supabase
      .from('incidents')
      .select('attachment_references')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return { data: null, error: new Error('Incident not found') };
    }

    const existingCount = (incident.attachment_references as AttachmentReference[]).length;
    if (existingCount >= MAX_FILES_PER_INCIDENT) {
      return { data: null, error: new Error(`Maximum ${MAX_FILES_PER_INCIDENT} attachments per incident`) };
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${organizationId}/${incidentId}/${timestamp}_${sanitizedFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('incident-attachments')
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      return { data: null, error: uploadError };
    }

    // Create attachment reference
    const attachmentRef: AttachmentReference = {
      path,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_at: new Date().toISOString()
    };

    // Update incident with new attachment reference
    const newReferences = [...(incident.attachment_references as AttachmentReference[]), attachmentRef];
    const { error: updateError } = await supabase
      .from('incidents')
      .update({ attachment_references: newReferences })
      .eq('id', incidentId);

    if (updateError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('incident-attachments').remove([path]);
      return { data: null, error: updateError };
    }

    return { data: attachmentRef, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function getAttachmentSignedUrl(
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from('incident-attachments')
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { data: null, error };
    }

    return { data: data.signedUrl, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function deleteAttachment(
  incidentId: string,
  attachmentPath: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return { success: false, error: new Error('Only admins can delete attachments') };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('incident-attachments')
      .remove([attachmentPath]);

    if (storageError) {
      return { success: false, error: storageError };
    }

    // Remove reference from incident
    const { data: incident } = await supabase
      .from('incidents')
      .select('attachment_references')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return { success: false, error: new Error('Incident not found') };
    }

    const newReferences = (incident.attachment_references as AttachmentReference[])
      .filter(ref => ref.path !== attachmentPath);

    const { error: updateError } = await supabase
      .from('incidents')
      .update({ attachment_references: newReferences })
      .eq('id', incidentId);

    if (updateError) {
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

---

## Phase 5: Escalation Rules (45 min)

### 5.1 Unmapped Incident Escalation

**Database Function:**
```sql
CREATE OR REPLACE FUNCTION escalate_unmapped_incidents()
RETURNS TABLE (
  incident_id UUID,
  incident_code TEXT,
  title TEXT,
  days_unmapped INTEGER
) AS $$
BEGIN
  -- Find incidents that are:
  -- 1. Status OPEN
  -- 2. Not linked to any risk
  -- 3. Created more than 7 days ago
  RETURN QUERY
  SELECT
    i.id,
    i.incident_code,
    i.title,
    EXTRACT(DAY FROM NOW() - i.created_at)::INTEGER as days_unmapped
  FROM incidents i
  LEFT JOIN incident_risk_links irl ON i.id = irl.incident_id
  WHERE i.status = 'OPEN'
    AND irl.id IS NULL
    AND i.created_at < NOW() - INTERVAL '7 days'
  ORDER BY i.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Escalation Service:**
```typescript
export async function checkUnmappedIncidents(organizationId: string) {
  const { data, error } = await supabase.rpc('escalate_unmapped_incidents');

  if (error) {
    console.error('Unmapped incident check failed:', error);
    return { data: [], error };
  }

  // Filter by org (additional safety)
  const { data: orgIncidents } = await supabase
    .from('incidents')
    .select('id')
    .eq('organization_id', organizationId)
    .in('id', data.map(i => i.incident_id));

  const filtered = data.filter(incident =>
    orgIncidents?.some(oi => oi.id === incident.incident_id)
  );

  // TODO: Send notifications to admins
  // TODO: Auto-update status to UNDER_REVIEW

  return { data: filtered, error: null };
}
```

### 5.2 Incident Density Tracking

**Definition:** If 4+ incidents map to same risk within 30 days, flag risk for review (don't auto-adjust scores in v1).

```sql
CREATE OR REPLACE FUNCTION check_incident_density()
RETURNS TABLE (
  risk_id UUID,
  risk_code TEXT,
  risk_title TEXT,
  incident_count BIGINT,
  latest_incident_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.risk_code,
    r.risk_title,
    COUNT(DISTINCT irl.incident_id) as incident_count,
    MAX(i.occurred_at) as latest_incident_date
  FROM risks r
  INNER JOIN incident_risk_links irl ON r.id = irl.risk_id
  INNER JOIN incidents i ON irl.incident_id = i.id
  WHERE i.occurred_at > NOW() - INTERVAL '30 days'
  GROUP BY r.id, r.risk_code, r.risk_title
  HAVING COUNT(DISTINCT irl.incident_id) >= 4
  ORDER BY incident_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 6: UI Components (120 min)

### 6.1 USER Interface (`UserIncidentView.tsx`)

**Features:**
- Submit new incident form
- View own incidents
- Accept/reject AI suggestions
- Add public comments
- Upload attachments

**Access Control:**
- Backend enforces "own incidents only"
- UI hides admin functions
- Status changes disabled

### 6.2 ADMIN Interface (`AdminIncidentManagement.tsx`)

**Features:**
- View all org incidents with filters
- Change incident status (with transition validation)
- Override severity
- Map/remap incidents to risks
- View mapping history
- Add internal comments
- View all attachments
- Unmapped incident alerts
- Density alerts

**Access Control:**
- isAdmin() check in component
- Backend RLS enforces org isolation
- Full CRUD permissions

---

## Phase 7: Testing & Validation (90 min)

### 7.1 Security Testing Checklist

**RLS Tests:**
```sql
-- Test 1: User from Org A cannot see Org B incidents
SET LOCAL "request.jwt.claims" TO '{"sub": "user-org-a-id"}';
SELECT COUNT(*) FROM incidents WHERE organization_id = 'org-b-id';
-- Expected: 0 rows

-- Test 2: User cannot change status
BEGIN;
SET LOCAL "request.jwt.claims" TO '{"sub": "regular-user-id"}';
UPDATE incidents SET status = 'CLOSED' WHERE id = 'test-incident-id';
-- Expected: ERROR or no rows affected
ROLLBACK;

-- Test 3: Admin can see all org incidents
SET LOCAL "request.jwt.claims" TO '{"sub": "admin-user-id"}';
SELECT COUNT(*) FROM incidents WHERE organization_id = 'admin-org-id';
-- Expected: All org incidents visible
```

**State Transition Tests:**
```typescript
// Test illegal transition
await updateIncident(incidentId, { status: 'OPEN' }); // Currently CLOSED
// Expected: Error "Cannot change status from terminal state"

// Test admin-only transition
// As regular user:
await updateIncident(incidentId, { status: 'RESOLVED' });
// Expected: Error "Only administrators can change incident status"
```

**Cross-Org Mapping Test:**
```typescript
// Try to link incident from Org A to risk from Org B
await linkIncidentToRisk(orgAIncidentId, orgBRiskId, 'USER_MANUAL');
// Expected: Error "Organization mismatch"
```

**Attachment Abuse Tests:**
```typescript
// Test file type restriction
await uploadAttachment(incidentId, orgId, new File(['test'], 'malware.exe'));
// Expected: Error "File type not allowed"

// Test size limit
const largeFile = new File([new Array(21 * 1024 * 1024)], 'large.pdf');
await uploadAttachment(incidentId, orgId, largeFile);
// Expected: Error "File size exceeds 20MB limit"

// Test max files
for (let i = 0; i < 11; i++) {
  await uploadAttachment(incidentId, orgId, testFile);
}
// Expected: Error after 10th file
```

**AI Failure Test:**
```typescript
// Simulate AI timeout
// Incident should still be created successfully
const result = await createIncident({ /* valid data */ });
// Expected: Incident created, AI error logged but non-blocking
```

### 7.2 Performance Testing

**List Performance (10,000+ incidents):**
- Add pagination (limit 50 per page)
- Test query time with full org dataset
- Add indexes if needed

### 7.3 Audit Trail Verification

**Verify Complete Provenance:**
```sql
-- For a given incident, show complete history
SELECT
  'Incident Created' as event_type,
  created_at as timestamp,
  reported_by as actor
FROM incidents WHERE id = 'test-incident-id'

UNION ALL

SELECT
  'Amendment: ' || field_name,
  created_at,
  amended_by
FROM incident_amendments WHERE incident_id = 'test-incident-id'

UNION ALL

SELECT
  'Mapping: ' || mapping_source,
  created_at,
  modified_by
FROM incident_risk_mapping_history WHERE incident_id = 'test-incident-id'

UNION ALL

SELECT
  'Comment: ' || CASE WHEN is_internal THEN 'Internal' ELSE 'Public' END,
  created_at,
  user_id
FROM incident_comments WHERE incident_id = 'test-incident-id'

ORDER BY timestamp;
```

---

## Implementation Checklist

### Phase 1: Database ✅
- [ ] Data migration for severity (INT → TEXT)
- [ ] Status value migration
- [ ] Rename incident_date → occurred_at
- [ ] Add new columns
- [ ] Create incident_amendments table
- [ ] Create incident_risk_mapping_history table
- [ ] Create incident_comments table
- [ ] Create state transition trigger
- [ ] Create get_current_user_context() function

### Phase 2: RLS ✅
- [ ] Enable RLS on all tables
- [ ] Incidents SELECT policies (user + admin)
- [ ] Incidents INSERT policy
- [ ] Incidents UPDATE policies (user + admin)
- [ ] Incidents DELETE policy
- [ ] Comments SELECT policies (public + admin)
- [ ] Comments INSERT policies
- [ ] Mapping history policies (admin-only)
- [ ] Amendments policies (admin-only)

### Phase 3: Backend ✅
- [ ] Type definitions
- [ ] Core incidentService with access control
- [ ] Mapping service with history tracking
- [ ] Comment service
- [ ] Attachment service with validation

### Phase 4: Attachments ✅
- [ ] Create Supabase Storage bucket
- [ ] Storage RLS policies
- [ ] Upload with validation
- [ ] Signed URLs
- [ ] Delete functionality

### Phase 5: Escalation ✅
- [ ] Unmapped incident detection
- [ ] Density tracking function
- [ ] Notification hooks (TODO)

### Phase 6: UI ✅
- [ ] USER interface component
- [ ] ADMIN interface component
- [ ] Access control checks
- [ ] AI suggestion UI

### Phase 7: Testing ✅
- [ ] RLS security tests
- [ ] State transition tests
- [ ] Cross-org isolation tests
- [ ] Attachment abuse tests
- [ ] AI failure tests
- [ ] Performance tests
- [ ] Audit trail verification

---

## Risk Mitigation Summary

| Risk | Mitigation |
|------|------------|
| Cross-institution data leakage | RLS + explicit org checks + testing |
| Illegal state transitions | DB trigger + application logic |
| Lost audit trail | Append-only tables + complete provenance |
| AI blocking submissions | Async + failure tolerance |
| Attachment malware | MIME type validation + size limits + server-side checks |
| Unauthorized status changes | RLS + role checks + trigger validation |
| Lost amendment history | Separate amendments table + immutable original_description |

---

**Total Estimated Implementation Time:** 8-10 hours

**Dependencies:**
- Supabase project configured
- Anthropic API key set for AI
- User roles (admin/user) established

**Next Step:** Await approval to begin Phase 1 implementation.
