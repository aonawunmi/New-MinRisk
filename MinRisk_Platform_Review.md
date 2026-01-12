# MinRisk Enterprise Risk Management Platform
## Professional Platform Review and Capability Assessment

**Document Purpose:** This document provides a comprehensive, structured review of the MinRisk platform's implemented capabilities for evaluation by regulators, capital-market operators, financial institutions, and board-level decision-makers.

---

# 1. Executive Overview

## What MinRisk Is

MinRisk is a purpose-built enterprise risk management platform designed for regulated financial institutions and capital-market operators. It provides a unified system for identifying, assessing, controlling, monitoring, and reporting enterprise-wide risks with full governance controls, audit trails, and regulatory defensibility.

The platform implements a continuous risk evolution model where risks are persistent entities that evolve over time, rather than being recreated each reporting period. This architecture ensures complete traceability from risk inception through all subsequent changes, reviews, and period-end attestations.

## The Problem Class It Solves

MinRisk addresses fundamental deficiencies in how regulated institutions manage operational and strategic risk:

1. **Fragmented Risk Data:** Most institutions maintain risk registers in spreadsheets, disconnected control databases, and siloed incident systems. MinRisk provides a single source of truth with enforced relationships between risks, controls, indicators, incidents, and appetite thresholds.

2. **Absent Governance Trails:** Regulatory examinations require institutions to demonstrate who made decisions, when, and based on what information. MinRisk maintains comprehensive audit trails at database level with automatic logging of all changes to risks, controls, and user actions.

3. **Manual Threshold Monitoring:** Traditional systems require manual comparison of KRI values against tolerance thresholds. MinRisk implements automated RAG status calculation across four metric types (Range, Maximum, Minimum, Directional) with breach detection and escalation workflows.

4. **Period-End Chaos:** Quarterly risk reporting typically involves manual data extraction, snapshot creation, and version control challenges. MinRisk provides automated period commits that create immutable historical snapshots with full quarter-over-quarter comparison capabilities.

5. **Disconnected Intelligence:** External events that should inform risk assessments remain in news feeds rather than being systematically linked to specific risks. MinRisk provides AI-powered intelligence scanning that maps external events to internal risk profiles with suggested rating changes.

## Why It Is Differentiated

**Versus Spreadsheets:**
MinRisk eliminates version control problems, provides multi-user concurrent access with row-level security, enforces data integrity through foreign key relationships, and maintains automatic audit trails that spreadsheets cannot provide.

**Versus Generic GRC Tools:**
Unlike broad governance platforms that treat risk as one of many compliance modules, MinRisk is purpose-built for risk management with deep functionality in controls effectiveness scoring (DIME framework), residual risk calculation, appetite/tolerance hierarchy, and KRI threshold management.

**Versus Legacy ERM Software:**
MinRisk implements modern architecture patterns including continuous risk evolution (no period-end cloning), AI-assisted classification and control recommendations, and real-time external intelligence integration that legacy systems cannot replicate without fundamental redesign.

---

# 2. System Philosophy and Design Principles

## How MinRisk Defines Risk

MinRisk implements a structured risk definition model with three required components:

1. **Event:** The risk event that could occur, described in clear business language
2. **Root Cause:** The underlying condition, failure, or vulnerability that enables the event (linked from a controlled library)
3. **Impact:** The consequence or outcome if the event materializes (linked from a controlled library)

This structure enforces consistency in risk articulation, enables pattern analysis across the risk register, and supports AI-assisted classification against the institution's controlled taxonomy.

Risks are classified into categories and subcategories using an organization-configurable taxonomy. The system supports both fixed taxonomies (e.g., Basel II/III categories) and custom taxonomies tailored to specific business models.

## Governance-First Architecture

Every aspect of MinRisk is designed with governance requirements as primary constraints:

**Role-Based Access Control:**
- Primary Admin: Full system access including user management, taxonomy configuration, period management
- Secondary Admin: Risk register management, control administration, incident review
- Standard User: Risk creation, control documentation, KRI data entry within assigned scope

**Organization Isolation:**
Row-Level Security (RLS) policies at database level ensure complete data isolation between organizations. All queries automatically filter to the authenticated user's organization without application-level enforcement.

**Approval Workflows:**
Critical actions require appropriate authorization levels. User status changes, risk appetite statements, and period commits require admin approval. The system tracks approver identity and timestamp for regulatory examination.

## Auditability, Traceability, and Regulatory Defensibility

**Automatic Audit Logging:**
Database triggers automatically capture all changes to core entities (risks, controls, user profiles) without application-level instrumentation. Audit records include:
- User identity (email and profile ID)
- Action type (CREATE, UPDATE, DELETE)
- Entity type and identifier
- Previous values (for updates)
- New values
- Timestamp with timezone
- Optional metadata (IP address, reason codes)

**Change History for All Entities:**
Every modification to a risk, control, KRI definition, or user profile is preserved. The system never overwrites historical data—only appends new versions while maintaining references to previous states.

**Exportable Audit Trail:**
Audit records can be filtered by date range, entity type, user, and action type, then exported to CSV for regulatory submission or internal compliance review.

**Period Commits as Attestation Points:**
Quarterly period commits create immutable snapshots of the entire risk register, control inventory, and KRI status. These snapshots serve as attestation points for regulatory reporting and board certification.

---

# 3. Core Functional Modules

## 3.1 Risk Register and Taxonomy Management

### Purpose
Maintain the authoritative register of identified risks with structured classification, ownership assignment, and scoring.

### Key Features

**Structured Risk Identification:**
- Unique risk codes auto-generated using organization-specific prefix patterns (e.g., FIN-CRE-001)
- Mandatory fields: title, description, category, division, department, owner, likelihood, impact
- Optional linking to root cause library and impact library entries
- AI-assisted risk statement refinement

**Taxonomy-Driven Classification:**
- Configurable category and subcategory hierarchy
- Support for Basel II/III operational risk categories as seed data
- Ability to extend taxonomy with institution-specific categories
- AI classification that maps user-entered risk descriptions to controlled taxonomy

**5x5 or 6x6 Risk Matrix:**
- Inherent risk scoring using likelihood (1-5 or 1-6) and impact (1-5 or 1-6) dimensions
- Residual risk calculation based on control effectiveness
- Risk level determination (Low, Medium, High, Extreme) with configurable thresholds

**Risk Ownership:**
- Owner assignment with lookup against user profile database
- Division and department attribution for portfolio analysis
- Owner mapping tools for bulk reassignment

### What Makes It Enterprise-Grade
- Database-level locking for code generation prevents duplicates under concurrent load
- RLS policies ensure users only see risks within their authorization scope
- Soft delete preserves historical records while hiding from active views
- Full-text search across risk titles and descriptions

### Why It Matters to a Buyer
A well-structured risk register is the foundation of effective risk management. MinRisk ensures consistency in how risks are described, classified, and owned—eliminating the fragmentation and inconsistency that regulators cite as control weaknesses.

---

## 3.2 Root Cause and Impact Libraries

### Purpose
Provide controlled vocabularies for root causes and impacts that ensure consistency across risk articulation and enable aggregate analysis.

### Key Features

**Hybrid Library Architecture:**
- Master library entries seeded from industry standards (configurable per organization type)
- Organization-specific entries created by users
- Entries can be linked to multiple risks

**Approval Workflow:**
- User-submitted entries start in DRAFT status
- Admin review and approval required before entries become ACTIVE
- Retired entries preserved for historical risk interpretation

**Industry Tagging:**
- Library entries tagged by applicable industry
- Filtering ensures organizations only see relevant entries

### What Makes It Enterprise-Grade
- Junction table architecture allows many-to-many relationships (one root cause can apply to multiple risks)
- Master entries are shared across organizations while preserving tenant isolation for custom entries
- Historical linkages preserved when entries are retired

### Why It Matters to a Buyer
Regulatory examiners and auditors expect consistent risk articulation. Controlled libraries ensure that similar risks are described using standard terminology, enabling aggregate reporting and trend analysis.

---

## 3.3 Controls Library and Effectiveness Tracking

### Purpose
Document and assess the effectiveness of controls that mitigate identified risks using a structured scoring framework.

### Key Features

**Control Documentation:**
- Unique control codes auto-generated (CTRL-001, CTRL-002, etc.)
- Control type classification (Preventive, Detective, Corrective)
- Target dimension (Likelihood, Impact, or Both)
- Detailed description with owner assignment

**DIME Effectiveness Framework:**
Controls are scored across four dimensions on a 0-3 scale:
- **Design:** Is the control appropriately designed to address the risk?
- **Implementation:** Is the control fully implemented and operational?
- **Monitoring:** Is the control monitored for ongoing effectiveness?
- **Evaluation:** Is the control periodically evaluated for relevance?

Effectiveness = (Design + Implementation + Monitoring + Evaluation) / 12

Special rule: If Design = 0 OR Implementation = 0, overall effectiveness = 0 (a control cannot be effective if not designed or implemented).

**Residual Risk Calculation:**
The system calculates residual risk using control effectiveness:
```
Residual = GREATEST(1, Inherent - ROUND((Inherent - 1) × Max_Effectiveness))
```
When multiple controls target the same dimension (likelihood or impact), only the most effective control is used for calculation—reflecting that controls do not stack multiplicatively.

**Control-to-Risk Linking:**
- Many-to-many relationship: one control can mitigate multiple risks
- Controls exist independently of risks (not deleted when risk is removed)
- Link auditing tracks when and by whom controls were associated/disassociated

**AI Control Recommendations:**
- AI suggests controls based on risk characteristics
- Suggestions include DIME scoring rationale
- Users can accept, modify, or reject suggestions

### What Makes It Enterprise-Grade
- Structured scoring framework provides consistent assessment methodology
- Residual calculation documented and auditable
- Independence of controls from risks enables enterprise-wide control inventory

### Why It Matters to a Buyer
Regulators require institutions to demonstrate that controls are not just documented but assessed for effectiveness. The DIME framework provides a defensible, consistent methodology for control assessment that can be explained to examiners.

---

## 3.4 KRI Definitions, Data Entry, and Threshold Management

### Purpose
Define key risk indicators, capture periodic measurements, calculate alert status, and manage threshold breaches.

### Key Features

**KRI Definitions:**
- Unique codes auto-generated (KRI-001, KRI-002, etc.)
- Indicator type classification (Leading, Lagging, Concurrent)
- Measurement unit and collection frequency specification
- Threshold configuration (upper, lower, target values)
- Threshold direction (above is bad, below is bad, between is acceptable)

**Data Entry:**
- Periodic value capture with measurement date
- Data quality flagging (Verified, Estimated, Provisional)
- Entry notes for context
- Automatic alert status calculation upon entry

**Alert Status Calculation:**
Values are evaluated against thresholds to generate Green/Yellow/Red status:
- Green: Within acceptable range
- Yellow: Warning level (approaching threshold)
- Red: Threshold breached

**Alert Lifecycle:**
- Alerts created automatically when thresholds breached
- Status progression: Open → Acknowledged → Resolved/Dismissed
- Acknowledgment and resolution require notes
- Alert history preserved for trend analysis

**Risk Linking:**
- KRIs can be linked to multiple risks
- AI-suggested confidence scores for automated linkages
- Many-to-many relationship through junction tables

### What Makes It Enterprise-Grade
- Database-level code generation with locking
- Automatic alert creation prevents manual oversight
- Complete lifecycle management with audit trail
- Threshold calculation handles edge cases (null values, directional metrics)

### Why It Matters to a Buyer
KRIs are early warning mechanisms that regulators expect institutions to define, monitor, and act upon. MinRisk provides end-to-end KRI lifecycle management with documented thresholds, captured measurements, and auditable response actions.

---

## 3.5 Risk Appetite, Tolerance, and Limits Framework

### Purpose
Implement the hierarchical risk appetite framework from board-level statements through category-specific tolerances to metric-level thresholds.

### Key Features

**Risk Appetite Statements:**
- Version-controlled board statements with effective dates
- Status workflow: DRAFT → APPROVED → SUPERSEDED → ARCHIVED
- Approval tracking with approver identity and timestamp
- Full statement audit trail

**Appetite Categories:**
- Risk categories mapped to appetite levels (Zero, Low, Moderate, High)
- Rationale documentation for each category assignment
- Linkage to parent appetite statement

**Tolerance Metrics (Early Warning Thresholds):**
Metrics define quantitative boundaries within appetite categories:
- Four metric types supported:
  - **Maximum:** Lower is better (e.g., NPL ratio)—Green ≤ threshold ≤ Amber ≤ Red
  - **Minimum:** Higher is better (e.g., capital ratio)—Green ≥ threshold ≥ Amber ≥ Red
  - **Range:** Value should stay within bounds—Green within range, Amber approaching limits, Red outside
  - **Directional:** Rate of change matters—evaluates trend against allowed change percentage
- Threshold validation enforces continuity (no gaps or overlaps between zones)
- Materiality type (Internal, External, Dual) for dual-materiality reporting

**AI-Generated Metrics:**
- AI suggests tolerance metrics based on selected appetite category and linked KRIs
- Suggestions include appropriate threshold values and rationale
- Users review and accept, modify, or reject

**Enterprise Appetite Status:**
Real-time calculation of overall appetite status:
- Aggregates status across all categories
- Category status derived from worst metric status
- Summary counts (Red/Amber/Green/Unknown) for dashboard

**Breach Management:**
- Automatic breach detection when values exceed thresholds
- Breach types: Warning (Amber) and Breach (Red)
- Escalation workflows with acknowledgment and resolution tracking
- Board acceptance option for temporary threshold exceptions

### What Makes It Enterprise-Grade
- Complete appetite chain from statement through metrics
- Validation ensures logical threshold configuration
- Four metric types handle different measurement scenarios
- Enterprise roll-up provides board-level view

### Why It Matters to a Buyer
Risk appetite is a governance fundamental that regulators examine closely. MinRisk provides the complete chain from board statement through quantitative thresholds, with documented linkages that demonstrate how high-level appetite translates to operational limits.

---

## 3.6 Incident and Breach Management

### Purpose
Capture, classify, investigate, and link operational incidents to the risk register for continuous improvement.

### Key Features

**Incident Capture:**
- User submission with categorization (type, severity, status)
- Auto-generated incident codes
- Detailed description with supporting information
- Reporter identity automatically captured

**Status Workflow:**
- Status progression: OPEN → UNDER_INVESTIGATION → RESOLVED → CLOSED
- Status changes restricted to admin users (enforced by database trigger)
- Amendment history for description changes with reason tracking

**AI-Powered Risk Mapping:**
- AI analyzes incident description against existing risk register
- Generates mapping suggestions with confidence scores
- Suggestions include:
  - Matching risk code and title
  - Confidence score (0-100)
  - Reasoning for suggested match
  - Keywords extracted from incident
- Admin review workflow: Accept/Reject with notes
- Accepted mappings create incident-risk links with full audit trail

**Manual Risk Linking:**
- Direct linking of incidents to risks without AI
- Link type classification
- Unlinking with reason documentation

**Mapping History:**
- Complete audit trail of all mapping decisions
- Records source (USER_MANUAL, ADMIN_MANUAL, AI_SUGGESTION_ACCEPTED)
- Preserves historical linkages when removed

**Incident Statistics:**
- Dashboard metrics: by status, by type, by severity
- Trend analysis over time

### What Makes It Enterprise-Grade
- AI assistance reduces classification burden while maintaining human oversight
- Complete audit trail of all mapping decisions
- Database trigger enforcement of status change permissions
- Amendment tracking for regulatory examination

### Why It Matters to a Buyer
Incidents are leading indicators of control failures and risk materialization. MinRisk ensures incidents are systematically linked to risks, enabling root cause analysis and control improvement. AI assistance accelerates classification without sacrificing governance.

---

## 3.7 Portfolio-Level Risk Views and Analytics

### Purpose
Provide aggregated views, heatmaps, trend analysis, and executive dashboards for portfolio-level risk oversight.

### Key Features

**Dashboard Metrics:**
- Total risk count with breakdown by status, level, division, category
- Priority risk count and filtering
- Average inherent and residual scores
- Control inventory metrics
- Control effectiveness averages

**Risk Heatmap:**
- 5x5 or 6x6 matrix visualization
- Inherent view shows pre-control positions
- Residual view shows post-control positions
- Click-through to risk details from cells
- Historical heatmap from committed period snapshots

**Enhanced Heatmap:**
- Transition arrows showing movement from inherent to residual position
- Bubble sizing based on risk count per cell
- Risk code tooltips on hover

**Top Risks Analysis:**
- Ranked list by score with configurable limit
- Includes inherent and residual scores
- Category and division attribution

**Risk Distribution Charts:**
- Distribution by division, category, status, level
- Percentage calculations for each segment

**Trend Analysis:**
- Risk count over periods
- Score averages over periods
- Status transitions over time

**Period Comparison:**
- Side-by-side comparison of two committed periods
- New risks, closed risks, and changed risks identified
- Score change summaries

### What Makes It Enterprise-Grade
- Historical views use immutable snapshots, not reconstructed data
- Residual calculations include control effectiveness
- All aggregations respect RLS boundaries

### Why It Matters to a Buyer
Board and executive oversight requires portfolio-level views. MinRisk provides the visualizations and metrics that support risk committee reporting, regulatory submissions, and board certifications.

---

## 3.8 Governance, Approvals, and Audit Trails

### Purpose
Enforce governance requirements through role-based access, approval workflows, and comprehensive audit logging.

### Key Features

**User Management:**
- Invitation-based user provisioning
- Role assignment (Primary Admin, Secondary Admin, User)
- User status workflow (Pending, Active, Suspended, Deactivated)
- Admin approval required for user activation

**Audit Trail:**
- Automatic logging of all entity changes via database triggers
- Manual logging for administrative actions (approvals, bulk operations)
- Searchable by user, action type, entity type, date range
- Exportable to CSV for regulatory submission

**Change Details:**
- Before/after values captured for updates
- Formatted display for human review
- Filterable to exclude routine entity types

### What Makes It Enterprise-Grade
- Database-trigger logging cannot be bypassed by application code
- Complete trail even for direct database modifications
- Export capability for external auditor review

### Why It Matters to a Buyer
Regulatory examinations require demonstration of governance controls. MinRisk provides the audit trail that proves who did what, when, and what changed—satisfying examiner requirements without manual record-keeping.

---

## 3.9 Period Management and Historical Archiving

### Purpose
Manage quarterly reporting periods with immutable snapshots that preserve point-in-time risk positions for historical comparison.

### Key Features

**Continuous Risk Evolution:**
- Risks persist across periods (no cloning)
- All changes tracked with timestamps
- Current state always reflects latest position

**Period Commits:**
- Admin action to commit current period
- Creates immutable snapshot in risk_history table
- Captures: risk details, scores, control counts, KRI counts, incident counts
- Residual scores calculated and stored at commit time
- Commit notes for context

**Historical Snapshots:**
- Query risk position as of any committed period
- Compare current state to historical snapshot
- View risk timeline across all periods

**Period Comparison:**
- Identify new risks (present in period 2, absent in period 1)
- Identify closed risks (present in period 1, absent in period 2)
- Calculate score changes for persistent risks
- Summary statistics for board reporting

**Active Period Management:**
- Organization-level setting for current reporting period
- Admin controls for period advancement
- Prevents accidental commits to wrong period

### What Makes It Enterprise-Grade
- Immutable snapshots cannot be modified after commit
- Comparison logic handles all edge cases (new, closed, changed)
- Residual calculation at commit time preserves point-in-time accuracy

### Why It Matters to a Buyer
Quarterly risk reporting is a governance baseline. MinRisk automates snapshot creation, ensures consistency between periods, and provides the quarter-over-quarter comparisons that boards and regulators require.

---

## 3.10 Risk Intelligence and External Event Scanning

### Purpose
Monitor external events and assess their relevance to the internal risk register using AI-powered analysis.

### Key Features

**RSS Feed Configuration:**
- Configurable external sources (news feeds, regulatory publications, industry alerts)
- Category filtering to focus on relevant content
- Recommended sources for common institution types

**External Event Capture:**
- Automated or manual event creation
- Duplicate detection to prevent redundant entries
- Event metadata: source, type, title, summary, URL, published date

**AI Relevance Analysis:**
- Automated scanning of events against risk register
- Claude AI evaluates each event against each risk
- Analysis outputs:
  - Relevance determination (yes/no)
  - Confidence score (0-100)
  - Suggested likelihood change (-2 to +2)
  - Suggested impact change (-2 to +2)
  - Reasoning explanation

**Intelligence Alerts:**
- Alerts created for relevant event-risk pairings
- Status workflow: Pending → Accepted/Rejected
- Accept action applies suggested changes to risk
- Reject action documents decision rationale

**Treatment Logging:**
- Complete history of alert treatment decisions
- Before/after values when changes applied
- Audit trail for regulatory examination

**Bulk Operations:**
- Cleanup duplicate events
- Bulk delete old events
- Filter events by source, type, date range

### What Makes It Enterprise-Grade
- Edge function architecture keeps API keys secure
- AI analysis is transparent (reasoning visible)
- Human review required before changes applied
- Complete treatment audit trail

### Why It Matters to a Buyer
Risk registers become stale without external input. MinRisk systematically monitors the external environment and suggests updates, ensuring the risk register reflects current conditions rather than historical assumptions.

---

## 3.11 AI-Assisted Risk Classification and Suggestions

### Purpose
Accelerate risk identification and assessment using AI while maintaining human oversight and governance.

### Key Features

**Risk Statement Classification:**
- Classifies user-entered risk statements against controlled taxonomy
- Maps to category and subcategory with confidence level
- Provides explanation for classification decision
- Normalizes statement to standard format

**Risk Statement Refinement:**
- Improves clarity and professionalism of risk descriptions
- Lists specific improvements made
- Preserves user's selected category/subcategory

**AI Risk Generation:**
- Generates risk suggestions based on industry, business unit, category
- Suggestions include all required fields (title, description, scores)
- Rationale provided for each suggestion
- User reviews and accepts, modifies, or rejects

**AI Control Recommendations:**
- Suggests controls based on risk characteristics
- Includes DIME scoring for each suggested control
- Provides rationale for control design and effectiveness

**Demo Mode:**
- Fallback when AI service unavailable
- Generates plausible suggestions for testing/demonstration
- Clearly marked as demo content

### What Makes It Enterprise-Grade
- AI assists but does not decide—human approval required
- Taxonomy-aware classification respects organization structure
- Confidence indicators help users assess suggestion quality

### Why It Matters to a Buyer
AI reduces friction in risk identification while maintaining governance. Users complete risk assessments faster, but all AI outputs require human review before affecting the register.

---

# 4. Regulatory and Board Value

## Supporting Risk-Based Supervision

MinRisk provides the data structures and reporting capabilities that risk-based supervisory frameworks require:

**Complete Risk Inventory:** All identified risks documented with consistent classification, ownership, and scoring

**Control Mapping:** Clear linkages between risks and mitigating controls with effectiveness assessments

**KRI Monitoring:** Defined indicators with thresholds, captured measurements, and alert management

**Incident Linkage:** Operational events systematically connected to the risks they relate to

**Appetite Quantification:** Board statements translated to measurable thresholds with breach detection

## Supporting Board Risk Oversight

MinRisk generates the artifacts boards need for effective oversight:

**Portfolio Dashboards:** Aggregated views of risk positions, trends, and control effectiveness

**Period Comparisons:** Quarter-over-quarter changes documented for board review

**Appetite Status Reports:** Enterprise-wide appetite position with category-level drill-down

**KRI Alerts:** High-priority indicators flagged for board attention

**Incident Summaries:** Operational event patterns and risk linkages

## Supporting Supervisory Reviews

MinRisk provides what examiners request:

**Audit Trails:** Complete history of all changes with user attribution

**Policy Evidence:** Risk appetite statements, approval workflows, governance controls

**Assessment Documentation:** Control effectiveness scoring methodology and results

**Alert Management:** Threshold breach detection and response documentation

**Historical Comparability:** Committed period snapshots for trend verification

## Supporting Regulatory Reporting

MinRisk structures data for regulatory submission:

**Taxonomy Alignment:** Configurable to Basel, local regulatory, or custom taxonomies

**Export Capability:** Data extraction in standard formats (CSV, structured reports)

**Period Boundaries:** Clear demarcation of reporting periods with attestation points

**Dual Materiality:** Internal and external impact tracking for sustainability reporting requirements

---

# 5. Commercial Buyer Use Cases

## Regulators and Central Banks

**Use Case:** Supervisory technology for regulated institutions

- Deploy MinRisk as standard tool for regulated entities
- Ensure consistent risk reporting across supervised institutions
- Validate risk appetite frameworks during examinations
- Access audit trails during supervisory reviews

## Exchanges and Market Operators

**Use Case:** Enterprise risk management for market infrastructure

- Manage operational risks across trading, clearing, settlement, and technology
- Track KRIs for market availability, order latency, and settlement efficiency
- Document controls for market surveillance and member oversight
- Link incidents to systemic risk register

## Clearing Houses and CCPs

**Use Case:** Systemic risk monitoring and control effectiveness

- Assess controls against CPMI-IOSCO principles
- Monitor counterparty credit risk indicators
- Track liquidity and collateral metrics against thresholds
- Document stress testing results and limit breaches

## Asset Managers

**Use Case:** Operational and investment risk integration

- Manage operational risks across front, middle, and back office
- Track investment risk indicators against mandate limits
- Document compliance controls and effectiveness
- Link regulatory incidents to control failures

## Banks and Systemically Important Institutions

**Use Case:** Enterprise-wide risk management with regulatory alignment

- Basel-aligned risk taxonomy and capital allocation
- Operational risk event capture and loss data collection
- Control self-assessment workflow with DIME scoring
- Risk appetite cascade from board to business line limits

---

# 6. Competitive Positioning

## What MinRisk Does Better

**Structured Controls Assessment:** The DIME framework provides a documented, consistent methodology for evaluating control effectiveness—not just binary present/absent tracking.

**Appetite Chain Integrity:** Complete linkage from board statement through category appetite to metric thresholds, with validation that prevents configuration errors.

**Continuous Risk Evolution:** Risks as persistent entities with full timeline, not quarterly clones that lose historical context.

**AI with Governance:** AI accelerates classification and suggestion without bypassing human review—assistive, not autonomous.

**Period Commits as Attestation:** Immutable snapshots that serve as regulatory attestation points, not reconstructable reports.

## Where It Deliberately Avoids Complexity

**Single Platform Focus:** Risk management only—not attempting to be a broad GRC suite that dilutes depth.

**Configuration Over Customization:** Taxonomy and threshold configuration within defined structures, not unlimited customization that creates maintenance burden.

**Structured AI Application:** AI for specific, bounded tasks (classification, suggestion, relevance) rather than open-ended "AI answers anything" that undermines governance.

## Why It Is Hard to Replicate

**Database-Level Governance:** RLS policies, trigger-based audit logging, and foreign key integrity at database level—not application-layer workarounds that can be bypassed.

**Integrated Intelligence Pipeline:** Event scanning, AI analysis, and alert workflow in single system—not external integration that creates data synchronization challenges.

**Residual Risk Calculation Logic:** Documented calculation methodology that handles control stacking, targeting dimensions, and effectiveness floors correctly.

---

# 7. Summary for Decision-Makers

## Why MinRisk Is Strategic Risk Infrastructure

MinRisk is not a compliance checkbox or reporting tool. It is the operational system where risk decisions are made, documented, and justified. It provides:

1. **The Register:** Where risks are identified, classified, owned, and assessed
2. **The Controls:** Where mitigants are documented and scored for effectiveness
3. **The Indicators:** Where early warnings are defined, monitored, and acted upon
4. **The Appetite:** Where board tolerance is quantified and breach detection operates
5. **The History:** Where period-end positions are preserved for comparison and attestation
6. **The Intelligence:** Where external events inform internal assessments
7. **The Trail:** Where every decision is logged for regulatory examination

## What Type of Institution Should Buy It

MinRisk is designed for:

- **Regulated financial institutions** with supervisory oversight requirements
- **Market infrastructure operators** with systemic risk responsibilities
- **Organizations** where risk management is a board-level governance function
- **Institutions** preparing for or undergoing regulatory examination
- **Entities** where audit trail and documentation defensibility are critical

MinRisk is not designed for:
- Organizations seeking only a compliance checklist tool
- Entities without governance requirements for risk decisions
- Institutions satisfied with spreadsheet-based risk registers

## What Problem It Permanently Eliminates

MinRisk eliminates the fragmentation, inconsistency, and audit failure that characterizes spreadsheet-based risk management:

1. **No More Version Confusion:** Single source of truth with concurrent access
2. **No More Manual Snapshots:** Automated period commits with immutable history
3. **No More Missing Trails:** Database-level audit logging of all changes
4. **No More Threshold Monitoring Gaps:** Automatic RAG calculation and breach alerts
5. **No More Disconnected Incidents:** Systematic linkage of events to risks
6. **No More Stale Registers:** External intelligence integration with AI assistance

---

**Document Prepared For:** NotebookLM upload and presentation generation

**Intended Audience:** Regulators, capital-market operators, financial institutions, board and C-suite decision-makers

**Document Classification:** Buyer-facing capability assessment

---
