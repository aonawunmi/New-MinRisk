/**
 * RiskResponseSelector Component
 *
 * Displays and allows selection of the risk treatment response.
 * Shows AI proposal if available and allows user confirmation.
 */

import { useState, useEffect } from 'react';
import { getRiskResponse, upsertRiskResponse } from '@/lib/pci';
import type {
  RiskResponse,
  RiskResponseType,
} from '@/types/pci';
import {
  RESPONSE_TYPE_LABELS,
  RESPONSE_TYPE_DESCRIPTIONS,
} from '@/types/pci';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Shield,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface RiskResponseSelectorProps {
  riskId: string;
  readOnly?: boolean;
  onResponseChange?: (response: RiskResponse | null) => void;
  aiProposal?: {
    response: RiskResponseType;
    rationale: string;
  };
}

const RESPONSE_OPTIONS: RiskResponseType[] = [
  'avoid',
  'reduce_likelihood',
  'reduce_impact',
  'transfer_share',
  'accept',
];

export default function RiskResponseSelector({
  riskId,
  readOnly = false,
  onResponseChange,
  aiProposal,
}: RiskResponseSelectorProps) {
  const [response, setResponse] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local form state
  const [selectedType, setSelectedType] = useState<RiskResponseType | ''>('');
  const [rationale, setRationale] = useState('');
  const [showRationale, setShowRationale] = useState(false);
  const [showAIProposal, setShowAIProposal] = useState(true);

  // Load existing response
  useEffect(() => {
    loadResponse();
  }, [riskId]);

  async function loadResponse() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getRiskResponse(riskId);
      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is ok
        setError(fetchError.message);
      } else {
        setResponse(data);
        if (data) {
          setSelectedType(data.response_type);
          setRationale(data.response_rationale || '');
        }
        onResponseChange?.(data);
      }
    } catch (err) {
      setError('Failed to load risk response');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedType) return;

    setSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await upsertRiskResponse({
        risk_id: riskId,
        response_type: selectedType,
        response_rationale: rationale || undefined,
        ai_proposed_response: aiProposal?.response,
        ai_response_rationale: aiProposal?.rationale,
      });

      if (saveError) {
        setError(saveError.message);
      } else {
        setResponse(data);
        onResponseChange?.(data);
      }
    } catch (err) {
      setError('Failed to save risk response');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleAcceptAIProposal() {
    if (aiProposal) {
      setSelectedType(aiProposal.response);
      setRationale(aiProposal.rationale);
      setShowRationale(true);
    }
  }

  function getResponseIcon(type: RiskResponseType) {
    switch (type) {
      case 'avoid':
        return <AlertTriangle className="h-4 w-4" />;
      case 'reduce_likelihood':
      case 'reduce_impact':
        return <Shield className="h-4 w-4" />;
      case 'transfer_share':
        return <Shield className="h-4 w-4" />;
      case 'accept':
        return <Check className="h-4 w-4" />;
      default:
        return null;
    }
  }

  function getResponseColor(type: RiskResponseType) {
    switch (type) {
      case 'avoid':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'reduce_likelihood':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reduce_impact':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'transfer_share':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accept':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  const hasChanges =
    selectedType !== (response?.response_type || '') ||
    rationale !== (response?.response_rationale || '');

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Response
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-10 bg-gray-200 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Response
          {response && (
            <Badge
              variant="outline"
              className={getResponseColor(response.response_type)}
            >
              {RESPONSE_TYPE_LABELS[response.response_type]}
            </Badge>
          )}
          {!response && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Not Set
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* AI Proposal Section */}
        {aiProposal && !response && showAIProposal && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-purple-900">
                    AI Suggested Response
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAIProposal(false)}
                  >
                    Dismiss
                  </Button>
                </div>
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className={getResponseColor(aiProposal.response)}
                  >
                    {getResponseIcon(aiProposal.response)}
                    <span className="ml-1">
                      {RESPONSE_TYPE_LABELS[aiProposal.response]}
                    </span>
                  </Badge>
                </div>
                <p className="text-sm text-purple-800 mt-2">
                  {aiProposal.rationale}
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={handleAcceptAIProposal}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept Suggestion
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Response Selector */}
        {!readOnly && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="response-type">Treatment Decision</Label>
              <Select
                value={selectedType}
                onValueChange={(val) => setSelectedType(val as RiskResponseType)}
                disabled={readOnly}
              >
                <SelectTrigger id="response-type" className="mt-1">
                  <SelectValue placeholder="Select how you will treat this risk" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {getResponseIcon(type)}
                        <span>{RESPONSE_TYPE_LABELS[type]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Response Description */}
            {selectedType && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{RESPONSE_TYPE_DESCRIPTIONS[selectedType]}</span>
              </div>
            )}

            {/* Rationale Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRationale(!showRationale)}
              className="text-muted-foreground"
            >
              {showRationale ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Rationale
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Add Rationale (Optional)
                </>
              )}
            </Button>

            {/* Rationale Input */}
            {showRationale && (
              <div>
                <Label htmlFor="rationale">Rationale</Label>
                <Textarea
                  id="rationale"
                  placeholder="Explain why this response was chosen..."
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            )}

            {/* Save Button */}
            {hasChanges && selectedType && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : response ? 'Update Response' : 'Set Response'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Read-only Display */}
        {readOnly && response && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getResponseIcon(response.response_type)}
              <span className="font-medium">
                {RESPONSE_TYPE_LABELS[response.response_type]}
              </span>
            </div>
            {response.response_rationale && (
              <p className="text-sm text-muted-foreground">
                {response.response_rationale}
              </p>
            )}
            {response.ai_proposed_response && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <Sparkles className="h-3 w-3" />
                AI suggested: {RESPONSE_TYPE_LABELS[response.ai_proposed_response]}
              </div>
            )}
          </div>
        )}

        {/* Warning if no response set */}
        {!response && !selectedType && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              A risk response must be set before this risk can be activated.
              Select how you will treat this risk.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
