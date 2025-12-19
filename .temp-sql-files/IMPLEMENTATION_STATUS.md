# Continuous Risk Evolution Architecture - Implementation Status

**Date:** 2025-01-01
**Status:** Phase 1 & 2 Complete - Ready for Migration Testing

---

## **COMPLETED ✅**

### **Phase 1: Database Schema Migration**

**File Created:** `supabase/migrations/20250101_continuous_risk_architecture.sql`

**New Tables:**
- ✅ `active_period` - Tracks current period per organization
- ✅ `risk_history` - Historical snapshots with structured periods (year + quarter)
- ✅ `period_commits` - Audit log of period commit actions
- ✅ `control_assessments` - Quarterly control effectiveness assessments

**Updated Tables:**
- ✅ `risks` - Added `created_period_year`, `created_period_quarter`, `is_active`
- ✅ `incidents` - Added `period_year`, `period_quarter`, `risk_code_at_time`
- ✅ `kri_values` - Added `period_year`, `period_quarter`

**Helper Functions:**
- ✅ `get_current_period(org_id)` - Get current active period
- ✅ `format_period(year, quarter)` - Format period as "Q3 2025"
- ✅ `get_next_period(year, quarter)` - Calculate next period

**Migration Features:**
- ✅ Migrates old `risk_snapshots` data to new `risk_history` format
- ✅ Initializes `active_period` for all existing organizations
- ✅ Populates period fields for existing risks/incidents
- ✅ Full RLS (Row Level Security) policies

---

### **Phase 2: Updated Period Management Library**

**File Created:** `src/lib/periods-v2.ts`

**Key Functions Implemented:**

1. **Period Utilities:**
   ```typescript
   formatPeriod(period: Period) → "Q3 2025"
   parsePeriod("Q3 2025") → {year: 2025, quarter: 3}
   getCurrentPeriod() → Current quarter
   getNextPeriod(period) → Next quarter
   comparePeriods(p1, p2) → -1 | 0 | 1
   ```

2. **Active Period Management:**
   ```typescript
   getActivePeriod(orgId) → Current active period
   setActivePeriod(orgId, period) → Update active period
   ```

3. **Period Commit (NEW ARCHITECTURE):**
   ```typescript
   commitPeriod(orgId, period, userId, notes?)
   ```
   - Creates `risk_history` snapshots for ALL risks
   - Calculates residual risk for each snapshot
   - Creates `period_commits` audit log
   - Automatically advances to next period
   - **Does NOT clone/clear risks table** ✅

4. **Historical Queries:**
   ```typescript
   getCommittedPeriods(orgId) → List of committed periods
   getRiskHistoryForPeriod(orgId, period) → Risks as of that period
   getRiskTimeline(riskId) → All snapshots for a specific risk
   comparePeriods(orgId, p1, p2) → Comparison analysis
   ```

---

## **ARCHITECTURAL BENEFITS**

### **What This Achieves:**

1. **Continuous Risk Identity** ✅
   - Each risk has ONE permanent UUID across all periods
   - No cloning/copying between quarters
   - Foreign keys (controls, KRIs, incidents) never break

2. **Structured Period Representation** ✅
   - `period_year: 2025, period_quarter: 3` instead of "Q3 2025" text
   - Easy to query, sort, and compare
   - Database functions for period math

3. **Historical Snapshots** ✅
   - `risk_history` captures risk state at period boundaries
   - Flattened key fields for fast queries
   - Optional JSONB for complex data
   - Can track risk evolution over years

4. **Separation of Concerns** ✅
   - **Definition** (risks, controls, KRIs) = continuous objects
   - **Assessment** (snapshots, control_assessments) = periodic state
   - Clear separation makes QoQ flow simple

5. **Audit Trail** ✅
   - `period_commits` logs who committed what when
   - `risk_history` tracks every risk's state per quarter
   - Can answer: "What were our Q3 2025 risks?"

---

## **NEXT STEPS - PENDING**

### **Phase 3: Risk History View Component**
Create new UI component to view historical risk snapshots:
- Read-only risk register for past periods
- Dropdown to select period (Q3 2025, Q2 2025, etc.)
- Show risks as they existed at that time
- Click risk to see timeline across all periods

### **Phase 4: Update Period Comparison**
Enhance existing component:
- Support "Current vs Last Snapshot" comparison
- Use new `risk_history` table instead of `risk_snapshots`
- Add visual indicators (LIVE vs HISTORICAL)
- Handle structured periods (year + quarter)

### **Phase 5: Update Analytics Functions**
Modify `src/lib/analytics.ts`:
- `getHeatmapData()` → Use `risk_history` for historical periods
- Support structured Period type
- Add "Current (Live)" option to period dropdowns
- Maintain backward compatibility during transition

### **Phase 6: Period Management UI (Admin)**
Create admin interface for period operations:
- Show current active period banner
- "Commit Period" button with confirmation dialog
- View committed periods history
- Period commit statistics dashboard
- Notes field for documenting period close

### **Phase 7: Update Risk Register UI**
Modify main Risk Register:
- Remove `period` column (no longer needed)
- Add banner: "Current Period: Q4 2025"
- All risks implicitly belong to current period
- Filter: Show Active Risks (is_active=true) by default
- Option to include Closed Risks in view

### **Phase 8: Control Assessments UI**
Implement quarterly control effectiveness assessment:
- Pre-fill Q4 scores from Q3 (convenience)
- Require explicit "Confirm" or "Re-assess"
- Track assessment_date and assessed_by
- Calculate overall effectiveness from DIME
- Historical view of control effectiveness trends

### **Phase 9: Run Migration**
Execute database migration:
1. Backup current database
2. Test migration on dev/staging first
3. Run migration script on production
4. Verify data integrity
5. Initialize active_period for all orgs

### **Phase 10: Testing & Validation**
Comprehensive end-to-end testing:
- Create test organization
- Add test risks
- Commit Q1 2025 period
- Verify risks persist (not cleared)
- Add more risks in Q2
- Commit Q2, verify both periods queryable
- Test Period Comparison between Q1 and Q2
- Test "Current vs Q2" comparison
- Verify KRIs, Controls, Incidents work correctly

---

## **MIGRATION RISK ASSESSMENT**

### **Low Risk ✅**

The migration is **non-destructive**:
- ✅ Adds new tables (doesn't modify core tables destructively)
- ✅ Adds new columns with defaults (doesn't break existing code)
- ✅ Migrates old `risk_snapshots` to new format (doesn't delete old data)
- ✅ Can run migration multiple times (idempotent with ON CONFLICT)
- ✅ Old code continues to work (uses `risks` table which remains unchanged)

### **What Could Go Wrong?**

1. **Old `risk_snapshots` data format mismatch**
   - **Mitigation**: Migration has error handling for JSONB parsing
   - **Fallback**: Skip malformed snapshots, log errors

2. **Period parsing issues** (old "Q3 2025" format)
   - **Mitigation**: Regex parsing with validation
   - **Fallback**: Manual correction for edge cases

3. **Foreign key violations** (if risks were deleted)
   - **Mitigation**: LEFT JOIN when migrating old snapshots
   - **Fallback**: Generate placeholder UUIDs for orphaned data

---

## **ROLLBACK STRATEGY**

If issues arise after migration:

### **Option 1: Rollback Migration (Destructive)**
```sql
DROP TABLE IF EXISTS risk_history CASCADE;
DROP TABLE IF EXISTS period_commits CASCADE;
DROP TABLE IF EXISTS control_assessments CASCADE;
DROP TABLE IF EXISTS active_period CASCADE;

ALTER TABLE risks DROP COLUMN IF EXISTS created_period_year;
ALTER TABLE risks DROP COLUMN IF EXISTS created_period_quarter;
ALTER TABLE risks DROP COLUMN IF EXISTS is_active;
-- etc.
```

### **Option 2: Keep Both Systems (Safe)**
- New architecture lives alongside old
- Old `risk_snapshots` table remains
- Gradually transition components one at a time
- Can revert individual components if issues found

---

## **RECOMMENDED NEXT STEP**

### **Before Full UI Implementation:**

**1. Test Migration First** (Recommended)

Run migration on **development database**:

```bash
# Connect to dev database
psql "postgresql://[dev-connection-string]"

# Run migration
\i supabase/migrations/20250101_continuous_risk_architecture.sql

# Verify tables created
\dt

# Check sample data
SELECT * FROM active_period LIMIT 5;
SELECT * FROM risk_history LIMIT 5;
SELECT * FROM period_commits LIMIT 5;
```

**2. Manual Testing of commitPeriod()**

Create test script:
```typescript
import { commitPeriod, getActivePeriod } from './src/lib/periods-v2';

// Test committing current period
const orgId = '[test-org-id]';
const userId = '[test-user-id]';

const period = { year: 2025, quarter: 1 };
const result = await commitPeriod(orgId, period, userId, 'Test commit');

console.log('Commit result:', result);
```

**3. Verify Data Integrity**

Check that:
- ✅ `risk_history` has snapshots for all risks
- ✅ `period_commits` has audit log entry
- ✅ `active_period` advanced to Q2 2025
- ✅ Risks still exist in `risks` table (not deleted)
- ✅ Controls/KRIs/Incidents still linked correctly

---

## **DECISION POINT**

**Option A:** Run migration first, test manually, then proceed with UI
- ✅ Pro: Validates architecture before committing to UI work
- ⚠️ Con: Manual testing required

**Option B:** Complete all UI components, then run migration
- ✅ Pro: Complete package ready to test end-to-end
- ⚠️ Con: More work before seeing results

**Option C:** Incremental approach (Recommended)
1. Run migration on dev ✅
2. Test `commitPeriod()` function manually
3. Build Period Management UI (Phase 6) first
4. Test commit workflow end-to-end
5. Then proceed with other UI updates (Phases 3,4,5,7,8)

---

## **FILES READY FOR REVIEW**

1. **`supabase/migrations/20250101_continuous_risk_architecture.sql`**
   - Complete database schema migration
   - 750 lines, fully commented
   - Includes migration of old data
   - RLS policies configured

2. **`src/lib/periods-v2.ts`**
   - New period management library
   - 600+ lines, fully typed
   - Implements continuous evolution model
   - Ready to replace old periods.ts

---

**What would you like to do next?**

A. Run migration on development database and test manually
B. Continue building UI components (Phases 3-8)
C. Review the migration SQL first before proceeding
D. Create a test script to validate the architecture
