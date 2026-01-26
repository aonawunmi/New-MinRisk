-- ============================================================================
-- Phase 4: Organization Branding (Storage)
-- ============================================================================

-- 1. Create a storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies

-- Allow public read access to logos
CREATE POLICY "Public Access to Logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'org-logos');

-- Allow authenticated users to upload logos (RLS checks logic via folder structure or metadata?)
-- Simplest: Allow any authenticated user to upload? No, insecure.
-- Better: Only Org Admins or Super Admins.
-- Storage RLS is tricky with custom claims. 
-- We'll allow authenticated uploads for now, and rely on app logic to name files correctly.
-- Ideally: "Give specific users access to specific files" is hard in storage RLS without helper functions.
-- We will use a policy that allows insert/update if user is part of the org.

-- Allow users to upload to their own organization's folder?
-- Convention: org-logos/{org_id}.png

CREATE POLICY "Org Admins can upload their own logo" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (
    bucket_id = 'org-logos' AND
    (
        -- Is Super Admin
        public.get_my_role() = 'super_admin' 
        OR 
        -- Is Org Admin for the file path (assumes file name is org_id)
        (
            public.get_my_role() IN ('primary_admin', 'secondary_admin') AND
            name = (public.get_my_org_id()::text)
        )
    )
  );

CREATE POLICY "Org Admins can update their own logo" ON storage.objects
  FOR UPDATE TO authenticated 
  USING (
    bucket_id = 'org-logos' AND
    (
        public.get_my_role() = 'super_admin' 
        OR 
        (
            public.get_my_role() IN ('primary_admin', 'secondary_admin') AND
            name = (public.get_my_org_id()::text)
        )
    )
  );

-- 3. Update organizations table to ensure logo_url is editable by org admins
-- (Existing policies might block update of org details by non-super-admins? Need to check.)

-- Ensure org admins can update their own org's logo_url
-- We'll create a dedicated RPC for safety if RLS on table is strict.

CREATE OR REPLACE FUNCTION public.update_org_logo(p_logo_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    v_org_id := public.get_my_org_id();
    
    -- Check permissions
    IF public.get_my_role() NOT IN ('primary_admin', 'secondary_admin', 'super_admin') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- If super admin calling, they might have a different org context? 
    -- For now this function updates the CURRENT user's org. 
    -- Super admins usually use the specific admin update function. 
    -- This RPC is for the "Organization Settings" page view.

    UPDATE organizations 
    SET logo_url = p_logo_url
    WHERE id = v_org_id;

    RETURN true;
END;
$$;
