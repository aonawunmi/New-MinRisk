/**
 * PeriodSelector Component
 *
 * Dropdown selector for changing the active risk register period.
 * Only admins can change the period, but all users can see the current period.
 */

import { useState, useEffect } from 'react';
import { getActivePeriod, setActivePeriod, PERIOD_OPTIONS } from '@/lib/periods';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PeriodSelectorProps {
  onPeriodChange?: (period: string) => void;
  showLabel?: boolean;
  disabled?: boolean;
}

export default function PeriodSelector({
  onPeriodChange,
  showLabel = true,
  disabled = false,
}: PeriodSelectorProps) {
  const [activePeriod, setActivePeriodState] = useState<string>('Q1 2025');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Load active period on mount
  useEffect(() => {
    loadActivePeriod();
  }, []);

  async function loadActivePeriod() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getActivePeriod();

    if (fetchError) {
      setError(fetchError.message);
      console.error('Error loading active period:', fetchError);
    } else {
      setActivePeriodState(data || 'Q1 2025');
    }

    setLoading(false);
  }

  async function handlePeriodChange(newPeriod: string) {
    setUpdating(true);
    setError(null);

    const { error: updateError } = await setActivePeriod(newPeriod);

    if (updateError) {
      setError(updateError.message);
      console.error('Error updating active period:', updateError);
    } else {
      setActivePeriodState(newPeriod);
      if (onPeriodChange) {
        onPeriodChange(newPeriod);
      }
    }

    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-400 animate-pulse" />
        <span className="text-sm text-gray-500">Loading period...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor="period-selector" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Active Period
        </Label>
      )}

      <Select
        value={activePeriod}
        onValueChange={handlePeriodChange}
        disabled={disabled || updating}
      >
        <SelectTrigger id="period-selector" className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {!error && showLabel && (
        <p className="text-xs text-gray-500">
          All risks are tagged with this period. Only admins can change.
        </p>
      )}
    </div>
  );
}
