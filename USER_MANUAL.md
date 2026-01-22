# MinRisk User Training Manual

**Version:** 3.0  
**Last Updated:** January 2026  
**Application:** MinRisk - Enterprise Risk Management Platform

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Dashboard Overview](#dashboard-overview)
5. [Risk Register](#risk-register)
6. [Control Management & DIME Framework](#control-management--dime-framework)
7. [Key Risk Indicators (KRIs) & Key Control Indicators (KCIs)](#key-risk-indicators-kris--key-control-indicators-kcis)
8. [Risk Appetite Framework](#risk-appetite-framework)
9. [Incident Management](#incident-management)
10. [Risk Analytics & Reports](#risk-analytics--reports)
11. [Risk Intelligence](#risk-intelligence)
12. [Period Management](#period-management)
13. [Administrator Guide](#administrator-guide)
14. [Import/Export Data](#importexport-data)
15. [Best Practices](#best-practices)
16. [Troubleshooting](#troubleshooting)
17. [Glossary](#glossary)
18. [FAQ](#faq)

---

## Introduction

### What is MinRisk?

MinRisk is an enterprise risk management (ERM) platform that enables organizations to:

- **Identify and assess risks** using structured likelihood × impact scoring
- **Manage controls** with the DIME effectiveness framework
- **Monitor key indicators** (KRIs and KCIs) with threshold-based alerting
- **Track incidents** and link them to risks for root cause analysis
- **Define risk appetite** at enterprise and category levels
- **Generate analytics and reports** for board, regulatory, and management needs
- **Maintain historical records** with immutable quarterly snapshots

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Continuous Risk Register** | Risks maintain identity across periods; never cloned or deleted |
| **DIME Control Framework** | Design, Implementation, Monitoring, Evaluation scoring |
| **Risk Appetite Framework** | Enterprise appetite levels with tolerance metrics |
| **Incident Management** | Report, investigate, and link incidents to risks |
| **AI-Powered Intelligence** | Automated threat detection from external sources |
| **Multi-tenant Architecture** | Secure data isolation per organization |

---

## Getting Started

### First Login

1. **Access the Application**
   - Navigate to your organization's MinRisk URL
   - Example: `https://minrisk.yourcompany.com`

2. **Login Credentials**
   - Enter your email address
   - Enter your password
   - Click **"Sign In"**

3. **First-Time Setup** (New Users)
   - Complete your profile information
   - Wait for administrator approval
   - You'll receive email notification when approved

### Navigation Overview

```
┌─────────────────────────────────────────────────────────────┐
│  MinRisk                                    [User Menu] ▼   │
├─────────────────────────────────────────────────────────────┤
│  Dashboard | Risks | Analytics | Incidents | Risk Intel | Admin │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    [Main Content Area]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tab Descriptions:**

| Tab | Purpose | Roles |
|-----|---------|-------|
| **Dashboard** | Overview metrics, charts, top risks | All users |
| **Risks** | Risk Register - view/add/edit risks | All users (edit: Risk Manager+) |
| **Analytics** | Heatmaps, trends, period comparison | All users |
| **Incidents** | Report and manage incidents | All users |
| **Risk Intel** | AI-powered threat intelligence | Admin only |
| **Admin** | User management, configuration | Admin only |

---

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────┐
│                   ADMIN                      │
│  (Full access + user management + config)   │
├─────────────────────────────────────────────┤
│              RISK MANAGER                    │
│  (Can create/edit risks, controls, KRIs)    │
├─────────────────────────────────────────────┤
│                  USER                        │
│  (View only - dashboard, risks, reports)    │
└─────────────────────────────────────────────┘
```

### Detailed Permissions Matrix

| Feature | User | Risk Manager | Admin |
|---------|------|--------------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Risk Register | ✅ | ✅ | ✅ |
| Add/Edit Risks | ❌ | ✅ | ✅ |
| Add/Edit Controls | ❌ | ✅ | ✅ |
| Report Incidents | ✅ | ✅ | ✅ |
| Manage Incidents | ❌ | ✅ | ✅ |
| View Analytics | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ✅ |
| Risk Intelligence | ❌ | ❌ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| Period Commit | ❌ | ❌ | ✅ |
| System Configuration | ❌ | ❌ | ✅ |

---

## Dashboard Overview

### Key Metrics Cards

The dashboard displays four primary metric cards:

| Card | Description | Calculation |
|------|-------------|-------------|
| **Total Risks** | Count of active risks | All risks with status ≠ CLOSED |
| **Avg Inherent Risk** | Risk before controls | Mean of (L × I) across all risks |
| **Avg Residual Risk** | Risk after controls | Mean of residual scores |
| **Control Quality** | DIME effectiveness | Mean of (D+I+M+E)/12 across controls |

### Dashboard Charts

**1. Risk Level Distribution**
Shows count of risks by severity level:
- 🟥 **Extreme**: Score ≥ 15
- 🟧 **High**: Score 10-14
- 🟨 **Medium**: Score 5-9
- 🟩 **Low**: Score < 5

**2. Risk Status Distribution**
Shows risks by workflow status:
- **OPEN**: Newly identified
- **MONITORING**: Under active monitoring
- **APPROVED**: Accepted by management
- **CLOSED**: Mitigated or no longer applicable

**3. Top 10 Risks Table**
Lists highest inherent risks with quick-view details.

---

## Risk Register

### Understanding Risks

A **risk** is a potential event that could negatively impact the organization's objectives. Each risk has:

- **Inherent Risk**: The risk level assuming NO controls exist
- **Residual Risk**: The risk level AFTER controls are applied
- **Risk Score**: Likelihood × Impact (1-25 scale on 5×5 matrix)

### Risk Scoring Matrix

```
        I M P A C T
        1    2    3    4    5
    ┌────┬────┬────┬────┬────┐
  5 │  5 │ 10 │ 15 │ 20 │ 25 │  EXTREME (≥15)
L   ├────┼────┼────┼────┼────┤
I 4 │  4 │  8 │ 12 │ 16 │ 20 │  HIGH (10-14)
K   ├────┼────┼────┼────┼────┤
E 3 │  3 │  6 │  9 │ 12 │ 15 │  MEDIUM (5-9)
L   ├────┼────┼────┼────┼────┤
I 2 │  2 │  4 │  6 │  8 │ 10 │  LOW (<5)
H   ├────┼────┼────┼────┼────┤
O 1 │  1 │  2 │  3 │  4 │  5 │
O   └────┴────┴────┴────┴────┘
D
```

### Adding a New Risk

**Step-by-Step:**

1. Navigate to **Risks** tab
2. Click **"+ Add Risk"** button
3. Complete the form:

**Basic Information:**
| Field | Description | Example |
|-------|-------------|---------|
| Risk Code | Auto-generated | OPS-001 |
| Risk Title | Clear, concise | "Data Center Outage" |
| Description | Detailed explanation | "Unplanned downtime affecting..." |
| Category | Risk type | Operational, Technology, etc. |

**Organizational Assignment:**
| Field | Description |
|-------|-------------|
| Division | Organizational division |
| Department | Specific department |
| Owner | Person accountable for the risk |

**Inherent Assessment:**
| Field | Scale | Description |
|-------|-------|-------------|
| Likelihood | 1-5 | Probability of occurrence |
| Impact | 1-5 | Severity if it occurs |

**Likelihood Scale:**
| Score | Label | Meaning |
|-------|-------|---------|
| 1 | Rare | <10% chance in 12 months |
| 2 | Unlikely | 10-30% chance |
| 3 | Possible | 30-50% chance |
| 4 | Likely | 50-80% chance |
| 5 | Almost Certain | >80% chance |

**Impact Scale:**
| Score | Label | Meaning |
|-------|-------|---------|
| 1 | Minimal | Negligible effect |
| 2 | Low | Minor disruption, easily recovered |
| 3 | Moderate | Significant disruption, recoverable |
| 4 | High | Major disruption, difficult recovery |
| 5 | Severe | Critical impact, potential failure |

4. Click **"Save Risk"**

---

## Control Management & DIME Framework

### What is a Control?

A **control** is an action, process, or mechanism that reduces risk by:
- **Preventive**: Stops the risk from occurring
- **Detective**: Identifies when a risk event occurs
- **Corrective**: Reduces impact after occurrence

### Control Target

Each control targets either:
- **Likelihood**: Reduces the probability of occurrence
- **Impact**: Reduces the severity if it occurs

### The DIME Framework

DIME assesses control effectiveness across four dimensions:

| Dimension | Question | What It Measures |
|-----------|----------|------------------|
| **D**esign | Is it well-designed? | Appropriateness of the control for the risk |
| **I**mplementation | Is it properly implemented? | Actual deployment and operation |
| **M**onitoring | Is it actively monitored? | Ongoing oversight and tracking |
| **E**valuation | Is it regularly evaluated? | Periodic testing and improvement |

### DIME Scoring Scale (0-3)

| Score | Label | Description |
|-------|-------|-------------|
| 0 | None/Non-existent | Dimension not addressed at all |
| 1 | Weak/Inadequate | Significant gaps or deficiencies |
| 2 | Adequate | Meets minimum requirements |
| 3 | Strong/Excellent | Best practice, fully effective |

### Control Effectiveness Formula

```
Effectiveness = (D + I + M + E) / 12
```

**Result Range:** 0% to 100%

### ⚠️ CRITICAL RULE: Design and Implementation

> **If Design = 0 OR Implementation = 0, the control effectiveness is ZERO.**

**Rationale:** A control cannot work if it is:
- Not designed (D=0): No plan exists
- Not implemented (I=0): Plan exists but not deployed

**The M and E dimensions can be 0 without zeroing the effectiveness** - the control still works, but isn't monitored or evaluated.

### DIME Decision Table

| D | I | M | E | Effectiveness | Notes |
|---|---|---|---|---------------|-------|
| 0 | Any | Any | Any | **0%** | No design = no control |
| Any | 0 | Any | Any | **0%** | Not implemented = no control |
| 3 | 3 | 3 | 3 | 100% | Maximum effectiveness |
| 3 | 3 | 0 | 0 | 50% | Works but not monitored |
| 2 | 2 | 2 | 2 | 67% | Adequate across all dimensions |
| 1 | 1 | 1 | 1 | 33% | Weak but present |

### Worked Examples

**Example 1: Strong Control**
- Design: 3, Implementation: 3, Monitoring: 2, Evaluation: 2
- Effectiveness = (3+3+2+2) / 12 = 10/12 = **83%**

**Example 2: Unimplemented Control**
- Design: 3, Implementation: 0, Monitoring: 0, Evaluation: 0
- Effectiveness = **0%** (I=0 triggers zero rule)

**Example 3: Weak Control**
- Design: 1, Implementation: 1, Monitoring: 1, Evaluation: 0
- Effectiveness = (1+1+1+0) / 12 = 3/12 = **25%**

### Residual Risk Calculation

The system calculates residual risk using:

```
Residual = GREATEST(1, Inherent - ROUND((Inherent - 1) × MAX_Effectiveness))
```

**Key Points:**
- Uses the **MAXIMUM** effectiveness of controls targeting each dimension
- **Likelihood controls** reduce residual likelihood
- **Impact controls** reduce residual impact
- Residual cannot go below 1

**Example:**
- Inherent: L=4, I=5 (Score=20, EXTREME)
- Likelihood control: 75% effective
- Impact control: 50% effective

Calculation:
- Residual L = max(1, 4 - round((4-1) × 0.75)) = max(1, 4 - 2) = 2
- Residual I = max(1, 5 - round((5-1) × 0.50)) = max(1, 5 - 2) = 3
- Residual Score = 2 × 3 = **6 (MEDIUM)**

---

## Key Risk Indicators (KRIs) & Key Control Indicators (KCIs)

### What are KRIs and KCIs?

| Type | Full Name | Purpose | Targets |
|------|-----------|---------|---------|
| **KRI** | Key Risk Indicator | Early warning signal | **Likelihood** |
| **KCI** | Key Control Indicator | Control performance measure | **Impact** |

### KRI Examples by Category

| Category | KRI Example | Threshold Example |
|----------|-------------|-------------------|
| Technology | System uptime % | Green: >99.5%, Yellow: 99-99.5%, Red: <99% |
| Operational | Process error rate | Green: <1%, Yellow: 1-3%, Red: >3% |
| Financial | Liquidity ratio | Green: >1.5, Yellow: 1.2-1.5, Red: <1.2 |
| Compliance | Audit findings open | Green: <5, Yellow: 5-10, Red: >10 |

### Threshold Configuration

Each KRI/KCI has threshold levels:

```
┌─────────────────────────────────────────────────────┐
│                    RED (Critical)                    │
│  ───────────── Red Upper Threshold ─────────────    │
│                  YELLOW (Warning)                    │
│  ───────────── Yellow Upper Threshold ──────────    │
│                   GREEN (Normal)                     │
│  ───────────── Yellow Lower Threshold ──────────    │
│                  YELLOW (Warning)                    │
│  ───────────── Red Lower Threshold ─────────────    │
│                    RED (Critical)                    │
└─────────────────────────────────────────────────────┘
```

### Traffic Light Status

| Status | Color | Meaning | Action Required |
|--------|-------|---------|-----------------|
| GREEN | 🟢 | Within normal limits | Continue monitoring |
| YELLOW | 🟡 | Approaching threshold | Investigate, prepare response |
| RED | 🔴 | Threshold breached | Immediate escalation required |

### Adding KRI Data

1. Navigate to the risk with linked KRIs
2. Click on the **KRI** section
3. Enter the current value
4. System automatically:
   - Calculates status (GREEN/YELLOW/RED)
   - Records breach if threshold exceeded
   - Updates risk appetite status

---

## Risk Appetite Framework

### Understanding Risk Appetite

**Risk Appetite** is the amount and type of risk an organization is willing to accept in pursuit of its objectives.

### Enterprise Appetite Levels

| Level | Label | Enterprise Meaning |
|-------|-------|-------------------|
| **ZERO** | No Tolerance | Risks threatening regulatory licence, solvency, or fundamental trust are not acceptable under any circumstances |
| **LOW** | Low Tolerance | Only limited, short-duration exposure acceptable; breaches require immediate escalation and remediation |
| **MODERATE** | Moderate Tolerance | Managed volatility is acceptable within approved limits and controls |
| **HIGH** | High Tolerance | Willingness to accept material volatility in pursuit of strategic objectives |

### Appetite Categories

Organizations define appetite by risk category:

| Category | Typical Appetite | Rationale |
|----------|------------------|-----------|
| Compliance | ZERO | Regulatory breaches unacceptable |
| Reputation | LOW | Protect brand and trust |
| Operational | MODERATE | Accept some process variability |
| Strategic | HIGH | Accept volatility for growth |

### Tolerance Metrics

Each appetite category has measurable tolerance metrics:

**Example: Operational Risk Appetite = MODERATE**

| Metric | Target | Yellow Threshold | Red Threshold |
|--------|--------|------------------|---------------|
| System Downtime | <4 hrs/month | 4-8 hrs | >8 hrs |
| Process Errors | <1% | 1-3% | >3% |
| Incident Count | <5/month | 5-10 | >10 |

### Appetite Status Calculation

The system calculates appetite status by:

1. Checking all linked KRIs against their thresholds
2. Aggregating to tolerance level
3. Rolling up to category level
4. Computing overall enterprise status

**Traffic Light Rules:**
- Any RED KRI → Category status = RED
- Any YELLOW KRI (no RED) → Category status = YELLOW
- All GREEN → Category status = GREEN

### Breach Management

When a tolerance breach occurs:

1. **Detection**: System identifies threshold violation
2. **Alert**: Notifications sent to relevant stakeholders
3. **Escalation**: Based on severity (CRO for Red breaches)
4. **Remediation**: Action plan documented
5. **Resolution**: Breach closed with approval

---

## Incident Management

### What is an Incident?

An **incident** is an event that has occurred and may indicate a risk materializing or control failure.

### Incident Types

| Type | Description | Examples |
|------|-------------|----------|
| Near Miss | Almost happened | System nearly failed |
| Operational | Process/system failure | Outage, error |
| Security | Information security | Breach, unauthorized access |
| Compliance | Regulatory issue | Violation, audit finding |
| Financial | Monetary loss | Fraud, error |

### Incident Severity

| Level | Label | Description |
|-------|-------|-------------|
| 1 | Minor | Minimal impact, easily resolved |
| 2 | Low | Limited impact, normal resolution |
| 3 | Moderate | Significant impact, requires attention |
| 4 | High | Major impact, senior attention required |
| 5 | Critical | Severe impact, immediate executive attention |

### Reporting an Incident

**Any user can report an incident:**

1. Navigate to **Incidents** tab
2. Click **"+ Report Incident"**
3. Complete the form:
   - **Title**: Clear description
   - **Description**: What happened, when, where
   - **Type**: Select incident type
   - **Severity**: 1-5 scale
   - **Date**: When it occurred
   - **Financial Impact**: If applicable (optional)

4. Click **"Submit"**

### Visibility Scopes

| Scope | Who Can See |
|-------|-------------|
| **Reporter Only** | Only the person who reported |
| **Department** | Reporter's department members |
| **Organization** | All organization users |

### Linking Incidents to Risks

Incidents can be linked to risks to:
- Track risk materialization
- Support root cause analysis
- Validate risk assessments
- Justify control improvements

**To link:**
1. Open the incident
2. Click **"Link to Risks"**
3. Select relevant risks
4. Add reasoning (optional)

### Incident Lifecycle

```
┌─────────┐   ┌────────────┐   ┌──────────┐   ┌────────┐
│ REPORTED │ → │ INVESTIGATING │ → │ RESOLVED │ → │ CLOSED │
└─────────┘   └────────────┘   └──────────┘   └────────┘
                    ↓
              ┌─────────┐
              │  VOIDED │ (Admin only - erroneous entry)
              └─────────┘
```

---

## Risk Analytics & Reports

### Risk Heatmap

**Features:**
- 5×5 or 6×6 matrix display
- Toggle Inherent/Residual view
- Filter by division, department, category, owner
- Period selector for historical views
- Export as PNG/JPEG

**Color Coding:**
| Risk Level | Color | Score Range |
|------------|-------|-------------|
| Extreme | 🔴 Red | ≥15 |
| High | 🟠 Orange | 10-14 |
| Medium | 🟡 Yellow | 5-9 |
| Low | 🟢 Green | <5 |

### Period Comparison

Compare risk profiles between two periods:
1. Select Period 1 (earlier)
2. Select Period 2 (later)
3. View side-by-side heatmaps
4. See risk migration analysis

### Trend Analysis

Track metrics over time:
- Risk count by level
- Average inherent/residual scores
- Control effectiveness trends
- Incident frequency

### Export Reports

Available report formats:
- **Board Report**: Executive summary for governance
- **Regulatory Report**: Detailed compliance documentation
- **CEO Report**: Strategic risk overview
- **Custom Export**: CSV/Excel data export

---

## Risk Intelligence

### Overview

Risk Intelligence uses AI to:
- Monitor external threat feeds
- Analyze relevance to your risks
- Generate actionable alerts
- Suggest control improvements

### RSS Feed Sources

**Built-in Categories:**
| Category | Sources |
|----------|---------|
| Cybersecurity | CISA, NIST, security vendors |
| Regulatory | Central banks, regulators |
| Market | Financial news, economic data |
| Technology | Tech news, vulnerability feeds |

### Alert Workflow

1. **Event Detected**: RSS feeds scanned
2. **AI Analysis**: Claude AI matches to risks
3. **Alert Created**: With confidence score
4. **Review**: Admin reviews alert
5. **Action**: Accept (apply) or Reject

### Alert Actions

| Action | Effect |
|--------|--------|
| **Accept** | Risk updated, treatment log entry created |
| **Reject** | Alert dismissed with reason |
| **Undo** | Reverts accepted alert changes |
| **Archive** | Moves to historical records |

---

## Period Management

### Understanding Periods

MinRisk uses quarterly periods (Q1-Q4) for:
- Organizing risk assessments
- Creating historical snapshots
- Trend analysis
- Regulatory reporting

### Current vs Historical Periods

| Period Type | Editable | Purpose |
|-------------|----------|---------|
| **Current** | ✅ Yes | Active work period |
| **Historical** | ❌ No | Immutable snapshots |

### Period Commit Process

**When to Commit:**
- End of each quarter
- Before presenting to board
- After completing assessments

**How to Commit (Admin only):**

1. Navigate to **Admin → Period Management**
2. Review current period summary
3. Add notes (optional)
4. Click **"Commit Period"**
5. Confirm the action

**What Happens:**
- All risks snapshotted to history
- Residual scores calculated and stored
- Period advances to next quarter
- Risks remain editable (continuous model)

---

## Administrator Guide

### User Management

**Approving New Users:**
1. Admin → User Management
2. Review pending users
3. Click **Approve** or **Reject**
4. Assign role (User, Risk Manager, Admin)

**Changing Roles:**
1. Find user in list
2. Select new role
3. Click **Update**

### Risk Configuration

**DIME Labels:**
Customize labels for your organization's terminology.

**Matrix Size:**
Choose 5×5 or 6×6 risk matrix.

**Risk Categories:**
Add or modify risk category definitions.

### RSS Feed Management

**Adding Sources:**
1. Admin → Risk Intelligence → Sources
2. Click **Add Source**
3. Enter RSS URL and category
4. Configure keywords

**Managing Keywords:**
Define keywords for AI matching by category.

### Data Cleanup

**Reset Operational Data:**
⚠️ Removes all risks, controls, incidents, KRIs
- Preserves users and configuration
- Requires confirmation

---

## Import/Export Data

### Bulk Import

**Supported Formats:**
- Risks: CSV with specified columns
- Controls: CSV with DIME scores

**Template Available:**
Download template from Import dialog.

### Export Options

| Export Type | Format | Contents |
|-------------|--------|----------|
| Risk Register | CSV | All risk data |
| Controls | CSV | All control data |
| Full Report | PDF | Complete assessment |

---

## Best Practices

### Risk Assessment

✅ **DO:**
- Base likelihood on data/expert judgment
- Consider worst-case impact
- Reassess quarterly
- Document reasoning

❌ **DON'T:**
- Guess randomly
- Always use "Medium"
- Overstate to get attention

### Control Management

✅ **DO:**
- Be honest with DIME scores
- Update scores when controls change
- Test controls regularly
- Document evidence

❌ **DON'T:**
- Claim 100% effectiveness without proof
- Add controls just to lower scores
- Ignore monitoring requirements

### Period Management

✅ **DO:**
- Commit periods regularly (quarterly)
- Add meaningful notes
- Review data quality before commit

❌ **DON'T:**
- Skip period commits
- Commit without review
- Forget to communicate to team

---

## Troubleshooting

### Common Issues

**Issue: Can't see Risk Intelligence tab**
- Cause: Requires Admin role
- Solution: Contact your admin

**Issue: Risk not saving**
- Cause: Required fields missing
- Solution: Check for red validation messages

**Issue: Residual score not updating**
- Cause: Control missing D or I score
- Solution: Ensure Design and Implementation are ≥1

**Issue: KRI not showing status**
- Cause: Thresholds not configured
- Solution: Set Yellow and Red thresholds

**Issue: Export not working**
- Cause: Pop-up blocked
- Solution: Allow pop-ups for MinRisk

---

## Glossary

| Term | Definition |
|------|------------|
| **Control Effectiveness** | Percentage measure of how well a control reduces risk (0-100%) |
| **DIME** | Design, Implementation, Monitoring, Evaluation - framework for assessing controls |
| **Inherent Risk** | Risk level assuming no controls exist |
| **KCI** | Key Control Indicator - measures control performance |
| **KRI** | Key Risk Indicator - early warning signal for risk |
| **Likelihood** | Probability of a risk event occurring (1-5) |
| **Impact** | Severity of consequences if risk occurs (1-5) |
| **Residual Risk** | Risk level after controls are applied |
| **Risk Appetite** | Amount of risk an organization is willing to accept |
| **Risk Tolerance** | Measurable boundaries for acceptable variation |

---

## FAQ

### General

**Q: Can I delete a risk?**
A: Risks are closed, not deleted. Set status to CLOSED.

**Q: Can I edit historical data?**
A: No. Historical snapshots are immutable.

**Q: What happens when I change inherent scores?**
A: Residual scores recalculate automatically.

### DIME & Controls

**Q: Why is my control effectiveness 0%?**
A: Design or Implementation score is 0. Both must be ≥1.

**Q: How many controls should a risk have?**
A: EXTREME/HIGH: 3-5, MEDIUM: 2-3, LOW: 1-2

**Q: Can I use the same control for multiple risks?**
A: Create separate control entries for clear accountability.

### Periods

**Q: What happens when I commit a period?**
A: Snapshot created, risks remain editable, period advances.

**Q: Can I undo a period commit?**
A: No. Period commits are permanent.

**Q: Can I work in two periods at once?**
A: No. Only one active period at a time.

---

**Document Version:** 3.0  
**Last Updated:** January 2026  
**Contact:** support@minrisk.com
