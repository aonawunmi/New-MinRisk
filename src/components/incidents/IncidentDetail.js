import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Incident Detail Component
 * Shows complete incident information with comments
 */
import { useEffect, useState } from 'react';
import { getIncidentById, voidIncident } from '../../lib/incidents';
import { getStatusBadgeClass } from '../../types/incident';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
export function IncidentDetail({ incidentId, onBack, onEdit }) {
    const [incident, setIncident] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    // Void incident state
    const [showVoidDialog, setShowVoidDialog] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [isVoiding, setIsVoiding] = useState(false);
    // Load incident details
    const loadIncident = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await getIncidentById(incidentId);
            if (fetchError)
                throw fetchError;
            setIncident(data);
        }
        catch (err) {
            console.error('Error loading incident:', err);
            setError(err instanceof Error ? err.message : 'Failed to load incident');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        loadIncident();
    }, [incidentId]);
    const handleVoidIncident = async () => {
        if (!voidReason.trim()) {
            setError('Please provide a reason for voiding this incident');
            return;
        }
        setIsVoiding(true);
        setError(null);
        try {
            const { error: voidError } = await voidIncident(incidentId, voidReason);
            if (voidError)
                throw voidError;
            // Success - show message and go back
            setSuccessMessage('Incident voided successfully. Returning to list...');
            setTimeout(() => {
                if (onBack)
                    onBack(); // Return to incident list
            }, 2000);
        }
        catch (err) {
            console.error('Error voiding incident:', err);
            setError(err instanceof Error ? err.message : 'Failed to void incident');
        }
        finally {
            setIsVoiding(false);
        }
    };
    const formatDateTime = (dateStr) => {
        if (!dateStr)
            return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const formatDate = (dateStr) => {
        if (!dateStr)
            return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };
    // Loading state
    if (isLoading) {
        return (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-muted-foreground", children: "Loading incident details..." }) }));
    }
    // Error state
    if (error || !incident) {
        return (_jsxs("div", { className: "space-y-4", children: [_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error || 'Incident not found' }) }), onBack && (_jsx(Button, { variant: "outline", onClick: onBack, children: "Back to List" }))] }));
    }
    const canEdit = incident.status === 'Reported';
    // Convert severity integer to text
    const getSeverityText = (sev) => {
        switch (sev) {
            case 1: return 'LOW';
            case 2: return 'MEDIUM';
            case 3: return 'HIGH';
            case 4: return 'CRITICAL';
            default: return 'UNKNOWN';
        }
    };
    const getSeverityColor = (sev) => {
        switch (sev) {
            case 1: return 'text-blue-600';
            case 2: return 'text-yellow-600';
            case 3: return 'text-orange-600';
            case 4: return 'text-red-600';
            default: return 'text-gray-600';
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [onBack && (_jsx(Button, { variant: "ghost", size: "sm", onClick: onBack, children: "\u2190 Back" })), _jsx("h2", { className: "text-2xl font-bold tracking-tight", children: incident.incident_code }), _jsx(Badge, { className: getStatusBadgeClass(incident.status), children: incident.status })] }), _jsx("h3", { className: "text-xl font-medium", children: incident.title })] }), _jsxs("div", { className: "flex gap-2", children: [canEdit && onEdit && (_jsx(Button, { onClick: () => onEdit(incident.id), children: "Edit Incident" })), _jsx(Button, { variant: "destructive", size: "sm", onClick: () => setShowVoidDialog(true), children: "Void Incident" })] })] }), successMessage && (_jsx(Alert, { className: "border-green-200 bg-green-50", children: _jsx(AlertDescription, { className: "text-green-800", children: successMessage }) })), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), showVoidDialog && (_jsxs(Card, { className: "border-destructive", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-destructive", children: "Void This Incident?" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsx(Alert, { variant: "destructive", children: _jsxs(AlertDescription, { children: [_jsx("strong", { children: "Warning:" }), " Voiding this incident will remove it from normal views. This action is logged and auditable, but the incident will no longer appear in working lists. This is a soft delete - the data is preserved for compliance."] }) }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "voidReason", children: "Reason for Voiding (Required)" }), _jsx("textarea", { id: "voidReason", value: voidReason, onChange: (e) => setVoidReason(e.target.value), placeholder: "e.g., duplicate entry, poorly captured, test data, invalid incident...", className: "w-full mt-2 p-2 border rounded-md bg-background min-h-[100px]", disabled: isVoiding }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Explain why this incident is being voided. This will be logged in the audit trail." })] }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx(Button, { variant: "outline", onClick: () => {
                                                setShowVoidDialog(false);
                                                setVoidReason('');
                                                setError(null);
                                            }, disabled: isVoiding, children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handleVoidIncident, disabled: isVoiding || !voidReason.trim(), children: isVoiding ? 'Voiding...' : 'Void Incident' })] })] }) })] })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Incident Details" }) }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Incident Type" }), _jsx("p", { className: "font-medium mt-1", children: incident.incident_type || 'Not specified' })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Severity" }), _jsx("p", { className: `font-bold mt-1 ${getSeverityColor(incident.severity)}`, children: getSeverityText(incident.severity) })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Incident Date" }), _jsx("p", { className: "font-medium mt-1", children: formatDate(incident.incident_date) })] }), incident.financial_impact && (_jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Financial Impact" }), _jsxs("p", { className: "font-medium mt-1", children: ["\u20A6", Number(incident.financial_impact).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })] })] })), _jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Description" }), _jsx("div", { className: "mt-2 p-4 bg-muted/50 rounded-md", children: _jsx("p", { className: "whitespace-pre-wrap", children: incident.description }) })] }), incident.linked_risk_ids && incident.linked_risk_ids.length > 0 && (_jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Linked Risks" }), _jsx("div", { className: "mt-2 space-y-2", children: incident.linked_risk_ids.map((riskId, index) => (_jsxs("div", { className: "p-3 bg-blue-50 border border-blue-200 rounded-md", children: [_jsxs("p", { className: "font-mono font-medium text-blue-900", children: ["Risk ID: ", riskId] }), incident.linked_risk_titles?.[index] && (_jsx("p", { className: "text-sm text-blue-700 mt-1", children: incident.linked_risk_titles[index] }))] }, riskId))) })] })), _jsx("div", { className: "pt-4 border-t", children: _jsxs("div", { className: "text-sm text-muted-foreground", children: ["Created: ", formatDateTime(incident.created_at)] }) })] })] })] }));
}
