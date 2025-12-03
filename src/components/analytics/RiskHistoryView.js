import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Risk History View Component
 *
 * Displays historical risk snapshots by quarter with heatmap visualization.
 * Shows risks as they existed at period boundaries (immutable historical view).
 */
import { useState, useEffect } from 'react';
import { getCommittedPeriods, getRiskHistoryForPeriod, formatPeriod, } from '@/lib/periods-v2';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { History, Calendar, AlertCircle, Archive } from 'lucide-react';
export default function RiskHistoryView() {
    const { profile } = useAuth();
    const [committedPeriods, setCommittedPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [riskSnapshots, setRiskSnapshots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (profile?.organization_id) {
            loadCommittedPeriods();
        }
    }, [profile?.organization_id]);
    useEffect(() => {
        if (selectedPeriod && profile?.organization_id) {
            loadRiskHistory();
        }
    }, [selectedPeriod, profile?.organization_id]);
    async function loadCommittedPeriods() {
        if (!profile?.organization_id)
            return;
        try {
            const { data, error: loadError } = await getCommittedPeriods(profile.organization_id);
            if (loadError) {
                setError('Failed to load committed periods');
                console.error(loadError);
            }
            else if (data && data.length > 0) {
                setCommittedPeriods(data);
                // Auto-select most recent period
                const mostRecent = data.sort((a, b) => {
                    if (a.period_year !== b.period_year)
                        return b.period_year - a.period_year;
                    return b.period_quarter - a.period_quarter;
                })[0];
                setSelectedPeriod({
                    year: mostRecent.period_year,
                    quarter: mostRecent.period_quarter,
                });
            }
        }
        catch (err) {
            setError('Unexpected error loading periods');
            console.error(err);
        }
    }
    async function loadRiskHistory() {
        if (!selectedPeriod || !profile?.organization_id)
            return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: loadError } = await getRiskHistoryForPeriod(profile.organization_id, selectedPeriod);
            if (loadError) {
                setError('Failed to load risk history');
                console.error(loadError);
            }
            else {
                setRiskSnapshots(data || []);
            }
        }
        catch (err) {
            setError('Unexpected error loading risk history');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }
    function getRiskLevel(score) {
        if (score >= 15)
            return { label: 'EXTREME', color: 'bg-red-600 text-white' };
        if (score >= 10)
            return { label: 'HIGH', color: 'bg-orange-500 text-white' };
        if (score >= 5)
            return { label: 'MEDIUM', color: 'bg-yellow-500 text-white' };
        return { label: 'LOW', color: 'bg-green-500 text-white' };
    }
    function calculateStats(snapshots) {
        const total = snapshots.length;
        const byStatus = snapshots.reduce((acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
        }, {});
        const byLevel = snapshots.reduce((acc, s) => {
            const level = getRiskLevel(s.score_residual || s.score_inherent).label;
            acc[level] = (acc[level] || 0) + 1;
            return acc;
        }, {});
        const avgInherent = total > 0
            ? snapshots.reduce((sum, s) => sum + s.score_inherent, 0) / total
            : 0;
        const avgResidual = total > 0
            ? snapshots.reduce((sum, s) => sum + (s.score_residual || s.score_inherent), 0) /
                total
            : 0;
        return {
            total,
            byStatus,
            byLevel,
            avgInherent,
            avgResidual,
        };
    }
    const stats = riskSnapshots.length > 0 ? calculateStats(riskSnapshots) : null;
    const selectedCommit = committedPeriods.find((c) => c.period_year === selectedPeriod?.year && c.period_quarter === selectedPeriod?.quarter);
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Card, { children: _jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(History, { className: "h-5 w-5" }), "Risk History"] }), _jsx(CardDescription, { children: "View historical risk snapshots by quarter. Historical data is immutable and shows risks as they existed at period boundaries." })] }) }), _jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: committedPeriods.length === 0 ? (_jsxs(Alert, { children: [_jsx(Archive, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: "No historical periods available yet. Commit your first period in the Period Management section to start tracking risk evolution." })] })) : (_jsx("div", { className: "space-y-4", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-sm font-medium mb-2 block", children: "Select Period" }), _jsxs(Select, { value: selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.quarter}` : '', onValueChange: (value) => {
                                                const [year, quarter] = value.split('-').map(Number);
                                                setSelectedPeriod({ year, quarter });
                                            }, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Select a period" }) }), _jsx(SelectContent, { children: committedPeriods
                                                        .sort((a, b) => {
                                                        if (a.period_year !== b.period_year)
                                                            return b.period_year - a.period_year;
                                                        return b.period_quarter - a.period_quarter;
                                                    })
                                                        .map((commit) => (_jsxs(SelectItem, { value: `${commit.period_year}-${commit.period_quarter}`, children: [formatPeriod({
                                                                year: commit.period_year,
                                                                quarter: commit.period_quarter,
                                                            }), ' ', "(", commit.risks_count, " risks)"] }, commit.id))) })] })] }), selectedCommit && (_jsxs("div", { className: "text-sm text-gray-600", children: [_jsxs("div", { children: [_jsx("strong", { children: "Committed:" }), ' ', new Date(selectedCommit.committed_at).toLocaleDateString()] }), selectedCommit.notes && (_jsxs("div", { className: "text-xs text-gray-500 mt-1", children: [_jsx("strong", { children: "Notes:" }), " ", selectedCommit.notes] }))] }))] }) })) }) }), selectedPeriod && stats && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Total Risks" }), _jsx("div", { className: "text-3xl font-bold", children: stats.total }), _jsxs("div", { className: "text-xs text-gray-500 mt-2", children: ["Active: ", stats.byStatus['OPEN'] || 0, " | Closed: ", stats.byStatus['CLOSED'] || 0] })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Avg Inherent Risk" }), _jsx("div", { className: "text-3xl font-bold text-red-600", children: stats.avgInherent.toFixed(1) }), _jsx("div", { className: "text-xs text-gray-500 mt-2", children: "Before controls" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Avg Residual Risk" }), _jsx("div", { className: "text-3xl font-bold text-orange-600", children: stats.avgResidual.toFixed(1) }), _jsx("div", { className: "text-xs text-gray-500 mt-2", children: "After controls" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Risk Reduction" }), _jsxs("div", { className: "text-3xl font-bold text-green-600", children: [stats.avgInherent > 0
                                            ? Math.round(((stats.avgInherent - stats.avgResidual) / stats.avgInherent) * 100)
                                            : 0, "%"] }), _jsx("div", { className: "text-xs text-gray-500 mt-2", children: "Control Impact" })] }) })] })), selectedPeriod && stats && (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "Risk Level Distribution" }) }), _jsx(CardContent, { children: _jsx("div", { className: "flex gap-2 items-center", children: Object.entries(stats.byLevel)
                                .sort(([a], [b]) => {
                                const order = ['EXTREME', 'HIGH', 'MEDIUM', 'LOW'];
                                return order.indexOf(a) - order.indexOf(b);
                            })
                                .map(([level, count]) => {
                                const levelInfo = getRiskLevel(level === 'EXTREME' ? 20 : level === 'HIGH' ? 12 : level === 'MEDIUM' ? 7 : 3);
                                return (_jsxs(Badge, { className: `${levelInfo.color} px-4 py-2`, children: [level, ": ", count] }, level));
                            }) }) })] })), selectedPeriod && (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [_jsx(Calendar, { className: "h-5 w-5" }), "Risks as of ", selectedPeriod && formatPeriod(selectedPeriod)] }), _jsx(CardDescription, { children: "Read-only historical snapshot" })] }), _jsxs(CardContent, { children: [error && (_jsxs(Alert, { variant: "destructive", className: "mb-4", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), loading ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "Loading risk history..." })) : riskSnapshots.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No risk snapshots found for this period." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Risk Code" }), _jsx(TableHead, { children: "Title" }), _jsx(TableHead, { children: "Category" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Inherent (L\u00D7I)" }), _jsx(TableHead, { children: "Residual (L\u00D7I)" }), _jsx(TableHead, { children: "Level" })] }) }), _jsx(TableBody, { children: riskSnapshots
                                                .sort((a, b) => {
                                                const scoreA = a.score_residual || a.score_inherent;
                                                const scoreB = b.score_residual || b.score_inherent;
                                                return scoreB - scoreA;
                                            })
                                                .map((snapshot) => {
                                                const residualScore = snapshot.score_residual || snapshot.score_inherent;
                                                const level = getRiskLevel(residualScore);
                                                return (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-mono text-sm", children: snapshot.risk_code }), _jsx(TableCell, { className: "max-w-xs truncate", children: snapshot.risk_title }), _jsx(TableCell, { className: "text-sm text-gray-600", children: snapshot.category || '—' }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: snapshot.status === 'OPEN'
                                                                    ? 'border-green-500 text-green-700'
                                                                    : 'border-gray-400 text-gray-600', children: snapshot.status }) }), _jsxs(TableCell, { className: "text-sm", children: [snapshot.likelihood_inherent, " \u00D7 ", snapshot.impact_inherent, " =", ' ', _jsx("span", { className: "font-semibold", children: snapshot.score_inherent })] }), _jsxs(TableCell, { className: "text-sm", children: [snapshot.likelihood_residual || snapshot.likelihood_inherent, " \u00D7", ' ', snapshot.impact_residual || snapshot.impact_inherent, " =", ' ', _jsx("span", { className: "font-semibold", children: residualScore })] }), _jsx(TableCell, { children: _jsx(Badge, { className: level.color, children: level.label }) })] }, snapshot.id));
                                            }) })] }) }))] })] }))] }));
}
