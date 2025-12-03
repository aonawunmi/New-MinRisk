import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * RiskIntelligenceManagement Component
 *
 * AI-powered risk intelligence: external events tracking and alerts
 */
import { useState, useEffect } from 'react';
import { getExternalEvents, createExternalEventWithAutoScan, deleteExternalEvent, cleanupDuplicateEvents, getPendingIntelligenceAlerts, getAcceptedIntelligenceAlerts, acceptIntelligenceAlert, applyIntelligenceAlert, rejectIntelligenceAlert, undoAppliedAlert, } from '@/lib/riskIntelligence';
import { supabase } from '@/lib/supabase';
import { isUserAdmin } from '@/lib/profiles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Loader2, CheckCircle2, TrendingUp, TrendingDown, Trash2, Trash, Undo2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
export default function RiskIntelligenceManagement() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold", children: "Risk Intelligence" }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: "AI-powered external event tracking and risk correlation" })] }), _jsxs(Tabs, { defaultValue: "events", className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "events", children: "\uD83C\uDF10 External Events" }), _jsx(TabsTrigger, { value: "alerts", children: "\uD83D\uDD14 Intelligence Alerts" })] }), _jsx(TabsContent, { value: "events", className: "mt-6", children: _jsx(EventsFeed, {}) }), _jsx(TabsContent, { value: "alerts", className: "mt-6", children: _jsx(IntelligenceAlerts, {}) })] })] }));
}
function EventsFeed() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        source: '',
        event_type: '',
        url: '',
        published_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    });
    const [cleaningUp, setCleaningUp] = useState(false);
    const [cleanupMessage, setCleanupMessage] = useState('');
    const [deletingEvent, setDeletingEvent] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState(null);
    useEffect(() => {
        loadEvents();
        checkAdminStatus();
    }, []);
    async function checkAdminStatus() {
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
    }
    async function loadEvents() {
        setLoading(true);
        try {
            const result = await getExternalEvents();
            if (result.error)
                throw new Error(result.error.message);
            setEvents(result.data || []);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setScanning(true);
        setScanMessage(null);
        try {
            // Create event and auto-scan for threats
            const result = await createExternalEventWithAutoScan({
                title: formData.title,
                summary: formData.summary || undefined,
                source: formData.source,
                event_type: formData.event_type,
                url: formData.url || undefined,
                published_date: formData.published_date,
            });
            if (result.error)
                throw new Error(result.error.message);
            // Show scan results
            if (result.scanResults?.scanned) {
                if (result.scanResults.alertsCreated > 0) {
                    setScanMessage({
                        type: 'success',
                        text: `✅ Event added and scanned! Created ${result.scanResults.alertsCreated} alert(s). Check the Intelligence Alerts tab.`
                    });
                }
                else {
                    setScanMessage({
                        type: 'info',
                        text: `ℹ️ Event added and scanned. No relevant risks matched (confidence threshold not met).`
                    });
                }
            }
            else {
                setScanMessage({
                    type: 'info',
                    text: `Event added but auto-scan failed. Use "Scan for Threats" to analyze manually.`
                });
            }
            await loadEvents();
            setShowForm(false);
            setFormData({
                title: '',
                summary: '',
                source: '',
                event_type: '',
                url: '',
                published_date: new Date().toISOString().split('T')[0],
            });
            // Clear message after 10 seconds
            setTimeout(() => setScanMessage(null), 10000);
        }
        catch (err) {
            setScanMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to create event'
            });
        }
        finally {
            setScanning(false);
        }
    }
    async function handleCleanupDuplicates() {
        if (!confirm('This will remove duplicate events (same source, same title, within same week). Continue?')) {
            return;
        }
        setCleaningUp(true);
        setCleanupMessage('🧹 Cleaning up duplicate events...');
        try {
            const result = await cleanupDuplicateEvents();
            if (result.error)
                throw new Error(result.error.message);
            setCleanupMessage(`✅ Cleanup complete! Removed ${result.deletedCount} duplicate event(s).`);
            await loadEvents();
        }
        catch (err) {
            setCleanupMessage(`❌ Cleanup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        finally {
            setCleaningUp(false);
            setTimeout(() => setCleanupMessage(''), 5000);
        }
    }
    async function handleDeleteEvent(eventId) {
        if (!confirm('Delete this external event? All associated intelligence alerts will also be removed.')) {
            return;
        }
        setDeletingEvent(eventId);
        try {
            const result = await deleteExternalEvent(eventId);
            if (result.error)
                throw new Error(result.error.message);
            await loadEvents();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete event');
        }
        finally {
            setDeletingEvent(null);
        }
    }
    if (loading)
        return _jsx("div", { className: "text-center py-12", children: "Loading..." });
    return (_jsxs("div", { className: "space-y-4", children: [isAdmin && (_jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "outline", onClick: handleCleanupDuplicates, disabled: cleaningUp, children: cleaningUp ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Cleaning..."] })) : (_jsxs(_Fragment, { children: [_jsx(Trash, { className: "h-4 w-4 mr-2" }), "Cleanup Duplicates"] })) }), _jsx(Button, { onClick: () => setShowForm(true), children: "+ Add External Event" })] })), cleanupMessage && (_jsx(Alert, { children: _jsx(AlertDescription, { children: cleanupMessage }) })), scanMessage && (_jsx(Alert, { className: scanMessage.type === 'success' ? 'border-green-200 bg-green-50' :
                    scanMessage.type === 'error' ? 'border-red-200 bg-red-50' :
                        'border-blue-200 bg-blue-50', children: _jsx(AlertDescription, { className: scanMessage.type === 'success' ? 'text-green-800' :
                        scanMessage.type === 'error' ? 'text-red-800' :
                            'text-blue-800', children: scanMessage.text }) })), events.length === 0 ? (_jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-gray-600", children: "No external events tracked yet" }), isAdmin && (_jsx(Button, { className: "mt-4", onClick: () => setShowForm(true), children: "Add First Event" })), !isAdmin && _jsx("p", { className: "text-gray-500 text-sm mt-2", children: "Contact your administrator to add events" })] }) }) })) : (_jsx("div", { className: "space-y-3", children: events.map((event) => (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx(CardTitle, { className: "text-lg", children: event.title }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: event.summary })] }), _jsxs("div", { className: "flex items-start gap-2", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Badge, { variant: "outline", children: event.source }), _jsx(Badge, { variant: "secondary", children: event.event_type })] }), isAdmin && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleDeleteEvent(event.id), disabled: deletingEvent === event.id, className: "text-red-600 hover:text-red-700 hover:bg-red-50", children: deletingEvent === event.id ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(Trash2, { className: "h-4 w-4" })) }))] })] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-2", children: [event.url && (_jsx("a", { href: event.url, target: "_blank", rel: "noopener noreferrer", className: "text-sm text-blue-600 hover:underline", children: "View Source \u2192" })), _jsxs("p", { className: "text-xs text-gray-500", children: ["Published: ", new Date(event.published_date).toLocaleDateString()] })] }) })] }, event.id))) })), _jsx(Dialog, { open: showForm, onOpenChange: setShowForm, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Add External Event" }) }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Title *" }), _jsx(Input, { value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), required: true, placeholder: "e.g., Major Bank Reports Data Breach" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Summary" }), _jsx(Textarea, { value: formData.summary, onChange: (e) => setFormData({ ...formData, summary: e.target.value }), rows: 3, placeholder: "Brief description of the event..." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Source *" }), _jsx(Input, { value: formData.source, onChange: (e) => setFormData({ ...formData, source: e.target.value }), required: true, placeholder: "e.g., BusinessDay Nigeria" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Event Type *" }), _jsx(Input, { value: formData.event_type, onChange: (e) => setFormData({ ...formData, event_type: e.target.value }), required: true, placeholder: "e.g., security, regulatory, market" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "URL" }), _jsx(Input, { type: "url", value: formData.url, onChange: (e) => setFormData({ ...formData, url: e.target.value }), placeholder: "https://..." })] }), _jsxs("div", { children: [_jsx(Label, { children: "Published Date *" }), _jsx(Input, { type: "date", value: formData.published_date, onChange: (e) => setFormData({ ...formData, published_date: e.target.value }), required: true })] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setShowForm(false), children: "Cancel" }), _jsx(Button, { type: "submit", disabled: scanning, children: scanning ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Scanning for threats..."] })) : ('Save & Scan Event') })] })] })] }) })] }));
}
function IntelligenceAlerts() {
    const [pendingAlerts, setPendingAlerts] = useState([]);
    const [acceptedAlerts, setAcceptedAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    const [applyingAlert, setApplyingAlert] = useState(null);
    const [undoingAlert, setUndoingAlert] = useState(null);
    const [treatmentNotes, setTreatmentNotes] = useState({});
    const [selectedAlerts, setSelectedAlerts] = useState(new Set());
    const [batchApplying, setBatchApplying] = useState(false);
    useEffect(() => {
        loadAlerts();
    }, []);
    async function loadAlerts() {
        setLoading(true);
        try {
            const [pendingResult, acceptedResult] = await Promise.all([
                getPendingIntelligenceAlerts(),
                getAcceptedIntelligenceAlerts(),
            ]);
            if (pendingResult.error)
                throw new Error(pendingResult.error.message);
            if (acceptedResult.error)
                throw new Error(acceptedResult.error.message);
            setPendingAlerts(pendingResult.data || []);
            setAcceptedAlerts(acceptedResult.data || []);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }
    async function handleScan() {
        setScanning(true);
        setScanMessage('🔍 Analyzing external events against risk register using AI...');
        try {
            // Get auth session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setScanMessage('❌ Not authenticated. Please log in.');
                setScanning(false);
                return;
            }
            // Call Supabase Edge Function
            const { data: result, error } = await supabase.functions.invoke('analyze-intelligence', {
                body: {
                    minConfidence: 70,
                },
            });
            if (error) {
                throw error;
            }
            if (result.success) {
                if (result.errors.length > 0) {
                    setScanMessage(`⚠️ Analysis completed with ${result.errors.length} error(s). ` +
                        `Scanned ${result.scanned} events, created ${result.alertsCreated} alerts.`);
                }
                else {
                    setScanMessage(`✅ Analysis complete! Scanned ${result.scanned} events. ` +
                        `Created ${result.alertsCreated} new alerts.`);
                }
                // Reload alerts
                await loadAlerts();
            }
            else {
                setScanMessage(`❌ Analysis failed: ${result.error || 'Unknown error'}`);
            }
        }
        catch (err) {
            console.error('Error running intelligence analyzer:', err);
            setScanMessage(`❌ Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        finally {
            setScanning(false);
            setTimeout(() => setScanMessage(''), 5000);
        }
    }
    async function handleAccept(id) {
        console.log('🟢 Accept button clicked, alert ID:', id);
        try {
            console.log('Calling acceptIntelligenceAlert...');
            const result = await acceptIntelligenceAlert(id);
            console.log('Accept result:', result);
            if (result.error)
                throw new Error(result.error.message);
            console.log('Reloading alerts...');
            await loadAlerts();
            console.log('✅ Alert accepted successfully');
        }
        catch (err) {
            console.error('❌ Accept error:', err);
            alert(err instanceof Error ? err.message : 'Failed to accept alert');
        }
    }
    async function handleReject(id) {
        console.log('🔴 Reject button clicked, alert ID:', id);
        try {
            console.log('Calling rejectIntelligenceAlert...');
            const result = await rejectIntelligenceAlert(id);
            console.log('Reject result:', result);
            if (result.error)
                throw new Error(result.error.message);
            console.log('Reloading alerts...');
            await loadAlerts();
            console.log('✅ Alert rejected successfully');
        }
        catch (err) {
            console.error('❌ Reject error:', err);
            alert(err instanceof Error ? err.message : 'Failed to reject alert');
        }
    }
    async function handleApplyAlert(alertId) {
        setApplyingAlert(alertId);
        try {
            const notes = treatmentNotes[alertId] || '';
            const result = await applyIntelligenceAlert(alertId, notes);
            if (result.error)
                throw new Error(result.error.message);
            await loadAlerts();
            // Clear notes after successful application
            const newNotes = { ...treatmentNotes };
            delete newNotes[alertId];
            setTreatmentNotes(newNotes);
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to apply alert');
        }
        finally {
            setApplyingAlert(null);
        }
    }
    async function handleUndoAlert(alertId) {
        if (!confirm('Undo this alert application? Risk scores will be recalculated using remaining alerts.')) {
            return;
        }
        setUndoingAlert(alertId);
        try {
            const result = await undoAppliedAlert(alertId, 'Undone by user from intelligence alerts');
            if (result.error)
                throw new Error(result.error.message);
            await loadAlerts();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to undo alert');
        }
        finally {
            setUndoingAlert(null);
        }
    }
    function handleToggleSelect(alertId) {
        const newSelected = new Set(selectedAlerts);
        if (newSelected.has(alertId)) {
            newSelected.delete(alertId);
        }
        else {
            newSelected.add(alertId);
        }
        setSelectedAlerts(newSelected);
    }
    function handleSelectAll() {
        const unappliedAlerts = acceptedAlerts.filter(a => !a.applied_to_risk);
        const newSelected = new Set(unappliedAlerts.map(a => a.id));
        setSelectedAlerts(newSelected);
    }
    function handleDeselectAll() {
        setSelectedAlerts(new Set());
    }
    async function handleBatchApply() {
        if (selectedAlerts.size === 0) {
            alert('Please select at least one alert to apply');
            return;
        }
        if (!confirm(`Apply ${selectedAlerts.size} selected alert(s) to risk register?`)) {
            return;
        }
        setBatchApplying(true);
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        for (const alertId of Array.from(selectedAlerts)) {
            try {
                const notes = treatmentNotes[alertId] || '';
                const result = await applyIntelligenceAlert(alertId, notes);
                if (result.error) {
                    errorCount++;
                    errors.push(`Alert ${alertId}: ${result.error.message}`);
                }
                else {
                    successCount++;
                }
            }
            catch (err) {
                errorCount++;
                errors.push(`Alert ${alertId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
        setBatchApplying(false);
        setSelectedAlerts(new Set());
        await loadAlerts();
        // Show summary
        if (errorCount === 0) {
            alert(`✅ Successfully applied ${successCount} alert(s) to risk register`);
        }
        else {
            alert(`⚠️ Batch apply completed:\n` +
                `✅ Success: ${successCount}\n` +
                `❌ Errors: ${errorCount}\n\n` +
                `Errors:\n${errors.join('\n')}`);
        }
    }
    if (loading)
        return _jsx("div", { className: "text-center py-12", children: "Loading..." });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { children: _jsx("p", { className: "text-sm text-gray-600", children: "Scan external events against your risk register using AI" }) }), _jsx(Button, { onClick: handleScan, disabled: scanning, children: scanning ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Scanning..."] })) : (_jsxs(_Fragment, { children: [_jsx(Brain, { className: "h-4 w-4 mr-2" }), "Scan for Threats"] })) })] }), scanMessage && (_jsx(Alert, { children: _jsx(AlertDescription, { children: scanMessage }) })), _jsxs(Tabs, { defaultValue: "pending", className: "w-full", children: [_jsxs(TabsList, { children: [_jsxs(TabsTrigger, { value: "pending", children: ["Pending (", pendingAlerts.length, ")"] }), _jsxs(TabsTrigger, { value: "accepted", children: ["Accepted (", acceptedAlerts.length, ")"] })] }), _jsx(TabsContent, { value: "pending", className: "mt-6", children: _jsx(PendingAlertsTable, { alerts: pendingAlerts, onAccept: handleAccept, onReject: handleReject }) }), _jsx(TabsContent, { value: "accepted", className: "mt-6", children: _jsx(AcceptedAlertsTable, { alerts: acceptedAlerts, applyingAlert: applyingAlert, undoingAlert: undoingAlert, treatmentNotes: treatmentNotes, selectedAlerts: selectedAlerts, batchApplying: batchApplying, onNotesChange: setTreatmentNotes, onApply: handleApplyAlert, onUndo: handleUndoAlert, onToggleSelect: handleToggleSelect, onSelectAll: handleSelectAll, onDeselectAll: handleDeselectAll, onBatchApply: handleBatchApply }) })] })] }));
}
function PendingAlertsTable({ alerts, onAccept, onReject, }) {
    if (alerts.length === 0) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-gray-600", children: "No pending intelligence alerts" }), _jsx("p", { className: "text-sm text-gray-500 mt-2", children: "Click \"Scan for Threats\" to analyze external events" })] }) }) }));
    }
    return (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Event" }), _jsx(TableHead, { children: "Related Risk" }), _jsx(TableHead, { children: "Change" }), _jsx(TableHead, { children: "Confidence" }), _jsx(TableHead, { children: "AI Reasoning" }), _jsx(TableHead, { children: "Actions" })] }) }), _jsx(TableBody, { children: alerts.map((alert) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium max-w-xs", children: alert.external_events?.title || 'Unknown Event' }), _jsx(TableCell, { children: _jsxs("div", { children: [_jsx("p", { className: "font-mono text-sm", children: alert.risk_code }), _jsx("p", { className: "text-xs text-gray-600", children: alert.risks?.risk_title })] }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex flex-col gap-1", children: [alert.likelihood_change !== 0 && (_jsxs(Badge, { variant: alert.likelihood_change > 0 ? 'destructive' : 'default', children: [alert.likelihood_change > 0 ? _jsx(TrendingUp, { className: "h-3 w-3 mr-1" }) : _jsx(TrendingDown, { className: "h-3 w-3 mr-1" }), "L: ", alert.likelihood_change > 0 ? '+' : '', alert.likelihood_change] })), alert.impact_change !== 0 && (_jsxs(Badge, { variant: alert.impact_change > 0 ? 'destructive' : 'default', children: [alert.impact_change > 0 ? _jsx(TrendingUp, { className: "h-3 w-3 mr-1" }) : _jsx(TrendingDown, { className: "h-3 w-3 mr-1" }), "I: ", alert.impact_change > 0 ? '+' : '', alert.impact_change] }))] }) }), _jsx(TableCell, { children: _jsxs(Badge, { variant: "outline", children: [alert.confidence_score, "%"] }) }), _jsx(TableCell, { className: "max-w-md", children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500", children: "Reasoning:" }), _jsx("p", { className: "text-sm text-gray-700 whitespace-normal break-words", children: alert.ai_reasoning || 'No reasoning provided' })] }), alert.suggested_controls && alert.suggested_controls.length > 0 && (_jsxs("div", { className: "bg-blue-50 border-l-2 border-blue-300 pl-2 py-1", children: [_jsx("p", { className: "text-xs font-medium text-blue-900", children: "\uD83D\uDCA1 Suggested Controls:" }), _jsxs("ul", { className: "list-disc list-inside text-xs text-blue-800 mt-1", children: [alert.suggested_controls.slice(0, 2).map((control, idx) => (_jsx("li", { children: control }, idx))), alert.suggested_controls.length > 2 && (_jsxs("li", { className: "text-blue-600", children: ["+", alert.suggested_controls.length - 2, " more..."] }))] })] })), alert.impact_assessment && (_jsxs("div", { className: "bg-amber-50 border-l-2 border-amber-300 pl-2 py-1", children: [_jsx("p", { className: "text-xs font-medium text-amber-900", children: "\u26A0\uFE0F Impact:" }), _jsx("p", { className: "text-xs text-amber-800 mt-1 line-clamp-2", children: alert.impact_assessment })] }))] }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", onClick: () => onAccept(alert.id), children: "Accept" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => onReject(alert.id), children: "Reject" })] }) })] }, alert.id))) })] }));
}
function AcceptedAlertsTable({ alerts, applyingAlert, undoingAlert, treatmentNotes, selectedAlerts, batchApplying, onNotesChange, onApply, onUndo, onToggleSelect, onSelectAll, onDeselectAll, onBatchApply, }) {
    const unappliedAlerts = alerts.filter(a => !a.applied_to_risk);
    if (alerts.length === 0) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-600", children: "No accepted alerts" }) }) }) }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [unappliedAlerts.length > 0 && (_jsxs("div", { className: "flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: selectedAlerts.size > 0 ? `${selectedAlerts.size} selected` : 'Select alerts to apply in batch' }), selectedAlerts.size > 0 && (_jsx(Button, { size: "sm", variant: "outline", onClick: onDeselectAll, children: "Deselect All" })), selectedAlerts.size === 0 && unappliedAlerts.length > 0 && (_jsxs(Button, { size: "sm", variant: "outline", onClick: onSelectAll, children: ["Select All Unapplied (", unappliedAlerts.length, ")"] }))] }), _jsx(Button, { onClick: onBatchApply, disabled: selectedAlerts.size === 0 || batchApplying, size: "sm", children: batchApplying ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Applying ", selectedAlerts.size, " alert(s)..."] })) : (`Apply Selected (${selectedAlerts.size})`) })] })), alerts.map((alert) => (_jsxs(Card, { className: alert.applied_to_risk ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50', children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-start gap-3 flex-1", children: [!alert.applied_to_risk && (_jsx(Checkbox, { checked: selectedAlerts.has(alert.id), onCheckedChange: () => onToggleSelect(alert.id), className: "mt-1" })), _jsxs("div", { className: "flex-1", children: [_jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [alert.applied_to_risk && _jsx(CheckCircle2, { className: "h-5 w-5 text-green-600" }), alert.risk_code, " - ", alert.risks?.risk_title] }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["Event: ", alert.external_events?.title] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [alert.likelihood_change !== 0 && (_jsxs(Badge, { variant: alert.likelihood_change > 0 ? 'destructive' : 'default', children: ["Likelihood: ", alert.likelihood_change > 0 ? '+' : '', alert.likelihood_change] })), alert.impact_change !== 0 && (_jsxs(Badge, { variant: alert.impact_change > 0 ? 'destructive' : 'default', children: ["Impact: ", alert.impact_change > 0 ? '+' : '', alert.impact_change] }))] })] }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: "AI Reasoning:" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: alert.ai_reasoning || 'No reasoning provided' })] }), alert.suggested_controls && alert.suggested_controls.length > 0 && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-md p-3", children: [_jsx("p", { className: "text-sm font-medium text-blue-900 mb-2", children: "\uD83D\uDCA1 Suggested Controls:" }), _jsx("ul", { className: "list-disc list-inside space-y-1", children: alert.suggested_controls.map((control, idx) => (_jsx("li", { className: "text-sm text-blue-800", children: control }, idx))) })] })), alert.impact_assessment && (_jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-md p-3", children: [_jsx("p", { className: "text-sm font-medium text-amber-900 mb-2", children: "\u26A0\uFE0F Impact Assessment:" }), _jsx("p", { className: "text-sm text-amber-800", children: alert.impact_assessment })] })), !alert.applied_to_risk && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: `notes-${alert.id}`, children: "Treatment Notes (Optional)" }), _jsx(Textarea, { id: `notes-${alert.id}`, value: treatmentNotes[alert.id] || '', onChange: (e) => onNotesChange({ ...treatmentNotes, [alert.id]: e.target.value }), placeholder: "Document your decision and any actions taken...", rows: 2 })] }), _jsx(Button, { onClick: () => onApply(alert.id), disabled: applyingAlert === alert.id, size: "sm", children: applyingAlert === alert.id ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Applying..."] })) : ('Apply to Risk Register') })] })), alert.applied_to_risk && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-green-700", children: [_jsx(CheckCircle2, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "Applied to risk register" })] }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => onUndo(alert.id), disabled: undoingAlert === alert.id, className: "text-orange-600 hover:text-orange-700 hover:bg-orange-50", children: undoingAlert === alert.id ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-3 w-3 mr-1 animate-spin" }), "Undoing..."] })) : (_jsxs(_Fragment, { children: [_jsx(Undo2, { className: "h-3 w-3 mr-1" }), "Undo"] })) })] }))] })] }, alert.id)))] }));
}
