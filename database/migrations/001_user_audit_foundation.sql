-- ============================================================================
-- USER AUDIT SYSTEM - DATABASE FOUNDATION
-- Enterprise-Grade Access Governance for MinRisk
-- ============================================================================
-- Date: 2025-12-21
-- Purpose: Implement regulator-grade audit trail for user status and role changes
--
-- Key Principles:
-- 1. Separate "rejected" from "suspended" (semantic clarity)
-- 2. Append-only audit logs (immutable evidence)
-- 3. DB-level enforcement (can't bypass with bugs/scripts)
-- 4. Server-derived identity (prevent spoofing)
-- 5. Type safety with enums (prevent data chaos)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ENUMS FOR TYPE SAFETY
-- ============================================================================

-- User status lifecycle
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM (
    'pending',     -- Awaiting approval
    'approved',    -- Authorized user (active)
    'rejected',    -- Never approved - failed vetting
    'suspended'    -- Previously approved, access revoked
  );
EXCEPTION
  WHEN duplicate_object THEN
    -- Enum already exists, alter it to add new values if needed
    ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'rejected';
END $$;

-- Transition context (why the change happened)
DO $$ BEGIN
  CREATE TYPE transition_context AS ENUM (
    'onboarding_approval',       -- pending → approved (normal flow)
    'onboarding_rejection',       -- pending → rejected (failed vetting)
    're_application',             -- rejected → pending (trying again)
    'override',                   -- rejected → approved (admin override)
    'disciplinary_suspension',    -- approved → suspended (trust revoked)
    'reinstatement',              -- suspended → approved (restored access)
    'unknown'                     -- Historical data backfill
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- User roles (if not already exists)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'primary_admin',
    'secondary_admin',
    'user',
    'viewer'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 2: ADD REJECTION METADATA TO USER_PROFILES
-- ============================================================================

-- Add rejection tracking columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add approval tracking columns (for completeness)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add suspension tracking columns (for completeness)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- ============================================================================
-- STEP 3: CREATE USER_STATUS_TRANSITIONS AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_status_transitions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant traceability
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- State machine (what changed)
  from_status TEXT,  -- NULL for initial user creation
  to_status TEXT NOT NULL,
  transition_type TEXT NOT NULL,

  -- Actor context (who made the change)
  actor_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,  -- Role at the time of action
  actor_email TEXT,  -- Email snapshot for readability

  -- Audit metadata
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,  -- Mandatory for all transitions
  request_id UUID,  -- Correlation to API request (for tracing)

  -- Additional context
  ip_address INET,  -- Optional: capture actor IP
  user_agent TEXT,  -- Optional: capture browser/client info

  -- Constraint: enforce allowed state transitions
  CONSTRAINT valid_status_transition CHECK (
    -- Initial creation
    (from_status IS NULL AND to_status = 'pending') OR

    -- Normal onboarding flows
    (from_status = 'pending' AND to_status IN ('approved', 'rejected')) OR

    -- Re-application or override
    (from_status = 'rejected' AND to_status IN ('pending', 'approved')) OR

    -- Disciplinary actions
    (from_status = 'approved' AND to_status = 'suspended') OR

    -- Reinstatement
    (from_status = 'suspended' AND to_status = 'approved')
  )
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_status_transitions_user
  ON user_status_transitions(user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_transitions_org
  ON user_status_transitions(organization_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_transitions_actor
  ON user_status_transitions(actor_user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_transitions_created
  ON user_status_transitions(changed_at DESC);

-- ============================================================================
-- STEP 4: CREATE USER_ROLE_TRANSITIONS AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_role_transitions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant traceability
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- State machine (what changed)
  from_role TEXT,  -- NULL for initial user creation
  to_role TEXT NOT NULL,

  -- Actor context (who made the change)
  actor_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,  -- Role at the time of action
  actor_email TEXT,  -- Email snapshot for readability

  -- Audit metadata
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,  -- Mandatory for all role changes
  request_id UUID,  -- Correlation to API request

  -- Additional context
  ip_address INET,
  user_agent TEXT,

  -- Constraint: basic validation (could be more sophisticated)
  CONSTRAINT valid_role CHECK (
    to_role IN ('super_admin', 'primary_admin', 'secondary_admin', 'user', 'viewer')
  )
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_role_transitions_user
  ON user_role_transitions(user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_transitions_org
  ON user_role_transitions(organization_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_transitions_actor
  ON user_role_transitions(actor_user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_transitions_created
  ON user_role_transitions(changed_at DESC);

-- ============================================================================
-- STEP 5: MAKE AUDIT LOGS IMMUTABLE (APPEND-ONLY)
-- ============================================================================

-- Enable RLS on audit tables
ALTER TABLE user_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_transitions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read their own org's audit logs
CREATE POLICY "audit_status_read_own_org" ON user_status_transitions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "audit_role_read_own_org" ON user_role_transitions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Allow INSERT (audit logs are written by functions)
CREATE POLICY "audit_status_insert" ON user_status_transitions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "audit_role_insert" ON user_role_transitions
  FOR INSERT
  WITH CHECK (true);

-- Policy: BLOCK all updates (immutable)
CREATE POLICY "audit_status_no_updates" ON user_status_transitions
  FOR UPDATE
  USING (false);

CREATE POLICY "audit_role_no_updates" ON user_role_transitions
  FOR UPDATE
  USING (false);

-- Policy: BLOCK all deletes (permanent record)
CREATE POLICY "audit_status_no_deletes" ON user_status_transitions
  FOR DELETE
  USING (false);

CREATE POLICY "audit_role_no_deletes" ON user_role_transitions
  FOR DELETE
  USING (false);

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

-- Verify enums were created
SELECT
  t.typname as enum_name,
  e.enumlabel as value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_status', 'transition_context', 'user_role')
ORDER BY t.typname, e.enumsortorder;

-- Verify tables were created
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename IN ('user_status_transitions', 'user_role_transitions')
ORDER BY tablename;

-- Verify indexes were created
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('user_status_transitions', 'user_role_transitions', 'user_profiles')
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('user_status_transitions', 'user_role_transitions')
ORDER BY tablename, policyname;

-- Show new columns on user_profiles
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('rejected_at', 'rejected_by', 'rejection_reason',
                      'approved_at', 'approved_by',
                      'suspended_at', 'suspended_by', 'suspension_reason')
ORDER BY column_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Phase 2: Implement write protection triggers
-- 2. Phase 3: Create stored procedures (change_user_status, change_user_role)
-- 3. Phase 4: Update Edge Functions to call procedures
-- 4. Phase 5: Update UI for rejected status
-- 5. Phase 6: Backfill historical data
-- ============================================================================
