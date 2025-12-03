import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TrendsView Component
 *
 * Shows risk trends over time periods
 */
import { useState, useEffect } from 'react';
import { getRiskTrends } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
export default function TrendsView() {
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadTrends();
    }, []);
    async function loadTrends() {
        setLoading(true);
        setError(null);
        try {
            const { data, error: trendsError } = await getRiskTrends();
            if (trendsError) {
                throw new Error(trendsError.message);
            }
            setTrends(data || []);
        }
        catch (err) {
            console.error('Trends load error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load trends');
        }
        finally {
            setLoading(false);
        }
    }
    // Loading state
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading trends..." }) }));
    }
    // Error state
    if (error) {
        return (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) }));
    }
    // No data state
    if (trends.length === 0) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-gray-600 text-lg mb-2", children: "No trend data available" }), _jsx("p", { className: "text-gray-500 text-sm", children: "Add period information to risks to see trends" })] }) }) }));
    }
    // Find max values for scaling
    const maxRisks = Math.max(...trends.map((t) => t.total_risks));
    const maxScore = Math.max(...trends.map((t) => t.avg_score));
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Risk Trends Over Time" }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-6", children: trends.map((trend, index) => {
                                const riskHeight = (trend.total_risks / maxRisks) * 200;
                                const scoreHeight = (trend.avg_score / maxScore) * 200;
                                return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h4", { className: "font-semibold text-gray-900", children: trend.period }), _jsxs("div", { className: "flex items-center gap-4 text-sm", children: [_jsxs("span", { className: "text-gray-600", children: [trend.total_risks, " risks"] }), _jsxs("span", { className: "text-gray-600", children: ["Avg Score: ", trend.avg_score.toFixed(1)] })] })] }), _jsxs("div", { className: "flex gap-4 items-end h-52", children: [_jsxs("div", { className: "flex-1 flex flex-col items-center", children: [_jsx("div", { className: "w-full bg-gray-100 rounded-t-lg relative", children: _jsx("div", { className: "bg-blue-500 rounded-t-lg transition-all", style: { height: `${riskHeight}px` } }) }), _jsx("div", { className: "text-xs text-gray-600 mt-1", children: "Total Risks" })] }), _jsxs("div", { className: "flex-1 flex flex-col items-center", children: [_jsx("div", { className: "w-full bg-gray-100 rounded-t-lg relative", children: _jsx("div", { className: "bg-orange-500 rounded-t-lg transition-all", style: { height: `${scoreHeight}px` } }) }), _jsx("div", { className: "text-xs text-gray-600 mt-1", children: "Avg Score" })] })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 pt-2", children: Object.entries(trend.by_status).map(([status, count]) => (_jsxs("div", { className: "bg-gray-50 rounded px-3 py-2 text-sm", children: [_jsx("div", { className: "font-medium", children: status }), _jsx("div", { className: "text-gray-600", children: count })] }, status))) }), index < trends.length - 1 && (_jsx("div", { className: "border-b border-gray-200 pt-4" }))] }, trend.period));
                            }) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Trend Summary" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-blue-50 rounded-lg p-4 border border-blue-200", children: [_jsx("div", { className: "text-2xl font-bold text-blue-900", children: trends.length }), _jsx("div", { className: "text-sm text-blue-700", children: "Periods Tracked" })] }), _jsxs("div", { className: "bg-green-50 rounded-lg p-4 border border-green-200", children: [_jsx("div", { className: "text-2xl font-bold text-green-900", children: maxRisks }), _jsx("div", { className: "text-sm text-green-700", children: "Peak Risks" })] }), _jsxs("div", { className: "bg-orange-50 rounded-lg p-4 border border-orange-200", children: [_jsx("div", { className: "text-2xl font-bold text-orange-900", children: maxScore.toFixed(1) }), _jsx("div", { className: "text-sm text-orange-700", children: "Highest Avg Score" })] })] }) })] })] }));
}
