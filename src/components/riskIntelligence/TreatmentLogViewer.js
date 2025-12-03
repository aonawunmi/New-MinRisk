import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Treatment Log Viewer Component
 *
 * Shows history of intelligence-driven risk updates for a specific risk
 * Allows users to undo or soft-delete treatment log entries
 */
import { useState, useEffect } from 'react';
import { getTreatmentLogForRisk, undoAppliedAlert, softDeleteTreatmentLogEntry, } from '@/lib/riskIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, TrendingUp, TrendingDown, Undo2, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
export default function TreatmentLogViewer({ riskCode, onLogChange }) {
    const [log, setLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [undoingAlertId, setUndoingAlertId] = useState(null);
    const [deletingLogId, setDeletingLogId] = useState(null);
    const [message, setMessage] = useState(null);
    useEffect(() => {
        loadTreatmentLog();
    }, [riskCode]);
    async function loadTreatmentLog() {
        setLoading(true);
        try {
            const { data, error } = await getTreatmentLogForRisk(riskCode);
            if (error) {
                console.error('Error loading treatment log:', error);
                setMessage({ type: 'error', text: 'Failed to load treatment log' });
                setLog([]);
            }
            else {
                // Filter out soft-deleted entries
                const activeLog = (data || []).filter(entry => !entry.deleted_at);
                setLog(activeLog);
            }
        }
        catch (err) {
            console.error('Unexpected error:', err);
            setLog([]);
        }
        finally {
            setLoading(false);
        }
    }
    async function handleUndo(alertId) {
        if (!confirm('Undo this intelligence alert application? This will recalculate the risk scores using remaining alerts.')) {
            return;
        }
        setUndoingAlertId(alertId);
        try {
            const { error } = await undoAppliedAlert(alertId, 'Undone by user from treatment log');
            if (error) {
                setMessage({ type: 'error', text: `Failed to undo: ${error.message}` });
            }
            else {
                setMessage({ type: 'success', text: 'Alert undone successfully' });
                await loadTreatmentLog();
                onLogChange?.();
            }
        }
        catch (err) {
            setMessage({ type: 'error', text: 'Unexpected error undoing alert' });
        }
        finally {
            setUndoingAlertId(null);
            setTimeout(() => setMessage(null), 5000);
        }
    }
    async function handleSoftDelete(logId) {
        if (!confirm('Archive this treatment log entry? It will be hidden but retained for audit purposes.')) {
            return;
        }
        setDeletingLogId(logId);
        try {
            const { error } = await softDeleteTreatmentLogEntry(logId);
            if (error) {
                setMessage({ type: 'error', text: `Failed to archive: ${error.message}` });
            }
            else {
                setMessage({ type: 'success', text: 'Log entry archived successfully' });
                await loadTreatmentLog();
                onLogChange?.();
            }
        }
        catch (err) {
            setMessage({ type: 'error', text: 'Unexpected error archiving log entry' });
        }
        finally {
            setDeletingLogId(null);
            setTimeout(() => setMessage(null), 5000);
        }
    }
    function renderChangeIndicator(previous, current, label) {
        if (previous === null || current === null || previous === current) {
            return null;
        }
        const change = current - previous;
        const isIncrease = change > 0;
        return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-sm text-gray-600", children: [label, ":"] }), _jsxs(Badge, { variant: isIncrease ? 'destructive' : 'default', className: "flex items-center gap-1", children: [isIncrease ? (_jsx(TrendingUp, { className: "h-3 w-3" })) : (_jsx(TrendingDown, { className: "h-3 w-3" })), _jsxs("span", { children: [previous, " \u2192 ", current] }), _jsxs("span", { className: "ml-1 text-xs", children: ["(", change > 0 ? '+' : '', change, ")"] })] })] }));
    }
    if (loading) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin text-gray-400" }), _jsx("span", { className: "ml-2 text-gray-600", children: "Loading treatment history..." })] }) }) }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [_jsx(Clock, { className: "h-5 w-5 text-blue-600" }), "Intelligence Treatment History"] }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["History of AI-powered risk updates for ", riskCode] })] }), _jsxs(CardContent, { children: [message && (_jsx(Alert, { className: `mb-4 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`, children: _jsx(AlertDescription, { className: message.type === 'success' ? 'text-green-800' : 'text-red-800', children: message.text }) })), log.length === 0 ? (_jsxs("div", { className: "text-center py-8", children: [_jsx(AlertCircle, { className: "h-12 w-12 text-gray-300 mx-auto mb-3" }), _jsx("p", { className: "text-gray-600", children: "No intelligence-driven updates yet" }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "When you apply intelligence alerts, they'll appear here" })] })) : (_jsx("div", { className: "space-y-4", children: log.map((entry, index) => (_jsxs("div", { className: `border-l-4 pl-4 py-3 ${entry.action_taken === 'accept'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-red-500 bg-red-50'}`, children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [entry.action_taken === 'accept' ? (_jsx(CheckCircle2, { className: "h-4 w-4 text-green-600" })) : (_jsx(AlertCircle, { className: "h-4 w-4 text-red-600" })), _jsx("span", { className: "font-medium text-gray-900", children: entry.action_taken === 'accept' ? 'Alert Applied' : 'Alert Rejected' }), _jsxs(Badge, { variant: "outline", className: "text-xs", children: ["Entry #", log.length - index] })] }), _jsxs("div", { className: "text-xs text-gray-600 mt-1 flex items-center gap-2", children: [_jsx(Clock, { className: "h-3 w-3" }), format(new Date(entry.applied_at), 'MMM dd, yyyy HH:mm')] })] }), entry.action_taken === 'accept' && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => handleUndo(entry.alert_id), disabled: undoingAlertId === entry.alert_id, className: "text-orange-600 hover:text-orange-700 hover:bg-orange-50", children: undoingAlertId === entry.alert_id ? (_jsx(Loader2, { className: "h-3 w-3 animate-spin" })) : (_jsxs(_Fragment, { children: [_jsx(Undo2, { className: "h-3 w-3 mr-1" }), "Undo"] })) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleSoftDelete(entry.id), disabled: deletingLogId === entry.id, className: "text-gray-600 hover:text-red-700 hover:bg-red-50", children: deletingLogId === entry.id ? (_jsx(Loader2, { className: "h-3 w-3 animate-spin" })) : (_jsx(Trash2, { className: "h-3 w-3" })) })] }))] }), entry.action_taken === 'accept' && (_jsxs("div", { className: "space-y-2 mt-3", children: [renderChangeIndicator(entry.previous_likelihood, entry.new_likelihood, 'Likelihood'), renderChangeIndicator(entry.previous_impact, entry.new_impact, 'Impact')] })), entry.notes && (_jsxs("div", { className: "mt-3 bg-white rounded border border-gray-200 p-3", children: [_jsx("p", { className: "text-xs font-medium text-gray-700 mb-1", children: "Notes:" }), _jsx("p", { className: "text-sm text-gray-600", children: entry.notes })] }))] }, entry.id))) }))] })] }), log.length > 0 && (_jsxs(Alert, { children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsxs(AlertDescription, { className: "text-xs", children: [_jsx("strong", { children: "Note:" }), " Undoing an alert recalculates risk scores using MAX logic from remaining alerts. Archiving removes the entry from view but retains it for audit purposes."] })] }))] }));
}
