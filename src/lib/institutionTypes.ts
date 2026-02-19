/**
 * Institution Types & Regulators Service Layer
 *
 * Provides CRUD operations for:
 * - Institution types (data-driven taxonomy managed by super_admin)
 * - Regulatory bodies (Nigerian + international regulators)
 * - Institution-type-to-regulator mappings
 *
 * Updated: 2026-02-19 (Intelligence Redesign)
 */

import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────

export interface InstitutionType {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  default_scan_keywords: string[];
  default_rss_source_priorities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  regulator_count?: number;
  org_count?: number;
}

export interface Regulator {
  id: string;
  code: string;
  name: string;
  country: string | null;
  website_url: string | null;
  rss_feed_urls: string[];
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  // Joined
  institution_type_count?: number;
}

export interface InstitutionTypeRegulator {
  id: string;
  institution_type_id: string;
  regulator_id: string;
  is_primary: boolean;
  institution_type?: InstitutionType;
  regulator?: Regulator;
}

export type InstitutionCategory =
  | 'Capital Markets'
  | 'Banking'
  | 'Asset Management'
  | 'Insurance'
  | 'Fintech'
  | 'Other';

export const INSTITUTION_CATEGORIES: InstitutionCategory[] = [
  'Capital Markets',
  'Banking',
  'Asset Management',
  'Insurance',
  'Fintech',
  'Other',
];

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ─── Institution Types ──────────────────────────────────────────────

/**
 * Get all institution types (optionally filtered by active status)
 */
export async function getInstitutionTypes(
  activeOnly = true
): Promise<ServiceResult<InstitutionType[]>> {
  try {
    let query = supabase
      .from('institution_types')
      .select('*')
      .order('category')
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get institution types error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as InstitutionType[], error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Get a single institution type by ID
 */
export async function getInstitutionType(
  id: string
): Promise<ServiceResult<InstitutionType>> {
  try {
    const { data, error } = await supabase
      .from('institution_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as InstitutionType, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Create a new institution type
 */
export async function createInstitutionType(input: {
  name: string;
  slug: string;
  category: InstitutionCategory;
  description?: string;
  default_scan_keywords?: string[];
}): Promise<ServiceResult<InstitutionType>> {
  try {
    const { data, error } = await supabase
      .from('institution_types')
      .insert({
        name: input.name,
        slug: input.slug,
        category: input.category,
        description: input.description || null,
        default_scan_keywords: input.default_scan_keywords || [],
        default_rss_source_priorities: [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as InstitutionType, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Update an institution type
 */
export async function updateInstitutionType(
  id: string,
  updates: Partial<{
    name: string;
    category: InstitutionCategory;
    description: string | null;
    default_scan_keywords: string[];
    is_active: boolean;
  }>
): Promise<ServiceResult<InstitutionType>> {
  try {
    const { data, error } = await supabase
      .from('institution_types')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as InstitutionType, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

// ─── Regulators ─────────────────────────────────────────────────────

/**
 * Get all regulators (optionally filtered by active status)
 */
export async function getRegulators(
  activeOnly = true
): Promise<ServiceResult<Regulator[]>> {
  try {
    let query = supabase
      .from('regulators')
      .select('*')
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Regulator[], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Create a new regulator
 */
export async function createRegulator(input: {
  code: string;
  name: string;
  country?: string;
  website_url?: string;
  rss_feed_urls?: string[];
  description?: string;
}): Promise<ServiceResult<Regulator>> {
  try {
    const { data, error } = await supabase
      .from('regulators')
      .insert({
        code: input.code.toUpperCase(),
        name: input.name,
        country: input.country || 'Nigeria',
        website_url: input.website_url || null,
        rss_feed_urls: input.rss_feed_urls || [],
        description: input.description || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Regulator, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Update a regulator
 */
export async function updateRegulator(
  id: string,
  updates: Partial<{
    name: string;
    code: string;
    country: string;
    website_url: string | null;
    rss_feed_urls: string[];
    description: string | null;
    is_active: boolean;
  }>
): Promise<ServiceResult<Regulator>> {
  try {
    const { data, error } = await supabase
      .from('regulators')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Regulator, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

// ─── Institution Type ↔ Regulator Mappings ──────────────────────────

/**
 * Get regulators mapped to an institution type
 */
export async function getRegulatorsByInstitutionType(
  institutionTypeId: string
): Promise<ServiceResult<InstitutionTypeRegulator[]>> {
  try {
    const { data, error } = await supabase
      .from('institution_type_regulators')
      .select(`
        id,
        institution_type_id,
        regulator_id,
        is_primary,
        regulators:regulator_id (id, code, name, country, is_active)
      `)
      .eq('institution_type_id', institutionTypeId);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as any[], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Get institution types mapped to a regulator
 */
export async function getInstitutionTypesByRegulator(
  regulatorId: string
): Promise<ServiceResult<InstitutionTypeRegulator[]>> {
  try {
    const { data, error } = await supabase
      .from('institution_type_regulators')
      .select(`
        id,
        institution_type_id,
        regulator_id,
        is_primary,
        institution_types:institution_type_id (id, name, slug, category, is_active)
      `)
      .eq('regulator_id', regulatorId);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as any[], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Map a regulator to an institution type
 */
export async function mapRegulatorToInstitutionType(
  institutionTypeId: string,
  regulatorId: string,
  isPrimary = false
): Promise<ServiceResult<InstitutionTypeRegulator>> {
  try {
    const { data, error } = await supabase
      .from('institution_type_regulators')
      .insert({
        institution_type_id: institutionTypeId,
        regulator_id: regulatorId,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as InstitutionTypeRegulator, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Remove a regulator mapping from an institution type
 */
export async function unmapRegulatorFromInstitutionType(
  mappingId: string
): Promise<ServiceResult<null>> {
  try {
    const { error } = await supabase
      .from('institution_type_regulators')
      .delete()
      .eq('id', mappingId);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

// ─── Organization Institution Type ──────────────────────────────────

/**
 * Set the institution type for an organization
 */
export async function setOrganizationInstitutionType(
  organizationId: string,
  institutionTypeId: string
): Promise<ServiceResult<null>> {
  try {
    // Also get the name for the text column backfill
    const { data: instType } = await supabase
      .from('institution_types')
      .select('name')
      .eq('id', institutionTypeId)
      .single();

    const { error } = await supabase
      .from('organizations')
      .update({
        institution_type_id: institutionTypeId,
        institution_type: instType?.name || null,
      })
      .eq('id', organizationId);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Get the institution type for an organization (with regulators)
 */
export async function getOrganizationInstitutionType(
  organizationId: string
): Promise<ServiceResult<{ institutionType: InstitutionType | null; regulators: Regulator[] }>> {
  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        institution_type_id,
        institution_types:institution_type_id (*)
      `)
      .eq('id', organizationId)
      .single();

    if (orgError || !org?.institution_types) {
      return { data: { institutionType: null, regulators: [] }, error: null };
    }

    // Get mapped regulators
    const { data: mappings } = await supabase
      .from('institution_type_regulators')
      .select('regulators:regulator_id (id, code, name, country, is_active)')
      .eq('institution_type_id', org.institution_type_id);

    const regulators = (mappings || [])
      .map((m: any) => m.regulators)
      .filter(Boolean);

    return {
      data: {
        institutionType: org.institution_types as any as InstitutionType,
        regulators: regulators as Regulator[],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
