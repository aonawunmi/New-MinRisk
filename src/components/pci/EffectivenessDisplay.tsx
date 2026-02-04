/**
 * EffectivenessDisplay Component
 *
 * Displays control effectiveness as both a percentage and a color-coded progress bar.
 * Calculates effectiveness from DIME scores: (D + I + M + E) / 4 / 3 = 0-100%
 */

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Gauge } from 'lucide-react';
import type { DerivedDIMEScore } from '@/types/pci';

interface EffectivenessDisplayProps {
  dimeScore?: DerivedDIMEScore | null;
  /** Show compact version (just badge) vs full version (badge + progress bar) */
  compact?: boolean;
  /** Show label text */
  showLabel?: boolean;
}

/**
 * Calculate effectiveness percentage from DIME scores
 * Each DIME dimension is 0-3 scale
 * Average of 4 dimensions / 3 = 0-1 effectiveness
 * Multiply by 100 for percentage
 */
export function calculateEffectiveness(dimeScore?: DerivedDIMEScore | null): number | null {
  if (!dimeScore) return null;

  const d = dimeScore.d_score ?? 0;
  const i = dimeScore.i_score ?? 0;
  const m = dimeScore.m_score ?? 0;
  const e = dimeScore.e_final ?? 0;

  // Average of 4 dimensions (0-3 scale each)
  const avgScore = (d + i + m + e) / 4;

  // Convert to percentage (0-100)
  const effectiveness = (avgScore / 3) * 100;

  return Math.round(effectiveness * 10) / 10; // Round to 1 decimal
}

/**
 * Get color classes based on effectiveness percentage
 */
function getEffectivenessColor(effectiveness: number): {
  badge: string;
  progress: string;
  text: string;
} {
  if (effectiveness >= 75) {
    return {
      badge: 'bg-green-100 text-green-800 border-green-200',
      progress: 'bg-green-500',
      text: 'text-green-700',
    };
  } else if (effectiveness >= 50) {
    return {
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      progress: 'bg-yellow-500',
      text: 'text-yellow-700',
    };
  } else if (effectiveness >= 25) {
    return {
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      progress: 'bg-orange-500',
      text: 'text-orange-700',
    };
  } else {
    return {
      badge: 'bg-red-100 text-red-800 border-red-200',
      progress: 'bg-red-500',
      text: 'text-red-700',
    };
  }
}

/**
 * Get effectiveness label based on percentage
 */
function getEffectivenessLabel(effectiveness: number): string {
  if (effectiveness >= 75) return 'Strong';
  if (effectiveness >= 50) return 'Moderate';
  if (effectiveness >= 25) return 'Weak';
  return 'Critical';
}

export default function EffectivenessDisplay({
  dimeScore,
  compact = false,
  showLabel = true,
}: EffectivenessDisplayProps) {
  const effectiveness = calculateEffectiveness(dimeScore);

  // No DIME scores yet
  if (effectiveness === null) {
    return (
      <div className="flex items-center gap-2">
        {showLabel && (
          <span className="text-xs font-medium text-muted-foreground">
            Effectiveness
          </span>
        )}
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
          <Gauge className="h-3 w-3 mr-1" />
          Not attested
        </Badge>
      </div>
    );
  }

  const colors = getEffectivenessColor(effectiveness);
  const label = getEffectivenessLabel(effectiveness);

  if (compact) {
    return (
      <Badge variant="outline" className={colors.badge}>
        <Gauge className="h-3 w-3 mr-1" />
        {effectiveness}%
      </Badge>
    );
  }

  return (
    <div className="space-y-1.5">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            Control Effectiveness
          </span>
          <span className={`text-xs font-medium ${colors.text}`}>
            {label}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.progress} transition-all duration-300`}
            style={{ width: `${effectiveness}%` }}
          />
        </div>
        <Badge variant="outline" className={`${colors.badge} min-w-[60px] justify-center`}>
          {effectiveness}%
        </Badge>
      </div>
    </div>
  );
}
