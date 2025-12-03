import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Taxonomy Management Component
 *
 * Phase 1: Admin Taxonomy Management
 * Allows admins to create, view, update, and delete risk categories and subcategories.
 * Includes bulk import/export functionality.
 */
import { useState, useEffect } from 'react';
import { getCategoriesWithSubcategories, createCategory, createSubcategory, updateCategory, updateSubcategory, deleteCategory, deleteSubcategory, exportTaxonomy, importTaxonomy, } from '@/lib/taxonomy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Upload, Download, ChevronDown, ChevronRight, AlertCircle, CheckCircle, } from 'lucide-react';
import * as XLSX from 'xlsx';
export default function TaxonomyManagement() {
    const [taxonomy, setTaxonomy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    // Dialog states
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    // Form states
    const [categoryName, setCategoryName] = useState('');
    const [categoryDescription, setCategoryDescription] = useState('');
    const [subcategoryName, setSubcategoryName] = useState('');
    const [subcategoryDescription, setSubcategoryDescription] = useState('');
    // Feedback states
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        loadTaxonomy();
    }, []);
    async function loadTaxonomy() {
        setLoading(true);
        const { data, error } = await getCategoriesWithSubcategories();
        if (error) {
            setError(error.message);
        }
        else {
            setTaxonomy(data || []);
        }
        setLoading(false);
    }
    // Category operations
    function openCategoryDialog(category) {
        if (category) {
            setEditingCategory(category);
            setCategoryName(category.name);
            setCategoryDescription(category.description);
        }
        else {
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
                if (error)
                    throw error;
                setSuccess('Category updated successfully');
            }
            else {
                // Create
                const { error } = await createCategory({
                    name: categoryName,
                    description: categoryDescription,
                });
                if (error)
                    throw error;
                setSuccess('Category created successfully');
            }
            setShowCategoryDialog(false);
            await loadTaxonomy();
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleDeleteCategory(category) {
        if (!confirm(`Delete category "${category.name}"? This will only work if it has no subcategories or risks.`)) {
            return;
        }
        setError(null);
        setSuccess(null);
        const { error } = await deleteCategory(category.id);
        if (error) {
            setError(error.message);
        }
        else {
            setSuccess('Category deleted successfully');
            await loadTaxonomy();
        }
    }
    // Subcategory operations
    function openSubcategoryDialog(categoryId, subcategory) {
        setSelectedCategoryId(categoryId);
        if (subcategory) {
            setEditingSubcategory(subcategory);
            setSubcategoryName(subcategory.name);
            setSubcategoryDescription(subcategory.description);
        }
        else {
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
                if (error)
                    throw error;
                setSuccess('Subcategory updated successfully');
            }
            else {
                // Create
                const { error } = await createSubcategory({
                    category_id: selectedCategoryId,
                    name: subcategoryName,
                    description: subcategoryDescription,
                });
                if (error)
                    throw error;
                setSuccess('Subcategory created successfully');
            }
            setShowSubcategoryDialog(false);
            await loadTaxonomy();
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleDeleteSubcategory(subcategory) {
        if (!confirm(`Delete subcategory "${subcategory.name}"? This will only work if it's not assigned to any risks.`)) {
            return;
        }
        setError(null);
        setSuccess(null);
        const { error } = await deleteSubcategory(subcategory.id);
        if (error) {
            setError(error.message);
        }
        else {
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
        const ws = XLSX.utils.json_to_sheet((data || []).map((row) => ({
            'Risk Category': row.category,
            'Category Description': row.category_description,
            'Sub-Category': row.subcategory,
            'Sub-Category Description': row.subcategory_description,
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Risk Taxonomy');
        XLSX.writeFile(wb, 'MinRisk_Taxonomy.xlsx');
        setSuccess('Taxonomy exported successfully');
    }
    async function handleImport(event) {
        setError(null);
        setSuccess(null);
        const file = event.target.files?.[0];
        if (!file)
            return;
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            // Convert to expected format
            const rows = jsonData.map((row) => ({
                category: row['Risk Category'] || row['category'] || '',
                category_description: row['Category Description'] || row['category_description'] || '',
                subcategory: row['Sub-Category'] || row['subcategory'] || '',
                subcategory_description: row['Sub-Category Description'] ||
                    row['subcategory_description'] ||
                    '',
            }));
            const { data: result, error } = await importTaxonomy(rows);
            if (error)
                throw error;
            setSuccess(`Import complete: ${result.imported} imported, ${result.skipped} skipped${result.errors.length > 0
                ? `, ${result.errors.length} errors`
                : ''}`);
            if (result.errors.length > 0) {
                console.error('Import errors:', result.errors);
            }
            await loadTaxonomy();
        }
        catch (err) {
            setError(`Import failed: ${err.message}`);
        }
        // Reset file input
        event.target.value = '';
    }
    function toggleCategory(categoryId) {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        }
        else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    }
    if (loading) {
        return _jsx("div", { className: "text-center py-8", children: "Loading taxonomy..." });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Risk Taxonomy Management" }), _jsx(CardDescription, { children: "Manage risk categories and sub-categories for AI classification" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { onClick: () => openCategoryDialog(), size: "sm", children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Add Category"] }), _jsxs(Button, { onClick: handleExport, variant: "outline", size: "sm", children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), "Export"] }), _jsx(Button, { variant: "outline", size: "sm", asChild: true, children: _jsxs("label", { className: "cursor-pointer", children: [_jsx(Upload, { className: "h-4 w-4 mr-2" }), "Import", _jsx("input", { type: "file", accept: ".xlsx,.xls", className: "hidden", onChange: handleImport })] }) })] })] }) }), _jsxs(CardContent, { children: [error && (_jsxs(Alert, { variant: "destructive", className: "mb-4", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), success && (_jsxs(Alert, { className: "mb-4 bg-green-50 border-green-200", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600" }), _jsx(AlertDescription, { className: "text-green-800", children: success })] })), _jsx("div", { className: "space-y-2", children: taxonomy.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No taxonomy defined. Add categories to get started." })) : (taxonomy.map((category) => (_jsxs("div", { className: "border rounded-lg", children: [_jsxs("div", { className: "flex items-center justify-between p-4 hover:bg-gray-50", children: [_jsxs("div", { className: "flex items-center gap-2 flex-1", children: [_jsx("button", { onClick: () => toggleCategory(category.id), className: "text-gray-500 hover:text-gray-700", children: expandedCategories.has(category.id) ? (_jsx(ChevronDown, { className: "h-5 w-5" })) : (_jsx(ChevronRight, { className: "h-5 w-5" })) }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-semibold", children: category.name }), _jsx("div", { className: "text-sm text-gray-600", children: category.description }), _jsxs("div", { className: "text-xs text-gray-500 mt-1", children: [category.subcategories.length, " subcategories"] })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { onClick: () => openSubcategoryDialog(category.id), size: "sm", variant: "outline", children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Add Sub"] }), _jsx(Button, { onClick: () => openCategoryDialog(category), size: "sm", variant: "ghost", children: _jsx(Edit, { className: "h-4 w-4" }) }), _jsx(Button, { onClick: () => handleDeleteCategory(category), size: "sm", variant: "ghost", className: "text-red-600 hover:text-red-700 hover:bg-red-50", children: _jsx(Trash2, { className: "h-4 w-4" }) })] })] }), expandedCategories.has(category.id) && (_jsx("div", { className: "border-t bg-gray-50 p-4", children: category.subcategories.length === 0 ? (_jsx("div", { className: "text-sm text-gray-500 text-center py-2", children: "No subcategories. Click \"Add Sub\" to create one." })) : (_jsx("div", { className: "space-y-2", children: category.subcategories.map((sub) => (_jsxs("div", { className: "flex items-center justify-between bg-white p-3 rounded border", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-medium text-sm", children: sub.name }), _jsx("div", { className: "text-sm text-gray-600", children: sub.description })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => openSubcategoryDialog(category.id, sub), size: "sm", variant: "ghost", children: _jsx(Edit, { className: "h-4 w-4" }) }), _jsx(Button, { onClick: () => handleDeleteSubcategory(sub), size: "sm", variant: "ghost", className: "text-red-600 hover:text-red-700 hover:bg-red-50", children: _jsx(Trash2, { className: "h-4 w-4" }) })] })] }, sub.id))) })) }))] }, category.id)))) })] })] }), _jsx(Dialog, { open: showCategoryDialog, onOpenChange: setShowCategoryDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: editingCategory ? 'Edit Category' : 'Add New Category' }), _jsx(DialogDescription, { children: "Enter the category name and a concise description (max 200 chars)" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "cat-name", children: "Category Name *" }), _jsx(Input, { id: "cat-name", value: categoryName, onChange: (e) => setCategoryName(e.target.value), placeholder: "e.g., Financial Risk" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "cat-desc", children: "Description *" }), _jsx(Textarea, { id: "cat-desc", value: categoryDescription, onChange: (e) => setCategoryDescription(e.target.value), placeholder: "Brief description of this category...", maxLength: 200, rows: 3 }), _jsxs("p", { className: "text-xs text-gray-500", children: [categoryDescription.length, "/200 characters"] })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setShowCategoryDialog(false), children: "Cancel" }), _jsx(Button, { onClick: handleSaveCategory, disabled: !categoryName || !categoryDescription, children: editingCategory ? 'Update' : 'Create' })] })] }) }), _jsx(Dialog, { open: showSubcategoryDialog, onOpenChange: setShowSubcategoryDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory' }), _jsx(DialogDescription, { children: "Enter the subcategory name and a concise description (max 200 chars)" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "sub-name", children: "Subcategory Name *" }), _jsx(Input, { id: "sub-name", value: subcategoryName, onChange: (e) => setSubcategoryName(e.target.value), placeholder: "e.g., Market Risk - Interest Rate" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "sub-desc", children: "Description *" }), _jsx(Textarea, { id: "sub-desc", value: subcategoryDescription, onChange: (e) => setSubcategoryDescription(e.target.value), placeholder: "Brief description of this subcategory...", maxLength: 200, rows: 3 }), _jsxs("p", { className: "text-xs text-gray-500", children: [subcategoryDescription.length, "/200 characters"] })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setShowSubcategoryDialog(false), children: "Cancel" }), _jsx(Button, { onClick: handleSaveSubcategory, disabled: !subcategoryName || !subcategoryDescription, children: editingSubcategory ? 'Update' : 'Create' })] })] }) })] }));
}
