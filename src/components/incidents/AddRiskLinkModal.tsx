/**
 * Add Risk Link Modal
 * Allows admins to manually link incidents to risks
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createIncidentRiskLink } from '../../lib/incidents';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface Risk {
  id: string;
  risk_code: string;
  risk_title: string;
  category: string;
  status: string;
}

interface AddRiskLinkModalProps {
  incidentId: string;
  incidentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingRiskIds?: string[]; // Risk IDs already linked to this incident
}

export function AddRiskLinkModal({
  incidentId,
  incidentTitle,
  isOpen,
  onClose,
  onSuccess,
  existingRiskIds = []
}: AddRiskLinkModalProps) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [selectedRiskId, setSelectedRiskId] = useState<string>('');
  const [linkType, setLinkType] = useState<string>('PRIMARY');
  const [adminNotes, setAdminNotes] = useState('');
  const [classificationConfidence, setClassificationConfidence] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load available risks
  useEffect(() => {
    if (isOpen) {
      loadRisks();
    }
  }, [isOpen]);

  const loadRisks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('risks')
        .select('id, risk_code, risk_title, category, status')
        .in('status', ['OPEN', 'MONITORING']) // Only active risks
        .order('risk_code', { ascending: true });

      if (fetchError) throw fetchError;

      // Filter out risks already linked to this incident
      const availableRisks = (data || []).filter(
        risk => !existingRiskIds.includes(risk.id)
      );

      setRisks(availableRisks);
    } catch (err) {
      console.error('Error loading risks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load risks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRiskId) {
      setError('Please select a risk');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: linkError } = await createIncidentRiskLink(
        incidentId,
        selectedRiskId,
        linkType,
        adminNotes || undefined,
        classificationConfidence
      );

      if (linkError) throw linkError;

      // Success - close modal and notify parent
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error creating risk link:', err);
      setError(err instanceof Error ? err.message : 'Failed to create risk link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setSelectedRiskId('');
    setLinkType('PRIMARY');
    setAdminNotes('');
    setClassificationConfidence(100);
    setError(null);
    setSearchQuery('');
    onClose();
  };

  // Filter risks based on search query
  const filteredRisks = searchQuery
    ? risks.filter(
        risk =>
          risk.risk_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          risk.risk_title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : risks;

  const selectedRisk = risks.find(r => r.id === selectedRiskId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Incident to Risk</DialogTitle>
          <DialogDescription>
            Manually create a link between this incident and a risk from your register.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Incident Info */}
          <div className="p-3 bg-muted/50 rounded-md">
            <Label className="text-xs text-muted-foreground">Incident:</Label>
            <p className="font-medium text-sm">{incidentTitle}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Risk Selection */}
          <div>
            <Label>Select Risk *</Label>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search risks by code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2 w-full p-2 border rounded-md bg-background"
            />

            {/* Risk Dropdown */}
            <Select value={selectedRiskId} onValueChange={setSelectedRiskId}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder={isLoading ? "Loading risks..." : "Choose a risk..."} />
              </SelectTrigger>
              <SelectContent>
                {filteredRisks.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {isLoading ? 'Loading...' : searchQuery ? 'No risks match your search' : 'No available risks'}
                  </div>
                ) : (
                  filteredRisks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.id}>
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-semibold text-primary">{risk.risk_code}</span>
                        <span className="flex-1">{risk.risk_title}</span>
                        <span className="text-xs text-muted-foreground">{risk.category}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Selected Risk Preview */}
            {selectedRisk && (
              <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-md text-sm">
                <span className="font-semibold">{selectedRisk.risk_code}:</span> {selectedRisk.risk_title}
              </div>
            )}
          </div>

          {/* Link Type Selection */}
          <div>
            <Label>Risk Link Type *</Label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value)}
              className="mt-2 w-full p-2 border rounded-md bg-background"
            >
              <option value="PRIMARY">PRIMARY - Main contributing risk</option>
              <option value="SECONDARY">SECONDARY - Supporting factor</option>
              <option value="CONTRIBUTORY">CONTRIBUTORY - Partial contributor</option>
              <option value="ASSOCIATED">ASSOCIATED - Related but indirect</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {linkType === 'PRIMARY' && '🔴 This risk is a main cause of the incident'}
              {linkType === 'SECONDARY' && '🟡 This risk is a supporting factor'}
              {linkType === 'CONTRIBUTORY' && '🟠 This risk partially contributed'}
              {linkType === 'ASSOCIATED' && '🔵 This risk is related but indirect'}
            </p>
          </div>

          {/* Classification Confidence Slider */}
          <div>
            <Label>Your Classification Confidence: {classificationConfidence}%</Label>
            <Slider
              value={[classificationConfidence]}
              onValueChange={(value) => setClassificationConfidence(value[0])}
              min={0}
              max={100}
              step={5}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {classificationConfidence < 70
                ? '⚠️ Low confidence will flag incident for follow-up'
                : '✓ High confidence will mark as confirmed'}
            </p>
          </div>

          {/* Admin Notes */}
          <div>
            <Label>Admin Notes (Optional)</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add any notes about this risk mapping..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedRiskId}>
            {isSubmitting ? 'Creating Link...' : 'Create Risk Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
