# MinRisk Scripts

## Taxonomy Import Script

### Purpose
Bulk imports the Risk_Taxonomy.xlsx file into the database, creating all categories and subcategories.

### Prerequisites
1. Database migration `create-risk-taxonomy.sql` must be run first
2. Risk_Taxonomy.xlsx must be in the CODING folder (one level up from project root)
3. Organization must exist in the database
4. Service role key must be configured in `.env.development`

### Usage

```bash
npm run import-taxonomy
```

### What It Does
1. Reads Risk_Taxonomy.xlsx from the CODING folder
2. Parses 88 risk subcategories across 13 categories
3. Creates category records (if they don't exist)
4. Creates subcategory records under each category
5. Skips duplicates automatically
6. Reports detailed statistics

### Expected Output

```
📋 Starting Risk Taxonomy Import...

📂 Reading file: /path/to/Risk_Taxonomy.xlsx
✅ Found 88 rows in Excel file

📊 Import Statistics:
   Categories: 13
   Subcategories: 88

🏢 Importing for organization: Acme Corp
   Organization ID: 11111111-1111-1111-1111-111111111111

🚀 Starting import...

   Processing: Strategic Risk... ✅ 6 subcategories
   Processing: Financial Risk... ✅ 15 subcategories
   Processing: Operational Risk... ✅ 8 subcategories
   ...

============================================================
📊 IMPORT COMPLETE
============================================================
✅ Categories created:     13
⏭️  Categories skipped:     0
✅ Subcategories created:  88
⏭️  Subcategories skipped:  0
============================================================

✅ Script completed successfully
```

### After Import
After successful import, you can:
1. Log into MinRisk
2. Navigate to Admin → Risk Taxonomy
3. View all 13 categories with their 88 subcategories
4. Export the taxonomy to verify
5. Make manual adjustments if needed

### Troubleshooting

**Error: Excel file not found**
- Ensure Risk_Taxonomy.xlsx is in the CODING folder
- Path should be: `/Users/.../CODING/Risk_Taxonomy.xlsx`

**Error: No organization found**
- Ensure at least one organization exists in the database
- The script imports for the first organization found

**Error: Duplicate key violation**
- This is normal if you've already imported
- The script will skip duplicates and continue

**Error: Permission denied**
- Ensure VITE_SUPABASE_SERVICE_ROLE_KEY is set in `.env.development`
- This bypasses RLS for admin operations

---

## Historical Risk Period Management - Test Suite

### Purpose
Complete end-to-end test suite for the historical risk period management feature (Phases 1-4). Tests period commits, historical heatmaps, period comparisons, and trend analytics.

### Quick Start

```bash
# Run the master test script
bash scripts/test-period-management.sh
```

This launches an interactive menu with options for:
- Full automated test (all 4 steps)
- Individual script execution
- Cleanup test data
- View documentation

### Test Scripts

#### 1. Deploy Migration (`1-deploy-period-migration.sh`)
Deploys the period management database migration.

**What it creates:**
- `risk_snapshots` table for immutable snapshots
- RLS policies for organization isolation
- Helper functions: `get_period_snapshot()`, `compare_period_snapshots()`

**Usage:**
```bash
bash scripts/1-deploy-period-migration.sh
```

#### 2. Seed Test Risks (`2-seed-test-risks.sh`)
Creates 12 test risks with various severities and statuses.

**What it creates:**
- 2 Extreme, 3 High, 4 Medium, 3 Low risks
- Multiple categories: Technology, Compliance, Operational, HR, Financial
- Multiple statuses: Identified, Under Review, Approved, Monitoring

**Usage:**
```bash
bash scripts/2-seed-test-risks.sh
```

#### 3. Commit Test Periods (`3-commit-test-periods.sh`)
Commits 4 periods (Q1-Q4 2025) with evolving risk states.

**What it simulates:**
- Q1 2025: Initial state (12 risks)
- Q2 2025: Mitigations, 1 closure, 1 new risk
- Q3 2025: Further mitigations, 2 closures
- Q4 2025: 2 new emerging risks

**Usage:**
```bash
bash scripts/3-commit-test-periods.sh
```

#### 4. Verify Features (`4-verify-features.sh`)
Comprehensive verification of all 4 phases.

**What it checks:**
- ✅ Phase 1: Period commit functionality
- ✅ Phase 2: Historical heatmap
- ✅ Phase 3: Period comparison
- ✅ Phase 4: Trend analytics

**Usage:**
```bash
bash scripts/4-verify-features.sh
```

#### 5. Cleanup Test Data (`5-cleanup-test-data.sh`)
Removes all test data (risks and snapshots).

**Usage:**
```bash
bash scripts/5-cleanup-test-data.sh
```

### Testing Workflow

**Automated Full Test:**
```bash
bash scripts/test-period-management.sh
# Select option 1 (Full Test)
```

**Manual Step-by-Step:**
```bash
bash scripts/1-deploy-period-migration.sh
bash scripts/2-seed-test-risks.sh
bash scripts/3-commit-test-periods.sh
bash scripts/4-verify-features.sh
# Then test UI: npm run dev
```

### Expected Results

After running all scripts, you should have:
- 12 test risks created
- 4 period snapshots (Q1-Q4 2025)
- Risk migrations tracked

**UI Features to Test:**

**Analytics → Heatmap Tab:**
- Period selector (Current + Q1-Q4 2025)
- Live vs Historical indicators
- Interactive 5×5 or 6×6 matrix

**Analytics → Comparison Tab:**
- Side-by-side heatmap comparison
- Comparison metrics (new/closed/changed)
- Visual change indicators

**Analytics → Trends Tab:**
- Summary cards with trends
- Line charts: Risk count over time
- Area charts: Risk level distribution
- Bar charts: Status distribution
- Risk migration analysis

**Admin → Period Management:**
- Period selector and commit button
- Table of committed periods
- Delete snapshots

### Troubleshooting

**"organization_id not found"**
- Ensure you have a verified account in MinRisk
- Use the correct organization_id from `user_profiles` table

**"risk_snapshots table does not exist"**
- Run step 1 (deploy migration) first

**"No test risks found"**
- Run step 2 (seed test risks) first

**UI doesn't show new features**
- Hard refresh browser (Cmd+Shift+R)
- Check dev server is running
- Verify you're on `feature/historical-risk-periods` branch

### Database Queries

```sql
-- Check if migration is deployed
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'risk_snapshots'
);

-- Count test risks
SELECT COUNT(*) FROM risks
WHERE organization_id = 'YOUR_ORG_ID' AND risk_code LIKE 'RISK-Q%';

-- Count committed periods
SELECT COUNT(*) FROM risk_snapshots WHERE organization_id = 'YOUR_ORG_ID';

-- View all periods
SELECT period, snapshot_date, risk_count, notes
FROM risk_snapshots
WHERE organization_id = 'YOUR_ORG_ID'
ORDER BY snapshot_date;
```
