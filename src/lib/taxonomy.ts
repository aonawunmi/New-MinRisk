/**
 * Risk Taxonomy Library
 *
 * Phase 1: Admin Taxonomy Management
 * CRUD operations for risk categories and subcategories
 */

import { supabase } from './supabase';
import { getAuthenticatedProfile } from './auth';
import type { ApiResponse } from '@/types/api';
import type {
  RiskCategory,
  RiskSubcategory,
  CreateCategoryData,
  CreateSubcategoryData,
  UpdateCategoryData,
  UpdateSubcategoryData,
  CategoryWithSubcategories,
  TaxonomyExportRow,
} from '@/types/taxonomy';

// ============================================================================
// RISK CATEGORIES
// ============================================================================

/**
 * Get all risk categories for the current organization
 */
export async function getCategories(): Promise<ApiResponse<RiskCategory[]>> {
  try {
    const { data, error } = await supabase
      .from('risk_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get categories error:', error);
    return { data: null, error };
  }
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(
  id: string
): Promise<ApiResponse<RiskCategory>> {
  try {
    const { data, error } = await supabase
      .from('risk_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Get category by ID error:', error);
    return { data: null, error };
  }
}

/**
 * Create a new risk category
 */
export async function createCategory(
  categoryData: CreateCategoryData
): Promise<ApiResponse<RiskCategory>> {
  try {
    // Validate description length
    if (categoryData.description.length > 200) {
      throw new Error('Description must be 200 characters or less');
    }

    // Get user's organization_id
    const profile = await getAuthenticatedProfile();
    if (!profile) throw new Error('Not authenticated');

    if (!profile.organization_id) {
      throw new Error('No organization found for user');
    }

    const { data, error } = await supabase
      .from('risk_categories')
      .insert({
        organization_id: profile.organization_id,
        name: categoryData.name,
        description: categoryData.description,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Create category error:', error);
    return { data: null, error };
  }
}

/**
 * Update a risk category
 */
export async function updateCategory(
  updateData: UpdateCategoryData
): Promise<ApiResponse<RiskCategory>> {
  try {
    const { id, ...updates } = updateData;

    // Validate description length if provided
    if (updates.description && updates.description.length > 200) {
      throw new Error('Description must be 200 characters or less');
    }

    const { data, error } = await supabase
      .from('risk_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Update category error:', error);
    return { data: null, error };
  }
}

/**
 * Delete a risk category (only if no subcategories or risks exist)
 */
export async function deleteCategory(id: string): Promise<ApiResponse<void>> {
  try {
    // Check if category can be deleted
    const { data: canDelete, error: checkError } = await supabase.rpc(
      'can_delete_category',
      { category_id_param: id }
    );

    if (checkError) throw checkError;

    if (!canDelete) {
      throw new Error(
        'Cannot delete category: it has subcategories or is assigned to risks'
      );
    }

    const { error } = await supabase
      .from('risk_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error: any) {
    console.error('Delete category error:', error);
    return { data: null, error };
  }
}

// ============================================================================
// RISK SUBCATEGORIES
// ============================================================================

/**
 * Get all risk subcategories for the current organization
 */
export async function getSubcategories(): Promise<
  ApiResponse<RiskSubcategory[]>
> {
  try {
    const { data, error } = await supabase
      .from('risk_subcategories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get subcategories error:', error);
    return { data: null, error };
  }
}

/**
 * Get subcategories for a specific category
 */
export async function getSubcategoriesByCategory(
  categoryId: string
): Promise<ApiResponse<RiskSubcategory[]>> {
  try {
    const { data, error } = await supabase
      .from('risk_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get subcategories by category error:', error);
    return { data: null, error };
  }
}

/**
 * Create a new risk subcategory
 */
export async function createSubcategory(
  subcategoryData: CreateSubcategoryData
): Promise<ApiResponse<RiskSubcategory>> {
  try {
    // Validate description length
    if (subcategoryData.description.length > 200) {
      throw new Error('Description must be 200 characters or less');
    }

    // Get user's organization_id
    const profile = await getAuthenticatedProfile();
    if (!profile) throw new Error('Not authenticated');

    if (!profile.organization_id) {
      throw new Error('No organization found for user');
    }

    const { data, error } = await supabase
      .from('risk_subcategories')
      .insert({
        organization_id: profile.organization_id,
        category_id: subcategoryData.category_id,
        name: subcategoryData.name,
        description: subcategoryData.description,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Create subcategory error:', error);
    return { data: null, error };
  }
}

/**
 * Update a risk subcategory
 */
export async function updateSubcategory(
  updateData: UpdateSubcategoryData
): Promise<ApiResponse<RiskSubcategory>> {
  try {
    const { id, ...updates } = updateData;

    // Validate description length if provided
    if (updates.description && updates.description.length > 200) {
      throw new Error('Description must be 200 characters or less');
    }

    const { data, error } = await supabase
      .from('risk_subcategories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Update subcategory error:', error);
    return { data: null, error };
  }
}

/**
 * Delete a risk subcategory (only if not assigned to any risks)
 */
export async function deleteSubcategory(id: string): Promise<ApiResponse<void>> {
  try {
    // Check if subcategory can be deleted
    const { data: canDelete, error: checkError } = await supabase.rpc(
      'can_delete_subcategory',
      { subcategory_id_param: id }
    );

    if (checkError) throw checkError;

    if (!canDelete) {
      throw new Error(
        'Cannot delete subcategory: it is assigned to one or more risks'
      );
    }

    const { error } = await supabase
      .from('risk_subcategories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error: any) {
    console.error('Delete subcategory error:', error);
    return { data: null, error };
  }
}

// ============================================================================
// COMBINED OPERATIONS
// ============================================================================

/**
 * Get all categories with their subcategories (hierarchical view)
 */
export async function getCategoriesWithSubcategories(): Promise<
  ApiResponse<CategoryWithSubcategories[]>
> {
  try {
    // Get all categories
    const { data: categories, error: catError } = await getCategories();
    if (catError) throw catError;

    // Get all subcategories
    const { data: subcategories, error: subError } = await getSubcategories();
    if (subError) throw subError;

    // Combine them
    const combined: CategoryWithSubcategories[] = (categories || []).map(
      (cat) => ({
        ...cat,
        subcategories: (subcategories || []).filter(
          (sub) => sub.category_id === cat.id
        ),
      })
    );

    return { data: combined, error: null };
  } catch (error: any) {
    console.error('Get categories with subcategories error:', error);
    return { data: null, error };
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Export taxonomy to array format (for Excel export)
 */
export async function exportTaxonomy(): Promise<
  ApiResponse<TaxonomyExportRow[]>
> {
  try {
    const { data: combined, error } = await getCategoriesWithSubcategories();
    if (error) throw error;

    const rows: TaxonomyExportRow[] = [];

    (combined || []).forEach((category) => {
      category.subcategories.forEach((subcategory) => {
        rows.push({
          category: category.name,
          category_description: category.description,
          subcategory: subcategory.name,
          subcategory_description: subcategory.description,
        });
      });
    });

    return { data: rows, error: null };
  } catch (error: any) {
    console.error('Export taxonomy error:', error);
    return { data: null, error };
  }
}

/**
 * Import taxonomy from Excel data
 * Creates categories and subcategories, skipping duplicates
 */
export async function importTaxonomy(
  rows: TaxonomyExportRow[]
): Promise<ApiResponse<{ imported: number; skipped: number; errors: string[] }>> {
  try {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Get existing categories
    const { data: existingCategories } = await getCategories();
    const categoryMap = new Map<string, string>(); // name -> id

    // Build map of existing categories
    (existingCategories || []).forEach((cat) => {
      categoryMap.set(cat.name, cat.id);
    });

    // Process each row
    for (const row of rows) {
      try {
        // Create or get category
        let categoryId = categoryMap.get(row.category);

        if (!categoryId) {
          const { data: newCat, error: catError } = await createCategory({
            name: row.category,
            description: row.category_description,
          });

          if (catError) {
            errors.push(`Category "${row.category}": ${catError.message}`);
            skipped++;
            continue;
          }

          categoryId = newCat!.id;
          categoryMap.set(row.category, categoryId);
        }

        // Create subcategory
        const { error: subError } = await createSubcategory({
          category_id: categoryId,
          name: row.subcategory,
          description: row.subcategory_description,
        });

        if (subError) {
          // If subcategory already exists, skip
          if (subError.message.includes('duplicate')) {
            skipped++;
          } else {
            errors.push(
              `Subcategory "${row.subcategory}": ${subError.message}`
            );
            skipped++;
          }
        } else {
          imported++;
        }
      } catch (err: any) {
        errors.push(`Row error: ${err.message}`);
        skipped++;
      }
    }

    return { data: { imported, skipped, errors }, error: null };
  } catch (error: any) {
    console.error('Import taxonomy error:', error);
    return { data: null, error };
  }
}
