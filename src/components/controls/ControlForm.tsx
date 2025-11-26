/**
 * ControlForm Component
 *
 * Form for creating/editing risk controls with DIME framework scoring
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Control, DIMEScore, ControlType, ControlTarget } from '@/types/control';

interface ControlFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Control>) => void;
  editingControl?: Control | null;
  riskId?: string; // Optional - if creating control from risk context
  availableRisks?: Array<{ id: string; risk_code: string; risk_title: string }>; // For risk selection
}

interface FormData {
  name: string;
  description: string;
  control_type: ControlType | null;
  target: ControlTarget;
  risk_id: string; // Selected risk ID
  design_score: DIMEScore | null;
  implementation_score: DIMEScore | null;
  monitoring_score: DIMEScore | null;
  evaluation_score: DIMEScore | null;
}

const DIME_LABELS = {
  0: 'Not Implemented',
  1: 'Weak',
  2: 'Adequate',
  3: 'Strong',
} as const;

const DIME_DESCRIPTIONS = {
  design: {
    0: 'No control design exists',
    1: 'Control design is weak or inadequate',
    2: 'Control design is adequate and appropriate',
    3: 'Control design is strong and comprehensive',
  },
  implementation: {
    0: 'Control not implemented',
    1: 'Control poorly or inconsistently implemented',
    2: 'Control adequately implemented across key areas',
    3: 'Control fully and consistently implemented',
  },
  monitoring: {
    0: 'No monitoring of control performance',
    1: 'Weak or sporadic monitoring',
    2: 'Regular monitoring with documented reviews',
    3: 'Continuous monitoring with automated alerts',
  },
  evaluation: {
    0: 'No effectiveness evaluation performed',
    1: 'Informal or infrequent effectiveness reviews',
    2: 'Periodic formal effectiveness assessments',
    3: 'Comprehensive ongoing effectiveness testing',
  },
} as const;

export default function ControlForm({
  open,
  onOpenChange,
  onSave,
  editingControl,
  riskId,
  availableRisks = [],
}: ControlFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    control_type: null,
    target: 'Likelihood',
    risk_id: riskId || '',
    design_score: null,
    implementation_score: null,
    monitoring_score: null,
    evaluation_score: null,
  });

  // Debug: Log available risks when form opens
  useEffect(() => {
    if (open) {
      console.log('ControlForm opened. Available risks:', availableRisks);
      console.log('Number of available risks:', availableRisks.length);
    }
  }, [open, availableRisks]);

  // Initialize form when editing
  useEffect(() => {
    if (editingControl) {
      setFormData({
        name: editingControl.name,
        description: editingControl.description || '',
        control_type: editingControl.control_type,
        target: editingControl.target,
        risk_id: editingControl.risk_id,
        design_score: editingControl.design_score,
        implementation_score: editingControl.implementation_score,
        monitoring_score: editingControl.monitoring_score,
        evaluation_score: editingControl.evaluation_score,
      });
    } else {
      // Reset for new control
      setFormData({
        name: '',
        description: '',
        control_type: null,
        target: 'Likelihood',
        risk_id: riskId || '', // Use provided riskId or empty
        design_score: null,
        implementation_score: null,
        monitoring_score: null,
        evaluation_score: null,
      });
    }
  }, [editingControl, open, riskId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Control name is required');
      return;
    }

    if (!formData.risk_id) {
      alert('Please select a risk for this control');
      return;
    }

    // Build the data object
    const data: Partial<Control> = {
      name: formData.name,
      description: formData.description || null,
      control_type: formData.control_type || null, // Convert empty string to null
      target: formData.target,
      risk_id: formData.risk_id,
      design_score: formData.design_score,
      implementation_score: formData.implementation_score,
      monitoring_score: formData.monitoring_score,
      evaluation_score: formData.evaluation_score,
    };

    onSave(data);
  };

  const renderDIMEScoreSelector = (
    dimension: 'design' | 'implementation' | 'monitoring' | 'evaluation',
    label: string,
    value: DIMEScore | null,
    onChange: (value: DIMEScore) => void
  ) => {
    const descriptions = DIME_DESCRIPTIONS[dimension];

    return (
      <div className="space-y-2">
        <Label className="font-semibold">{label}</Label>
        <div className="grid grid-cols-4 gap-2">
          {([0, 1, 2, 3] as DIMEScore[]).map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`
                p-3 rounded-lg border-2 text-center transition-all
                ${
                  value === score
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
            >
              <div className="font-bold text-lg">{score}</div>
              <div className="text-xs text-gray-600 mt-1">{DIME_LABELS[score]}</div>
            </button>
          ))}
        </div>
        {value !== null && (
          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {descriptions[value]}
          </p>
        )}
      </div>
    );
  };

  const calculateEffectiveness = () => {
    const { design_score, implementation_score, monitoring_score, evaluation_score } = formData;

    if (
      design_score === null ||
      implementation_score === null ||
      monitoring_score === null ||
      evaluation_score === null
    ) {
      return null;
    }

    if (design_score === 0 || implementation_score === 0) {
      return 0;
    }

    return (
      ((design_score + implementation_score + monitoring_score + evaluation_score) / 12) * 100
    );
  };

  const effectiveness = calculateEffectiveness();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingControl ? 'Edit Control' : 'Add New Control'}
          </DialogTitle>
          <DialogDescription>
            {editingControl
              ? 'Update control details and DIME scores.'
              : 'Create a new risk control with DIME framework assessment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Control Code - only show when editing */}
          {editingControl && (
            <div>
              <Label>Control Code</Label>
              <Input value={editingControl.control_code} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">Control codes cannot be changed</p>
            </div>
          )}

          {/* Auto-generation info when creating */}
          {!editingControl && (
            <Alert>
              <AlertDescription>
                Control code will be auto-generated (e.g., CTRL-001, CTRL-002)
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Control Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily reconciliation of accounts"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of how this control works..."
                rows={3}
              />
            </div>

            {/* Risk Selector - only show if not pre-selected */}
            {!riskId && (
              <div>
                <Label>Linked Risk *</Label>
                <Select
                  value={formData.risk_id}
                  onValueChange={(value) => setFormData({ ...formData, risk_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a risk" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRisks.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No risks available. Create a risk first.
                      </div>
                    ) : (
                      availableRisks.map((risk) => (
                        <SelectItem key={risk.id} value={risk.id}>
                          {risk.risk_code} - {risk.risk_title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Which risk does this control mitigate?
                </p>
              </div>
            )}

            {/* Show selected risk if pre-selected via riskId prop */}
            {riskId && (
              <div>
                <Label>Linked Risk</Label>
                <div className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm">
                  {availableRisks.find((r) => r.id === riskId)
                    ? `${availableRisks.find((r) => r.id === riskId)?.risk_code} - ${
                        availableRisks.find((r) => r.id === riskId)?.risk_title
                      }`
                    : 'Selected risk'}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Control Type</Label>
                <Select
                  value={formData.control_type || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, control_type: value as ControlType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="detective">Detective</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target Dimension *</Label>
                <Select
                  value={formData.target}
                  onValueChange={(value) =>
                    setFormData({ ...formData, target: value as ControlTarget })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Likelihood">Likelihood</SelectItem>
                    <SelectItem value="Impact">Impact</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Which risk dimension does this control reduce?
                </p>
              </div>
            </div>
          </div>

          {/* DIME Framework Scoring */}
          <div className="border-t pt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">DIME Framework Assessment</h3>
              <p className="text-sm text-gray-600">
                Rate each dimension from 0 (Not Implemented) to 3 (Strong)
              </p>
            </div>

            {renderDIMEScoreSelector(
              'design',
              'Design (D)',
              formData.design_score,
              (value) => setFormData({ ...formData, design_score: value })
            )}

            {renderDIMEScoreSelector(
              'implementation',
              'Implementation (I)',
              formData.implementation_score,
              (value) => setFormData({ ...formData, implementation_score: value })
            )}

            {renderDIMEScoreSelector(
              'monitoring',
              'Monitoring (M)',
              formData.monitoring_score,
              (value) => setFormData({ ...formData, monitoring_score: value })
            )}

            {renderDIMEScoreSelector(
              'evaluation',
              'Effectiveness Evaluation (E)',
              formData.evaluation_score,
              (value) => setFormData({ ...formData, evaluation_score: value })
            )}

            {/* Effectiveness Display */}
            {effectiveness !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Label className="text-blue-900">Overall Control Effectiveness</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all"
                        style={{ width: `${effectiveness}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {effectiveness.toFixed(0)}%
                  </div>
                </div>
                <p className="text-xs text-blue-800 mt-2">
                  Formula: (D + I + M + E) / 12 = ({formData.design_score} + {formData.implementation_score} + {formData.monitoring_score} + {formData.evaluation_score}) / 12 = {effectiveness.toFixed(0)}%
                </p>
                {(formData.design_score === 0 || formData.implementation_score === 0) && (
                  <Alert className="mt-3">
                    <AlertDescription className="text-sm">
                      ⚠️ Controls with Design=0 or Implementation=0 have 0% effectiveness
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingControl ? 'Update Control' : 'Create Control'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
