import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Mapped Incidents View
 * Shows all incidents that have been mapped to risks
 */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IncidentDetailView } from './IncidentDetailView';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '../ui/table';
export function MappedIncidentsView() {
    const [incidents, setIncidents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    useEffect(() => {
        loadMappedIncidents();
    }, []);
    const loadMappedIncidents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Get incidents with RISK_MAPPED status (ACTIVE only, not VOIDED)
            const { data: incidentsData, error: incidentsError } = await supabase
                .from('incidents')
                .select('*')
                .eq('resolution_status', 'RISK_MAPPED')
                .eq('incident_status', 'ACTIVE') // Filter out voided incidents
                .order('classified_at', { ascending: false });
            if (incidentsError)
                throw incidentsError;
            // Get risk link counts for each incident
            const incidentsWithCounts = await Promise.all((incidentsData || []).map(async (incident) => {
                const { data: links, error: linksError } = await supabase
                    .from('incident_risk_links')
                    .select(`
              id,
              risks (
                risk_code
              )
            `)
                    .eq('incident_id', incident.id);
                if (linksError) {
                    console.error('Error fetching links for incident:', incident.id, linksError);
                    return {
                        ...incident,
                        linked_risk_count: 0,
                        linked_risk_codes: []
                    };
                }
                const riskCodes = links
                    ?.map(link => link.risks?.risk_code)
                    .filter(Boolean) || [];
                return {
                    ...incident,
                    linked_risk_count: links?.length || 0,
                    linked_risk_codes: riskCodes
                };
            }));
            setIncidents(incidentsWithCounts);
        }
        catch (err) {
            console.error('Error loading mapped incidents:', err);
            setError(err instanceof Error ? err.message : 'Failed to load mapped incidents');
        }
        finally {
            setIsLoading(false);
        }
    };
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
    // Filter incidents based on search query
    const filteredIncidents = searchQuery
        ? incidents.filter(incident => incident.incident_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            incident.linked_risk_codes?.some(code => code.toLowerCase().includes(searchQuery.toLowerCase())))
        : incidents;
    // If an incident is selected, show detail view
    if (selectedIncidentId) {
        return (_jsx(IncidentDetailView, { incidentId: selectedIncidentId, onClose: () => {
                setSelectedIncidentId(null);
                loadMappedIncidents(); // Refresh list in case anything changed
            } }));
    }
    if (isLoading) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "py-12", children: _jsx("p", { className: "text-center text-muted-foreground", children: "Loading mapped incidents..." }) }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold tracking-tight", children: "Mapped Incidents" }), _jsx("p", { className: "text-muted-foreground", children: "View and manage incidents that have been linked to risks" })] }), _jsxs(Badge, { variant: "outline", className: "text-sm", children: [incidents.length, " Total Mapped"] })] }), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), _jsx("div", { children: _jsx("input", { type: "text", placeholder: "Search by incident code, title, or linked risk...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full p-2 border rounded-md bg-background" }) }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: searchQuery ? `${filteredIncidents.length} Results` : 'All Mapped Incidents' }) }), _jsx(CardContent, { children: filteredIncidents.length === 0 ? (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-muted-foreground", children: searchQuery ? 'No incidents match your search' : 'No mapped incidents yet' }) })) : (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Incident" }), _jsx(TableHead, { children: "Severity" }), _jsx(TableHead, { children: "Type" }), _jsx(TableHead, { children: "Linked Risks" }), _jsx(TableHead, { children: "Classified" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: filteredIncidents.map((incident) => (_jsxs(TableRow, { className: "cursor-pointer hover:bg-muted/50", children: [_jsx(TableCell, { onClick: () => setSelectedIncidentId(incident.id), children: _jsxs("div", { children: [_jsx("div", { className: "font-mono text-xs text-muted-foreground mb-1", children: incident.incident_code }), _jsx("div", { className: "font-medium", children: incident.title }), _jsx("div", { className: "text-xs text-muted-foreground mt-1 line-clamp-1", children: incident.description })] }) }), _jsx(TableCell, { onClick: () => setSelectedIncidentId(incident.id), children: _jsx(Badge, { className: getSeverityColor(incident.severity), children: getSeverityText(incident.severity) }) }), _jsx(TableCell, { onClick: () => setSelectedIncidentId(incident.id), children: _jsx("span", { className: "text-sm", children: incident.incident_type }) }), _jsx(TableCell, { onClick: () => setSelectedIncidentId(incident.id), children: _jsxs("div", { children: [_jsxs(Badge, { variant: "outline", className: "mb-1", children: [incident.linked_risk_count, " ", incident.linked_risk_count === 1 ? 'Risk' : 'Risks'] }), incident.linked_risk_codes && incident.linked_risk_codes.length > 0 && (_jsxs("div", { className: "flex flex-wrap gap-1 mt-1", children: [incident.linked_risk_codes.slice(0, 3).map((code, idx) => (_jsx("span", { className: "text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded", children: code }, idx))), incident.linked_risk_codes.length > 3 && (_jsxs("span", { className: "text-xs text-muted-foreground", children: ["+", incident.linked_risk_codes.length - 3, " more"] }))] }))] }) }), _jsx(TableCell, { onClick: () => setSelectedIncidentId(incident.id), children: _jsx("div", { className: "text-xs text-muted-foreground", children: incident.classified_at
                                                        ? new Date(incident.classified_at).toLocaleDateString()
                                                        : 'N/A' }) }), _jsx(TableCell, { className: "text-right", children: _jsx(Button, { variant: "outline", size: "sm", onClick: (e) => {
                                                        e.stopPropagation();
                                                        setSelectedIncidentId(incident.id);
                                                    }, children: "View Details" }) })] }, incident.id))) })] })) })] })] }));
}
