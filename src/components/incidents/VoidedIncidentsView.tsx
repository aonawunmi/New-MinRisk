/**
 * Voided Incidents View - Admin Audit Interface
 *
 * Admin-only view showing all voided incidents for compliance and audit purposes.
 * Displays: incident code, title, void reason, voided by, voided at
 * Includes search/filter and link to lifecycle history
 */

import { useEffect, useState } from 'react';
import { getVoidedIncidents, getIncidentLifecycleHistory } from '../../lib/incidents';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { History, Search, AlertCircle } from 'lucide-react';

interface VoidedIncident {
  id: string;
  incident_code: string;
  title: string;
  description: string;
  incident_type: string;
  severity: number;
  incident_date: string;
  voided_at: string;
  voided_by: string;
  void_reason: string;
  created_at: string;
  financial_impact: number | null;
  voided_by_profile?: {
    full_name: string;
    email: string;
  };
}

interface LifecycleEntry {
  id: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  performed_by: string;
  performed_by_role: string;
  performed_at: string;
}

export function VoidedIncidentsView() {
  const [incidents, setIncidents] = useState<VoidedIncident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<VoidedIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Lifecycle history dialog state
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<VoidedIncident | null>(null);
  const [lifecycleHistory, setLifecycleHistory] = useState<LifecycleEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load voided incidents
  const loadVoidedIncidents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getVoidedIncidents();

      if (fetchError) throw fetchError;

      setIncidents(data || []);
      setFilteredIncidents(data || []);
    } catch (err) {
      console.error('Error loading voided incidents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voided incidents');
    } finally {
      setIsLoading(false);
    }
  };

  // Load lifecycle history for an incident
  const loadLifecycleHistory = async (incident: VoidedIncident) => {
    setSelectedIncident(incident);
    setShowHistoryDialog(true);
    setIsLoadingHistory(true);

    try {
      const { data, error: fetchError } = await getIncidentLifecycleHistory(incident.id);

      if (fetchError) throw fetchError;

      setLifecycleHistory(data || []);
    } catch (err) {
      console.error('Error loading lifecycle history:', err);
      setLifecycleHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Search/filter incidents
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredIncidents(incidents);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = incidents.filter(incident =>
      incident.incident_code.toLowerCase().includes(term) ||
      incident.title.toLowerCase().includes(term) ||
      incident.void_reason?.toLowerCase().includes(term) ||
      incident.voided_by_profile?.full_name?.toLowerCase().includes(term) ||
      incident.voided_by_profile?.email?.toLowerCase().includes(term)
    );

    setFilteredIncidents(filtered);
  }, [searchTerm, incidents]);

  useEffect(() => {
    loadVoidedIncidents();
  }, []);

  // Severity badge color
  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-100 text-red-800 border-red-200';
    if (severity === 3) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (severity === 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 4) return 'Critical';
    if (severity === 3) return 'High';
    if (severity === 2) return 'Medium';
    return 'Low';
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-500" />
                Voided Incidents - Audit Log
              </CardTitle>
              <p className="text-sm text-gray-500 mt-2">
                Admin-only view of all voided incidents for compliance and audit reporting
              </p>
            </div>
            <Badge variant="outline" className="text-base px-4 py-2">
              {filteredIncidents.length} Voided
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by incident code, title, reason, or admin name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Loading voided incidents...</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No voided incidents match your search' : 'No voided incidents found'}
              </p>
            </div>
          ) : (
            /* Table */
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Incident Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-center">Severity</TableHead>
                    <TableHead>Incident Date</TableHead>
                    <TableHead>Voided By</TableHead>
                    <TableHead>Voided At</TableHead>
                    <TableHead>Void Reason</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.map((incident) => (
                    <TableRow key={incident.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-semibold">
                        {incident.incident_code}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="font-medium">{incident.title}</div>
                        {incident.incident_type && (
                          <div className="text-xs text-gray-500 mt-1">
                            {incident.incident_type}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getSeverityColor(incident.severity)}>
                          {getSeverityText(incident.severity)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {incident.incident_date
                          ? new Date(incident.incident_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {incident.voided_by_profile?.full_name || 'Unknown Admin'}
                        </div>
                        {incident.voided_by_profile?.email && (
                          <div className="text-xs text-gray-500">
                            {incident.voided_by_profile.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(incident.voided_at)}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-gray-700 truncate" title={incident.void_reason}>
                          {incident.void_reason || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadLifecycleHistory(incident)}
                          className="text-xs"
                        >
                          <History className="h-3 w-3 mr-1" />
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Incident Lifecycle History - {selectedIncident?.incident_code}
            </DialogTitle>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Loading history...</p>
            </div>
          ) : lifecycleHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No lifecycle history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lifecycleHistory.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={entry.action === 'VOIDED' ? 'destructive' : 'default'}
                          >
                            {entry.action}
                          </Badge>
                          {entry.previous_status && (
                            <span className="text-sm text-gray-500">
                              {entry.previous_status} → {entry.new_status}
                            </span>
                          )}
                        </div>

                        {entry.reason && (
                          <div className="bg-gray-50 p-3 rounded-md mb-2">
                            <p className="text-sm font-medium text-gray-700">Reason:</p>
                            <p className="text-sm text-gray-600 mt-1">{entry.reason}</p>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-2">
                          <span className="font-medium">Performed by:</span>{' '}
                          {entry.performed_by_role}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 text-right ml-4">
                        {formatDate(entry.performed_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowHistoryDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
