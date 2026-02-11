/**
 * PCICreationForm Component
 *
 * Form for creating a new PCI instance with parameters.
 * Shows after user selects a template from PCITemplateSelector.
 */

import { useState, useEffect } from 'react';
import { createPCIInstance, getSecondaryControlTemplates } from '@/lib/pci';
import { getDepartments, type Department } from '@/lib/divisions';
import type {
  PCITemplate,
  SecondaryControlTemplate,
  CreatePCIInstanceData,
  PCIObjective,
} from '@/types/pci';
import { DIMENSION_LABELS, CRITICALITY_LABELS } from '@/types/pci';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Shield,
  Target,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface PCICreationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PCITemplate | null;
  riskId: string;
  onSuccess: () => void;
  onBack: () => void;
}

const FREQUENCY_OPTIONS = [
  'Real-time',
  'Daily',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Annually',
  'On-demand',
  'Event-driven',
];

const METHOD_OPTIONS = [
  { value: 'System-enforced', label: 'System-enforced', description: 'Automated system controls (e.g., system blocks, auto-rejection)' },
  { value: 'Manual', label: 'Manual', description: 'Human-executed process (e.g., manual review, sign-off)' },
  { value: 'Hybrid', label: 'Hybrid', description: 'Combination of system and human actions' },
  { value: 'Policy-based', label: 'Policy-based', description: 'Governance or procedural controls (e.g., documented policies, mandates)' },
  { value: 'Contractual', label: 'Contractual', description: 'Third-party or legal obligations (e.g., SLAs, indemnities)' },
  { value: 'Configuration-based', label: 'Configuration-based', description: 'System settings or parameters (e.g., limits, thresholds, flags)' },
];

const OBJECTIVE_OPTIONS: { value: PCIObjective; label: string }[] = [
  { value: 'likelihood', label: 'Reduce Likelihood' },
  { value: 'impact', label: 'Reduce Impact' },
  { value: 'both', label: 'Both (Likelihood & Impact)' },
];

export default function PCICreationForm({
  open,
  onOpenChange,
  template,
  riskId,
  onSuccess,
  onBack,
}: PCICreationFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondaryControls, setSecondaryControls] = useState<
    SecondaryControlTemplate[]
  >([]);
  const [loadingControls, setLoadingControls] = useState(false);

  // Departments for Owner Role dropdown
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CreatePCIInstanceData>>({
    objective: undefined,
    statement: '',
    scope_boundary: '',
    method: '',
    target_threshold_standard: '',
    trigger_frequency: '',
    owner_role: '',
    dependencies: '',
  });

  // Load secondary control templates when template changes
  useEffect(() => {
    if (template) {
      setFormData((prev) => ({
        ...prev,
        objective: template.objective_default,
      }));
      loadSecondaryControls(template.id);
    }
  }, [template]);

  // Load departments for Owner Role dropdown when dialog opens
  useEffect(() => {
    if (open) {
      loadDepartmentOptions();
    }
  }, [open]);

  async function loadDepartmentOptions() {
    setLoadingDepartments(true);
    try {
      const { data, error } = await getDepartments();
      if (!error && data) {
        setDepartments(data);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoadingDepartments(false);
    }
  }

  async function loadSecondaryControls(templateId: string) {
    setLoadingControls(true);
    try {
      const { data } = await getSecondaryControlTemplates(templateId);
      setSecondaryControls(data || []);
    } catch (err) {
      console.error('Failed to load secondary controls:', err);
    } finally {
      setLoadingControls(false);
    }
  }

  function handleInputChange(field: keyof CreatePCIInstanceData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!template) return;

    // Validation
    if (!formData.scope_boundary?.trim()) {
      setError('Scope/Boundary is required');
      return;
    }
    if (!formData.method?.trim()) {
      setError('Method is required');
      return;
    }
    if (!formData.trigger_frequency?.trim()) {
      setError('Frequency is required');
      return;
    }
    if (!formData.owner_role?.trim()) {
      setError('Owner Role is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error: saveError } = await createPCIInstance({
        risk_id: riskId,
        pci_template_id: template.id,
        objective: formData.objective as PCIObjective,
        statement: formData.statement || undefined,
        scope_boundary: formData.scope_boundary!,
        method: formData.method!,
        target_threshold_standard: formData.target_threshold_standard || undefined,
        trigger_frequency: formData.trigger_frequency!,
        owner_role: formData.owner_role!,
        dependencies: formData.dependencies || undefined,
      });

      if (saveError) {
        setError(saveError.message);
      } else {
        onSuccess();
        onOpenChange(false);
        // Reset form
        setFormData({
          objective: undefined,
          statement: '',
          scope_boundary: '',
          method: '',
          target_threshold_standard: '',
          trigger_frequency: '',
          owner_role: '',
          dependencies: '',
        });
      }
    } catch (err) {
      setError('Failed to create control');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function getCriticalityColor(criticality: string) {
    switch (criticality) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'important':
        return 'bg-amber-100 text-amber-800';
      case 'optional':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  const objectiveColors = {
    likelihood: 'bg-blue-100 text-blue-800 border-blue-200',
    impact: 'bg-purple-100 text-purple-800 border-purple-200',
    both: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configure Control: {template.id}
          </DialogTitle>
          <DialogDescription>{template.name}</DialogDescription>
        </DialogHeader>

        {/* Template Info */}
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono">
                  {template.id}
                </Badge>
                <p className="text-sm">{template.purpose}</p>
                <p className="text-xs text-muted-foreground">
                  Category: {template.category}
                </p>
              </div>
              <Badge
                variant="outline"
                className={objectiveColors[template.objective_default]}
              >
                <Target className="h-3 w-3 mr-1" />
                Default: {template.objective_default}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Objective Override */}
          <div>
            <Label>Control Objective</Label>
            <Select
              value={formData.objective}
              onValueChange={(val) =>
                handleInputChange('objective', val)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select objective" />
              </SelectTrigger>
              <SelectContent>
                {OBJECTIVE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Defaults to template setting. Override if needed.
            </p>
          </div>

          {/* Scope/Boundary */}
          <div>
            <Label>
              Scope/Boundary <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Define what this control covers (e.g., 'All trading transactions above $10K')"
              value={formData.scope_boundary}
              onChange={(e) =>
                handleInputChange('scope_boundary', e.target.value)
              }
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Method */}
          <div>
            <Label>
              Method <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.method}
              onValueChange={(val) => handleInputChange('method', val)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="How is this control executed?" />
              </SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        — {opt.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target/Threshold/Standard */}
          <div>
            <Label>Target/Threshold/Standard</Label>
            <Input
              placeholder="e.g., 'Maximum exposure of $1M', '99.9% uptime'"
              value={formData.target_threshold_standard}
              onChange={(e) =>
                handleInputChange('target_threshold_standard', e.target.value)
              }
              className="mt-1"
            />
          </div>

          {/* Frequency */}
          <div>
            <Label>
              Frequency <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.trigger_frequency}
              onValueChange={(val) =>
                handleInputChange('trigger_frequency', val)
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="How often is this control applied?" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    {freq}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Owner Role (Department) */}
          <div>
            <Label>
              Owner (Department) <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.owner_role}
              onValueChange={(val) => handleInputChange('owner_role', val)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={loadingDepartments ? 'Loading departments...' : 'Select owning department'} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                    {dept.division_name && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({dept.division_name})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {departments.length === 0 && !loadingDepartments && (
              <p className="text-xs text-amber-600 mt-1">
                No departments configured. Add departments in Admin → Organization Structure.
              </p>
            )}
          </div>

          {/* Dependencies */}
          <div>
            <Label>Dependencies (Optional)</Label>
            <Input
              placeholder="e.g., 'Requires active monitoring system'"
              value={formData.dependencies}
              onChange={(e) => handleInputChange('dependencies', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Control Statement */}
          <div>
            <Label>Control Statement (Optional)</Label>
            <Textarea
              placeholder="Custom description of this control instance..."
              value={formData.statement}
              onChange={(e) => handleInputChange('statement', e.target.value)}
              className="mt-1"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              A brief statement describing what this specific control does.
            </p>
          </div>

          {/* Secondary Controls Preview */}
          <Accordion type="single" collapsible>
            <AccordionItem value="secondary-controls">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>10 Secondary Controls (Auto-generated)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {loadingControls ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">
                      These assurance checks will be created automatically. You'll
                      attest to each one to derive the DIME scores.
                    </p>
                    {secondaryControls.map((sc) => (
                      <div
                        key={sc.id}
                        className="flex items-start gap-2 text-sm p-2 bg-gray-50 rounded"
                      >
                        <Badge variant="outline" className="font-mono text-xs">
                          {sc.code}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getCriticalityColor(
                            sc.criticality
                          )}`}
                        >
                          {CRITICALITY_LABELS[sc.criticality]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {sc.prompt_text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Create Control
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
