import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * AIAssistant Component
 *
 * AI-powered risk generation using Claude API.
 * Generates context-specific risks based on industry, business unit, and other parameters.
 */
import { useState } from 'react';
import { generateAIRisks } from '@/lib/ai';
import { createRisk, getRisks } from '@/lib/risks';
import { getActivePeriod } from '@/lib/periods-v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle, XCircle, EyeOff } from 'lucide-react';
const RISK_CATEGORIES = [
    'All Categories',
    'Operational',
    'Strategic',
    'Financial',
    'Compliance',
    'Technology',
    'Market',
    'Reputational',
];
export default function AIAssistant() {
    const [industry, setIndustry] = useState('');
    const [businessUnit, setBusinessUnit] = useState('');
    const [category, setCategory] = useState('All Categories');
    const [numberOfRisks, setNumberOfRisks] = useState(5);
    const [additionalContext, setAdditionalContext] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatedRisks, setGeneratedRisks] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showGenerator, setShowGenerator] = useState(true);
    const handleGenerate = async () => {
        setError(null);
        setSuccess(null);
        setGeneratedRisks([]);
        // Validation
        if (!industry.trim()) {
            setError('Please enter an industry or sector');
            return;
        }
        setGenerating(true);
        try {
            const { data, error: aiError } = await generateAIRisks(industry, businessUnit || industry, category, numberOfRisks, additionalContext || undefined);
            if (aiError) {
                setError(aiError.message);
                console.error('AI generation error:', aiError);
            }
            else if (data) {
                setGeneratedRisks(data);
                setSuccess(`Successfully generated ${data.length} risk${data.length > 1 ? 's' : ''}!`);
            }
        }
        catch (err) {
            console.error('Unexpected generation error:', err);
            setError('An unexpected error occurred');
        }
        finally {
            setGenerating(false);
        }
    };
    const handleAddRiskToRegister = async (risk, index) => {
        try {
            // Get active period
            const { data: activePeriod } = await getActivePeriod();
            // Get existing risks to check for code uniqueness
            const { data: existingRisks } = await getRisks();
            const existingCodes = new Set((existingRisks || []).map(r => r.risk_code));
            // Ensure unique risk code
            let riskCode = risk.risk_code;
            let counter = 1;
            while (existingCodes.has(riskCode)) {
                riskCode = `${risk.risk_code}-${counter}`;
                counter++;
            }
            const { error: createError } = await createRisk({
                risk_code: riskCode,
                risk_title: risk.risk_title,
                risk_description: risk.risk_description,
                category: risk.category,
                division: risk.division,
                department: risk.division, // Use division as department
                owner: risk.owner,
                likelihood_inherent: risk.likelihood_inherent,
                impact_inherent: risk.impact_inherent,
                status: risk.status,
                period: activePeriod || 'Q1 2025',
                is_priority: false,
            });
            if (createError) {
                alert(`Failed to add risk: ${createError.message}`);
                console.error('Create risk error:', createError);
            }
            else {
                // Remove from generated list
                setGeneratedRisks((prev) => prev.filter((_, i) => i !== index));
                if (generatedRisks.length === 1) {
                    setSuccess('All generated risks have been added to the register!');
                }
            }
        }
        catch (err) {
            console.error('Unexpected error adding risk:', err);
            alert('An unexpected error occurred');
        }
    };
    const handleAddAllRisks = async () => {
        try {
            const { data: activePeriod } = await getActivePeriod();
            // Get existing risks to check for code uniqueness
            const { data: existingRisks } = await getRisks();
            const existingCodes = new Set((existingRisks || []).map(r => r.risk_code));
            let successCount = 0;
            let failCount = 0;
            for (const risk of generatedRisks) {
                // Ensure unique risk code
                let riskCode = risk.risk_code;
                let counter = 1;
                while (existingCodes.has(riskCode)) {
                    riskCode = `${risk.risk_code}-${counter}`;
                    counter++;
                }
                // Add the used code to the set for next iteration
                existingCodes.add(riskCode);
                const { error: createError } = await createRisk({
                    risk_code: riskCode,
                    risk_title: risk.risk_title,
                    risk_description: risk.risk_description,
                    category: risk.category,
                    division: risk.division,
                    department: risk.division, // Use division as department
                    owner: risk.owner,
                    likelihood_inherent: risk.likelihood_inherent,
                    impact_inherent: risk.impact_inherent,
                    status: risk.status,
                    period: activePeriod || 'Q1 2025',
                    is_priority: false,
                });
                if (createError) {
                    failCount++;
                    console.error('Create risk error:', createError);
                }
                else {
                    successCount++;
                }
            }
            setGeneratedRisks([]);
            if (failCount > 0) {
                setSuccess(`Added ${successCount} risks to the register. ${failCount} failed.`);
            }
            else {
                setSuccess(`All ${successCount} risks have been added to the register!`);
            }
        }
        catch (err) {
            console.error('Unexpected error adding all risks:', err);
            alert('An unexpected error occurred');
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs(Card, { className: "border-purple-200 bg-gradient-to-r from-purple-50 to-white", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-purple-600 rounded-lg", children: _jsx(Sparkles, { className: "h-6 w-6 text-white" }) }), _jsxs("div", { children: [_jsx(CardTitle, { children: "AI Risk Generator" }), _jsx(CardDescription, { children: "Generate context-specific risks using Claude AI" })] })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setShowGenerator(!showGenerator), className: "border-purple-500 text-purple-600 hover:bg-purple-50", children: [_jsx(EyeOff, { className: "h-4 w-4 mr-2" }), showGenerator ? 'Hide Generator' : 'Show Generator'] })] }) }), showGenerator && (_jsx(CardContent, { children: _jsxs("div", { className: "space-y-6", children: [error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(XCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), success && (_jsxs(Alert, { className: "bg-green-50 border-green-200", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600" }), _jsx(AlertDescription, { className: "text-green-800", children: success })] })), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-700", children: "Risk Generation Context" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs(Label, { htmlFor: "industry", children: ["Industry / Sector ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Input, { id: "industry", placeholder: "e.g., Banking, Insurance, Healthcare", value: industry, onChange: (e) => setIndustry(e.target.value), disabled: generating })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "businessUnit", children: "Business Unit / Department" }), _jsx(Input, { id: "businessUnit", placeholder: "e.g., Trading Desk, IT Operations", value: businessUnit, onChange: (e) => setBusinessUnit(e.target.value), disabled: generating })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "category", children: "Risk Category" }), _jsxs(Select, { value: category, onValueChange: (value) => setCategory(value), disabled: generating, children: [_jsx(SelectTrigger, { id: "category", children: _jsx(SelectValue, { placeholder: "Select category" }) }), _jsx(SelectContent, { children: RISK_CATEGORIES.map((cat) => (_jsx(SelectItem, { value: cat, children: cat }, cat))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "numberOfRisks", children: "Number of Risks" }), _jsx(Input, { id: "numberOfRisks", type: "number", min: "1", max: "20", value: numberOfRisks, onChange: (e) => {
                                                                const value = parseInt(e.target.value) || 1;
                                                                setNumberOfRisks(Math.min(Math.max(value, 1), 20));
                                                            }, disabled: generating }), _jsx("p", { className: "text-xs text-gray-500", children: "Maximum 20 risks per generation" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "context", children: "Additional Context (Optional)" }), _jsx(Textarea, { id: "context", placeholder: "Provide any additional context, specific concerns, or areas of focus...", rows: 4, value: additionalContext, onChange: (e) => setAdditionalContext(e.target.value), disabled: generating })] }), _jsx(Button, { onClick: handleGenerate, disabled: generating || !industry.trim(), className: "w-full bg-purple-600 hover:bg-purple-700", size: "lg", children: generating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Generating Risks..."] })) : (_jsxs(_Fragment, { children: [_jsx(Sparkles, { className: "h-4 w-4 mr-2" }), "Generate Risks"] })) })] })] }) }))] }), generatedRisks.length > 0 && (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs(CardTitle, { children: ["Generated Risks (", generatedRisks.length, ")"] }), _jsx(Button, { onClick: handleAddAllRisks, size: "sm", children: "Add All to Register" })] }), _jsx(CardDescription, { children: "Review the AI-generated risks below and add them to your risk register" })] }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-4", children: generatedRisks.map((risk, index) => (_jsx(Card, { className: "border-l-4 border-l-purple-500", children: _jsx(CardContent, { className: "pt-4", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-xs font-mono bg-gray-100 px-2 py-1 rounded", children: risk.risk_code }), _jsx("span", { className: "text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded", children: risk.category })] }), _jsx("h4", { className: "font-semibold text-gray-900", children: risk.risk_title })] }), _jsx(Button, { size: "sm", onClick: () => handleAddRiskToRegister(risk, index), children: "Add to Register" })] }), _jsx("p", { className: "text-sm text-gray-600", children: risk.risk_description }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Division:" }), ' ', _jsx("span", { className: "font-medium", children: risk.division })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Owner:" }), ' ', _jsx("span", { className: "font-medium", children: risk.owner })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Likelihood:" }), ' ', _jsxs("span", { className: "font-medium", children: [risk.likelihood_inherent, "/5"] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Impact:" }), ' ', _jsxs("span", { className: "font-medium", children: [risk.impact_inherent, "/5"] })] })] }), _jsx("div", { className: "pt-2 border-t", children: _jsxs("p", { className: "text-xs text-gray-600 italic", children: [_jsx("strong", { children: "Rationale:" }), " ", risk.rationale] }) })] }) }) }, index))) }) })] }))] }));
}
