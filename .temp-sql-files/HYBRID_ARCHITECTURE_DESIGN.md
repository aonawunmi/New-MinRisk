# Hybrid Multi-Tenant Architecture Design

**Date:** 2025-11-26
**Status:** Active Refactoring
**Purpose:** Global foundation + Organization customizations

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GLOBAL FOUNDATION LAYER                      │
│                    (Shared by All Organizations)                 │
├─────────────────────────────────────────────────────────────────┤
│ • global_root_cause_library      (45 standard causes)           │
│ • global_impact_library           (30 standard impacts)          │
│ • global_control_library          (95 standard controls)         │
│ • global_kri_kci_library          (39 standard indicators)       │
│ • global_root_cause_kri_mapping   (KRI mappings)                 │
│ • global_impact_kci_mapping       (KCI mappings)                 │
│ • global_control_dependencies     (Control relationships)        │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 ORGANIZATION CUSTOMIZATION LAYER                 │
│                    (Private to Each Organization)                │
├─────────────────────────────────────────────────────────────────┤
│ • org_root_causes         (Custom causes + overrides)            │
│ • org_impacts             (Custom impacts + overrides)           │
│ • org_controls            (Custom controls + overrides)          │
│ • org_kri_kci             (Custom indicators + overrides)        │
│ • org_root_cause_kri_mapping (Custom mappings)                   │
│ • org_impact_kci_mapping     (Custom mappings)                   │
│ • org_control_dependencies   (Custom dependencies)               │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UNIFIED VIEW LAYER                          │
│          (What Users See - Global + Org Customizations)          │
├─────────────────────────────────────────────────────────────────┤
│ • root_cause_register      (global + org, with RLS)              │
│ • impact_register          (global + org, with RLS)              │
│ • control_library          (global + org, with RLS)              │
│ • kri_kci_library          (global + org, with RLS)              │
│ • root_cause_kri_mapping   (global + org mappings)               │
│ • impact_kci_mapping       (global + org mappings)               │
│ • control_dependencies     (global + org relationships)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Table Schemas

### 1. Global Root Cause Library

```sql
CREATE TABLE global_root_cause_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cause_code VARCHAR(20) UNIQUE NOT NULL,
  cause_name VARCHAR(255) NOT NULL,
  cause_description TEXT,
  category VARCHAR(100),
  parent_cause_id UUID REFERENCES global_root_cause_library(id),
  severity_indicator VARCHAR(20) CHECK (severity_indicator IN ('Low', 'Medium', 'High', 'Critical')),
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Organization Root Cause Customizations

```sql
CREATE TABLE org_root_causes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- If customizing global cause, reference it
  global_cause_id UUID REFERENCES global_root_cause_library(id),

  -- Custom fields (override global if global_cause_id is set)
  cause_code VARCHAR(20) NOT NULL,
  cause_name VARCHAR(255) NOT NULL,
  cause_description TEXT,
  category VARCHAR(100),
  parent_cause_id UUID, -- Can reference global or org cause
  severity_indicator VARCHAR(20),

  -- Metadata
  is_custom BOOLEAN DEFAULT false, -- true if org-created, false if override
  is_hidden BOOLEAN DEFAULT false, -- true to hide global cause from this org
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique cause codes per org
  UNIQUE(organization_id, cause_code)
);
```

### 3. Unified Root Cause Register View

```sql
CREATE OR REPLACE VIEW root_cause_register AS
-- Global causes (not hidden by any org)
SELECT
  g.id,
  NULL::UUID as organization_id, -- NULL indicates global
  g.cause_code,
  g.cause_name,
  g.cause_description,
  g.category,
  g.parent_cause_id,
  g.severity_indicator,
  'global' as source,
  g.created_at,
  g.updated_at
FROM global_root_cause_library g
WHERE g.is_active = true

UNION ALL

-- Organization customizations and additions
SELECT
  o.id,
  o.organization_id,
  o.cause_code,
  o.cause_name,
  o.cause_description,
  o.category,
  o.parent_cause_id,
  o.severity_indicator,
  CASE
    WHEN o.is_custom THEN 'custom'
    ELSE 'override'
  END as source,
  o.created_at,
  o.updated_at
FROM org_root_causes o
WHERE o.is_hidden = false;
```

### 4. RLS Policy for Root Cause Register View

```sql
-- Enable RLS on org_root_causes table
ALTER TABLE org_root_causes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see global causes + their org's causes
CREATE POLICY "Users can view root causes for their organization"
ON org_root_causes
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
);
```

---

## Migration Strategy

### Phase 1: Create Global Tables (Migration 000016-GLOBAL)
- Create all global_* tables
- Populate with standard 209 library items
- No organization_id dependencies

### Phase 2: Create Org Customization Tables (Migration 000017-ORG)
- Create all org_* tables
- Set up foreign key relationships
- Enable RLS policies

### Phase 3: Create Unified Views (Migration 000018-VIEWS)
- Create views that UNION global + org data
- Ensure proper organization_id filtering
- Test query performance

### Phase 4: Migrate Existing Data (Migration 000019-MIGRATE)
- If existing org-specific data, move to org_* tables
- Mark as overrides or custom items
- Verify data integrity

### Phase 5: Update Application Code
- Change queries to use views instead of base tables
- Update insert/update logic to write to org_* tables
- Update UI to show global vs custom indicators

---

## Data Flow Examples

### Example 1: User Views Root Causes

**Query:**
```sql
SELECT * FROM root_cause_register
WHERE organization_id = 'user-org-id' OR organization_id IS NULL;
```

**Result:**
- All 45 global root causes
- Plus any custom causes created by their org
- Plus any overridden global causes (org version shown)
- Minus any global causes hidden by their org

### Example 2: Organization Adds Custom Root Cause

**Insert:**
```sql
INSERT INTO org_root_causes (
  organization_id, cause_code, cause_name,
  cause_description, is_custom
)
VALUES (
  'org-uuid', 'RC-046', 'Custom Blockchain Risk',
  'Specific to our crypto operations', true
);
```

**Effect:**
- Only visible to that organization
- Automatically appears in root_cause_register view for that org
- Other orgs don't see it (RLS)

### Example 3: Organization Overrides Global Control

**Insert:**
```sql
INSERT INTO org_controls (
  organization_id, global_control_id,
  control_code, control_name,
  implementation_guidance, -- Different from global
  is_custom
)
VALUES (
  'org-uuid', 'global-ctl-uuid',
  'CTL-001', 'MFA (Customized)',
  'We use YubiKey instead of Google Authenticator...', false
);
```

**Effect:**
- Organization sees their custom implementation guidance
- Original global control still exists for other orgs
- View prioritizes org version over global

---

## Benefits of This Architecture

### 1. Scalability
- 209 global records instead of 209 × N organizations
- Database grows linearly with customizations, not with orgs

### 2. Maintainability
- Update global library once → all orgs benefit
- Security patches applied centrally
- Version control for global taxonomy

### 3. Flexibility
- Organizations can add custom items
- Organizations can override global items
- Organizations can hide irrelevant global items

### 4. Multi-Tenancy
- Proper RLS ensures data isolation
- Each org sees: Global + Their customizations
- No org can see another org's customizations

### 5. Auditability
- Clear distinction: global vs custom vs override
- Track who created custom items
- Version history for global changes

---

## Migration Refactoring Checklist

- [ ] Migration 000016: Root Cause Register → Global + Org tables
- [ ] Migration 000017: Impact Register → Global + Org tables
- [ ] Migration 000018: Control Library → Global + Org tables
- [ ] Migration 000019: KRI/KCI Library → Global + Org tables
- [ ] Migration 000020: DIME Scores → Apply to global controls
- [ ] Migration 000021: Implementation Guidance → Store in global
- [ ] Migration 000022: Residual Risk Calculation → Work with views
- [ ] Migration 000023: Effectiveness Tracking → Work with views
- [ ] Migration 000024: Multiple Causes/Impacts → Reference views
- [ ] Migration 000025: Control Dependencies → Global + Org
- [ ] Migration 000026: Risk Appetite → Per-org (stays same)
- [ ] Migration 000027: KRI/KCI Mappings → Global + Org mappings
- [ ] Migration 000028: Breach Tracking → Per-org (stays same)
- [ ] Migration 000029: Library Suggestions → Global approval workflow

---

## Performance Considerations

### Indexes
```sql
-- Global tables
CREATE INDEX idx_global_root_cause_code ON global_root_cause_library(cause_code);
CREATE INDEX idx_global_root_cause_category ON global_root_cause_library(category);

-- Org customization tables
CREATE INDEX idx_org_root_causes_org_id ON org_root_causes(organization_id);
CREATE INDEX idx_org_root_causes_code ON org_root_causes(organization_id, cause_code);
CREATE INDEX idx_org_root_causes_global_ref ON org_root_causes(global_cause_id);
```

### View Performance
- Views use UNION ALL (not UNION) for better performance
- Proper indexing on organization_id for fast filtering
- Consider materialized views if performance degrades

---

## Example Application Queries

### Get All Root Causes for User's Org
```sql
-- Simple query thanks to view
SELECT * FROM root_cause_register
WHERE organization_id = get_user_organization_id()
   OR organization_id IS NULL
ORDER BY cause_code;
```

### Add Custom Root Cause
```sql
-- Application layer handles this
INSERT INTO org_root_causes (
  organization_id, cause_code, cause_name,
  cause_description, category, is_custom
)
VALUES ($1, $2, $3, $4, $5, true);
```

### Override Global Control
```sql
-- Reference global item being overridden
INSERT INTO org_controls (
  organization_id, global_control_id,
  control_code, control_name, implementation_guidance, is_custom
)
VALUES ($1, $2, $3, $4, $5, false);
```

---

**Status:** Ready to implement
**Next Step:** Refactor migrations 000016-000029 to use this architecture
