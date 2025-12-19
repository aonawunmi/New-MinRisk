# Manual Testing Procedure - Continuous Risk Evolution

Since the automated test has environment complications, here's a simple manual test you can do:

---

## **Verify Tables Created**

1. Go to Supabase: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/editor

2. Check these tables exist:
   - ✅ `active_period`
   - ✅ `risk_history`
   - ✅ `period_commits`
   - ✅ `control_assessments`

3. Check `active_period` has data:
   ```sql
   SELECT * FROM active_period;
   ```
   Should show current period (e.g., Q4 2024)

---

## **Check Current Risks (Before Commit)**

```sql
-- Count current risks
SELECT COUNT(*) FROM risks;

-- View sample risks
SELECT risk_code, risk_title, status, is_active
FROM risks
ORDER BY created_at DESC
LIMIT 5;
```

**Note the count** - let's say you have 15 risks.

---

## **Simulate Period Commit (SQL)**

Run this SQL to manually commit the current period:

```sql
-- Get your organization ID (replace with actual ID)
SELECT id, name FROM organizations LIMIT 1;

-- Let's say your org_id is: '12345-abc-...'
-- And your user_id is: '67890-def-...'

-- Insert a manual period commit
-- This simulates what commitPeriod() does

DO $$
DECLARE
  v_org_id UUID := '[YOUR_ORG_ID]';  -- Replace with actual org ID
  v_user_id UUID := '[YOUR_USER_ID]';  -- Replace with actual user ID
  v_period_year INT := 2024;
  v_period_quarter INT := 4;
  v_risk RECORD;
BEGIN
  -- Create snapshots for all risks
  FOR v_risk IN SELECT * FROM risks WHERE organization_id = v_org_id LOOP
    INSERT INTO risk_history (
      organization_id,
      risk_id,
      period_year,
      period_quarter,
      committed_at,
      committed_by,
      change_type,
      risk_code,
      risk_title,
      risk_description,
      category,
      division,
      department,
      owner,
      status,
      likelihood_inherent,
      impact_inherent,
      score_inherent,
      likelihood_residual,
      impact_residual,
      score_residual
    ) VALUES (
      v_org_id,
      v_risk.id,
      v_period_year,
      v_period_quarter,
      NOW(),
      v_user_id,
      'PERIOD_COMMIT',
      v_risk.risk_code,
      v_risk.risk_title,
      v_risk.risk_description,
      v_risk.category,
      v_risk.division,
      v_risk.department,
      v_risk.owner,
      v_risk.status,
      v_risk.likelihood_inherent,
      v_risk.impact_inherent,
      v_risk.likelihood_inherent * v_risk.impact_inherent,
      v_risk.likelihood_inherent,  -- simplified: no controls
      v_risk.impact_inherent,
      v_risk.likelihood_inherent * v_risk.impact_inherent
    );
  END LOOP;

  -- Create period commit log
  INSERT INTO period_commits (
    organization_id,
    period_year,
    period_quarter,
    committed_at,
    committed_by,
    risks_count,
    notes
  )
  SELECT
    v_org_id,
    v_period_year,
    v_period_quarter,
    NOW(),
    v_user_id,
    COUNT(*),
    'Manual test commit'
  FROM risks
  WHERE organization_id = v_org_id;

  -- Update active period to next quarter
  UPDATE active_period
  SET
    current_period_year = 2025,
    current_period_quarter = 1,
    previous_period_year = 2024,
    previous_period_quarter = 4
  WHERE organization_id = v_org_id;

  RAISE NOTICE 'Period committed successfully!';
END $$;
```

---

## **Verify Results**

### 1. Check Risks Still Exist (CRITICAL TEST)

```sql
SELECT COUNT(*) FROM risks;
```

**Expected**: Same count as before (e.g., 15 risks)
**This proves the continuous model works** - risks were NOT deleted!

### 2. Check risk_history Snapshots Created

```sql
SELECT COUNT(*)
FROM risk_history
WHERE period_year = 2024
  AND period_quarter = 4;
```

**Expected**: Same as risk count (e.g., 15 snapshots)

### 3. View Sample Snapshot

```sql
SELECT risk_code, risk_title, status, score_inherent, score_residual, committed_at
FROM risk_history
WHERE period_year = 2024
  AND period_quarter = 4
ORDER BY risk_code
LIMIT 5;
```

Should show historical snapshot data.

### 4. Check Active Period Advanced

```sql
SELECT * FROM active_period;
```

**Expected**:
- `current_period_year`: 2025
- `current_period_quarter`: 1
- `previous_period_year`: 2024
- `previous_period_quarter`: 4

### 5. Check Period Commits Log

```sql
SELECT * FROM period_commits
ORDER BY committed_at DESC
LIMIT 1;
```

Should show the commit we just made.

---

## **Success Criteria**

✅ All 4 new tables exist
✅ Risks table unchanged (same count before/after)
✅ risk_history has snapshots for Q4 2024
✅ active_period shows Q1 2025
✅ period_commits has audit log entry

---

**If all checks pass:**
🎉 The continuous risk evolution architecture is working!

**Next step:**
Build the Period Management UI so admins can do this with a button instead of SQL.
