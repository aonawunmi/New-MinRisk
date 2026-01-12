/**
 * KRIDataEntry Component
 *
 * Enter KRI measurement data and view historical entries
 */

import { useState, useEffect } from 'react';
import {
  getKRIDefinitions,
  createKRIDataEntry,
  getKRIDataEntries,
  type KRIDefinition,
  type KRIDataEntry as KRIDataEntryType,
} from '@/lib/kri';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function KRIDataEntry() {
  const [kris, setKris] = useState<KRIDefinition[]>([]);
  const [selectedKRI, setSelectedKRI] = useState<string>('');
  const [history, setHistory] = useState<KRIDataEntryType[]>([]);
  const [formData, setFormData] = useState({
    value: '',
    period: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadKRIs();
  }, []);

  useEffect(() => {
    if (selectedKRI) {
      loadHistory(selectedKRI);
    }
  }, [selectedKRI]);

  async function loadKRIs() {
    setLoading(true);
    try {
      const result = await getKRIDefinitions();
      if (result.error) throw new Error(result.error.message);
      setKris(result.data || []);
      if (result.data && result.data.length > 0) {
        setSelectedKRI(result.data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KRIs');
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(kriId: string) {
    try {
      const result = await getKRIDataEntries(kriId, 10);
      if (result.error) throw new Error(result.error.message);
      setHistory(result.data || []);
    } catch (err) {
      console.error('Load history error:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedKRI || !formData.value) {
      setError('KRI and value are required');
      return;
    }

    try {
      const result = await createKRIDataEntry({
        kri_id: selectedKRI,
        measurement_value: parseFloat(formData.value),
        measurement_date: formData.period || undefined,
        notes: formData.notes || undefined,
      });

      if (result.error) throw new Error(result.error.message);

      setSuccess(true);
      setFormData({ value: '', period: '', notes: '' });
      await loadHistory(selectedKRI);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data entry');
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (kris.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No KRI definitions found. Create KRI definitions first in the Definitions tab.
        </AlertDescription>
      </Alert>
    );
  }

  const selectedKRIObj = kris.find(k => k.id === selectedKRI);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Data Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Select KRI</Label>
                <Select value={selectedKRI} onValueChange={setSelectedKRI}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kris.map((kri) => (
                      <SelectItem key={kri.id} value={kri.id}>
                        {kri.kri_code} - {kri.kri_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedKRIObj && (
                <div className="bg-blue-50 rounded p-3 text-sm">
                  <p className="font-medium">Unit: {selectedKRIObj.measurement_unit || 'N/A'}</p>
                  <p className="text-gray-600">Frequency: {selectedKRIObj.collection_frequency || 'N/A'}</p>
                </div>
              )}

              <div>
                <Label>Value *</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Period (optional)</Label>
                <Input
                  type="month"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                />
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    Data entry saved successfully!
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full">
                Save Entry
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No entries yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {entry.measurement_value} {selectedKRIObj?.measurement_unit || ''}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            entry.alert_status === 'green'
                              ? 'bg-green-500'
                              : entry.alert_status === 'yellow'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }
                        >
                          {entry.alert_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
