# Owner Tracking System - Implementation Complete

**Date:** 2025-12-07
**Implementation Status:** ✅ COMPLETE
**Deployment Status:** ⏳ Awaiting Database Migration

---

## Overview

The owner tracking system has been fully implemented to replace the legacy TEXT-based owner field with a proper user reference system. This enables:

- **Proper user ownership:** Risks are now owned by actual user accounts (via UUID foreign key)
- **Email visibility for admins:** Admins can see owner email addresses in the Risk Register
- **User dropdown selection:** Risk form uses a dropdown to select owners from organization users
- **Legacy data migration:** Admin tool to map old text owners to user accounts

---

## Implementation Summary

### 1. Database Layer ✅

**File:** `src/types/risk.ts`

Added new fields to Risk interface:
- `owner_id?: string | null` - UUID reference to auth.users
- `owner_email?: string` - Computed field from join with auth.users
- `owner: string` - Legacy TEXT field (kept for backward compatibility)

**File:** `src/lib/risks.ts`

Updated data layer functions:
- `getRisks()` - Now joins with auth.users to fetch owner emails using admin client
- `createRisk()` - Stores both owner (name) and owner_id (UUID)
- `CreateRiskData` interface - Added owner_id field

### 2. Risk Register UI ✅

**File:** `src/components/risks/RiskRegister.tsx`

**Changes:**
- ❌ **Removed:** Priority checkbox column (redundant with selection checkbox)
- ✅ **Added:** Owner Email column (visible to admins only)
- ✅ **Added:** Owner Email filter dropdown (admins only)
- ✅ **Updated:** Filtering logic to support both legacy owner and new owner_email
- ✅ **Updated:** Sorting to support owner_email column

**UI Structure:**
```
| Select | Code | Title | Category | Owner | Owner Email (Admin) | Created | L | I | L×I | ...
```

### 3. Risk Form UI ✅

**File:** `src/components/risks/RiskForm.tsx`

**Changes:**
- ❌ **Removed:** Text input for owner field
- ✅ **Added:** User dropdown selection (loads all organization users)
- ✅ **Updated:** Stores both owner (full_name) and owner_id (UUID)
- ✅ **Added:** User loading logic with organization filtering
- ✅ **Updated:** Form initialization for editing (sets selectedOwnerId)
- ✅ **Updated:** Form reset logic (clears selectedOwnerId)

**User Dropdown:**
- Shows: Full Name (Email)
- Example: "John Doe (john@example.com)"
- Updates both owner and owner_id fields

### 4. Admin Owner Mapping Tool ✅

**File:** `src/components/admin/OwnerMappingTool.tsx` (NEW)

**Features:**
- Lists all legacy text owners (risks with owner_id = null)
- Shows risk count for each legacy owner
- Shows sample risks for context
- Provides user dropdown to map legacy owner to actual user
- **Apply button** - Maps one legacy owner at a time
- **Apply All button** - Batch applies all configured mappings
- Success/error feedback
- Auto-reloads after successful mapping

**UI Flow:**
1. Admin sees table of legacy owners
2. For each owner, selects matching user from dropdown
3. Clicks "Apply" to update all risks with that owner
4. System updates both owner (to user's full_name) and owner_id (to user's UUID)

### 5. Admin Panel Integration ✅

**File:** `src/components/admin/AdminPanel.tsx`

**Changes:**
- ✅ **Added:** "Owner Mapping" tab (after "User Management")
- ✅ **Imported:** OwnerMappingTool component
- ✅ **Rendered:** Tool when "Owner Mapping" tab is active

**Tab Order:**
1. Risk Taxonomy
2. Risk Configuration
3. User Management
4. **Owner Mapping** ← NEW
5. Period Management
6. Audit Trail
7. Help
8. Organization Settings

---

## Database Migration Required

### Migration Script Created ✅

**File:** `database/migrations/add-owner-id-to-risks.sql`

**What it does:**
1. Adds `owner_id UUID` column to risks table
2. Creates foreign key constraint: `REFERENCES auth.users(id) ON DELETE SET NULL`
3. Creates index: `idx_risks_owner_id` for performance
4. Adds column documentation via COMMENT
5. **Initial population:** Sets `owner_id = user_id` for all existing risks (assumption: creator = owner)
6. Includes verification query to check migration success

### How to Run Migration

**Option 1: Supabase SQL Editor (Recommended)**
```sql
-- Navigate to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
-- Paste contents of database/migrations/add-owner-id-to-risks.sql
-- Click "Run"
```

**Option 2: psql Command Line**
```bash
psql "postgresql://postgres.yqjfxzkqzqslqwspjfgo:iRkeDUhdYWcHmKFqgjvQvSsKzLEKJbaE@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f database/migrations/add-owner-id-to-risks.sql
```

**Verification:**
After running migration, verify with:
```sql
-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'risks' AND column_name = 'owner_id';

-- Check data population
SELECT
  COUNT(*) as total_risks,
  COUNT(owner_id) as risks_with_owner_id,
  COUNT(*) - COUNT(owner_id) as risks_without_owner_id
FROM risks;
```

---

## Migration Strategy

### Phase 1: Database Setup (User Action Required)
1. ⏳ **Run migration script** to add owner_id column
2. ⏳ **Verify** all existing risks have owner_id populated (initially = user_id)

### Phase 2: User Experience (Automatic)
1. ✅ **New risks:** Users select owner from dropdown → stores owner_id automatically
2. ✅ **Editing risks:** Owner dropdown shows current owner (if owner_id exists)
3. ✅ **Legacy risks:** Show in Owner Mapping Tool until migrated

### Phase 3: Admin Migration (As Needed)
1. ✅ Admin navigates to Admin → Owner Mapping tab
2. ✅ Reviews legacy owners (risks with no owner_id)
3. ✅ Maps each text owner to actual user account
4. ✅ Applies mappings (one-by-one or batch)
5. ✅ Verifies all risks have proper owner_id

### Phase 4: Future Cleanup (Optional)
Once all risks have owner_id:
- Make owner_id NOT NULL (enforce constraint)
- Optionally deprecate/remove owner TEXT field
- Update RLS policies to use owner_id

---

## Testing Checklist

### Before Migration
- ✅ Code compiles without errors
- ✅ Risk Register displays correctly
- ✅ Risk Form shows user dropdown
- ✅ Admin panel shows Owner Mapping tab

### After Migration
- ⏳ Verify migration SQL completed successfully
- ⏳ Check all existing risks have owner_id populated
- ⏳ Create new risk → verify owner_id is stored
- ⏳ Edit existing risk → verify owner dropdown shows correct user
- ⏳ View Risk Register as admin → verify Owner Email column shows
- ⏳ Use Owner Email filter → verify filtering works
- ⏳ Use Owner Mapping Tool → verify legacy owners can be mapped

---

## Files Modified

### Core Data Layer
- `src/types/risk.ts` - Added owner_id and owner_email fields
- `src/lib/risks.ts` - Updated to fetch/store owner_id, join with auth.users

### UI Components
- `src/components/risks/RiskRegister.tsx` - Removed Priority column, added Owner Email column/filter
- `src/components/risks/RiskForm.tsx` - Changed owner field to user dropdown

### Admin Tools
- `src/components/admin/OwnerMappingTool.tsx` - NEW: Legacy owner migration tool
- `src/components/admin/AdminPanel.tsx` - Added Owner Mapping tab

### Database
- `database/migrations/add-owner-id-to-risks.sql` - Migration script

---

## Next Steps

1. **Run Database Migration**
   - Execute `database/migrations/add-owner-id-to-risks.sql` in Supabase SQL Editor
   - Verify all existing risks have owner_id populated

2. **Test New Risk Creation**
   - Create a new risk via Risk Form
   - Verify owner dropdown works
   - Verify owner_id is stored correctly

3. **Test Admin Features**
   - Navigate to Admin → Owner Mapping
   - Verify legacy owners appear (if any)
   - Test mapping a legacy owner to a user

4. **Test Risk Register**
   - View Risk Register as admin
   - Verify Owner Email column shows
   - Test Owner Email filter

5. **Deploy to Production**
   - Commit changes to git
   - Push to GitHub
   - Render will auto-deploy

---

## Success Criteria

✅ All code changes implemented
⏳ Database migration executed successfully
⏳ All existing risks have owner_id populated
⏳ New risks store owner_id automatically
⏳ Admin can see owner emails in Risk Register
⏳ Admin can filter by owner email
⏳ Admin can map legacy owners via Owner Mapping Tool
⏳ No errors in browser console
⏳ All tests pass

---

## Support & Documentation

**Admin Guide:**
1. Go to Admin → Owner Mapping
2. Review legacy owners (if any)
3. For each owner, select matching user from dropdown
4. Click "Apply" or "Apply All Mappings"
5. Verify risks are updated

**User Guide:**
1. Create new risk → Select owner from dropdown
2. Edit risk → Owner is pre-selected (if owner_id exists)
3. Owner dropdown shows: Name (Email)

**Developer Notes:**
- owner_id is nullable for backward compatibility
- Old owner TEXT field is kept for reference
- getRisks() joins with auth.users using admin client (bypasses RLS)
- Admin features require role='admin' in user_profiles

---

**Implementation Date:** 2025-12-07
**Status:** Ready for Database Migration ✅
