import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Incident Submission Form Component
 * Allows users to report new incidents or edit existing ones
 */
import { useState, useEffect } from 'react';
import { createIncident, updateIncident, getIncidentById } from '../../lib/incidents';
import { SEVERITY_OPTIONS } from '../../types/incident';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
export function IncidentForm({ incidentId, onSuccess, onCancel }) {
    const isEditMode = !!incidentId;
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        incident_type: '',
        severity: 'MEDIUM',
        occurred_at: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
        visibility_scope: 'REPORTER_ONLY',
        linked_risk_codes: [],
        financial_impact: '',
    });
    // Load existing incident data if in edit mode
    useEffect(() => {
        if (incidentId) {
            loadIncidentData();
        }
    }, [incidentId]);
    const loadIncidentData = async () => {
        if (!incidentId)
            return;
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await getIncidentById(incidentId);
            if (fetchError)
                throw fetchError;
            if (!data)
                throw new Error('Incident not found');
            // Convert database format to form format
            const severityMap = {
                1: 'LOW',
                2: 'MEDIUM',
                3: 'HIGH',
                4: 'CRITICAL'
            };
            setFormData({
                title: data.title || '',
                description: data.description || '',
                incident_type: data.incident_type || '',
                severity: typeof data.severity === 'number' ? severityMap[data.severity] : data.severity,
                occurred_at: data.incident_date
                    ? new Date(data.incident_date).toISOString().slice(0, 16)
                    : new Date().toISOString().slice(0, 16),
                visibility_scope: data.visibility_scope || 'REPORTER_ONLY',
                linked_risk_codes: data.linked_risk_codes || [],
                financial_impact: data.financial_impact || '',
            });
        }
        catch (err) {
            console.error('Error loading incident:', err);
            setError(err instanceof Error ? err.message : 'Failed to load incident');
        }
        finally {
            setIsLoading(false);
        }
    };
    // Common incident types
    const incidentTypes = [
        'Data Breach',
        'System Outage',
        'Security Incident',
        'Operational Error',
        'Compliance Violation',
        'Fraud',
        'Customer Complaint',
        'Process Failure',
        'Third-Party Incident',
        'Other',
    ];
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        // Validation
        if (!formData.title.trim()) {
            setError('Please enter an incident title');
            return;
        }
        if (!formData.description.trim()) {
            setError('Please enter an incident description');
            return;
        }
        if (!formData.incident_type) {
            setError('Please select an incident type');
            return;
        }
        if (!formData.occurred_at) {
            setError('Please enter when the incident occurred');
            return;
        }
        setIsSubmitting(true);
        try {
            if (isEditMode && incidentId) {
                // Update existing incident
                const { data, error: updateError } = await updateIncident(incidentId, {
                    title: formData.title,
                    description: formData.description,
                    incident_type: formData.incident_type,
                    severity: formData.severity,
                    occurred_at: formData.occurred_at,
                    financial_impact: formData.financial_impact ? parseFloat(formData.financial_impact) : null,
                });
                if (updateError) {
                    throw updateError;
                }
                setSuccess(true);
                // Call success callback
                if (onSuccess && data) {
                    setTimeout(() => onSuccess(data.id), 1500);
                }
            }
            else {
                // Create new incident
                const { data, error: createError } = await createIncident(formData);
                if (createError) {
                    throw createError;
                }
                setSuccess(true);
                // Reset form
                setFormData({
                    title: '',
                    description: '',
                    incident_type: '',
                    severity: 'MEDIUM',
                    occurred_at: new Date().toISOString().slice(0, 16),
                    visibility_scope: 'REPORTER_ONLY',
                    linked_risk_codes: [],
                    financial_impact: '',
                });
                // Call success callback
                if (onSuccess && data) {
                    setTimeout(() => onSuccess(data.id), 1500);
                }
            }
        }
        catch (err) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} incident:`, err);
            setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} incident`);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };
    // Loading state for edit mode
    if (isLoading) {
        return (_jsx(Card, { className: "w-full max-w-3xl mx-auto", children: _jsx(CardContent, { className: "py-12", children: _jsx("div", { className: "text-center", children: _jsx("p", { className: "text-muted-foreground", children: "Loading incident details..." }) }) }) }));
    }
    return (_jsxs(Card, { className: "w-full max-w-3xl mx-auto", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: isEditMode ? 'Edit Incident' : 'Report New Incident' }), _jsx(CardDescription, { children: isEditMode
                            ? 'Update the incident details below. All fields marked with * are required.'
                            : 'Please provide details about the incident. All fields marked with * are required.' })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [success && (_jsx(Alert, { className: "bg-green-50 border-green-200", children: _jsx(AlertDescription, { className: "text-green-800", children: isEditMode ? 'Incident updated successfully! Redirecting...' : 'Incident reported successfully! Redirecting...' }) })), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "title", children: ["Incident Title ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { id: "title", value: formData.title, onChange: (e) => handleInputChange('title', e.target.value), placeholder: "Brief summary of the incident", disabled: isSubmitting, required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "incident_type", children: ["Incident Type ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs(Select, { value: formData.incident_type, onValueChange: (value) => handleInputChange('incident_type', value), disabled: isSubmitting, children: [_jsx(SelectTrigger, { id: "incident_type", children: _jsx(SelectValue, { placeholder: "Select incident type" }) }), _jsx(SelectContent, { children: incidentTypes.map((type) => (_jsx(SelectItem, { value: type, children: type }, type))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "severity", children: ["Severity ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs(Select, { value: formData.severity, onValueChange: (value) => handleInputChange('severity', value), disabled: isSubmitting, children: [_jsx(SelectTrigger, { id: "severity", children: _jsx(SelectValue, { placeholder: "Select severity" }) }), _jsx(SelectContent, { children: SEVERITY_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: _jsx("span", { className: option.color, children: option.label }) }, option.value))) })] }), _jsxs("p", { className: "text-sm text-gray-500", children: [formData.severity === 'LOW' && 'Minor issue with minimal impact', formData.severity === 'MEDIUM' && 'Moderate issue requiring attention', formData.severity === 'HIGH' && 'Significant issue with major impact', formData.severity === 'CRITICAL' && 'Severe issue requiring immediate action'] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "occurred_at", children: ["When Did This Occur? ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { id: "occurred_at", type: "datetime-local", value: formData.occurred_at, onChange: (e) => handleInputChange('occurred_at', e.target.value), disabled: isSubmitting, required: true, max: new Date().toISOString().slice(0, 16) }), _jsx("p", { className: "text-sm text-gray-500", children: "Enter the date and time when the incident occurred" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "description", children: ["Incident Description ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Textarea, { id: "description", value: formData.description, onChange: (e) => handleInputChange('description', e.target.value), placeholder: "Provide detailed information about what happened, including:\n- What was observed\n- When it was discovered\n- Who was affected\n- Any immediate actions taken", rows: 8, disabled: isSubmitting, required: true }), formData.description.length > 0 && (_jsx("div", { className: "mt-2", children: (() => {
                                        const length = formData.description.length;
                                        const wordCount = formData.description.split(/\s+/).filter(w => w.length > 0).length;
                                        if (length < 50) {
                                            return (_jsx(Alert, { className: "border-red-200 bg-red-50", children: _jsxs(AlertDescription, { className: "text-sm text-red-800", children: [_jsxs("strong", { children: ["\u26A0\uFE0F Too brief (", length, " characters)."] }), " Add more details about what happened, the impact, and root cause for better AI risk mapping."] }) }));
                                        }
                                        else if (length < 100) {
                                            return (_jsx(Alert, { className: "border-orange-200 bg-orange-50", children: _jsxs(AlertDescription, { className: "text-sm text-orange-800", children: [_jsxs("strong", { children: ["\uD83D\uDCDD Brief description (", length, " characters)."] }), " Consider adding more context about impact and cause for accurate AI analysis."] }) }));
                                        }
                                        else if (length < 200) {
                                            return (_jsx(Alert, { className: "border-blue-200 bg-blue-50", children: _jsxs(AlertDescription, { className: "text-sm text-blue-800", children: [_jsxs("strong", { children: ["\u2713 Good length (", length, " characters, ", wordCount, " words)."] }), " Make sure to include specific details about impact and root cause."] }) }));
                                        }
                                        else {
                                            return (_jsx(Alert, { className: "border-green-200 bg-green-50", children: _jsxs(AlertDescription, { className: "text-sm text-green-800", children: [_jsxs("strong", { children: ["\u2713 Excellent detail (", length, " characters, ", wordCount, " words)."] }), " This will help AI provide accurate risk mapping suggestions."] }) }));
                                        }
                                    })() })), _jsxs("p", { className: "text-sm text-gray-500", children: [_jsx("strong", { children: "Tip:" }), " Include specific details about what happened, root cause, impact (systems/users affected), and any technical details (CVE numbers, error codes). Aim for at least 100 characters for accurate AI risk analysis."] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "financial_impact", children: "Financial Impact (Optional)" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", children: "\u20A6" }), _jsx(Input, { id: "financial_impact", type: "number", min: "0", step: "0.01", value: formData.financial_impact, onChange: (e) => setFormData(prev => ({ ...prev, financial_impact: e.target.value })), placeholder: "0.00", className: "pl-7", disabled: isSubmitting })] }), _jsx("p", { className: "text-sm text-gray-500", children: "Estimated or actual financial loss from this incident in Nigerian Naira (if applicable)" })] }), _jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-md p-4", children: _jsxs("p", { className: "text-sm text-blue-800", children: [_jsx("strong", { children: "Privacy:" }), " Only you and administrators will be able to view this incident report."] }) }), _jsxs("div", { className: "flex gap-3 justify-end pt-4", children: [onCancel && (_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, disabled: isSubmitting, children: "Cancel" })), _jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting
                                        ? (isEditMode ? 'Updating...' : 'Submitting...')
                                        : (isEditMode ? 'Update Incident' : 'Submit Incident Report') })] })] }) })] }));
}
