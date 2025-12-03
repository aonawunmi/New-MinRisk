import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Period Management Component - UPDATED for Continuous Risk Architecture
 *
 * Admin interface for committing end-of-period snapshots using the new
 * continuous risk evolution architecture (structured periods, risk_history table).
 */
import { useState, useEffect } from 'react';
import { commitPeriod, getActivePeriod, getCommittedPeriods, formatPeriod, } from '@/lib/periods-v2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Calendar, CheckCircle2, AlertTriangle, TrendingUp, Archive } from 'lucide-react';
export default function PeriodManagement({ orgId, userId }) {
    const [activePeriod, setActivePeriod] = useState(null);
    const [committedPeriods, setCommittedPeriods] = useState([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    useEffect(() => {
        loadPeriodData();
    }, [orgId]);
    async function loadPeriodData() {
        setLoading(true);
        try {
            // Get active period
            const { data: activeData, error: activeError } = await getActivePeriod(orgId);
            if (activeError) {
                setError('Failed to load active period');
                console.error(activeError);
            }
            else if (activeData) {
                setActivePeriod({
                    year: activeData.current_period_year,
                    quarter: activeData.current_period_quarter,
                });
            }
            // Get committed periods
            const { data: commitsData, error: commitsError } = await getCommittedPeriods(orgId);
            if (commitsError) {
                setError('Failed to load committed periods');
                console.error(commitsError);
            }
            else {
                setCommittedPeriods(commitsData || []);
            }
        }
        catch (err) {
            setError('Unexpected error loading period data');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }
    async function handleCommitPeriod() {
        if (!activePeriod) {
            setError('No active period found');
            return;
        }
        setCommitting(true);
        setError(null);
        setSuccess(null);
        try {
            const { data, error: commitError } = await commitPeriod(orgId, activePeriod, userId, notes || undefined);
            if (commitError) {
                setError(commitError.message);
            }
            else if (data) {
                setSuccess(`Period ${formatPeriod(activePeriod)} committed successfully! ` +
                    `${data.risks_count} risks snapshotted ` +
                    `(${data.active_risks_count || 0} active, ${data.closed_risks_count || 0} closed).`);
                setNotes('');
                await loadPeriodData();
                setShowConfirmDialog(false);
            }
        }
        catch (err) {
            setError('Unexpected error committing period');
            console.error(err);
        }
        finally {
            setCommitting(false);
        }
    }
    // Check if current period already committed
    const currentPeriodCommitted = activePeriod
        ? committedPeriods.some((c) => c.period_year === activePeriod.year && c.period_quarter === activePeriod.quarter)
        : false;
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Card, { children: _jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-5 w-5" }), "Period Management"] }), _jsx(CardDescription, { children: "Commit end-of-period snapshots to track risk evolution over time using the continuous risk architecture" })] }) }), activePeriod && (_jsx(Card, { className: "border-2 border-blue-200 bg-blue-50", children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-blue-600 font-medium mb-1", children: "Current Active Period" }), _jsx("div", { className: "text-2xl font-bold text-blue-900", children: formatPeriod(activePeriod) }), currentPeriodCommitted && (_jsxs(Badge, { variant: "outline", className: "mt-2 border-green-600 text-green-700", children: [_jsx(CheckCircle2, { className: "h-3 w-3 mr-1" }), "Already Committed"] }))] }), _jsx(TrendingUp, { className: "h-12 w-12 text-blue-600 opacity-50" })] }) }) })), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg", children: "Commit Period Snapshot" }), _jsx(CardDescription, { children: "Take a snapshot of all current risks (active and closed) for historical tracking. The continuous risk model ensures risks are preserved and never deleted." })] }), _jsxs(CardContent, { className: "space-y-4", children: [success && (_jsxs(Alert, { className: "border-green-500 bg-green-50", children: [_jsx(CheckCircle2, { className: "h-4 w-4 text-green-600" }), _jsx(AlertDescription, { className: "text-green-800", children: success })] })), error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium", children: "Notes (Optional)" }), _jsx(Textarea, { placeholder: `Add notes for ${activePeriod ? formatPeriod(activePeriod) : 'this period'} (e.g., 'Q4 2025 - Annual risk review completed')`, value: notes, onChange: (e) => setNotes(e.target.value), rows: 3 })] }), _jsx(Button, { onClick: () => setShowConfirmDialog(true), disabled: committing || currentPeriodCommitted || !activePeriod, className: "w-full", size: "lg", children: committing
                                    ? 'Committing Period...'
                                    : currentPeriodCommitted
                                        ? `${activePeriod ? formatPeriod(activePeriod) : 'Period'} Already Committed`
                                        : `Commit ${activePeriod ? formatPeriod(activePeriod) : 'Current Period'}` }), currentPeriodCommitted && (_jsx("p", { className: "text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3", children: "\u26A0\uFE0F This period has already been committed. Risks continue to be editable in the continuous model." })), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded p-3 space-y-2", children: [_jsx("div", { className: "font-medium text-blue-900 text-sm", children: "What happens when you commit?" }), _jsxs("ul", { className: "text-sm text-blue-800 space-y-1 ml-4 list-disc", children: [_jsx("li", { children: "All current risks are snapshotted to risk_history table" }), _jsx("li", { children: "Residual risk scores are calculated based on active controls" }), _jsx("li", { children: "The active period advances to the next quarter automatically" }), _jsxs("li", { children: [_jsx("strong", { children: "Risks are NOT deleted" }), " - they remain editable (continuous model)"] }), _jsx("li", { children: "Historical snapshots become immutable for reporting" })] })] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [_jsx(Archive, { className: "h-5 w-5" }), "Committed Periods (", committedPeriods.length, ")"] }), _jsx(CardDescription, { children: "Historical period snapshots for reporting and comparison" })] }), _jsx(CardContent, { children: loading ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "Loading period history..." })) : committedPeriods.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No periods committed yet. Commit your first period to start tracking risk evolution." })) : (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Period" }), _jsx(TableHead, { children: "Committed" }), _jsx(TableHead, { children: "Total Risks" }), _jsx(TableHead, { children: "Active / Closed" }), _jsx(TableHead, { children: "Controls" }), _jsx(TableHead, { className: "max-w-xs", children: "Notes" })] }) }), _jsx(TableBody, { children: committedPeriods
                                        .sort((a, b) => {
                                        // Sort descending (newest first)
                                        if (a.period_year !== b.period_year)
                                            return b.period_year - a.period_year;
                                        return b.period_quarter - a.period_quarter;
                                    })
                                        .map((commit) => {
                                        const period = {
                                            year: commit.period_year,
                                            quarter: commit.period_quarter,
                                        };
                                        return (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: _jsx(Badge, { variant: "outline", className: "text-sm", children: formatPeriod(period) }) }), _jsx(TableCell, { className: "text-sm text-gray-600", children: new Date(commit.committed_at).toLocaleDateString() }), _jsxs(TableCell, { children: [_jsx("span", { className: "font-semibold", children: commit.risks_count }), " risks"] }), _jsxs(TableCell, { className: "text-sm", children: [_jsxs("span", { className: "text-green-600 font-medium", children: [commit.active_risks_count || 0, " active"] }), ' / ', _jsxs("span", { className: "text-gray-500", children: [commit.closed_risks_count || 0, " closed"] })] }), _jsxs(TableCell, { className: "text-sm text-gray-600", children: [commit.controls_count || 0, " controls"] }), _jsx(TableCell, { className: "max-w-xs truncate text-sm text-gray-600", children: commit.notes || _jsx("span", { className: "text-gray-400", children: "\u2014" }) })] }, commit.id));
                                    }) })] })) })] }), _jsx(AlertDialog, { open: showConfirmDialog, onOpenChange: setShowConfirmDialog, children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Commit Period Snapshot?" }), _jsxs(AlertDialogDescription, { children: ["This will create a snapshot of all current risks for period", ' ', _jsx("strong", { children: activePeriod ? formatPeriod(activePeriod) : 'unknown' }), ".", _jsx("br", {}), _jsx("br", {}), "The snapshot will be stored in the risk_history table and the active period will automatically advance to the next quarter.", _jsx("br", {}), _jsx("br", {}), _jsx("strong", { children: "Important:" }), " Risks will remain editable (continuous model), but this snapshot will be immutable for historical reporting.", _jsx("br", {}), _jsx("br", {}), "Are you sure you want to proceed?"] })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleCommitPeriod, disabled: committing, children: committing ? 'Committing...' : 'Yes, Commit Period' })] })] }) })] }));
}
