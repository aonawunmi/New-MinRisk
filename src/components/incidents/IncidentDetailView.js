import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Incident Detail View
 * Shows full incident details with all linked risks and mapping history
 */
import { useState, useEffect } from 'react';
import { getIncidentById, getIncidentRiskLinks, getIncidentMappingHistory, deleteIncidentRiskLink, voidIncident } from '../../lib/incidents';
import { AddRiskLinkModal } from './AddRiskLinkModal';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
export function IncidentDetailView({ incidentId, onClose }) {
    const [incident, setIncident] = useState(null);
    const [riskLinks, setRiskLinks] = useState([]);
    const [mappingHistory, setMappingHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deletingLinkId, setDeletingLinkId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    // Void incident state
    const [showVoidDialog, setShowVoidDialog] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [isVoiding, setIsVoiding] = useState(false);
    useEffect(() => {
        loadIncidentDetails();
    }, [incidentId]);
    const loadIncidentDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Load incident details
            const { data: incidentData, error: incidentError } = await getIncidentById(incidentId);
            if (incidentError)
                throw incidentError;
            setIncident(incidentData);
            // Load risk links
            const { data: linksData, error: linksError } = await getIncidentRiskLinks(incidentId);
            if (linksError)
                throw linksError;
            setRiskLinks(linksData || []);
            // Load mapping history
            const { data: historyData, error: historyError } = await getIncidentMappingHistory(incidentId);
            if (historyError)
                throw historyError;
            setMappingHistory(historyData || []);
        }
        catch (err) {
            console.error('Error loading incident details:', err);
            setError(err instanceof Error ? err.message : 'Failed to load incident details');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleDeleteLink = async (riskId, riskTitle) => {
        if (!confirm(`Are you sure you want to remove the link to "${riskTitle}"?`)) {
            return;
        }
        setDeletingLinkId(riskId);
        setError(null);
        try {
            const { error: deleteError } = await deleteIncidentRiskLink(incidentId, riskId, 'Link removed by admin via detail view');
            if (deleteError)
                throw deleteError;
            // Show success message
            setSuccessMessage(`Risk link removed successfully`);
            setTimeout(() => setSuccessMessage(null), 3000);
            // Reload data
            await loadIncidentDetails();
        }
        catch (err) {
            console.error('Error deleting risk link:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete risk link');
        }
        finally {
            setDeletingLinkId(null);
        }
    };
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
            // Success - show message and close
            setSuccessMessage('Incident voided successfully. Returning to list...');
            setTimeout(() => {
                onClose(); // Return to incident list
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
            case 1: return 'bg-blue-100 text-blue-800';
            case 2: return 'bg-yellow-100 text-yellow-800';
            case 3: return 'bg-orange-100 text-orange-800';
            case 4: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getLinkTypeColor = (linkType) => {
        switch (linkType) {
            case 'PRIMARY': return 'bg-red-100 text-red-800';
            case 'SECONDARY': return 'bg-yellow-100 text-yellow-800';
            case 'CONTRIBUTORY': return 'bg-orange-100 text-orange-800';
            case 'ASSOCIATED': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getLinkTypeIcon = (linkType) => {
        switch (linkType) {
            case 'PRIMARY': return '🔴';
            case 'SECONDARY': return '🟡';
            case 'CONTRIBUTORY': return '🟠';
            case 'ASSOCIATED': return '🔵';
            default: return '⚪';
        }
    };
    const getActionColor = (action) => {
        switch (action) {
            case 'CREATED': return 'text-green-600';
            case 'UPDATED': return 'text-blue-600';
            case 'DELETED': return 'text-red-600';
            case 'REJECTED': return 'text-orange-600';
            case 'PREVIOUS_STATE': return 'text-gray-600';
            default: return 'text-gray-600';
        }
    };
    if (isLoading) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "py-12", children: _jsx("p", { className: "text-center text-muted-foreground", children: "Loading incident details..." }) }) }));
    }
    if (!incident) {
        return (_jsx(Card, { children: _jsxs(CardContent, { className: "py-12", children: [_jsx("p", { className: "text-center text-destructive", children: "Incident not found" }), _jsx("div", { className: "text-center mt-4", children: _jsx(Button, { variant: "outline", onClick: onClose, children: "Go Back" }) })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: onClose, children: "\u2190 Back" }), _jsx(Badge, { className: getSeverityColor(incident.severity), children: getSeverityText(incident.severity) }), _jsx(Badge, { variant: "outline", children: incident.resolution_status })] }), _jsx("h2", { className: "text-2xl font-bold", children: incident.title }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [incident.incident_code, " \u2022 ", incident.incident_type] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => setShowAddModal(true), children: "+ Link to Risk" }), _jsx(Button, { variant: "destructive", size: "sm", onClick: () => setShowVoidDialog(true), children: "Void Incident" })] })] }), successMessage && (_jsx(Alert, { className: "border-green-200 bg-green-50", children: _jsx(AlertDescription, { className: "text-green-800", children: successMessage }) })), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Incident Details" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Description" }), _jsx("p", { className: "mt-1 text-sm", children: incident.description })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Incident Date" }), _jsx("p", { className: "mt-1 text-sm", children: incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 'N/A' })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Financial Impact" }), _jsx("p", { className: "mt-1 text-sm", children: incident.financial_impact ? `$${incident.financial_impact.toLocaleString()}` : 'N/A' })] })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx("div", { className: "flex justify-between items-center", children: _jsxs(CardTitle, { children: ["Linked Risks (", riskLinks.length, ")"] }) }) }), _jsx(CardContent, { children: riskLinks.length === 0 ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("p", { className: "text-muted-foreground mb-4", children: "No risks linked to this incident yet" }), _jsx(Button, { onClick: () => setShowAddModal(true), children: "Link First Risk" })] })) : (_jsx("div", { className: "space-y-3", children: riskLinks.map((link) => (_jsx("div", { className: "p-4 border rounded-lg hover:bg-muted/30 transition-colors", children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-lg", children: getLinkTypeIcon(link.link_type) }), _jsx(Badge, { className: getLinkTypeColor(link.link_type), children: link.link_type }), _jsx("span", { className: "font-mono font-semibold text-primary", children: link.risks?.risk_code || 'N/A' })] }), _jsx("h4", { className: "font-semibold mb-1", children: link.risks?.risk_title || 'Risk Not Found' }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-muted-foreground mb-2", children: [_jsxs("span", { children: ["Confidence: ", link.classification_confidence, "%"] }), _jsxs("span", { children: ["Source: ", link.mapping_source] }), _jsxs("span", { children: ["Linked: ", new Date(link.linked_at).toLocaleDateString()] })] }), link.notes && (_jsxs("p", { className: "text-sm text-muted-foreground italic mt-2", children: ["\"", link.notes, "\""] }))] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleDeleteLink(link.risk_id, link.risks?.risk_title || 'this risk'), disabled: deletingLinkId === link.risk_id, children: deletingLinkId === link.risk_id ? 'Removing...' : '✗ Remove' })] }) }, link.id))) })) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs(CardTitle, { children: ["Mapping History (", mappingHistory.length, ")"] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => setShowHistory(!showHistory), children: showHistory ? 'Hide History' : 'Show History' })] }) }), showHistory && (_jsx(CardContent, { children: mappingHistory.length === 0 ? (_jsx("p", { className: "text-center text-muted-foreground py-4", children: "No history yet" })) : (_jsx("div", { className: "space-y-2", children: mappingHistory.map((entry) => (_jsxs("div", { className: "p-3 border-l-4 border-muted bg-muted/30 rounded text-sm", children: [_jsxs("div", { className: "flex justify-between items-start mb-1", children: [_jsx("span", { className: `font-semibold ${getActionColor(entry.action)}`, children: entry.action }), _jsx("span", { className: "text-xs text-muted-foreground", children: new Date(entry.created_at).toLocaleString() })] }), entry.risks && (_jsxs("p", { className: "text-muted-foreground", children: [entry.risks.risk_code, ": ", entry.risks.risk_title] })), entry.link_type && (_jsxs("p", { className: "text-xs", children: [getLinkTypeIcon(entry.link_type), " ", entry.link_type, " \u2022 Confidence: ", entry.admin_classification_confidence, "% \u2022 By: ", entry.performed_by_role] })), entry.admin_notes && (_jsxs("p", { className: "text-xs italic text-muted-foreground mt-1", children: ["\"", entry.admin_notes, "\""] }))] }, entry.id))) })) }))] }), showVoidDialog && (_jsxs(Card, { className: "border-destructive", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-destructive", children: "Void This Incident?" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsx(Alert, { variant: "destructive", children: _jsxs(AlertDescription, { children: [_jsx("strong", { children: "Warning:" }), " Voiding this incident will remove it from normal views. This action is logged and auditable, but the incident will no longer appear in working lists. This is a soft delete - the data is preserved for compliance."] }) }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "voidReason", children: "Reason for Voiding (Required)" }), _jsx("textarea", { id: "voidReason", value: voidReason, onChange: (e) => setVoidReason(e.target.value), placeholder: "e.g., duplicate entry, poorly captured, test data, invalid incident...", className: "w-full mt-2 p-2 border rounded-md bg-background min-h-[100px]", disabled: isVoiding }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Explain why this incident is being voided. This will be logged in the audit trail." })] }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx(Button, { variant: "outline", onClick: () => {
                                                setShowVoidDialog(false);
                                                setVoidReason('');
                                                setError(null);
                                            }, disabled: isVoiding, children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handleVoidIncident, disabled: isVoiding || !voidReason.trim(), children: isVoiding ? 'Voiding...' : 'Void Incident' })] })] }) })] })), _jsx(AddRiskLinkModal, { incidentId: incidentId, incidentTitle: incident.title, isOpen: showAddModal, onClose: () => setShowAddModal(false), onSuccess: () => {
                    setSuccessMessage('Risk link created successfully!');
                    setTimeout(() => setSuccessMessage(null), 3000);
                    loadIncidentDetails();
                }, existingRiskIds: riskLinks.map(link => link.risk_id) })] }));
}
