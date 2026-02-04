/**
 * PCIControlsSection Component
 *
 * Main section for managing PCI instances on a risk.
 * Replaces the old free-text controls section when pci_workflow_enabled.
 */

import { useState, useEffect } from 'react';
import {
  getPCIInstancesForRisk,
  checkActivationGate,
  getPCISuggestions,
  getDeclinedTemplatesForRisk,
  type PCISuggestion,
} from '@/lib/pci';
import type {
  PCIInstance,
  PCITemplate,
  RiskResponseType,
  G1GateResult,
} from '@/types/pci';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Plus,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import PCIInstanceCard from './PCIInstanceCard';
import PCITemplateSelector from './PCITemplateSelector';
import PCICreationForm from './PCICreationForm';
import { calculateEffectiveness } from './EffectivenessDisplay';
import { Gauge } from 'lucide-react';

interface PCIControlsSectionProps {
  riskId: string;
  riskResponse?: RiskResponseType;
  readOnly?: boolean;
  onPCICountChange?: (count: number) => void;
}

export default function PCIControlsSection({
  riskId,
  riskResponse,
  readOnly = false,
  onPCICountChange,
}: PCIControlsSectionProps) {
  const [pciInstances, setPCIInstances] = useState<PCIInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Template selection flow
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PCITemplate | null>(null);

  // G1 Gate status
  const [gateResult, setGateResult] = useState<G1GateResult | null>(null);

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<PCISuggestion[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // Declined templates
  const [declinedTemplateIds, setDeclinedTemplateIds] = useState<string[]>([]);

  useEffect(() => {
    loadPCIInstances();
    loadDeclinedTemplates();
  }, [riskId]);

  // Load AI suggestions when risk response changes
  useEffect(() => {
    if (riskId && riskResponse && riskResponse !== 'accept') {
      loadAISuggestions();
    } else {
      setAiSuggestions([]);
    }
  }, [riskId, riskResponse]);

  useEffect(() => {
    if (riskId) {
      checkGate();
    }
  }, [riskId, pciInstances.length]);

  async function loadPCIInstances() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getPCIInstancesForRisk(riskId);
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPCIInstances(data || []);
        onPCICountChange?.(data?.length || 0);
      }
    } catch (err) {
      setError('Failed to load controls');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function checkGate() {
    try {
      const { data } = await checkActivationGate(riskId);
      setGateResult(data);
    } catch (err) {
      console.error('Failed to check activation gate:', err);
    }
  }

  async function loadAISuggestions() {
    if (!riskResponse) return;
    setLoadingAI(true);
    try {
      const { data } = await getPCISuggestions(riskId, riskResponse);
      setAiSuggestions(data || []);
    } catch (err) {
      console.error('Failed to load AI suggestions:', err);
      setAiSuggestions([]);
    } finally {
      setLoadingAI(false);
    }
  }

  async function loadDeclinedTemplates() {
    try {
      const { data } = await getDeclinedTemplatesForRisk(riskId);
      setDeclinedTemplateIds(data || []);
    } catch (err) {
      console.error('Failed to load declined templates:', err);
    }
  }

  function handleDeclineTemplate(templateId: string) {
    setDeclinedTemplateIds((prev) => [...prev, templateId]);
  }

  function handleUndoDeclineTemplate(templateId: string) {
    setDeclinedTemplateIds((prev) => prev.filter((id) => id !== templateId));
  }

  function handleSelectTemplate(template: PCITemplate) {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setShowCreationForm(true);
  }

  function handleCreationSuccess() {
    loadPCIInstances();
    setSelectedTemplate(null);
  }

  function handleBackToTemplates() {
    setShowCreationForm(false);
    setSelectedTemplate(null);
    setShowTemplateSelector(true);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out not_applicable instances for display
  const activePCIInstances = pciInstances.filter((p) => p.status !== 'not_applicable');
  const activeCount = activePCIInstances.length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Controls (PCI)
              <Badge variant="outline">
                {activeCount} control{activeCount !== 1 && 's'}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={loadPCIInstances}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {!readOnly && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowTemplateSelector(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Control
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* G1 Gate Warning */}
          {gateResult && !gateResult.can_activate && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {gateResult.validation_message}
              </AlertDescription>
            </Alert>
          )}

          {/* G1 Gate Success */}
          {gateResult && gateResult.can_activate && riskResponse !== 'accept' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Risk can be activated. Response is "{gateResult.response_type}" with{' '}
                {gateResult.pci_count} control(s).
              </AlertDescription>
            </Alert>
          )}

          {/* Accept Response Note */}
          {riskResponse === 'accept' && (
            <Alert>
              <AlertDescription>
                Response is "Accept" - no controls are required. You may still
                add controls for monitoring purposes.
              </AlertDescription>
            </Alert>
          )}

          {/* Effectiveness Summary */}
          {activeCount > 0 && (() => {
            const activeInstances = activePCIInstances.filter(p => p.status === 'active');
            const effectivenessValues = activeInstances
              .map(p => calculateEffectiveness(p.derived_dime_score))
              .filter((e): e is number => e !== null);

            if (effectivenessValues.length === 0) {
              return null;
            }

            const avgEffectiveness = effectivenessValues.reduce((a, b) => a + b, 0) / effectivenessValues.length;
            const maxEffectiveness = Math.max(...effectivenessValues);

            const getColorClass = (value: number) => {
              if (value >= 75) return 'text-green-600 bg-green-100';
              if (value >= 50) return 'text-yellow-600 bg-yellow-100';
              if (value >= 25) return 'text-orange-600 bg-orange-100';
              return 'text-red-600 bg-red-100';
            };

            return (
              <div className="bg-slate-50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Effectiveness Summary
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-800">
                      {activeInstances.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Controls</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold inline-block px-2 rounded ${getColorClass(avgEffectiveness)}`}>
                      {avgEffectiveness.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Avg. Effectiveness</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold inline-block px-2 rounded ${getColorClass(maxEffectiveness)}`}>
                      {maxEffectiveness.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Best Control</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Empty State */}
          {activeCount === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="mb-4">No controls defined yet</p>
              {!readOnly && (
                <Button type="button" onClick={() => setShowTemplateSelector(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Control
                </Button>
              )}
            </div>
          )}

          {/* PCI Instance Cards */}
          {activeCount > 0 && (
            <div className="grid gap-4">
              {activePCIInstances.map((pci) => (
                <PCIInstanceCard
                  key={pci.id}
                  pciInstance={pci}
                  readOnly={readOnly}
                  onUpdate={loadPCIInstances}
                  onDelete={loadPCIInstances}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Selector Modal */}
      <PCITemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelect={handleSelectTemplate}
        riskId={riskId}
        riskResponse={riskResponse}
        aiSuggestions={aiSuggestions.map((s) => s.template_id)}
        existingTemplateIds={activePCIInstances.map((p) => p.pci_template_id)}
        declinedTemplateIds={declinedTemplateIds}
        onDecline={handleDeclineTemplate}
        onUndoDecline={handleUndoDeclineTemplate}
      />

      {/* Creation Form Modal */}
      <PCICreationForm
        open={showCreationForm}
        onOpenChange={setShowCreationForm}
        template={selectedTemplate}
        riskId={riskId}
        onSuccess={handleCreationSuccess}
        onBack={handleBackToTemplates}
      />
    </>
  );
}
