/**
 * Mapped Incidents View
 * Shows all incidents that have been mapped to risks
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IncidentDetailView } from './IncidentDetailView';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface MappedIncident {
  id: string;
  incident_code: string;
  title: string;
  description: string;
  incident_type: string;
  severity: number;
  resolution_status: string;
  classified_at: string | null;
  classified_by: string | null;
  created_at: string;
  linked_risk_count: number;
  linked_risk_codes: string[] | null;
}

export function MappedIncidentsView() {
  const [incidents, setIncidents] = useState<MappedIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
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
        .eq('incident_status', 'ACTIVE')  // Filter out voided incidents
        .order('classified_at', { ascending: false });

      if (incidentsError) throw incidentsError;

      // Get risk link counts for each incident
      const incidentsWithCounts = await Promise.all(
        (incidentsData || []).map(async (incident) => {
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
            ?.map(link => (link.risks as any)?.risk_code)
            .filter(Boolean) || [];

          return {
            ...incident,
            linked_risk_count: links?.length || 0,
            linked_risk_codes: riskCodes
          };
        })
      );

      setIncidents(incidentsWithCounts);
    } catch (err) {
      console.error('Error loading mapped incidents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mapped incidents');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityText = (sev: number) => {
    switch (sev) {
      case 1: return 'LOW';
      case 2: return 'MEDIUM';
      case 3: return 'HIGH';
      case 4: return 'CRITICAL';
      default: return 'UNKNOWN';
    }
  };

  const getSeverityColor = (sev: number) => {
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
    ? incidents.filter(
        incident =>
          incident.incident_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.linked_risk_codes?.some(code =>
            code.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : incidents;

  // If an incident is selected, show detail view
  if (selectedIncidentId) {
    return (
      <IncidentDetailView
        incidentId={selectedIncidentId}
        onClose={() => {
          setSelectedIncidentId(null);
          loadMappedIncidents(); // Refresh list in case anything changed
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Loading mapped incidents...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mapped Incidents</h2>
          <p className="text-muted-foreground">
            View and manage incidents that have been linked to risks
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {incidents.length} Total Mapped
        </Badge>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search by incident code, title, or linked risk..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded-md bg-background"
        />
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {searchQuery ? `${filteredIncidents.length} Results` : 'All Mapped Incidents'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'No incidents match your search' : 'No mapped incidents yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Linked Risks</TableHead>
                  <TableHead>Classified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow key={incident.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => setSelectedIncidentId(incident.id)}>
                      <div>
                        <div className="font-mono text-xs text-muted-foreground mb-1">
                          {incident.incident_code}
                        </div>
                        <div className="font-medium">{incident.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {incident.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => setSelectedIncidentId(incident.id)}>
                      <Badge className={getSeverityColor(incident.severity)}>
                        {getSeverityText(incident.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => setSelectedIncidentId(incident.id)}>
                      <span className="text-sm">{incident.incident_type}</span>
                    </TableCell>
                    <TableCell onClick={() => setSelectedIncidentId(incident.id)}>
                      <div>
                        <Badge variant="outline" className="mb-1">
                          {incident.linked_risk_count} {incident.linked_risk_count === 1 ? 'Risk' : 'Risks'}
                        </Badge>
                        {incident.linked_risk_codes && incident.linked_risk_codes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {incident.linked_risk_codes.slice(0, 3).map((code, idx) => (
                              <span
                                key={idx}
                                className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                              >
                                {code}
                              </span>
                            ))}
                            {incident.linked_risk_codes.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{incident.linked_risk_codes.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => setSelectedIncidentId(incident.id)}>
                      <div className="text-xs text-muted-foreground">
                        {incident.classified_at
                          ? new Date(incident.classified_at).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncidentId(incident.id);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
