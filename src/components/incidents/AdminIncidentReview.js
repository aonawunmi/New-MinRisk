import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ADMIN Incident Review Dashboard
 * Phase 4+5: AI-Assisted Risk Mapping Review Interface
 *
 * Shows unclassified incidents with AI suggestions
 * ADMIN can accept/reject suggestions with confidence scoring
 * AND view/manage incidents that have been mapped to risks
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getAISuggestionsForIncident, acceptAISuggestion, rejectAISuggestion, analyzeIncidentForRiskMapping } from '../../lib/incidents';
import { MappedIncidentsView } from './MappedIncidentsView';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
export function AdminIncidentReview() {
    // Tab state
    const [activeTab, setActiveTab] = useState('pending');
    const [incidents, setIncidents] = useState([]);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    // Review state
    const [selectedSuggestionId, setSelectedSuggestionId] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [classificationConfidence, setClassificationConfidence] = useState(100);
    const [selectedLinkType, setSelectedLinkType] = useState('PRIMARY');
    const [expandedReasoning, setExpandedReasoning] = useState(null);
    // Load unclassified incidents
    const loadUnclassifiedIncidents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('incidents')
                .select('*')
                .eq('resolution_status', 'PENDING_CLASSIFICATION')
                .order('created_at', { ascending: false });
            if (fetchError)
                throw fetchError;
            setIncidents(data || []);
        }
        catch (err) {
            console.error('Error loading incidents:', err);
            setError(err instanceof Error ? err.message : 'Failed to load incidents');
        }
        finally {
            setIsLoading(false);
        }
    };
    // Load AI suggestions for selected incident
    const loadSuggestions = async (incidentId) => {
        try {
            console.log('🔍 Fetching suggestions for incident:', incidentId);
            const { data, error: fetchError } = await getAISuggestionsForIncident(incidentId, 'pending');
            if (fetchError) {
                console.error('❌ Error fetching suggestions:', fetchError);
                throw fetchError;
            }
            console.log('✅ Fetched suggestions:', data?.length || 0, 'suggestions');
            console.log('Suggestions data:', data);
            setSuggestions(data || []);
        }
        catch (err) {
            console.error('Error loading suggestions:', err);
            setError(err instanceof Error ? err.message : 'Failed to load suggestions');
        }
    };
    // Trigger AI analysis for incident
    const triggerAnalysis = async (incidentId) => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const { data, error: analysisError } = await analyzeIncidentForRiskMapping(incidentId);
            if (analysisError)
                throw analysisError;
            console.log('AI analysis complete:', data);
            // Wait a moment for database transaction to commit
            await new Promise(resolve => setTimeout(resolve, 500));
            // Reload suggestions
            console.log('Loading suggestions for incident:', incidentId);
            await loadSuggestions(incidentId);
            console.log('Suggestions loaded, count:', suggestions.length);
            // Show success message
            setSuccessMessage(`AI analysis complete! Generated ${data.suggestions_count} suggestion${data.suggestions_count !== 1 ? 's' : ''}`);
            setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds
        }
        catch (err) {
            console.error('Error triggering analysis:', err);
            setError(err instanceof Error ? err.message : 'AI analysis failed');
        }
        finally {
            setIsAnalyzing(false);
        }
    };
    // Accept AI suggestion
    const handleAccept = async (suggestionId) => {
        if (!selectedIncident)
            return;
        setIsProcessing(true);
        setError(null);
        try {
            const { error: acceptError } = await acceptAISuggestion(suggestionId, selectedLinkType, // NEW: Pass admin-selected link type
            adminNotes || undefined, classificationConfidence);
            if (acceptError)
                throw acceptError;
            // Refresh data
            await loadUnclassifiedIncidents();
            await loadSuggestions(selectedIncident.id);
            // Reset form
            setAdminNotes('');
            setClassificationConfidence(100);
            setSelectedLinkType('PRIMARY'); // Reset to default
            setSelectedSuggestionId(null);
            // Show success message
            setSuccessMessage('Suggestion accepted! Risk mapping has been created successfully.');
            setTimeout(() => setSuccessMessage(null), 5000);
        }
        catch (err) {
            console.error('Error accepting suggestion:', err);
            setError(err instanceof Error ? err.message : 'Failed to accept suggestion');
        }
        finally {
            setIsProcessing(false);
        }
    };
    // Reject AI suggestion
    const handleReject = async (suggestionId) => {
        setIsProcessing(true);
        setError(null);
        try {
            const { error: rejectError } = await rejectAISuggestion(suggestionId, adminNotes || undefined);
            if (rejectError)
                throw rejectError;
            // Refresh suggestions
            if (selectedIncident) {
                await loadSuggestions(selectedIncident.id);
            }
            // Reset form
            setAdminNotes('');
            setSelectedSuggestionId(null);
            // Show success message
            setSuccessMessage('Suggestion rejected successfully.');
            setTimeout(() => setSuccessMessage(null), 5000);
        }
        catch (err) {
            console.error('Error rejecting suggestion:', err);
            setError(err instanceof Error ? err.message : 'Failed to reject suggestion');
        }
        finally {
            setIsProcessing(false);
        }
    };
    useEffect(() => {
        loadUnclassifiedIncidents();
    }, []);
    useEffect(() => {
        if (selectedIncident) {
            loadSuggestions(selectedIncident.id);
        }
    }, [selectedIncident]);
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
    const getConfidenceColor = (score) => {
        if (score >= 90)
            return 'text-green-600';
        if (score >= 80)
            return 'text-green-500';
        if (score >= 70)
            return 'text-yellow-600';
        return 'text-gray-600';
    };
    // Check description quality
    const getDescriptionQuality = (description) => {
        const length = description.length;
        const wordCount = description.split(/\s+/).length;
        // Quality scoring
        const hasMinLength = length >= 100;
        const hasGoodLength = length >= 200;
        const hasEnoughWords = wordCount >= 20;
        const hasDetailKeywords = /impact|cause|affect|damage|loss|system|user|data|critical|issue|problem/i.test(description);
        let quality = 'poor';
        if (hasGoodLength && hasEnoughWords && hasDetailKeywords) {
            quality = 'good';
        }
        else if (hasMinLength && hasEnoughWords) {
            quality = 'fair';
        }
        return { length, wordCount, quality, hasDetailKeywords };
    };
    if (isLoading) {
        return (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-muted-foreground", children: "Loading unclassified incidents..." }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex justify-between items-center", children: _jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold tracking-tight", children: "Incident Risk Mapping" }), _jsx("p", { className: "text-muted-foreground", children: "Review AI suggestions and manage risk mappings" })] }) }), _jsxs("div", { className: "flex gap-2 border-b", children: [_jsxs("button", { onClick: () => setActiveTab('pending'), className: `px-4 py-2 font-medium transition-colors ${activeTab === 'pending'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'}`, children: ["Pending Classification", _jsx(Badge, { variant: "outline", className: "ml-2", children: incidents.length })] }), _jsx("button", { onClick: () => setActiveTab('mapped'), className: `px-4 py-2 font-medium transition-colors ${activeTab === 'mapped'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'}`, children: "Mapped Incidents" })] }), successMessage && (_jsx(Alert, { className: "border-green-200 bg-green-50", children: _jsx(AlertDescription, { className: "text-green-800", children: successMessage }) })), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), activeTab === 'mapped' ? (_jsx(MappedIncidentsView, {})) : (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs(Card, { className: "lg:col-span-1", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Unclassified Incidents" }) }), _jsx(CardContent, { children: incidents.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "No incidents pending classification" })) : (_jsx("div", { className: "space-y-2", children: incidents.map((incident) => (_jsxs("button", { onClick: () => setSelectedIncident(incident), className: `w-full text-left p-3 rounded-lg border transition-colors ${selectedIncident?.id === incident.id
                                            ? 'bg-primary/10 border-primary'
                                            : 'hover:bg-muted border-border'}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "font-mono text-xs text-muted-foreground", children: incident.incident_code }), _jsx(Badge, { className: getSeverityColor(incident.severity), children: getSeverityText(incident.severity) })] }), _jsx("p", { className: "font-medium text-sm", children: incident.title }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: new Date(incident.created_at).toLocaleDateString() })] }, incident.id))) })) })] }), _jsx(Card, { className: "lg:col-span-2", children: !selectedIncident ? (_jsx(CardContent, { className: "py-12", children: _jsx("p", { className: "text-center text-muted-foreground", children: "Select an incident to review AI suggestions" }) })) : (_jsxs(_Fragment, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: selectedIncident.title }), _jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [selectedIncident.incident_code, " \u2022 ", selectedIncident.incident_type] })] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => triggerAnalysis(selectedIncident.id), disabled: isAnalyzing, children: isAnalyzing ? '🔄 Analyzing...' : '🧠 Run AI Analysis' })] }) }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-muted-foreground", children: "Description" }), _jsx("div", { className: "mt-2 p-3 bg-muted/50 rounded-md text-sm", children: selectedIncident.description }), (() => {
                                                    const quality = getDescriptionQuality(selectedIncident.description);
                                                    if (quality.quality === 'poor') {
                                                        return (_jsx(Alert, { className: "mt-3 border-orange-200 bg-orange-50", children: _jsx(AlertDescription, { children: _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "font-semibold text-orange-900", children: "\u26A0\uFE0F Brief Incident Description" }), _jsxs("p", { className: "text-sm text-orange-800", children: ["This incident has a very brief description (", quality.length, " characters, ", quality.wordCount, " words). For more accurate AI risk mapping suggestions, consider adding:"] }), _jsxs("ul", { className: "text-sm text-orange-800 list-disc list-inside space-y-1 ml-2", children: [_jsxs("li", { children: [_jsx("strong", { children: "What happened:" }), " Specific event details and timeline"] }), _jsxs("li", { children: [_jsx("strong", { children: "Root cause:" }), " Why it occurred (if known)"] }), _jsxs("li", { children: [_jsx("strong", { children: "Impact:" }), " Systems, departments, or users affected"] }), _jsxs("li", { children: [_jsx("strong", { children: "Financial impact:" }), " Estimated or actual monetary loss"] }), _jsxs("li", { children: [_jsx("strong", { children: "Technical details:" }), " CVE numbers, error codes, system IDs"] })] }), _jsxs("p", { className: "text-sm text-orange-800 mt-2", children: [_jsx("strong", { children: "Recommended minimum:" }), " 100 characters with specific details about impact and cause"] })] }) }) }));
                                                    }
                                                    else if (quality.quality === 'fair') {
                                                        return (_jsx(Alert, { className: "mt-3 border-blue-200 bg-blue-50", children: _jsx(AlertDescription, { children: _jsxs("p", { className: "text-sm text-blue-800", children: ["\u2139\uFE0F ", _jsx("strong", { children: "Moderate description quality." }), " The AI will analyze based on available details. Adding more context about root cause and impact could improve suggestion accuracy."] }) }) }));
                                                    }
                                                    return null;
                                                })()] }), _jsxs("div", { children: [_jsx(Label, { className: "text-lg font-semibold", children: "AI Risk Suggestions" }), suggestions.length === 0 ? (_jsx(Alert, { className: "mt-3", children: _jsx(AlertDescription, { children: "No AI suggestions yet. Click \"Run AI Analysis\" to generate suggestions." }) })) : (_jsx("div", { className: "mt-3 space-y-4", children: suggestions.map((suggestion) => (_jsx(Card, { className: "border-2", children: _jsxs(CardContent, { className: "pt-6", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "font-mono font-semibold text-primary", children: suggestion.risks?.risk_code || 'N/A' }), _jsx(Badge, { variant: "outline", children: suggestion.risks?.category || 'N/A' })] }), _jsx("h4", { className: "font-semibold", children: suggestion.risks?.risk_title || 'Risk Not Found' })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: `text-2xl font-bold ${getConfidenceColor(suggestion.confidence_score)}`, children: [suggestion.confidence_score, "%"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "AI Confidence" })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Keywords Matched:" }), _jsx("div", { className: "flex flex-wrap gap-1 mt-1", children: suggestion.keywords_matched.map((keyword, idx) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: keyword }, idx))) })] }), _jsxs("div", { className: "mb-4", children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "AI Reasoning:" }), _jsx("div", { className: "mt-1 p-3 bg-muted/30 rounded-md text-sm", children: expandedReasoning === suggestion.id ? (_jsxs("div", { children: [_jsx("p", { children: suggestion.reasoning }), _jsx("button", { onClick: () => setExpandedReasoning(null), className: "text-primary text-xs mt-2 hover:underline", children: "Show less" })] })) : (_jsxs("div", { children: [_jsxs("p", { children: [suggestion.reasoning.slice(0, 150), "..."] }), _jsx("button", { onClick: () => setExpandedReasoning(suggestion.id), className: "text-primary text-xs mt-2 hover:underline", children: "Read full reasoning" })] })) })] }), selectedSuggestionId === suggestion.id ? (_jsxs("div", { className: "space-y-4 p-4 bg-muted/30 rounded-lg", children: [_jsxs("div", { children: [_jsxs(Label, { children: ["Your Classification Confidence: ", classificationConfidence, "%"] }), _jsx(Slider, { value: [classificationConfidence], onValueChange: (value) => setClassificationConfidence(value[0]), min: 0, max: 100, step: 5, className: "mt-2" }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: classificationConfidence < 70
                                                                                        ? '⚠️ Low confidence will flag incident for follow-up'
                                                                                        : '✓ High confidence will mark as confirmed' })] }), _jsxs("div", { children: [_jsx(Label, { children: "Risk Link Type" }), _jsxs("select", { value: selectedLinkType, onChange: (e) => setSelectedLinkType(e.target.value), className: "mt-2 w-full p-2 border rounded-md bg-background", children: [_jsx("option", { value: "PRIMARY", children: "PRIMARY - Main contributing risk" }), _jsx("option", { value: "SECONDARY", children: "SECONDARY - Supporting factor" }), _jsx("option", { value: "CONTRIBUTORY", children: "CONTRIBUTORY - Partial contributor" }), _jsx("option", { value: "ASSOCIATED", children: "ASSOCIATED - Related but indirect" })] }), _jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [selectedLinkType === 'PRIMARY' && '🔴 This risk is a main cause of the incident', selectedLinkType === 'SECONDARY' && '🟡 This risk is a supporting factor', selectedLinkType === 'CONTRIBUTORY' && '🟠 This risk partially contributed', selectedLinkType === 'ASSOCIATED' && '🔵 This risk is related but indirect'] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Admin Notes (Optional)" }), _jsx(Textarea, { value: adminNotes, onChange: (e) => setAdminNotes(e.target.value), placeholder: "Add any notes about this classification...", className: "mt-2", rows: 3 })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => handleAccept(suggestion.id), disabled: isProcessing, className: "flex-1", children: "\u2713 Accept & Map Risk" }), _jsx(Button, { variant: "outline", onClick: () => setSelectedSuggestionId(null), disabled: isProcessing, children: "Cancel" })] })] })) : (_jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => setSelectedSuggestionId(suggestion.id), variant: "default", size: "sm", className: "flex-1", children: "\u2713 Accept" }), _jsx(Button, { onClick: () => handleReject(suggestion.id), variant: "outline", size: "sm", disabled: isProcessing, children: "\u2717 Reject" })] }))] }) }, suggestion.id))) }))] })] })] })) })] }))] }));
}
