# Risk Register Redesign - Implementation Plan

**Branch:** `feature/risk-register-upgrade`
**Start Date:** 2025-11-26
**Status:** Planning Phase

---

## Overview

This document outlines the complete implementation plan for redesigning the Risk Register based on the Event + Root Cause + Impact model specified in `Risk Register Upgrade.md`.

### Core Concept

**Current Model:**
- Risk = Free-text description + Category + Controls + KRIs

**New Model:**
- Risk = Event + Root Cause + Impact
- One Root Cause per risk (multiple root causes = multiple risks)
- One Impact per risk (multiple impacts = multiple risks)
- Auto-categorization based on semantic analysis
- Curated libraries with admin approval workflow

---

## Key Features

### 1. Event-Driven Architecture
- **Event**: The observable failure/breakdown/situation (what is happening)
- **Root Cause**: The underlying driver (why it happens)
- **Impact**: The material consequence (what happens as a result)

### 2. Intelligent Libraries
- **Root Cause Register**: Curated list of organizational drivers
- **Impact Register**: Curated list of potential consequences
- **Control Library**: Tagged controls (likelihood-reducing vs impact-reducing)
- **KRI/KCI Library**: KRIs for root causes, KCIs for impacts

### 3. Smart Autocomplete
- AI-powered suggestions based on event text
- Drawing from curated registers
- User can propose new entries (admin approval required)

### 4. Auto-Categorization
- System analyzes Event + Root Cause + Impact
- Applies semantic mapping
- Auto-assigns Category and Subcategory
- Admin can override if misclassified

### 5. Refined Risk Statement Generation
**Example:**
- User enters: "Mobile banking transactions intermittently fail"
- Root Cause: Poor capacity planning
- Impact: Customer dissatisfaction

**Generated Statement:**
"Due to poor capacity planning, mobile banking transactions intermittently fail, resulting in customer dissatisfaction and reputational damage."

### 6. DIME Scoring
Controls assessed across four dimensions:
- **D**esign: How well is the control designed?
- **I**mplementation: How well is it implemented?
- **M**onitoring: How effectively is it monitored?
- **E**valuation: How regularly is it evaluated?

Each dimension scored 0-100, average determines control strength.

---

## Database Schema Design

### New Tables

#### 1. `root_cause_register`
```sql
CREATE TABLE root_cause_register (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cause_code VARCHAR(20) UNIQUE NOT NULL,
  cause_name VARCHAR(200) NOT NULL,
  cause_description TEXT,
  category VARCHAR(50), -- Auto-assigned category hint
  subcategory VARCHAR(100), -- Auto-assigned subcategory hint
  status VARCHAR(20) DEFAULT 'active', -- active | deprecated
  usage_count INTEGER DEFAULT 0, -- How many risks use this
  created_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  UNIQUE(organization_id, cause_code)
);

CREATE INDEX idx_root_cause_org ON root_cause_register(organization_id);
CREATE INDEX idx_root_cause_status ON root_cause_register(status);
```

**Example Entries:**
- `RC-001`: Poor capacity planning
- `RC-002`: Inadequate access controls
- `RC-003`: Insufficient training
- `RC-004`: Legacy system limitations
- `RC-005`: Third-party dependencies

#### 2. `impact_register`
```sql
CREATE TABLE impact_register (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  impact_code VARCHAR(20) UNIQUE NOT NULL,
  impact_name VARCHAR(200) NOT NULL,
  impact_description TEXT,
  impact_type VARCHAR(50), -- financial | reputational | operational | regulatory | safety
  category VARCHAR(50), -- Auto-assigned category hint
  subcategory VARCHAR(100), -- Auto-assigned subcategory hint
  status VARCHAR(20) DEFAULT 'active', -- active | deprecated
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  UNIQUE(organization_id, impact_code)
);

CREATE INDEX idx_impact_org ON impact_register(organization_id);
CREATE INDEX idx_impact_status ON impact_register(status);
CREATE INDEX idx_impact_type ON impact_register(impact_type);
```

**Example Entries:**
- `IMP-001`: Customer dissatisfaction
- `IMP-002`: Financial loss
- `IMP-003`: Regulatory penalties
- `IMP-004`: Reputational damage
- `IMP-005`: Service disruption

#### 3. `control_library`
```sql
CREATE TABLE control_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code VARCHAR(20) UNIQUE NOT NULL,
  control_name VARCHAR(200) NOT NULL,
  control_description TEXT,
  control_type VARCHAR(50), -- preventive | detective | corrective
  control_effect VARCHAR(50), -- likelihood_reducing | impact_reducing
  design_score INTEGER DEFAULT 0, -- 0-100
  implementation_score INTEGER DEFAULT 0, -- 0-100
  monitoring_score INTEGER DEFAULT 0, -- 0-100
  evaluation_score INTEGER DEFAULT 0, -- 0-100
  dime_average INTEGER GENERATED ALWAYS AS ((design_score + implementation_score + monitoring_score + evaluation_score) / 4) STORED,
  status VARCHAR(20) DEFAULT 'active',
  created_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, control_code)
);

CREATE INDEX idx_control_org ON control_library(organization_id);
CREATE INDEX idx_control_effect ON control_library(control_effect);
```

**Example Entries:**
- `CTL-001`: Capacity monitoring and alerting (likelihood-reducing)
- `CTL-002`: Auto-scaling infrastructure (likelihood-reducing)
- `CTL-003`: Customer communication protocol (impact-reducing)
- `CTL-004`: Multi-factor authentication (likelihood-reducing)
- `CTL-005`: Incident response plan (impact-reducing)

#### 4. `kri_kci_library`
```sql
CREATE TABLE kri_kci_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_code VARCHAR(20) UNIQUE NOT NULL,
  indicator_type VARCHAR(10) NOT NULL, -- KRI | KCI
  indicator_name VARCHAR(200) NOT NULL,
  indicator_description TEXT,
  measurement_unit VARCHAR(50),
  measurement_frequency VARCHAR(50), -- daily | weekly | monthly | quarterly
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  data_source VARCHAR(200),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, indicator_code)
);

CREATE INDEX idx_indicator_org ON kri_kci_library(organization_id);
CREATE INDEX idx_indicator_type ON kri_kci_library(indicator_type);
```

**Example Entries:**

**KRIs (for Root Causes):**
- `KRI-001`: Server CPU utilization % (for Poor capacity planning)
- `KRI-002`: Failed login attempts/day (for Inadequate access controls)
- `KRI-003`: Training completion rate % (for Insufficient training)

**KCIs (for Impacts):**
- `KCI-001`: Customer complaints/10k users (for Customer dissatisfaction)
- `KCI-002`: Revenue loss $ (for Financial loss)
- `KCI-003`: Regulatory breach count (for Regulatory penalties)

#### 5. Modified `risks` Table
```sql
-- Add new columns to existing risks table
ALTER TABLE risks
  ADD COLUMN event_text TEXT, -- The observable event description
  ADD COLUMN root_cause_id UUID REFERENCES root_cause_register(id),
  ADD COLUMN impact_id UUID REFERENCES impact_register(id),
  ADD COLUMN refined_risk_statement TEXT, -- Auto-generated statement
  ADD COLUMN auto_assigned_category VARCHAR(50), -- System-assigned category
  ADD COLUMN auto_assigned_subcategory VARCHAR(100), -- System-assigned subcategory
  ADD COLUMN category_override VARCHAR(50), -- Admin manual override
  ADD COLUMN subcategory_override VARCHAR(100); -- Admin manual override

-- The displayed category will be: category_override OR auto_assigned_category
-- The displayed subcategory will be: subcategory_override OR auto_assigned_subcategory

CREATE INDEX idx_risks_root_cause ON risks(root_cause_id);
CREATE INDEX idx_risks_impact ON risks(impact_id);
```

#### 6. `risk_controls` (Many-to-Many)
```sql
CREATE TABLE risk_controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  UNIQUE(risk_id, control_id)
);

CREATE INDEX idx_risk_controls_risk ON risk_controls(risk_id);
CREATE INDEX idx_risk_controls_control ON risk_controls(control_id);
```

#### 7. `risk_indicators` (Many-to-Many)
```sql
CREATE TABLE risk_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES kri_kci_library(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  UNIQUE(risk_id, indicator_id)
);

CREATE INDEX idx_risk_indicators_risk ON risk_indicators(risk_id);
CREATE INDEX idx_risk_indicators_indicator ON risk_indicators(indicator_id);
```

---

## TypeScript Types

### `src/types/riskRegister.ts`

```typescript
// Root Cause Register
export interface RootCause {
  id: string
  organization_id: string
  cause_code: string
  cause_name: string
  cause_description?: string
  category?: string
  subcategory?: string
  status: 'active' | 'deprecated'
  usage_count: number
  created_by?: string
  approved_by?: string
  created_at: string
  approved_at?: string
  deprecated_at?: string
}

export interface CreateRootCauseInput {
  cause_name: string
  cause_description?: string
  category?: string
  subcategory?: string
}

// Impact Register
export interface Impact {
  id: string
  organization_id: string
  impact_code: string
  impact_name: string
  impact_description?: string
  impact_type: 'financial' | 'reputational' | 'operational' | 'regulatory' | 'safety'
  category?: string
  subcategory?: string
  status: 'active' | 'deprecated'
  usage_count: number
  created_by?: string
  approved_by?: string
  created_at: string
  approved_at?: string
  deprecated_at?: string
}

export interface CreateImpactInput {
  impact_name: string
  impact_description?: string
  impact_type: 'financial' | 'reputational' | 'operational' | 'regulatory' | 'safety'
}

// Control Library
export interface Control {
  id: string
  organization_id: string
  control_code: string
  control_name: string
  control_description?: string
  control_type: 'preventive' | 'detective' | 'corrective'
  control_effect: 'likelihood_reducing' | 'impact_reducing'
  design_score: number
  implementation_score: number
  monitoring_score: number
  evaluation_score: number
  dime_average: number
  status: 'active' | 'deprecated'
  created_by?: string
  approved_by?: string
  created_at: string
}

export interface CreateControlInput {
  control_name: string
  control_description?: string
  control_type: 'preventive' | 'detective' | 'corrective'
  control_effect: 'likelihood_reducing' | 'impact_reducing'
  design_score: number
  implementation_score: number
  monitoring_score: number
  evaluation_score: number
}

// KRI/KCI Library
export interface Indicator {
  id: string
  organization_id: string
  indicator_code: string
  indicator_type: 'KRI' | 'KCI'
  indicator_name: string
  indicator_description?: string
  measurement_unit?: string
  measurement_frequency?: string
  threshold_warning?: number
  threshold_critical?: number
  data_source?: string
  status: 'active' | 'deprecated'
  created_at: string
}

export interface CreateIndicatorInput {
  indicator_type: 'KRI' | 'KCI'
  indicator_name: string
  indicator_description?: string
  measurement_unit?: string
  measurement_frequency?: string
  threshold_warning?: number
  threshold_critical?: number
  data_source?: string
}

// Risk (updated)
export interface RiskV2 extends Risk {
  event_text?: string
  root_cause_id?: string
  root_cause?: RootCause
  impact_id?: string
  impact?: Impact
  refined_risk_statement?: string
  auto_assigned_category?: string
  auto_assigned_subcategory?: string
  category_override?: string
  subcategory_override?: string
  controls?: Control[]
  indicators?: Indicator[]
}

export interface CreateRiskV2Input {
  event_text: string
  root_cause_id: string
  impact_id: string
  owner_id?: string
  likelihood?: number
  impact_score?: number
}

// AI Analysis Result
export interface RiskAnalysisResult {
  refined_statement: string
  auto_category: string
  auto_subcategory: string
  suggested_controls: string[]
  suggested_kris: string[]
  suggested_kcis: string[]
}
```

---

## UI/UX Flow

### 1. Risk Creation Wizard (Multi-Step)

#### Step 1: Describe the Event
```
┌─────────────────────────────────────────────────┐
│ Step 1: What is the Event?                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ Describe what is happening or could happen:     │
│ ┌─────────────────────────────────────────────┐ │
│ │ Mobile banking transactions intermittently  │ │
│ │ fail during peak hours                      │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ℹ️ Focus on the event itself - not the cause   │
│    or consequences.                             │
│                                                 │
│                    [Next Step →]                │
└─────────────────────────────────────────────────┘
```

#### Step 2: Select Root Cause
```
┌─────────────────────────────────────────────────┐
│ Step 2: What is the Root Cause?                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Select the underlying driver:                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Poor capacity planning              [RC-001]│ │ ← AI Suggested
│ │ Inadequate access controls          [RC-002]│ │ ← AI Suggested
│ │ Legacy system limitations           [RC-004]│ │
│ │ Third-party dependencies            [RC-005]│ │
│ │                                             │ │
│ │ + Suggest new root cause                   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Selected: Poor capacity planning                │
│                                                 │
│           [← Back]           [Next Step →]      │
└─────────────────────────────────────────────────┘
```

#### Step 3: Select Impact
```
┌─────────────────────────────────────────────────┐
│ Step 3: What is the Primary Impact?             │
├─────────────────────────────────────────────────┤
│                                                 │
│ Select the main consequence:                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ Customer dissatisfaction        [IMP-001] ⭐│ │ ← AI Suggested
│ │ Service disruption              [IMP-005] ⭐│ │ ← AI Suggested
│ │ Financial loss                  [IMP-002]  │ │
│ │ Regulatory penalties            [IMP-003]  │ │
│ │ Reputational damage             [IMP-004]  │ │
│ │                                             │ │
│ │ + Suggest new impact                       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Selected: Customer dissatisfaction              │
│                                                 │
│           [← Back]           [Next Step →]      │
└─────────────────────────────────────────────────┘
```

#### Step 4: Review & Confirm
```
┌─────────────────────────────────────────────────┐
│ Step 4: Review Risk                             │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📝 Refined Risk Statement:                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ Due to poor capacity planning, mobile       │ │
│ │ banking transactions intermittently fail    │ │
│ │ during peak hours, resulting in customer    │ │
│ │ dissatisfaction and service disruption.     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 🏷️ Auto-Assigned Category:                      │
│    Technology & Cyber Risk > System Outages    │
│                                                 │
│ 🎯 Suggested Controls (3):                      │
│    • Capacity monitoring and alerting          │
│    • Auto-scaling infrastructure               │
│    • Customer communication protocol           │
│                                                 │
│ 📊 Suggested KRIs (2):                          │
│    • Server CPU utilization %                  │
│    • Concurrent user count                     │
│                                                 │
│ 📊 Suggested KCIs (2):                          │
│    • Customer complaints/10k users             │
│    • Transaction failure rate %                │
│                                                 │
│           [← Back]           [Create Risk]      │
└─────────────────────────────────────────────────┘
```

### 2. Admin: Root Cause Register Management

```
┌─────────────────────────────────────────────────────────────┐
│ Root Cause Register                            [+ Add New]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Filter: [All] [Active] [Pending Approval] [Deprecated]     │
│                                                             │
│ ┌─────┬────────────────────────────┬─────────┬─────────┐   │
│ │Code │ Name                       │ Usage   │ Status  │   │
│ ├─────┼────────────────────────────┼─────────┼─────────┤   │
│ │RC-001│ Poor capacity planning    │ 15 risks│ Active  │   │
│ │RC-002│ Inadequate access controls│ 23 risks│ Active  │   │
│ │RC-003│ Insufficient training     │ 8 risks │ Active  │   │
│ │RC-006│ Network latency issues    │ 0 risks │ Pending │⏳ │
│ │RC-004│ Legacy system limitations │ 12 risks│ Deprecated│ │
│ └─────┴────────────────────────────┴─────────┴─────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Admin: Control Library with DIME Scoring

```
┌──────────────────────────────────────────────────────────────┐
│ Control: Capacity Monitoring and Alerting      [Edit] [Delete]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Control Code: CTL-001                                        │
│ Type: Preventive                                             │
│ Effect: Likelihood-Reducing                                  │
│                                                              │
│ 🎯 DIME Scoring:                                             │
│                                                              │
│ Design:            ████████░░ 80/100                         │
│ Implementation:    ██████░░░░ 60/100                         │
│ Monitoring:        ███████░░░ 70/100                         │
│ Evaluation:        █████░░░░░ 50/100                         │
│                                                              │
│ Overall DIME Average: 65/100 (Moderate Strength)             │
│                                                              │
│ 📊 Applied to 15 risks                                       │
│                                                              │
│                                 [Save Changes]               │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Foundation (Week 1)
**Goal:** Set up new database schema

**Tasks:**
1. Create migration for `root_cause_register` table
2. Create migration for `impact_register` table
3. Create migration for `control_library` table
4. Create migration for `kri_kci_library` table
5. Create migration to add new columns to `risks` table
6. Create migration for `risk_controls` junction table
7. Create migration for `risk_indicators` junction table
8. Seed initial data for testing

**Deliverables:**
- [ ] 7 database migrations
- [ ] Seed script with 10+ root causes, 10+ impacts, 10+ controls
- [ ] All tables indexed properly
- [ ] RLS policies configured

### Phase 2: TypeScript Types & API Layer (Week 1-2)
**Goal:** Build data access layer

**Files to Create:**
1. `src/types/riskRegister.ts` - All TypeScript interfaces
2. `src/lib/rootCauseRegister.ts` - CRUD operations
3. `src/lib/impactRegister.ts` - CRUD operations
4. `src/lib/controlLibrary.ts` - CRUD operations
5. `src/lib/kriKciLibrary.ts` - CRUD operations
6. `src/lib/risksV2.ts` - Updated risk operations

**Deliverables:**
- [ ] Complete TypeScript type definitions
- [ ] API functions for all CRUD operations
- [ ] Error handling and validation
- [ ] Unit tests for critical functions

### Phase 3: AI Analysis Engine (Week 2)
**Goal:** Build semantic analysis for auto-categorization and suggestions

**Files to Create:**
1. `src/lib/riskAnalysis.ts` - AI analysis functions
2. `supabase/functions/analyze-risk/index.ts` - Edge Function for risk analysis

**Features:**
- [ ] Analyze event text + root cause + impact
- [ ] Auto-assign category and subcategory
- [ ] Generate refined risk statement
- [ ] Suggest relevant controls (likelihood vs impact reducing)
- [ ] Suggest relevant KRIs (based on root cause)
- [ ] Suggest relevant KCIs (based on impact)

**AI Prompt Structure:**
```
You are analyzing a risk to auto-categorize it and provide suggestions.

EVENT: {event_text}
ROOT CAUSE: {root_cause_name}
IMPACT: {impact_name}

AVAILABLE CATEGORIES:
{taxonomy from RISK_TAXONOMY.md}

AVAILABLE CONTROLS:
{control_library entries with control_effect tags}

AVAILABLE KRIs (for root causes):
{KRI entries from kri_kci_library}

AVAILABLE KCIs (for impacts):
{KCI entries from kri_kci_library}

TASKS:
1. Assign the most appropriate Category and Subcategory
2. Generate a refined risk statement in format: "Due to [root cause], [event], resulting in [impact]."
3. Suggest 3-5 relevant controls (prioritize likelihood-reducing controls)
4. Suggest 2-3 relevant KRIs that monitor the root cause
5. Suggest 2-3 relevant KCIs that monitor the impact

RESPOND WITH JSON:
{
  "category": "...",
  "subcategory": "...",
  "refined_statement": "...",
  "suggested_control_codes": ["CTL-001", "CTL-003"],
  "suggested_kri_codes": ["KRI-001"],
  "suggested_kci_codes": ["KCI-001", "KCI-002"],
  "reasoning": "Brief explanation"
}
```

### Phase 4: Admin UI Components (Week 2-3)
**Goal:** Build admin interfaces for managing libraries

**Components to Create:**
1. `src/components/admin/RootCauseRegister.tsx`
2. `src/components/admin/ImpactRegister.tsx`
3. `src/components/admin/ControlLibrary.tsx`
4. `src/components/admin/KriKciLibrary.tsx`
5. `src/components/admin/DimeScoreEditor.tsx`
6. `src/components/admin/ApprovalQueue.tsx`

**Features:**
- [ ] CRUD for root causes (admin only)
- [ ] CRUD for impacts (admin only)
- [ ] CRUD for controls with DIME scoring
- [ ] CRUD for KRIs/KCIs
- [ ] Approval queue for user-suggested entries
- [ ] Usage analytics (which entries are most used)

### Phase 5: Risk Creation Wizard (Week 3-4)
**Goal:** Build new risk creation UI

**Components to Create:**
1. `src/components/risks/RiskCreationWizard.tsx`
2. `src/components/risks/EventInputStep.tsx`
3. `src/components/risks/RootCauseSelectionStep.tsx`
4. `src/components/risks/ImpactSelectionStep.tsx`
5. `src/components/risks/ReviewAndConfirmStep.tsx`
6. `src/components/risks/SmartAutocomplete.tsx`

**Features:**
- [ ] Multi-step wizard UI
- [ ] Smart autocomplete with AI suggestions
- [ ] "Suggest new entry" with admin approval workflow
- [ ] Real-time refined statement preview
- [ ] Auto-category assignment display
- [ ] Suggested controls/KRIs/KCIs display
- [ ] One-click apply suggestions

### Phase 6: Risk Detail View Update (Week 4)
**Goal:** Update risk detail view to show new structure

**Updates to:**
1. `src/components/risks/RiskDetails.tsx`
2. `src/components/risks/RiskForm.tsx`

**Features:**
- [ ] Display refined risk statement prominently
- [ ] Show Event + Root Cause + Impact breakdown
- [ ] Display auto-assigned category (with override option for admin)
- [ ] Show associated controls with DIME scores
- [ ] Show associated KRIs and KCIs
- [ ] Edit risk (change root cause or impact = new risk code)

### Phase 7: Migration Tools (Week 4-5)
**Goal:** Migrate existing risks to new model

**Tools to Create:**
1. `scripts/migrate-existing-risks.ts` - AI-powered migration
2. `scripts/validate-migration.ts` - Verify migration quality

**Migration Strategy:**
1. Use AI to analyze existing risk descriptions
2. Extract Event, Root Cause, Impact from free text
3. Match to existing register entries or create new ones
4. Generate refined statements
5. Admin review required before finalizing

**Example Migration:**
```
OLD RISK:
"Cyber attack on trading platform could lead to financial losses"

AI ANALYSIS:
Event: "Cyber attack on trading platform"
Root Cause: "Inadequate access controls" (RC-002)
Impact: "Financial loss" (IMP-002)

NEW RISK:
"Due to inadequate access controls, cyber attacks on the trading
platform could occur, resulting in financial losses."
```

### Phase 8: Testing & Validation (Week 5)
**Goal:** Comprehensive testing

**Test Types:**
1. Unit tests for all new functions
2. Integration tests for risk creation flow
3. E2E tests for wizard
4. Admin workflow tests
5. Migration validation
6. Performance testing (large datasets)

### Phase 9: Documentation & Training (Week 5-6)
**Goal:** User documentation and training materials

**Documents to Create:**
1. User Guide: Creating Risks with New Model
2. Admin Guide: Managing Registers and Libraries
3. Migration Guide: Understanding Changes
4. API Documentation
5. Video tutorials (optional)

### Phase 10: Deployment & Rollout (Week 6)
**Goal:** Production deployment with feature flag

**Steps:**
1. Deploy with feature flag disabled
2. Enable for admin users first
3. Gather feedback
4. Enable for all users
5. Monitor adoption metrics
6. Provide support

---

## Migration Strategy

### Option A: Gradual Migration (Recommended)
- Keep both old and new risk models running in parallel
- Use feature flag to toggle between views
- Allow users to create new risks using either model
- Gradually migrate old risks using AI + admin review
- Deprecate old model after 3-6 months

### Option B: Big Bang Migration
- Migrate all existing risks in one go
- Require admin review of all migrations
- Switch to new model on specific date
- Higher risk but cleaner transition

### Recommended: Option A
- Less disruptive to users
- Allows testing in production with real users
- Admins can refine registers before full rollout
- Can roll back if major issues discovered

---

## Success Metrics

### Phase 1-3 (Foundation)
- [ ] Database migrations run successfully
- [ ] All API functions return correct data
- [ ] AI analysis achieves >80% category accuracy

### Phase 4-6 (UI)
- [ ] Admin can manage all registers without errors
- [ ] Risk creation wizard completes in <2 minutes
- [ ] AI suggestions are relevant in >70% of cases
- [ ] User satisfaction score >4/5

### Phase 7-10 (Migration & Rollout)
- [ ] 100% of existing risks migrated successfully
- [ ] <5% of risks require manual admin correction
- [ ] User adoption >80% within 2 weeks
- [ ] Support tickets <10% of user base

---

## Risk Register

### Implementation Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI categorization inaccurate | Medium | High | Extensive testing with real data; Admin override option |
| Users resist new model | Medium | High | Gradual rollout; Comprehensive training; Keep old model available |
| Migration loses data | Low | Critical | Thorough testing; Backup before migration; Validation scripts |
| Performance issues with large datasets | Medium | Medium | Database indexing; Pagination; Lazy loading |
| Complexity overwhelms users | High | Medium | Progressive disclosure; Wizard UI; Inline help |

---

## Next Steps

1. ✅ Create this implementation plan
2. ⏳ Review and refine plan with stakeholders
3. ⏳ Create Phase 1 database migrations
4. ⏳ Begin Phase 2 TypeScript types and API layer
5. ⏳ Prototype AI analysis engine (Phase 3)

---

**Last Updated:** 2025-11-26
**Document Owner:** Development Team
**Status:** Draft - Pending Review
