/**
 * Taxonomy Management Component
 *
 * Phase 1: Admin Taxonomy Management
 * Allows admins to create, view, update, and delete risk categories and subcategories.
 * Includes bulk import/export functionality.
 */

import { useState, useEffect } from 'react';
import {
  getCategoriesWithSubcategories,
  createCategory,
  createSubcategory,
  updateCategory,
  updateSubcategory,
  deleteCategory,
  deleteSubcategory,
  exportTaxonomy,
  importTaxonomy,
} from '@/lib/taxonomy';
import type {
  CategoryWithSubcategories,
  RiskCategory,
  RiskSubcategory,
  TaxonomyExportRow,
} from '@/types/taxonomy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TaxonomyManagement() {
  const [taxonomy, setTaxonomy] = useState<CategoryWithSubcategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RiskCategory | null>(
    null
  );
  const [editingSubcategory, setEditingSubcategory] = useState<RiskSubcategory | null>(
    null
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryDescription, setSubcategoryDescription] = useState('');

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTaxonomy();
  }, []);

  async function loadTaxonomy() {
    setLoading(true);
    const { data, error } = await getCategoriesWithSubcategories();
    if (error) {
      setError(error.message);
    } else {
      setTaxonomy(data || []);
    }
    setLoading(false);
  }

  // Category operations
  function openCategoryDialog(category?: RiskCategory) {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
    }
    setShowCategoryDialog(true);
  }

  async function handleSaveCategory() {
    setError(null);
    setSuccess(null);

    try {
      if (editingCategory) {
        // Update
        const { error } = await updateCategory({
          id: editingCategory.id,
          name: categoryName,
          description: categoryDescription,
        });
        if (error) throw error;
        setSuccess('Category updated successfully');
      } else {
        // Create
        const { error } = await createCategory({
          name: categoryName,
          description: categoryDescription,
        });
        if (error) throw error;
        setSuccess('Category created successfully');
      }
      setShowCategoryDialog(false);
      await loadTaxonomy();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteCategory(category: RiskCategory) {
    if (
      !confirm(
        `Delete category "${category.name}"? This will only work if it has no subcategories or risks.`
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);

    const { error } = await deleteCategory(category.id);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Category deleted successfully');
      await loadTaxonomy();
    }
  }

  // Subcategory operations
  function openSubcategoryDialog(
    categoryId: string,
    subcategory?: RiskSubcategory
  ) {
    setSelectedCategoryId(categoryId);
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setSubcategoryName(subcategory.name);
      setSubcategoryDescription(subcategory.description);
    } else {
      setEditingSubcategory(null);
      setSubcategoryName('');
      setSubcategoryDescription('');
    }
    setShowSubcategoryDialog(true);
  }

  async function handleSaveSubcategory() {
    setError(null);
    setSuccess(null);

    try {
      if (editingSubcategory) {
        // Update
        const { error } = await updateSubcategory({
          id: editingSubcategory.id,
          name: subcategoryName,
          description: subcategoryDescription,
        });
        if (error) throw error;
        setSuccess('Subcategory updated successfully');
      } else {
        // Create
        const { error } = await createSubcategory({
          category_id: selectedCategoryId,
          name: subcategoryName,
          description: subcategoryDescription,
        });
        if (error) throw error;
        setSuccess('Subcategory created successfully');
      }
      setShowSubcategoryDialog(false);
      await loadTaxonomy();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteSubcategory(subcategory: RiskSubcategory) {
    if (
      !confirm(
        `Delete subcategory "${subcategory.name}"? This will only work if it's not assigned to any risks.`
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);

    const { error } = await deleteSubcategory(subcategory.id);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Subcategory deleted successfully');
      await loadTaxonomy();
    }
  }

  // Bulk operations
  async function handleExport() {
    setError(null);
    setSuccess(null);

    const { data, error } = await exportTaxonomy();
    if (error) {
      setError(error.message);
      return;
    }

    // Convert to Excel format
    const ws = XLSX.utils.json_to_sheet(
      (data || []).map((row) => ({
        'Risk Category': row.category,
        'Category Description': row.category_description,
        'Sub-Category': row.subcategory,
        'Sub-Category Description': row.subcategory_description,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Risk Taxonomy');

    XLSX.writeFile(wb, 'MinRisk_Taxonomy.xlsx');
    setSuccess('Taxonomy exported successfully');
  }

  function downloadTemplate() {
    // Create sample template with example data
    const sampleData = [
      {
        'Risk Category': 'Operational Risk',
        'Category Description': 'Risks arising from internal processes, systems, and people',
        'Sub-Category': 'Process Risk',
        'Sub-Category Description': 'Risk of loss from inadequate or failed internal processes',
      },
      {
        'Risk Category': 'Operational Risk',
        'Category Description': 'Risks arising from internal processes, systems, and people',
        'Sub-Category': 'Technology Risk',
        'Sub-Category Description': 'Risk of loss from IT system failures or cyber incidents',
      },
      {
        'Risk Category': 'Financial Risk',
        'Category Description': 'Risks related to financial transactions and market movements',
        'Sub-Category': 'Credit Risk',
        'Sub-Category Description': 'Risk of loss from counterparty default or credit deterioration',
      },
      {
        'Risk Category': 'Compliance Risk',
        'Category Description': 'Risks from non-compliance with laws, regulations, and policies',
        'Sub-Category': 'Regulatory Risk',
        'Sub-Category Description': 'Risk of regulatory sanctions or penalties',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 20 },  // Risk Category
      { wch: 60 },  // Category Description
      { wch: 25 },  // Sub-Category
      { wch: 60 },  // Sub-Category Description
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Taxonomy Template');
    XLSX.writeFile(wb, 'MinRisk_Taxonomy_Template.xlsx');
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      // Convert to expected format
      const rows: TaxonomyExportRow[] = jsonData.map((row) => ({
        category: row['Risk Category'] || row['category'] || '',
        category_description:
          row['Category Description'] || row['category_description'] || '',
        subcategory: row['Sub-Category'] || row['subcategory'] || '',
        subcategory_description:
          row['Sub-Category Description'] ||
          row['subcategory_description'] ||
          '',
      }));

      const { data: result, error } = await importTaxonomy(rows);
      if (error) throw error;

      setSuccess(
        `Import complete: ${result!.imported} imported, ${result!.skipped} skipped${result!.errors.length > 0
          ? `, ${result!.errors.length} errors`
          : ''
        }`
      );

      if (result!.errors.length > 0) {
        console.error('Import errors:', result!.errors);
      }

      await loadTaxonomy();
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
    }

    // Reset file input
    event.target.value = '';
  }

  function toggleCategory(categoryId: string) {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  }

  if (loading) {
    return <div className="text-center py-8">Loading taxonomy...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Risk Taxonomy Management</CardTitle>
              <CardDescription>
                Manage risk categories and sub-categories for AI classification
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openCategoryDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleImport}
                    />
                  </label>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadTemplate}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="Download sample template"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Template
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {taxonomy.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No taxonomy defined. Add categories to get started.
              </div>
            ) : (
              taxonomy.map((category) => (
                <div key={category.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="font-semibold">{category.name}</div>
                        <div className="text-sm text-gray-600">
                          {category.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {category.subcategories.length} subcategories
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          openSubcategoryDialog(category.id)
                        }
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Sub
                      </Button>
                      <Button
                        onClick={() => openCategoryDialog(category)}
                        size="sm"
                        variant="ghost"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteCategory(category)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedCategories.has(category.id) && (
                    <div className="border-t bg-gray-50 p-4">
                      {category.subcategories.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-2">
                          No subcategories. Click "Add Sub" to create one.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {category.subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between bg-white p-3 rounded border"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {sub.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {sub.description}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() =>
                                    openSubcategoryDialog(category.id, sub)
                                  }
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteSubcategory(sub)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              Enter the category name and a concise description (max 200 chars)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Financial Risk"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description *</Label>
              <Textarea
                id="cat-desc"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Brief description of this category..."
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                {categoryDescription.length}/200 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCategoryDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={!categoryName || !categoryDescription}
            >
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog
        open={showSubcategoryDialog}
        onOpenChange={setShowSubcategoryDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
            </DialogTitle>
            <DialogDescription>
              Enter the subcategory name and a concise description (max 200
              chars)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sub-name">Subcategory Name *</Label>
              <Input
                id="sub-name"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                placeholder="e.g., Market Risk - Interest Rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub-desc">Description *</Label>
              <Textarea
                id="sub-desc"
                value={subcategoryDescription}
                onChange={(e) => setSubcategoryDescription(e.target.value)}
                placeholder="Brief description of this subcategory..."
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                {subcategoryDescription.length}/200 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubcategoryDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSubcategory}
              disabled={!subcategoryName || !subcategoryDescription}
            >
              {editingSubcategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
