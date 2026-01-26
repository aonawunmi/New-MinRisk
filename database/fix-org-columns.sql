-- ============================================================================
-- Fix: Ensure missing columns exist in organizations table
-- Error 42703 (undefined_column) suggests these weren't added.
-- ============================================================================

-- 1. Add status column if missing (default to active)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Add suspended columns if missing
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

-- 3. Add 'code' column if missing (CRITICAL)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS code TEXT;

-- Add unique constraint if not exists (safely)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_code_key') THEN
        ALTER TABLE public.organizations ADD CONSTRAINT organizations_code_key UNIQUE (code);
    END IF;
END $$;

-- 4. Just in case 'description' is missing (it was in the select list)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Re-create the function to ensure it matches the schema
DROP FUNCTION IF EXISTS public.list_organizations_admin();

CREATE OR REPLACE FUNCTION public.list_organizations_admin()
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    user_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only super_admin can call this
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can list all organizations';
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.code,
        o.description,
        COALESCE(o.status, 'active'), -- Ensure no NULLs returned
        o.created_at,
        o.suspended_at,
        COALESCE(COUNT(up.id), 0) as user_count
    FROM organizations o
    LEFT JOIN user_profiles up ON up.organization_id = o.id
    GROUP BY o.id, o.name, o.code, o.description, o.status, o.created_at, o.suspended_at
    ORDER BY o.created_at DESC;
END;
$$;
