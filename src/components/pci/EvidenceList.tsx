/**
 * EvidenceList Component
 *
 * Shows all evidence requests for a PCI instance with status, submissions, and actions.
 */

import { useState, useEffect } from 'react';
import type {
  EvidenceRequest,
  EvidenceSubmission,
  EvidenceRequestStatus,
} from '@/types/pci';
import {
  getEvidenceRequests,
  getEvidenceSubmissions,
  updateEvidenceRequestStatus,
} from '@/lib/pci';
import EvidenceRequestForm from './EvidenceRequestForm';
import EvidenceSubmissionForm from './EvidenceSubmissionForm';
import EvidenceReviewForm from './EvidenceReviewForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileSearch,
  Plus,
  ChevronDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  ClipboardCheck,
  MoreVertical,
  Ban,
  Loader2,
  FileText,
  Inbox,
} from 'lucide-react';

interface EvidenceListProps {
  pciInstanceId: string;
  riskId?: string;
  readOnly?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  EvidenceRequestStatus,
  { label: string; icon: typeof Clock; color: string }
> = {
  open: {
    label: 'Open',
    icon: Clock,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  submitted: {
    label: 'Submitted',
    icon: Upload,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  closed: {
    label: 'Closed',
    icon: CheckCircle,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

export default function EvidenceList({
  pciInstanceId,
  riskId,
  readOnly = false,
  compact = false,
}: EvidenceListProps) {
  const [requests, setRequests] = useState<EvidenceRequest[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<
    Record<string, EvidenceSubmission[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(
    new Set()
  );

  // Dialogs
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submissionRequest, setSubmissionRequest] =
    useState<EvidenceRequest | null>(null);
  const [reviewSubmission, setReviewSubmission] =
    useState<EvidenceSubmission | null>(null);
  const [reviewRequest, setReviewRequest] = useState<EvidenceRequest | null>(
    null
  );

  useEffect(() => {
    loadRequests();
  }, [pciInstanceId]);

  async function loadRequests() {
    setLoading(true);
    try {
      const { data } = await getEvidenceRequests({
        pci_instance_id: pciInstanceId,
      });
      setRequests(data || []);

      // Load submissions for each request
      const newSubmissionsMap: Record<string, EvidenceSubmission[]> = {};
      for (const request of data || []) {
        const { data: submissions } = await getEvidenceSubmissions(request.id);
        newSubmissionsMap[request.id] = submissions || [];
      }
      setSubmissionsMap(newSubmissionsMap);
    } catch (err) {
      console.error('Error loading evidence requests:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function isOverdue(request: EvidenceRequest) {
    return (
      new Date(request.due_date) < new Date() &&
      ['open', 'rejected'].includes(request.status)
    );
  }

  function toggleExpanded(requestId: string) {
    setExpandedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  }

  async function handleCancelRequest(request: EvidenceRequest) {
    const { error } = await updateEvidenceRequestStatus(request.id, 'cancelled');
    if (!error) {
      loadRequests();
    }
  }

  function handleSubmitEvidence(request: EvidenceRequest) {
    setSubmissionRequest(request);
  }

  function handleReviewSubmission(
    submission: EvidenceSubmission,
    request: EvidenceRequest
  ) {
    setReviewSubmission(submission);
    setReviewRequest(request);
  }

  // Count active requests
  const activeCount = requests.filter((r) =>
    ['open', 'submitted', 'rejected'].includes(r.status)
  ).length;
  const overdueCount = requests.filter(isOverdue).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading evidence requests...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="font-medium flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Evidence Requests
          </h4>
          {activeCount > 0 && (
            <Badge variant="outline">{activeCount} active</Badge>
          )}
          {overdueCount > 0 && (
            <Badge
              variant="outline"
              className="text-red-600 border-red-200 bg-red-50"
            >
              {overdueCount} overdue
            </Badge>
          )}
        </div>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRequestForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Request Evidence
          </Button>
        )}
      </div>

      {/* Request List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No evidence requests yet</p>
            {!readOnly && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setShowRequestForm(true)}
              >
                Create your first request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status];
            const StatusIcon = statusConfig.icon;
            const submissions = submissionsMap[request.id] || [];
            const isExpanded = expandedRequests.has(request.id);
            const latestSubmission = submissions[0];

            return (
              <Collapsible
                key={request.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(request.id)}
              >
                <Card
                  className={`${
                    isOverdue(request) ? 'border-red-200' : ''
                  }`}
                >
                  <CardContent className="py-3">
                    {/* Request Header */}
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-3 -my-3 px-3 py-3 rounded-md">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={statusConfig.color}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>

                          {request.is_critical_scope && (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-200 bg-amber-50"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Critical
                            </Badge>
                          )}

                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due {formatDate(request.due_date)}
                            {isOverdue(request) && (
                              <span className="text-red-600 font-medium ml-1">
                                (Overdue)
                              </span>
                            )}
                          </span>

                          {submissions.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {submissions.length} submission
                              {submissions.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Actions */}
                          {!readOnly && request.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmitEvidence(request);
                              }}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Submit
                            </Button>
                          )}

                          {!readOnly && request.status === 'submitted' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (latestSubmission) {
                                  handleReviewSubmission(
                                    latestSubmission,
                                    request
                                  );
                                }
                              }}
                            >
                              <ClipboardCheck className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          )}

                          {!readOnly &&
                            ['open', 'rejected'].includes(request.status) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleCancelRequest(request)}
                                    className="text-red-600"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Cancel Request
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {/* Expanded Content */}
                    <CollapsibleContent>
                      <div className="pt-3 mt-3 border-t space-y-3">
                        {/* Request Notes */}
                        {request.notes && (
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground flex items-center gap-1 mb-1">
                              <FileText className="h-3 w-3" />
                              Request Details
                            </span>
                            <p className="text-sm">{request.notes}</p>
                          </div>
                        )}

                        {/* Submissions */}
                        {submissions.length > 0 && (
                          <div className="space-y-2">
                            <span className="font-medium text-muted-foreground text-sm">
                              Submissions
                            </span>
                            {submissions.map((submission) => (
                              <div
                                key={submission.id}
                                className="p-3 rounded border bg-muted/30 space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>
                                    Submitted {formatDateTime(submission.submitted_at)}
                                  </span>
                                  {submission.decision && (
                                    <Badge
                                      variant="outline"
                                      className={
                                        submission.decision === 'accepted'
                                          ? 'bg-green-50 text-green-700 border-green-200'
                                          : 'bg-red-50 text-red-700 border-red-200'
                                      }
                                    >
                                      {submission.decision === 'accepted' ? (
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                      ) : (
                                        <XCircle className="h-3 w-3 mr-1" />
                                      )}
                                      {submission.decision}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap">
                                  {submission.submission_note}
                                </p>
                                {submission.review_notes && (
                                  <div className="pt-2 border-t text-sm">
                                    <span className="text-muted-foreground font-medium">
                                      Review notes:{' '}
                                    </span>
                                    {submission.review_notes}
                                  </div>
                                )}

                                {/* Review button for pending submissions */}
                                {!readOnly &&
                                  !submission.decision &&
                                  request.status === 'submitted' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleReviewSubmission(
                                          submission,
                                          request
                                        )
                                      }
                                    >
                                      <ClipboardCheck className="h-3 w-3 mr-1" />
                                      Review Submission
                                    </Button>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Submit button if rejected */}
                        {!readOnly && request.status === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSubmitEvidence(request)}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Submit New Evidence
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <EvidenceRequestForm
        open={showRequestForm}
        onOpenChange={setShowRequestForm}
        pciInstanceId={pciInstanceId}
        riskId={riskId}
        onSuccess={loadRequests}
      />

      {submissionRequest && (
        <EvidenceSubmissionForm
          open={!!submissionRequest}
          onOpenChange={(open) => !open && setSubmissionRequest(null)}
          request={submissionRequest}
          onSuccess={loadRequests}
        />
      )}

      {reviewSubmission && reviewRequest && (
        <EvidenceReviewForm
          open={!!reviewSubmission}
          onOpenChange={(open) => {
            if (!open) {
              setReviewSubmission(null);
              setReviewRequest(null);
            }
          }}
          submission={reviewSubmission}
          onSuccess={loadRequests}
        />
      )}
    </div>
  );
}
