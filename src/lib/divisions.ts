/**
 * Divisions and Departments Service
 * 
 * CRUD operations for organizational hierarchy management.
 * Divisions contain departments, enabling cascaded dropdowns in forms.
 */

import { supabase } from './supabase';

// ============================================================================
// Types
// ============================================================================

export interface Division {
    id: string;
    organization_id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface Department {
    id: string;
    organization_id: string;
    division_id: string | null;
    name: string;
    created_at: string;
    updated_at: string;
    // Joined field
    division_name?: string;
}

export interface DivisionWithDepartments extends Division {
    departments: Department[];
}

// ============================================================================
// Division CRUD
// ============================================================================

/**
 * Get all divisions for the current user's organization
 */
export async function getDivisions(): Promise<{ data: Division[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('divisions')
            .select('*')
            .order('name');

        if (error) {
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Get divisions with their nested departments
 */
export async function getDivisionsWithDepartments(): Promise<{
    data: DivisionWithDepartments[] | null;
    error: Error | null
}> {
    try {
        // Get all divisions
        const { data: divisions, error: divError } = await supabase
            .from('divisions')
            .select('*')
            .order('name');

        if (divError) {
            return { data: null, error: new Error(divError.message) };
        }

        // Get all departments
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('*')
            .order('name');

        if (deptError) {
            return { data: null, error: new Error(deptError.message) };
        }

        // Group departments by division
        const result: DivisionWithDepartments[] = (divisions || []).map(div => ({
            ...div,
            departments: (departments || []).filter(dept => dept.division_id === div.id),
        }));

        return { data: result, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Create a new division
 */
export async function createDivision(name: string): Promise<{ data: Division | null; error: Error | null }> {
    try {
        // Get user's organization
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .single();

        if (!profile?.organization_id) {
            return { data: null, error: new Error('No organization found') };
        }

        const { data, error } = await supabase
            .from('divisions')
            .insert({
                organization_id: profile.organization_id,
                name: name.trim()
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return { data: null, error: new Error('A division with this name already exists') };
            }
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Update a division's name
 */
export async function updateDivision(id: string, name: string): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase
            .from('divisions')
            .update({ name: name.trim() })
            .eq('id', id);

        if (error) {
            return { error: new Error(error.message) };
        }

        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Delete a division (departments will have division_id set to NULL)
 */
export async function deleteDivision(id: string): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase
            .from('divisions')
            .delete()
            .eq('id', id);

        if (error) {
            return { error: new Error(error.message) };
        }

        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

// ============================================================================
// Department CRUD
// ============================================================================

/**
 * Get all departments for the current user's organization
 */
export async function getDepartments(): Promise<{ data: Department[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('departments')
            .select(`
        *,
        divisions!left(name)
      `)
            .order('name');

        if (error) {
            return { data: null, error: new Error(error.message) };
        }

        // Map to include division_name
        const mapped = (data || []).map(dept => ({
            ...dept,
            division_name: dept.divisions?.name || null,
            divisions: undefined, // Remove the nested object
        }));

        return { data: mapped, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Get departments for a specific division
 */
export async function getDepartmentsByDivision(divisionId: string | null): Promise<{
    data: Department[] | null;
    error: Error | null
}> {
    try {
        let query = supabase
            .from('departments')
            .select('*')
            .order('name');

        if (divisionId) {
            query = query.eq('division_id', divisionId);
        }

        const { data, error } = await query;

        if (error) {
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Get unassigned departments (no division)
 */
export async function getUnassignedDepartments(): Promise<{ data: Department[] | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .is('division_id', null)
            .order('name');

        if (error) {
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Create a new department
 */
export async function createDepartment(
    name: string,
    divisionId?: string
): Promise<{ data: Department | null; error: Error | null }> {
    try {
        // Get user's organization
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .single();

        if (!profile?.organization_id) {
            return { data: null, error: new Error('No organization found') };
        }

        const { data, error } = await supabase
            .from('departments')
            .insert({
                organization_id: profile.organization_id,
                name: name.trim(),
                division_id: divisionId || null,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return { data: null, error: new Error('A department with this name already exists') };
            }
            return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Update a department
 */
export async function updateDepartment(
    id: string,
    updates: { name?: string; division_id?: string | null }
): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase
            .from('departments')
            .update(updates)
            .eq('id', id);

        if (error) {
            return { error: new Error(error.message) };
        }

        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}

/**
 * Assign a department to a division
 */
export async function assignDepartmentToDivision(
    departmentId: string,
    divisionId: string | null
): Promise<{ error: Error | null }> {
    return updateDepartment(departmentId, { division_id: divisionId });
}

/**
 * Delete a department
 */
export async function deleteDepartment(id: string): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) {
            return { error: new Error(error.message) };
        }

        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
}
