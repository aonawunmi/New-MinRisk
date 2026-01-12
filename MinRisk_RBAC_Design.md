# MinRisk Role-Based Access Control (RBAC) Design
## Enterprise Permission Model

**Document Date:** January 2026  
**Version:** 1.0

---

# 1. Executive Summary

This document defines the Role-Based Access Control (RBAC) model for MinRisk, covering all existing and planned modules. The design supports:

- **Hierarchical roles** with inheritance
- **Module-based permissions** for granular access
- **Division/department scoping** for large organizations
- **Separation of duties** for governance compliance
- **Audit trail** for all permission-related actions

---

# 2. RBAC Architecture

## 2.1 Three-Layer Permission Model

```
┌────────────────────────────────────────────────────────────────┐
│                      LAYER 1: SYSTEM ROLES                     │
│  Global roles that span all modules                            │
│  (Super Admin, Organization Admin, Standard User)              │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    LAYER 2: MODULE ROLES                        │
│  Role assignments per functional module                         │
│  (Risk Manager, Compliance Officer, Auditor, etc.)             │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    LAYER 3: DATA SCOPES                         │
│  Restrict data access by division/department                    │
│  (All, Specific Division, Own Department Only)                  │
└────────────────────────────────────────────────────────────────┘
```

## 2.2 Permission Types

| Permission | Symbol | Description |
|------------|--------|-------------|
| **Create** | C | Can create new records |
| **Read** | R | Can view records |
| **Update** | U | Can modify records |
| **Delete** | D | Can delete/archive records |
| **Approve** | A | Can approve/reject workflows |
| **Export** | E | Can export/download data |
| **Admin** | * | Full access including configuration |

---

# 3. System-Level Roles

## 3.1 Role Hierarchy

```
Super Admin (Platform Owner)
    │
    └── Organization Admin
            │
            ├── Department Manager
            │       │
            │       └── Standard User
            │
            └── Module Specialist Roles
                    ├── Risk Manager
                    ├── Compliance Officer
                    ├── Chief Audit Executive
                    ├── Policy Manager
                    └── VRM Manager
```

## 3.2 System Role Definitions

| Role | Scope | Inherits From | Key Capabilities |
|------|-------|---------------|------------------|
| **Super Admin** | Platform | - | Platform configuration, multi-org management |
| **Organization Admin** | Organization | - | User management, taxonomy, all modules |
| **Department Manager** | Department | Standard User | Approve within department, view department data |
| **Standard User** | Assigned | - | Create/edit within assigned scope |

---

# 4. Module-Level Roles

## 4.1 Risk Management Module

| Role | Permissions | Scope |
|------|-------------|-------|
| **Risk Admin** | CRUD + A + E + * | Organization-wide |
| **Risk Manager** | CRUD + A + E | All divisions |
| **Risk Owner** | RU | Own assigned risks only |
| **Risk Viewer** | R + E | As assigned |

### Detailed Permissions

| Action | Risk Admin | Risk Manager | Risk Owner | Risk Viewer |
|--------|------------|--------------|------------|-------------|
| View all risks | ✅ | ✅ | ❌ (own only) | ✅ |
| Create risk | ✅ | ✅ | ❌ | ❌ |
| Edit any risk | ✅ | ✅ | ❌ | ❌ |
| Edit own risks | ✅ | ✅ | ✅ | ❌ |
| Delete risk | ✅ | ✅ | ❌ | ❌ |
| Link controls | ✅ | ✅ | ✅ | ❌ |
| Approve risk assessments | ✅ | ✅ | ❌ | ❌ |
| Configure taxonomy | ✅ | ❌ | ❌ | ❌ |
| Export risks | ✅ | ✅ | ✅ | ✅ |

---

## 4.2 Controls Module

| Role | Permissions | Scope |
|------|-------------|-------|
| **Control Admin** | CRUD + A + * | Organization-wide |
| **Control Manager** | CRUD + A | All controls |
| **Control Owner** | RU | Own assigned controls |
| **Control Tester** | RU (effectiveness only) | Assigned controls |

### Detailed Permissions

| Action | Control Admin | Control Manager | Control Owner | Control Tester |
|--------|---------------|-----------------|---------------|----------------|
| View all controls | ✅ | ✅ | ❌ (own only) | ✅ (assigned) |
| Create control | ✅ | ✅ | ❌ | ❌ |
| Edit control details | ✅ | ✅ | ✅ (own) | ❌ |
| Update DIME scores | ✅ | ✅ | ✅ (own) | ✅ (assigned) |
| Link to risks | ✅ | ✅ | ✅ (own) | ❌ |
| Approve control changes | ✅ | ✅ | ❌ | ❌ |
| Archive control | ✅ | ✅ | ❌ | ❌ |

---

## 4.3 KRI & Appetite Module

| Role | Permissions | Scope |
|------|-------------|-------|
| **Appetite Admin** | CRUD + A + * | Organization-wide |
| **Appetite Manager** | CRU + A | All categories |
| **KRI Owner** | RU | Own KRIs only |
| **KRI Data Entry** | U (values only) | Assigned KRIs |
| **Board Member** | R + A (breaches) | All (read-only + approvals) |

### Detailed Permissions

| Action | Appetite Admin | Appetite Manager | KRI Owner | KRI Data Entry | Board Member |
|--------|----------------|------------------|-----------|----------------|--------------|
| Configure appetite | ✅ | ✅ | ❌ | ❌ | ❌ |
| Set tolerance thresholds | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create KRI | ✅ | ✅ | ❌ | ❌ | ❌ |
| Enter KRI values | ✅ | ✅ | ✅ | ✅ | ❌ |
| Acknowledge alerts | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve breaches | ✅ | ✅ | ❌ | ❌ | ✅ |
| View dashboards | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4.4 Incident Module

| Role | Permissions | Scope |
|------|-------------|-------|
| **Incident Admin** | CRUD + A + * | Organization-wide |
| **Incident Manager** | CRU + A | All incidents |
| **Incident Reporter** | CR | Own incidents |
| **Incident Investigator** | RU | Assigned incidents |

### Detailed Permissions

| Action | Incident Admin | Incident Manager | Incident Reporter | Incident Investigator |
|--------|----------------|------------------|-------------------|-----------------------|
| Report incident | ✅ | ✅ | ✅ | ✅ |
| View all incidents | ✅ | ✅ | ❌ (own only) | ✅ (assigned) |
| Update incident status | ✅ | ✅ | ❌ | ✅ (assigned) |
| Link to risks | ✅ | ✅ | ❌ | ✅ (assigned) |
| Accept AI suggestions | ✅ | ✅ | ❌ | ❌ |
| Close incident | ✅ | ✅ | ❌ | ❌ |
| Delete incident | ✅ | ❌ | ❌ | ❌ |

---

## 4.5 Compliance Module (NEW)

| Role | Permissions | Scope |
|------|-------------|-------|
| **Chief Compliance Officer** | CRUD + A + * | Organization-wide |
| **Compliance Manager** | CRUD + A | Assigned frameworks |
| **Compliance Analyst** | CRU | Assigned assessments |
| **Control Owner** | RU | Own controls mapping |
| **Compliance Viewer** | R + E | All (read-only) |

### Detailed Permissions

| Action | CCO | Compliance Manager | Compliance Analyst | Control Owner |
|--------|-----|--------------------|--------------------|---------------|
| Manage frameworks | ✅ | ❌ | ❌ | ❌ |
| Create obligations | ✅ | ✅ | ❌ | ❌ |
| Map controls to obligations | ✅ | ✅ | ✅ | ✅ (own controls) |
| Create assessments | ✅ | ✅ | ❌ | ❌ |
| Complete assessments | ✅ | ✅ | ✅ | ✅ (own scope) |
| Upload evidence | ✅ | ✅ | ✅ | ✅ |
| Approve assessments | ✅ | ✅ | ❌ | ❌ |
| Generate reports | ✅ | ✅ | ✅ | ❌ |

---

## 4.6 Audit Module (NEW)

| Role | Permissions | Scope |
|------|-------------|-------|
| **Chief Audit Executive** | CRUD + A + * | Organization-wide |
| **Audit Manager** | CRUD + A | Assigned audits |
| **Lead Auditor** | CRUD | Assigned audits |
| **Staff Auditor** | CRU | Assigned workpapers |
| **Auditee** | R + respond | Own audit requests |
| **Audit Committee** | R + A | All findings (final approval) |

### Detailed Permissions

| Action | CAE | Audit Manager | Lead Auditor | Staff Auditor | Auditee | Audit Committee |
|--------|-----|---------------|--------------|---------------|---------|-----------------|
| Create audit plan | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign auditors | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create workpapers | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Log findings | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Rate findings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve findings | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Respond to findings | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Track remediation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Issue final report | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Separation of Duties

| Rule | Enforcement |
|------|-------------|
| Auditor cannot audit own department | System-enforced |
| Auditor cannot approve own findings | System-enforced |
| Auditee cannot modify finding severity | System-enforced |
| Audit Committee approval required for Critical findings | Workflow-enforced |

---

## 4.7 Policy Module (NEW)

| Role | Permissions | Scope |
|------|-------------|-------|
| **Policy Admin** | CRUD + A + * | Organization-wide |
| **Policy Owner** | CRUD + A | Own policies |
| **Policy Approver** | R + A | Assigned approvals |
| **Attestation Manager** | CRU + A | Attestation campaigns |
| **Policy Reader** | R + attest | View and attest |

### Detailed Permissions

| Action | Policy Admin | Policy Owner | Policy Approver | Attestation Mgr | Policy Reader |
|--------|--------------|--------------|-----------------|-----------------|---------------|
| Create policy | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit policy | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Submit for approval | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Approve/Reject policy | ✅ | ❌ | ✅ | ❌ | ❌ |
| Publish policy | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create attestation campaign | ✅ | ❌ | ❌ | ✅ | ❌ |
| Track attestations | ✅ | ✅ (own) | ❌ | ✅ | ❌ |
| Attest to policy | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4.8 Vendor Risk Module (NEW)

| Role | Permissions | Scope |
|------|-------------|-------|
| **VRM Admin** | CRUD + A + * | Organization-wide |
| **VRM Manager** | CRUD + A | All vendors |
| **Vendor Owner** | RU + A | Own vendors |
| **VRM Assessor** | CRU | Assigned assessments |
| **Procurement** | R + onboard | Vendor onboarding |

### Detailed Permissions

| Action | VRM Admin | VRM Manager | Vendor Owner | VRM Assessor | Procurement |
|--------|-----------|-------------|--------------|--------------|-------------|
| Add vendor | ✅ | ✅ | ❌ | ❌ | ✅ |
| Edit vendor details | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Assign criticality | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Create assessment | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Complete assessment | ✅ | ✅ | ❌ | ✅ | ❌ |
| Review evidence | ✅ | ✅ | ✅ (own) | ✅ | ❌ |
| Approve vendor | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure monitoring | ✅ | ✅ | ❌ | ❌ | ❌ |
| Offboard vendor | ✅ | ✅ | ❌ | ❌ | ❌ |

---

# 5. Data Scope Restrictions

## 5.1 Scope Levels

| Scope Level | Description |
|-------------|-------------|
| **Organization** | Access to all data in the organization |
| **Division** | Access only to data in assigned division(s) |
| **Department** | Access only to data in own department |
| **Own** | Access only to data where user is owner/assignee |

## 5.2 Scope Application Matrix

| Module | Can Be Scoped By |
|--------|------------------|
| Risks | Division, Department, Owner |
| Controls | Owner |
| KRIs | Owner, Data Entry Assignee |
| Incidents | Reporter, Investigator |
| Compliance | Framework, Business Unit |
| Audit | Audit, Auditee Department |
| Policy | Owner, Approver, Attestee |
| VRM | Vendor Owner, Assessor |

---

# 6. Database Schema

## 6.1 Core RBAC Tables

```sql
-- System roles (global)
CREATE TABLE system_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    hierarchy_level INT NOT NULL,  -- 1=highest, 5=lowest
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module roles
CREATE TABLE module_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code VARCHAR(50) NOT NULL,  -- 'risk', 'compliance', 'audit', etc.
    role_code VARCHAR(50) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,  -- {"create": true, "read": true, ...}
    is_active BOOLEAN DEFAULT true,
    UNIQUE(module_code, role_code)
);

-- User role assignments
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    
    -- System role
    system_role_id UUID REFERENCES system_roles(id),
    
    -- Module roles (JSONB for flexibility)
    module_roles JSONB,  -- {"risk": "risk_manager", "compliance": "compliance_analyst"}
    
    -- Data scope restrictions
    scope_type VARCHAR(20) DEFAULT 'organization',  -- organization, division, department, own
    scope_divisions UUID[],  -- Array of division IDs (if scoped)
    scope_departments UUID[], -- Array of department IDs (if scoped)
    
    -- Metadata
    assigned_by UUID REFERENCES user_profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- For temporary assignments
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, organization_id)
);

-- Permission checks (RLS helper function)
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_module VARCHAR(50),
    p_permission VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    v_permissions JSONB;
    v_module_role VARCHAR(50);
BEGIN
    -- Get user's module role
    SELECT module_roles->>p_module INTO v_module_role
    FROM user_role_assignments
    WHERE user_id = p_user_id AND is_active = true;
    
    IF v_module_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get permissions for that role
    SELECT permissions INTO v_permissions
    FROM module_roles
    WHERE module_code = p_module AND role_code = v_module_role;
    
    RETURN COALESCE((v_permissions->>p_permission)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 6.2 Sample RLS Policy

```sql
-- Example: Compliance assessments with scope enforcement
CREATE POLICY "compliance_assessments_select" ON compliance_assessments
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND (
            -- Org-wide access
            user_has_permission(auth.uid(), 'compliance', 'read')
            OR
            -- Scoped access - check if user has access to this framework/BU
            EXISTS (
                SELECT 1 FROM user_role_assignments ura
                JOIN compliance_obligations co ON co.id = compliance_assessments.obligation_id
                WHERE ura.user_id = auth.uid()
                AND (
                    ura.scope_type = 'organization'
                    OR co.business_unit_id = ANY(ura.scope_departments)
                )
            )
        )
    );
```

---

# 7. Role Assignment Matrix (Default Mappings)

## 7.1 Suggested Role Bundles

| Job Title | System Role | Risk | Controls | KRI | Incidents | Compliance | Audit | Policy | VRM |
|-----------|-------------|------|----------|-----|-----------|------------|-------|--------|-----|
| **CEO/Board** | Org Admin | Viewer | Viewer | Board | Viewer | Viewer | Committee | Viewer | Viewer |
| **CRO** | Org Admin | Admin | Admin | Admin | Admin | Viewer | Viewer | Viewer | Viewer |
| **CCO** | Org Admin | Manager | Manager | Manager | Admin | Admin | Viewer | Admin | Manager |
| **CAE** | Org Admin | Viewer | Viewer | Viewer | Viewer | Viewer | Admin | Viewer | Viewer |
| **Risk Manager** | Dept Mgr | Manager | Manager | Manager | Manager | Analyst | - | - | - |
| **Compliance Officer** | Dept Mgr | Viewer | Owner | Viewer | - | Manager | - | Approver | - |
| **Internal Auditor** | User | Viewer | Viewer | Viewer | - | Viewer | Auditor | Viewer | - |
| **Dept Head** | Dept Mgr | Owner | Owner | Owner | Reporter | - | Auditee | Reader | Owner |
| **Business User** | User | Owner | - | Data Entry | Reporter | - | - | Reader | - |

---

# 8. Implementation Considerations

## 8.1 Migration from Current Roles

| Current Role | Maps To System Role | Default Module Roles |
|--------------|---------------------|---------------------|
| primary_admin | Organization Admin | All modules = Admin |
| secondary_admin | Department Manager | Risk/Controls/KRI = Manager |
| user | Standard User | Risk = Owner, Incidents = Reporter |

## 8.2 UI Components Required

| Component | Purpose |
|-----------|---------|
| Role Assignment Form | Assign roles to users |
| Permission Viewer | Show effective permissions |
| Role Templates | Quick-assign role bundles |
| Access Request | User self-service for access |
| Delegation | Temporary delegation of authority |
| Separation of Duties Check | Validate conflicting roles |

## 8.3 Audit Requirements

All role changes must be logged:
- Who assigned the role
- What roles were changed
- When the change occurred
- Justification (optional)
- Expiration (if temporary)

---

# 9. Summary

| Aspect | Design Decision |
|--------|-----------------|
| **Model** | Hybrid: System roles + Module roles + Data scopes |
| **Inheritance** | System roles provide baseline, module roles override |
| **Scoping** | Division/Department/Own scoping per module |
| **Separation of Duties** | System-enforced for Audit module |
| **Temporary Access** | Supported via expiration dates |
| **Audit Trail** | Full logging of all role changes |

---

*This RBAC design supports enterprise governance requirements while remaining flexible for different organization sizes.*
