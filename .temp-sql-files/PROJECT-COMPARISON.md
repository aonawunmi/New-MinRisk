# MinRisk Project Comparison
## NEW-MINRISK vs minrisk-starter

**Generated:** 2025-12-04
**Comparing:**
- **Current Project:** `/NEW-MINRISK/` (Clean rebuild)
- **Old Project:** `/Project File - MinRisk/minrisk-starter/` (Legacy)

---

## Executive Summary

The NEW-MINRISK project is a clean rebuild focused on core risk management with modern architecture. The old minrisk-starter project has significantly more features, including advanced AI capabilities, VaR calculations, risk appetite frameworks, and extensive reporting. Several high-value features need to be ported.

---

## 🎯 Feature Comparison Matrix

| Feature Category | NEW-MINRISK | minrisk-starter | Priority to Port |
|-----------------|-------------|-----------------|------------------|
| **Core Risk Management** | ✅ Complete | ✅ Complete | - |
| **DIME Framework** | ✅ Updated | ✅ Present | - |
| **Control Register** | ✅ Present | ✅ Enhanced | MEDIUM |
| **Incident Management** | ✅ Enhanced (Void) | ✅ Basic | - |
| **Risk Intelligence** | ✅ Phase 1 Only | ✅ Full Phase 2 | HIGH |
| **AI Risk Generator** | ❌ Missing | ✅ Present | HIGH |
| **AI Control Suggester** | ❌ Missing | ✅ Present | HIGH |
| **AI Chat Assistant** | ❌ Missing | ✅ Present | MEDIUM |
| **VaR Calculations** | ❌ Missing | ✅ Complete | LOW |
| **Risk Appetite** | ❌ Missing | ✅ Complete | MEDIUM |
| **Risk Velocity** | ❌ Missing | ✅ Present | LOW |
| **CSV Import/Export** | ⚠️ Basic | ✅ Enhanced | HIGH |
| **PDF Export** | ❌ Missing | ✅ Present | HIGH |
| **Word Export** | ❌ Missing | ✅ Present | MEDIUM |
| **Board Reports** | ❌ Missing | ✅ Present | HIGH |
| **Regulator Reports** | ❌ Missing | ✅ CBN Template | MEDIUM |
| **KRI Dashboard** | ✅ Basic | ✅ Advanced | MEDIUM |
| **Analytics** | ✅ Basic | ✅ Advanced | MEDIUM |
| **Archive Management** | ❌ Missing | ✅ Present | LOW |
| **Audit Trail** | ⚠️ Partial | ✅ Complete | MEDIUM |

---

## 📊 Detailed Feature Analysis

### 1. DIME Framework ✅ COMPLETE

**Status:** Both projects have DIME framework, NEW-MINRISK is more up-to-date

**NEW-MINRISK:**
- Modern labels (Well designed, Always applied, etc.)
- Files: `src/components/controls/ControlForm.tsx`
- Calculation: `((D + I + M + E) / 12) * 100`

**minrisk-starter:**
- Old generic labels (Strong, Adequate, Weak, etc.)
- Files: Multiple components reference DIME
- Same calculation logic

**Action:** ✅ No porting needed - NEW-MINRISK is superior

---

### 2. AI Features ❌ MAJOR GAP

**NEW-MINRISK:**
- Basic AI integration (`src/lib/ai.ts`)
- No AI risk generation
- No AI control suggestions
- No chat assistant

**minrisk-starter:**
- `AIRiskGenerator.tsx` - Generate risks from context
- `AIControlSuggester.tsx` - Suggest controls for risks
- `AIChatAssistant.tsx` - Interactive AI chat
- Files: `/src/components/AI*.tsx`, `/src/lib/ai.ts`

**Missing Functions:**
```typescript
// From minrisk-starter/src/lib/ai.ts
- generateRisks(context: RiskContext, count: number)
- generateControlMeasures(riskTitle, riskDescription, context)
- parseRisksFromResponse(response)
- buildRiskGenerationPrompt(context, count)
```

**Action:** 🔴 HIGH PRIORITY - Port AI features

---

### 3. Risk Intelligence 🟡 PARTIAL

**NEW-MINRISK:**
- Phase 1 only (manual event entry)
- Files:
  - `src/components/riskIntelligence/RiskIntelligenceManagement.tsx`
  - `src/components/riskIntelligence/TreatmentLogViewer.tsx`
  - `src/lib/riskIntelligence.ts`
- Edge Function: `supabase/functions/analyze-intelligence/`

**minrisk-starter:**
- Full Phase 2 implementation
- RSS feed automation
- Keyword matching engine
- Alert prioritization
- Files:
  - `src/components/intelligence/IntelligenceDashboard.tsx`
  - `src/components/intelligence/AlertReviewDialog.tsx`
  - `src/components/intelligence/EventBrowser.tsx`
  - `src/components/intelligence/NewsSourcesManager.tsx`
  - `src/components/intelligence/RiskKeywordsManager.tsx`
  - `src/components/intelligence/ScanResultsDialog.tsx`
  - `src/lib/riskIntelligence.ts`

**Action:** 🔴 HIGH PRIORITY - Port Phase 2 RSS automation

---

### 4. VaR (Value at Risk) ❌ MISSING

**NEW-MINRISK:** Not implemented

**minrisk-starter:**
- Complete VaR calculation system
- Excel file upload and parsing
- Scale configuration
- Results visualization
- Files:
  - `src/components/VarFileUpload.tsx`
  - `src/components/VarResultsDisplay.tsx`
  - `src/components/VarSandboxTab.tsx`
  - `src/components/VarScaleConfig.tsx`
  - `src/lib/varCalculations.ts`
  - `src/lib/varExcelParser.ts`
  - `src/lib/varTypes.ts`

**Action:** 🟡 LOW PRIORITY - Port if needed for capital markets clients

---

### 5. CSV Import/Export 🟡 BASIC

**NEW-MINRISK:**
- Basic import/export (`src/lib/importExport.ts`)
- Limited to risks

**minrisk-starter:**
- Enhanced CSV handling
- Multiple entity types
- Better error handling
- Referenced in `src/lib/database.ts`

**Action:** 🔴 HIGH PRIORITY - Enhance CSV functionality

---

### 6. Report Generation ❌ MISSING

**NEW-MINRISK:** No report generation

**minrisk-starter:**
- PDF export (`src/lib/export/pdf-export.ts`)
- Word export (`src/lib/export/word-export.ts`)
- Board report templates (`src/lib/report-templates/board-template.ts`)
- CBN regulator template (`src/lib/report-templates/cbn-template.ts`)
- Report generator (`src/lib/report-generator.ts`)
- Narrative generator (`src/lib/narrative-generator.ts`)
- Components:
  - `src/components/reports/` (directory)

**Dependencies:**
```json
// From minrisk-starter
"jspdf": "^3.0.3",
"jspdf-autotable": "^5.0.2",
"docx": "^9.5.1",
"file-saver": "^2.0.5"
```

**Action:** 🔴 HIGH PRIORITY - Port report generation (Board + Regulator)

---

### 7. Risk Appetite Framework ❌ MISSING

**NEW-MINRISK:** Not implemented

**minrisk-starter:**
- Complete risk appetite system
- Files:
  - `src/components/risk-appetite/` (directory)
  - `src/lib/risk-appetite.ts`

**Action:** 🟡 MEDIUM PRIORITY - Port if clients need formal appetite statements

---

### 8. Control Register 🟡 NEEDS ENHANCEMENT

**NEW-MINRISK:**
- Basic control register
- DIME framework integrated
- Files: `src/components/controls/`

**minrisk-starter:**
- Enhanced control features
- Additional AI suggestions
- Files:
  - `src/lib/controlEnhancements.ts`
  - Advanced DIME analytics

**Action:** 🟡 MEDIUM PRIORITY - Port control enhancements

---

### 9. Analytics & Dashboard 🟡 BASIC

**NEW-MINRISK:**
- Basic analytics (`src/lib/analytics.ts`)
- Simple dashboard

**minrisk-starter:**
- Advanced analytics dashboard
- Multiple visualization types
- Files:
  - `src/components/AnalyticsDashboard.tsx`
  - `src/components/AnalyticsTabGroup.tsx`

**Action:** 🟡 MEDIUM PRIORITY - Enhance analytics

---

### 10. Additional Missing Features

**minrisk-starter has:**
- Archive Management (`ArchiveManagement.tsx`, `archive.ts`)
- Comprehensive Audit Trail (`AuditTrail.tsx`)
- Risk Velocity tracking (`risk-velocity.ts`)
- Regulator routing (`regulator-routing.ts`)
- Super Admin Panel (`SuperAdminPanel.tsx`)
- Bulk Deletion Dialog (`BulkDeletionDialog.tsx`)
- Operations Tab Group (`OperationsTabGroup.tsx`)

---

## 🗄️ Schema Comparison

### NEW-MINRISK Tables
```
✅ organizations
✅ user_profiles (with 'role' column)
✅ risk_configs
✅ risks (with periods-v2)
✅ controls (with DIME)
✅ incidents (with void system)
✅ incident_lifecycle_history
✅ kri_definitions
✅ kri_values
✅ external_events
✅ risk_intelligence_alerts
✅ risk_intelligence_treatments
```

### minrisk-starter Additional Tables
```
❌ risk_appetite
❌ risk_velocity
❌ var_calculations
❌ var_scale_config
❌ regulator_templates
❌ report_templates
❌ archive (for archived records)
❌ audit_trail
❌ rss_feeds (for intelligence Phase 2)
❌ keyword_matches
```

---

## 📦 Dependency Differences

### NEW-MINRISK has:
```json
"xlsx": "^0.18.5" ✅
"papaparse": "^5.4.1" ✅
"recharts": "^3.3.0" ✅
```

### minrisk-starter ADDITIONAL:
```json
"jspdf": "^3.0.3" ❌
"jspdf-autotable": "^5.0.2" ❌
"docx": "^9.5.1" ❌
"file-saver": "^2.0.5" ❌
"html2pdf.js": "^0.12.1" ❌
"rss-parser": "^3.13.0" ❌
```

---

## 🎯 Prioritized Porting Plan

### Phase 1: HIGH PRIORITY (2-3 weeks)

1. **AI Features** (1 week)
   - Port `AIRiskGenerator.tsx`
   - Port `AIControlSuggester.tsx`
   - Port `AIChatAssistant.tsx`
   - Update `src/lib/ai.ts` with generation functions

2. **Report Generation** (1 week)
   - Install report dependencies (jspdf, docx, etc.)
   - Port `pdf-export.ts`
   - Port `word-export.ts`
   - Port board report template
   - Port CBN regulator template

3. **Enhanced CSV Import** (3 days)
   - Port enhanced CSV parsing
   - Add validation
   - Better error handling

### Phase 2: MEDIUM PRIORITY (2 weeks)

4. **Risk Intelligence Phase 2** (1 week)
   - Port RSS automation components
   - Port keyword matching engine
   - Port alert prioritization
   - Set up RSS feed management

5. **Control Enhancements** (3 days)
   - Port `controlEnhancements.ts`
   - Add advanced DIME analytics

6. **Risk Appetite Framework** (2 days)
   - Port risk appetite components
   - Create appetite tables

7. **Enhanced Analytics** (2 days)
   - Port advanced dashboard components
   - Add additional visualizations

### Phase 3: LOW PRIORITY (1 week)

8. **VaR Calculations** (if needed)
   - Port VaR components
   - Port Excel parser

9. **Archive Management**
   - Port archive system

10. **Risk Velocity**
    - Port velocity tracking

---

## 🔍 Key Differences in Architecture

### NEW-MINRISK Advantages:
✅ Clean, modern codebase
✅ Better type safety (pure TypeScript)
✅ Modern auth system with `role` column
✅ Periods-v2 continuous model
✅ Enhanced incident void system
✅ Better organized component structure
✅ Production-ready deployment (Render)

### minrisk-starter Advantages:
✅ More comprehensive feature set
✅ Advanced AI capabilities
✅ Professional reporting
✅ VaR calculations for capital markets
✅ RSS-powered intelligence
✅ Risk appetite framework

---

## 📋 Migration Checklist

### Before Starting:
- [ ] Back up NEW-MINRISK current state
- [ ] Create feature branch: `feature/port-from-legacy`
- [ ] Document current working features

### AI Features:
- [ ] Install AI dependencies (already have @anthropic-ai/sdk)
- [ ] Port `generateRisks()` function
- [ ] Port `generateControlMeasures()` function
- [ ] Create AIRiskGenerator component
- [ ] Create AIControlSuggester component
- [ ] Create AIChatAssistant component
- [ ] Test AI generation with actual API
- [ ] Add AI tab to main navigation

### Reports:
- [ ] Install jspdf, docx, file-saver
- [ ] Port PDF export functions
- [ ] Port Word export functions
- [ ] Port board report template
- [ ] Port CBN template
- [ ] Create Reports tab
- [ ] Test PDF generation
- [ ] Test Word generation

### CSV Import:
- [ ] Review enhanced CSV parsing logic
- [ ] Add validation rules
- [ ] Add error handling
- [ ] Test with large files
- [ ] Update UI for import progress

### Intelligence Phase 2:
- [ ] Install rss-parser dependency
- [ ] Create RSS feed management tables
- [ ] Create keyword tables
- [ ] Port NewsSourcesManager component
- [ ] Port RiskKeywordsManager component
- [ ] Port RSS ingestion logic
- [ ] Set up background job for RSS scanning
- [ ] Test RSS feed processing

---

## 🚨 Critical Considerations

1. **Database Migrations:**
   - New tables need migrations
   - Test on dev database first
   - Ensure backward compatibility

2. **API Keys:**
   - Anthropic API usage will increase significantly
   - Budget for AI calls
   - Set rate limits

3. **Performance:**
   - Report generation may be slow for large datasets
   - Consider server-side generation for reports
   - Cache frequently generated reports

4. **Testing:**
   - Each ported feature needs comprehensive testing
   - Test with actual user data
   - Load testing for report generation

5. **Documentation:**
   - Update user documentation for new features
   - Create admin guide for RSS management
   - Document report templates

---

## 🎓 Recommendations

### Immediate Actions:
1. **Port AI Risk Generator** - High user value, quick win
2. **Port Board Report Generation** - Critical for executive stakeholders
3. **Enhance CSV Import** - Needed for bulk data operations

### Short-term (1-2 months):
4. Port Intelligence Phase 2 if users add >5 events/day
5. Add control enhancements for better DIME analytics
6. Port risk appetite if formal frameworks needed

### Long-term (3+ months):
7. VaR calculations if expanding to capital markets
8. Archive management for compliance
9. Risk velocity for trend analysis

### Skip/Deprioritize:
- Regulator routing (unless multiple regulators)
- Super Admin Panel (current admin works fine)

---

## 📞 Next Steps

1. **User Validation:**
   - Ask user which features they need most
   - Prioritize based on actual use cases
   - Get feedback on current system gaps

2. **Resource Planning:**
   - Estimate development time
   - Budget for API costs
   - Plan deployment schedule

3. **Implementation:**
   - Start with Phase 1 HIGH priority items
   - Test each feature thoroughly
   - Deploy incrementally to production

---

**Generated by:** Claude Code
**Date:** 2025-12-04
**Status:** Draft - Pending user review
