/**
 * Incident List Component
 * Displays user's incidents with filtering and search
 */

import React, { useEffect, useState } from 'react';
import { getUserIncidents } from '../../lib/incidents';
import type { IncidentSummary, IncidentFilters, IncidentStatus, IncidentSeverity } from '../../types/incident';
import { STATUS_OPTIONS, SEVERITY_OPTIONS, getStatusBadgeClass, getSeverityColor } from '../../types/incident';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface IncidentListProps {
  onSelectIncident?: (incidentId: string) => void;
  onNewIncident?: () => void;
}

export function IncidentList({ onSelectIncident, onNewIncident }: IncidentListProps) {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<IncidentFilters>({
    search: '',
    status: [],
    severity: [],
  });

  // Temporary filter inputs (before applying)
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Load incidents
  const loadIncidents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getUserIncidents(filters);

      if (fetchError) throw fetchError;

      setIncidents(data || []);
    } catch (err) {
      console.error('Error loading incidents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
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
      status: statusFilter === 'all' ? [] : [statusFilter as IncidentStatus],
      severity: severityFilter === 'all' ? [] : [severityFilter as IncidentSeverity],
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
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
  const getSeverityText = (sev: number) => {
    switch (sev) {
      case 1: return 'LOW';
      case 2: return 'MEDIUM';
      case 3: return 'HIGH';
      case 4: return 'CRITICAL';
      default: return 'UNKNOWN';
    }
  };

  const getSeverityColorClass = (sev: number) => {
    switch (sev) {
      case 1: return 'text-blue-600';
      case 2: return 'text-yellow-600';
      case 3: return 'text-orange-600';
      case 4: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Incidents</h2>
          <p className="text-muted-foreground">
            View and manage your incident reports
          </p>
        </div>
        {onNewIncident && (
          <Button onClick={onNewIncident}>
            Report New Incident
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter incidents by status, severity, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyFilters();
                }}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {SEVERITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} variant="default" size="sm">
              Apply Filters
            </Button>
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading incidents...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && incidents.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No incidents found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.status?.length || filters.severity?.length
                  ? 'Try adjusting your filters'
                  : "You haven't reported any incidents yet"}
              </p>
              {onNewIncident && !filters.search && (
                <Button onClick={onNewIncident}>Report Your First Incident</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incidents Table */}
      {!isLoading && incidents.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelectIncident?.(incident.id)}
                  >
                    <TableCell className="font-mono text-sm">
                      {incident.incident_code}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs">
                      <div className="truncate">{incident.title}</div>
                      {incident.linked_risk_code && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Linked to: {incident.linked_risk_code}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{incident.incident_type}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getSeverityColorClass(incident.severity)}`}>
                        {getSeverityText(incident.severity)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(incident.status)}>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(incident.incident_date)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(incident.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident?.(incident.id);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Results Count */}
      {!isLoading && incidents.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
