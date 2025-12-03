import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * KRIAlerts Component
 *
 * View and manage KRI alerts generated from threshold breaches
 */
import { useState, useEffect } from 'react';
import { getKRIAlerts, acknowledgeKRIAlert, resolveKRIAlert, } from '@/lib/kri';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
export default function KRIAlerts() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('open');
    useEffect(() => {
        loadAlerts();
    }, [filter]);
    async function loadAlerts() {
        setLoading(true);
        setError(null);
        try {
            const result = await getKRIAlerts(filter === 'all' ? undefined : filter);
            if (result.error)
                throw new Error(result.error.message);
            setAlerts(result.data || []);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load alerts');
        }
        finally {
            setLoading(false);
        }
    }
    async function handleAcknowledge(id) {
        try {
            const result = await acknowledgeKRIAlert(id);
            if (result.error)
                throw new Error(result.error.message);
            await loadAlerts();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to acknowledge alert');
        }
    }
    async function handleResolve(id) {
        const resolution = prompt('Enter resolution notes:');
        if (!resolution)
            return;
        try {
            const result = await resolveKRIAlert(id, resolution);
            if (result.error)
                throw new Error(result.error.message);
            await loadAlerts();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to resolve alert');
        }
    }
    if (loading) {
        return _jsx("div", { className: "text-center py-12", children: "Loading alerts..." });
    }
    if (error) {
        return (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-xl font-semibold", children: "KRI Alerts" }), _jsx("div", { className: "flex gap-2", children: ['all', 'open', 'acknowledged', 'resolved'].map((f) => (_jsx(Button, { size: "sm", variant: filter === f ? 'default' : 'outline', onClick: () => setFilter(f), children: f.charAt(0).toUpperCase() + f.slice(1) }, f))) })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsx(Card, { className: "border-red-200 bg-red-50", children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold text-red-900", children: alerts.filter(a => a.alert_level === 'red' && a.status === 'open').length }), _jsx("div", { className: "text-sm text-red-700", children: "Critical Alerts" })] }) }), _jsx(Card, { className: "border-yellow-200 bg-yellow-50", children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold text-yellow-900", children: alerts.filter(a => a.alert_level === 'yellow' && a.status === 'open').length }), _jsx("div", { className: "text-sm text-yellow-700", children: "Warning Alerts" })] }) }), _jsx(Card, { className: "border-gray-200 bg-gray-50", children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold text-gray-900", children: alerts.filter(a => a.status === 'acknowledged').length }), _jsx("div", { className: "text-sm text-gray-700", children: "Acknowledged" })] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["Alerts (", alerts.length, ")"] }) }), _jsx(CardContent, { children: alerts.length === 0 ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-600", children: "No alerts to display" }) })) : (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Level" }), _jsx(TableHead, { children: "KRI" }), _jsx(TableHead, { children: "Value" }), _jsx(TableHead, { children: "Threshold" }), _jsx(TableHead, { children: "Date" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Actions" })] }) }), _jsx(TableBody, { children: alerts.map((alert) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsx(Badge, { className: alert.alert_level === 'red'
                                                        ? 'bg-red-500'
                                                        : alert.alert_level === 'yellow'
                                                            ? 'bg-yellow-500'
                                                            : 'bg-green-500', children: alert.alert_level.toUpperCase() }) }), _jsx(TableCell, { className: "font-medium", children: alert.kri_code }), _jsx(TableCell, { className: "font-semibold", children: alert.measured_value }), _jsx(TableCell, { className: "text-sm text-gray-600", children: alert.threshold_breached }), _jsx(TableCell, { className: "text-sm", children: new Date(alert.created_at).toLocaleDateString() }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", children: alert.status }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex gap-2", children: [alert.status === 'open' && (_jsx(Button, { size: "sm", variant: "outline", onClick: () => handleAcknowledge(alert.id), children: "Acknowledge" })), alert.status === 'acknowledged' && (_jsx(Button, { size: "sm", onClick: () => handleResolve(alert.id), children: "Resolve" }))] }) })] }, alert.id))) })] })) })] })] }));
}
