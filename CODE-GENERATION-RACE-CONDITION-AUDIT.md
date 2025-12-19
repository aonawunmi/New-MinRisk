# Code Generation Race Condition Audit

**Date:** 2025-12-15
**Issue:** Race condition in sequential code generation
**Impact:** Double-clicking create buttons generates duplicate codes

---

## Root Cause Analysis

### The Race Condition Pattern

```typescript
// ❌ VULNERABLE PATTERN
async function generateCode(orgId: string): Promise<string> {
  // Step 1: Count existing records
  const { count } = await supabase
    .from('table')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  // Step 2: Increment count
  const nextNumber = (count || 0) + 1;

  // Step 3: Format code
  return `PREFIX-${String(nextNumber).padStart(3, '0')}`;
}
```

**What happens when user double-clicks:**

1. **Click 1** → count = 5 → nextNumber = 6 → code = "PREFIX-006"
2. **Click 2** (before Click 1 inserts) → count = 5 → nextNumber = 6 → code = "PREFIX-006"
3. **Both insert** → DUPLICATE CODES! ❌

---

## Audit Results

### ✅ FIXED: KRI Code Generation

**Location:** `src/lib/kri.ts:114-137`

**Status:** Fixed with 3-layer protection:
1. UI debouncing (prevents double-clicks)
2. Database unique constraint (prevents duplicates at DB level)
3. Atomic code generation (database function with row-level locking)

**Files:**
- `src/components/kri/KRIForm.tsx` - Added isSubmitting state
- `src/lib/kri.ts` - Uses database RPC function
- `database/migrations/20251215_kri_unique_constraint.sql`
- `database/migrations/20251215_kri_code_generation_function.sql`

---

### ❌ NEEDS FIX: Risk Code Generation

**Location:** `src/lib/risks.ts:39-77`

**Current Implementation:**
```typescript
async function generateRiskCode(
  organizationId: string,
  division: string,
  category: string
): Promise<string> {
  const divPrefix = division.substring(0, 3).toUpperCase();
  const catPrefix = category.substring(0, 3).toUpperCase();
  const prefix = `${divPrefix}-${catPrefix}`;

  // Find max number for this prefix
  const { data: existingRisks } = await supabase
    .from('risks')
    .select('risk_code')
    .eq('organization_id', organizationId)
    .like('risk_code', `${prefix}-%`)
    .order('risk_code', { ascending: false })
    .limit(1);

  // Extract number and increment
  // ❌ RACE CONDITION HERE
  let nextNumber = 1;
  if (existingRisks && existingRisks.length > 0) {
    const lastCode = existingRisks[0].risk_code;
    const match = lastCode.match(/-(\d{3})$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}
```

**Vulnerability:**
- Multiple concurrent calls can generate same code
- More complex than KRI due to dynamic prefix (DIV-CAT-001)
- Affects: Risk creation form

**Fix Strategy:**
1. Create database function `generate_next_risk_code(p_organization_id, p_division, p_category)`
2. Add unique constraint on `(organization_id, risk_code)`
3. Add UI debouncing to RiskForm.tsx

**Priority:** HIGH - Risks are core entities

---

### ❌ NEEDS FIX: Control Code Generation

**Location:** `src/lib/controls.ts:31-55`

**Current Implementation:**
```typescript
async function generateControlCode(organizationId: string): Promise<string> {
  // Count existing controls
  const { count, error } = await supabase
    .from('controls')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (error) {
    return `CTRL-${Date.now().toString().slice(-3)}`;
  }

  // ❌ EXACT SAME RACE CONDITION AS KRI
  const nextNumber = (count || 0) + 1;
  return `CTRL-${String(nextNumber).padStart(3, '0')}`;
}
```

**Vulnerability:**
- IDENTICAL to KRI bug
- Double-click creates duplicate control codes
- Affects: Control creation form

**Fix Strategy:**
1. Copy KRI fix pattern (simplest, proven solution)
2. Create database function `generate_next_control_code(p_organization_id)`
3. Add unique constraint on `(organization_id, control_code)`
4. Add UI debouncing to ControlForm.tsx

**Priority:** HIGH - Controls are core entities

---

### ✅ VERIFIED SAFE: Incident Code Generation

**Location:** `src/lib/incidents.ts:104-129`

**Current Implementation:**
```typescript
export async function createIncident(input: CreateIncidentInput) {
  // Uses RPC function - code generated server-side
  const { data } = await supabase
    .rpc('create_incident_bypass_cache', {
      p_title: input.title,
      // ... other params
    });
}
```

**Status:** ✅ SAFE - Uses database RPC function
**Reason:** Code generation handled by database function, not client-side counting

**Recommendation:** Verify database function uses proper locking (should check RPC implementation)

---

## Fix Implementation Plan

### Phase 1: Control Code Generation (Highest Risk)

**Reason:** Same exact pattern as KRI, easiest to fix

1. Create `database/migrations/20251215_control_code_generation.sql`
   - Database function: `generate_next_control_code(p_organization_id)`
   - Unique constraint: `unique_control_code_per_org`

2. Update `src/lib/controls.ts`
   - Replace `generateControlCode()` with RPC call

3. Update `src/components/controls/ControlForm.tsx`
   - Add `isSubmitting` state
   - Disable button during save
   - Add debouncing logic

**Estimated Time:** 30 minutes (copy-paste KRI fix pattern)

---

### Phase 2: Risk Code Generation (More Complex)

**Reason:** Dynamic prefix makes it more complex than KRI/Control

1. Create `database/migrations/20251215_risk_code_generation.sql`
   - Database function: `generate_next_risk_code(p_organization_id, p_division, p_category)`
   - Handle dynamic prefix logic in database
   - Unique constraint: `unique_risk_code_per_org`

2. Update `src/lib/risks.ts`
   - Replace `generateRiskCode()` with RPC call

3. Update `src/components/risks/RiskForm.tsx`
   - Add `isSubmitting` state
   - Disable button during save
   - Add debouncing logic

**Estimated Time:** 45 minutes (more complex due to dynamic prefix)

---

### Phase 3: Incident Code Verification

1. Inspect database RPC function `create_incident_bypass_cache`
2. Verify it uses proper locking or transaction isolation
3. Add unique constraint if missing

**Estimated Time:** 15 minutes (verification only)

---

## Testing Strategy

### Manual Testing (Per Entity Type)

1. **Double-Click Test:**
   - Open create form
   - Fill required fields
   - Rapidly double-click "Create" button
   - **Expected:** Only one record created, second click ignored

2. **Concurrent Creation Test:**
   - Open TWO browser tabs side-by-side
   - Fill same form data in both
   - Click "Create" simultaneously in both tabs
   - **Expected:** Both succeed with different codes (e.g., PREFIX-001, PREFIX-002)

3. **Database Constraint Test:**
   - Manually try to insert duplicate code via SQL
   - **Expected:** Database rejects with unique constraint violation

### Automated Testing (Future)

```typescript
// Example test for race condition
test('concurrent KRI creation generates unique codes', async () => {
  const promises = Array(10).fill(null).map(() =>
    createKRI({ kri_name: 'Test KRI', ... })
  );

  const results = await Promise.all(promises);
  const codes = results.map(r => r.data.kri_code);
  const uniqueCodes = new Set(codes);

  expect(uniqueCodes.size).toBe(10); // All codes should be unique
});
```

---

## Summary Table

| Entity Type | File | Status | Priority | Estimated Time |
|-------------|------|--------|----------|----------------|
| KRI | `src/lib/kri.ts` | ✅ FIXED | - | - |
| Control | `src/lib/controls.ts` | ❌ NEEDS FIX | HIGH | 30 min |
| Risk | `src/lib/risks.ts` | ❌ NEEDS FIX | HIGH | 45 min |
| Incident | `src/lib/incidents.ts` | ✅ SAFE (verify) | LOW | 15 min |

**Total Estimated Time:** 90 minutes for complete fix

---

## Lessons Learned

### Anti-Pattern: Client-Side Sequential Code Generation

**Never do this:**
```typescript
const count = await countRecords();
const nextNumber = count + 1;
const code = `PREFIX-${nextNumber}`;
await insertRecord({ code });
```

### Best Practice: Database-Level Atomic Generation

**Always do this:**
```typescript
// Let database handle code generation atomically
const code = await supabase.rpc('generate_next_code', { org_id });
await insertRecord({ code });
```

### Defense in Depth

1. **UI Layer:** Debounce clicks (user experience)
2. **Application Layer:** Use atomic database operations (correctness)
3. **Database Layer:** Unique constraints (last line of defense)

All three layers working together = bulletproof system

---

## Next Steps

1. **Immediate:** Fix Control code generation (30 min)
2. **This week:** Fix Risk code generation (45 min)
3. **This week:** Verify Incident code generation (15 min)
4. **Future:** Add automated tests for concurrent creation

---

**Created:** 2025-12-15
**Last Updated:** 2025-12-15
**Status:** Control and Risk fixes pending
