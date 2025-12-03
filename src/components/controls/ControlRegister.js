import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ControlRegister Component
 *
 * Main control register view showing all controls with filtering and CRUD operations
 */
import { useState, useEffect } from 'react';
import { getAllControls, createControl, updateControl, deleteControl, calculateControlEffectiveness } from '@/lib/controls';
import { getRisks } from '@/lib/risks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { AlertCircle, Search, Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ControlForm from './ControlForm';
export default function ControlRegister() {
    const [controls, setControls] = useState([]);
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingControl, setEditingControl] = useState(null);
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTarget, setFilterTarget] = useState('all');
    const [filterRisk, setFilterRisk] = useState('all');
    // Sorting
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    useEffect(() => {
        loadData();
    }, []);
    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            // Load controls
            const { data: controlsData, error: controlsError } = await getAllControls();
            if (controlsError)
                throw controlsError;
            // Load risks for filtering
            const { data: risksData, error: risksError } = await getRisks();
            if (risksError)
                throw risksError;
            setControls(controlsData || []);
            setRisks(risksData || []);
        }
        catch (err) {
            console.error('Error loading data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSave(data) {
        try {
            if (editingControl) {
                // Update existing control
                const { error } = await updateControl(editingControl.id, data);
                if (error)
                    throw error;
            }
            else {
                // Create new control
                if (!data.risk_id) {
                    alert('Please select a risk for this control');
                    return;
                }
                const { error } = await createControl(data);
                if (error)
                    throw error;
            }
            await loadData();
            setShowForm(false);
            setEditingControl(null);
        }
        catch (err) {
            console.error('Error saving control:', err);
            alert(err instanceof Error ? err.message : 'Failed to save control');
        }
    }
    async function handleDelete(control) {
        if (!confirm(`Delete control "${control.name}"?`))
            return;
        try {
            const { error } = await deleteControl(control.id);
            if (error)
                throw error;
            await loadData();
        }
        catch (err) {
            console.error('Error deleting control:', err);
            alert(err instanceof Error ? err.message : 'Failed to delete control');
        }
    }
    function handleEdit(control) {
        setEditingControl(control);
        setShowForm(true);
    }
    function handleAddNew() {
        setEditingControl(null);
        setShowForm(true);
    }
    const handleSort = (column) => {
        if (sortColumn === column) {
            // Toggle direction if same column
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        }
        else {
            // New column, default to ascending
            setSortColumn(column);
            setSortDirection('asc');
        }
    };
    const getSortIcon = (column) => {
        if (sortColumn !== column) {
            return _jsx(ArrowUpDown, { className: "h-4 w-4 ml-1 opacity-30" });
        }
        return sortDirection === 'asc'
            ? _jsx(ArrowUp, { className: "h-4 w-4 ml-1" })
            : _jsx(ArrowDown, { className: "h-4 w-4 ml-1" });
    };
    // Filter and sort controls
    const filteredControls = controls
        .filter((control) => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = control.name.toLowerCase().includes(query) ||
                control.control_code.toLowerCase().includes(query) ||
                control.description?.toLowerCase().includes(query);
            if (!matchesSearch)
                return false;
        }
        // Target filter
        if (filterTarget !== 'all' && control.target !== filterTarget) {
            return false;
        }
        // Risk filter
        if (filterRisk !== 'all' && control.risk_id !== filterRisk) {
            return false;
        }
        return true;
    })
        .sort((a, b) => {
        if (!sortColumn)
            return 0;
        let aValue;
        let bValue;
        switch (sortColumn) {
            case 'code':
                aValue = a.control_code || '';
                bValue = b.control_code || '';
                break;
            case 'risk':
                const aRisk = risks.find(r => r.id === a.risk_id);
                const bRisk = risks.find(r => r.id === b.risk_id);
                aValue = aRisk?.risk_code || '';
                bValue = bRisk?.risk_code || '';
                break;
            case 'name':
                aValue = a.name || '';
                bValue = b.name || '';
                break;
            case 'type':
                aValue = a.control_type || '';
                bValue = b.control_type || '';
                break;
            case 'target':
                aValue = a.target || '';
                bValue = b.target || '';
                break;
            case 'effectiveness':
                aValue = calculateControlEffectiveness(a.design_score, a.implementation_score, a.monitoring_score, a.evaluation_score);
                bValue = calculateControlEffectiveness(b.design_score, b.implementation_score, b.monitoring_score, b.evaluation_score);
                break;
            default:
                return 0;
        }
        if (aValue < bValue)
            return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue)
            return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    const getEffectivenessColor = (effectiveness) => {
        if (effectiveness === 0)
            return 'bg-gray-400';
        if (effectiveness < 0.33)
            return 'bg-red-500';
        if (effectiveness < 0.67)
            return 'bg-yellow-500';
        return 'bg-green-500';
    };
    const getEffectivenessLabel = (effectiveness) => {
        if (effectiveness === 0)
            return 'None';
        if (effectiveness < 0.33)
            return 'Weak';
        if (effectiveness < 0.67)
            return 'Adequate';
        return 'Strong';
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "text-gray-600", children: "Loading controls..." }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold", children: "Control Register" }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: "Manage all risk controls with DIME framework assessment" })] }), _jsxs(Button, { onClick: handleAddNew, children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Add Control"] })] }), error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "Filters" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { placeholder: "Search controls...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "pl-10" })] }), _jsxs(Select, { value: filterTarget, onValueChange: (value) => setFilterTarget(value), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Filter by target" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Targets" }), _jsx(SelectItem, { value: "Likelihood", children: "Likelihood" }), _jsx(SelectItem, { value: "Impact", children: "Impact" })] })] }), _jsxs(Select, { value: filterRisk, onValueChange: setFilterRisk, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Filter by risk" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Risks" }), risks.map((risk) => (_jsxs(SelectItem, { value: risk.id, children: [risk.risk_code, " - ", risk.risk_title] }, risk.id)))] })] })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: controls.length }), _jsx("div", { className: "text-sm text-gray-600", children: "Total Controls" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: controls.filter((c) => c.target === 'Likelihood').length }), _jsx("div", { className: "text-sm text-gray-600", children: "Targeting Likelihood" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: controls.filter((c) => c.target === 'Impact').length }), _jsx("div", { className: "text-sm text-gray-600", children: "Targeting Impact" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: controls.filter((c) => {
                                        const eff = calculateControlEffectiveness(c.design_score, c.implementation_score, c.monitoring_score, c.evaluation_score);
                                        return eff >= 0.67;
                                    }).length }), _jsx("div", { className: "text-sm text-gray-600", children: "Strong Controls" })] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["Controls (", filteredControls.length, filteredControls.length !== controls.length && ` of ${controls.length}`, ")"] }) }), _jsx(CardContent, { children: filteredControls.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-gray-600", children: searchQuery || filterTarget !== 'all' || filterRisk !== 'all'
                                        ? 'No controls match your filters'
                                        : 'No controls yet' }), !searchQuery && filterTarget === 'all' && filterRisk === 'all' && (_jsx(Button, { className: "mt-4", onClick: handleAddNew, children: "Add First Control" }))] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('code'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Code ", getSortIcon('code')] }) }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('name'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Name ", getSortIcon('name')] }) }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('risk'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Risk ", getSortIcon('risk')] }) }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('type'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Type ", getSortIcon('type')] }) }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('target'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Target ", getSortIcon('target')] }) }), _jsx(TableHead, { children: "DIME Scores" }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('effectiveness'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Effectiveness ", getSortIcon('effectiveness')] }) }), _jsx(TableHead, { children: "Actions" })] }) }), _jsx(TableBody, { children: filteredControls.map((control) => {
                                            const risk = risks.find((r) => r.id === control.risk_id);
                                            const effectiveness = calculateControlEffectiveness(control.design_score, control.implementation_score, control.monitoring_score, control.evaluation_score);
                                            return (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-mono text-sm", children: control.control_code }), _jsx(TableCell, { children: _jsxs("div", { className: "max-w-xs", children: [_jsx("div", { className: "font-medium", children: control.name }), control.description && (_jsx("div", { className: "text-sm text-gray-600 truncate", children: control.description }))] }) }), _jsx(TableCell, { children: risk ? (_jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "font-mono", children: risk.risk_code }), _jsx("div", { className: "text-gray-600 text-xs truncate max-w-xs", children: risk.risk_title })] })) : (_jsx("span", { className: "text-gray-400", children: "-" })) }), _jsx(TableCell, { children: control.control_type ? (_jsx(Badge, { variant: "outline", className: "capitalize", children: control.control_type })) : (_jsx("span", { className: "text-gray-400", children: "-" })) }), _jsx(TableCell, { children: _jsx(Badge, { variant: control.target === 'Likelihood' ? 'default' : 'secondary', children: control.target }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex gap-1", children: [_jsxs("span", { className: "text-xs font-mono", children: ["D:", control.design_score ?? '-'] }), _jsxs("span", { className: "text-xs font-mono", children: ["I:", control.implementation_score ?? '-'] }), _jsxs("span", { className: "text-xs font-mono", children: ["M:", control.monitoring_score ?? '-'] }), _jsxs("span", { className: "text-xs font-mono", children: ["E:", control.evaluation_score ?? '-'] })] }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${getEffectivenessColor(effectiveness)}` }), _jsxs("span", { className: "text-sm", children: [(effectiveness * 100).toFixed(0), "%"] }), _jsxs("span", { className: "text-xs text-gray-500", children: ["(", getEffectivenessLabel(effectiveness), ")"] })] }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => handleEdit(control), children: _jsx(Edit, { className: "h-3 w-3" }) }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => handleDelete(control), children: _jsx(Trash2, { className: "h-3 w-3" }) })] }) })] }, control.id));
                                        }) })] }) })) })] }), _jsx(ControlForm, { open: showForm, onOpenChange: (open) => {
                    setShowForm(open);
                    if (!open)
                        setEditingControl(null);
                }, onSave: handleSave, editingControl: editingControl, availableRisks: risks.map((r) => ({
                    id: r.id,
                    risk_code: r.risk_code,
                    risk_title: r.risk_title,
                })) })] }));
}
