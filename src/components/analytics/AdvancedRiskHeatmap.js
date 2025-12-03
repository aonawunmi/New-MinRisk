import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Advanced Risk Heatmap Component
 *
 * Full-featured heatmap with:
 * - Filters (search, division, department, category, owner, status)
 * - Export to PNG/JPEG
 * - Quarter comparison mode
 * - Axis labels
 * - Popover (non-blocking) risk details
 * - SVG arrow visualization for risk migration
 * - Data source toggle (active/history)
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger, } from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { getRiskLevel, getRiskLevelColor } from '@/lib/analytics';
import { calculateResidualRisk } from '@/lib/controls';
import { getOrganizationConfig, getLikelihoodLabel, getImpactLabel } from '@/lib/config';
import { getCommittedPeriods, formatPeriod } from '@/lib/periods-v2';
import { useAuth } from '@/lib/auth';
// Axis labels configuration
const LIKELIHOOD_LABELS_5X5 = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS_5X5 = ['Minimal', 'Low', 'Moderate', 'High', 'Severe'];
const LIKELIHOOD_LABELS_6X6 = ['Very Rare', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS_6X6 = ['Insignificant', 'Minimal', 'Low', 'Moderate', 'High', 'Severe'];
export default function AdvancedRiskHeatmap({ matrixSize: propMatrixSize, }) {
    // Auth
    const { profile } = useAuth();
    // State management
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orgConfig, setOrgConfig] = useState(null);
    // Period management (NEW)
    const [selectedPeriod, setSelectedPeriod] = useState('current');
    const [availablePeriods, setAvailablePeriods] = useState([]);
    const [isHistorical, setIsHistorical] = useState(false);
    const [snapshotDate, setSnapshotDate] = useState();
    // Use matrix size from config if available, otherwise use prop
    const matrixSize = orgConfig?.matrix_size || propMatrixSize || 5;
    // View toggles
    const [showInherent, setShowInherent] = useState(true);
    const [showResidual, setShowResidual] = useState(true);
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDivision, setFilterDivision] = useState('all');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterOwner, setFilterOwner] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    // Export
    const [exportFormat, setExportFormat] = useState('png');
    const [isExporting, setIsExporting] = useState(false);
    const heatmapRef = useRef(null);
    // Highlighting
    const [highlightedRisk, setHighlightedRisk] = useState(null);
    // Get axis labels from config or use defaults
    const getLikelihoodLabels = () => {
        if (!orgConfig) {
            return matrixSize === 5 ? LIKELIHOOD_LABELS_5X5 : LIKELIHOOD_LABELS_6X6;
        }
        const labels = [];
        for (let i = 1; i <= matrixSize; i++) {
            labels.push(getLikelihoodLabel(orgConfig, i));
        }
        return labels;
    };
    const getImpactLabels = () => {
        if (!orgConfig) {
            return matrixSize === 5 ? IMPACT_LABELS_5X5 : IMPACT_LABELS_6X6;
        }
        const labels = [];
        for (let i = 1; i <= matrixSize; i++) {
            labels.push(getImpactLabel(orgConfig, i));
        }
        return labels;
    };
    const likelihoodLabels = getLikelihoodLabels();
    const impactLabels = getImpactLabels();
    // Load risks data and config
    useEffect(() => {
        loadConfig();
        if (profile?.organization_id) {
            loadAvailablePeriods();
        }
    }, [profile]);
    // Reload risks when period or matrix size changes
    useEffect(() => {
        loadRisks();
    }, [selectedPeriod, matrixSize]);
    // Load available periods
    async function loadAvailablePeriods() {
        if (!profile?.organization_id)
            return;
        const { data: committedPeriods, error } = await getCommittedPeriods(profile.organization_id);
        if (error) {
            console.error('Failed to load committed periods:', error);
            return;
        }
        if (committedPeriods && committedPeriods.length > 0) {
            // Sort periods by year and quarter (most recent first)
            const sortedPeriods = [...committedPeriods].sort((a, b) => {
                if (a.period_year !== b.period_year)
                    return b.period_year - a.period_year;
                return b.period_quarter - a.period_quarter;
            });
            // Format periods as strings (e.g., "Q2 2026")
            const periods = sortedPeriods.map((cp) => formatPeriod({ year: cp.period_year, quarter: cp.period_quarter }));
            // Always include "current" as first option
            setAvailablePeriods(['current', ...periods]);
        }
        else {
            setAvailablePeriods(['current']);
        }
    }
    async function loadConfig() {
        try {
            const { data, error } = await getOrganizationConfig();
            if (error) {
                console.error('Failed to load organization config:', error);
            }
            else {
                setOrgConfig(data);
            }
        }
        catch (err) {
            console.error('Unexpected config load error:', err);
        }
    }
    async function loadRisks() {
        setLoading(true);
        setError(null);
        try {
            let rawRisks = [];
            let historical = false;
            let snapDate;
            // Load from risk_history if period is specified
            if (selectedPeriod && selectedPeriod !== 'current' && profile?.organization_id) {
                // Parse period string (e.g., "Q2 2026" -> {year: 2026, quarter: 2})
                const periodMatch = selectedPeriod.match(/Q(\d+)\s+(\d{4})/);
                if (!periodMatch) {
                    throw new Error(`Invalid period format: ${selectedPeriod}`);
                }
                const quarter = parseInt(periodMatch[1]);
                const year = parseInt(periodMatch[2]);
                // Load from risk_history table
                const { data: historyRecords, error: historyError } = await supabase
                    .from('risk_history')
                    .select('*')
                    .eq('organization_id', profile.organization_id)
                    .eq('period_year', year)
                    .eq('period_quarter', quarter);
                if (historyError) {
                    throw new Error(`Failed to load risk history: ${historyError.message}`);
                }
                if (!historyRecords || historyRecords.length === 0) {
                    throw new Error(`No risk history found for period ${selectedPeriod}`);
                }
                // Convert risk_history records to risk objects
                rawRisks = historyRecords.map((h) => ({
                    id: h.risk_id,
                    risk_code: h.risk_code,
                    risk_title: h.risk_title,
                    risk_description: h.risk_description,
                    category: h.category,
                    division: h.division,
                    department: h.department,
                    owner: h.owner,
                    status: h.status,
                    likelihood_inherent: h.likelihood_inherent,
                    impact_inherent: h.impact_inherent,
                    score_inherent: h.score_inherent,
                    residual_likelihood: h.likelihood_residual,
                    residual_impact: h.impact_residual,
                    residual_score: h.score_residual,
                }));
                historical = true;
                snapDate = historyRecords[0]?.committed_at;
            }
            else {
                // Load current risks from risks table
                const { data, error: fetchError } = await supabase
                    .from('risks')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (fetchError) {
                    throw new Error(fetchError.message);
                }
                rawRisks = data || [];
            }
            setIsHistorical(historical);
            setSnapshotDate(snapDate);
            // Process risks based on whether they're historical or current
            const processed = await Promise.all(rawRisks.map(async (risk) => {
                if (historical) {
                    // For historical snapshots: Use stored residual values (no calculation)
                    const resL = risk.residual_likelihood || risk.likelihood_residual || risk.likelihood_inherent;
                    const resI = risk.residual_impact || risk.impact_residual || risk.impact_inherent;
                    return {
                        ...risk,
                        likelihood_residual_calc: resL,
                        impact_residual_calc: resI,
                        residual_score_calc: risk.residual_score || risk.score_residual || (resL * resI),
                    };
                }
                else {
                    // For current risks: Calculate residual risk using controls
                    const { data: residualData } = await calculateResidualRisk(risk.id, risk.likelihood_inherent, risk.impact_inherent);
                    return {
                        ...risk,
                        likelihood_residual_calc: residualData?.residual_likelihood ?? risk.likelihood_inherent,
                        impact_residual_calc: residualData?.residual_impact ?? risk.impact_inherent,
                        residual_score_calc: residualData?.residual_score ?? (risk.likelihood_inherent * risk.impact_inherent),
                    };
                }
            }));
            setRisks(processed);
        }
        catch (err) {
            console.error('Load risks error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load risks');
        }
        finally {
            setLoading(false);
        }
    }
    // Get unique filter values
    const uniqueValues = useMemo(() => {
        return {
            divisions: Array.from(new Set(risks.map(r => r.division))).filter(Boolean).sort(),
            departments: Array.from(new Set(risks.map(r => r.department))).filter(Boolean).sort(),
            categories: Array.from(new Set(risks.map(r => r.category))).filter(Boolean).sort(),
            owners: Array.from(new Set(risks.map(r => r.owner))).filter(Boolean).sort(),
            statuses: Array.from(new Set(risks.map(r => r.status))).filter(Boolean).sort(),
            periods: Array.from(new Set(risks.map(r => r.period).filter(Boolean))).sort(),
        };
    }, [risks]);
    // Apply all filters
    const filteredRisks = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return risks.filter(r => {
            // Search filter
            if (searchQuery && !(r.risk_code?.toLowerCase().includes(query) ||
                r.risk_title?.toLowerCase().includes(query) ||
                r.risk_description?.toLowerCase().includes(query) ||
                r.category?.toLowerCase().includes(query) ||
                r.owner?.toLowerCase().includes(query)))
                return false;
            // Dropdown filters
            if (filterDivision !== 'all' && r.division !== filterDivision)
                return false;
            if (filterDepartment !== 'all' && r.department !== filterDepartment)
                return false;
            if (filterCategory !== 'all' && r.category !== filterCategory)
                return false;
            if (filterOwner !== 'all' && r.owner !== filterOwner)
                return false;
            if (filterStatus !== 'all' && r.status !== filterStatus)
                return false;
            return true;
        });
    }, [risks, searchQuery, filterDivision, filterDepartment, filterCategory, filterOwner, filterStatus]);
    // Build heatmap grid data
    const heatmapData = useMemo(() => {
        const grid = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(0).map(() => ({ inherent: [], residual: [] })));
        filteredRisks.forEach(risk => {
            if (showInherent) {
                const i = risk.impact_inherent - 1;
                const l = risk.likelihood_inherent - 1;
                if (i >= 0 && i < matrixSize && l >= 0 && l < matrixSize) {
                    grid[i][l].inherent.push(risk);
                }
            }
            if (showResidual) {
                const i = Math.round(risk.impact_residual_calc) - 1;
                const l = Math.round(risk.likelihood_residual_calc) - 1;
                if (i >= 0 && i < matrixSize && l >= 0 && l < matrixSize) {
                    grid[i][l].residual.push(risk);
                }
            }
        });
        return grid;
    }, [filteredRisks, showInherent, showResidual, matrixSize]);
    // Export heatmap
    const handleExport = async () => {
        if (!heatmapRef.current || isExporting)
            return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(heatmapRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
            });
            canvas.toBlob((blob) => {
                if (!blob)
                    return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const timestamp = new Date().toISOString().split('T')[0];
                a.download = `risk-heatmap-${timestamp}.${exportFormat}`;
                a.click();
                URL.revokeObjectURL(url);
                setIsExporting(false);
            }, `image/${exportFormat}`);
        }
        catch (error) {
            console.error('Export failed:', error);
            setIsExporting(false);
        }
    };
    // Get cell center for arrow drawing
    const getCellCenter = (likelihood, impact, cellSize = 80) => {
        const xOffset = 80; // Left axis width
        const yOffset = 60; // Top padding
        const x = xOffset + (likelihood - 1) * cellSize + cellSize / 2;
        const y = yOffset + (matrixSize - impact) * cellSize + cellSize / 2;
        return { x, y };
    };
    // Get bucket color
    const getBucketColor = (likelihood, impact) => {
        const score = likelihood * impact;
        const level = getRiskLevel(likelihood, impact);
        return getRiskLevelColor(level);
    };
    // Loading state
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-96", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading heatmap..." }) }));
    }
    // Error state
    if (error) {
        return (_jsx("div", { className: "p-4 bg-red-50 border border-red-200 rounded-lg", children: _jsx("p", { className: "text-red-800", children: error }) }));
    }
    return (_jsx(Card, { className: "rounded-2xl shadow-sm", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "mb-3 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-sm text-gray-500", children: ["Displaying ", filteredRisks.length, " risk(s)"] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { id: "showInherent", checked: showInherent, onCheckedChange: (c) => setShowInherent(!!c) }), _jsx("label", { htmlFor: "showInherent", className: "text-sm cursor-pointer", children: "Show Inherent" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { id: "showResidual", checked: showResidual, onCheckedChange: (c) => setShowResidual(!!c) }), _jsx("label", { htmlFor: "showResidual", className: "text-sm cursor-pointer", children: "Show Residual" })] })] })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Calendar, { className: "h-5 w-5 text-blue-600" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "View Period:" }), _jsxs(Select, { value: selectedPeriod, onValueChange: setSelectedPeriod, children: [_jsx(SelectTrigger, { className: "w-48 bg-white", children: _jsx(SelectValue, { placeholder: "Select period" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "current", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-green-500" }), _jsx("span", { className: "font-medium", children: "Current (Live Data)" })] }) }), availablePeriods.map((period) => (_jsx(SelectItem, { value: period, children: period }, period)))] })] })] }), isHistorical && snapshotDate ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Badge, { variant: "outline", className: "bg-amber-100 border-amber-300 text-amber-800", children: [_jsx(Clock, { className: "h-3 w-3 mr-1" }), "HISTORICAL"] }), _jsxs("span", { className: "text-xs text-gray-600", children: ["As of ", new Date(snapshotDate).toLocaleDateString()] })] })) : (_jsxs(Badge, { variant: "outline", className: "bg-green-100 border-green-300 text-green-800", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" }), "LIVE DATA"] }))] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-sm", children: [_jsx(Input, { placeholder: "Search risks...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-64" }), _jsxs(Select, { value: filterDivision, onValueChange: setFilterDivision, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Division" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Divisions" }), uniqueValues.divisions.map(d => (_jsx(SelectItem, { value: d, children: d }, d)))] })] }), _jsxs(Select, { value: filterDepartment, onValueChange: setFilterDepartment, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Department" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Departments" }), uniqueValues.departments.map(d => (_jsx(SelectItem, { value: d, children: d }, d)))] })] }), _jsxs(Select, { value: filterCategory, onValueChange: setFilterCategory, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Category" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Categories" }), uniqueValues.categories.map(c => (_jsx(SelectItem, { value: c, children: c }, c)))] })] }), _jsxs(Select, { value: filterOwner, onValueChange: setFilterOwner, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Owner" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Owners" }), uniqueValues.owners.map(o => (_jsx(SelectItem, { value: o, children: o }, o)))] })] }), _jsxs(Select, { value: filterStatus, onValueChange: setFilterStatus, children: [_jsx(SelectTrigger, { className: "w-32", children: _jsx(SelectValue, { placeholder: "Status" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Statuses" }), uniqueValues.statuses.map(s => (_jsx(SelectItem, { value: s, children: s }, s)))] })] })] }), _jsx("div", { className: "flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { onClick: handleExport, disabled: isExporting, variant: "outline", size: "sm", children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), isExporting ? 'Exporting...' : 'Export Heatmap'] }), _jsxs(Select, { value: exportFormat, onValueChange: (v) => setExportFormat(v), children: [_jsx(SelectTrigger, { className: "w-24", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "png", children: "PNG" }), _jsx(SelectItem, { value: "jpeg", children: "JPEG" })] })] })] }) })] }), _jsxs("div", { ref: heatmapRef, className: "flex mt-4", children: [_jsx("div", { className: "flex flex-col justify-start pt-8 pr-2", children: Array.from({ length: matrixSize }, (_, i) => matrixSize - i).map(imp => (_jsx("div", { className: "h-20 flex items-center justify-center text-xs font-semibold", children: impactLabels[imp - 1] }, imp))) }), _jsxs("div", { className: "flex-grow relative", children: [_jsx("div", { style: {
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${matrixSize}, 1fr)`,
                                    }, children: heatmapData.slice().reverse().map((row, impIndex) => row.map((cell, probIndex) => {
                                        const impact = matrixSize - impIndex;
                                        const likelihood = probIndex + 1;
                                        const bgColor = getBucketColor(likelihood, impact);
                                        const allRisksInCell = [
                                            ...new Map([...cell.inherent, ...cell.residual].map(item => [item.risk_code, item])).values(),
                                        ];
                                        return (_jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("div", { className: `h-20 border flex items-center justify-center p-1 relative cursor-pointer ${highlightedRisk &&
                                                            ((Math.round(highlightedRisk.likelihood_residual_calc) === likelihood &&
                                                                Math.round(highlightedRisk.impact_residual_calc) === impact) ||
                                                                (highlightedRisk.likelihood_inherent === likelihood &&
                                                                    highlightedRisk.impact_inherent === impact))
                                                            ? 'border-4 border-purple-600 ring-4 ring-purple-300'
                                                            : 'border-gray-200'}`, style: { backgroundColor: `${bgColor}E6` }, children: _jsxs("div", { className: "flex gap-2 text-lg font-bold", children: [showInherent && cell.inherent.length > 0 && (_jsx("span", { className: "text-blue-700", children: cell.inherent.length })), showInherent && showResidual && cell.inherent.length > 0 && cell.residual.length > 0 && (_jsx("span", { className: "text-gray-400", children: "/" })), showResidual && cell.residual.length > 0 && (_jsx("span", { className: "text-rose-700", children: cell.residual.length }))] }) }) }), allRisksInCell.length > 0 && (_jsxs(PopoverContent, { className: "w-96", children: [_jsxs("div", { className: "font-bold text-sm mb-2", children: ["Risks in cell (L:", likelihood, ", I:", impact, ")"] }), _jsxs("div", { className: "max-h-60 overflow-y-auto", children: [showInherent && cell.inherent.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-blue-700 mt-2", children: "Inherent Position" }), cell.inherent.map(risk => (_jsx("div", { className: "border-b", children: _jsxs("button", { className: `w-full text-left p-2 text-xs hover:bg-gray-100 ${highlightedRisk?.risk_code === risk.risk_code
                                                                                    ? 'bg-purple-50'
                                                                                    : ''}`, onClick: () => {
                                                                                    if (highlightedRisk?.risk_code === risk.risk_code) {
                                                                                        setHighlightedRisk(null);
                                                                                    }
                                                                                    else {
                                                                                        setHighlightedRisk(risk);
                                                                                    }
                                                                                }, children: [_jsxs("p", { className: "font-bold", children: [risk.risk_code, ": ", risk.risk_title] }), _jsxs("p", { className: "text-gray-600 text-xs", children: ["(Residual L: ", risk.likelihood_residual_calc.toFixed(1), ", I:", ' ', risk.impact_residual_calc.toFixed(1), ")"] }), highlightedRisk?.risk_code === risk.risk_code && (_jsx("p", { className: "text-purple-600 text-xs mt-1", children: "\u2713 Showing migration path" }))] }) }, risk.risk_code)))] })), showResidual && cell.residual.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-rose-700 mt-2", children: "Residual Position" }), cell.residual.map(risk => (_jsxs("button", { className: `w-full text-left border-b p-2 text-xs hover:bg-gray-100 ${highlightedRisk?.risk_code === risk.risk_code
                                                                                ? 'bg-purple-50'
                                                                                : ''}`, onClick: () => {
                                                                                if (highlightedRisk?.risk_code === risk.risk_code) {
                                                                                    setHighlightedRisk(null);
                                                                                }
                                                                                else {
                                                                                    setHighlightedRisk(risk);
                                                                                }
                                                                            }, children: [_jsxs("p", { className: "font-bold", children: [risk.risk_code, ": ", risk.risk_title] }), highlightedRisk?.risk_code === risk.risk_code && (_jsx("p", { className: "text-purple-600 text-xs mt-1", children: "\u2713 Showing migration path (click again to close)" }))] }, risk.risk_code)))] }))] })] }))] }, `${likelihood}-${impact}`));
                                    })) }), _jsxs("svg", { className: "absolute top-0 left-0 pointer-events-none", style: { width: '100%', height: '100%' }, children: [_jsxs("defs", { children: [_jsx("marker", { id: "arrowhead-green", markerWidth: "10", markerHeight: "10", refX: "9", refY: "3", orient: "auto", children: _jsx("polygon", { points: "0 0, 10 3, 0 6", fill: "#16a34a" }) }), _jsx("marker", { id: "arrowhead-red", markerWidth: "10", markerHeight: "10", refX: "9", refY: "3", orient: "auto", children: _jsx("polygon", { points: "0 0, 10 3, 0 6", fill: "#dc2626" }) })] }), highlightedRisk && showInherent && showResidual && (_jsx(_Fragment, { children: (() => {
                                                const inherentPos = getCellCenter(highlightedRisk.likelihood_inherent, highlightedRisk.impact_inherent);
                                                const residualPos = getCellCenter(Math.round(highlightedRisk.likelihood_residual_calc), Math.round(highlightedRisk.impact_residual_calc));
                                                const inherentScore = highlightedRisk.likelihood_inherent * highlightedRisk.impact_inherent;
                                                const residualScore = highlightedRisk.residual_score_calc;
                                                const isImprovement = residualScore < inherentScore;
                                                const lineColor = isImprovement ? '#16a34a' : '#dc2626';
                                                const markerUrl = isImprovement
                                                    ? 'url(#arrowhead-green)'
                                                    : 'url(#arrowhead-red)';
                                                return (_jsxs(_Fragment, { children: [_jsx("line", { x1: inherentPos.x, y1: inherentPos.y, x2: residualPos.x, y2: residualPos.y, stroke: lineColor, strokeWidth: "3", strokeDasharray: "5,5", markerEnd: markerUrl }), _jsx("circle", { cx: inherentPos.x, cy: inherentPos.y, r: "6", fill: "#3b82f6", stroke: "white", strokeWidth: "2" }), _jsx("circle", { cx: residualPos.x, cy: residualPos.y, r: "6", fill: "#e11d48", stroke: "white", strokeWidth: "2" })] }));
                                            })() }))] }), _jsx("div", { className: "flex justify-between pl-8 pr-8 mt-2", children: Array.from({ length: matrixSize }, (_, i) => i + 1).map(lik => (_jsx("div", { className: "w-20 text-center text-xs font-semibold", children: likelihoodLabels[lik - 1] }, lik))) })] })] }), highlightedRisk && (_jsxs("div", { className: "mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200", children: [_jsx("div", { className: "text-sm font-semibold mb-2", children: "Legend:" }), _jsxs("div", { className: "flex flex-wrap gap-4 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-4 h-4 rounded-full bg-blue-500 border-2 border-white" }), _jsx("span", { children: "Inherent Position" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-4 h-4 rounded-full bg-rose-600 border-2 border-white" }), _jsx("span", { children: "Residual Position" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-0.5 bg-green-600" }), _jsx("span", { children: "Risk Improved" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-0.5 bg-red-600" }), _jsx("span", { children: "Risk Worsened" })] })] })] }))] }) }));
}
