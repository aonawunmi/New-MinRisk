import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Dashboard Component
 *
 * Executive dashboard showing risk metrics, distributions, top risks,
 * alerts, and trends.
 */
import { useState, useEffect } from 'react';
import { getDashboardMetrics, getTopRisks, getRiskDistribution, getAlertsSummary, } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MetricCard from './MetricCard';
import RiskLevelChart from './RiskLevelChart';
import RiskDistributionChart from './RiskDistributionChart';
import TopRisksTable from './TopRisksTable';
import AlertsSummary from './AlertsSummary';
export default function Dashboard() {
    const [metrics, setMetrics] = useState(null);
    const [topRisks, setTopRisks] = useState([]);
    const [levelDistribution, setLevelDistribution] = useState([]);
    const [divisionDistribution, setDivisionDistribution] = useState([]);
    const [categoryDistribution, setCategoryDistribution] = useState([]);
    const [alertsSummary, setAlertsSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadDashboardData();
    }, []);
    async function loadDashboardData() {
        setLoading(true);
        setError(null);
        try {
            // Load all dashboard data in parallel
            const [metricsResult, topRisksResult, levelDistResult, divDistResult, catDistResult, alertsResult,] = await Promise.all([
                getDashboardMetrics(),
                getTopRisks(10),
                getRiskDistribution('level'),
                getRiskDistribution('division'),
                getRiskDistribution('category'),
                getAlertsSummary(),
            ]);
            // Handle errors
            if (metricsResult.error) {
                throw new Error(metricsResult.error.message);
            }
            if (topRisksResult.error) {
                throw new Error(topRisksResult.error.message);
            }
            if (levelDistResult.error) {
                throw new Error(levelDistResult.error.message);
            }
            if (divDistResult.error) {
                throw new Error(divDistResult.error.message);
            }
            if (catDistResult.error) {
                throw new Error(catDistResult.error.message);
            }
            if (alertsResult.error) {
                throw new Error(alertsResult.error.message);
            }
            // Set data
            setMetrics(metricsResult.data);
            setTopRisks(topRisksResult.data || []);
            setLevelDistribution(levelDistResult.data || []);
            setDivisionDistribution(divDistResult.data || []);
            setCategoryDistribution(catDistResult.data || []);
            setAlertsSummary(alertsResult.data);
        }
        catch (err) {
            console.error('Dashboard load error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
        finally {
            setLoading(false);
        }
    }
    // Loading state
    if (loading) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("h2", { className: "text-2xl font-bold", children: "Dashboard" }) }), _jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading dashboard data..." }) })] }));
    }
    // Error state
    if (error) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("h2", { className: "text-2xl font-bold", children: "Dashboard" }) }), _jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })] }));
    }
    // No data state
    if (!metrics) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("h2", { className: "text-2xl font-bold", children: "Dashboard" }) }), _jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-gray-600 text-lg mb-4", children: "No risk data available" }), _jsx("p", { className: "text-gray-500 text-sm", children: "Start by adding risks in the Risk Register tab" })] }) }) })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold", children: "Risk Dashboard" }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: "Executive overview of your organization's risk landscape" })] }), _jsx("button", { onClick: loadDashboardData, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: "\uD83D\uDD04 Refresh" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(MetricCard, { title: "Total Risks", value: metrics.total_risks, icon: "\uD83D\uDCCB", color: "blue" }), _jsx(MetricCard, { title: "Avg Inherent Risk", value: metrics.avg_inherent_score.toFixed(1), icon: "\uD83D\uDCCA", color: "orange" }), _jsx(MetricCard, { title: "Avg Residual Risk", value: metrics.avg_residual_score.toFixed(1), icon: "\uD83C\uDFAF", color: "blue" }), _jsx(MetricCard, { title: "Control Quality", value: `${metrics.avg_control_effectiveness}%`, icon: "\uD83D\uDEE1\uFE0F", color: "green", subtitle: `DIME Assessment • ${metrics.total_controls} controls` })] }), alertsSummary && (_jsx(AlertsSummary, { kriAlerts: alertsSummary.kri_alerts, intelligenceAlerts: alertsSummary.intelligence_alerts, totalAlerts: alertsSummary.total_alerts, kriByLevel: alertsSummary.kri_by_level })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Risk Status Distribution" }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-3", children: Object.entries(metrics.by_status).map(([status, count]) => {
                                        const percentage = Math.round((count / metrics.total_risks) * 100);
                                        return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "font-medium", children: status }), _jsxs("span", { className: "text-gray-600", children: [count, " (", percentage, "%)"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all", style: { width: `${percentage}%` } }) })] }, status));
                                    }) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Risk Level Distribution" }) }), _jsx(CardContent, { children: _jsx(RiskLevelChart, { distribution: levelDistribution }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Risks by Division" }) }), _jsx(CardContent, { children: _jsx(RiskDistributionChart, { data: divisionDistribution, emptyMessage: "No division data available" }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Risks by Category" }) }), _jsx(CardContent, { children: _jsx(RiskDistributionChart, { data: categoryDistribution, emptyMessage: "No category data available" }) })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Top 10 Risks (by Inherent Score)" }) }), _jsx(CardContent, { children: topRisks.length > 0 ? (_jsx(TopRisksTable, { risks: topRisks })) : (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No risks to display" })) })] })] }));
}
