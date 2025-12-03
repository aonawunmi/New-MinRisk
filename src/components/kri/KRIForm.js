import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * KRIForm Component
 *
 * Form for creating/editing KRI definitions
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateAIKRISuggestions } from '@/lib/kri';
import { getRisks } from '@/lib/risks';
export default function KRIForm({ kri, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        kri_code: kri?.kri_code || undefined, // Keep existing code when editing, undefined when creating
        kri_name: kri?.kri_name || '',
        description: kri?.description || '',
        category: kri?.category || '',
        indicator_type: kri?.indicator_type || 'lagging',
        measurement_unit: kri?.measurement_unit || '',
        data_source: kri?.data_source || '',
        collection_frequency: kri?.collection_frequency || 'Monthly',
        target_value: kri?.target_value || null,
        lower_threshold: kri?.lower_threshold || null,
        upper_threshold: kri?.upper_threshold || null,
        threshold_direction: kri?.threshold_direction || 'above',
        responsible_user: kri?.responsible_user || '',
        enabled: kri?.enabled ?? true,
    });
    const [manualRiskLink, setManualRiskLink] = useState(undefined);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [loadingAI, setLoadingAI] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [risks, setRisks] = useState([]);
    const [selectedRiskCode, setSelectedRiskCode] = useState('');
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
    useEffect(() => {
        loadRisks();
    }, []);
    useEffect(() => {
        // When editing a KRI, load its linked risks
        if (kri && kri.linked_risk_codes && kri.linked_risk_codes.length > 0) {
            setManualRiskLink(kri.linked_risk_codes[0]);
        }
    }, [kri]);
    async function loadRisks() {
        const result = await getRisks();
        if (result.data) {
            setRisks(result.data);
        }
    }
    async function handleGenerateAI() {
        if (!selectedRiskCode) {
            alert('Please select a risk first');
            return;
        }
        setLoadingAI(true);
        try {
            console.log('Calling AI KRI generation for risk:', selectedRiskCode);
            const result = await generateAIKRISuggestions(selectedRiskCode);
            console.log('AI Result:', result);
            if (result.error) {
                console.error('AI Error:', result.error);
                alert(`AI Generation Error: ${result.error.message}`);
                return;
            }
            if (!result.data || result.data.length === 0) {
                alert('AI did not generate any suggestions.');
                return;
            }
            console.log(`Generated ${result.data.length} KRI suggestions`);
            setAiSuggestions(result.data || []);
            setShowSuggestions(true);
        }
        catch (err) {
            console.error('Unexpected error:', err);
            alert(`Failed to generate AI suggestions: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        finally {
            setLoadingAI(false);
        }
    }
    function handleSuggestionToggle(index) {
        const newSelection = new Set(selectedSuggestions);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        }
        else {
            newSelection.add(index);
        }
        setSelectedSuggestions(newSelection);
    }
    async function handleCreateSelectedKRIs() {
        if (selectedSuggestions.size === 0) {
            alert('Please select at least one KRI to create');
            return;
        }
        const selectedIndices = Array.from(selectedSuggestions);
        let successCount = 0;
        let failCount = 0;
        for (const index of selectedIndices) {
            const suggestion = aiSuggestions[index];
            try {
                // Pass the risk code to link the KRI to the risk
                await onSave({
                    kri_name: suggestion.kri_name,
                    description: suggestion.description,
                    category: suggestion.category,
                    indicator_type: suggestion.indicator_type,
                    measurement_unit: suggestion.measurement_unit,
                    data_source: suggestion.data_source,
                    collection_frequency: suggestion.collection_frequency,
                    target_value: suggestion.target_value,
                    lower_threshold: suggestion.lower_threshold,
                    upper_threshold: suggestion.upper_threshold,
                    threshold_direction: suggestion.threshold_direction,
                    responsible_user: suggestion.responsible_user,
                }, suggestion.linked_risk_code || selectedRiskCode);
                successCount++;
            }
            catch (err) {
                console.error(`Failed to create KRI: ${suggestion.kri_name}`, err);
                failCount++;
            }
        }
        // Show summary
        if (successCount > 0) {
            alert(`Successfully created ${successCount} KRI(s)${failCount > 0 ? `. ${failCount} failed.` : '!'}`);
            setShowSuggestions(false);
            setSelectedSuggestions(new Set());
            setAiSuggestions([]);
        }
        else {
            alert('Failed to create KRIs. Please try again.');
        }
    }
    function handleSubmit(e) {
        e.preventDefault();
        // Validation - kri_code will be auto-generated if not present
        if (!formData.kri_name) {
            alert('KRI name is required');
            return;
        }
        // Save the KRI and pass the risk code to link if provided
        onSave(formData, manualRiskLink || undefined);
    }
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [kri && (_jsxs("div", { children: [_jsx(Label, { children: "KRI Code" }), _jsx(Input, { value: formData.kri_code || '', disabled: true, className: "bg-gray-50" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "KRI codes cannot be changed" })] })), !kri && (_jsx(Alert, { children: _jsx(AlertDescription, { children: "KRI code will be auto-generated sequentially (e.g., KRI-001, KRI-002)" }) })), !kri && (_jsxs("div", { className: "space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-blue-900", children: "\u2728 AI Assistant" }), _jsx("p", { className: "text-sm text-blue-700", children: "Select a risk and let AI suggest relevant KRIs" })] }), _jsxs("div", { className: "flex items-end gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx(Label, { children: "Select Risk" }), _jsxs(Select, { value: selectedRiskCode, onValueChange: setSelectedRiskCode, children: [_jsx(SelectTrigger, { className: "bg-white", children: _jsx(SelectValue, { placeholder: "Choose a risk..." }) }), _jsx(SelectContent, { children: risks.map((risk) => (_jsxs(SelectItem, { value: risk.risk_code, children: [risk.risk_code, " - ", risk.risk_title] }, risk.id))) })] })] }), _jsx(Button, { type: "button", onClick: handleGenerateAI, disabled: loadingAI || !selectedRiskCode, className: "bg-blue-600 hover:bg-blue-700", children: loadingAI ? '🤖 Analyzing...' : '🤖 Generate KRIs' })] })] })), showSuggestions && aiSuggestions.length > 0 && (_jsxs("div", { className: "space-y-3 border rounded-lg p-4 bg-gray-50", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h4", { className: "font-semibold", children: ["AI Suggested KRIs (", aiSuggestions.length, ")"] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { type: "button", onClick: handleCreateSelectedKRIs, disabled: selectedSuggestions.size === 0, size: "sm", className: "bg-green-600 hover:bg-green-700", children: ["Create Selected (", selectedSuggestions.size, ")"] }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setShowSuggestions(false), children: "Close" })] })] }), _jsx("p", { className: "text-xs text-gray-600", children: "Select one or more KRIs to create them all at once. You can create multiple KRIs for the same risk." }), _jsx("div", { className: "space-y-2 max-h-[400px] overflow-y-auto pr-2", children: aiSuggestions.map((suggestion, idx) => (_jsx(Card, { className: `cursor-pointer transition-all ${selectedSuggestions.has(idx)
                                ? 'border-green-500 border-2 bg-green-50'
                                : 'hover:shadow-md hover:border-gray-300'}`, onClick: () => handleSuggestionToggle(idx), children: _jsx(CardContent, { className: "pt-4", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("input", { type: "checkbox", checked: selectedSuggestions.has(idx), onChange: () => handleSuggestionToggle(idx), className: "mt-1 h-4 w-4 text-green-600 cursor-pointer", onClick: (e) => e.stopPropagation() }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("h5", { className: "font-semibold", children: suggestion.kri_name }), _jsx(Badge, { variant: "outline", children: suggestion.category }), _jsx(Badge, { variant: "secondary", children: suggestion.indicator_type })] }), _jsx("p", { className: "text-sm text-gray-700 mb-2", children: suggestion.description }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs text-gray-600", children: [_jsxs("div", { children: ["\uD83D\uDCCA Unit: ", suggestion.measurement_unit] }), _jsxs("div", { children: ["\uD83D\uDCC5 Frequency: ", suggestion.collection_frequency] }), _jsxs("div", { children: ["\uD83C\uDFAF Target: ", suggestion.target_value] }), _jsxs("div", { children: ["\u26A0\uFE0F Thresholds: ", suggestion.lower_threshold, " / ", suggestion.upper_threshold] })] }), _jsxs("p", { className: "text-xs text-gray-500 mt-2 italic", children: ["\uD83D\uDCA1 ", suggestion.reasoning] }), suggestion.linked_risk_code && (_jsxs("p", { className: "text-xs text-blue-600 mt-1", children: ["\uD83D\uDD17 Linked to: ", suggestion.linked_risk_code] }))] })] }) }) }, idx))) })] })), _jsxs("div", { children: [_jsxs(Label, { children: ["Linked Risk ", kri ? '(Current)' : '(Optional)'] }), kri ? (
                    // When editing: Show as read-only text
                    _jsx("div", { className: "p-3 bg-gray-50 border rounded-md", children: kri.linked_risk_codes && kri.linked_risk_codes.length > 0 ? (_jsx("div", { children: _jsxs("p", { className: "font-medium text-gray-900", children: [kri.linked_risk_codes[0], risks.find(r => r.risk_code === kri.linked_risk_codes[0]) && (_jsxs("span", { className: "text-gray-600 ml-2", children: ["- ", risks.find(r => r.risk_code === kri.linked_risk_codes[0])?.risk_title] }))] }) })) : (_jsx("p", { className: "text-gray-500 italic", children: "No risk linked" })) })) : (
                    // When creating: Show as editable dropdown
                    _jsxs(Select, { value: manualRiskLink || undefined, onValueChange: (value) => setManualRiskLink(value || undefined), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "None - Don't link to any risk" }) }), _jsx(SelectContent, { children: risks.map((risk) => (_jsxs(SelectItem, { value: risk.risk_code, children: [risk.risk_code, " - ", risk.risk_title] }, risk.id))) })] })), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: kri
                            ? 'Risk links cannot be changed after creation. Delete and recreate the KRI to link to a different risk.'
                            : 'Select which risk this KRI will monitor' })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Category" }), _jsx(Input, { value: formData.category || '', onChange: (e) => setFormData({ ...formData, category: e.target.value }), placeholder: "Operational, Financial, etc." })] }), _jsxs("div", { children: [_jsx(Label, { children: "Indicator Type" }), _jsxs(Select, { value: formData.indicator_type || 'lagging', onValueChange: (value) => setFormData({ ...formData, indicator_type: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "leading", children: "Leading" }), _jsx(SelectItem, { value: "lagging", children: "Lagging" }), _jsx(SelectItem, { value: "concurrent", children: "Concurrent" })] })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "KRI Name *" }), _jsx(Input, { value: formData.kri_name, onChange: (e) => setFormData({ ...formData, kri_name: e.target.value }), placeholder: "Number of security incidents", required: true })] }), _jsxs("div", { children: [_jsx(Label, { children: "Description" }), _jsx(Textarea, { value: formData.description || '', onChange: (e) => setFormData({ ...formData, description: e.target.value }), placeholder: "Describe what this KRI measures...", rows: 3 })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Measurement Unit" }), _jsx(Input, { value: formData.measurement_unit || '', onChange: (e) => setFormData({ ...formData, measurement_unit: e.target.value }), placeholder: "count, %, USD, etc." })] }), _jsxs("div", { children: [_jsx(Label, { children: "Data Source" }), _jsx(Input, { value: formData.data_source || '', onChange: (e) => setFormData({ ...formData, data_source: e.target.value }), placeholder: "Where data comes from" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Collection Frequency" }), _jsxs(Select, { value: formData.collection_frequency || 'Monthly', onValueChange: (value) => setFormData({ ...formData, collection_frequency: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Daily", children: "Daily" }), _jsx(SelectItem, { value: "Weekly", children: "Weekly" }), _jsx(SelectItem, { value: "Monthly", children: "Monthly" }), _jsx(SelectItem, { value: "Quarterly", children: "Quarterly" }), _jsx(SelectItem, { value: "Annually", children: "Annually" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Responsible User" }), _jsx(Input, { value: formData.responsible_user || '', onChange: (e) => setFormData({ ...formData, responsible_user: e.target.value }), placeholder: "Person responsible" })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Threshold Direction" }), _jsxs(Select, { value: formData.threshold_direction, onValueChange: (value) => setFormData({ ...formData, threshold_direction: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "above", children: "Alert when value goes ABOVE threshold" }), _jsx(SelectItem, { value: "below", children: "Alert when value goes BELOW threshold" }), _jsx(SelectItem, { value: "outside", children: "Alert when value goes OUTSIDE range" })] })] })] }), _jsxs("div", { className: "border rounded-lg p-4 space-y-3 bg-gray-50", children: [_jsx("h4", { className: "font-semibold", children: "Thresholds & Targets" }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Target Value" }), _jsx(Input, { type: "number", step: "any", value: formData.target_value || '', onChange: (e) => setFormData({ ...formData, target_value: e.target.value ? parseFloat(e.target.value) : null }), placeholder: "Ideal value" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Lower Threshold" }), _jsx(Input, { type: "number", step: "any", value: formData.lower_threshold || '', onChange: (e) => setFormData({ ...formData, lower_threshold: e.target.value ? parseFloat(e.target.value) : null }), placeholder: "Alert if below" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Upper Threshold" }), _jsx(Input, { type: "number", step: "any", value: formData.upper_threshold || '', onChange: (e) => setFormData({ ...formData, upper_threshold: e.target.value ? parseFloat(e.target.value) : null }), placeholder: "Alert if above" })] })] }), _jsx("p", { className: "text-xs text-gray-600", children: "Thresholds determine when alerts are triggered based on measured values" })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, children: "Cancel" }), _jsx(Button, { type: "submit", children: kri ? 'Update KRI' : 'Create KRI' })] })] }));
}
