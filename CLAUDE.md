# MinRisk NEW - Development Documentation

**Project:** MinRisk Risk Management Platform (Clean Rebuild)
**Location:** NEW-MINRISK/
**Status:** Active Development
**Last Updated:** 2025-12-05

---

## 🧠 SPECIAL INSTRUCTIONS

### "Think Deep" Mode

When the user types **"think deep"**, activate world-class solutions architect mode:

**Full Instruction Set:**
> Think like a world-class solutions architect and risk-management SME. Analyse the code critically, challenge assumptions, expose hidden failure modes, and propose the most robust fix.

**This means:**
- Don't accept the first solution - dig deeper
- Challenge assumptions about how things "should" work
- Identify what could break now or in the future
- Consider edge cases, race conditions, performance impacts
- Propose fixes that are robust, maintainable, and production-grade
- Think about the entire system, not just the immediate problem

### Quality Commitments

**Date Added:** 2025-12-05

Following user feedback about code quality and testing rigor, these commitments are now in effect:

1. **Test Before Claiming It's Fixed**
   - Never say "this should fix it" or "try this"
   - Actually test the code changes locally before declaring success
   - Verify the fix works in the browser, not just in theory
   - If I can't test directly, I'll be explicit about uncertainty

2. **Run Builds to Catch TypeScript Errors**
   - Run `npm run build` or check TypeScript compilation before committing
   - Catch type errors, missing imports, and compilation issues early
   - Don't rely solely on dev server (which may not catch all errors)

3. **Actually Load the App and Click Through**
   - Don't just read code and assume it works
   - Open the browser and navigate through the actual UI
   - Click buttons, open dialogs, test the user flow
   - Verify changes appear where they should

4. **Be Honest About Uncertainty**
   - If I'm not sure, I'll say "I'm not certain" instead of guessing
   - Ask questions when requirements are unclear
   - Admit when I need to investigate further
   - Never make up answers or pretend to know

5. **One-Shot Fixes**
   - Aim to fix issues completely in one pass
   - Analyze root causes, not just symptoms
   - Consider all affected locations (not just the obvious one)
   - Check for duplicate implementations that need updating
   - Test thoroughly before presenting the solution

**Historical Context:**
These commitments were added after issues with:
- DIME label updates affecting only ControlForm.tsx but not RiskForm.tsx
- Key mismatch error (effectiveness vs evaluation) that should have been caught by testing
- Multiple back-and-forth on the same issue due to incomplete fixes

### Screenshots & Testing

**Screenshot Location:**
All screenshots during testing are saved in:
```
/Users/AyodeleOnawunmi/Library/CloudStorage/OneDrive-FMDQSecuritiesExchange/Desktop/AY/CODING/
```

When the user says "see screenshot in coding folder", automatically check this location for the latest screenshots.

### Deployment Information

**Production Platform:** [Render.com](https://render.com)

**Deployment Process:**
1. Push to GitHub main branch
2. Render auto-deploys from GitHub
3. Build takes ~3-5 minutes
4. Check Render dashboard for deployment status

**Important:**
- Do NOT manually deploy unless auto-deploy fails
- Render watches the main branch
- Environment variables are configured in Render dashboard

---

## 🚨 CRITICAL BUILD ISSUE - READ FIRST

### Problem: Duplicate .js and .tsx Files

**Date Discovered:** 2025-12-05

**Symptom:**
- Code changes to `.tsx` files are not reflected in the browser
- Components show old behavior even after editing
- Console.log statements don't appear
- Browser shows "Failed to load resource: 404" for `.js` files

**Root Cause:**
TypeScript compiler is outputting compiled `.js` files in the **same directory** as `.tsx` source files (inside `src/`). When importing components, the module system finds both files and loads the `.js` file instead of the `.tsx` file, causing all edits to be ignored.

**Immediate Fix:**
```bash
# Delete all compiled .js files from src folder
cd NEW-MINRISK
find src -name "*.js" -type f | grep -v node_modules | xargs rm

# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

**⚠️ CRITICAL: This issue recurs frequently!**
- Check for duplicate .js files **FIRST** when code changes don't appear
- Run the diagnostic command: `find src -name "*.js" -type f | grep -v node_modules`
- If it returns ANY files, delete them immediately
- This has affected: AdminPanel, ControlForm, and potentially all 64+ components

**Prevention:**
Check `tsconfig.json` - the `outDir` should point to `dist/` or be removed entirely. Compiled files should NEVER be in `src/`.

**Quick Check:**
```bash
# If this returns files, you have the problem
find src/components -name "*.js" -type f
```

**How to Verify Fix:**
1. Add a console.log to any component
2. Refresh browser
3. If console message appears → Fixed ✅
4. If console message doesn't appear → Still broken ❌

---

### Problem: Production Shows Old Code Despite Correct GitHub Source

**Date Discovered:** 2025-12-05

**Symptom:**
- Local dev shows updated code correctly
- GitHub repository has correct source code
- Fresh Render deployments complete successfully
- **But production still serves old/outdated code**
- Hard refresh, incognito mode, and new browser don't help

**Root Cause:**
Compiled `.js` files were **committed to git** alongside `.tsx` source files. When these files exist in the repository:
1. Local: We deleted .js files locally, so Vite builds from .tsx (correct code)
2. Production: Render checks out from git, finds the old .js files, and serves them (old code)

**Critical Learning:**
When local and production differ, **CHECK GIT-TRACKED FILES FIRST** before investigating caching, CDN, or deployment issues.

**Diagnostic Process:**
```bash
# 1. Check if compiled files are tracked in git
cd NEW-MINRISK
git ls-files | grep "src/.*\.js$"

# If this returns files, they're in git and will deploy to production!

# 2. Check if they exist locally
find src -name "*.js" -type f | grep -v node_modules

# If step 1 returns files but step 2 doesn't, that's the problem!
```

**Fix:**
```bash
# Remove all src/**/*.js files from git tracking
git ls-files | grep "src/.*\.js$" | xargs git rm --cached

# Update .gitignore to prevent re-adding them
echo -e "\n# Compiled JavaScript files (TypeScript output)\nsrc/**/*.js\nsrc/**/*.jsx\n!*.config.js\n!scripts/*.js" >> .gitignore

# Commit and push
git add .gitignore
git commit -m "Remove compiled .js files from git tracking"
git push origin main

# Render will auto-deploy and build from .tsx source files only
```

**Prevention Checklist:**
- ✅ Ensure `src/**/*.js` is in `.gitignore`
- ✅ Never commit compiled files to source control
- ✅ When debugging prod vs local differences, check `git ls-files` first
- ✅ Verify tsconfig.json outputs to `dist/` not `src/`

**Lesson:**
This is a systematic debugging failure. When local works but production doesn't, the first check should be "what files are in git that shouldn't be?" not "is there a caching issue?"

This cost multiple deployment attempts and created user frustration. The systematic approach should be:
1. **Check git-tracked files** - `git ls-files`
2. Check build output
3. Check deployment logs
4. Then consider caching/CDN issues

---

## 🏛️ Development Principles

### World-Class Solutions Architecture Approach

**CRITICAL:** When working on this project, always apply these principles:

#### 1. Ultra-Thinking Before Coding
- **Deep Analysis First:** Never jump to implementation. Study existing code thoroughly.
- **Architecture Review:** Understand how components interact before making changes.
- **Impact Assessment:** Consider ripple effects across the entire system.
- **Trade-off Analysis:** Identify what might break, what needs to change, what should be preserved.

#### 2. Stability Over Speed
- **Preserve What Works:** Don't refactor working code unless absolutely necessary.
- **Incremental Changes:** Make small, testable changes rather than large rewrites.
- **Backward Compatibility:** Ensure new features don't break existing functionality.
- **Database Safety:** Schema changes must be carefully planned with migration strategies.

#### 3. Interdependency Mapping
- **Feature Interactions:** Document how new features interact with existing ones.
- **Data Flow Analysis:** Trace data from database through backend to UI.
- **State Management:** Understand state dependencies and update patterns.
- **API Contracts:** Maintain consistent interfaces between layers.

#### 4. Risk Mitigation
- **What Could Go Wrong:** List potential failure modes before implementing.
- **Rollback Plan:** Always have a way to revert changes.
- **Testing Strategy:** Define how to validate the feature works correctly.
- **Performance Impact:** Consider database queries, API calls, rendering performance.

#### 5. Documentation-Driven Development
- **Architecture Decisions:** Document WHY, not just WHAT.
- **Implementation Notes:** Record assumptions, constraints, trade-offs.
- **Migration Guides:** If schema changes, document upgrade path.
- **Code Comments:** Explain complex logic, especially where it differs from expected patterns.

### Feature Porting Process

When porting features from minrisk-starter:

1. **Study Phase (30-40% of time)**
   - Read old implementation completely
   - Understand data model and relationships
   - Map component hierarchy and state flow
   - Identify external dependencies (libraries, APIs)
   - Document integration points

2. **Analysis Phase (20-30% of time)**
   - Compare old vs new architecture
   - Identify alignment issues
   - List required database changes
   - Plan component structure
   - Define test cases

3. **Design Phase (10-20% of time)**
   - Create implementation plan
   - Design database schema changes
   - Plan component integration
   - Define API contracts
   - Outline error handling

4. **Implementation Phase (20-30% of time)**
   - Build database migrations first
   - Implement backend logic
   - Build UI components
   - Integrate with existing system
   - Add error handling and edge cases

5. **Validation Phase (10-20% of time)**
   - Test happy paths
   - Test error conditions
   - Test integration with existing features
   - Performance testing
   - User acceptance testing

### Red Flags to Watch For

- ❌ **Rushing to code** - If you're writing code in first 30 minutes, stop and think more
- ❌ **Ignoring existing patterns** - Follow established conventions in NEW-MINRISK
- ❌ **Large pull requests** - Break work into smaller, reviewable chunks
- ❌ **Skipping tests** - If it's not tested, it will break
- ❌ **Copy-paste code** - Understand before porting, adapt to new patterns

---

## Environment Configuration

### Supabase Project Details
- **Project URL:** https://qrxwgjjgaekalvaqzpuf.supabase.co
- **Project Ref:** qrxwgjjgaekalvaqzpuf
- **Environment File:** `.env.development`

### API Keys (from .env.development)

```bash
VITE_SUPABASE_URL=https://qrxwgjjgaekalvaqzpuf.supabase.co
VITE_SUPABASE_ANON_KEY=<see-supabase-dashboard-or-env-file>
VITE_SUPABASE_SERVICE_ROLE_KEY=<see-supabase-dashboard-or-env-file>
VITE_ANTHROPIC_API_KEY=<see-anthropic-platform-or-env-file>
```

**⚠️ SECURITY WARNING:**
- **NEVER commit API keys to Git** - even in documentation!
- Never hardcode secrets in shell scripts
- Actual keys are stored in `.env.development` (which is gitignored)
- To get the keys:
  - Supabase keys: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/settings/api
  - Anthropic key: https://platform.claude.com/settings/keys
- If a key is exposed on GitHub, it will be automatically revoked by GitHub's secret scanning

---

## Supabase Edge Functions Configuration

### CRITICAL: Edge Function Secrets

Edge Functions run on Supabase's cloud servers and **DO NOT** have access to your local `.env.development` file. You must set secrets separately.

### How to Set ANTHROPIC_API_KEY Secret

#### Option 1: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/settings/functions
2. Click **"Secrets"** tab
3. Click **"Add Secret"**
4. Enter:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `<your-anthropic-api-key-from-.env.development>`
5. Click **"Save"**

#### Option 2: Via Supabase CLI
```bash
# Get key from .env.development first, then run:
npx supabase secrets set ANTHROPIC_API_KEY="your-key-here" --project-ref qrxwgjjgaekalvaqzpuf
```

#### Option 3: Use Helper Script
```bash
bash set-edge-function-secret.sh
```

---

## Risk Intelligence System

### Phase 1: Manual Event Entry with Auto-Scan ✅ COMPLETED

**Deployment Date:** 2025-11-25

#### Features Implemented:
1. **Auto-Scan on Event Creation**
   - File: `src/lib/riskIntelligence.ts:222-305`
   - Automatically triggers AI analysis when users add events
   - Returns immediate feedback with color-coded alerts

2. **Single-Event Analysis Mode**
   - File: `supabase/functions/analyze-intelligence/index.ts`
   - Edge Function supports analyzing single events or batch mode
   - Successfully deployed to Supabase

3. **Treatment Log Viewer Integration**
   - File: `src/components/risks/RiskForm.tsx:39, 2371-2376`
   - Shows intelligence-driven risk update history
   - Includes undo/archive functionality

4. **Suggested Controls & Impact Assessment**
   - AI provides 2-4 specific mitigation actions
   - Detailed impact description for each alert
   - Database columns: `suggested_controls`, `impact_assessment`

### Testing Scripts Available

#### 1. Quick Configuration Check
```bash
bash quick-check.sh
```
- Verifies environment variables
- Checks Edge Function configuration

#### 2. Set Edge Function Secret
```bash
bash set-edge-function-secret.sh
```
- Automatically sets ANTHROPIC_API_KEY in Supabase
- Reads from `.env.development`

#### 3. Full Diagnostic Test
```bash
bash test-risk-intelligence.sh
```
- Complete end-to-end test
- Creates test ransomware event
- Triggers AI analysis
- Shows detailed results

#### 4. Check Secrets Configuration
```bash
bash check-edge-function-secrets.sh
```
- Shows how to configure secrets
- Provides step-by-step instructions

### Phase 2: RSS Automation (Planned)

**Status:** Implementation plan complete, awaiting user validation

**Timeline:** 6 weeks (see Phase 2 Implementation Plan document)

**Key Features:**
- RSS feed ingestion with intelligent pre-filtering
- Keyword matching engine (97% cost reduction)
- Category-based filtering
- ML-powered alert prioritization
- Daily digest emails
- Automated overnight processing

**Cost Optimization:**
- Phase 1: ~$22.50/month (5 events/day)
- Phase 2: ~$450/month (100 AI calls/day after 97% pre-filtering)
- Without pre-filtering: $22,500/month ❌

---

## Local Development

### Start Dev Server
```bash
npm run dev
```
Server runs on: http://localhost:3000/

### Deploy Edge Functions
```bash
npx supabase functions deploy analyze-intelligence --project-ref qrxwgjjgaekalvaqzpuf
```

### View Edge Function Logs
Dashboard > Edge Functions > analyze-intelligence > Logs

---

## Common Issues & Troubleshooting

### Issue: "No alerts created" when adding events

**Cause:** Edge Function can't call Claude AI because ANTHROPIC_API_KEY secret is not set

**Solution:**
1. Set the secret using one of the methods above
2. Redeploy Edge Function (or wait for auto-redeploy)
3. Run: `bash test-risk-intelligence.sh`

### Issue: "1 event scanned" but confidence too low

**Cause:** AI didn't find the event relevant enough (confidence < 70%)

**Solution:**
1. Check Supabase logs for AI reasoning
2. Try a more specific threat event (e.g., ransomware, data breach)
3. Ensure you have active risks (status: OPEN or MONITORING)

### Issue: Edge Function errors in logs

**Cause:** API key issues or AI prompt errors

**Solution:**
1. Verify ANTHROPIC_API_KEY secret is set correctly
2. Check logs for specific error messages
3. Ensure Claude API key is valid and has credits

---

## Database Schema

### Key Tables:
- `external_events` - Manually added or RSS-sourced threat events
- `risk_intelligence_alerts` - AI-generated alerts linking events to risks
- `risk_intelligence_treatments` - Log of risk updates from intelligence
- `risks` - Organizational risk register
- `user_profiles` - User accounts with organization_id

### Important Columns:
- `external_events.relevance_checked` - Whether event was analyzed by AI
- `risk_intelligence_alerts.status` - pending | accepted | rejected | archived
- `risk_intelligence_alerts.applied_to_risk` - Whether alert updated risk
- `risk_intelligence_treatments.is_undone` - Whether treatment was reversed

---

## Project Context

This is a **clean rebuild** of the MinRisk platform. Key decisions:

1. **New Auth System:** Using modern Supabase auth with `role` column
2. **No Legacy Code:** All code written fresh, only referencing old for business logic
3. **TypeScript Throughout:** Proper types and type safety
4. **Clean Architecture:** Separation of concerns, maintainable codebase

---

## Next Steps

### Immediate:
1. ✅ Set ANTHROPIC_API_KEY secret in Supabase Edge Functions
2. ✅ Run `bash test-risk-intelligence.sh` to verify system works
3. ✅ Test via UI: Add a cybersecurity threat event manually

### Short-term:
1. Monitor Phase 1 usage for 2 weeks
2. Track metrics:
   - Events added per day
   - Alert acceptance rate
   - User engagement
3. Validate Phase 2 need with users

### Long-term:
1. Build Phase 2 if validation metrics are met:
   - >5 events/day manually added
   - >20% alert acceptance rate
   - Positive user feedback on automation need
2. Implement RSS automation with intelligent pre-filtering
3. Deploy ML-based alert prioritization

---

## Important Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf
- **Edge Functions:** https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions
- **Edge Function Secrets:** https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/settings/functions
- **Local Dev Server:** http://localhost:3000/

---

## Recent Development Sessions

### 2025-12-03 - Incident Void System & Risk Register Incident Counts

**Completed:**
1. **Incident Void System (Soft Delete Pattern)**
   - Deployed database migration with 7 security fixes
   - Added `incident_status` column (ACTIVE/VOIDED/DRAFT/MERGED)
   - Created `incident_lifecycle_history` audit table with ON DELETE RESTRICT
   - Implemented `void_incident()` function with admin-only access
   - Added void button to both IncidentDetail and IncidentDetailView
   - Updated all queries to filter ACTIVE incidents only
   - Full audit trail for compliance (who, when, why)

2. **Risk Register Incident Counts**
   - Added `getIncidentsForRisk()` helper function
   - Implemented incident counts column in Risk Register (next to KRIs)
   - Created comprehensive incidents dialog with click-through
   - Shows: incident code, title, severity, link type, financial impact, confidence
   - Orange badges with AlertCircle icon for visual distinction
   - Parallel loading with KRI counts for performance

3. **VoidedIncidentsView - Admin Audit Interface**
   - Created comprehensive admin-only audit view for voided incidents
   - Shows: incident code, title, void reason, voided by (admin), voided at
   - Real-time search/filter functionality
   - Lifecycle history dialog with full audit trail
   - Integrated as third tab in AdminIncidentReview

**Files Modified:**
- `src/lib/incidents.ts` - Added 4 new functions (voidIncident, getIncidentLifecycleHistory, getIncidentsForRisk, getVoidedIncidents)
- `src/components/incidents/IncidentDetail.tsx` - Added void functionality
- `src/components/incidents/IncidentDetailView.tsx` - Added void functionality
- `src/components/incidents/MappedIncidentsView.tsx` - Filter ACTIVE incidents
- `src/components/risks/RiskRegister.tsx` - Added incident counts column and dialog
- `src/components/incidents/VoidedIncidentsView.tsx` - NEW: Admin audit view for voided incidents
- `src/components/incidents/AdminIncidentReview.tsx` - Added "Voided Incidents (Audit)" tab
- Database: Deployed `/tmp/DEPLOY-void-incident-REVISED.sql`

**Status:** Production ready. All void system features complete.

**Documentation:** See `/tmp/PROJECT-STATUS-2025-12-03.md` for complete details.

---

### 2025-11-25 - Risk Intelligence Phase 1

**Last Session:** Completed Phase 1 implementation, created diagnostic scripts, documented Edge Function secret configuration
