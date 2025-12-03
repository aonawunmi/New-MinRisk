import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Risk Configuration Component
 *
 * Allows admins to configure:
 * - Divisions and Departments (dropdown lists)
 * - Likelihood and Impact labels (numeric-to-text mapping)
 * - Matrix size (5x5 or 6x6)
 * - Risk categories
 */
import { useState, useEffect } from 'react';
import { getOrganizationConfig, updateOrganizationConfig, DEFAULT_5X5_LIKELIHOOD_LABELS, DEFAULT_5X5_IMPACT_LABELS, DEFAULT_6X6_LIKELIHOOD_LABELS, DEFAULT_6X6_IMPACT_LABELS, } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Settings, Plus, X, RotateCcw, Building2, Tag, TrendingUp, } from 'lucide-react';
export default function RiskConfiguration() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // Form state
    const [matrixSize, setMatrixSize] = useState(5);
    const [likelihoodLabels, setLikelihoodLabels] = useState(DEFAULT_5X5_LIKELIHOOD_LABELS);
    const [impactLabels, setImpactLabels] = useState(DEFAULT_5X5_IMPACT_LABELS);
    const [divisions, setDivisions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    // New item inputs
    const [newDivision, setNewDivision] = useState('');
    const [newDepartment, setNewDepartment] = useState('');
    const [newCategory, setNewCategory] = useState('');
    // Feedback
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        loadConfig();
    }, []);
    async function loadConfig() {
        setLoading(true);
        setError(null);
        try {
            const { data, error: configError } = await getOrganizationConfig();
            if (configError) {
                console.error('Load config error:', configError);
                setError(configError.message);
                return;
            }
            if (data) {
                setConfig(data);
                setMatrixSize(data.matrix_size);
                setLikelihoodLabels(data.likelihood_labels);
                setImpactLabels(data.impact_labels);
                setDivisions(data.divisions || []);
                setDepartments(data.departments || []);
                setCategories(data.categories || []);
            }
        }
        catch (err) {
            console.error('Unexpected error loading config:', err);
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSave() {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const { error: updateError } = await updateOrganizationConfig({
                matrix_size: matrixSize,
                likelihood_labels: likelihoodLabels,
                impact_labels: impactLabels,
                divisions,
                departments,
                categories,
            });
            if (updateError) {
                setError(updateError.message);
                return;
            }
            setSuccess('Configuration saved successfully!');
            setTimeout(() => setSuccess(null), 3000);
            await loadConfig();
        }
        catch (err) {
            console.error('Save error:', err);
            setError(err.message);
        }
        finally {
            setSaving(false);
        }
    }
    async function handleResetLabels() {
        if (!confirm('Reset likelihood and impact labels to default values?')) {
            return;
        }
        const defaults = matrixSize === 5
            ? {
                likelihood: DEFAULT_5X5_LIKELIHOOD_LABELS,
                impact: DEFAULT_5X5_IMPACT_LABELS,
            }
            : {
                likelihood: DEFAULT_6X6_LIKELIHOOD_LABELS,
                impact: DEFAULT_6X6_IMPACT_LABELS,
            };
        setLikelihoodLabels(defaults.likelihood);
        setImpactLabels(defaults.impact);
        setSuccess('Labels reset to defaults. Click Save to apply changes.');
        setTimeout(() => setSuccess(null), 3000);
    }
    function handleMatrixSizeChange(size) {
        const newSize = parseInt(size);
        setMatrixSize(newSize);
        // Update labels to match matrix size
        if (newSize === 5) {
            setLikelihoodLabels(DEFAULT_5X5_LIKELIHOOD_LABELS);
            setImpactLabels(DEFAULT_5X5_IMPACT_LABELS);
        }
        else {
            setLikelihoodLabels(DEFAULT_6X6_LIKELIHOOD_LABELS);
            setImpactLabels(DEFAULT_6X6_IMPACT_LABELS);
        }
    }
    function updateLikelihoodLabel(level, value) {
        setLikelihoodLabels({ ...likelihoodLabels, [level]: value });
    }
    function updateImpactLabel(level, value) {
        setImpactLabels({ ...impactLabels, [level]: value });
    }
    function addDivision() {
        if (newDivision.trim() && !divisions.includes(newDivision.trim())) {
            setDivisions([...divisions, newDivision.trim()]);
            setNewDivision('');
        }
    }
    function removeDivision(division) {
        setDivisions(divisions.filter(d => d !== division));
    }
    function addDepartment() {
        if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
            setDepartments([...departments, newDepartment.trim()]);
            setNewDepartment('');
        }
    }
    function removeDepartment(department) {
        setDepartments(departments.filter(d => d !== department));
    }
    function addCategory() {
        if (newCategory.trim() && !categories.includes(newCategory.trim())) {
            setCategories([...categories, newCategory.trim()]);
            setNewCategory('');
        }
    }
    function removeCategory(category) {
        setCategories(categories.filter(c => c !== category));
    }
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-96", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading configuration..." }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-2xl font-bold flex items-center gap-2", children: [_jsx(Settings, { className: "h-6 w-6" }), "Risk Configuration"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "Configure organizational structure and risk assessment parameters" })] }), error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), success && (_jsxs(Alert, { className: "bg-green-50 border-green-200", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600" }), _jsx(AlertDescription, { className: "text-green-800", children: success })] })), _jsxs(Tabs, { defaultValue: "structure", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-3", children: [_jsxs(TabsTrigger, { value: "structure", children: [_jsx(Building2, { className: "h-4 w-4 mr-2" }), "Organizational Structure"] }), _jsxs(TabsTrigger, { value: "labels", children: [_jsx(Tag, { className: "h-4 w-4 mr-2" }), "Risk Labels"] }), _jsxs(TabsTrigger, { value: "categories", children: [_jsx(TrendingUp, { className: "h-4 w-4 mr-2" }), "Categories"] })] }), _jsxs(TabsContent, { value: "structure", className: "space-y-4 mt-4", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Divisions" }), _jsx(CardDescription, { children: "Define the divisions in your organization. These will appear as dropdown options when creating risks." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Enter division name...", value: newDivision, onChange: (e) => setNewDivision(e.target.value), onKeyPress: (e) => e.key === 'Enter' && addDivision() }), _jsxs(Button, { onClick: addDivision, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Add"] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [divisions.map((division) => (_jsxs(Badge, { variant: "secondary", className: "text-sm py-1 px-3", children: [division, _jsx(X, { className: "h-3 w-3 ml-2 cursor-pointer hover:text-red-600", onClick: () => removeDivision(division) })] }, division))), divisions.length === 0 && (_jsx("p", { className: "text-sm text-gray-500", children: "No divisions defined" }))] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Departments" }), _jsx(CardDescription, { children: "Define the departments in your organization. These will appear as dropdown options when creating risks." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Enter department name...", value: newDepartment, onChange: (e) => setNewDepartment(e.target.value), onKeyPress: (e) => e.key === 'Enter' && addDepartment() }), _jsxs(Button, { onClick: addDepartment, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Add"] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [departments.map((department) => (_jsxs(Badge, { variant: "secondary", className: "text-sm py-1 px-3", children: [department, _jsx(X, { className: "h-3 w-3 ml-2 cursor-pointer hover:text-red-600", onClick: () => removeDepartment(department) })] }, department))), departments.length === 0 && (_jsx("p", { className: "text-sm text-gray-500", children: "No departments defined" }))] })] })] })] }), _jsx(TabsContent, { value: "labels", className: "space-y-4 mt-4", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Risk Matrix Configuration" }), _jsx(CardDescription, { children: "Choose your risk matrix size and customize likelihood/impact labels" })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Matrix Size" }), _jsxs(Select, { value: matrixSize.toString(), onValueChange: handleMatrixSizeChange, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "5", children: "5x5 Matrix" }), _jsx(SelectItem, { value: "6", children: "6x6 Matrix" })] })] }), _jsx("p", { className: "text-sm text-gray-500", children: "Changing matrix size will reset all labels to defaults" })] }), _jsx("div", { className: "flex justify-end", children: _jsxs(Button, { variant: "outline", size: "sm", onClick: handleResetLabels, children: [_jsx(RotateCcw, { className: "h-4 w-4 mr-2" }), "Reset to Defaults"] }) }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { className: "text-base font-semibold", children: "Likelihood Labels" }), _jsx("div", { className: "grid gap-3", children: Array.from({ length: matrixSize }, (_, i) => i + 1).map((level) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "w-12 text-sm font-medium text-gray-600", children: [level, ":"] }), _jsx(Input, { value: likelihoodLabels[level.toString()] || '', onChange: (e) => updateLikelihoodLabel(level.toString(), e.target.value), placeholder: `Likelihood level ${level}` })] }, `likelihood-${level}`))) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { className: "text-base font-semibold", children: "Impact Labels" }), _jsx("div", { className: "grid gap-3", children: Array.from({ length: matrixSize }, (_, i) => i + 1).map((level) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "w-12 text-sm font-medium text-gray-600", children: [level, ":"] }), _jsx(Input, { value: impactLabels[level.toString()] || '', onChange: (e) => updateImpactLabel(level.toString(), e.target.value), placeholder: `Impact level ${level}` })] }, `impact-${level}`))) })] })] })] }) }), _jsx(TabsContent, { value: "categories", className: "space-y-4 mt-4", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Risk Categories" }), _jsx(CardDescription, { children: "Define risk categories for classification (e.g., Strategic, Operational, Financial)" })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Enter category name...", value: newCategory, onChange: (e) => setNewCategory(e.target.value), onKeyPress: (e) => e.key === 'Enter' && addCategory() }), _jsxs(Button, { onClick: addCategory, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Add"] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [categories.map((category) => (_jsxs(Badge, { variant: "secondary", className: "text-sm py-1 px-3", children: [category, _jsx(X, { className: "h-3 w-3 ml-2 cursor-pointer hover:text-red-600", onClick: () => removeCategory(category) })] }, category))), categories.length === 0 && (_jsx("p", { className: "text-sm text-gray-500", children: "No categories defined" }))] })] })] }) })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4 border-t", children: [_jsx(Button, { variant: "outline", onClick: loadConfig, disabled: saving, children: "Cancel" }), _jsx(Button, { onClick: handleSave, disabled: saving, children: saving ? 'Saving...' : 'Save Configuration' })] })] }));
}
