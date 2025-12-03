import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * AIControlSuggestions Component
 *
 * Displays AI-recommended controls for a risk and allows user to accept/reject them
 */
import { useState } from 'react';
import { getAIControlRecommendations } from '@/lib/ai';
import { createControl } from '@/lib/controls';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function AIControlSuggestions({ open, onOpenChange, riskId, riskTitle, riskDescription, category, division, inherentLikelihood, inherentImpact, onSuccess, }) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    // Fetch AI suggestions when dialog opens
    async function handleGetSuggestions() {
        setLoading(true);
        setError(null);
        setSuggestions([]);
        setSelectedSuggestions(new Set());
        try {
            const { data, error: aiError } = await getAIControlRecommendations(riskTitle, riskDescription, category, division, inherentLikelihood, inherentImpact);
            if (aiError) {
                setError(aiError.message);
                return;
            }
            if (!data || data.length === 0) {
                setError('No suggestions generated. Please try again.');
                return;
            }
            setSuggestions(data);
            // Select all by default
            setSelectedSuggestions(new Set(data.map((_, i) => i)));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
        }
        finally {
            setLoading(false);
        }
    }
    function toggleSuggestion(index) {
        const newSelected = new Set(selectedSuggestions);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        }
        else {
            newSelected.add(index);
        }
        setSelectedSuggestions(newSelected);
    }
    async function handleCreateControls() {
        setCreating(true);
        setError(null);
        try {
            const controlsToCreate = suggestions.filter((_, i) => selectedSuggestions.has(i));
            if (controlsToCreate.length === 0) {
                setError('Please select at least one control to create');
                setCreating(false);
                return;
            }
            let successCount = 0;
            let failCount = 0;
            for (const suggestion of controlsToCreate) {
                const { error: createError } = await createControl({
                    risk_id: riskId,
                    name: suggestion.name,
                    description: suggestion.description,
                    control_type: suggestion.control_type,
                    target: suggestion.target,
                    design_score: suggestion.design_score,
                    implementation_score: suggestion.implementation_score,
                    monitoring_score: suggestion.monitoring_score,
                    evaluation_score: suggestion.evaluation_score,
                });
                if (createError) {
                    console.error('Failed to create control:', suggestion.name, createError);
                    failCount++;
                }
                else {
                    successCount++;
                }
            }
            if (successCount > 0) {
                onSuccess();
                onOpenChange(false);
            }
            if (failCount > 0) {
                setError(`Created ${successCount} controls, but ${failCount} failed. Check console for details.`);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create controls');
        }
        finally {
            setCreating(false);
        }
    }
    function calculateEffectiveness(suggestion) {
        if (suggestion.design_score === 0 || suggestion.implementation_score === 0) {
            return 0;
        }
        return (((suggestion.design_score +
            suggestion.implementation_score +
            suggestion.monitoring_score +
            suggestion.evaluation_score) /
            12) *
            100);
    }
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "h-5 w-5 text-purple-600" }), "AI Control Recommendations"] }), _jsxs(DialogDescription, { children: ["Get AI-powered control suggestions for: ", _jsx("strong", { children: riskTitle })] })] }), _jsxs("div", { className: "space-y-4", children: [!loading && suggestions.length === 0 && !error && (_jsxs("div", { className: "text-center py-12", children: [_jsx(Sparkles, { className: "h-12 w-12 text-purple-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 mb-4", children: "Click below to get AI-powered control recommendations for this risk" }), _jsxs(Button, { onClick: handleGetSuggestions, children: [_jsx(Sparkles, { className: "h-4 w-4 mr-2" }), "Get AI Suggestions"] })] })), loading && (_jsxs("div", { className: "text-center py-12", children: [_jsx(Loader2, { className: "h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" }), _jsx("p", { className: "text-gray-600", children: "Analyzing risk and generating control recommendations..." }), _jsx("p", { className: "text-sm text-gray-500 mt-2", children: "This may take 10-20 seconds" })] })), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), suggestions.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Alert, { className: "border-purple-200 bg-purple-50", children: _jsxs(AlertDescription, { className: "text-purple-800", children: [_jsxs("strong", { children: [suggestions.length, " controls suggested."] }), " Review and select which controls to create. All selected controls will be automatically linked to this risk."] }) }), _jsx("div", { className: "space-y-3", children: suggestions.map((suggestion, index) => {
                                        const effectiveness = calculateEffectiveness(suggestion);
                                        const isSelected = selectedSuggestions.has(index);
                                        return (_jsxs(Card, { className: `cursor-pointer transition-all ${isSelected ? 'border-purple-600 bg-purple-50' : 'hover:border-gray-400'}`, onClick: () => toggleSuggestion(index), children: [_jsx(CardHeader, { className: "pb-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Checkbox, { checked: isSelected, onCheckedChange: () => toggleSuggestion(index), onClick: (e) => e.stopPropagation() }), _jsxs("div", { className: "flex-1", children: [_jsx(CardTitle, { className: "text-base", children: suggestion.name }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsx(Badge, { variant: "outline", className: "capitalize", children: suggestion.control_type }), _jsx(Badge, { variant: suggestion.target === 'Likelihood' ? 'default' : 'secondary', children: suggestion.target }), _jsxs(Badge, { className: effectiveness >= 67
                                                                                    ? 'bg-green-100 text-green-800'
                                                                                    : effectiveness >= 33
                                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                                        : 'bg-red-100 text-red-800', children: [effectiveness.toFixed(0), "% Effective"] })] })] })] }) }), _jsxs(CardContent, { children: [_jsx("p", { className: "text-sm text-gray-700 mb-3", children: suggestion.description }), _jsx("div", { className: "bg-gray-50 rounded p-3 mb-3", children: _jsxs("div", { className: "grid grid-cols-4 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Design:" }), ' ', _jsxs("span", { className: "font-semibold", children: [suggestion.design_score, "/3"] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Implementation:" }), ' ', _jsxs("span", { className: "font-semibold", children: [suggestion.implementation_score, "/3"] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Monitoring:" }), ' ', _jsxs("span", { className: "font-semibold", children: [suggestion.monitoring_score, "/3"] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Evaluation:" }), ' ', _jsxs("span", { className: "font-semibold", children: [suggestion.evaluation_score, "/3"] })] })] }) }), _jsxs("div", { className: "text-xs text-gray-600 italic border-l-2 border-purple-300 pl-3", children: [_jsx("strong", { children: "Rationale:" }), " ", suggestion.rationale] })] })] }, index));
                                    }) })] }))] }), suggestions.length > 0 && (_jsx(DialogFooter, { children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsxs("div", { className: "text-sm text-gray-600", children: [selectedSuggestions.size, " of ", suggestions.length, " selected"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: creating, children: "Cancel" }), _jsxs(Button, { onClick: handleGetSuggestions, variant: "outline", disabled: creating, children: [_jsx(Sparkles, { className: "h-4 w-4 mr-2" }), "Regenerate"] }), _jsx(Button, { onClick: handleCreateControls, disabled: creating || selectedSuggestions.size === 0, children: creating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Creating..."] })) : (_jsxs(_Fragment, { children: [_jsx(CheckCircle, { className: "h-4 w-4 mr-2" }), "Create ", selectedSuggestions.size, " Control", selectedSuggestions.size !== 1 ? 's' : ''] })) })] })] }) }))] }) }));
}
