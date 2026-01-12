# MinRisk Development Implementation Plan
## Parallel Execution Strategy with GitHub Branching

**Document Date:** January 2026  
**Version:** 1.0

---

# Executive Summary

This implementation plan outlines how to execute the MinRisk strategic roadmap using parallel development streams with feature branches on GitHub. Analysis shows that **3 modules can run fully in parallel**, reducing the 18-month sequential timeline to **9-10 months** with proper resource allocation.

---

# 1. Module Dependency Analysis

## 1.1 Integration Matrix

| Module | Risk Register | Controls | Users/Auth | Workflow Engine | Evidence Mgmt | Questionnaire |
|--------|---------------|----------|------------|-----------------|---------------|---------------|
| **Compliance** | Read | Read/Link | Full | Required | Required | Required |
| **Audit** | Read/Write | Read/Link | Full | Required | Required | Optional |
| **Policy** | Read/Link | Read/Link | Full | Required | Optional | Optional |
| **VRM** | Read/Link | Optional | Full | Optional | Required | Required |
| **BCP** | Read/Link | Optional | Full | Optional | Optional | Optional |
| **ESG** | Read/Write | Optional | Full | Optional | Optional | Optional |

## 1.2 Dependency Conclusions

| Module Pair | Can Parallel? | Notes |
|-------------|---------------|-------|
| Compliance ↔ Audit | ✅ Yes | Share workflow engine - build first |
| Compliance ↔ Policy | ⚠️ Mostly | Policy→Compliance mapping deferred |
| Compliance ↔ VRM | ✅ Yes | No dependencies |
| Audit ↔ Policy | ✅ Yes | No dependencies |
| Audit ↔ VRM | ✅ Yes | No dependencies |
| Policy ↔ VRM | ✅ Yes | No dependencies |

---

# 2. Development Streams

## 2.1 Stream Architecture

```
main
  │
  ├── develop (integration branch)
  │     │
  │     ├── feature/foundation-workflow-engine
  │     ├── feature/foundation-evidence-management
  │     ├── feature/foundation-questionnaire-engine
  │     │
  │     ├── feature/module-compliance
  │     │     ├── compliance/obligations-register
  │     │     ├── compliance/controls-mapping
  │     │     ├── compliance/assessments
  │     │     └── compliance/reporting
  │     │
  │     ├── feature/module-audit
  │     │     ├── audit/universe-planning
  │     │     ├── audit/execution
  │     │     ├── audit/findings
  │     │     └── audit/remediation
  │     │
  │     ├── feature/module-policy
  │     │     ├── policy/repository
  │     │     ├── policy/lifecycle
  │     │     ├── policy/attestation
  │     │     └── policy/mapping
  │     │
  │     └── feature/module-vrm
  │           ├── vrm/vendor-inventory
  │           ├── vrm/assessments
  │           ├── vrm/monitoring
  │           └── vrm/lifecycle
  │
  └── release/v2.0 (when all modules complete)
```

## 2.2 Stream Definitions

### Stream A: Compliance + Audit (Primary GRC)
**Lead Developer Required:** 1 senior full-stack

| Week | Sprint | Deliverables |
|------|--------|--------------|
| 1-2 | Sprint 1 | Compliance DB schema, Obligations CRUD |
| 3-4 | Sprint 2 | Obligations UI, Regulatory import |
| 5-6 | Sprint 3 | Compliance-Controls mapping |
| 7-8 | Sprint 4 | Assessment templates, Questionnaire |
| 9-10 | Sprint 5 | Assessment workflow, Evidence |
| 11-12 | Sprint 6 | Compliance reporting, Dashboards |
| 13-14 | Sprint 7 | Audit DB schema, Universe CRUD |
| 15-16 | Sprint 8 | Audit planning, Resource allocation |
| 17-18 | Sprint 9 | Audit execution, Workpapers |
| 19-20 | Sprint 10 | Findings, Root cause links |
| 21-22 | Sprint 11 | Remediation tracking |
| 23-24 | Sprint 12 | Audit reporting, Integration testing |

### Stream B: Policy + VRM (Governance)
**Lead Developer Required:** 1 senior full-stack

| Week | Sprint | Deliverables |
|------|--------|--------------|
| 1-2 | Sprint 1 | Policy DB schema, Repository CRUD |
| 3-4 | Sprint 2 | Policy UI, Version control |
| 5-6 | Sprint 3 | Policy lifecycle workflow |
| 7-8 | Sprint 4 | Attestation campaigns |
| 9-10 | Sprint 5 | Attestation tracking, Reporting |
| 11-12 | Sprint 6 | Policy-Control-Risk mapping |
| 13-14 | Sprint 7 | VRM DB schema, Vendor CRUD |
| 15-16 | Sprint 8 | Vendor UI, Criticality tiering |
| 17-18 | Sprint 9 | VRM questionnaires, Evidence |
| 19-20 | Sprint 10 | VRM scoring, AI analysis |
| 21-22 | Sprint 11 | Continuous monitoring integration |
| 23-24 | Sprint 12 | VRM reporting, Integration testing |

### Stream C: Foundation Components (Shared Services)
**Lead Developer Required:** 1 mid-level (can overlap with Stream A/B)

| Week | Sprint | Deliverables |
|------|--------|--------------|
| 1-2 | Sprint 1 | Workflow engine DB schema |
| 3-4 | Sprint 2 | Workflow engine core, State machine |
| 5-6 | Sprint 3 | Evidence management, File storage |
| 7-8 | Sprint 4 | Questionnaire engine, Templates |
| 9-10 | Sprint 5 | Integration with Compliance |
| 11-12 | Sprint 6 | Integration with VRM |

---

# 3. GitHub Workflow

## 3.1 Branch Naming Convention

```
feature/<module>-<component>
  Examples:
  - feature/compliance-obligations
  - feature/audit-findings
  - feature/foundation-workflow
```

## 3.2 Merge Strategy

```
                         Week 12              Week 24
                            │                    │
Stream C (Foundation) ──────┼────────────────────┤
                            │                    │
Stream A (Compliance) ──────┤                    │
                            ▼                    │
                   [Integration Test]            │
                            │                    │
Stream B (Policy) ──────────┼────────────────────┤
                            │                    ▼
                            │           [Full Integration]
                            │                    │
                            │                    ▼
                            │            release/v2.0
```

## 3.3 Integration Checkpoints

| Checkpoint | Week | Activities |
|------------|------|------------|
| **IC-1** | Week 6 | Foundation → Compliance integration, Workflow engine tested |
| **IC-2** | Week 12 | Compliance complete, Policy core complete, Cross-testing |
| **IC-3** | Week 18 | Audit core complete, VRM assessments complete |
| **IC-4** | Week 24 | All modules complete, Full regression testing |
| **Release** | Week 26 | Production deployment |

## 3.4 PR Review Process

```yaml
# .github/CODEOWNERS
/src/components/compliance/** @team-stream-a
/src/components/audit/**      @team-stream-a
/src/lib/compliance.ts        @team-stream-a
/src/lib/audit.ts             @team-stream-a

/src/components/policy/**     @team-stream-b
/src/components/vrm/**        @team-stream-b
/src/lib/policy.ts            @team-stream-b
/src/lib/vrm.ts               @team-stream-b

/src/lib/workflow.ts          @team-stream-c
/src/lib/evidence.ts          @team-stream-c
/src/lib/questionnaire.ts     @team-stream-c

/supabase/migrations/**       @lead-architect
```

---

# 4. Database Schema Strategy

## 4.1 Schema Isolation

Each module has its own table namespace with clear foreign keys to shared tables:

```sql
-- Shared tables (existing)
organizations, users, risks, controls

-- Compliance namespace
compliance_obligations
compliance_control_mappings
compliance_assessments
compliance_assessment_responses
compliance_evidence

-- Audit namespace
audit_entities
audit_plans
audit_programs
audit_workpapers
audit_findings
audit_remediations

-- Policy namespace
policies
policy_versions
policy_attestations
policy_mappings

-- VRM namespace
vendors
vendor_assessments
vendor_questionnaire_responses
vendor_monitoring_alerts
```

## 4.2 Migration Strategy

Each stream maintains its own migration files with date prefixes:

```
supabase/migrations/
├── 20260201000001_compliance_base_tables.sql      (Stream A)
├── 20260201000002_policy_base_tables.sql          (Stream B)
├── 20260201000003_workflow_engine.sql             (Stream C)
├── 20260215000001_compliance_assessments.sql      (Stream A)
├── 20260215000002_policy_attestations.sql         (Stream B)
...
```

---

# 5. Resource Allocation

## 5.1 Team Structure (Parallel Execution)

| Role | Count | Assignment |
|------|-------|------------|
| **Stream A Lead** | 1 | Compliance, Audit |
| **Stream B Lead** | 1 | Policy, VRM |
| **Foundation Dev** | 1 (part-time) | Workflow, Evidence, Questionnaire |
| **QA Engineer** | 1 | Integration testing, Regression |
| **Lead Architect** | 0.5 | Design reviews, Integration oversight |
| **Total FTE** | 3.5-4 | |

## 5.2 Timeline Comparison

| Approach | Duration | FTE Required | Total Effort |
|----------|----------|--------------|--------------|
| Sequential | 18 months | 2 FTE | 36 person-months |
| Parallel (3 streams) | 6 months | 4 FTE | 24 person-months |

**Time Savings:** 12 months (67% faster)
**Effort Savings:** 12 person-months (33% less total effort)

---

# 6. Risk Mitigation

## 6.1 Integration Risks

| Risk | Mitigation |
|------|------------|
| Schema conflicts | Dedicated migration reviewer, schema namespacing |
| UI conflicts | Shared component library, design system enforcement |
| Merge conflicts | Weekly integration merges, feature flag isolation |
| Cross-module bugs | Integration checkpoints every 6 weeks |

## 6.2 Dependencies

| Dependency | Blocker? | Mitigation |
|------------|----------|------------|
| Workflow engine for Compliance | Yes | Build in Sprint 1-2 before Compliance needs it |
| Evidence mgmt for Audit | Yes | Build in Sprint 3-4 before Audit needs it |
| Questionnaire for VRM | No | Can use basic forms initially, enhance later |

---

# 7. Implementation Checklist

## Phase 0: Setup (Week 0)
- [ ] Create feature branches per stream
- [ ] Set up CODEOWNERS
- [ ] Configure CI/CD pipelines per branch
- [ ] Create schema namespaces
- [ ] Document integration contracts

## Phase 1: Foundation (Weeks 1-6)
### Stream C
- [ ] Workflow engine DB schema
- [ ] Workflow state machine
- [ ] Evidence storage integration
- [ ] Questionnaire template engine

### Stream A (Compliance Core)
- [ ] Compliance DB schema
- [ ] Obligations CRUD
- [ ] Regulatory import
- [ ] Controls mapping UI

### Stream B (Policy Core)
- [ ] Policy DB schema
- [ ] Repository CRUD
- [ ] Version control
- [ ] Lifecycle workflow

## Integration Checkpoint 1 (Week 6)
- [ ] Merge Stream C → develop
- [ ] Integrate workflows into Compliance
- [ ] Cross-team code review
- [ ] Test evidence management

## Phase 2: Core Features (Weeks 7-12)
### Stream A (Compliance Assessments)
- [ ] Assessment templates
- [ ] Questionnaire integration
- [ ] Evidence collection
- [ ] Compliance scoring

### Stream B (Policy Attestation)
- [ ] Attestation campaigns
- [ ] Read tracking
- [ ] Signature collection
- [ ] Compliance reporting

## Integration Checkpoint 2 (Week 12)
- [ ] Merge all streams → develop
- [ ] Full regression testing
- [ ] Performance testing
- [ ] Fix integration issues

## Phase 3: Extended Modules (Weeks 13-18)
### Stream A (Audit)
- [ ] Audit universe
- [ ] Audit planning
- [ ] Workpaper management
- [ ] Findings workflow

### Stream B (VRM)
- [ ] Vendor inventory
- [ ] VRM questionnaires
- [ ] Criticality tiering
- [ ] AI-assisted review

## Integration Checkpoint 3 (Week 18)
- [ ] Merge all streams → develop
- [ ] Cross-module testing
- [ ] Audit-Compliance links
- [ ] VRM-Risk links

## Phase 4: Completion (Weeks 19-24)
### Stream A (Audit Completion)
- [ ] Remediation tracking
- [ ] Audit reporting
- [ ] Risk-finding links
- [ ] Root cause integration

### Stream B (VRM Completion)
- [ ] Continuous monitoring
- [ ] Lifecycle management
- [ ] Fourth-party risk
- [ ] VRM reporting

## Final Release (Weeks 25-26)
- [ ] Final integration testing
- [ ] Security audit
- [ ] Documentation complete
- [ ] Release candidate testing
- [ ] Production deployment

---

# 8. Summary

| Metric | Sequential | Parallel |
|--------|------------|----------|
| **Timeline** | 18 months | 6 months |
| **Team Size** | 2 FTE | 4 FTE |
| **Total Effort** | 36 PM | 24 PM |
| **Integration Risk** | Low | Medium (mitigated) |
| **Time to Market** | Q2 2027 | Q3 2026 |

**Recommendation:** Parallel execution with 3 streams, 4 integration checkpoints, and strict branch discipline delivers the roadmap 12 months faster with 33% less total effort.

---

*This implementation plan assumes dedicated resources and no major scope changes during execution.*
