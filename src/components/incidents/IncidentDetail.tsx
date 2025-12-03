/**
 * Incident Detail Component
 * Shows complete incident information with comments
 */

import React, { useEffect, useState } from 'react';
import { getIncidentById, voidIncident } from '../../lib/incidents';
import { getStatusBadgeClass } from '../../types/incident';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';

interface IncidentDetailProps {
  incidentId: string;
  onBack?: () => void;
  onEdit?: (incidentId: string) => void;
}

export function IncidentDetail({ incidentId, onBack, onEdit }: IncidentDetailProps) {
  const [incident, setIncident] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Void incident state
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Load incident details
  const loadIncident = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getIncidentById(incidentId);

      if (fetchError) throw fetchError;

      setIncident(data);
    } catch (err) {
      console.error('Error loading incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to load incident');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();
  }, [incidentId]);

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

      // Success - show message and go back
      setSuccessMessage('Incident voided successfully. Returning to list...');
      setTimeout(() => {
        if (onBack) onBack(); // Return to incident list
      }, 2000);
    } catch (err) {
      console.error('Error voiding incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to void incident');
    } finally {
      setIsVoiding(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading incident details...</p>
      </div>
    );
  }

  // Error state
  if (error || !incident) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Incident not found'}</AlertDescription>
        </Alert>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back to List
          </Button>
        )}
      </div>
    );
  }

  const canEdit = incident.status === 'Reported';

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

  const getSeverityColor = (sev: number) => {
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
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                ← Back
              </Button>
            )}
            <h2 className="text-2xl font-bold tracking-tight">
              {incident.incident_code}
            </h2>
            <Badge className={getStatusBadgeClass(incident.status)}>
              {incident.status}
            </Badge>
          </div>
          <h3 className="text-xl font-medium">{incident.title}</h3>
        </div>
        <div className="flex gap-2">
          {canEdit && onEdit && (
            <Button onClick={() => onEdit(incident.id)}>
              Edit Incident
            </Button>
          )}
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

      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type and Severity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">Incident Type</Label>
              <p className="font-medium mt-1">{incident.incident_type || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Severity</Label>
              <p className={`font-bold mt-1 ${getSeverityColor(incident.severity)}`}>
                {getSeverityText(incident.severity)}
              </p>
            </div>
          </div>

          {/* Date */}
          <div>
            <Label className="text-muted-foreground">Incident Date</Label>
            <p className="font-medium mt-1">{formatDate(incident.incident_date)}</p>
          </div>

          {/* Financial Impact */}
          {incident.financial_impact && (
            <div>
              <Label className="text-muted-foreground">Financial Impact</Label>
              <p className="font-medium mt-1">
                ₦{Number(incident.financial_impact).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <div className="mt-2 p-4 bg-muted/50 rounded-md">
              <p className="whitespace-pre-wrap">{incident.description}</p>
            </div>
          </div>

          {/* Linked Risks */}
          {incident.linked_risk_ids && incident.linked_risk_ids.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Linked Risks</Label>
              <div className="mt-2 space-y-2">
                {incident.linked_risk_ids.map((riskId: string, index: number) => (
                  <div key={riskId} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="font-mono font-medium text-blue-900">Risk ID: {riskId}</p>
                    {incident.linked_risk_titles?.[index] && (
                      <p className="text-sm text-blue-700 mt-1">{incident.linked_risk_titles[index]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Created: {formatDateTime(incident.created_at)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
