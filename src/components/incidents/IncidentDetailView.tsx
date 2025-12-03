/**
 * Incident Detail View
 * Shows full incident details with all linked risks and mapping history
 */

import React, { useState, useEffect } from 'react';
import {
  getIncidentById,
  getIncidentRiskLinks,
  getIncidentMappingHistory,
  deleteIncidentRiskLink,
  voidIncident
} from '../../lib/incidents';
import { AddRiskLinkModal } from './AddRiskLinkModal';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';

interface IncidentDetailViewProps {
  incidentId: string;
  onClose: () => void;
}

interface RiskLink {
  id: string;
  incident_id: string;
  risk_id: string;
  link_type: string;
  linked_by: string;
  linked_at: string;
  mapping_source: string;
  classification_confidence: number;
  notes: string | null;
  mapping_reason: string | null;
  risks: {
    id: string;
    risk_code: string;
    risk_title: string;
    category: string;
    status: string;
  } | null;
}

interface MappingHistory {
  id: string;
  action: string;
  link_type: string | null;
  mapping_source: string | null;
  admin_classification_confidence: number | null;
  performed_by_role: string | null;
  admin_notes: string | null;
  created_at: string;
  risks: {
    risk_code: string;
    risk_title: string;
  } | null;
}

export function IncidentDetailView({ incidentId, onClose }: IncidentDetailViewProps) {
  const [incident, setIncident] = useState<any>(null);
  const [riskLinks, setRiskLinks] = useState<RiskLink[]>([]);
  const [mappingHistory, setMappingHistory] = useState<MappingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Void incident state
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    loadIncidentDetails();
  }, [incidentId]);

  const loadIncidentDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load incident details
      const { data: incidentData, error: incidentError } = await getIncidentById(incidentId);
      if (incidentError) throw incidentError;
      setIncident(incidentData);

      // Load risk links
      const { data: linksData, error: linksError } = await getIncidentRiskLinks(incidentId);
      if (linksError) throw linksError;
      setRiskLinks(linksData || []);

      // Load mapping history
      const { data: historyData, error: historyError } = await getIncidentMappingHistory(incidentId);
      if (historyError) throw historyError;
      setMappingHistory(historyData || []);
    } catch (err) {
      console.error('Error loading incident details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load incident details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (riskId: string, riskTitle: string) => {
    if (!confirm(`Are you sure you want to remove the link to "${riskTitle}"?`)) {
      return;
    }

    setDeletingLinkId(riskId);
    setError(null);

    try {
      const { error: deleteError } = await deleteIncidentRiskLink(
        incidentId,
        riskId,
        'Link removed by admin via detail view'
      );

      if (deleteError) throw deleteError;

      // Show success message
      setSuccessMessage(`Risk link removed successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reload data
      await loadIncidentDetails();
    } catch (err) {
      console.error('Error deleting risk link:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete risk link');
    } finally {
      setDeletingLinkId(null);
    }
  };

  const handleVoidIncident = async () => {
    if (!voidReason.trim()) {
      setError('Please provide a reason for voiding this incident');
      return;
    }

    setIsVoiding(true);
    setError(null);

    try {
      const { error: voidError } = await voidIncident(incidentId, voidReason);

      if (voidError) throw voidError;

      // Success - show message and close
      setSuccessMessage('Incident voided successfully. Returning to list...');
      setTimeout(() => {
        onClose(); // Return to incident list
      }, 2000);
    } catch (err) {
      console.error('Error voiding incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to void incident');
    } finally {
      setIsVoiding(false);
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

  const getLinkTypeColor = (linkType: string) => {
    switch (linkType) {
      case 'PRIMARY': return 'bg-red-100 text-red-800';
      case 'SECONDARY': return 'bg-yellow-100 text-yellow-800';
      case 'CONTRIBUTORY': return 'bg-orange-100 text-orange-800';
      case 'ASSOCIATED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLinkTypeIcon = (linkType: string) => {
    switch (linkType) {
      case 'PRIMARY': return '🔴';
      case 'SECONDARY': return '🟡';
      case 'CONTRIBUTORY': return '🟠';
      case 'ASSOCIATED': return '🔵';
      default: return '⚪';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED': return 'text-green-600';
      case 'UPDATED': return 'text-blue-600';
      case 'DELETED': return 'text-red-600';
      case 'REJECTED': return 'text-orange-600';
      case 'PREVIOUS_STATE': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Loading incident details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!incident) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-destructive">Incident not found</p>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={onClose}>Go Back</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              ← Back
            </Button>
            <Badge className={getSeverityColor(incident.severity)}>
              {getSeverityText(incident.severity)}
            </Badge>
            <Badge variant="outline">{incident.resolution_status}</Badge>
          </div>
          <h2 className="text-2xl font-bold">{incident.title}</h2>
          <p className="text-sm text-muted-foreground">
            {incident.incident_code} • {incident.incident_type}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)}>
            + Link to Risk
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowVoidDialog(true)}
          >
            Void Incident
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Incident Details */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="mt-1 text-sm">{incident.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Incident Date</Label>
              <p className="mt-1 text-sm">
                {incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Financial Impact</Label>
              <p className="mt-1 text-sm">
                {incident.financial_impact ? `$${incident.financial_impact.toLocaleString()}` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Risks */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Linked Risks ({riskLinks.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {riskLinks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No risks linked to this incident yet</p>
              <Button onClick={() => setShowAddModal(true)}>
                Link First Risk
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {riskLinks.map((link) => (
                <div
                  key={link.id}
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Risk Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getLinkTypeIcon(link.link_type)}</span>
                        <Badge className={getLinkTypeColor(link.link_type)}>
                          {link.link_type}
                        </Badge>
                        <span className="font-mono font-semibold text-primary">
                          {link.risks?.risk_code || 'N/A'}
                        </span>
                      </div>
                      <h4 className="font-semibold mb-1">
                        {link.risks?.risk_title || 'Risk Not Found'}
                      </h4>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span>Confidence: {link.classification_confidence}%</span>
                        <span>Source: {link.mapping_source}</span>
                        <span>Linked: {new Date(link.linked_at).toLocaleDateString()}</span>
                      </div>

                      {/* Notes */}
                      {link.notes && (
                        <p className="text-sm text-muted-foreground italic mt-2">
                          "{link.notes}"
                        </p>
                      )}
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLink(link.risk_id, link.risks?.risk_title || 'this risk')}
                      disabled={deletingLinkId === link.risk_id}
                    >
                      {deletingLinkId === link.risk_id ? 'Removing...' : '✗ Remove'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapping History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Mapping History ({mappingHistory.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </Button>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {mappingHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No history yet</p>
            ) : (
              <div className="space-y-2">
                {mappingHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 border-l-4 border-muted bg-muted/30 rounded text-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-semibold ${getActionColor(entry.action)}`}>
                        {entry.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.risks && (
                      <p className="text-muted-foreground">
                        {entry.risks.risk_code}: {entry.risks.risk_title}
                      </p>
                    )}
                    {entry.link_type && (
                      <p className="text-xs">
                        {getLinkTypeIcon(entry.link_type)} {entry.link_type} •
                        Confidence: {entry.admin_classification_confidence}% •
                        By: {entry.performed_by_role}
                      </p>
                    )}
                    {entry.admin_notes && (
                      <p className="text-xs italic text-muted-foreground mt-1">
                        "{entry.admin_notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Void Incident Dialog */}
      {showVoidDialog && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Void This Incident?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Warning:</strong> Voiding this incident will remove it from normal views.
                  This action is logged and auditable, but the incident will no longer appear in
                  working lists. This is a soft delete - the data is preserved for compliance.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="voidReason">Reason for Voiding (Required)</Label>
                <textarea
                  id="voidReason"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g., duplicate entry, poorly captured, test data, invalid incident..."
                  className="w-full mt-2 p-2 border rounded-md bg-background min-h-[100px]"
                  disabled={isVoiding}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Explain why this incident is being voided. This will be logged in the audit trail.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVoidDialog(false);
                    setVoidReason('');
                    setError(null);
                  }}
                  disabled={isVoiding}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleVoidIncident}
                  disabled={isVoiding || !voidReason.trim()}
                >
                  {isVoiding ? 'Voiding...' : 'Void Incident'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Risk Link Modal */}
      <AddRiskLinkModal
        incidentId={incidentId}
        incidentTitle={incident.title}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setSuccessMessage('Risk link created successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
          loadIncidentDetails();
        }}
        existingRiskIds={riskLinks.map(link => link.risk_id)}
      />
    </div>
  );
}
