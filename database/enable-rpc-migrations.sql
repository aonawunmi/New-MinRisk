-- Enable RPC Migrations
-- Run this script in the Supabase Dashboard SQL Editor to allow the migration script to work.

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
