import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ControlForm Component
 *
 * Form for creating/editing risk controls with DIME framework scoring
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
const DIME_LABELS = {
    0: 'Not Implemented',
    1: 'Weak',
    2: 'Adequate',
    3: 'Strong',
};
const DIME_DESCRIPTIONS = {
    design: {
        0: 'No control design exists',
        1: 'Control design is weak or inadequate',
        2: 'Control design is adequate and appropriate',
        3: 'Control design is strong and comprehensive',
    },
    implementation: {
        0: 'Control not implemented',
        1: 'Control poorly or inconsistently implemented',
        2: 'Control adequately implemented across key areas',
        3: 'Control fully and consistently implemented',
    },
    monitoring: {
        0: 'No monitoring of control performance',
        1: 'Weak or sporadic monitoring',
        2: 'Regular monitoring with documented reviews',
        3: 'Continuous monitoring with automated alerts',
    },
    evaluation: {
        0: 'No effectiveness evaluation performed',
        1: 'Informal or infrequent effectiveness reviews',
        2: 'Periodic formal effectiveness assessments',
        3: 'Comprehensive ongoing effectiveness testing',
    },
};
export default function ControlForm({ open, onOpenChange, onSave, editingControl, riskId, availableRisks = [], }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        control_type: null,
        target: 'Likelihood',
        risk_id: riskId || '',
        design_score: null,
        implementation_score: null,
        monitoring_score: null,
        evaluation_score: null,
    });
    // Debug: Log available risks when form opens
    useEffect(() => {
        if (open) {
            console.log('ControlForm opened. Available risks:', availableRisks);
            console.log('Number of available risks:', availableRisks.length);
        }
    }, [open, availableRisks]);
    // Initialize form when editing
    useEffect(() => {
        if (editingControl) {
            setFormData({
                name: editingControl.name,
                description: editingControl.description || '',
                control_type: editingControl.control_type,
                target: editingControl.target,
                risk_id: editingControl.risk_id,
                design_score: editingControl.design_score,
                implementation_score: editingControl.implementation_score,
                monitoring_score: editingControl.monitoring_score,
                evaluation_score: editingControl.evaluation_score,
            });
        }
        else {
            // Reset for new control
            setFormData({
                name: '',
                description: '',
                control_type: null,
                target: 'Likelihood',
                risk_id: riskId || '', // Use provided riskId or empty
                design_score: null,
                implementation_score: null,
                monitoring_score: null,
                evaluation_score: null,
            });
        }
    }, [editingControl, open, riskId]);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Control name is required');
            return;
        }
        if (!formData.risk_id) {
            alert('Please select a risk for this control');
            return;
        }
        // Build the data object
        const data = {
            name: formData.name,
            description: formData.description || null,
            control_type: formData.control_type || null, // Convert empty string to null
            target: formData.target,
            risk_id: formData.risk_id,
            design_score: formData.design_score,
            implementation_score: formData.implementation_score,
            monitoring_score: formData.monitoring_score,
            evaluation_score: formData.evaluation_score,
        };
        onSave(data);
    };
    const renderDIMEScoreSelector = (dimension, label, value, onChange) => {
        const descriptions = DIME_DESCRIPTIONS[dimension];
        return (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "font-semibold", children: label }), _jsx("div", { className: "grid grid-cols-4 gap-2", children: [0, 1, 2, 3].map((score) => (_jsxs("button", { type: "button", onClick: () => onChange(score), className: `
                p-3 rounded-lg border-2 text-center transition-all
                ${value === score
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
              `, children: [_jsx("div", { className: "font-bold text-lg", children: score }), _jsx("div", { className: "text-xs text-gray-600 mt-1", children: DIME_LABELS[score] })] }, score))) }), value !== null && (_jsx("p", { className: "text-sm text-gray-600 bg-gray-50 p-2 rounded", children: descriptions[value] }))] }));
    };
    const calculateEffectiveness = () => {
        const { design_score, implementation_score, monitoring_score, evaluation_score } = formData;
        if (design_score === null ||
            implementation_score === null ||
            monitoring_score === null ||
            evaluation_score === null) {
            return null;
        }
        if (design_score === 0 || implementation_score === 0) {
            return 0;
        }
        return (((design_score + implementation_score + monitoring_score + evaluation_score) / 12) * 100);
    };
    const effectiveness = calculateEffectiveness();
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[90vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: editingControl ? 'Edit Control' : 'Add New Control' }), _jsx(DialogDescription, { children: editingControl
                                ? 'Update control details and DIME scores.'
                                : 'Create a new risk control with DIME framework assessment.' })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [editingControl && (_jsxs("div", { children: [_jsx(Label, { children: "Control Code" }), _jsx(Input, { value: editingControl.control_code, disabled: true, className: "bg-gray-50" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Control codes cannot be changed" })] })), !editingControl && (_jsx(Alert, { children: _jsx(AlertDescription, { children: "Control code will be auto-generated (e.g., CTRL-001, CTRL-002)" }) })), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Control Name *" }), _jsx(Input, { value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), placeholder: "e.g., Daily reconciliation of accounts", required: true })] }), _jsxs("div", { children: [_jsx(Label, { children: "Description" }), _jsx(Textarea, { value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), placeholder: "Detailed description of how this control works...", rows: 3 })] }), !riskId && (_jsxs("div", { children: [_jsx(Label, { children: "Linked Risk *" }), _jsxs(Select, { value: formData.risk_id, onValueChange: (value) => setFormData({ ...formData, risk_id: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select a risk" }) }), _jsx(SelectContent, { children: availableRisks.length === 0 ? (_jsx("div", { className: "p-2 text-sm text-gray-500", children: "No risks available. Create a risk first." })) : (availableRisks.map((risk) => (_jsxs(SelectItem, { value: risk.id, children: [risk.risk_code, " - ", risk.risk_title] }, risk.id)))) })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Which risk does this control mitigate?" })] })), riskId && (_jsxs("div", { children: [_jsx(Label, { children: "Linked Risk" }), _jsx("div", { className: "bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm", children: availableRisks.find((r) => r.id === riskId)
                                                ? `${availableRisks.find((r) => r.id === riskId)?.risk_code} - ${availableRisks.find((r) => r.id === riskId)?.risk_title}`
                                                : 'Selected risk' })] })), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Control Type" }), _jsxs(Select, { value: formData.control_type || '', onValueChange: (value) => setFormData({ ...formData, control_type: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select type" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "preventive", children: "Preventive" }), _jsx(SelectItem, { value: "detective", children: "Detective" }), _jsx(SelectItem, { value: "corrective", children: "Corrective" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Target Dimension *" }), _jsxs(Select, { value: formData.target, onValueChange: (value) => setFormData({ ...formData, target: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Likelihood", children: "Likelihood" }), _jsx(SelectItem, { value: "Impact", children: "Impact" })] })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Which risk dimension does this control reduce?" })] })] })] }), _jsxs("div", { className: "border-t pt-6 space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-1", children: "DIME Framework Assessment" }), _jsx("p", { className: "text-sm text-gray-600", children: "Rate each dimension from 0 (Not Implemented) to 3 (Strong)" })] }), renderDIMEScoreSelector('design', 'Design (D)', formData.design_score, (value) => setFormData({ ...formData, design_score: value })), renderDIMEScoreSelector('implementation', 'Implementation (I)', formData.implementation_score, (value) => setFormData({ ...formData, implementation_score: value })), renderDIMEScoreSelector('monitoring', 'Monitoring (M)', formData.monitoring_score, (value) => setFormData({ ...formData, monitoring_score: value })), renderDIMEScoreSelector('evaluation', 'Effectiveness Evaluation (E)', formData.evaluation_score, (value) => setFormData({ ...formData, evaluation_score: value })), effectiveness !== null && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx(Label, { className: "text-blue-900", children: "Overall Control Effectiveness" }), _jsxs("div", { className: "flex items-center gap-4 mt-2", children: [_jsx("div", { className: "flex-1", children: _jsx("div", { className: "w-full bg-gray-200 rounded-full h-4", children: _jsx("div", { className: "bg-blue-600 h-4 rounded-full transition-all", style: { width: `${effectiveness}%` } }) }) }), _jsxs("div", { className: "text-2xl font-bold text-blue-900", children: [effectiveness.toFixed(0), "%"] })] }), _jsxs("p", { className: "text-xs text-blue-800 mt-2", children: ["Formula: (D + I + M + E) / 12 = (", formData.design_score, " + ", formData.implementation_score, " + ", formData.monitoring_score, " + ", formData.evaluation_score, ") / 12 = ", effectiveness.toFixed(0), "%"] }), (formData.design_score === 0 || formData.implementation_score === 0) && (_jsx(Alert, { className: "mt-3", children: _jsx(AlertDescription, { className: "text-sm", children: "\u26A0\uFE0F Controls with Design=0 or Implementation=0 have 0% effectiveness" }) }))] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: editingControl ? 'Update Control' : 'Create Control' })] })] })] }) }));
}
