import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Add Risk Link Modal
 * Allows admins to manually link incidents to risks
 */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createIncidentRiskLink } from '../../lib/incidents';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../ui/select';
export function AddRiskLinkModal({ incidentId, incidentTitle, isOpen, onClose, onSuccess, existingRiskIds = [] }) {
    const [risks, setRisks] = useState([]);
    const [selectedRiskId, setSelectedRiskId] = useState('');
    const [linkType, setLinkType] = useState('PRIMARY');
    const [adminNotes, setAdminNotes] = useState('');
    const [classificationConfidence, setClassificationConfidence] = useState(100);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    // Load available risks
    useEffect(() => {
        if (isOpen) {
            loadRisks();
        }
    }, [isOpen]);
    const loadRisks = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('risks')
                .select('id, risk_code, risk_title, category, status')
                .in('status', ['OPEN', 'MONITORING']) // Only active risks
                .order('risk_code', { ascending: true });
            if (fetchError)
                throw fetchError;
            // Filter out risks already linked to this incident
            const availableRisks = (data || []).filter(risk => !existingRiskIds.includes(risk.id));
            setRisks(availableRisks);
        }
        catch (err) {
            console.error('Error loading risks:', err);
            setError(err instanceof Error ? err.message : 'Failed to load risks');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSubmit = async () => {
        if (!selectedRiskId) {
            setError('Please select a risk');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const { error: linkError } = await createIncidentRiskLink(incidentId, selectedRiskId, linkType, adminNotes || undefined, classificationConfidence);
            if (linkError)
                throw linkError;
            // Success - close modal and notify parent
            onSuccess();
            handleClose();
        }
        catch (err) {
            console.error('Error creating risk link:', err);
            setError(err instanceof Error ? err.message : 'Failed to create risk link');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleClose = () => {
        // Reset form
        setSelectedRiskId('');
        setLinkType('PRIMARY');
        setAdminNotes('');
        setClassificationConfidence(100);
        setError(null);
        setSearchQuery('');
        onClose();
    };
    // Filter risks based on search query
    const filteredRisks = searchQuery
        ? risks.filter(risk => risk.risk_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            risk.risk_title.toLowerCase().includes(searchQuery.toLowerCase()))
        : risks;
    const selectedRisk = risks.find(r => r.id === selectedRiskId);
    return (_jsx(Dialog, { open: isOpen, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[90vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Link Incident to Risk" }), _jsx(DialogDescription, { children: "Manually create a link between this incident and a risk from your register." })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { className: "p-3 bg-muted/50 rounded-md", children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Incident:" }), _jsx("p", { className: "font-medium text-sm", children: incidentTitle })] }), error && (_jsx("div", { className: "p-3 bg-destructive/10 border border-destructive rounded-md", children: _jsx("p", { className: "text-sm text-destructive", children: error }) })), _jsxs("div", { children: [_jsx(Label, { children: "Select Risk *" }), _jsx("input", { type: "text", placeholder: "Search risks by code or title...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "mt-2 w-full p-2 border rounded-md bg-background" }), _jsxs(Select, { value: selectedRiskId, onValueChange: setSelectedRiskId, children: [_jsx(SelectTrigger, { className: "mt-2 w-full", children: _jsx(SelectValue, { placeholder: isLoading ? "Loading risks..." : "Choose a risk..." }) }), _jsx(SelectContent, { children: filteredRisks.length === 0 ? (_jsx("div", { className: "p-4 text-center text-sm text-muted-foreground", children: isLoading ? 'Loading...' : searchQuery ? 'No risks match your search' : 'No available risks' })) : (filteredRisks.map((risk) => (_jsx(SelectItem, { value: risk.id, children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx("span", { className: "font-mono font-semibold text-primary", children: risk.risk_code }), _jsx("span", { className: "flex-1", children: risk.risk_title }), _jsx("span", { className: "text-xs text-muted-foreground", children: risk.category })] }) }, risk.id)))) })] }), selectedRisk && (_jsxs("div", { className: "mt-2 p-2 bg-primary/5 border border-primary/20 rounded-md text-sm", children: [_jsxs("span", { className: "font-semibold", children: [selectedRisk.risk_code, ":"] }), " ", selectedRisk.risk_title] }))] }), _jsxs("div", { children: [_jsx(Label, { children: "Risk Link Type *" }), _jsxs("select", { value: linkType, onChange: (e) => setLinkType(e.target.value), className: "mt-2 w-full p-2 border rounded-md bg-background", children: [_jsx("option", { value: "PRIMARY", children: "PRIMARY - Main contributing risk" }), _jsx("option", { value: "SECONDARY", children: "SECONDARY - Supporting factor" }), _jsx("option", { value: "CONTRIBUTORY", children: "CONTRIBUTORY - Partial contributor" }), _jsx("option", { value: "ASSOCIATED", children: "ASSOCIATED - Related but indirect" })] }), _jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [linkType === 'PRIMARY' && '🔴 This risk is a main cause of the incident', linkType === 'SECONDARY' && '🟡 This risk is a supporting factor', linkType === 'CONTRIBUTORY' && '🟠 This risk partially contributed', linkType === 'ASSOCIATED' && '🔵 This risk is related but indirect'] })] }), _jsxs("div", { children: [_jsxs(Label, { children: ["Your Classification Confidence: ", classificationConfidence, "%"] }), _jsx(Slider, { value: [classificationConfidence], onValueChange: (value) => setClassificationConfidence(value[0]), min: 0, max: 100, step: 5, className: "mt-2" }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: classificationConfidence < 70
                                        ? '⚠️ Low confidence will flag incident for follow-up'
                                        : '✓ High confidence will mark as confirmed' })] }), _jsxs("div", { children: [_jsx(Label, { children: "Admin Notes (Optional)" }), _jsx(Textarea, { value: adminNotes, onChange: (e) => setAdminNotes(e.target.value), placeholder: "Add any notes about this risk mapping...", className: "mt-2", rows: 3 })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: handleClose, disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, disabled: isSubmitting || !selectedRiskId, children: isSubmitting ? 'Creating Link...' : 'Create Risk Link' })] })] }) }));
}
