/**
 * EvidenceRequestForm Component
 *
 * Dialog form for creating a new evidence request for a PCI instance or secondary control.
 */

import { useState } from 'react';
import type { CreateEvidenceRequestData } from '@/types/pci';
import { createEvidenceRequest } from '@/lib/pci';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSearch, AlertTriangle, Calendar, Loader2 } from 'lucide-react';

interface EvidenceRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riskId?: string;
  pciInstanceId?: string;
  secondaryControlInstanceId?: string;
  contextLabel?: string;
  onSuccess?: () => void;
}

export default function EvidenceRequestForm({
  open,
  onOpenChange,
  riskId,
  pciInstanceId,
  secondaryControlInstanceId,
  contextLabel,
  onSuccess,
}: EvidenceRequestFormProps) {
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default due date to 2 weeks from now
  function getDefaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  }

  // Reset form when dialog opens
  function handleOpenChange(open: boolean) {
    if (open) {
      setDueDate(getDefaultDueDate());
      setNotes('');
      setIsCritical(secondaryControlInstanceId ? true : false);
      setError(null);
    }
    onOpenChange(open);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!dueDate) {
      setError('Due date is required');
      return;
    }

    setLoading(true);
    try {
      const input: CreateEvidenceRequestData = {
        due_date: dueDate,
        notes: notes || undefined,
        is_critical_scope: isCritical,
      };

      if (riskId) input.risk_id = riskId;
      if (pciInstanceId) input.pci_instance_id = pciInstanceId;
      if (secondaryControlInstanceId)
        input.secondary_control_instance_id = secondaryControlInstanceId;

      const { error: createError } = await createEvidenceRequest(input);

      if (createError) {
        setError(createError.message || 'Failed to create evidence request');
        return;
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Request Evidence
          </DialogTitle>
          <DialogDescription>
            Request supporting evidence or documentation
            {contextLabel && (
              <span className="font-medium text-foreground">
                {' '}
                for {contextLabel}
              </span>
            )}
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <p className="text-xs text-muted-foreground">
              When the evidence should be submitted by
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Request Details</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what evidence is needed and any specific requirements..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Specify what documentation or evidence is being requested
            </p>
          </div>

          {/* Critical Scope Checkbox */}
          <div className="flex items-start space-x-3 p-3 rounded-md border bg-muted/50">
            <Checkbox
              id="critical"
              checked={isCritical}
              onCheckedChange={(checked) => setIsCritical(checked === true)}
            />
            <div className="space-y-1">
              <Label
                htmlFor="critical"
                className="font-medium cursor-pointer flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Critical Scope Evidence
              </Label>
              <p className="text-xs text-muted-foreground">
                Mark this if the evidence is for a critical control. Critical
                evidence affects the PCI's confidence score.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
