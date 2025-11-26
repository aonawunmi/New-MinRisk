# MinRisk v2 Blueprint Migration

## Overview

This migration updates the Supabase database to match the north star blueprint architecture with:
- ✅ Multi-tenant model with organization scoping
- ✅ Expanded role system (5 roles: PRIMARY_ADMIN, SECONDARY_ADMIN, ORG_EDITOR, ORG_VIEWER, GUEST)
- ✅ RLS helper functions for cleaner policies
- ✅ Ownership model with `owner_profile_id` on risks/controls
- ✅ Complete RLS policies for all tables
- ✅ Invitations system with `accept_invitation()` RPC
- ✅ Risk assessments history table
- ✅ Heatmap configuration table

## How to Run Migration

Since we're using Supabase, we need to run the migration through the Supabase Dashboard SQL Editor:

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **minrisk-dev** (qrxwgjjgaekalvaqzpuf)
3. Click on **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Copy and Paste Migration SQL

1. Open `migration-v2-blueprint.sql` in this directory
2. Copy the entire contents (all 466 lines)
3. Paste into the Supabase SQL Editor

### Step 3: Execute Migration

1. Click **Run** button (or press Cmd/Ctrl + Enter)
2. Wait for execution to complete (~5-10 seconds)
3. Check for any errors in the output panel

**Expected outcome:** You should see "Success. No rows returned" or a similar success message.

### Step 4: Verify Migration

Run these queries one by one in the SQL Editor to verify:

```sql
-- Check role enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Expected: primary_admin, secondary_admin, user, ORG_EDITOR, ORG_VIEWER, GUEST

-- Check that risks table has owner_profile_id
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'risks'
AND column_name = 'owner_profile_id';

-- Expected: owner_profile_id | uuid

-- Check RLS helper functions exist
SELECT proname
FROM pg_proc
WHERE proname IN ('current_profile_id', 'current_org_id', 'current_role', 'is_admin');

-- Expected: 4 rows

-- Check new tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('invitations', 'controls', 'risk_assessments', 'heatmap_config');

-- Expected: 4 rows

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Expected: Multiple tables with RLS enabled
```

## What the Migration Does

### 1. Update Role Enum
- Adds `ORG_EDITOR`, `ORG_VIEWER`, `GUEST` to `user_role` enum
- Migrates existing `'user'` roles to `'ORG_EDITOR'`

### 2. Create RLS Helper Functions
- `current_profile_id()` - Returns current user's profile ID
- `current_org_id()` - Returns current user's organization ID
- `current_role()` - Returns current user's role
- `is_admin()` - Returns true if user is primary or secondary admin

### 3. Create New Tables
- `invitations` - User invitation system
- `controls` - Risk controls with ownership
- `risk_assessments` - Risk assessment history
- `heatmap_config` - Organization-specific heatmap settings

### 4. Update Risks Table
- Adds `owner_profile_id` column
- Backfills owner from `created_by_profile_id`

### 5. Implement RLS Policies
- Admins can see all org data
- Non-admins see only their own data
- Editors can modify their own data
- Viewers can only read
- Guests see only summary views

### 6. Create RPC Functions
- `accept_invitation(p_token)` - Accepts invitation and creates profile

## Rollback (If Needed)

If something goes wrong, you can rollback by:

1. Dropping new tables:
```sql
DROP TABLE IF EXISTS heatmap_config CASCADE;
DROP TABLE IF EXISTS risk_assessments CASCADE;
DROP TABLE IF EXISTS controls CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
```

2. Dropping RLS functions:
```sql
DROP FUNCTION IF EXISTS current_profile_id CASCADE;
DROP FUNCTION IF EXISTS current_org_id CASCADE;
DROP FUNCTION IF EXISTS current_role CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;
DROP FUNCTION IF EXISTS accept_invitation CASCADE;
```

3. Removing owner_profile_id from risks:
```sql
ALTER TABLE risks DROP COLUMN IF EXISTS owner_profile_id;
```

Note: Role enum changes cannot be easily rolled back without recreating the enum.

## Troubleshooting

### Error: "type already exists"
- Some enums or types may already exist
- This is OK, migration will continue

### Error: "column already exists"
- owner_profile_id may already be on risks table
- Check if it's correctly populated
- Migration includes logic to handle this

### Error: "function already exists"
- Drop the function first: `DROP FUNCTION function_name CASCADE;`
- Then rerun that section

### Error: "policy already exists"
- Drop the policy first: `DROP POLICY policy_name ON table_name;`
- Then rerun that section

## After Migration

Once migration is complete:

1. ✅ Test login with `admin1@acme.com`
2. ✅ Verify admin tab shows in NEW-MINRISK app
3. ✅ Test creating a new risk (should have `owner_profile_id`)
4. ✅ Test RLS - non-admins should only see their own risks
5. ✅ Begin Phase 3: Risk Management implementation

## Support

If you encounter issues:
1. Check Supabase logs for detailed errors
2. Verify your user has admin privileges
3. Make sure you're using the service role key for admin operations
4. Review the migration SQL for syntax errors

## Files in This Directory

- `migration-v2-blueprint.sql` - Main migration SQL script
- `README.md` - This file (instructions)
- `run-migration.js` - ~~Node.js runner (not used for Supabase)~~ Use SQL Editor instead
