/**
 * KRIAlerts Component
 *
 * View and manage KRI alerts generated from threshold breaches
 */

import { useState, useEffect } from 'react';
import {
  getKRIAlerts,
  acknowledgeKRIAlert,
  resolveKRIAlert,
  type KRIAlert,
} from '@/lib/kri';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function KRIAlerts() {
  const [alerts, setAlerts] = useState<KRIAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('open');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    setLoading(true);
    setError(null);

    try {
      const result = await getKRIAlerts(filter === 'all' ? undefined : filter);
      if (result.error) throw new Error(result.error.message);
      setAlerts(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(id: string) {
    try {
      const result = await acknowledgeKRIAlert(id);
      if (result.error) throw new Error(result.error.message);
      await loadAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  }

  async function handleResolve(id: string) {
    const resolution = prompt('Enter resolution notes:');
    if (!resolution) return;

    try {
      const result = await resolveKRIAlert(id, resolution);
      if (result.error) throw new Error(result.error.message);
      await loadAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading alerts...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">KRI Alerts</h3>
        <div className="flex gap-2">
          {(['all', 'open', 'acknowledged', 'resolved'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Alerts Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-900">
              {alerts.filter(a => a.alert_level === 'red' && a.status === 'open').length}
            </div>
            <div className="text-sm text-red-700">Critical Alerts</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-900">
              {alerts.filter(a => a.alert_level === 'yellow' && a.status === 'open').length}
            </div>
            <div className="text-sm text-yellow-700">Warning Alerts</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {alerts.filter(a => a.status === 'acknowledged').length}
            </div>
            <div className="text-sm text-gray-700">Acknowledged</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No alerts to display</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>KRI</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge
                        className={
                          alert.alert_level === 'red'
                            ? 'bg-red-500'
                            : alert.alert_level === 'yellow'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }
                      >
                        {alert.alert_level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {alert.kri_code}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {alert.measured_value}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {alert.threshold_breached}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{alert.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {alert.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
