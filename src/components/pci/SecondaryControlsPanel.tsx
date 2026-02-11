/**
 * SecondaryControlsPanel Component
 *
 * Displays and allows attestation of 10 secondary controls grouped by dimension.
 * Users can set status, evidence_exists, notes, and N/A rationale.
 */

import { useState, useEffect } from 'react';
import {
  getSecondaryControlInstances,
  updateSecondaryControlInstance,
  getDIMEScore,
  getConfidenceScore,
  activatePCIInstance,
  checkAttestationComplete,
} from '@/lib/pci';
import type {
  SecondaryControlInstance,
  PCIStatus,
  SCStatus,
  SCDimension,
  DerivedDIMEScore,
  ConfidenceScore,
} from '@/types/pci';
import {
  DIMENSION_LABELS,
  CRITICALITY_LABELS,
  STATUS_LABELS,
} from '@/types/pci';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import DIMEDisplay from './DIMEDisplay';
import ConfidenceDisplay from './ConfidenceDisplay';
import EvidenceList from './EvidenceList';

interface SecondaryControlsPanelProps {
  pciInstanceId: string;
  riskId?: string;
  readOnly?: boolean;
  onUpdate?: () => void;
  pciStatus?: PCIStatus;
}

interface LocalControlState {
  id: string;
  status: SCStatus | null;
  evidence_exists: boolean | null;
  notes: string;
  na_rationale: string;
  dirty: boolean;
}

const STATUS_OPTIONS: SCStatus[] = ['yes', 'partial', 'no', 'na'];

export default function SecondaryControlsPanel({
  pciInstanceId,
  riskId,
  readOnly = false,
  onUpdate,
  pciStatus = 'draft',
}: SecondaryControlsPanelProps) {
  const [controls, setControls] = useState<SecondaryControlInstance[]>([]);
  const [localState, setLocalState] = useState<Record<string, LocalControlState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [expandedDimensions, setExpandedDimensions] = useState<Set<SCDimension>>(
    new Set(['D', 'I', 'M', 'E'])
  );

  // Attestation completion state
  const [attestationComplete, setAttestationComplete] = useState(false);
  const [attestationProgress, setAttestationProgress] = useState({ attested: 0, total: 0 });
  const [committing, setCommitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(pciStatus);

  // Scores state (updated after saves)
  const [dimeScore, setDimeScore] = useState<DerivedDIMEScore | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<ConfidenceScore | null>(null);

  useEffect(() => {
    loadControls();
  }, [pciInstanceId]);

  async function loadControls() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getSecondaryControlInstances(
        pciInstanceId
      );
      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setControls(data);
        // Initialize local state
        const initial: Record<string, LocalControlState> = {};
        for (const control of data) {
          initial[control.id] = {
            id: control.id,
            status: control.status,
            evidence_exists: control.evidence_exists,
            notes: control.notes || '',
            na_rationale: control.na_rationale || '',
            dirty: false,
          };
        }
        setLocalState(initial);
      }

      // Load scores
      const { data: dime } = await getDIMEScore(pciInstanceId);
      const { data: conf } = await getConfidenceScore(pciInstanceId);
      setDimeScore(dime);
      setConfidenceScore(conf);

      // Check attestation completion
      await updateAttestationProgress();
    } catch (err) {
      setError('Failed to load secondary controls');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateAttestationProgress() {
    const result = await checkAttestationComplete(pciInstanceId);
    setAttestationComplete(result.complete);
    setAttestationProgress({ attested: result.attested, total: result.total });
  }

  async function handleCommitAttestation() {
    if (!attestationComplete || currentStatus !== 'draft') return;

    setCommitting(true);
    setError(null);
    try {
      const { error: commitError } = await activatePCIInstance(pciInstanceId);
      if (commitError) {
        setError(commitError.message);
      } else {
        setCurrentStatus('active');
        onUpdate?.(); // Refresh parent to show new status
      }
    } catch (err) {
      setError('Failed to activate control');
      console.error(err);
    } finally {
      setCommitting(false);
    }
  }

  function updateLocalState(
    controlId: string,
    field: keyof LocalControlState,
    value: any
  ) {
    setLocalState((prev) => ({
      ...prev,
      [controlId]: {
        ...prev[controlId],
        [field]: value,
        dirty: true,
      },
    }));
  }

  async function handleSave(controlId: string) {
    const local = localState[controlId];
    if (!local || !local.dirty) return;

    // Validation
    if (local.status === 'na' && !local.na_rationale.trim()) {
      setError('N/A rationale is required when status is N/A');
      return;
    }
    // Note: evidence_exists is optional - defaults to false if not set

    setSaving((prev) => new Set(prev).add(controlId));
    setError(null);

    try {
      const { error: saveError } = await updateSecondaryControlInstance(
        controlId,
        {
          status: local.status || undefined,
          evidence_exists:
            local.status === 'na' ? false : (local.evidence_exists ?? false),
          notes: local.notes || undefined,
          na_rationale: local.status === 'na' ? local.na_rationale : undefined,
        }
      );

      if (saveError) {
        setError(saveError.message);
      } else {
        // Mark as not dirty
        setLocalState((prev) => ({
          ...prev,
          [controlId]: { ...prev[controlId], dirty: false },
        }));

        // Refresh scores (triggers recompute)
        const { data: dime } = await getDIMEScore(pciInstanceId);
        const { data: conf } = await getConfidenceScore(pciInstanceId);
        setDimeScore(dime);
        setConfidenceScore(conf);

        // Update attestation progress (enables Commit button when complete)
        await updateAttestationProgress();

        // Note: Don't call onUpdate here - it causes the parent to reload
        // and closes the sheet. The scores are already refreshed locally.
        // onUpdate will be called when the sheet closes.
      }
    } catch (err) {
      setError('Failed to save attestation');
      console.error(err);
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(controlId);
        return next;
      });
    }
  }

  function toggleDimension(dim: SCDimension) {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) {
        next.delete(dim);
      } else {
        next.add(dim);
      }
      return next;
    });
  }

  // Group controls by dimension
  const controlsByDimension = controls.reduce((acc, control) => {
    const dim = control.secondary_control_template?.dimension as SCDimension;
    if (!acc[dim]) acc[dim] = [];
    acc[dim].push(control);
    return acc;
  }, {} as Record<SCDimension, SecondaryControlInstance[]>);

  const dimensions: SCDimension[] = ['D', 'I', 'M', 'E'];

  // Check if all D (Design) controls yield zero score (N/A or Not Met)
  // If Design is zero, I/M/E are meaningless and should be blocked
  const dControls = controlsByDimension['D'] || [];
  const allDControlsAttested = dControls.length > 0 &&
    dControls.every((c) => localState[c.id]?.status != null);
  const allDControlsZero = allDControlsAttested &&
    dControls.every((c) => {
      const status = localState[c.id]?.status;
      return status === 'na' || status === 'no';
    });
  const allDControlsNA = allDControlsZero &&
    dControls.every((c) => localState[c.id]?.status === 'na');

  // Auto-cascade: when D is all zero (N/A or Not Met), I/M/E are disabled
  const isDimensionDisabled = (dim: SCDimension) => {
    return allDControlsZero && dim !== 'D';
  };

  function getCriticalityColor(criticality: string) {
    switch (criticality) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'important':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'optional':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusColor(status: SCStatus | null) {
    switch (status) {
      case 'yes':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-amber-100 text-amber-800';
      case 'no':
        return 'bg-red-100 text-red-800';
      case 'na':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-50 text-gray-500';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scores Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DIMEDisplay dimeScore={dimeScore} compact={false} showExplainability />
          <ConfidenceDisplay confidence={confidenceScore} />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls by Dimension */}
      {dimensions.map((dim) => {
        const dimControls = controlsByDimension[dim] || [];
        const isExpanded = expandedDimensions.has(dim);
        const attestedCount = dimControls.filter(
          (c) => localState[c.id]?.status
        ).length;
        const dimDisabled = isDimensionDisabled(dim);

        return (
          <Collapsible
            key={dim}
            open={isExpanded}
            onOpenChange={() => toggleDimension(dim)}
          >
            <Card className={dimDisabled ? 'opacity-60 bg-gray-50' : ''}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {DIMENSION_LABELS[dim]}
                      {dimDisabled ? (
                        <Badge variant="outline" className="bg-gray-200 text-gray-600">
                          {allDControlsNA ? 'Auto N/A (Design = N/A)' : 'Blocked (Design = 0)'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {attestedCount}/{dimControls.length} attested
                        </Badge>
                      )}
                    </CardTitle>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {dimControls.map((control) => {
                    const template = control.secondary_control_template;
                    const local = localState[control.id];
                    const isSaving = saving.has(control.id);

                    if (!template || !local) return null;

                    return (
                      <div
                        key={control.id}
                        className={`border rounded-lg p-4 space-y-3 ${
                          local.dirty ? 'border-blue-300 bg-blue-50/30' : ''
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {template.code}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={getCriticalityColor(
                                  template.criticality
                                )}
                              >
                                {CRITICALITY_LABELS[template.criticality]}
                              </Badge>
                              {local.status && (
                                <Badge
                                  variant="outline"
                                  className={getStatusColor(local.status)}
                                >
                                  {STATUS_LABELS[local.status]}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{template.prompt_text}</p>
                          </div>
                        </div>

                        {/* Attestation Fields */}
                        {!readOnly && !dimDisabled && (
                          <div className="grid grid-cols-2 gap-4">
                            {/* Status */}
                            <div>
                              <Label className="text-xs">Status</Label>
                              <Select
                                value={local.status || ''}
                                onValueChange={(val) =>
                                  updateLocalState(
                                    control.id,
                                    'status',
                                    val as SCStatus
                                  )
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {STATUS_LABELS[status]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Evidence Exists */}
                            {local.status && local.status !== 'na' && (
                              <div className="flex items-end">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`evidence-${control.id}`}
                                    checked={local.evidence_exists || false}
                                    onCheckedChange={(checked) =>
                                      updateLocalState(
                                        control.id,
                                        'evidence_exists',
                                        checked
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={`evidence-${control.id}`}
                                    className="text-sm cursor-pointer flex items-center gap-1"
                                  >
                                    <FileCheck className="h-4 w-4" />
                                    Evidence exists
                                  </Label>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Auto-disabled due to Design = 0 */}
                        {dimDisabled && (
                          <div className="bg-gray-100 rounded p-3 text-sm text-gray-600">
                            <Badge variant="outline" className="bg-gray-200 text-gray-600 mb-2">
                              {allDControlsNA ? 'N/A (Auto)' : 'Blocked (Design = 0)'}
                            </Badge>
                            <p className="text-xs">
                              {allDControlsNA
                                ? 'This control is automatically N/A because all Design controls are marked N/A. If Design doesn\'t exist, Implementation/Monitoring/Evaluation don\'t apply.'
                                : 'This control is blocked because all Design controls scored zero (Not Met). If Design is inadequate, Implementation/Monitoring/Evaluation are meaningless.'}
                            </p>
                          </div>
                        )}

                        {/* N/A Rationale */}
                        {local.status === 'na' && !readOnly && !dimDisabled && (
                          <div>
                            <Label className="text-xs">
                              N/A Rationale{' '}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              placeholder="Explain why this control is not applicable..."
                              value={local.na_rationale}
                              onChange={(e) =>
                                updateLocalState(
                                  control.id,
                                  'na_rationale',
                                  e.target.value
                                )
                              }
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        )}

                        {/* Notes */}
                        {!readOnly && local.status && !dimDisabled && (
                          <div>
                            <Label className="text-xs">Notes (optional)</Label>
                            <Textarea
                              placeholder="Additional notes..."
                              value={local.notes}
                              onChange={(e) =>
                                updateLocalState(
                                  control.id,
                                  'notes',
                                  e.target.value
                                )
                              }
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        )}

                        {/* Save Button */}
                        {local.dirty && !readOnly && !dimDisabled && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleSave(control.id)}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Attestation Info */}
                        {control.attested_at && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Attested{' '}
                            {new Date(control.attested_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Critical Warning */}
      {controls.some(
        (c) =>
          c.secondary_control_template?.criticality === 'critical' &&
          localState[c.id]?.status === 'no'
      ) && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            One or more critical controls are marked "No". This will trigger
            hard caps on the corresponding DIME dimensions (capped to ≤1.0).
          </AlertDescription>
        </Alert>
      )}

      {/* Evidence Requests Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <EvidenceList
            pciInstanceId={pciInstanceId}
            riskId={riskId}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>

      {/* Commit Attestation Button */}
      {!readOnly && currentStatus === 'draft' && (
        <Card className={attestationComplete ? 'border-green-200 bg-green-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">
                  {attestationComplete ? 'Ready to Commit' : 'Complete Attestation'}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {attestationProgress.attested} of {attestationProgress.total} controls attested
                  {!attestationComplete && ' - complete all to enable commit'}
                </p>
              </div>
              <Button
                type="button"
                onClick={handleCommitAttestation}
                disabled={!attestationComplete || committing}
                className={attestationComplete ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {committing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Commit Attestation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already Active Status */}
      {currentStatus === 'active' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            This control is active. Attestation has been committed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
