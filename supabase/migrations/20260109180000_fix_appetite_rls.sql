-- Migration: Fix RLS policies for risk appetite tables
-- Date: 2026-01-09
-- Purpose: Ensure RLS policies are correctly applied for appetite tables
-- NOTE: Run this directly in Supabase SQL Editor

-- Drop ALL existing policies and recreate them (fully idempotent)
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Check if table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_appetite_categories') THEN
        -- Drop all existing policies on this table
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'risk_appetite_categories'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON risk_appetite_categories', pol.policyname);
        END LOOP;
        
        -- Ensure RLS is enabled
        EXECUTE 'ALTER TABLE risk_appetite_categories ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- Create simple, permissive policies for authenticated users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_appetite_categories') THEN
        -- SELECT policy
        EXECUTE '
            CREATE POLICY "appetite_cat_select"
            ON risk_appetite_categories FOR SELECT
            TO authenticated
            USING (
                organization_id IN (
                    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
                )
            )
        ';
        
        -- INSERT policy
        EXECUTE '
            CREATE POLICY "appetite_cat_insert"
            ON risk_appetite_categories FOR INSERT
            TO authenticated
            WITH CHECK (
                organization_id IN (
                    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
                )
            )
        ';
        
        -- UPDATE policy
        EXECUTE '
            CREATE POLICY "appetite_cat_update"
            ON risk_appetite_categories FOR UPDATE
            TO authenticated
            USING (
                organization_id IN (
                    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
                )
            )
        ';
        
        -- DELETE policy
        EXECUTE '
            CREATE POLICY "appetite_cat_delete"
            ON risk_appetite_categories FOR DELETE
            TO authenticated
            USING (
                organization_id IN (
                    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
                )
            )
        ';
    END IF;
END $$;
