-- ============================================================================
-- INVESTIGATION: Who created the Primary Admins?
-- ============================================================================
-- We check the 'approved_by' field in user_profiles to trace lineage.
-- If 'approved_by' links to an ID, that ID is likely the original Super Admin.
-- ============================================================================

-- 1. Get Primary Admins and their Approver IDs
SELECT 
    target_up.email as primary_admin_email,
    target_up.full_name as primary_admin_name,
    target_up.role as target_role,
    target_up.created_at as created_at,
    target_up.approved_at,
    target_up.approved_by as approver_id,
    -- Try to find the approver's details if they exist in profiles table
    approver_up.email as approver_email,
    approver_up.full_name as approver_name,
    approver_up.role as approver_role
FROM 
    (
        SELECT up.*, au.email 
        FROM user_profiles up
        JOIN auth.users au ON au.id = up.id
        WHERE up.role IN ('primary_admin')
    ) target_up
LEFT JOIN 
    (
        SELECT up.*, au.email 
        FROM user_profiles up
        JOIN auth.users au ON au.id = up.id
    ) approver_up 
ON target_up.approved_by = approver_up.id;

-- 2. Check if the Approver IDs exist in auth.users even if not in profiles
-- (In case they were deleted from profiles but remain in auth)
SELECT 
    DISTINCT up.approved_by as ancestor_id,
    au.email as ancestor_email,
    au.created_at as ancestor_created_at
FROM user_profiles up
JOIN auth.users au ON au.id = up.approved_by
WHERE up.role = 'primary_admin' 
  AND up.approved_by IS NOT NULL;
