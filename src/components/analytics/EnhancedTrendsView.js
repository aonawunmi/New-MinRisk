import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * EnhancedTrendsView Component
 *
 * Comprehensive period-over-period trend analysis with multiple chart types
 * Shows risk count trends, status distribution, level migration, and detailed comparisons
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getPeriodTrends, analyzeRiskMigrations, getCommittedPeriods, formatPeriod, } from '@/lib/periods-v2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
export default function EnhancedTrendsView() {
    const { profile } = useAuth();
    const [trendData, setTrendData] = useState([]);
    const [migrations, setMigrations] = useState([]);
    const [availablePeriods, setAvailablePeriods] = useState([]);
    const [selectedPeriod1, setSelectedPeriod1] = useState('');
    const [selectedPeriod2, setSelectedPeriod2] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (profile?.organization_id) {
            loadData();
        }
    }, [profile]);
    useEffect(() => {
        if (selectedPeriod1 && selectedPeriod2 && profile?.organization_id) {
            loadMigrations();
        }
    }, [selectedPeriod1, selectedPeriod2, profile]);
    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const orgId = profile?.organization_id;
            if (!orgId)
                throw new Error('No organization ID');
            // Load trend data
            const { data: trends, error: trendsError } = await getPeriodTrends(orgId);
            if (trendsError)
                throw trendsError;
            setTrendData(trends || []);
            // Load available periods
            const { data: committedPeriods } = await getCommittedPeriods(orgId);
            if (committedPeriods && committedPeriods.length > 0) {
                // Sort periods chronologically (oldest first for migration analysis)
                const sortedPeriods = [...committedPeriods].sort((a, b) => {
                    if (a.period_year !== b.period_year)
                        return a.period_year - b.period_year;
                    return a.period_quarter - b.period_quarter;
                });
                const periods = sortedPeriods.map((cp) => formatPeriod({ year: cp.period_year, quarter: cp.period_quarter }));
                setAvailablePeriods(periods);
                // Auto-select last two periods for migration analysis
                if (periods.length >= 2) {
                    setSelectedPeriod1(periods[periods.length - 2]);
                    setSelectedPeriod2(periods[periods.length - 1]);
                }
            }
        }
        catch (err) {
            console.error('Trend load error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load trend data');
        }
        finally {
            setLoading(false);
        }
    }
    async function loadMigrations() {
        if (!profile?.organization_id || !selectedPeriod1 || !selectedPeriod2)
            return;
        const { data, error: migError } = await analyzeRiskMigrations(profile.organization_id, selectedPeriod1, selectedPeriod2);
        if (migError) {
            console.error('Migration analysis error:', migError);
        }
        else {
            setMigrations(data || []);
        }
    }
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-96", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading trend analysis..." }) }));
    }
    if (error) {
        return (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) }));
    }
    if (trendData.length === 0) {
        return (_jsx(Alert, { children: _jsx(AlertDescription, { children: "No historical data available. Commit periods in the Admin Panel to start tracking trends." }) }));
    }
    // Calculate summary metrics
    const latestPeriod = trendData[trendData.length - 1];
    const previousPeriod = trendData.length > 1 ? trendData[trendData.length - 2] : null;
    const riskCountChange = previousPeriod
        ? latestPeriod.total_risks - previousPeriod.total_risks
        : 0;
    const riskCountChangePercent = previousPeriod && previousPeriod.total_risks > 0
        ? ((riskCountChange / previousPeriod.total_risks) * 100).toFixed(1)
        : '0.0';
    const extremeChange = previousPeriod
        ? latestPeriod.extreme_count - previousPeriod.extreme_count
        : 0;
    const getTrendIcon = (change) => {
        if (change > 0)
            return _jsx(TrendingUp, { className: "h-4 w-4 text-red-500" });
        if (change < 0)
            return _jsx(TrendingDown, { className: "h-4 w-4 text-green-500" });
        return _jsx(Minus, { className: "h-4 w-4 text-gray-400" });
    };
    const getTrendColor = (change) => {
        if (change > 0)
            return 'text-red-600';
        if (change < 0)
            return 'text-green-600';
        return 'text-gray-600';
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Total Risks" }), _jsx("p", { className: "text-3xl font-bold", children: latestPeriod.total_risks })] }), getTrendIcon(riskCountChange)] }), previousPeriod && (_jsxs("p", { className: `text-sm mt-2 ${getTrendColor(riskCountChange)}`, children: [riskCountChange > 0 ? '+' : '', riskCountChange, " (", riskCountChangePercent, "%)"] }))] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Extreme Risks" }), _jsx("p", { className: "text-3xl font-bold text-red-600", children: latestPeriod.extreme_count })] }), getTrendIcon(extremeChange)] }), previousPeriod && (_jsxs("p", { className: `text-sm mt-2 ${getTrendColor(extremeChange)}`, children: [extremeChange > 0 ? '+' : '', extremeChange, " from previous"] }))] }) }), _jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "High Risks" }), _jsx("p", { className: "text-3xl font-bold text-orange-600", children: latestPeriod.high_count })] }) }) }), _jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Periods Tracked" }), _jsx("p", { className: "text-3xl font-bold text-blue-600", children: trendData.length })] }) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Risk Count Trends Over Time" }) }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: trendData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "period" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "total_risks", stroke: "#3b82f6", strokeWidth: 2, name: "Total Risks" }), _jsx(Line, { type: "monotone", dataKey: "extreme_count", stroke: "#ef4444", strokeWidth: 2, name: "Extreme" }), _jsx(Line, { type: "monotone", dataKey: "high_count", stroke: "#f97316", strokeWidth: 2, name: "High" })] }) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Risk Level Distribution Over Time" }) }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(AreaChart, { data: trendData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "period" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Area, { type: "monotone", dataKey: "low_count", stackId: "1", stroke: "#22c55e", fill: "#22c55e", name: "Low" }), _jsx(Area, { type: "monotone", dataKey: "medium_count", stackId: "1", stroke: "#eab308", fill: "#eab308", name: "Medium" }), _jsx(Area, { type: "monotone", dataKey: "high_count", stackId: "1", stroke: "#f97316", fill: "#f97316", name: "High" }), _jsx(Area, { type: "monotone", dataKey: "extreme_count", stackId: "1", stroke: "#ef4444", fill: "#ef4444", name: "Extreme" })] }) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Risk Status Distribution by Period" }) }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: trendData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "period" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Bar, { dataKey: "identified_count", fill: "#94a3b8", name: "Identified" }), _jsx(Bar, { dataKey: "under_review_count", fill: "#60a5fa", name: "Under Review" }), _jsx(Bar, { dataKey: "approved_count", fill: "#34d399", name: "Approved" }), _jsx(Bar, { dataKey: "monitoring_count", fill: "#fbbf24", name: "Monitoring" }), _jsx(Bar, { dataKey: "closed_count", fill: "#9ca3af", name: "Closed" })] }) }) })] }), availablePeriods.length >= 2 && (_jsxs(Card, { className: "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-5 w-5" }), "Risk Migration Analysis"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-gray-700 mb-1 block", children: "From Period:" }), _jsxs(Select, { value: selectedPeriod1, onValueChange: setSelectedPeriod1, children: [_jsx(SelectTrigger, { className: "bg-white", children: _jsx(SelectValue, { placeholder: "Select period" }) }), _jsx(SelectContent, { children: availablePeriods.map((period) => (_jsx(SelectItem, { value: period, children: period }, period))) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-gray-700 mb-1 block", children: "To Period:" }), _jsxs(Select, { value: selectedPeriod2, onValueChange: setSelectedPeriod2, children: [_jsx(SelectTrigger, { className: "bg-white", children: _jsx(SelectValue, { placeholder: "Select period" }) }), _jsx(SelectContent, { children: availablePeriods.map((period) => (_jsx(SelectItem, { value: period, children: period }, period))) })] })] })] }), migrations.length > 0 ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("h4", { className: "font-semibold text-gray-900", children: [migrations.length, " risk", migrations.length !== 1 ? 's' : '', " changed severity"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "bg-red-50 rounded-lg p-4 border border-red-200", children: [_jsxs("h5", { className: "font-semibold text-red-900 mb-2 flex items-center gap-2", children: [_jsx(TrendingUp, { className: "h-4 w-4" }), "Escalated (", migrations.filter((m) => ['Low', 'Medium'].includes(m.from_level) &&
                                                                ['High', 'Extreme'].includes(m.to_level)).length, ")"] }), _jsx("div", { className: "space-y-2", children: migrations
                                                            .filter((m) => ['Low', 'Medium'].includes(m.from_level) &&
                                                            ['High', 'Extreme'].includes(m.to_level))
                                                            .map((migration) => (_jsxs("div", { className: "bg-white rounded p-2 text-sm", children: [_jsx("code", { className: "font-mono text-xs text-red-900", children: migration.risk_code }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx(Badge, { variant: "outline", className: "text-xs bg-yellow-100 border-yellow-300", children: migration.from_level }), _jsx("span", { className: "text-gray-400", children: "\uFFFD" }), _jsx(Badge, { variant: "outline", className: "text-xs bg-red-100 border-red-300", children: migration.to_level })] })] }, migration.risk_code))) })] }), _jsxs("div", { className: "bg-green-50 rounded-lg p-4 border border-green-200", children: [_jsxs("h5", { className: "font-semibold text-green-900 mb-2 flex items-center gap-2", children: [_jsx(TrendingDown, { className: "h-4 w-4" }), "De-escalated (", migrations.filter((m) => ['High', 'Extreme'].includes(m.from_level) &&
                                                                ['Low', 'Medium'].includes(m.to_level)).length, ")"] }), _jsx("div", { className: "space-y-2", children: migrations
                                                            .filter((m) => ['High', 'Extreme'].includes(m.from_level) &&
                                                            ['Low', 'Medium'].includes(m.to_level))
                                                            .map((migration) => (_jsxs("div", { className: "bg-white rounded p-2 text-sm", children: [_jsx("code", { className: "font-mono text-xs text-green-900", children: migration.risk_code }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx(Badge, { variant: "outline", className: "text-xs bg-red-100 border-red-300", children: migration.from_level }), _jsx("span", { className: "text-gray-400", children: "\uFFFD" }), _jsx(Badge, { variant: "outline", className: "text-xs bg-green-100 border-green-300", children: migration.to_level })] })] }, migration.risk_code))) })] })] })] })) : (_jsx("p", { className: "text-gray-600 text-center py-4", children: "No risk level changes detected between these periods" }))] })] })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Period-by-Period Breakdown" }) }), _jsx(CardContent, { children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left p-2 font-semibold", children: "Period" }), _jsx("th", { className: "text-right p-2 font-semibold", children: "Total" }), _jsx("th", { className: "text-right p-2 font-semibold text-red-600", children: "Extreme" }), _jsx("th", { className: "text-right p-2 font-semibold text-orange-600", children: "High" }), _jsx("th", { className: "text-right p-2 font-semibold text-yellow-600", children: "Medium" }), _jsx("th", { className: "text-right p-2 font-semibold text-green-600", children: "Low" }), _jsx("th", { className: "text-right p-2 font-semibold text-gray-600", children: "Closed" })] }) }), _jsx("tbody", { children: trendData.map((period, index) => {
                                            const prev = index > 0 ? trendData[index - 1] : null;
                                            const totalChange = prev
                                                ? period.total_risks - prev.total_risks
                                                : 0;
                                            return (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "p-2 font-medium", children: period.period }), _jsxs("td", { className: "text-right p-2", children: [period.total_risks, prev && totalChange !== 0 && (_jsxs("span", { className: `ml-2 text-xs ${totalChange > 0 ? 'text-red-600' : 'text-green-600'}`, children: ["(", totalChange > 0 ? '+' : '', totalChange, ")"] }))] }), _jsx("td", { className: "text-right p-2 text-red-600", children: period.extreme_count }), _jsx("td", { className: "text-right p-2 text-orange-600", children: period.high_count }), _jsx("td", { className: "text-right p-2 text-yellow-600", children: period.medium_count }), _jsx("td", { className: "text-right p-2 text-green-600", children: period.low_count }), _jsx("td", { className: "text-right p-2 text-gray-600", children: period.closed_count })] }, period.period));
                                        }) })] }) }) })] })] }));
}
