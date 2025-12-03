import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Organization Settings Component
 *
 * Allows admins to configure organization-wide settings:
 * - Risk matrix size (3x3 or 5x5)
 * - Risk appetite statement
 * - Risk tolerance level
 * - Active period
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generatePeriodOptions, formatPeriod } from '@/lib/periods-v2';
import { getCurrentUserProfile } from '@/lib/profiles';
// Generate period options (formatted strings like "Q1 2025")
const PERIOD_OPTIONS = generatePeriodOptions().map(p => formatPeriod(p));
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Settings } from 'lucide-react';
export default function OrganizationSettings() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // Form state
    const [matrixSize, setMatrixSize] = useState(5);
    const [riskAppetite, setRiskAppetite] = useState('');
    const [riskTolerance, setRiskTolerance] = useState('');
    const [activePeriod, setActivePeriodState] = useState('Q1 2025');
    // Feedback
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        loadConfig();
    }, []);
    async function loadConfig() {
        setLoading(true);
        setError(null);
        try {
            // Get current user's organization
            const { data: profile } = await getCurrentUserProfile();
            if (!profile) {
                setError('Could not load user profile');
                return;
            }
            // Fetch risk config
            const { data, error: configError } = await supabase
                .from('risk_configs')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .single();
            if (configError) {
                console.error('Load config error:', configError);
                setError(configError.message);
                return;
            }
            setConfig(data);
            setMatrixSize(data.matrix_size);
            setRiskAppetite(data.risk_appetite_statement || '');
            setRiskTolerance(data.risk_tolerance_level || '');
            setActivePeriodState(data.active_period);
        }
        catch (err) {
            console.error('Unexpected error loading config:', err);
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSave() {
        if (!config)
            return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            // Update risk_configs
            const { error: updateError } = await supabase
                .from('risk_configs')
                .update({
                matrix_size: matrixSize,
                risk_appetite_statement: riskAppetite || null,
                risk_tolerance_level: riskTolerance || null,
                active_period: activePeriod,
            })
                .eq('id', config.id);
            if (updateError)
                throw updateError;
            setSuccess('Settings saved successfully');
            await loadConfig();
        }
        catch (err) {
            console.error('Save settings error:', err);
            setError(err.message);
        }
        finally {
            setSaving(false);
        }
    }
    if (loading) {
        return _jsx("div", { className: "text-center py-8", children: "Loading settings..." });
    }
    if (!config) {
        return (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: "Could not load organization settings. Please try refreshing the page." })] }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), success && (_jsxs(Alert, { className: "bg-green-50 border-green-200", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600" }), _jsx(AlertDescription, { className: "text-green-800", children: success })] })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-blue-600 rounded-lg", children: _jsx(Settings, { className: "h-6 w-6 text-white" }) }), _jsxs("div", { children: [_jsx(CardTitle, { children: "Organization Settings" }), _jsx(CardDescription, { children: "Configure risk management settings for your organization" })] })] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "matrix-size", children: "Risk Matrix Size" }), _jsxs(Select, { value: matrixSize.toString(), onValueChange: (value) => setMatrixSize(parseInt(value)), children: [_jsx(SelectTrigger, { id: "matrix-size", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "5", children: "5\u00D75 Matrix (Standard)" }), _jsx(SelectItem, { value: "6", children: "6\u00D76 Matrix (Advanced)" })] })] }), _jsx("p", { className: "text-sm text-gray-600", children: "Determines the granularity of likelihood and impact assessments" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "active-period", children: "Active Period" }), _jsxs(Select, { value: activePeriod, onValueChange: (value) => setActivePeriodState(value), children: [_jsx(SelectTrigger, { id: "active-period", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: PERIOD_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] }), _jsx("p", { className: "text-sm text-gray-600", children: "The current period for risk register entries" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "risk-appetite", children: "Risk Appetite Statement (Optional)" }), _jsx(Textarea, { id: "risk-appetite", value: riskAppetite, onChange: (e) => setRiskAppetite(e.target.value), placeholder: "Define the level and type of risk your organization is willing to accept...", rows: 4 }), _jsx("p", { className: "text-sm text-gray-600", children: "High-level statement defining the organization's willingness to take on risk" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "risk-tolerance", children: "Risk Tolerance Level (Optional)" }), _jsx(Textarea, { id: "risk-tolerance", value: riskTolerance, onChange: (e) => setRiskTolerance(e.target.value), placeholder: "Specify specific thresholds and limits for acceptable risk levels...", rows: 4 }), _jsx("p", { className: "text-sm text-gray-600", children: "Specific, measurable thresholds for different risk categories" })] }), _jsx("div", { className: "flex justify-end pt-4", children: _jsx(Button, { onClick: handleSave, disabled: saving, size: "lg", children: saving ? 'Saving...' : 'Save Settings' }) })] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "System Information" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Configuration ID:" }), _jsx("p", { className: "font-mono text-xs", children: config.id })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Organization ID:" }), _jsx("p", { className: "font-mono text-xs", children: config.organization_id })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Created:" }), _jsx("p", { children: new Date(config.created_at).toLocaleString() })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Last Updated:" }), _jsx("p", { children: new Date(config.updated_at).toLocaleString() })] })] }) })] })] }));
}
