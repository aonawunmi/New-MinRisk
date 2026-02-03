/**
 * ConfidenceDisplay Component
 *
 * Shows the confidence score (0-100) with label and drivers.
 */

import { useState } from 'react';
import type { ConfidenceScore, ConfidenceLabel } from '@/types/pci';
import { CONFIDENCE_COLORS } from '@/types/pci';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ChevronDown,
  Shield,
} from 'lucide-react';

interface ConfidenceDisplayProps {
  confidence: ConfidenceScore | null | undefined;
  compact?: boolean;
  showDrivers?: boolean;
}

export default function ConfidenceDisplay({
  confidence,
  compact = false,
  showDrivers = true,
}: ConfidenceDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!confidence) {
    return (
      <span className="text-sm text-muted-foreground italic">
        Not computed
      </span>
    );
  }

  const labelColors: Record<ConfidenceLabel, string> = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-red-100 text-red-800 border-red-200',
  };

  const labelBgColors: Record<ConfidenceLabel, string> = {
    high: 'bg-green-500',
    medium: 'bg-amber-500',
    low: 'bg-red-500',
  };

  function getDriverIcon(type: string) {
    switch (type) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  }

  function getDriverColor(type: string) {
    switch (type) {
      case 'positive':
        return 'text-green-700';
      case 'negative':
        return 'text-red-700';
      default:
        return 'text-gray-600';
    }
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`${labelColors[confidence.confidence_label]} cursor-help`}
            >
              <Shield className="h-3 w-3 mr-1" />
              {confidence.confidence_score}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <div className="font-medium">
                Confidence: {confidence.confidence_label.toUpperCase()} (
                {confidence.confidence_score}%)
              </div>
              {confidence.drivers.slice(0, 3).map((driver, idx) => (
                <div
                  key={idx}
                  className={`text-xs flex items-center gap-1 ${getDriverColor(
                    driver.type
                  )}`}
                >
                  {getDriverIcon(driver.type)}
                  <span>{driver.text}</span>
                </div>
              ))}
              {confidence.drivers.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{confidence.drivers.length - 3} more factors
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {/* Score Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
              labelBgColors[confidence.confidence_label]
            }`}
          >
            {confidence.confidence_score}
          </div>
          <div>
            <Badge
              variant="outline"
              className={labelColors[confidence.confidence_label]}
            >
              {confidence.confidence_label.toUpperCase()}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              Confidence Score
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${labelBgColors[confidence.confidence_label]} transition-all`}
            style={{ width: `${confidence.confidence_score}%` }}
          />
        </div>
      </div>

      {/* Drivers */}
      {showDrivers && (
        <Popover open={showDetails} onOpenChange={setShowDetails}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground w-full justify-between"
            >
              <span className="flex items-center gap-1">
                <Info className="h-4 w-4" />
                {confidence.drivers.length} factors affecting confidence
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showDetails ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div className="font-medium text-sm">Confidence Drivers</div>
              {confidence.drivers.map((driver, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 text-sm ${getDriverColor(
                    driver.type
                  )}`}
                >
                  <span className="mt-0.5">{getDriverIcon(driver.type)}</span>
                  <span className="flex-1">{driver.text}</span>
                  <span className="font-mono text-xs">
                    {driver.points > 0 ? '+' : ''}
                    {driver.points}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Score computed:{' '}
                {new Date(confidence.computed_at).toLocaleString()}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
