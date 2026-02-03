/**
 * EvidenceReviewForm Component
 *
 * Dialog for reviewing an evidence submission (accept or reject).
 */

import { useState } from 'react';
import type { EvidenceSubmission } from '@/types/pci';
import { reviewEvidenceSubmission } from '@/lib/pci';
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
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  User,
  Clock,
} from 'lucide-react';

interface EvidenceReviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: EvidenceSubmission;
  onSuccess?: () => void;
}

export default function EvidenceReviewForm({
  open,
  onOpenChange,
  submission,
  onSuccess,
}: EvidenceReviewFormProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  function handleOpenChange(open: boolean) {
    if (open) {
      setReviewNotes('');
      setError(null);
    }
    onOpenChange(open);
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  async function handleDecision(decision: 'accepted' | 'rejected') {
    setError(null);

    if (decision === 'rejected' && !reviewNotes.trim()) {
      setError('Please provide feedback when rejecting a submission');
      return;
    }

    setLoading(true);
    try {
      const { error: reviewError } = await reviewEvidenceSubmission(
        submission.id,
        decision,
        reviewNotes || undefined
      );

      if (reviewError) {
        setError(reviewError.message || 'Failed to submit review');
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Review Evidence Submission
          </DialogTitle>
          <DialogDescription>
            Review the submitted evidence and accept or request changes
          </DialogDescription>
        </DialogHeader>

        {/* Submission Details */}
        <div className="p-4 rounded-md border bg-muted/50 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Submitted Evidence</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTime(submission.submitted_at)}
            </span>
          </div>
          <div className="p-3 rounded border bg-background text-sm whitespace-pre-wrap">
            {submission.submission_note}
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Review Notes */}
          <div className="space-y-2">
            <Label htmlFor="review-notes">
              Review Notes{' '}
              <span className="text-muted-foreground font-normal">
                (required when rejecting)
              </span>
            </Label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Provide feedback on the evidence, noting what was verified or what additional information is needed..."
              rows={4}
            />
          </div>

          {/* Decision Buttons */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDecision('rejected')}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => handleDecision('accepted')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
