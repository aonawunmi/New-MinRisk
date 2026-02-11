/**
 * DIMEDisplay Component
 *
 * Visual display of derived DIME scores with color coding and cap indicators.
 */

import { useState } from 'react';
import type { DerivedDIMEScore, SCDimension } from '@/types/pci';
import { DIMENSION_LABELS, DIME_SCORE_COLORS } from '@/types/pci';
import { applyDIMECascade } from './EffectivenessDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Info, ChevronRight } from 'lucide-react';
import DIMEExplainability from './DIMEExplainability';

interface DIMEDisplayProps {
  dimeScore: DerivedDIMEScore | null | undefined;
  compact?: boolean;
  showExplainability?: boolean;
}

export default function DIMEDisplay({
  dimeScore,
  compact = false,
  showExplainability = true,
}: DIMEDisplayProps) {
  const [showExplainDialog, setShowExplainDialog] = useState(false);

  if (!dimeScore) {
    return (
      <div className="text-sm text-muted-foreground italic">
        DIME scores not yet computed
      </div>
    );
  }

  // Apply D=0 cascade: if Design=0, I/M/E forced to 0
  const cascaded = applyDIMECascade(dimeScore);
  const designIsZero = (dimeScore.d_score ?? 0) === 0;

  const scores: { dimension: SCDimension; score: number; capped: boolean }[] = [
    { dimension: 'D', score: cascaded.d, capped: dimeScore.cap_details?.d_capped || false },
    { dimension: 'I', score: cascaded.i, capped: !designIsZero && (dimeScore.cap_details?.i_capped || false) },
    { dimension: 'M', score: cascaded.m, capped: !designIsZero && (dimeScore.cap_details?.m_capped || false) },
    { dimension: 'E', score: cascaded.e, capped: !designIsZero && (dimeScore.cap_details?.e_capped || false) },
  ];

  const average = (
    (cascaded.d + cascaded.i + cascaded.m + cascaded.e) /
    4
  ).toFixed(2);

  function getScoreLabel(score: number): string {
    if (score >= 2.5) return 'Strong';
    if (score >= 1.5) return 'Adequate';
    if (score >= 0.5) return 'Weak';
    return 'Not Adequate';
  }

  function getScoreBgColor(score: number): string {
    if (score >= 2.5) return 'bg-green-500';
    if (score >= 1.5) return 'bg-amber-500';
    if (score >= 0.5) return 'bg-orange-500';
    return 'bg-red-500';
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {scores.map(({ dimension, score, capped }) => (
            <Tooltip key={dimension}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white ${getScoreBgColor(
                      score
                    )}`}
                  >
                    {score.toFixed(1)}
                  </div>
                  {capped && (
                    <AlertTriangle className="absolute -top-1 -right-1 h-3 w-3 text-amber-600" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {DIMENSION_LABELS[dimension]}: {score.toFixed(2)} ({getScoreLabel(score)})
                </p>
                {capped && (
                  <p className="text-amber-500 text-xs">Hard cap applied</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
          <span className="text-xs text-muted-foreground ml-1">
            Avg: {average}
          </span>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3">
      {/* Score Grid */}
      <div className="grid grid-cols-4 gap-2">
        {scores.map(({ dimension, score, capped }) => (
          <div
            key={dimension}
            className="relative bg-gray-50 rounded-lg p-3 text-center"
          >
            <div className="text-xs text-muted-foreground mb-1">
              {DIMENSION_LABELS[dimension]}
            </div>
            <div
              className={`text-lg font-bold ${
                score >= 2.5
                  ? 'text-green-600'
                  : score >= 1.5
                  ? 'text-amber-600'
                  : 'text-red-600'
              }`}
            >
              {score.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              {getScoreLabel(score)}
            </div>
            {capped && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute top-1 right-1">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Hard cap applied (Critical control = No)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Score bar */}
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBgColor(score)} transition-all`}
                style={{ width: `${(score / 3) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Average and Caps Warning */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={DIME_SCORE_COLORS(parseFloat(average))}>
            Average: {average}
          </Badge>
          {dimeScore.cap_applied && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Caps Applied
            </Badge>
          )}
        </div>
        {showExplainability && dimeScore.calc_trace && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExplainDialog(true)}
            className="text-muted-foreground"
          >
            <Info className="h-4 w-4 mr-1" />
            How calculated
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* D=0 Cascade Note */}
      {designIsZero && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <strong>Design = 0:</strong> Because Design is Not Adequate, Implementation,
          Monitoring, and Evaluation are all forced to 0. A control that is not properly
          designed cannot be effective regardless of other dimensions.
        </div>
      )}

      {/* Constrained Effectiveness Note (only when D is NOT zero — otherwise the cascade note above applies) */}
      {!designIsZero && dimeScore.e_final < dimeScore.e_raw && (
        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
          <strong>Note:</strong> Effectiveness (E) constrained from{' '}
          {dimeScore.e_raw.toFixed(2)} to {dimeScore.e_final.toFixed(2)} because
          it cannot exceed the lowest of D, I, or M.
        </div>
      )}

      {/* Explainability Dialog */}
      <Dialog open={showExplainDialog} onOpenChange={setShowExplainDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DIME Score Calculation</DialogTitle>
          </DialogHeader>
          <DIMEExplainability dimeScore={dimeScore} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
