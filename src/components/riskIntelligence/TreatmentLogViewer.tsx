/**
 * Treatment Log Viewer Component
 *
 * Shows history of intelligence-driven risk updates for a specific risk
 * Allows users to undo or soft-delete treatment log entries
 */

import { useState, useEffect } from 'react';
import {
  getTreatmentLogForRisk,
  undoAppliedAlert,
  softDeleteTreatmentLogEntry,
  type TreatmentLogEntry,
} from '@/lib/riskIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Undo2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

interface TreatmentLogViewerProps {
  riskCode: string;
  onLogChange?: () => void; // Callback when log is modified (undo/delete)
}

export default function TreatmentLogViewer({
  riskCode,
  onLogChange
}: TreatmentLogViewerProps) {
  const [log, setLog] = useState<TreatmentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingAlertId, setUndoingAlertId] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTreatmentLog();
  }, [riskCode]);

  async function loadTreatmentLog() {
    setLoading(true);
    try {
      const { data, error } = await getTreatmentLogForRisk(riskCode);
      if (error) {
        console.error('Error loading treatment log:', error);
        setMessage({ type: 'error', text: 'Failed to load treatment log' });
        setLog([]);
      } else {
        // Filter out soft-deleted entries
        const activeLog = (data || []).filter(entry => !entry.deleted_at);
        setLog(activeLog);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setLog([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo(alertId: string) {
    if (!confirm('Undo this intelligence alert application? This will recalculate the risk scores using remaining alerts.')) {
      return;
    }

    setUndoingAlertId(alertId);
    try {
      const { error } = await undoAppliedAlert(alertId, 'Undone by user from treatment log');
      if (error) {
        setMessage({ type: 'error', text: `Failed to undo: ${error.message}` });
      } else {
        setMessage({ type: 'success', text: 'Alert undone successfully' });
        await loadTreatmentLog();
        onLogChange?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Unexpected error undoing alert' });
    } finally {
      setUndoingAlertId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  }

  async function handleSoftDelete(logId: string) {
    if (!confirm('Archive this treatment log entry? It will be hidden but retained for audit purposes.')) {
      return;
    }

    setDeletingLogId(logId);
    try {
      const { error } = await softDeleteTreatmentLogEntry(logId);
      if (error) {
        setMessage({ type: 'error', text: `Failed to archive: ${error.message}` });
      } else {
        setMessage({ type: 'success', text: 'Log entry archived successfully' });
        await loadTreatmentLog();
        onLogChange?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Unexpected error archiving log entry' });
    } finally {
      setDeletingLogId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  }

  function renderChangeIndicator(previous: number | null, current: number | null, label: string) {
    if (previous === null || current === null || previous === current) {
      return null;
    }

    const change = current - previous;
    const isIncrease = change > 0;

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{label}:</span>
        <Badge variant={isIncrease ? 'destructive' : 'default'} className="flex items-center gap-1">
          {isIncrease ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{previous} → {current}</span>
          <span className="ml-1 text-xs">({change > 0 ? '+' : ''}{change})</span>
        </Badge>
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading treatment history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Intelligence Treatment History
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            History of AI-powered risk updates for {riskCode}
          </p>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert className={`mb-4 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {log.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No intelligence-driven updates yet</p>
              <p className="text-sm text-gray-500 mt-1">
                When you apply intelligence alerts, they'll appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {log.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`border-l-4 pl-4 py-3 ${
                    entry.action_taken === 'accept'
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {entry.action_taken === 'accept' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {entry.action_taken === 'accept' ? 'Alert Applied' : 'Alert Rejected'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Entry #{log.length - index}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.applied_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {entry.action_taken === 'accept' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUndo(entry.alert_id)}
                          disabled={undoingAlertId === entry.alert_id}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          {undoingAlertId === entry.alert_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Undo2 className="h-3 w-3 mr-1" />
                              Undo
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSoftDelete(entry.id)}
                          disabled={deletingLogId === entry.id}
                          className="text-gray-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingLogId === entry.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Changes Display */}
                  {entry.action_taken === 'accept' && (
                    <div className="space-y-2 mt-3">
                      {renderChangeIndicator(entry.previous_likelihood, entry.new_likelihood, 'Likelihood')}
                      {renderChangeIndicator(entry.previous_impact, entry.new_impact, 'Impact')}
                    </div>
                  )}

                  {/* Notes */}
                  {entry.notes && (
                    <div className="mt-3 bg-white rounded border border-gray-200 p-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                      <p className="text-sm text-gray-600">{entry.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      {log.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Undoing an alert recalculates risk scores using MAX logic from remaining alerts.
            Archiving removes the entry from view but retains it for audit purposes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
