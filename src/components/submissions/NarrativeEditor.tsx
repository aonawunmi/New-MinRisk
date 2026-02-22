/**
 * Narrative Editor Component
 *
 * Per-SEC-category expandable card for editing narrative commentary.
 * Shows risk metrics, trend indicators, and an editable text area.
 * Can generate AI draft narratives via Edge Function.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Save,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  type SecSubmissionNarrative,
  updateNarrativeText,
  generateAINarrative,
  upsertNarrative,
} from '@/lib/sec-submissions';
import type { SecStandardCategory } from '@/lib/sec-categories';

// SEC category colors matching CategoryMappingConfig
const SEC_CATEGORY_COLORS: Record<string, string> = {
  STRATEGIC: 'bg-purple-100 text-purple-800',
  MARKET: 'bg-blue-100 text-blue-800',
  REGULATORY: 'bg-amber-100 text-amber-800',
  OPERATIONAL: 'bg-orange-100 text-orange-800',
  IT_CYBER: 'bg-red-100 text-red-800',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-white',
  LOW: 'bg-green-500 text-white',
};

interface NarrativeEditorProps {
  narrative: SecSubmissionNarrative;
  secCategory: SecStandardCategory;
  submissionId: string;
  organizationId: string;
  period: string;
  previousPeriod?: string;
  isReadOnly: boolean;
  onNarrativeUpdated: () => void;
}

export default function NarrativeEditor({
  narrative,
  secCategory,
  submissionId,
  organizationId,
  period,
  previousPeriod,
  isReadOnly,
  onNarrativeUpdated,
}: NarrativeEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedText, setEditedText] = useState(narrative.final_narrative || narrative.ai_draft || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const categoryCode = secCategory.code;
  const colorClass = SEC_CATEGORY_COLORS[categoryCode] || 'bg-gray-100 text-gray-800';

  // Trend icon component
  function TrendIcon() {
    switch (narrative.trend) {
      case 'improving':
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'deteriorating':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  }

  function trendLabel(): string {
    switch (narrative.trend) {
      case 'improving': return 'Improving';
      case 'deteriorating': return 'Deteriorating';
      default: return 'Stable';
    }
  }

  function trendColor(): string {
    switch (narrative.trend) {
      case 'improving': return 'text-green-600';
      case 'deteriorating': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Save edited narrative
  async function handleSave() {
    if (!narrative.id) return;

    setSaving(true);
    setError(null);

    const { error: saveError } = await updateNarrativeText(narrative.id, editedText);

    if (saveError) {
      setError(saveError.message);
    } else {
      setSuccess('Narrative saved');
      setHasChanges(false);
      setTimeout(() => setSuccess(null), 3000);
      onNarrativeUpdated();
    }

    setSaving(false);
  }

  // Generate AI draft
  async function handleGenerateAI() {
    setGenerating(true);
    setError(null);

    const { data, error: genError } = await generateAINarrative(
      organizationId,
      categoryCode,
      period,
      previousPeriod
    );

    if (genError) {
      setError(`AI generation failed: ${genError.message}`);
    } else if (data) {
      // Save the AI draft to the database
      await upsertNarrative(submissionId, secCategory.id, {
        ai_draft: data.narrative,
        ai_generated_at: new Date().toISOString(),
        final_narrative: data.narrative, // Pre-fill final with AI draft
        trend: data.risk_trend,
      });

      setEditedText(data.narrative);
      setHasChanges(false);
      onNarrativeUpdated();
    }

    setGenerating(false);
  }

  // Handle text change
  function handleTextChange(value: string) {
    setEditedText(value);
    setHasChanges(true);
    setSuccess(null);
  }

  // Risk details from narrative
  const riskDetails = (narrative.risk_details || []) as Array<{
    risk_code: string;
    risk_title: string;
    likelihood: number;
    impact: number;
    rating: number;
  }>;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Badge className={colorClass}>
                  {secCategory.name}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{narrative.risk_count} risks</span>
                  {narrative.critical_count > 0 && (
                    <Badge className={SEVERITY_COLORS.CRITICAL} variant="secondary">
                      {narrative.critical_count} Critical
                    </Badge>
                  )}
                  {narrative.high_count > 0 && (
                    <Badge className={SEVERITY_COLORS.HIGH} variant="secondary">
                      {narrative.high_count} High
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Trend indicator */}
                <div className="flex items-center gap-1">
                  <TrendIcon />
                  <span className={`text-sm font-medium ${trendColor()}`}>
                    {trendLabel()}
                  </span>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {narrative.current_rating != null
                      ? narrative.current_rating.toFixed(1)
                      : '—'}
                  </div>
                  {narrative.previous_rating != null && (
                    <div className="text-xs text-muted-foreground">
                      prev: {narrative.previous_rating.toFixed(1)}
                    </div>
                  )}
                </div>

                {/* Narrative status */}
                {narrative.final_narrative ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t space-y-4 pt-4">
            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricBox label="Total Risks" value={narrative.risk_count} />
              <MetricBox label="Critical" value={narrative.critical_count} color="text-red-600" />
              <MetricBox label="High" value={narrative.high_count} color="text-orange-600" />
              <MetricBox label="Medium" value={narrative.medium_count} color="text-yellow-600" />
              <MetricBox label="Low" value={narrative.low_count} color="text-green-600" />
            </div>

            {/* Error/Success Alerts */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Narrative Text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Narrative Commentary
                  {narrative.ai_generated_at && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (AI draft generated {new Date(narrative.ai_generated_at).toLocaleDateString()})
                    </span>
                  )}
                </label>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAI}
                      disabled={generating}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      {generating ? 'Generating...' : 'Generate AI Draft'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {isReadOnly ? (
                <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap min-h-[120px]">
                  {editedText || <span className="text-muted-foreground italic">No narrative provided</span>}
                </div>
              ) : (
                <Textarea
                  value={editedText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Enter commentary for ${secCategory.name}. Describe the risk trends, key events, and mitigation actions for this category during the quarter...`}
                  className="min-h-[150px] text-sm"
                />
              )}
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {!isReadOnly
                    ? 'Describe the risk trends, key events, and mitigation actions for this quarter'
                    : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {editedText.length} characters
                </p>
              </div>
            </div>

            {/* Risk Details Table */}
            {riskDetails.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Risk Details ({riskDetails.length} risks)
                </h4>
                <div className="max-h-[300px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-center">Likelihood</TableHead>
                        <TableHead className="text-center">Impact</TableHead>
                        <TableHead className="text-center">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riskDetails.map((risk, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{risk.risk_code}</TableCell>
                          <TableCell className="text-sm">{risk.risk_title}</TableCell>
                          <TableCell className="text-center">{risk.likelihood}</TableCell>
                          <TableCell className="text-center">{risk.impact}</TableCell>
                          <TableCell className="text-center font-semibold">
                            <RatingBadge rating={risk.rating} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================
// Sub-components
// ============================================

function MetricBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="border rounded-md p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${color || ''}`}>{value}</div>
    </div>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  let colorClass = 'bg-green-100 text-green-800';
  if (rating >= 16) colorClass = 'bg-red-100 text-red-800';
  else if (rating >= 12) colorClass = 'bg-orange-100 text-orange-800';
  else if (rating >= 6) colorClass = 'bg-yellow-100 text-yellow-800';

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}>
      {rating.toFixed(1)}
    </span>
  );
}
