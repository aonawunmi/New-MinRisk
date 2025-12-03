import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Incident List Component
 * Displays user's incidents with filtering and search
 */
import { useEffect, useState } from 'react';
import { getUserIncidents } from '../../lib/incidents';
import { STATUS_OPTIONS, SEVERITY_OPTIONS, getStatusBadgeClass } from '../../types/incident';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '../ui/table';
export function IncidentList({ onSelectIncident, onNewIncident }) {
    const [incidents, setIncidents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        status: [],
        severity: [],
    });
    // Temporary filter inputs (before applying)
    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    // Load incidents
    const loadIncidents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await getUserIncidents(filters);
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
    // Initial load
    useEffect(() => {
        loadIncidents();
    }, [filters]);
    const handleApplyFilters = () => {
        setFilters({
            search: searchInput.trim() || undefined,
            status: statusFilter === 'all' ? [] : [statusFilter],
            severity: severityFilter === 'all' ? [] : [severityFilter],
        });
    };
    const handleClearFilters = () => {
        setSearchInput('');
        setStatusFilter('all');
        setSeverityFilter('all');
        setFilters({
            search: undefined,
            status: [],
            severity: [],
        });
    };
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    // Convert severity integer to text
    const getSeverityText = (sev) => {
        switch (sev) {
            case 1: return 'LOW';
            case 2: return 'MEDIUM';
            case 3: return 'HIGH';
            case 4: return 'CRITICAL';
            default: return 'UNKNOWN';
        }
    };
    const getSeverityColorClass = (sev) => {
        switch (sev) {
            case 1: return 'text-blue-600';
            case 2: return 'text-yellow-600';
            case 3: return 'text-orange-600';
            case 4: return 'text-red-600';
            default: return 'text-gray-600';
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold tracking-tight", children: "My Incidents" }), _jsx("p", { className: "text-muted-foreground", children: "View and manage your incident reports" })] }), onNewIncident && (_jsx(Button, { onClick: onNewIncident, children: "Report New Incident" }))] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg", children: "Filters" }), _jsx(CardDescription, { children: "Filter incidents by status, severity, or search" })] }), _jsxs(CardContent, { children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx("div", { className: "md:col-span-2", children: _jsx(Input, { placeholder: "Search by title or description...", value: searchInput, onChange: (e) => setSearchInput(e.target.value), onKeyDown: (e) => {
                                                if (e.key === 'Enter')
                                                    handleApplyFilters();
                                            } }) }), _jsx("div", { children: _jsxs(Select, { value: statusFilter, onValueChange: setStatusFilter, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "All Statuses" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Statuses" }), STATUS_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value)))] })] }) }), _jsx("div", { children: _jsxs(Select, { value: severityFilter, onValueChange: setSeverityFilter, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "All Severities" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Severities" }), SEVERITY_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: _jsx("span", { className: option.color, children: option.label }) }, option.value)))] })] }) })] }), _jsxs("div", { className: "flex gap-2 mt-4", children: [_jsx(Button, { onClick: handleApplyFilters, variant: "default", size: "sm", children: "Apply Filters" }), _jsx(Button, { onClick: handleClearFilters, variant: "outline", size: "sm", children: "Clear Filters" })] })] })] }), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), isLoading && (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-muted-foreground", children: "Loading incidents..." }) })), !isLoading && incidents.length === 0 && (_jsx(Card, { children: _jsx(CardContent, { className: "py-12", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "No incidents found" }), _jsx("p", { className: "text-muted-foreground mb-4", children: filters.search || filters.status?.length || filters.severity?.length
                                    ? 'Try adjusting your filters'
                                    : "You haven't reported any incidents yet" }), onNewIncident && !filters.search && (_jsx(Button, { onClick: onNewIncident, children: "Report Your First Incident" }))] }) }) })), !isLoading && incidents.length > 0 && (_jsx(Card, { children: _jsx(CardContent, { className: "p-0", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Incident Code" }), _jsx(TableHead, { children: "Title" }), _jsx(TableHead, { children: "Type" }), _jsx(TableHead, { children: "Severity" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Occurred" }), _jsx(TableHead, { children: "Reported" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: incidents.map((incident) => (_jsxs(TableRow, { className: "cursor-pointer hover:bg-muted/50", onClick: () => onSelectIncident?.(incident.id), children: [_jsx(TableCell, { className: "font-mono text-sm", children: incident.incident_code }), _jsxs(TableCell, { className: "font-medium max-w-xs", children: [_jsx("div", { className: "truncate", children: incident.title }), incident.linked_risk_code && (_jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: ["Linked to: ", incident.linked_risk_code] }))] }), _jsx(TableCell, { children: _jsx("span", { className: "text-sm", children: incident.incident_type }) }), _jsx(TableCell, { children: _jsx("span", { className: `font-medium ${getSeverityColorClass(incident.severity)}`, children: getSeverityText(incident.severity) }) }), _jsx(TableCell, { children: _jsx(Badge, { className: getStatusBadgeClass(incident.status), children: incident.status }) }), _jsx(TableCell, { className: "text-sm text-muted-foreground", children: formatDate(incident.incident_date) }), _jsx(TableCell, { className: "text-sm text-muted-foreground", children: formatDate(incident.created_at) }), _jsx(TableCell, { className: "text-right", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: (e) => {
                                                    e.stopPropagation();
                                                    onSelectIncident?.(incident.id);
                                                }, children: "View" }) })] }, incident.id))) })] }) }) })), !isLoading && incidents.length > 0 && (_jsxs("div", { className: "text-sm text-muted-foreground text-center", children: ["Showing ", incidents.length, " incident", incidents.length !== 1 ? 's' : ''] }))] }));
}
