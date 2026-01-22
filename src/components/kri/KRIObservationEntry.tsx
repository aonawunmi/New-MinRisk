/**
 * KRIObservationEntry Component
 * 
 * Entry form for KRI observations with maker-checker workflow.
 * Supports period-based entry and approval.
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
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {
    getObservationsForKRI,
    createObservation,
    updateObservation,
    submitObservation,
    approveObservation,
    rejectObservation,
} from '@/lib/kriObservations';

import type {
    KRIObservation,
    ObservationStatus,
} from '@/types/kri';

interface KRIObservationEntryProps {
    kriId: string;
    kriCode: string;
    kriName: string;
    unit: string | null;
    target: number;
    directionOfGoodness: 'higher_is_better' | 'lower_is_better';
}

const STATUS_COLORS: Record<ObservationStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};

export function KRIObservationEntry({
    kriId,
    kriCode,
    kriName,
    unit,
    target,
    directionOfGoodness,
}: KRIObservationEntryProps) {
    const [observations, setObservations] = useState<KRIObservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [observationDate, setObservationDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [observedValue, setObservedValue] = useState('');
    const [dataSource, setDataSource] = useState('Manual Entry');
    const [commentary, setCommentary] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadObservations();
    }, [kriId]);

    const loadObservations = async () => {
        setLoading(true);
        try {
            const { data, error: fetchError } = await getObservationsForKRI(kriId, 20);

            if (fetchError) throw fetchError;

            setObservations(data || []);
        } catch (err) {
            console.error('Error loading observations:', err);
            setError(err instanceof Error ? err.message : 'Failed to load observations');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!observedValue) {
            setError('Please enter an observed value');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const value = parseFloat(observedValue);
            if (isNaN(value)) {
                throw new Error('Invalid numeric value');
            }

            if (editingId) {
                await updateObservation(editingId, {
                    observed_value: value,
                    commentary: commentary || undefined,
                });
                setSuccess('Observation updated');
            } else {
                await createObservation({
                    kri_id: kriId,
                    observation_date: observationDate,
                    observed_value: value,
                    data_source: dataSource,
                    commentary: commentary || undefined,
                });
                setSuccess('Observation created');
            }

            // Reset form
            setObservedValue('');
            setCommentary('');
            setDataSource('Manual Entry');
            setEditingId(null);
            setObservationDate(new Date().toISOString().split('T')[0]);

            await loadObservations();
        } catch (err) {
            console.error('Error saving observation:', err);
            setError(err instanceof Error ? err.message : 'Failed to save observation');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (id: string) => {
        try {
            await submitObservation(id);
            setSuccess('Observation submitted for approval');
            await loadObservations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit');
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await approveObservation(id);
            setSuccess('Observation approved');
            await loadObservations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to approve');
        }
    };

    const handleReject = async (id: string) => {
        try {
            await rejectObservation(id, 'Rejected by approver');
            setSuccess('Observation rejected');
            await loadObservations();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reject');
        }
    };

    const getTargetStatus = (value: number): { text: string; color: string } => {
        if (directionOfGoodness === 'higher_is_better') {
            if (value >= target) return { text: 'On Target', color: 'text-green-600' };
            return { text: 'Below Target', color: 'text-amber-600' };
        } else {
            if (value <= target) return { text: 'On Target', color: 'text-green-600' };
            return { text: 'Above Target', color: 'text-amber-600' };
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-1">
                    {kriCode}: {kriName}
                </h3>
                <p className="text-sm text-gray-600">
                    Target: <strong>{target}</strong> {unit} (
                    {directionOfGoodness === 'higher_is_better' ? 'Higher is better' : 'Lower is better'})
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

            {/* Entry Form */}
            <Card className="p-4">
                <h4 className="font-medium mb-4">
                    {editingId ? 'Edit Observation' : 'New Observation'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Observation Date</Label>
                        <Input
                            type="date"
                            value={observationDate}
                            onChange={(e) => setObservationDate(e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label>
                            Observed Value {unit && `(${unit})`}
                        </Label>
                        <Input
                            type="number"
                            step="any"
                            placeholder="Enter value"
                            value={observedValue}
                            onChange={(e) => setObservedValue(e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label>Data Source</Label>
                        <Select value={dataSource} onValueChange={setDataSource}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                                <SelectItem value="System Feed">System Feed</SelectItem>
                                <SelectItem value="API Import">API Import</SelectItem>
                                <SelectItem value="Spreadsheet Upload">Spreadsheet Upload</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Commentary (Optional)</Label>
                        <Textarea
                            placeholder="Add notes..."
                            value={commentary}
                            onChange={(e) => setCommentary(e.target.value)}
                            className="mt-1"
                            rows={1}
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-4">
                    <Button onClick={handleSave} disabled={saving || !observedValue}>
                        {saving ? 'Saving...' : editingId ? 'Update' : 'Save as Draft'}
                    </Button>
                    {editingId && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingId(null);
                                setObservedValue('');
                                setCommentary('');
                            }}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </Card>

            {/* Observations History */}
            <div>
                <h4 className="font-medium mb-3">Recent Observations</h4>
                {loading ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                ) : observations.length === 0 ? (
                    <p className="text-gray-500 text-sm">No observations recorded yet</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>vs Target</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {observations.map((obs) => {
                                const targetStatus = getTargetStatus(obs.observed_value);
                                return (
                                    <TableRow key={obs.id}>
                                        <TableCell>{new Date(obs.observation_date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">
                                            {obs.observed_value} {unit}
                                        </TableCell>
                                        <TableCell>
                                            <span className={targetStatus.color}>{targetStatus.text}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {obs.data_source || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={STATUS_COLORS[obs.status]}>{obs.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {obs.status === 'draft' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleSubmit(obs.id)}
                                                        >
                                                            Submit
                                                        </Button>
                                                    </>
                                                )}
                                                {obs.status === 'submitted' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleApprove(obs.id)}
                                                            className="text-green-600"
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleReject(obs.id)}
                                                            className="text-red-600"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
