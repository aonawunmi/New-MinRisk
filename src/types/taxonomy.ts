/**
 * Risk Taxonomy Types
 *
 * Phase 1: Admin Taxonomy Management
 */

export interface RiskCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RiskSubcategory {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateCategoryData {
  name: string;
  description: string;
}

export interface CreateSubcategoryData {
  category_id: string;
  name: string;
  description: string;
}

export interface UpdateCategoryData {
  id: string;
  name?: string;
  description?: string;
}

export interface UpdateSubcategoryData {
  id: string;
  category_id?: string;
  name?: string;
  description?: string;
}

// For bulk import/export
export interface TaxonomyExportRow {
  category: string;
  category_description: string;
  subcategory: string;
  subcategory_description: string;
}

// For displaying hierarchy in UI
export interface CategoryWithSubcategories extends RiskCategory {
  subcategories: RiskSubcategory[];
}
