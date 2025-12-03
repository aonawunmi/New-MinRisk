import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * HeatmapComparison Component
 *
 * Side-by-side comparison of two period snapshots
 * Shows how risk profile evolved between periods
 */
import { useState, useEffect } from 'react';
import { getHeatmapData, getRiskLevelColor } from '@/lib/analytics';
import { getCommittedPeriods, getRiskHistoryForPeriod, formatPeriod } from '@/lib/periods-v2';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
export default function HeatmapComparison() {
    const { profile } = useAuth();
    const [period1, setPeriod1] = useState(null);
    const [period2, setPeriod2] = useState(null);
    const [availablePeriods, setAvailablePeriods] = useState([]);
    const [heatmap1, setHeatmap1] = useState([]);
    const [heatmap2, setHeatmap2] = useState([]);
    const [comparisonStats, setComparisonStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewType, setViewType] = useState('inherent');
    const [selectedCell1, setSelectedCell1] = useState(null);
    const [selectedCell2, setSelectedCell2] = useState(null);
    const matrixSize = 5;
    // Load available periods on mount
    useEffect(() => {
        if (profile?.organization_id) {
            loadAvailablePeriods();
        }
    }, [profile]);
    // Load heatmaps when both periods selected or view type changes
    useEffect(() => {
        if (period1 && period2 && profile?.organization_id) {
            loadComparison();
        }
    }, [period1, period2, viewType, profile]);
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
            // Extract Period objects
            const periods = sortedPeriods.map((cp) => ({
                year: cp.period_year,
                quarter: cp.period_quarter,
            }));
            setAvailablePeriods(periods);
            // Auto-select last two periods if available
            if (periods.length >= 2) {
                setPeriod1(periods[1]); // Second most recent
                setPeriod2(periods[0]); // Most recent
            }
            else if (periods.length === 1) {
                setPeriod1(periods[0]);
            }
        }
    }
    async function loadComparison() {
        if (!profile?.organization_id || !period1 || !period2)
            return;
        // Prevent comparing same period to itself
        if (period1.year === period2.year && period1.quarter === period2.quarter) {
            setError('Please select two different periods to compare');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Load both heatmaps with selected view type
            // Note: getHeatmapData will be updated in Phase 8 to accept Period objects
            // For now, we convert to formatted strings
            const [result1, result2] = await Promise.all([
                getHeatmapData(matrixSize, formatPeriod(period1), profile.organization_id, viewType),
                getHeatmapData(matrixSize, formatPeriod(period2), profile.organization_id, viewType),
            ]);
            if (result1.error || result2.error) {
                throw new Error(result1.error?.message || result2.error?.message || 'Failed to load heatmaps');
            }
            setHeatmap1(result1.data || []);
            setHeatmap2(result2.data || []);
            // Load risk history for both periods to calculate comparison stats
            const [history1, history2] = await Promise.all([
                getRiskHistoryForPeriod(profile.organization_id, period1),
                getRiskHistoryForPeriod(profile.organization_id, period2),
            ]);
            if (!history1.error && !history2.error && history1.data && history2.data) {
                // Calculate comparison statistics
                const stats = {
                    period1Count: history1.data.length,
                    period2Count: history2.data.length,
                    risksAdded: history2.data.length - history1.data.length,
                    avgInherent1: history1.data.reduce((sum, r) => sum + r.score_inherent, 0) / history1.data.length || 0,
                    avgInherent2: history2.data.reduce((sum, r) => sum + r.score_inherent, 0) / history2.data.length || 0,
                    avgResidual1: history1.data.reduce((sum, r) => sum + (r.score_residual || r.score_inherent), 0) / history1.data.length || 0,
                    avgResidual2: history2.data.reduce((sum, r) => sum + (r.score_residual || r.score_inherent), 0) / history2.data.length || 0,
                };
                setComparisonStats(stats);
            }
        }
        catch (err) {
            console.error('Load comparison error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load comparison');
        }
        finally {
            setLoading(false);
        }
    }
    // Create matrix structure for a heatmap
    function createMatrix(data) {
        const matrix = [];
        for (let impact = matrixSize; impact >= 1; impact--) {
            const row = [];
            for (let likelihood = 1; likelihood <= matrixSize; likelihood++) {
                const cell = data.find((c) => c.likelihood === likelihood && c.impact === impact);
                if (cell) {
                    row.push(cell);
                }
                else {
                    // Empty cell
                    row.push({
                        likelihood,
                        impact,
                        count: 0,
                        risk_codes: [],
                        level: 'Low',
                    });
                }
            }
            matrix.push(row);
        }
        return matrix;
    }
    // Get change indicator color
    function getChangeColor(change) {
        if (change > 0)
            return 'text-red-600'; // More risks = worse
        if (change < 0)
            return 'text-green-600'; // Fewer risks = better
        return 'text-gray-600'; // No change
    }
    // Get cell opacity based on count
    const getOpacity = (count) => {
        if (count === 0)
            return 0.1;
        if (count === 1)
            return 0.3;
        if (count === 2)
            return 0.5;
        if (count <= 4)
            return 0.7;
        return 1.0;
    };
    if (!profile?.organization_id) {
        return (_jsx(Alert, { children: _jsx(AlertDescription, { children: "Please log in to view period comparison" }) }));
    }
    if (availablePeriods.length < 2) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "py-12", children: _jsxs("div", { className: "text-center", children: [_jsx(Calendar, { className: "h-12 w-12 text-gray-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Not Enough Period Snapshots" }), _jsx("p", { className: "text-gray-600 mb-4", children: "You need at least 2 committed period snapshots to compare." }), _jsx("p", { className: "text-sm text-gray-500", children: "Go to Admin Panel \u2192 Period Management to commit periods." })] }) }) }));
    }
    const matrix1 = createMatrix(heatmap1);
    const matrix2 = createMatrix(heatmap2);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-5 w-5" }), "Period Comparison"] }), _jsx(CardDescription, { children: "Compare risk profiles between two periods to track changes" })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-center gap-6 py-3 border-b border-blue-200", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Risk View:" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: () => setViewType('inherent'), className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewType === 'inherent'
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`, children: "Inherent Risk" }), _jsx("button", { onClick: () => setViewType('residual'), className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewType === 'residual'
                                                    ? 'bg-green-600 text-white shadow-md'
                                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`, children: "Residual Risk" })] }), _jsx("div", { className: "text-xs text-gray-500", children: viewType === 'inherent' ? '(Before controls)' : '(After controls)' })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-sm font-medium text-gray-700 mb-1 block", children: "Period 1 (Earlier):" }), _jsxs(Select, { value: period1 ? `${period1.year}-${period1.quarter}` : undefined, onValueChange: (value) => {
                                                    const [year, quarter] = value.split('-').map(Number);
                                                    setPeriod1({ year, quarter });
                                                }, children: [_jsx(SelectTrigger, { className: "bg-white", children: _jsx(SelectValue, { placeholder: "Select first period" }) }), _jsx(SelectContent, { children: availablePeriods.map((period) => (_jsx(SelectItem, { value: `${period.year}-${period.quarter}`, children: formatPeriod(period) }, `${period.year}-${period.quarter}`))) })] })] }), _jsx("div", { className: "pt-6", children: _jsx(ArrowRight, { className: "h-6 w-6 text-gray-400" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-sm font-medium text-gray-700 mb-1 block", children: "Period 2 (Later):" }), _jsxs(Select, { value: period2 ? `${period2.year}-${period2.quarter}` : undefined, onValueChange: (value) => {
                                                    const [year, quarter] = value.split('-').map(Number);
                                                    setPeriod2({ year, quarter });
                                                }, children: [_jsx(SelectTrigger, { className: "bg-white", children: _jsx(SelectValue, { placeholder: "Select second period" }) }), _jsx(SelectContent, { children: availablePeriods.map((period) => (_jsx(SelectItem, { value: `${period.year}-${period.quarter}`, children: formatPeriod(period) }, `${period.year}-${period.quarter}`))) })] })] }), _jsx("div", { className: "pt-6", children: _jsx(Button, { onClick: loadComparison, disabled: loading || !period1 || !period2, children: loading ? 'Comparing...' : 'Compare' }) })] })] })] }), error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), loading && (_jsx(Card, { children: _jsx(CardContent, { className: "py-12", children: _jsx("div", { className: "text-center text-gray-600", children: "Loading comparison data..." }) }) })), !loading && comparisonStats && period1 && period2 && (_jsxs(Card, { className: "border-blue-200 bg-blue-50", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["Comparison Summary: ", formatPeriod(period1), " vs ", formatPeriod(period2)] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [_jsxs("div", { className: "bg-white rounded-lg border p-4", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Total Risk Count Change" }), _jsxs("div", { className: `text-2xl font-bold ${getChangeColor(comparisonStats.risksAdded)}`, children: [comparisonStats.risksAdded > 0 ? '+' : '', comparisonStats.risksAdded] }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: comparisonStats.risksAdded > 0 ? 'risks added' : comparisonStats.risksAdded < 0 ? 'risks removed' : 'no change' }), _jsxs("div", { className: "text-xs text-gray-400 mt-2 border-t pt-2", children: [comparisonStats.period1Count, " \u2192 ", comparisonStats.period2Count, " risks"] })] }), _jsxs("div", { className: "bg-white rounded-lg border p-4", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Avg Inherent Risk" }), _jsxs("div", { className: `text-2xl font-bold ${getChangeColor(comparisonStats.avgInherent2 - comparisonStats.avgInherent1)}`, children: [comparisonStats.avgInherent2 - comparisonStats.avgInherent1 > 0 ? '+' : '', (comparisonStats.avgInherent2 - comparisonStats.avgInherent1).toFixed(1)] }), _jsxs("div", { className: "text-xs text-gray-400 mt-2 border-t pt-2", children: [comparisonStats.avgInherent1.toFixed(1), " \u2192 ", comparisonStats.avgInherent2.toFixed(1)] })] }), _jsxs("div", { className: "bg-white rounded-lg border p-4", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Avg Residual Risk" }), _jsxs("div", { className: `text-2xl font-bold ${getChangeColor(comparisonStats.avgResidual2 - comparisonStats.avgResidual1)}`, children: [comparisonStats.avgResidual2 - comparisonStats.avgResidual1 > 0 ? '+' : '', (comparisonStats.avgResidual2 - comparisonStats.avgResidual1).toFixed(1)] }), _jsxs("div", { className: "text-xs text-gray-400 mt-2 border-t pt-2", children: [comparisonStats.avgResidual1.toFixed(1), " \u2192 ", comparisonStats.avgResidual2.toFixed(1)] })] }), _jsxs("div", { className: "bg-white rounded-lg border p-4", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Risk Reduction" }), _jsxs("div", { className: "text-2xl font-bold text-green-600", children: [comparisonStats.avgResidual2 < comparisonStats.avgInherent2 ?
                                                    ((comparisonStats.avgInherent2 - comparisonStats.avgResidual2) / comparisonStats.avgInherent2 * 100).toFixed(0) :
                                                    0, "%"] }), _jsxs("div", { className: "text-xs text-gray-500 mt-1", children: ["in ", formatPeriod(period2)] })] })] }) })] })), !loading && period1 && period2 && heatmap1.length > 0 && heatmap2.length > 0 && (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { children: formatPeriod(period1) }), _jsx(Badge, { variant: "outline", className: "bg-gray-100", children: "Earlier" })] }), _jsx(Badge, { variant: "outline", className: viewType === 'inherent' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-green-100 border-green-300 text-green-800', children: viewType === 'inherent' ? 'INHERENT' : 'RESIDUAL' })] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-1", children: matrix1.map((row, rowIndex) => (_jsx("div", { className: "flex gap-1", children: row.map((cell) => {
                                            const cellColor = getRiskLevelColor(cell.level);
                                            const opacity = getOpacity(cell.count);
                                            const isSelected = selectedCell1?.likelihood === cell.likelihood && selectedCell1?.impact === cell.impact;
                                            return (_jsx("button", { onClick: () => setSelectedCell1(cell), className: `relative w-16 h-16 rounded border-2 transition-all hover:scale-105 hover:shadow-lg hover:z-10 ${isSelected ? 'border-blue-600 shadow-lg scale-105 z-10' : 'border-gray-300'}`, style: {
                                                    backgroundColor: cellColor,
                                                    opacity,
                                                }, children: _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-white", children: [_jsx("div", { className: "text-xl font-bold", children: cell.count }), _jsxs("div", { className: "text-xs opacity-90", children: [cell.likelihood, "\u00D7", cell.impact] })] }) }, `${cell.likelihood}-${cell.impact}`));
                                        }) }, rowIndex))) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { children: formatPeriod(period2) }), _jsx(Badge, { variant: "outline", className: "bg-blue-100 text-blue-800", children: "Later" })] }), _jsx(Badge, { variant: "outline", className: viewType === 'inherent' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-green-100 border-green-300 text-green-800', children: viewType === 'inherent' ? 'INHERENT' : 'RESIDUAL' })] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-1", children: matrix2.map((row, rowIndex) => (_jsx("div", { className: "flex gap-1", children: row.map((cell) => {
                                            const cellColor = getRiskLevelColor(cell.level);
                                            const cell1 = matrix1[rowIndex].find((c) => c.likelihood === cell.likelihood && c.impact === cell.impact);
                                            const change = cell.count - (cell1?.count || 0);
                                            const opacity = getOpacity(cell.count);
                                            const isSelected = selectedCell2?.likelihood === cell.likelihood && selectedCell2?.impact === cell.impact;
                                            return (_jsx("button", { onClick: () => setSelectedCell2(cell), className: `relative w-16 h-16 rounded border-2 transition-all hover:scale-105 hover:shadow-lg hover:z-10 ${isSelected
                                                    ? 'border-blue-600 shadow-lg scale-105 z-10'
                                                    : change > 0
                                                        ? 'border-red-500'
                                                        : change < 0
                                                            ? 'border-green-500'
                                                            : 'border-gray-300'}`, style: {
                                                    backgroundColor: cellColor,
                                                    opacity,
                                                }, children: _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-white", children: [_jsx("div", { className: "text-xl font-bold", children: cell.count }), change !== 0 && (_jsx("div", { className: "text-xs font-bold", children: change > 0 ? `+${change}` : change }))] }) }, `${cell.likelihood}-${cell.impact}`));
                                        }) }, rowIndex))) }) })] })] })), selectedCell1 && (_jsxs(Card, { className: "border-blue-200 bg-blue-50", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs(CardTitle, { className: "flex items-center gap-3", children: [_jsx(Badge, { style: {
                                                backgroundColor: getRiskLevelColor(selectedCell1.level),
                                                color: 'white',
                                            }, className: "text-lg px-3 py-1", children: selectedCell1.level }), _jsxs("span", { children: [formatPeriod(period1), " - Likelihood: ", selectedCell1.likelihood, " | Impact: ", selectedCell1.impact] })] }), _jsx("button", { onClick: () => setSelectedCell1(null), className: "text-gray-500 hover:text-gray-700 text-xl px-2", children: "\u2715" })] }) }), _jsx(CardContent, { children: selectedCell1.count === 0 ? (_jsxs("p", { className: "text-gray-600", children: ["No risks in this category (L", selectedCell1.likelihood, " \u00D7 I", selectedCell1.impact, ")"] })) : (_jsxs("div", { children: [_jsxs("p", { className: "text-gray-900 font-medium mb-3", children: [selectedCell1.count, " risk", selectedCell1.count !== 1 ? 's' : '', " in this category:"] }), _jsx("div", { className: "space-y-2", children: selectedCell1.risk_codes.map((code) => (_jsx("div", { className: "bg-white rounded-lg px-4 py-2 border border-blue-200", children: _jsx("code", { className: "text-sm font-mono text-blue-900", children: code }) }, code))) })] })) })] })), selectedCell2 && (_jsxs(Card, { className: "border-green-200 bg-green-50", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs(CardTitle, { className: "flex items-center gap-3", children: [_jsx(Badge, { style: {
                                                backgroundColor: getRiskLevelColor(selectedCell2.level),
                                                color: 'white',
                                            }, className: "text-lg px-3 py-1", children: selectedCell2.level }), _jsxs("span", { children: [formatPeriod(period2), " - Likelihood: ", selectedCell2.likelihood, " | Impact: ", selectedCell2.impact] })] }), _jsx("button", { onClick: () => setSelectedCell2(null), className: "text-gray-500 hover:text-gray-700 text-xl px-2", children: "\u2715" })] }) }), _jsx(CardContent, { children: selectedCell2.count === 0 ? (_jsxs("p", { className: "text-gray-600", children: ["No risks in this category (L", selectedCell2.likelihood, " \u00D7 I", selectedCell2.impact, ")"] })) : (_jsxs("div", { children: [_jsxs("p", { className: "text-gray-900 font-medium mb-3", children: [selectedCell2.count, " risk", selectedCell2.count !== 1 ? 's' : '', " in this category:"] }), _jsx("div", { className: "space-y-2", children: selectedCell2.risk_codes.map((code) => (_jsx("div", { className: "bg-white rounded-lg px-4 py-2 border border-green-200", children: _jsx("code", { className: "text-sm font-mono text-green-900", children: code }) }, code))) })] })) })] }))] }));
}
