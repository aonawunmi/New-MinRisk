import { supabase } from './supabase';
/**
 * Get all active root causes (global + org-specific)
 * Views automatically combine via UNION ALL
 */
export async function getRootCauses() {
    try {
        const { data, error } = await supabase
            .from('root_cause_register')
            .select('*')
            .order('source', { ascending: false }) // Global first
            .order('cause_code', { ascending: true });
        if (error) {
            console.error('Get root causes error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        console.error('Unexpected get root causes error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown get root causes error'),
        };
    }
}
/**
 * Get all active impacts (global + org-specific)
 */
export async function getImpacts() {
    try {
        const { data, error } = await supabase
            .from('impact_register')
            .select('*')
            .order('source', { ascending: false }) // Global first
            .order('impact_code', { ascending: true });
        if (error) {
            console.error('Get impacts error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        console.error('Unexpected get impacts error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown get impacts error'),
        };
    }
}
/**
 * Get all active controls (global + org-specific)
 */
export async function getControls() {
    try {
        const { data, error } = await supabase
            .from('control_library')
            .select('*')
            .order('source', { ascending: false }) // Global first
            .order('control_code', { ascending: true });
        if (error) {
            console.error('Get controls error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        console.error('Unexpected get controls error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown get controls error'),
        };
    }
}
/**
 * Get all active KRIs and KCIs (global + org-specific)
 */
export async function getKRIsAndKCIs() {
    try {
        const { data, error } = await supabase
            .from('kri_kci_library')
            .select('*')
            .order('source', { ascending: false }) // Global first
            .order('indicator_type', { ascending: true })
            .order('indicator_code', { ascending: true });
        if (error) {
            console.error('Get KRI/KCI error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        console.error('Unexpected get KRI/KCI error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown get KRI/KCI error'),
        };
    }
}
/**
 * Get a single root cause by ID
 */
export async function getRootCauseById(id) {
    try {
        const { data, error } = await supabase
            .from('root_cause_register')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            console.error('Get root cause error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        console.error('Unexpected get root cause error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown get root cause error'),
        };
    }
}
/**
 * Get a single impact by ID
 */
export async function getImpactById(id) {
    try {
        const { data, error } = await supabase
            .from('impact_register')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            console.error('Get impact error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data, error: null };
    }
    catch (err) {
        console.error('Unexpected get impact error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown get impact error'),
        };
    }
}
/**
 * Create a custom organization-specific root cause
 */
export async function createCustomRootCause(data) {
    try {
        // Get current user and organization
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            return { data: null, error: new Error('User profile not found') };
        }
        // Insert into org_root_causes table
        const { data: newCause, error } = await supabase
            .from('org_root_causes')
            .insert([{
                ...data,
                organization_id: profile.organization_id,
                is_active: true,
            }])
            .select()
            .single();
        if (error) {
            console.error('Create custom root cause error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data: newCause, error: null };
    }
    catch (err) {
        console.error('Unexpected create custom root cause error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown create custom root cause error'),
        };
    }
}
/**
 * Create a custom organization-specific impact
 */
export async function createCustomImpact(data) {
    try {
        // Get current user and organization
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            return { data: null, error: new Error('User profile not found') };
        }
        // Insert into org_impacts table
        const { data: newImpact, error } = await supabase
            .from('org_impacts')
            .insert([{
                ...data,
                organization_id: profile.organization_id,
                is_active: true,
            }])
            .select()
            .single();
        if (error) {
            console.error('Create custom impact error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        return { data: newImpact, error: null };
    }
    catch (err) {
        console.error('Unexpected create custom impact error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown create custom impact error'),
        };
    }
}
