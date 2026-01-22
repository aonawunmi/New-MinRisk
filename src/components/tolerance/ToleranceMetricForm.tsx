/**
 * ToleranceMetricForm Component
 * 
 * New simplified form for creating/editing tolerance metrics
 * with outcomes-based architecture (soft/hard limits).
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

import {
    createToleranceMetric,
    updateToleranceMetric,
    activateToleranceMetric,
    getToleranceMetric,
} from '@/lib/tolerances';

import { getOutcomesForRisk } from '@/lib/outcomes';

import type {
    LimitDirection,
    MetricType,
    CreateToleranceMetricParams,
} from '@/types/tolerance';

import type { RiskOutcome } from '@/types/outcome';

interface ToleranceMetricFormProps {
    riskId?: string;
    outcomeId?: string;
    metricId?: string; // For editing existing
    onSave?: () => void;
    onCancel?: () => void;
}

export function ToleranceMetricForm({
    riskId,
    outcomeId: initialOutcomeId,
    metricId,
    onSave,
    onCancel,
}: ToleranceMetricFormProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Available outcomes
    const [outcomes, setOutcomes] = useState<RiskOutcome[]>([]);

    // Form state
    const [metricName, setMetricName] = useState('');
    const [description, setDescription] = useState('');
    const [outcomeId, setOutcomeId] = useState(initialOutcomeId || '');
    const [metricType, setMetricType] = useState<MetricType>('MAXIMUM');
    const [unit, setUnit] = useState('');
    const [softLimit, setSoftLimit] = useState('');
    const [hardLimit, setHardLimit] = useState('');
    const [direction, setDirection] = useState<LimitDirection>('above');
    const [materialityType, setMaterialityType] = useState<'INTERNAL' | 'EXTERNAL' | 'DUAL'>(
        'INTERNAL'
    );

    useEffect(() => {
        if (riskId) {
            loadOutcomes();
        }
        if (metricId) {
            loadMetric();
        }
    }, [riskId, metricId]);

    const loadOutcomes = async () => {
        if (!riskId) return;

        try {
            const { data, error: fetchError } = await getOutcomesForRisk(riskId);
            if (fetchError) throw fetchError;

            // Filter to quantifiable outcomes only
            const quantifiable = data?.filter(
                (o) => o.quantifiable_flag !== 'No' && o.status === 'approved'
            ) || [];

            setOutcomes(quantifiable);
        } catch (err) {
            console.error('Error loading outcomes:', err);
        }
    };

    const loadMetric = async () => {
        if (!metricId) return;

        setLoading(true);
        try {
            const { data, error: fetchError } = await getToleranceMetric(metricId);
            if (fetchError) throw fetchError;

            if (data) {
                setMetricName(data.metric_name);
                setDescription(data.metric_description || '');
                setOutcomeId(data.outcome_id || '');
                setMetricType(data.metric_type);
                setUnit(data.unit || '');
                setSoftLimit(data.soft_limit?.toString() || '');
                setHardLimit(data.hard_limit?.toString() || '');
                setDirection(data.limit_direction);
                setMaterialityType(data.materiality_type || 'INTERNAL');
            }
        } catch (err) {
            console.error('Error loading metric:', err);
            setError(err instanceof Error ? err.message : 'Failed to load metric');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validation
        if (!metricName || !outcomeId || !unit || !softLimit || !hardLimit) {
            setError('Please fill all required fields');
            return;
        }

        const soft = parseFloat(softLimit);
        const hard = parseFloat(hardLimit);

        if (isNaN(soft) || isNaN(hard)) {
            setError('Limits must be valid numbers');
            return;
        }

        // Direction-based validation
        if (direction === 'above' && soft > hard) {
            setError('For "above" direction, soft limit must be ≤ hard limit');
            return;
        }

        if (direction === 'below' && hard > soft) {
            setError('For "below" direction, hard limit must be ≤ soft limit');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            if (metricId) {
                // Update existing
                await updateToleranceMetric(metricId, {
                    metric_name: metricName,
                    metric_description: description || undefined,
                    unit,
                    soft_limit: soft,
                    hard_limit: hard,
                    limit_direction: direction,
                });
                setSuccess('Metric updated successfully');
            } else {
                // Create new
                const params: CreateToleranceMetricParams = {
                    metric_name: metricName,
                    metric_description: description || undefined,
                    metric_type: metricType,
                    unit,
                    risk_id: riskId,
                    outcome_id: outcomeId,
                    soft_limit: soft,
                    hard_limit: hard,
                    limit_direction: direction,
                    materiality_type: materialityType,
                };

                await createToleranceMetric(params);
                setSuccess('Metric created successfully');
            }

            if (onSave) {
                setTimeout(() => onSave(), 1000);
            }
        } catch (err) {
            console.error('Error saving metric:', err);
            setError(err instanceof Error ? err.message : 'Failed to save metric');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card className="p-6">
                <p className="text-gray-500">Loading...</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">
                    {metricId ? 'Edit Tolerance Metric' : 'New Tolerance Metric'}
                </h3>
                <p className="text-sm text-gray-600">
                    Define board-approved limits using soft (early warning) and hard (breach) thresholds.
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                <div>
                    <Label>
                        Metric Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={metricName}
                        onChange={(e) => setMetricName(e.target.value)}
                        placeholder="e.g., Monthly Operational Loss"
                        className="mt-1"
                    />
                </div>

                <div>
                    <Label>Description</Label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this metric measures..."
                        className="mt-1"
                        rows={2}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>
                            Outcome <span className="text-red-500">*</span>
                        </Label>
                        <Select value={outcomeId} onValueChange={setOutcomeId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select outcome..." />
                            </SelectTrigger>
                            <SelectContent>
                                {outcomes.map((outcome) => (
                                    <SelectItem key={outcome.id} value={outcome.id}>
                                        {outcome.outcome_type}
                                        {outcome.outcome_description && ` - ${outcome.outcome_description}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {outcomes.length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                No quantifiable outcomes available. Create outcomes first.
                            </p>
                        )}
                    </div>

                    <div>
                        <Label>
                            Unit <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="e.g., USD, %, count"
                            className="mt-1"
                        />
                    </div>
                </div>

                <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex gap-2 mb-3">
                        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <strong>Limits Guidance:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>
                                    <strong>Soft Limit</strong>: Early warning threshold (triggers AMBER status)
                                </li>
                                <li>
                                    <strong>Hard Limit</strong>: Board breach threshold (triggers RED status)
                                </li>
                                <li>
                                    <strong>Direction</strong>: When values become problematic
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>
                                Soft Limit <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="any"
                                value={softLimit}
                                onChange={(e) => setSoftLimit(e.target.value)}
                                placeholder="Warning level"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>
                                Hard Limit <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="any"
                                value={hardLimit}
                                onChange={(e) => setHardLimit(e.target.value)}
                                placeholder="Breach level"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>
                                Direction <span className="text-red-500">*</span>
                            </Label>
                            <Select value={direction} onValueChange={(v) => setDirection(v as LimitDirection)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="above">Above (higher is worse)</SelectItem>
                                    <SelectItem value="below">Below (lower is worse)</SelectItem>
                                    <SelectItem value="between">Between (outside range is worse)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {direction && (
                        <div className="mt-2 text-xs text-gray-600">
                            {direction === 'above' && (
                                <p>
                                    ✓ Green: {`value < ${softLimit || '?'}`}, Amber:{' '}
                                    {`${softLimit || '?'} ≤ value < ${hardLimit || '?'}`}, Red:{' '}
                                    {`value ≥ ${hardLimit || '?'}`}
                                </p>
                            )}
                            {direction === 'below' && (
                                <p>
                                    ✓ Green: {`value > ${softLimit || '?'}`}, Amber:{' '}
                                    {`${hardLimit || '?'} < value ≤ ${softLimit || '?'}`}, Red:{' '}
                                    {`value ≤ ${hardLimit || '?'}`}
                                </p>
                            )}
                            {direction === 'between' && (
                                <p>
                                    ✓ Green: within range, Amber: approaching boundaries, Red: outside range
                                </p>
                            )}
                        </div>
                    )}
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Metric Type</Label>
                        <Select value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MAXIMUM">MAXIMUM</SelectItem>
                                <SelectItem value="MINIMUM">MINIMUM</SelectItem>
                                <SelectItem value="RANGE">RANGE</SelectItem>
                                <SelectItem value="DIRECTIONAL">DIRECTIONAL</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Materiality</Label>
                        <Select
                            value={materialityType}
                            onValueChange={(v) => setMaterialityType(v as any)}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INTERNAL">Internal</SelectItem>
                                <SelectItem value="EXTERNAL">External</SelectItem>
                                <SelectItem value="DUAL">Dual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button onClick={handleSave} disabled={saving || outcomes.length === 0}>
                    {saving ? 'Saving...' : metricId ? 'Update Metric' : 'Create Metric'}
                </Button>
            </div>
        </div>
    );
}
