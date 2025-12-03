import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * KRIDataEntry Component
 *
 * Enter KRI measurement data and view historical entries
 */
import { useState, useEffect } from 'react';
import { getKRIDefinitions, createKRIDataEntry, getKRIDataEntries, } from '@/lib/kri';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
export default function KRIDataEntry() {
    const [kris, setKris] = useState([]);
    const [selectedKRI, setSelectedKRI] = useState('');
    const [history, setHistory] = useState([]);
    const [formData, setFormData] = useState({
        value: '',
        period: '',
        notes: '',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    useEffect(() => {
        loadKRIs();
    }, []);
    useEffect(() => {
        if (selectedKRI) {
            loadHistory(selectedKRI);
        }
    }, [selectedKRI]);
    async function loadKRIs() {
        setLoading(true);
        try {
            const result = await getKRIDefinitions();
            if (result.error)
                throw new Error(result.error.message);
            setKris(result.data || []);
            if (result.data && result.data.length > 0) {
                setSelectedKRI(result.data[0].id);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load KRIs');
        }
        finally {
            setLoading(false);
        }
    }
    async function loadHistory(kriId) {
        try {
            const result = await getKRIDataEntries(kriId, 10);
            if (result.error)
                throw new Error(result.error.message);
            setHistory(result.data || []);
        }
        catch (err) {
            console.error('Load history error:', err);
        }
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        if (!selectedKRI || !formData.value) {
            setError('KRI and value are required');
            return;
        }
        try {
            const result = await createKRIDataEntry({
                kri_definition_id: selectedKRI,
                value: parseFloat(formData.value),
                period: formData.period || undefined,
                notes: formData.notes || undefined,
            });
            if (result.error)
                throw new Error(result.error.message);
            setSuccess(true);
            setFormData({ value: '', period: '', notes: '' });
            await loadHistory(selectedKRI);
            setTimeout(() => setSuccess(false), 3000);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save data entry');
        }
    }
    if (loading) {
        return _jsx("div", { className: "text-center py-12", children: "Loading..." });
    }
    if (kris.length === 0) {
        return (_jsx(Alert, { children: _jsx(AlertDescription, { children: "No KRI definitions found. Create KRI definitions first in the Definitions tab." }) }));
    }
    const selectedKRIObj = kris.find(k => k.id === selectedKRI);
    return (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "New Data Entry" }) }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Select KRI" }), _jsxs(Select, { value: selectedKRI, onValueChange: setSelectedKRI, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: kris.map((kri) => (_jsxs(SelectItem, { value: kri.id, children: [kri.kri_code, " - ", kri.kri_name] }, kri.id))) })] })] }), selectedKRIObj && (_jsxs("div", { className: "bg-blue-50 rounded p-3 text-sm", children: [_jsxs("p", { className: "font-medium", children: ["Unit: ", selectedKRIObj.unit_of_measure] }), _jsxs("p", { className: "text-gray-600", children: ["Frequency: ", selectedKRIObj.frequency] })] })), _jsxs("div", { children: [_jsx(Label, { children: "Value *" }), _jsx(Input, { type: "number", step: "any", value: formData.value, onChange: (e) => setFormData({ ...formData, value: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx(Label, { children: "Period (optional)" }), _jsx(Input, { type: "month", value: formData.period, onChange: (e) => setFormData({ ...formData, period: e.target.value }) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Notes (optional)" }), _jsx(Textarea, { value: formData.notes, onChange: (e) => setFormData({ ...formData, notes: e.target.value }), rows: 3 })] }), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), success && (_jsx(Alert, { className: "border-green-200 bg-green-50", children: _jsx(AlertDescription, { className: "text-green-800", children: "Data entry saved successfully!" }) })), _jsx(Button, { type: "submit", className: "w-full", children: "Save Entry" })] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Recent Entries" }) }), _jsx(CardContent, { children: history.length === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-8", children: "No entries yet" })) : (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Date" }), _jsx(TableHead, { children: "Value" }), _jsx(TableHead, { children: "Status" })] }) }), _jsx(TableBody, { children: history.map((entry) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "text-sm", children: new Date(entry.created_at).toLocaleDateString() }), _jsxs(TableCell, { className: "font-semibold", children: [entry.value, " ", selectedKRIObj?.unit_of_measure] }), _jsx(TableCell, { children: _jsx(Badge, { className: entry.alert_status === 'green'
                                                            ? 'bg-green-500'
                                                            : entry.alert_status === 'yellow'
                                                                ? 'bg-yellow-500'
                                                                : 'bg-red-500', children: entry.alert_status }) })] }, entry.id))) })] })) })] })] }) }));
}
