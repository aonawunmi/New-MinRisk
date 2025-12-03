import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Analytics Component
 *
 * Comprehensive risk analytics page with heatmap, trends, and detailed reports
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdvancedRiskHeatmap from './AdvancedRiskHeatmap';
import HeatmapComparison from './HeatmapComparison';
import EnhancedTrendsView from './EnhancedTrendsView';
export default function Analytics() {
    const [matrixSize, setMatrixSize] = useState(5);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold", children: "Risk Analytics & Reports" }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: "Visualize and analyze your risk portfolio" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm text-gray-600", children: "Matrix Size:" }), _jsx("button", { onClick: () => setMatrixSize(5), className: `px-3 py-1 rounded-lg text-sm font-medium transition-colors ${matrixSize === 5
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, children: "5\u00D75" }), _jsx("button", { onClick: () => setMatrixSize(6), className: `px-3 py-1 rounded-lg text-sm font-medium transition-colors ${matrixSize === 6
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, children: "6\u00D76" })] })] }), _jsxs(Tabs, { defaultValue: "advanced", className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "advanced", children: "\u26A1 Risk Analysis" }), _jsx(TabsTrigger, { value: "comparison", children: "\uD83D\uDD04 Period Comparison" }), _jsx(TabsTrigger, { value: "trends", children: "\uD83D\uDCC8 Trends" }), _jsx(TabsTrigger, { value: "reports", children: "\uD83D\uDCCA Reports" })] }), _jsx(TabsContent, { value: "advanced", className: "mt-6", children: _jsx(AdvancedRiskHeatmap, { matrixSize: matrixSize }) }), _jsx(TabsContent, { value: "comparison", className: "mt-6", children: _jsx(HeatmapComparison, {}) }), _jsx(TabsContent, { value: "trends", className: "mt-6", children: _jsx(EnhancedTrendsView, {}) }), _jsx(TabsContent, { value: "reports", className: "mt-6", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Reports" }), _jsx("p", { className: "text-gray-600", children: "Custom reports and exports will be available here" })] }) })] })] }));
}
