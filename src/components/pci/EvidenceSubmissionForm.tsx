/**
 * EvidenceSubmissionForm Component
 *
 * Dialog form for submitting evidence for an open request.
 */

import { useState } from 'react';
import type { EvidenceRequest } from '@/types/pci';
import { createEvidenceSubmission } from '@/lib/pci';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  AlertTriangle,
  Calendar,
  Loader2,
  FileText,
} from 'lucide-react';

interface EvidenceSubmissionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: EvidenceRequest;
  onSuccess?: () => void;
}

export default function EvidenceSubmissionForm({
  open,
  onOpenChange,
  request,
  onSuccess,
}: EvidenceSubmissionFormProps) {
  const [submissionNote, setSubmissionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  function handleOpenChange(open: boolean) {
    if (open) {
      setSubmissionNote('');
      setError(null);
    }
    onOpenChange(open);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function isOverdue() {
    return new Date(request.due_date) < new Date();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!submissionNote.trim()) {
      setError('Please provide submission details');
      return;
    }

    setLoading(true);
    try {
      const { error: submitError } = await createEvidenceSubmission({
        evidence_request_id: request.id,
        submission_note: submissionNote,
      });

      if (submitError) {
        setError(submitError.message || 'Failed to submit evidence');
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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Submit Evidence
          </DialogTitle>
          <DialogDescription>
            Provide supporting evidence for this request
          </DialogDescription>
        </DialogHeader>

        {/* Request Context */}
        <div className="p-3 rounded-md border bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Request Details</span>
            <div className="flex items-center gap-2">
              {request.is_critical_scope && (
                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Critical
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  isOverdue()
                    ? 'text-red-600 border-red-200 bg-red-50'
                    : 'text-muted-foreground'
                }
              >
                <Calendar className="h-3 w-3 mr-1" />
                Due {formatDate(request.due_date)}
              </Badge>
            </div>
          </div>
          {request.notes && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{request.notes}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submission Note */}
          <div className="space-y-2">
            <Label htmlFor="submission-note">Evidence Details</Label>
            <Textarea
              id="submission-note"
              value={submissionNote}
              onChange={(e) => setSubmissionNote(e.target.value)}
              placeholder="Describe the evidence being submitted, including:
• Document references or links
• Testing or verification results
• Observations and findings
• Any relevant screenshots or attachments..."
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              Provide details about the evidence, including any document
              references, links, or descriptions of verification performed. You
              can also paste links to files stored in shared drives.
            </p>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground p-3 rounded-md bg-blue-50 border border-blue-100">
            <strong>Note:</strong> After submission, a reviewer will assess the
            evidence and either accept or request additional information.
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
                  Submitting...
                </>
              ) : (
                'Submit Evidence'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
