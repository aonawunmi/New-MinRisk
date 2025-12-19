# Risk Appetite Framework (RAF) Implementation Plan

**Document Created:** 2025-12-05
**Status:** Planning / Design Phase
**Priority:** TBD - Awaiting strategic decision

---

## Executive Summary

This document outlines the requirements, architecture, and implementation strategy for building a supervisory-grade Risk Appetite Framework (RAF) in MinRisk. RAF will transform from a static board statement into live policy that drives system logic, automated constraints, and regulatory compliance.

**Key Decision:** This is an 8-10 week effort that requires stable system foundation and clear user validation before proceeding.

---

## 1. The Regulatory Mandate

### What Regulators Expect

Regulators require RAF to be:
- ✅ **Board-approved** and cascaded throughout the organization
- ✅ **Measurable** with numeric tolerances and limits
- ✅ **Monitored** through KRIs and breach detection
- ✅ **Integrated** with incidents, controls, and risk scoring
- ✅ **Operational** - driving decisions, not an annual ritual

### Regulator Questions MinRisk Must Answer

1. "Show me where your appetite statements become numeric tolerances."
2. "Show me breaches, escalation trails, and who approved deviations."
3. "Show me that changes in appetite update risk scoring and thresholds immediately."
4. "Show me the audit trail for every appetite change."

**If MinRisk can't answer these, the system is decorative—not supervisory-grade.**

---

## 2. Core Architecture Requirements

### A. The RAF Hierarchy (Only Sequence That Works)

```
Appetite → Tolerance → Limits → Indicators
```

| Level | Definition | Example |
|-------|------------|---------|
| **Appetite** | Directional intent | "Low appetite for operational risk" |
| **Tolerance** | Measurable band to stay within | "Max 5 P1 incidents per quarter" |
| **Limits** | Breakpoints for escalation | Soft: 4 incidents, Hard: 6 incidents |
| **Indicators** | KRIs/KCIs detecting drift | "P1 incidents this quarter" |

**Critical:** This must be a data hierarchy, not text in a PDF.

---

### B. Minimum Viable Data Model

#### Database Tables Required

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `risk_appetite_statements` | High-level board-approved statements | category, statement, level (low/med/high), effective_date, board_approval_date |
| `risk_tolerances` | Quantified thresholds linked to appetite | appetite_id, metric, threshold_value, threshold_type, status |
| `risk_limits` | Hard/soft limits with escalation rules | tolerance_id, soft_limit, hard_limit, escalation_requirement, notify_roles |
| `risk_indicators` | KRIs/KCIs mapped to tolerances | tolerance_id, kri_id, auto_generated, threshold_source |
| `risk_breaches` | Automatic breach logging | tolerance_id, breach_date, breach_value, root_cause, resolution_date, approver_id |
| `risk_appetite_history` | Versioning for audit | appetite_id, changed_by, changed_at, old_value, new_value, board_resolution |

#### Risk Register Integration

**Each risk must reference:**
- Appetite category
- Specific tolerance
- Mapped indicators

---

## 3. How RAF Must Influence the MinRisk Engine

### A. Dynamic Risk Scoring

**Inherent/Residual Risk Calculation:**
- Risks in "Low Appetite" categories → likelihood/impact weighted upward
- Flag risks as "out of appetite" before user scoring
- Auto-escalate residual risk if controls are weak + low appetite

**Example:**
```
Base Score = Likelihood × Impact
RAF Adjusted Score = Base Score × Appetite Multiplier

Where Appetite Multiplier:
- Low Appetite: 1.5x
- Medium Appetite: 1.0x
- High Appetite: 0.8x
```

### B. Control Effectiveness (DIME) Integration

**Rule:** Poor controls on low-appetite risks = mandatory action

```
IF risk.appetite = "Low" AND control.dime_score < 2.5
THEN:
  - Severity uplift (+1 level)
  - Mandatory escalation to CRO
  - Monthly control effectiveness reviews required
```

### C. KRI Threshold Auto-Generation

**Instead of users guessing thresholds:**

```
Tolerance → KRI Target
Soft Limit → KRI Warning
Hard Limit → KRI Critical
```

**Example:**
- Tolerance: "Max 5 P1 incidents per quarter"
- System auto-generates KRI: "P1 Incidents (Quarterly)"
  - Target: ≤ 5
  - Warning: 4
  - Critical: 6

### D. Incident Severity Reclassification

**Rule:** Incidents in low-appetite domains get severity uplift

```
IF incident.risk_category.appetite = "Low"
THEN:
  - Auto-uplift severity by 1 level
  - Flag for CRO review
  - Link to RAF breach if tolerance exceeded
```

---

## 4. Automated Breach Management

### When Tolerance is Breached

**System automatically triggers:**

1. **Breach Record Creation**
   - Log breach in `risk_breaches` table
   - Capture: value, threshold, timestamp, responsible owner

2. **Mandatory Workflow**
   ```
   Notification → Risk Owner → CRO → Board Subcommittee
   ```
   - Email alerts to all parties
   - Dashboard red flags
   - Cannot be dismissed without resolution

3. **Control Remediation**
   - Root cause module opens by default
   - Link to affected controls
   - Track remediation actions

4. **KRI Threshold Tightening**
   - KRI thresholds automatically tighten by 20%
   - Remain tight until control proven effective
   - Require CRO approval to reset

### When Risk is Above Appetite Level

**System enforces:**
- ❌ Marked red system-wide
- ❌ Cannot be closed without CRO override (logged)
- ✅ Control effectiveness reviews → mandatory monthly
- ✅ Auto-escalate to board risk committee

### When Appetite Changes

**Ripple Effect Across System:**

1. **Immediate Recalculation**
   - Recalculate all risk scores using new appetite multipliers
   - Update tolerance bands
   - Re-base KRI thresholds

2. **Notifications**
   - Push alerts to all risk owners
   - Highlight risks that moved in/out of appetite
   - Require acknowledgment

3. **Version Control**
   - Log change in `risk_appetite_history`
   - Capture: who, when, why, board resolution reference
   - Maintain audit trail

---

## 5. Regulator Portal View

### Cross-Entity Dashboard (Supervisory-Grade)

**Must display:**

| Section | Content |
|---------|---------|
| **Appetite Overview** | All appetite statements by category, effective dates |
| **Tolerance Status** | Live status: Green (within) / Amber (approaching) / Red (breached) |
| **Top Breaches** | By entity, by severity, by duration |
| **Risk vs Appetite Heatmap** | Visual: where are entities outside appetite? |
| **Trend Analysis** | Are entities drifting outside appetite over time? |
| **Override Log** | Every approval, who, when, justification |

**This is the killer feature for regulatory demonstrations.**

---

## 6. Critical Blind Spots to Close

### Most RAF Implementations Fail Because:

1. **Manual Tolerance Setting**
   - Users set tolerances without guidance → chaos
   - **MinRisk Fix:** Provide templates, benchmarks, validation

2. **No Appetite-KRI Link**
   - KRIs exist independently of appetite → dead system
   - **MinRisk Fix:** Auto-generate KRIs from tolerances

3. **No Automated Breach Logs**
   - Manual breach reporting → compliance nightmare
   - **MinRisk Fix:** Auto-create breach records, mandatory workflows

4. **No Version Control**
   - Appetite changes leave no trail → regulator red flag
   - **MinRisk Fix:** `risk_appetite_history` table with full audit

5. **No Appetite-Risk Cascade**
   - Board intent disconnected from actual risk-taking
   - **MinRisk Fix:** Every risk must map to appetite category

**MinRisk must close ALL of these gaps.**

---

## 7. Phased Implementation Strategy

### Phase 0: Foundation Assessment (1 week)

**Goal:** Ensure system stability before major build

**Tasks:**
- [ ] Run full test suite - identify broken features
- [ ] Check for duplicate .js files or build issues
- [ ] Verify risk scoring, KRIs, incidents, controls work correctly
- [ ] Fix outstanding bugs
- [ ] Load test current system

**Decision Gate:** Only proceed if system is solid.

---

### Phase 1: RAF Data Model + Basic UI (2-3 weeks)

**Goal:** Build skeleton without scoring integration

**Scope:**

#### Backend:
- [ ] Create 6 new database tables (see schema above)
- [ ] Write migration scripts with rollback capability
- [ ] Build CRUD functions for appetite/tolerance/limits
- [ ] Create versioning system for appetite changes

#### Frontend:
- [ ] RAF Management page (CRUD appetite statements)
- [ ] Tolerance/Limits configuration UI
- [ ] Risk-to-appetite mapping in Risk Register
- [ ] Simple breach log viewer

#### Testing:
- [ ] Users can define RAF statements
- [ ] Users can set tolerances and limits
- [ ] Users can map risks to appetite categories
- [ ] Breach logs display correctly

**Deliverable:** Users can define RAF and map risks, but it doesn't influence scores yet.

**Benefit:** Validate data model and user workflows before complex integration.

---

### Phase 2: Scoring Engine Integration (2-3 weeks)

**Goal:** Make RAF dynamically influence risk scoring

**Scope:**

#### Risk Scoring:
- [ ] Implement appetite multiplier in risk calculation
- [ ] Add "out of appetite" flag to risks
- [ ] Build risk reclassification logic when appetite changes

#### Control Integration:
- [ ] DIME score + appetite → severity uplift logic
- [ ] Mandatory escalation rules for low-appetite + weak controls

#### KRI Auto-Generation:
- [ ] Build tolerance → KRI threshold mapping
- [ ] Auto-create KRIs when tolerance is defined
- [ ] Sync KRI thresholds with limit changes

#### Incident Reclassification:
- [ ] Auto-uplift severity for low-appetite incidents
- [ ] Link incidents to RAF breaches

#### Testing:
- [ ] Change appetite → verify scores recalculate
- [ ] Add control to low-appetite risk → verify escalation
- [ ] Create incident in low-appetite category → verify uplift

**Deliverable:** RAF influences all core MinRisk calculations.

---

### Phase 3: Breach Automation + Workflows (1-2 weeks)

**Goal:** Automated breach detection and escalation

**Scope:**

#### Breach Detection:
- [ ] Build real-time breach monitoring
- [ ] Auto-create breach records when tolerance exceeded
- [ ] Calculate breach duration and severity

#### Escalation Workflows:
- [ ] Notification system: owner → CRO → board
- [ ] Cannot dismiss without documented resolution
- [ ] Track acknowledgment and response times

#### Remediation Module:
- [ ] Auto-open root cause analysis
- [ ] Link to affected controls
- [ ] Track remediation actions and timelines

#### KRI Tightening:
- [ ] Auto-tighten KRI thresholds by 20% on breach
- [ ] Require CRO approval to reset
- [ ] Log all threshold changes

#### Testing:
- [ ] Simulate breach → verify workflow triggers
- [ ] Test CRO override → verify logging
- [ ] Test remediation completion → verify KRI reset

**Deliverable:** Fully automated breach management with compliance trail.

---

### Phase 4: Regulator Portal (1 week)

**Goal:** Cross-entity supervisory view

**Scope:**

#### Dashboard Components:
- [ ] Appetite statements viewer
- [ ] Live tolerance status by entity
- [ ] Breach heatmap (entity × category)
- [ ] Trend charts (drift over time)
- [ ] Override audit log

#### Filtering:
- [ ] By entity
- [ ] By risk category
- [ ] By time period
- [ ] By breach severity

#### Export:
- [ ] PDF report generation
- [ ] Excel export for analysis
- [ ] API endpoints for regulatory reporting

**Deliverable:** Regulator-ready view for supervisory demonstrations.

---

## 8. Critical Questions (Must Answer Before Build)

### 1. Scope Decision

**Question:** What do we build first?

**Options:**
- A. Full RAF (8-10 weeks) - All phases at once
- B. Phase 1 only (2-3 weeks) - Validate with users before proceeding
- C. Defer RAF - Focus on other priorities first

**Recommendation:** Option B - Phased approach reduces risk.

---

### 2. User Validation

**Questions:**
- Have clearing houses/exchanges requested this feature?
- Do they understand tolerance-setting?
- Have we shown mockups to 2-3 pilot users?
- Will they actually use it or ignore it?

**Action Required:** User interviews before major investment.

---

### 3. Scoring Logic Details

**Questions:**
- Exactly how should appetite influence inherent risk score?
  - Multiplier approach? (1.5x for low appetite)
  - Additive approach? (+2 points for low appetite)
- By what percentage should low appetite uplift scores?
- Should this be configurable per organization?
- What if user manually overrides the score?

**Action Required:** Define precise calculation formulas with examples.

---

### 4. Migration Strategy

**Questions:**
- What happens to existing risks when RAF launches?
- Do all risks default to "Medium Appetite"?
- Do CROs manually map 100+ risks to appetite?
- Do we recalculate all scores on day 1?
- What about KRIs that weren't auto-generated from tolerances?

**Action Required:** Migration plan with rollback strategy.

---

### 5. Priority Context

**Questions:**
- Is RAF more important than:
  - Fixing remaining bugs?
  - Improving KRI breach detection?
  - Building out incident analysis?
  - Other features users requested?
- Is there a specific client/deadline driving this?
- What's the business case for RAF now vs. Q1 2026?

**Action Required:** Strategic prioritization decision.

---

## 9. Risk Assessment (Building RAF Now)

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| System instability from complex integration | High | Medium | Phase 0 assessment mandatory |
| Cascading bugs across risk/KRI/incident modules | High | Medium | Extensive testing + rollback plan |
| Performance degradation (recalculation overhead) | Medium | Medium | Optimize queries, async processing |
| Migration data corruption | High | Low | Staging environment, backups |

### User Adoption Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users don't understand tolerance-setting | High | High | Training, templates, validation |
| Users ignore RAF (too complex) | High | Medium | User research first, simplify UI |
| Users game the system (inflate tolerances) | Medium | Medium | CRO approval required, audit trail |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| 8-10 weeks without other feature delivery | Medium | High | Phased approach, parallel work streams |
| Built without user validation → shelf-ware | High | Medium | Phase 1 user testing mandatory |
| Scope creep extends timeline | Medium | High | Strict phase gates, no feature adds mid-build |

---

## 10. Success Criteria

### Technical Success

- [ ] All 6 RAF tables implemented with proper relationships
- [ ] Appetite changes ripple through system (scores, KRIs, incidents)
- [ ] Breach detection runs in real-time (< 5 sec latency)
- [ ] Version control logs all appetite changes with audit trail
- [ ] Zero data corruption during migration
- [ ] Performance: System handles 1000+ risks + RAF with < 2 sec load times

### User Success

- [ ] Users can define appetite statements without confusion
- [ ] 80%+ of tolerances set within 2 weeks of launch
- [ ] Breach workflows trigger and complete within SLA
- [ ] CROs report RAF "useful" in quarterly survey
- [ ] Zero complaints about system slowdown

### Regulatory Success

- [ ] Can answer all 4 regulator questions (see Section 1)
- [ ] Breach audit trail meets compliance standards
- [ ] Regulator portal demo receives positive feedback
- [ ] No red flags in external audit

---

## 11. Recommended Path Forward

### Immediate Next Steps

1. **Strategic Decision** (This Week)
   - Is RAF top priority?
   - User validation: Schedule 3 interviews with clearing houses
   - Budget approval: 8-10 weeks dev time

2. **If Approved: Phase 0** (Week 1)
   - System stability assessment
   - Fix any outstanding bugs
   - Load testing

3. **If Approved: Phase 1** (Weeks 2-4)
   - Build data model + basic UI on `feature/raf-foundation` branch
   - Deploy to staging
   - User acceptance testing with 2 pilot organizations

4. **Decision Gate** (End of Week 4)
   - User feedback positive? → Proceed to Phase 2
   - User feedback negative? → Iterate on Phase 1 or defer
   - Technical issues? → Fix before proceeding

---

## 12. Alternative: Defer RAF

### If Not Building Now

**Action Plan:**
1. Focus on system stability and bug fixes
2. Build other user-requested features (prioritize backlog)
3. Conduct user research on RAF needs (interviews, surveys)
4. Return to RAF in Q1 2026 when foundation is rock-solid

**Benefits:**
- Lower risk of introducing bugs
- More time for user validation
- System maturity improves
- Can learn from competitor implementations

**Trade-offs:**
- RAF not available for near-term client demos
- May lose competitive advantage if competitors ship first

---

## 13. Appendix: Example RAF Configuration

### Example: Operational Risk Appetite

**Appetite Statement:**
> "The organization maintains a low appetite for operational risk that could result in service disruption or regulatory censure."

**Tolerance:**
- Metric: Priority 1 Incidents
- Threshold: Maximum 5 per quarter
- Status: Active

**Limits:**
- Soft Limit: 4 incidents (Warning to CRO)
- Hard Limit: 6 incidents (Mandatory board escalation)

**Indicators:**
- KRI: "P1 Incidents (Quarterly Count)"
  - Auto-generated from tolerance
  - Target: ≤ 5
  - Warning: 4
  - Critical: 6
  - Current Value: 3 (Green)

**Linked Risks:**
- RISK-OPS-001: System Outage
- RISK-OPS-003: Data Breach
- RISK-OPS-007: Third-Party Failure

**If Breached:**
1. Auto-create breach record in `risk_breaches`
2. Notify: Risk owners, CRO, COO
3. Open root cause analysis
4. Tighten KRI threshold to 4 (from 5)
5. Require monthly control reviews until resolved

---

## Document Control

**Author:** MinRisk Development Team
**Reviewed By:** TBD
**Approved By:** TBD
**Next Review Date:** TBD
**Version:** 1.0

---

**END OF DOCUMENT**
