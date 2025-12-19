/**
 * KRIForm Component
 *
 * Form for creating/editing KRI definitions
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KRIDefinition } from '@/lib/kri';
import { generateAIKRISuggestions, type AIKRISuggestion } from '@/lib/kri';
import { getRisks } from '@/lib/risks';
import type { Risk } from '@/types/risk';

interface KRIFormProps {
  kri: KRIDefinition | null;
  onSave: (data: Partial<KRIDefinition>, riskCodeToLink?: string) => void;
  onCancel: () => void;
}

export default function KRIForm({ kri, onSave, onCancel }: KRIFormProps) {
  const [formData, setFormData] = useState<Partial<KRIDefinition>>({
    kri_code: kri?.kri_code || undefined, // Keep existing code when editing, undefined when creating
    kri_name: kri?.kri_name || '',
    description: kri?.description || '',
    category: kri?.category || '',
    indicator_type: kri?.indicator_type || 'lagging',
    measurement_unit: kri?.measurement_unit || '',
    data_source: kri?.data_source || '',
    collection_frequency: kri?.collection_frequency || 'Monthly',
    target_value: kri?.target_value || null,
    lower_threshold: kri?.lower_threshold || null,
    upper_threshold: kri?.upper_threshold || null,
    threshold_direction: kri?.threshold_direction || 'above',
    responsible_user: kri?.responsible_user || '',
    enabled: kri?.enabled ?? true,
  });

  const [manualRiskLink, setManualRiskLink] = useState<string | undefined>(undefined);

  const [aiSuggestions, setAiSuggestions] = useState<AIKRISuggestion[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [selectedRiskCode, setSelectedRiskCode] = useState<string>('');
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent double-clicks

  useEffect(() => {
    loadRisks();
  }, []);

  useEffect(() => {
    // When editing a KRI, load its linked risks
    if (kri && kri.linked_risk_codes && kri.linked_risk_codes.length > 0) {
      setManualRiskLink(kri.linked_risk_codes[0]);
    }
  }, [kri]);

  async function loadRisks() {
    const result = await getRisks();
    if (result.data) {
      setRisks(result.data);
    }
  }

  async function handleGenerateAI() {
    if (!selectedRiskCode) {
      alert('Please select a risk first');
      return;
    }

    setLoadingAI(true);
    try {
      console.log('Calling AI KRI generation for risk:', selectedRiskCode);
      const result = await generateAIKRISuggestions(selectedRiskCode);
      console.log('AI Result:', result);

      if (result.error) {
        console.error('AI Error:', result.error);
        alert(`AI Generation Error: ${result.error.message}`);
        return;
      }

      if (!result.data || result.data.length === 0) {
        alert('AI did not generate any suggestions.');
        return;
      }

      console.log(`Generated ${result.data.length} KRI suggestions`);
      setAiSuggestions(result.data || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert(`Failed to generate AI suggestions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingAI(false);
    }
  }

  function handleSuggestionToggle(index: number) {
    const newSelection = new Set(selectedSuggestions);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedSuggestions(newSelection);
  }

  async function handleCreateSelectedKRIs() {
    if (selectedSuggestions.size === 0) {
      alert('Please select at least one KRI to create');
      return;
    }

    if (isSubmitting) {
      console.log('⚠️ KRI creation already in progress, ignoring duplicate click');
      return;
    }

    setIsSubmitting(true);
    const selectedIndices = Array.from(selectedSuggestions);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const index of selectedIndices) {
        const suggestion = aiSuggestions[index];
        try {
          // Pass the risk code to link the KRI to the risk
          await onSave({
            kri_name: suggestion.kri_name,
            description: suggestion.description,
            category: suggestion.category,
            indicator_type: suggestion.indicator_type,
            measurement_unit: suggestion.measurement_unit,
            data_source: suggestion.data_source,
            collection_frequency: suggestion.collection_frequency,
            target_value: suggestion.target_value,
            lower_threshold: suggestion.lower_threshold,
            upper_threshold: suggestion.upper_threshold,
            threshold_direction: suggestion.threshold_direction,
            responsible_user: suggestion.responsible_user,
          }, suggestion.linked_risk_code || selectedRiskCode);
          successCount++;
        } catch (err) {
          console.error(`Failed to create KRI: ${suggestion.kri_name}`, err);
          failCount++;
        }
      }

      // Show summary
      if (successCount > 0) {
        alert(`Successfully created ${successCount} KRI(s)${failCount > 0 ? `. ${failCount} failed.` : '!'}`);
        setShowSuggestions(false);
        setSelectedSuggestions(new Set());
        setAiSuggestions([]);
      } else {
        alert('Failed to create KRIs. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation - kri_code will be auto-generated if not present
    if (!formData.kri_name) {
      alert('KRI name is required');
      return;
    }

    if (isSubmitting) {
      console.log('⚠️ KRI save already in progress, ignoring duplicate submit');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save the KRI and pass the risk code to link if provided
      await onSave(formData, manualRiskLink || undefined);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* KRI Code - only show when editing (read-only) */}
      {kri && (
        <div>
          <Label>KRI Code</Label>
          <Input
            value={formData.kri_code || ''}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">KRI codes cannot be changed</p>
        </div>
      )}

      {/* Show auto-generation info when creating new KRI */}
      {!kri && (
        <Alert>
          <AlertDescription>
            KRI code will be auto-generated sequentially (e.g., KRI-001, KRI-002)
          </AlertDescription>
        </Alert>
      )}

      {/* AI Generation Section */}
      {!kri && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <p className="font-medium text-blue-900">✨ AI Assistant</p>
            <p className="text-sm text-blue-700">
              Select a risk and let AI suggest relevant KRIs
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Select Risk</Label>
              <Select value={selectedRiskCode} onValueChange={setSelectedRiskCode}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Choose a risk..." />
                </SelectTrigger>
                <SelectContent>
                  {risks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.risk_code}>
                      {risk.risk_code} - {risk.risk_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={handleGenerateAI}
              disabled={loadingAI || !selectedRiskCode}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loadingAI ? '🤖 Analyzing...' : '🤖 Generate KRIs'}
            </Button>
          </div>
        </div>
      )}

      {/* AI Suggestions Display */}
      {showSuggestions && aiSuggestions.length > 0 && (
        <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">AI Suggested KRIs ({aiSuggestions.length})</h4>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleCreateSelectedKRIs}
                disabled={selectedSuggestions.size === 0}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Create Selected ({selectedSuggestions.size})
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
              >
                Close
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-600">Select one or more KRIs to create them all at once. You can create multiple KRIs for the same risk.</p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {aiSuggestions.map((suggestion, idx) => (
              <Card
                key={idx}
                className={`cursor-pointer transition-all ${
                  selectedSuggestions.has(idx)
                    ? 'border-green-500 border-2 bg-green-50'
                    : 'hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => handleSuggestionToggle(idx)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(idx)}
                      onChange={() => handleSuggestionToggle(idx)}
                      className="mt-1 h-4 w-4 text-green-600 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold">{suggestion.kri_name}</h5>
                        <Badge variant="outline">{suggestion.category}</Badge>
                        <Badge variant="secondary">{suggestion.indicator_type}</Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{suggestion.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>📊 Unit: {suggestion.measurement_unit}</div>
                        <div>📅 Frequency: {suggestion.collection_frequency}</div>
                        <div>🎯 Target: {suggestion.target_value}</div>
                        <div>⚠️ Thresholds: {suggestion.lower_threshold} / {suggestion.upper_threshold}</div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 italic">
                        💡 {suggestion.reasoning}
                      </p>
                      {suggestion.linked_risk_code && (
                        <p className="text-xs text-blue-600 mt-1">
                          🔗 Linked to: {suggestion.linked_risk_code}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Link to Risk - editable when creating, read-only when editing */}
      <div>
        <Label>Linked Risk {kri ? '(Current)' : '(Optional)'}</Label>
        {kri ? (
          // When editing: Show as read-only text
          <div className="p-3 bg-gray-50 border rounded-md">
            {kri.linked_risk_codes && kri.linked_risk_codes.length > 0 ? (
              <div>
                <p className="font-medium text-gray-900">
                  {kri.linked_risk_codes[0]}
                  {risks.find(r => r.risk_code === kri.linked_risk_codes![0]) && (
                    <span className="text-gray-600 ml-2">
                      - {risks.find(r => r.risk_code === kri.linked_risk_codes![0])?.risk_title}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 italic">No risk linked</p>
            )}
          </div>
        ) : (
          // When creating: Show as editable dropdown
          <Select value={manualRiskLink || undefined} onValueChange={(value) => setManualRiskLink(value || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="None - Don't link to any risk" />
            </SelectTrigger>
            <SelectContent>
              {risks.map((risk) => (
                <SelectItem key={risk.id} value={risk.risk_code}>
                  {risk.risk_code} - {risk.risk_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {kri
            ? 'Risk links cannot be changed after creation. Delete and recreate the KRI to link to a different risk.'
            : 'Select which risk this KRI will monitor'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Input
            value={formData.category || ''}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Operational, Financial, etc."
          />
        </div>
        <div>
          <Label>Indicator Type</Label>
          <Select
            value={formData.indicator_type || 'lagging'}
            onValueChange={(value) => setFormData({ ...formData, indicator_type: value as 'leading' | 'lagging' | 'concurrent' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leading">Leading</SelectItem>
              <SelectItem value="lagging">Lagging</SelectItem>
              <SelectItem value="concurrent">Concurrent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>KRI Name *</Label>
        <Input
          value={formData.kri_name}
          onChange={(e) => setFormData({ ...formData, kri_name: e.target.value })}
          placeholder="Number of security incidents"
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this KRI measures..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Measurement Unit</Label>
          <Input
            value={formData.measurement_unit || ''}
            onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value })}
            placeholder="count, %, USD, etc."
          />
        </div>
        <div>
          <Label>Data Source</Label>
          <Input
            value={formData.data_source || ''}
            onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
            placeholder="Where data comes from"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Collection Frequency</Label>
          <Select
            value={formData.collection_frequency || 'Monthly'}
            onValueChange={(value) => setFormData({ ...formData, collection_frequency: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Quarterly">Quarterly</SelectItem>
              <SelectItem value="Annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Responsible User</Label>
          <Input
            value={formData.responsible_user || ''}
            onChange={(e) => setFormData({ ...formData, responsible_user: e.target.value })}
            placeholder="Person responsible"
          />
        </div>
      </div>

      <div>
        <Label>Threshold Direction</Label>
        <Select
          value={formData.threshold_direction}
          onValueChange={(value) => setFormData({ ...formData, threshold_direction: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="above">Alert when value goes ABOVE threshold</SelectItem>
            <SelectItem value="below">Alert when value goes BELOW threshold</SelectItem>
            <SelectItem value="outside">Alert when value goes OUTSIDE range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Thresholds */}
      <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
        <h4 className="font-semibold">Thresholds & Targets</h4>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Target Value</Label>
            <Input
              type="number"
              step="any"
              value={formData.target_value || ''}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="Ideal value"
            />
          </div>
          <div>
            <Label>Lower Threshold</Label>
            <Input
              type="number"
              step="any"
              value={formData.lower_threshold || ''}
              onChange={(e) => setFormData({ ...formData, lower_threshold: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="Alert if below"
            />
          </div>
          <div>
            <Label>Upper Threshold</Label>
            <Input
              type="number"
              step="any"
              value={formData.upper_threshold || ''}
              onChange={(e) => setFormData({ ...formData, upper_threshold: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="Alert if above"
            />
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Thresholds determine when alerts are triggered based on measured values
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (kri ? 'Updating...' : 'Creating...') : (kri ? 'Update KRI' : 'Create KRI')}
        </Button>
      </div>
    </form>
  );
}
