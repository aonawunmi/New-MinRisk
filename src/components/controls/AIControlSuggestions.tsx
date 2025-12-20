/**
 * AIControlSuggestions Component
 *
 * Displays AI-recommended controls for a risk and allows user to accept/reject them
 */

import { useState } from 'react';
import { getAIControlRecommendations, type AISuggestedControl } from '@/lib/ai';
import { createControl, calculateControlEffectiveness } from '@/lib/controls';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AIControlSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riskId: string;
  riskTitle: string;
  riskDescription: string;
  category: string;
  division: string;
  inherentLikelihood: number;
  inherentImpact: number;
  onSuccess: () => void; // Called when controls are created successfully
}

export default function AIControlSuggestions({
  open,
  onOpenChange,
  riskId,
  riskTitle,
  riskDescription,
  category,
  division,
  inherentLikelihood,
  inherentImpact,
  onSuccess,
}: AIControlSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestedControl[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Fetch AI suggestions when dialog opens
  async function handleGetSuggestions() {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());

    try {
      const { data, error: aiError } = await getAIControlRecommendations(
        riskTitle,
        riskDescription,
        category,
        division,
        inherentLikelihood,
        inherentImpact
      );

      if (aiError) {
        setError(aiError.message);
        return;
      }

      if (!data || data.length === 0) {
        setError('No suggestions generated. Please try again.');
        return;
      }

      setSuggestions(data);
      // Select all by default
      setSelectedSuggestions(new Set(data.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
    } finally {
      setLoading(false);
    }
  }

  function toggleSuggestion(index: number) {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  }

  async function handleCreateControls() {
    setCreating(true);
    setError(null);

    try {
      const controlsToCreate = suggestions.filter((_, i) => selectedSuggestions.has(i));

      if (controlsToCreate.length === 0) {
        setError('Please select at least one control to create');
        setCreating(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const suggestion of controlsToCreate) {
        const { error: createError } = await createControl({
          risk_id: riskId,
          name: suggestion.name,
          description: suggestion.description,
          control_type: suggestion.control_type,
          target: suggestion.target,
          design_score: suggestion.design_score,
          implementation_score: suggestion.implementation_score,
          monitoring_score: suggestion.monitoring_score,
          evaluation_score: suggestion.evaluation_score,
        });

        if (createError) {
          console.error('Failed to create control:', suggestion.name, createError);
          failCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        onSuccess();
        onOpenChange(false);
      }

      if (failCount > 0) {
        setError(`Created ${successCount} controls, but ${failCount} failed. Check console for details.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create controls');
    } finally {
      setCreating(false);
    }
  }

  function calculateEffectiveness(suggestion: AISuggestedControl): number {
    // Use single source of truth from src/lib/controls.ts
    const effectivenessFraction = calculateControlEffectiveness(
      suggestion.design_score,
      suggestion.implementation_score,
      suggestion.monitoring_score,
      suggestion.evaluation_score
    );
    // Convert from fraction (0-1) to percentage (0-100)
    return Math.round(effectivenessFraction * 100);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Control Recommendations
          </DialogTitle>
          <DialogDescription>
            Get AI-powered control suggestions for: <strong>{riskTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Initial state - show button to get suggestions */}
          {!loading && suggestions.length === 0 && !error && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Click below to get AI-powered control recommendations for this risk
              </p>
              <Button onClick={handleGetSuggestions}>
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Suggestions
              </Button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Analyzing risk and generating control recommendations...</p>
              <p className="text-sm text-gray-500 mt-2">This may take 10-20 seconds</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Suggestions list */}
          {suggestions.length > 0 && (
            <>
              <Alert className="border-purple-200 bg-purple-50">
                <AlertDescription className="text-purple-800">
                  <strong>{suggestions.length} controls suggested.</strong> Review and select which controls to create.
                  All selected controls will be automatically linked to this risk.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => {
                  const effectiveness = calculateEffectiveness(suggestion);
                  const isSelected = selectedSuggestions.has(index);

                  return (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'border-purple-600 bg-purple-50' : 'hover:border-gray-400'
                      }`}
                      onClick={() => toggleSuggestion(index)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSuggestion(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <CardTitle className="text-base">{suggestion.name}</CardTitle>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="capitalize">
                                {suggestion.control_type}
                              </Badge>
                              <Badge variant={suggestion.target === 'Likelihood' ? 'default' : 'secondary'}>
                                {suggestion.target}
                              </Badge>
                              <Badge
                                className={
                                  effectiveness >= 67
                                    ? 'bg-green-100 text-green-800'
                                    : effectiveness >= 33
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }
                              >
                                {effectiveness.toFixed(0)}% Effective
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 mb-3">{suggestion.description}</p>

                        <div className="bg-gray-50 rounded p-3 mb-3">
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Design:</span>{' '}
                              <span className="font-semibold">{suggestion.design_score}/3</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Implementation:</span>{' '}
                              <span className="font-semibold">{suggestion.implementation_score}/3</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Monitoring:</span>{' '}
                              <span className="font-semibold">{suggestion.monitoring_score}/3</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Evaluation:</span>{' '}
                              <span className="font-semibold">{suggestion.evaluation_score}/3</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 italic border-l-2 border-purple-300 pl-3">
                          <strong>Rationale:</strong> {suggestion.rationale}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {suggestions.length > 0 && (
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-600">
                {selectedSuggestions.size} of {suggestions.length} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleGetSuggestions} variant="outline" disabled={creating}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleCreateControls}
                  disabled={creating || selectedSuggestions.size === 0}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create {selectedSuggestions.size} Control{selectedSuggestions.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
