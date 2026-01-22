/**
 * OutcomesManager Component
 * 
 * Manages risk outcomes (harm types) for a specific risk.
 * Allows multi-select of outcome types with descriptions and quantifiability.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Sparkles, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
    getOutcomesForRisk,
    createOutcome,
    updateOutcome,
    approveOutcome,
    deleteOutcome,
} from '@/lib/outcomes';

import type {
    RiskOutcome,
    OutcomeType,
    QuantifiableFlag,
    OUTCOME_TYPES,
} from '@/types/outcome';

interface OutcomesManagerProps {
    riskId: string;
    riskTitle: string;
    onClose?: () => void;
}

interface OutcomeFormData {
    outcome_type: OutcomeType;
    outcome_description: string;
    quantifiable_flag: QuantifiableFlag;
    preferred_unit: string;
    selected: boolean;
    existing_id?: string;
    status?: string;
}

const OUTCOME_TYPE_OPTIONS: OutcomeType[] = [
    'Financial Impact',
    'Customer Impact',
    'Regulatory Impact',
    'Operational Impact',
    'Reputational Impact',
    'Strategic Impact',
];

const UNIT_PRESETS = ['USD', '%', 'count', 'hours', 'days', 'incidents'];

export function OutcomesManager({ riskId, riskTitle, onClose }: OutcomesManagerProps) {
    const [outcomes, setOutcomes] = useState<OutcomeFormData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Initialize with all outcome types
    useEffect(() => {
        loadOutcomes();
    }, [riskId]);

    const loadOutcomes = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: existingOutcomes, error: fetchError } = await getOutcomesForRisk(riskId);

            if (fetchError) throw fetchError;

            // Create a map of existing outcomes
            const existingMap = new Map<OutcomeType, RiskOutcome>();
            existingOutcomes?.forEach((outcome) => {
                existingMap.set(outcome.outcome_type, outcome);
            });

            // Initialize form with all outcome types
            const formData: OutcomeFormData[] = OUTCOME_TYPE_OPTIONS.map((type) => {
                const existing = existingMap.get(type);

                return {
                    outcome_type: type,
                    outcome_description: existing?.outcome_description || '',
                    quantifiable_flag: existing?.quantifiable_flag || 'No',
                    preferred_unit: existing?.preferred_unit || '',
                    selected: !!existing,
                    existing_id: existing?.id,
                    status: existing?.status,
                };
            });

            setOutcomes(formData);
        } catch (err) {
            console.error('Error loading outcomes:', err);
            setError(err instanceof Error ? err.message : 'Failed to load outcomes');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleOutcome = (index: number) => {
        const updated = [...outcomes];
        updated[index].selected = !updated[index].selected;
        setOutcomes(updated);
    };

    const handleUpdateField = (
        index: number,
        field: keyof OutcomeFormData,
        value: string
    ) => {
        const updated = [...outcomes];
        updated[index] = { ...updated[index], [field]: value };
        setOutcomes(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const promises: Promise<any>[] = [];

            for (const outcome of outcomes) {
                if (outcome.selected && !outcome.existing_id) {
                    // Create new outcome
                    promises.push(
                        createOutcome({
                            risk_id: riskId,
                            outcome_type: outcome.outcome_type,
                            outcome_description: outcome.outcome_description || undefined,
                            quantifiable_flag: outcome.quantifiable_flag,
                            preferred_unit: outcome.preferred_unit || undefined,
                        })
                    );
                } else if (outcome.selected && outcome.existing_id) {
                    // Update existing outcome
                    promises.push(
                        updateOutcome(outcome.existing_id, {
                            outcome_description: outcome.outcome_description || undefined,
                            quantifiable_flag: outcome.quantifiable_flag,
                            preferred_unit: outcome.preferred_unit || undefined,
                        })
                    );
                } else if (!outcome.selected && outcome.existing_id && outcome.status === 'draft') {
                    // Delete deselected draft outcome
                    promises.push(deleteOutcome(outcome.existing_id));
                }
            }

            await Promise.all(promises);

            setSuccess('Outcomes saved successfully');
            await loadOutcomes(); // Reload to get latest state
        } catch (err) {
            console.error('Error saving outcomes:', err);
            setError(err instanceof Error ? err.message : 'Failed to save outcomes');
        } finally {
            setSaving(false);
        }
    };

    const handleApproveAll = async () => {
        setSaving(true);
        setError(null);

        try {
            const drafts = outcomes.filter(
                (o) => o.selected && o.existing_id && o.status === 'draft'
            );

            await Promise.all(drafts.map((o) => approveOutcome(o.existing_id!)));

            setSuccess('All outcomes approved');
            await loadOutcomes();
        } catch (err) {
            console.error('Error approving outcomes:', err);
            setError(err instanceof Error ? err.message : 'Failed to approve outcomes');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card className="p-6">
                <p className="text-gray-500">Loading outcomes...</p>
            </Card>
        );
    }

    const hasDrafts = outcomes.some((o) => o.selected && o.status === 'draft');

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Risk Outcomes</h3>
                <p className="text-sm text-gray-600">
                    Select the harm types that could occur if <strong>{riskTitle}</strong> materializes.
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
                {outcomes.map((outcome, index) => (
                    <Card key={outcome.outcome_type} className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id={`outcome-${index}`}
                                    checked={outcome.selected}
                                    onCheckedChange={() => handleToggleOutcome(index)}
                                    className="mt-1"
                                />
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`outcome-${index}`} className="font-medium cursor-pointer">
                                            {outcome.outcome_type}
                                        </Label>
                                        {outcome.status && (
                                            <Badge variant={outcome.status === 'approved' ? 'default' : 'secondary'}>
                                                {outcome.status}
                                            </Badge>
                                        )}
                                    </div>

                                    {outcome.selected && (
                                        <>
                                            <div>
                                                <Label className="text-xs text-gray-600">Description</Label>
                                                <Textarea
                                                    placeholder="Describe the potential impact..."
                                                    value={outcome.outcome_description}
                                                    onChange={(e) =>
                                                        handleUpdateField(index, 'outcome_description', e.target.value)
                                                    }
                                                    className="mt-1"
                                                    rows={2}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs text-gray-600">Quantifiable?</Label>
                                                    <Select
                                                        value={outcome.quantifiable_flag}
                                                        onValueChange={(value) =>
                                                            handleUpdateField(index, 'quantifiable_flag', value)
                                                        }
                                                    >
                                                        <SelectTrigger className="mt-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes</SelectItem>
                                                            <SelectItem value="No">No</SelectItem>
                                                            <SelectItem value="Proxy">Proxy</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {outcome.quantifiable_flag !== 'No' && (
                                                    <div>
                                                        <Label className="text-xs text-gray-600">Preferred Unit</Label>
                                                        <Input
                                                            placeholder="e.g., USD, %"
                                                            value={outcome.preferred_unit}
                                                            onChange={(e) =>
                                                                handleUpdateField(index, 'preferred_unit', e.target.value)
                                                            }
                                                            className="mt-1"
                                                            list={`units-${index}`}
                                                        />
                                                        <datalist id={`units-${index}`}>
                                                            {UNIT_PRESETS.map((unit) => (
                                                                <option key={unit} value={unit} />
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
                {onClose && (
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                )}
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Outcomes'}
                </Button>
                {hasDrafts && (
                    <Button onClick={handleApproveAll} disabled={saving} className="bg-green-600">
                        Approve All
                    </Button>
                )}
            </div>

            <div className="text-xs text-gray-500">
                <p>
                    <strong>Note:</strong> Outcomes represent different types of harm. A single risk can
                    cause multiple outcomes. Only quantifiable outcomes can have tolerance metrics.
                </p>
            </div>
        </div>
    );
}
