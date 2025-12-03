/**
 * ADMIN Incident Review Dashboard
 * Phase 4+5: AI-Assisted Risk Mapping Review Interface
 *
 * Shows unclassified incidents with AI suggestions
 * ADMIN can accept/reject suggestions with confidence scoring
 * AND view/manage incidents that have been mapped to risks
 */

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getAISuggestionsForIncident,
  acceptAISuggestion,
  rejectAISuggestion,
  analyzeIncidentForRiskMapping
} from '../../lib/incidents';
import { MappedIncidentsView } from './MappedIncidentsView';
import { VoidedIncidentsView } from './VoidedIncidentsView';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';

interface UnclassifiedIncident {
  id: string;
  incident_code: string;
  title: string;
  description: string;
  incident_type: string;
  severity: number;
  incident_date: string;
  financial_impact: number | null;
  created_at: string;
  resolution_status: string;
}

interface AISuggestion {
  id: string;
  risk_id: string;
  confidence_score: number;
  reasoning: string;
  keywords_matched: string[];
  similar_incident_count: number;
  status: string;
  ai_model_version: string;
  created_at: string;
  risks: {
    id: string;
    risk_code: string;
    risk_title: string;
    category: string;
    status: string;
  } | null;
}

export function AdminIncidentReview() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'pending' | 'mapped' | 'voided'>('pending');

  const [incidents, setIncidents] = useState<UnclassifiedIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<UnclassifiedIncident | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review state
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [classificationConfidence, setClassificationConfidence] = useState(100);
  const [selectedLinkType, setSelectedLinkType] = useState<string>('PRIMARY');
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);

  // Load unclassified incidents
  const loadUnclassifiedIncidents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('incidents')
        .select('*')
        .eq('resolution_status', 'PENDING_CLASSIFICATION')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setIncidents(data || []);
    } catch (err) {
      console.error('Error loading incidents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setIsLoading(false);
    }
  };

  // Load AI suggestions for selected incident
  const loadSuggestions = async (incidentId: string) => {
    try {
      console.log('🔍 Fetching suggestions for incident:', incidentId);
      const { data, error: fetchError } = await getAISuggestionsForIncident(incidentId, 'pending');

      if (fetchError) {
        console.error('❌ Error fetching suggestions:', fetchError);
        throw fetchError;
      }

      console.log('✅ Fetched suggestions:', data?.length || 0, 'suggestions');
      console.log('Suggestions data:', data);
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    }
  };

  // Trigger AI analysis for incident
  const triggerAnalysis = async (incidentId: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: analysisError } = await analyzeIncidentForRiskMapping(incidentId);

      if (analysisError) throw analysisError;

      console.log('AI analysis complete:', data);

      // Wait a moment for database transaction to commit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload suggestions
      console.log('Loading suggestions for incident:', incidentId);
      await loadSuggestions(incidentId);
      console.log('Suggestions loaded, count:', suggestions.length);

      // Show success message
      setSuccessMessage(`AI analysis complete! Generated ${data.suggestions_count} suggestion${data.suggestions_count !== 1 ? 's' : ''}`);
      setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds
    } catch (err) {
      console.error('Error triggering analysis:', err);
      setError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Accept AI suggestion
  const handleAccept = async (suggestionId: string) => {
    if (!selectedIncident) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: acceptError } = await acceptAISuggestion(
        suggestionId,
        selectedLinkType,  // NEW: Pass admin-selected link type
        adminNotes || undefined,
        classificationConfidence
      );

      if (acceptError) throw acceptError;

      // Refresh data
      await loadUnclassifiedIncidents();
      await loadSuggestions(selectedIncident.id);

      // Reset form
      setAdminNotes('');
      setClassificationConfidence(100);
      setSelectedLinkType('PRIMARY');  // Reset to default
      setSelectedSuggestionId(null);

      // Show success message
      setSuccessMessage('Suggestion accepted! Risk mapping has been created successfully.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error accepting suggestion:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept suggestion');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject AI suggestion
  const handleReject = async (suggestionId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const { error: rejectError } = await rejectAISuggestion(
        suggestionId,
        adminNotes || undefined
      );

      if (rejectError) throw rejectError;

      // Refresh suggestions
      if (selectedIncident) {
        await loadSuggestions(selectedIncident.id);
      }

      // Reset form
      setAdminNotes('');
      setSelectedSuggestionId(null);

      // Show success message
      setSuccessMessage('Suggestion rejected successfully.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error rejecting suggestion:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject suggestion');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    loadUnclassifiedIncidents();
  }, []);

  useEffect(() => {
    if (selectedIncident) {
      loadSuggestions(selectedIncident.id);
    }
  }, [selectedIncident]);

  const getSeverityText = (sev: number) => {
    switch (sev) {
      case 1: return 'LOW';
      case 2: return 'MEDIUM';
      case 3: return 'HIGH';
      case 4: return 'CRITICAL';
      default: return 'UNKNOWN';
    }
  };

  const getSeverityColor = (sev: number) => {
    switch (sev) {
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-yellow-600';
    return 'text-gray-600';
  };

  // Check description quality
  const getDescriptionQuality = (description: string) => {
    const length = description.length;
    const wordCount = description.split(/\s+/).length;

    // Quality scoring
    const hasMinLength = length >= 100;
    const hasGoodLength = length >= 200;
    const hasEnoughWords = wordCount >= 20;
    const hasDetailKeywords = /impact|cause|affect|damage|loss|system|user|data|critical|issue|problem/i.test(description);

    let quality: 'poor' | 'fair' | 'good' = 'poor';
    if (hasGoodLength && hasEnoughWords && hasDetailKeywords) {
      quality = 'good';
    } else if (hasMinLength && hasEnoughWords) {
      quality = 'fair';
    }

    return { length, wordCount, quality, hasDetailKeywords };
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading unclassified incidents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Incident Risk Mapping</h2>
          <p className="text-muted-foreground">
            Review AI suggestions and manage risk mappings
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'pending'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending Classification
          <Badge variant="outline" className="ml-2">
            {incidents.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab('mapped')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'mapped'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Mapped Incidents
        </button>
        <button
          onClick={() => setActiveTab('voided')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'voided'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Voided Incidents (Audit)
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tab Content */}
      {activeTab === 'mapped' ? (
        <MappedIncidentsView />
      ) : activeTab === 'voided' ? (
        <VoidedIncidentsView />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Unclassified Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No incidents pending classification
              </p>
            ) : (
              <div className="space-y-2">
                {incidents.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedIncident?.id === incident.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {incident.incident_code}
                      </span>
                      <Badge className={getSeverityColor(incident.severity)}>
                        {getSeverityText(incident.severity)}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm">{incident.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(incident.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incident Details & AI Suggestions */}
        <Card className="lg:col-span-2">
          {!selectedIncident ? (
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Select an incident to review AI suggestions
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedIncident.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedIncident.incident_code} • {selectedIncident.incident_type}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerAnalysis(selectedIncident.id)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? '🔄 Analyzing...' : '🧠 Run AI Analysis'}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Incident Description */}
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
                    {selectedIncident.description}
                  </div>

                  {/* Description Quality Warning */}
                  {(() => {
                    const quality = getDescriptionQuality(selectedIncident.description);

                    if (quality.quality === 'poor') {
                      return (
                        <Alert className="mt-3 border-orange-200 bg-orange-50">
                          <AlertDescription>
                            <div className="space-y-2">
                              <p className="font-semibold text-orange-900">⚠️ Brief Incident Description</p>
                              <p className="text-sm text-orange-800">
                                This incident has a very brief description ({quality.length} characters, {quality.wordCount} words).
                                For more accurate AI risk mapping suggestions, consider adding:
                              </p>
                              <ul className="text-sm text-orange-800 list-disc list-inside space-y-1 ml-2">
                                <li><strong>What happened:</strong> Specific event details and timeline</li>
                                <li><strong>Root cause:</strong> Why it occurred (if known)</li>
                                <li><strong>Impact:</strong> Systems, departments, or users affected</li>
                                <li><strong>Financial impact:</strong> Estimated or actual monetary loss</li>
                                <li><strong>Technical details:</strong> CVE numbers, error codes, system IDs</li>
                              </ul>
                              <p className="text-sm text-orange-800 mt-2">
                                <strong>Recommended minimum:</strong> 100 characters with specific details about impact and cause
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      );
                    } else if (quality.quality === 'fair') {
                      return (
                        <Alert className="mt-3 border-blue-200 bg-blue-50">
                          <AlertDescription>
                            <p className="text-sm text-blue-800">
                              ℹ️ <strong>Moderate description quality.</strong> The AI will analyze based on available details.
                              Adding more context about root cause and impact could improve suggestion accuracy.
                            </p>
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* AI Suggestions */}
                <div>
                  <Label className="text-lg font-semibold">AI Risk Suggestions</Label>
                  {suggestions.length === 0 ? (
                    <Alert className="mt-3">
                      <AlertDescription>
                        No AI suggestions yet. Click "Run AI Analysis" to generate suggestions.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="mt-3 space-y-4">
                      {suggestions.map((suggestion) => (
                        <Card key={suggestion.id} className="border-2">
                          <CardContent className="pt-6">
                            {/* Risk Info */}
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono font-semibold text-primary">
                                    {suggestion.risks?.risk_code || 'N/A'}
                                  </span>
                                  <Badge variant="outline">{suggestion.risks?.category || 'N/A'}</Badge>
                                </div>
                                <h4 className="font-semibold">{suggestion.risks?.risk_title || 'Risk Not Found'}</h4>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-bold ${getConfidenceColor(suggestion.confidence_score)}`}>
                                  {suggestion.confidence_score}%
                                </p>
                                <p className="text-xs text-muted-foreground">AI Confidence</p>
                              </div>
                            </div>

                            {/* Keywords */}
                            <div className="mb-4">
                              <Label className="text-xs text-muted-foreground">Keywords Matched:</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {suggestion.keywords_matched.map((keyword, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Reasoning */}
                            <div className="mb-4">
                              <Label className="text-xs text-muted-foreground">AI Reasoning:</Label>
                              <div className="mt-1 p-3 bg-muted/30 rounded-md text-sm">
                                {expandedReasoning === suggestion.id ? (
                                  <div>
                                    <p>{suggestion.reasoning}</p>
                                    <button
                                      onClick={() => setExpandedReasoning(null)}
                                      className="text-primary text-xs mt-2 hover:underline"
                                    >
                                      Show less
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <p>{suggestion.reasoning.slice(0, 150)}...</p>
                                    <button
                                      onClick={() => setExpandedReasoning(suggestion.id)}
                                      className="text-primary text-xs mt-2 hover:underline"
                                    >
                                      Read full reasoning
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Review Actions */}
                            {selectedSuggestionId === suggestion.id ? (
                              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                {/* Classification Confidence Slider */}
                                <div>
                                  <Label>Your Classification Confidence: {classificationConfidence}%</Label>
                                  <Slider
                                    value={[classificationConfidence]}
                                    onValueChange={(value) => setClassificationConfidence(value[0])}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="mt-2"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {classificationConfidence < 70
                                      ? '⚠️ Low confidence will flag incident for follow-up'
                                      : '✓ High confidence will mark as confirmed'}
                                  </p>
                                </div>

                                {/* Link Type Selection */}
                                <div>
                                  <Label>Risk Link Type</Label>
                                  <select
                                    value={selectedLinkType}
                                    onChange={(e) => setSelectedLinkType(e.target.value)}
                                    className="mt-2 w-full p-2 border rounded-md bg-background"
                                  >
                                    <option value="PRIMARY">PRIMARY - Main contributing risk</option>
                                    <option value="SECONDARY">SECONDARY - Supporting factor</option>
                                    <option value="CONTRIBUTORY">CONTRIBUTORY - Partial contributor</option>
                                    <option value="ASSOCIATED">ASSOCIATED - Related but indirect</option>
                                  </select>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {selectedLinkType === 'PRIMARY' && '🔴 This risk is a main cause of the incident'}
                                    {selectedLinkType === 'SECONDARY' && '🟡 This risk is a supporting factor'}
                                    {selectedLinkType === 'CONTRIBUTORY' && '🟠 This risk partially contributed'}
                                    {selectedLinkType === 'ASSOCIATED' && '🔵 This risk is related but indirect'}
                                  </p>
                                </div>

                                {/* Admin Notes */}
                                <div>
                                  <Label>Admin Notes (Optional)</Label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add any notes about this classification..."
                                    className="mt-2"
                                    rows={3}
                                  />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleAccept(suggestion.id)}
                                    disabled={isProcessing}
                                    className="flex-1"
                                  >
                                    ✓ Accept & Map Risk
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setSelectedSuggestionId(null)}
                                    disabled={isProcessing}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => setSelectedSuggestionId(suggestion.id)}
                                  variant="default"
                                  size="sm"
                                  className="flex-1"
                                >
                                  ✓ Accept
                                </Button>
                                <Button
                                  onClick={() => handleReject(suggestion.id)}
                                  variant="outline"
                                  size="sm"
                                  disabled={isProcessing}
                                >
                                  ✗ Reject
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
      )}
    </div>
  );
}
