import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * RiskRegister Component
 *
 * Risk register table with CRUD operations.
 * Clean implementation using new risk management system.
 * UI pattern referenced from old RiskRegisterTab.
 */
import { useState, useEffect } from 'react';
import { getRisks, deleteRisk, updateRisk } from '@/lib/risks';
import { calculateResidualRisk } from '@/lib/controls';
import { getActivePeriod as getActivePeriodV2, formatPeriod } from '@/lib/periods-v2';
import { getKRIsForRisk } from '@/lib/kri';
import { getIncidentsForRisk } from '@/lib/incidents';
import { getOrganizationConfig, getLikelihoodLabel, getImpactLabel } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import RiskForm from './RiskForm';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertCircle, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Activity, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
export default function RiskRegister() {
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState(null);
    const [showPriorityOnly, setShowPriorityOnly] = useState(false);
    const [residualRisks, setResidualRisks] = useState(new Map());
    const [activePeriod, setActivePeriod] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [kriCounts, setKriCounts] = useState(new Map());
    const [showKRIDialog, setShowKRIDialog] = useState(false);
    const [selectedRiskKRIs, setSelectedRiskKRIs] = useState(null);
    const [incidentCounts, setIncidentCounts] = useState(new Map());
    const [showIncidentsDialog, setShowIncidentsDialog] = useState(false);
    const [selectedRiskIncidents, setSelectedRiskIncidents] = useState(null);
    const [orgConfig, setOrgConfig] = useState(null);
    // Bulk delete state
    const [selectedRiskIds, setSelectedRiskIds] = useState(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const loadRisks = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await getRisks();
            if (fetchError) {
                setError(fetchError.message);
                console.error('Failed to load risks:', fetchError);
            }
            else {
                setRisks(data || []);
                console.log('Risks loaded:', data?.length || 0);
                // Stop loading immediately so table displays
                setLoading(false);
                // Load residual risks and KRI counts in background (non-blocking)
                if (data && data.length > 0) {
                    loadRiskMetadata(data);
                }
            }
        }
        catch (err) {
            console.error('Unexpected error loading risks:', err);
            setError('An unexpected error occurred');
            setLoading(false);
        }
    };
    const loadRiskMetadata = async (risks) => {
        const residualMap = new Map();
        const kriCountMap = new Map();
        const incidentCountMap = new Map();
        // Fetch all residual risks, KRI counts, and incident counts in parallel
        const promises = risks.map(async (risk) => {
            const [residualResult, krisResult, incidentsResult] = await Promise.all([
                calculateResidualRisk(risk.id, risk.likelihood_inherent, risk.impact_inherent),
                getKRIsForRisk(risk.risk_code),
                getIncidentsForRisk(risk.id),
            ]);
            return {
                riskId: risk.id,
                residual: residualResult.data,
                kriCount: krisResult.data?.length || 0,
                incidentCount: incidentsResult.data?.length || 0,
            };
        });
        const results = await Promise.all(promises);
        // Populate maps
        results.forEach(({ riskId, residual, kriCount, incidentCount }) => {
            if (residual) {
                residualMap.set(riskId, residual);
            }
            kriCountMap.set(riskId, kriCount);
            incidentCountMap.set(riskId, incidentCount);
        });
        setResidualRisks(residualMap);
        setKriCounts(kriCountMap);
        setIncidentCounts(incidentCountMap);
    };
    useEffect(() => {
        loadActivePeriodData();
        loadRisks();
        checkAdminRole();
        loadConfig();
    }, []);
    async function loadActivePeriodData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return;
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
        if (!profile)
            return;
        const { data } = await getActivePeriodV2(profile.organization_id);
        if (data) {
            setActivePeriod({
                year: data.current_period_year,
                quarter: data.current_period_quarter,
            });
        }
    }
    async function checkAdminRole() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return;
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            setIsAdmin(profile?.role === 'admin');
        }
        catch (err) {
            console.error('Error checking admin role:', err);
        }
    }
    async function loadConfig() {
        try {
            const { data, error: configError } = await getOrganizationConfig();
            if (configError) {
                console.error('Failed to load organization config:', configError);
            }
            else {
                setOrgConfig(data);
            }
        }
        catch (err) {
            console.error('Unexpected config load error:', err);
        }
    }
    async function handlePriorityToggle(risk, checked) {
        try {
            const { error } = await updateRisk({
                id: risk.id,
                is_priority: checked,
            });
            if (error) {
                alert('Failed to update priority: ' + error.message);
                console.error('Priority update error:', error);
            }
            else {
                // Update local state
                setRisks((prev) => prev.map((r) => (r.id === risk.id ? { ...r, is_priority: checked } : r)));
            }
        }
        catch (err) {
            console.error('Unexpected priority update error:', err);
            alert('An unexpected error occurred');
        }
    }
    async function handleBulkPriorityToggle(checked) {
        try {
            // Update all filtered risks
            const updates = filteredRisks.map((risk) => updateRisk({
                id: risk.id,
                is_priority: checked,
            }));
            const results = await Promise.all(updates);
            const errors = results.filter((r) => r.error);
            if (errors.length > 0) {
                alert(`Failed to update ${errors.length} risks`);
                console.error('Bulk priority update errors:', errors);
            }
            // Reload to ensure consistency
            await loadRisks();
        }
        catch (err) {
            console.error('Unexpected bulk priority update error:', err);
            alert('An unexpected error occurred');
        }
    }
    const handleDelete = async (riskId, riskCode) => {
        if (!confirm(`Delete risk ${riskCode}? This cannot be undone.`))
            return;
        try {
            const { error: deleteError } = await deleteRisk(riskId);
            if (deleteError) {
                alert('Failed to delete risk: ' + deleteError.message);
                console.error('Delete error:', deleteError);
            }
            else {
                console.log('Risk deleted:', riskId);
                // Reload risks after deletion
                await loadRisks();
            }
        }
        catch (err) {
            console.error('Unexpected delete error:', err);
            alert('An unexpected error occurred during deletion');
        }
    };
    const handleBulkDelete = async () => {
        if (selectedRiskIds.size === 0) {
            alert('Please select risks to delete');
            return;
        }
        const confirmMessage = `Are you sure you want to delete ${selectedRiskIds.size} risk(s)? This action cannot be undone.`;
        if (!confirm(confirmMessage)) {
            return;
        }
        setBulkDeleting(true);
        try {
            let successCount = 0;
            let failCount = 0;
            // Delete each selected risk
            for (const riskId of selectedRiskIds) {
                const { error: deleteError } = await deleteRisk(riskId);
                if (deleteError) {
                    console.error('Failed to delete risk:', riskId, deleteError);
                    failCount++;
                }
                else {
                    successCount++;
                }
            }
            // Show result
            if (failCount > 0) {
                alert(`Deleted ${successCount} risk(s). Failed to delete ${failCount} risk(s).`);
            }
            else {
                alert(`Successfully deleted ${successCount} risk(s).`);
            }
            // Clear selection and reload
            setSelectedRiskIds(new Set());
            await loadRisks();
        }
        catch (err) {
            console.error('Unexpected bulk delete error:', err);
            alert('An unexpected error occurred during bulk deletion');
        }
        finally {
            setBulkDeleting(false);
        }
    };
    const handleSelectAll = (checked) => {
        if (checked) {
            const allIds = new Set(filteredRisks.map((r) => r.id));
            setSelectedRiskIds(allIds);
        }
        else {
            setSelectedRiskIds(new Set());
        }
    };
    const handleSelectRisk = (riskId, checked) => {
        const newSelection = new Set(selectedRiskIds);
        if (checked) {
            newSelection.add(riskId);
        }
        else {
            newSelection.delete(riskId);
        }
        setSelectedRiskIds(newSelection);
    };
    const getRiskScore = (likelihood, impact) => likelihood * impact;
    const getRiskLevel = (score) => {
        if (score >= 15)
            return 'Critical';
        if (score >= 10)
            return 'High';
        if (score >= 5)
            return 'Medium';
        return 'Low';
    };
    const getRiskLevelColor = (score) => {
        if (score >= 15)
            return 'text-red-600 font-bold';
        if (score >= 10)
            return 'text-orange-600 font-semibold';
        if (score >= 5)
            return 'text-yellow-600';
        return 'text-green-600';
    };
    const handleAddRisk = () => {
        setEditingRisk(null);
        setFormOpen(true);
    };
    const handleEditRisk = (risk) => {
        setEditingRisk(risk);
        setFormOpen(true);
    };
    const handleFormSuccess = () => {
        loadRisks();
    };
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
    const handleKRIClick = async (risk) => {
        try {
            const { data: krisData, error } = await getKRIsForRisk(risk.risk_code);
            if (error) {
                alert('Failed to load KRIs: ' + error.message);
                return;
            }
            setSelectedRiskKRIs({ risk, kris: krisData || [] });
            setShowKRIDialog(true);
        }
        catch (err) {
            console.error('Error loading KRIs:', err);
            alert('An unexpected error occurred');
        }
    };
    const handleIncidentClick = async (risk) => {
        try {
            const { data: incidentsData, error } = await getIncidentsForRisk(risk.id);
            if (error) {
                alert('Failed to load incidents: ' + error.message);
                return;
            }
            setSelectedRiskIncidents({ risk, incidents: incidentsData || [] });
            setShowIncidentsDialog(true);
        }
        catch (err) {
            console.error('Error loading incidents:', err);
            alert('An unexpected error occurred');
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center p-12", children: _jsxs("div", { className: "text-center", children: [_jsx(RefreshCw, { className: "h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" }), _jsx("p", { className: "text-gray-600", children: "Loading risks..." })] }) }));
    }
    // Filter and sort risks
    const filteredRisks = risks
        .filter((risk) => {
        // Priority filter
        if (showPriorityOnly && !risk.is_priority) {
            return false;
        }
        // No period filter needed - continuous model shows all risks
        return true;
    })
        .sort((a, b) => {
        if (!sortColumn)
            return 0;
        let aValue;
        let bValue;
        switch (sortColumn) {
            case 'code':
                aValue = a.risk_code || '';
                bValue = b.risk_code || '';
                break;
            case 'title':
                aValue = a.risk_title || '';
                bValue = b.risk_title || '';
                break;
            case 'category':
                aValue = a.category || '';
                bValue = b.category || '';
                break;
            case 'owner':
                aValue = a.owner || '';
                bValue = b.owner || '';
                break;
            case 'period':
                aValue = a.period || '';
                bValue = b.period || '';
                break;
            case 'inherent':
                aValue = a.likelihood_inherent * a.impact_inherent;
                bValue = b.likelihood_inherent * b.impact_inherent;
                break;
            case 'residual':
                const aResidual = residualRisks.get(a.id);
                const bResidual = residualRisks.get(b.id);
                aValue = aResidual ? Math.round(aResidual.residual_score) : a.likelihood_inherent * a.impact_inherent;
                bValue = bResidual ? Math.round(bResidual.residual_score) : b.likelihood_inherent * b.impact_inherent;
                break;
            case 'status':
                aValue = a.status || '';
                bValue = b.status || '';
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
    return (_jsxs("div", { className: "space-y-4", children: [error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex flex-col gap-4", children: [activePeriod && (_jsx(Alert, { className: "border-blue-500 bg-blue-50", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-4 w-4 text-blue-600" }), _jsxs("div", { className: "font-medium text-blue-900", children: ["Current Period: ", formatPeriod(activePeriod)] })] }) })), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Risk Register" }), _jsx(CardDescription, { children: "Manage risks continuously across all periods" })] }), _jsxs("div", { className: "flex gap-2", children: [selectedRiskIds.size > 0 && (_jsxs(Button, { variant: "destructive", onClick: handleBulkDelete, disabled: bulkDeleting, children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedRiskIds.size})`] })), _jsxs(Button, { onClick: handleAddRisk, children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Add Risk"] })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx(Button, { variant: showPriorityOnly ? 'default' : 'outline', size: "sm", onClick: () => setShowPriorityOnly(!showPriorityOnly), children: showPriorityOnly ? 'Show All Risks' : 'Priority Only' }), _jsxs("div", { className: "text-sm text-gray-600 ml-auto", children: ["Showing ", filteredRisks.length, " of ", risks.length, " risks"] })] })] }) }), _jsx(CardContent, { children: risks.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(AlertCircle, { className: "h-12 w-12 text-gray-300 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "No risks yet" }), _jsx("p", { className: "text-gray-600 mb-4", children: "Get started by adding your first risk" }), _jsxs(Button, { onClick: handleAddRisk, children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Add Risk"] })] })) : (_jsx("div", { className: "border rounded-lg", children: _jsxs(Table, { children: [_jsxs(TableHeader, { children: [_jsxs(TableRow, { children: [_jsx(TableHead, { className: "w-[50px] text-center", children: _jsx(Checkbox, { checked: filteredRisks.length > 0 && filteredRisks.every((r) => selectedRiskIds.has(r.id)), onCheckedChange: handleSelectAll, title: "Select all risks" }) }), _jsx(TableHead, { className: "w-[100px] text-center", children: _jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx(Checkbox, { checked: filteredRisks.length > 0 && filteredRisks.every((r) => r.is_priority), onCheckedChange: (checked) => handleBulkPriorityToggle(checked === true), title: "Mark all filtered risks as priority" }), _jsx("span", { className: "text-xs", children: "Priority" })] }) }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('code'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Code ", getSortIcon('code')] }) }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('title'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Title ", getSortIcon('title')] }) }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('category'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Category ", getSortIcon('category')] }) }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('owner'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Owner ", getSortIcon('owner')] }) }), _jsx(TableHead, { className: "text-center", children: _jsxs("button", { onClick: () => handleSort('created'), className: "flex items-center justify-center hover:text-gray-900 transition-colors mx-auto", children: ["Created ", getSortIcon('created')] }) }), _jsx(TableHead, { className: "text-center", colSpan: 3, children: "Inherent" }), _jsx(TableHead, { className: "text-center", colSpan: 3, children: "Residual" }), _jsx(TableHead, { className: "text-center", children: "KRIs" }), _jsx(TableHead, { className: "text-center", children: "Incidents" }), _jsx(TableHead, { children: _jsxs("button", { onClick: () => handleSort('status'), className: "flex items-center hover:text-gray-900 transition-colors", children: ["Status ", getSortIcon('status')] }) }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }), _jsxs(TableRow, { children: [_jsx(TableHead, { colSpan: 7 }), _jsx(TableHead, { className: "text-center text-xs w-12", children: "L" }), _jsx(TableHead, { className: "text-center text-xs w-12", children: "I" }), _jsx(TableHead, { className: "text-center text-xs w-16", children: _jsxs("button", { onClick: () => handleSort('inherent'), className: "flex items-center justify-center hover:text-gray-900 transition-colors mx-auto", children: ["L\u00D7I ", getSortIcon('inherent')] }) }), _jsx(TableHead, { className: "text-center text-xs w-12", children: "L" }), _jsx(TableHead, { className: "text-center text-xs w-12", children: "I" }), _jsx(TableHead, { className: "text-center text-xs w-16", children: _jsxs("button", { onClick: () => handleSort('residual'), className: "flex items-center justify-center hover:text-gray-900 transition-colors mx-auto", children: ["L\u00D7I ", getSortIcon('residual')] }) }), _jsx(TableHead, { className: "text-center text-xs w-16", children: "Count" }), _jsx(TableHead, { className: "text-center text-xs w-16", children: "Count" }), _jsx(TableHead, { colSpan: 2 })] })] }), _jsx(TableBody, { children: filteredRisks.map((risk) => {
                                            const inherentScore = getRiskScore(risk.likelihood_inherent, risk.impact_inherent);
                                            const inherentLevel = getRiskLevel(inherentScore);
                                            const inherentLevelColor = getRiskLevelColor(inherentScore);
                                            // Get residual risk
                                            const residual = residualRisks.get(risk.id);
                                            const residualScore = residual
                                                ? Math.round(residual.residual_score)
                                                : inherentScore;
                                            const residualLevel = getRiskLevel(residualScore);
                                            const residualLevelColor = getRiskLevelColor(residualScore);
                                            return (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "text-center", children: _jsx(Checkbox, { checked: selectedRiskIds.has(risk.id), onCheckedChange: (checked) => handleSelectRisk(risk.id, checked === true), title: "Select for deletion" }) }), _jsx(TableCell, { className: "text-center", children: _jsx(Checkbox, { checked: risk.is_priority, onCheckedChange: (checked) => handlePriorityToggle(risk, checked === true), title: "Mark as priority risk" }) }), _jsx(TableCell, { className: "font-medium", children: risk.risk_code }), _jsx(TableCell, { className: "max-w-xs whitespace-normal break-words", children: risk.risk_title }), _jsx(TableCell, { className: "whitespace-normal break-words", children: risk.category }), _jsx(TableCell, { className: "max-w-[150px] whitespace-normal break-words", children: risk.owner }), _jsx(TableCell, { className: "text-center text-sm text-gray-600", children: risk.created_period_year && risk.created_period_quarter
                                                            ? `Q${risk.created_period_quarter} ${risk.created_period_year}`
                                                            : '-' }), _jsx(TableCell, { className: "text-center text-sm font-medium", title: getLikelihoodLabel(orgConfig, risk.likelihood_inherent), children: risk.likelihood_inherent }), _jsx(TableCell, { className: "text-center text-sm font-medium", title: getImpactLabel(orgConfig, risk.impact_inherent), children: risk.impact_inherent }), _jsx(TableCell, { className: `text-center font-semibold ${inherentLevelColor}`, title: `${inherentLevel} Risk`, children: inherentScore }), _jsx(TableCell, { className: "text-center text-sm font-medium", title: residual ? getLikelihoodLabel(orgConfig, residual.residual_likelihood) : 'No controls applied', children: residual ? residual.residual_likelihood : '-' }), _jsx(TableCell, { className: "text-center text-sm font-medium", title: residual ? getImpactLabel(orgConfig, residual.residual_impact) : 'No controls applied', children: residual ? residual.residual_impact : '-' }), _jsx(TableCell, { className: `text-center font-semibold ${residualLevelColor}`, title: `${residualLevel} Risk`, children: residualScore }), _jsx(TableCell, { className: "text-center", children: kriCounts.get(risk.id) ? (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleKRIClick(risk), className: "h-8 px-2 hover:bg-blue-50", children: _jsxs(Badge, { variant: "outline", className: "bg-blue-50 text-blue-700 border-blue-200", children: [_jsx(Activity, { className: "h-3 w-3 mr-1" }), kriCounts.get(risk.id)] }) })) : (_jsx("span", { className: "text-gray-400 text-sm", children: "-" })) }), _jsx(TableCell, { className: "text-center", children: incidentCounts.get(risk.id) ? (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleIncidentClick(risk), className: "h-8 px-2 hover:bg-orange-50", children: _jsxs(Badge, { variant: "outline", className: "bg-orange-50 text-orange-700 border-orange-200", children: [_jsx(AlertCircle, { className: "h-3 w-3 mr-1" }), incidentCounts.get(risk.id)] }) })) : (_jsx("span", { className: "text-gray-400 text-sm", children: "-" })) }), _jsx(TableCell, { children: _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${risk.status === 'OPEN'
                                                                ? 'bg-green-100 text-green-800'
                                                                : risk.status === 'MONITORING'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : risk.status === 'CLOSED'
                                                                        ? 'bg-gray-100 text-gray-800'
                                                                        : 'bg-yellow-100 text-yellow-800'}`, children: risk.status }) }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleEditRisk(risk), children: _jsx(Edit, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleDelete(risk.id, risk.risk_code), children: _jsx(Trash2, { className: "h-4 w-4 text-red-600" }) })] }) })] }, risk.id));
                                        }) })] }) })) })] }), _jsxs("div", { className: "flex items-center justify-between text-sm text-gray-600", children: [_jsxs("div", { children: ["Total risks: ", _jsx("span", { className: "font-semibold", children: risks.length })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: loadRisks, children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Refresh"] })] }), _jsx(RiskForm, { open: formOpen, onOpenChange: setFormOpen, onSuccess: handleFormSuccess, editingRisk: editingRisk }), _jsx(Dialog, { open: showKRIDialog, onOpenChange: setShowKRIDialog, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[85vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["KRIs for Risk: ", selectedRiskKRIs?.risk.risk_code, " - ", selectedRiskKRIs?.risk.risk_title] }) }), selectedRiskKRIs && selectedRiskKRIs.kris.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No KRIs linked to this risk" })) : (_jsx("div", { className: "space-y-4", children: selectedRiskKRIs?.kris.map((link) => {
                                const kri = link.kri_definitions;
                                return (_jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "KRI Code" }), _jsx("p", { className: "text-lg font-semibold", children: kri.kri_code })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "KRI Name" }), _jsx("p", { className: "text-lg font-semibold", children: kri.kri_name })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Category" }), _jsx("p", { children: kri.category || '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Type" }), _jsx(Badge, { variant: "outline", children: kri.indicator_type || 'Not specified' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Unit of Measure" }), _jsx("p", { children: kri.measurement_unit || '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Frequency" }), _jsx("p", { children: kri.collection_frequency || '-' })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Description" }), _jsx("p", { className: "text-sm text-gray-700", children: kri.description || 'No description' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Target Value" }), _jsx("p", { children: kri.target_value !== null ? kri.target_value : '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Thresholds" }), _jsxs("div", { className: "text-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { className: "bg-yellow-500", children: "Yellow" }), _jsx("span", { children: kri.lower_threshold || '-' })] }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx(Badge, { className: "bg-red-500", children: "Red" }), _jsx("span", { children: kri.upper_threshold || '-' })] })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Data Source" }), _jsx("p", { className: "text-sm", children: kri.data_source || '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Responsible User" }), _jsx("p", { className: "text-sm", children: kri.responsible_user || '-' })] })] }) }) }, link.id));
                            }) })), _jsx("div", { className: "flex justify-end mt-4", children: _jsx(Button, { onClick: () => setShowKRIDialog(false), children: "Close" }) })] }) }), _jsx(Dialog, { open: showIncidentsDialog, onOpenChange: setShowIncidentsDialog, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[85vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Incidents for Risk: ", selectedRiskIncidents?.risk.risk_code, " - ", selectedRiskIncidents?.risk.risk_title] }) }), selectedRiskIncidents && selectedRiskIncidents.incidents.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No incidents linked to this risk" })) : (_jsx("div", { className: "space-y-4", children: selectedRiskIncidents?.incidents.map((link) => {
                                const incident = link.incidents;
                                const getSeverityColor = (sev) => {
                                    switch (sev) {
                                        case 1: return 'bg-blue-100 text-blue-800';
                                        case 2: return 'bg-yellow-100 text-yellow-800';
                                        case 3: return 'bg-orange-100 text-orange-800';
                                        case 4: return 'bg-red-100 text-red-800';
                                        default: return 'bg-gray-100 text-gray-800';
                                    }
                                };
                                const getSeverityText = (sev) => {
                                    switch (sev) {
                                        case 1: return 'LOW';
                                        case 2: return 'MEDIUM';
                                        case 3: return 'HIGH';
                                        case 4: return 'CRITICAL';
                                        default: return 'UNKNOWN';
                                    }
                                };
                                const getLinkTypeColor = (linkType) => {
                                    switch (linkType) {
                                        case 'PRIMARY': return 'bg-red-100 text-red-800';
                                        case 'SECONDARY': return 'bg-yellow-100 text-yellow-800';
                                        case 'CONTRIBUTORY': return 'bg-orange-100 text-orange-800';
                                        case 'ASSOCIATED': return 'bg-blue-100 text-blue-800';
                                        default: return 'bg-gray-100 text-gray-800';
                                    }
                                };
                                return (_jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-mono font-bold text-lg", children: incident.incident_code }), _jsx(Badge, { className: getSeverityColor(incident.severity), children: getSeverityText(incident.severity) }), _jsx(Badge, { className: getLinkTypeColor(link.link_type), children: link.link_type })] }), _jsx(Badge, { variant: "outline", children: incident.resolution_status })] }), _jsx("div", { children: _jsx("h4", { className: "font-semibold text-lg", children: incident.title }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Incident Type" }), _jsx("p", { className: "text-sm", children: incident.incident_type || '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Incident Date" }), _jsx("p", { className: "text-sm", children: incident.incident_date
                                                                        ? new Date(incident.incident_date).toLocaleDateString()
                                                                        : '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Financial Impact" }), _jsx("p", { className: "text-sm", children: incident.financial_impact
                                                                        ? `₦${Number(incident.financial_impact).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
                                                                        : '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Mapping Source" }), _jsx("p", { className: "text-sm", children: link.mapping_source || '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Classification Confidence" }), _jsxs("p", { className: "text-sm", children: [link.classification_confidence, "%"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Linked At" }), _jsx("p", { className: "text-sm", children: link.linked_at
                                                                        ? new Date(link.linked_at).toLocaleDateString()
                                                                        : '-' })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Description" }), _jsx("p", { className: "text-sm text-gray-700 mt-1", children: incident.description || 'No description' })] }), link.notes && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Mapping Notes" }), _jsxs("p", { className: "text-sm text-gray-700 italic mt-1", children: ["\"", link.notes, "\""] })] }))] }) }) }, link.id));
                            }) })), _jsx("div", { className: "flex justify-end mt-4", children: _jsx(Button, { onClick: () => setShowIncidentsDialog(false), children: "Close" }) })] }) })] }));
}
