-- ============================================================================
-- Division-Department Hierarchy
-- ============================================================================
-- Creates proper relational tables for divisions and departments with
-- division_id foreign key to enable cascading dropdowns in risk forms.
-- ============================================================================

-- ============================================================================
-- PART 1: Create Tables
-- ============================================================================

-- Divisions table
CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Departments table with division foreign key
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_divisions_org ON divisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_division ON departments(division_id);

-- ============================================================================
-- PART 2: Enable RLS
-- ============================================================================

ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Divisions RLS policies
CREATE POLICY "Users can view divisions in their organization"
  ON divisions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert divisions"
  ON divisions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('primary_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update divisions"
  ON divisions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('primary_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete divisions"
  ON divisions FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('primary_admin', 'admin')
    )
  );

-- Departments RLS policies
CREATE POLICY "Users can view departments in their organization"
  ON departments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert departments"
  ON departments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('primary_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('primary_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete departments"
  ON departments FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('primary_admin', 'admin')
    )
  );

-- ============================================================================
-- PART 3: Migrate Existing Data
-- ============================================================================
-- Migrate divisions from organizations.settings JSON arrays to new table
-- This is a one-time migration

DO $$
DECLARE
  org_record RECORD;
  div_name TEXT;
  dept_name TEXT;
  div_array JSONB;
  dept_array JSONB;
BEGIN
  -- Loop through all organizations with divisions in settings
  FOR org_record IN 
    SELECT id, settings 
    FROM organizations 
    WHERE settings IS NOT NULL
  LOOP
    -- Extract divisions array
    div_array := org_record.settings->'divisions';
    IF div_array IS NOT NULL AND jsonb_typeof(div_array) = 'array' THEN
      FOR div_name IN SELECT jsonb_array_elements_text(div_array)
      LOOP
        -- Insert division if it doesn't exist
        INSERT INTO divisions (organization_id, name)
        VALUES (org_record.id, div_name)
        ON CONFLICT (organization_id, name) DO NOTHING;
      END LOOP;
    END IF;

    -- Extract departments array
    dept_array := org_record.settings->'departments';
    IF dept_array IS NOT NULL AND jsonb_typeof(dept_array) = 'array' THEN
      FOR dept_name IN SELECT jsonb_array_elements_text(dept_array)
      LOOP
        -- Insert department without division_id (will be assigned by admin)
        INSERT INTO departments (organization_id, name, division_id)
        VALUES (org_record.id, dept_name, NULL)
        ON CONFLICT (organization_id, name) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PART 4: Updated_at Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_divisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER divisions_updated_at
  BEFORE UPDATE ON divisions
  FOR EACH ROW
  EXECUTE FUNCTION update_divisions_updated_at();

CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_divisions_updated_at();
