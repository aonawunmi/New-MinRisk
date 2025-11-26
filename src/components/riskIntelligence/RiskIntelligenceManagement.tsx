/**
 * RiskIntelligenceManagement Component
 *
 * AI-powered risk intelligence: external events tracking and alerts
 */

import { useState, useEffect } from 'react';
import {
  getExternalEvents,
  createExternalEvent,
  createExternalEventWithAutoScan,
  deleteExternalEvent,
  cleanupDuplicateEvents,
  getPendingIntelligenceAlerts,
  getAcceptedIntelligenceAlerts,
  acceptIntelligenceAlert,
  applyIntelligenceAlert,
  rejectIntelligenceAlert,
  undoAppliedAlert,
  type ExternalEvent,
  type IntelligenceAlert,
} from '@/lib/riskIntelligence';
import { supabase } from '@/lib/supabase';
import { isUserAdmin } from '@/lib/profiles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Loader2, CheckCircle2, TrendingUp, TrendingDown, Trash2, Trash, Undo2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function RiskIntelligenceManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Risk Intelligence</h2>
        <p className="text-gray-600 text-sm mt-1">
          AI-powered external event tracking and risk correlation
        </p>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">🌐 External Events</TabsTrigger>
          <TabsTrigger value="alerts">🔔 Intelligence Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-6">
          <EventsFeed />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <IntelligenceAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventsFeed() {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    source: '',
    event_type: '',
    url: '',
    published_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  });
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadEvents();
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    const adminStatus = await isUserAdmin();
    setIsAdmin(adminStatus);
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const result = await getExternalEvents();
      if (result.error) throw new Error(result.error.message);
      setEvents(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setScanning(true);
    setScanMessage(null);

    try {
      // Create event and auto-scan for threats
      const result = await createExternalEventWithAutoScan({
        title: formData.title,
        summary: formData.summary || undefined,
        source: formData.source,
        event_type: formData.event_type,
        url: formData.url || undefined,
        published_date: formData.published_date,
      });

      if (result.error) throw new Error(result.error.message);

      // Show scan results
      if (result.scanResults?.scanned) {
        if (result.scanResults.alertsCreated > 0) {
          setScanMessage({
            type: 'success',
            text: `✅ Event added and scanned! Created ${result.scanResults.alertsCreated} alert(s). Check the Intelligence Alerts tab.`
          });
        } else {
          setScanMessage({
            type: 'info',
            text: `ℹ️ Event added and scanned. No relevant risks matched (confidence threshold not met).`
          });
        }
      } else {
        setScanMessage({
          type: 'info',
          text: `Event added but auto-scan failed. Use "Scan for Threats" to analyze manually.`
        });
      }

      await loadEvents();
      setShowForm(false);
      setFormData({
        title: '',
        summary: '',
        source: '',
        event_type: '',
        url: '',
        published_date: new Date().toISOString().split('T')[0],
      });

      // Clear message after 10 seconds
      setTimeout(() => setScanMessage(null), 10000);
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create event'
      });
    } finally {
      setScanning(false);
    }
  }

  async function handleCleanupDuplicates() {
    if (!confirm('This will remove duplicate events (same source, same title, within same week). Continue?')) {
      return;
    }

    setCleaningUp(true);
    setCleanupMessage('🧹 Cleaning up duplicate events...');

    try {
      const result = await cleanupDuplicateEvents();
      if (result.error) throw new Error(result.error.message);

      setCleanupMessage(`✅ Cleanup complete! Removed ${result.deletedCount} duplicate event(s).`);
      await loadEvents();
    } catch (err) {
      setCleanupMessage(`❌ Cleanup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCleaningUp(false);
      setTimeout(() => setCleanupMessage(''), 5000);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Delete this external event? All associated intelligence alerts will also be removed.')) {
      return;
    }

    setDeletingEvent(eventId);
    try {
      const result = await deleteExternalEvent(eventId);
      if (result.error) throw new Error(result.error.message);
      await loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setDeletingEvent(null);
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCleanupDuplicates}
            disabled={cleaningUp}
          >
            {cleaningUp ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash className="h-4 w-4 mr-2" />
                Cleanup Duplicates
              </>
            )}
          </Button>
          <Button onClick={() => setShowForm(true)}>+ Add External Event</Button>
        </div>
      )}

      {cleanupMessage && (
        <Alert>
          <AlertDescription>{cleanupMessage}</AlertDescription>
        </Alert>
      )}

      {scanMessage && (
        <Alert className={
          scanMessage.type === 'success' ? 'border-green-200 bg-green-50' :
          scanMessage.type === 'error' ? 'border-red-200 bg-red-50' :
          'border-blue-200 bg-blue-50'
        }>
          <AlertDescription className={
            scanMessage.type === 'success' ? 'text-green-800' :
            scanMessage.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }>
            {scanMessage.text}
          </AlertDescription>
        </Alert>
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-600">No external events tracked yet</p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => setShowForm(true)}>
                  Add First Event
                </Button>
              )}
              {!isAdmin && <p className="text-gray-500 text-sm mt-2">Contact your administrator to add events</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{event.summary}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline">{event.source}</Badge>
                      <Badge variant="secondary">{event.event_type}</Badge>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={deletingEvent === event.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingEvent === event.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      View Source →
                    </a>
                  )}
                  <p className="text-xs text-gray-500">
                    Published: {new Date(event.published_date).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Major Bank Reports Data Breach"
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
                placeholder="Brief description of the event..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Source *</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  required
                  placeholder="e.g., BusinessDay Nigeria"
                />
              </div>
              <div>
                <Label>Event Type *</Label>
                <Input
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  required
                  placeholder="e.g., security, regulatory, market"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>URL</Label>
                <Input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Published Date *</Label>
                <Input
                  type="date"
                  value={formData.published_date}
                  onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={scanning}>
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning for threats...
                  </>
                ) : (
                  'Save & Scan Event'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntelligenceAlerts() {
  const [pendingAlerts, setPendingAlerts] = useState<any[]>([]);
  const [acceptedAlerts, setAcceptedAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [applyingAlert, setApplyingAlert] = useState<string | null>(null);
  const [undoingAlert, setUndoingAlert] = useState<string | null>(null);
  const [treatmentNotes, setTreatmentNotes] = useState<Record<string, string>>({});
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [batchApplying, setBatchApplying] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const [pendingResult, acceptedResult] = await Promise.all([
        getPendingIntelligenceAlerts(),
        getAcceptedIntelligenceAlerts(),
      ]);

      if (pendingResult.error) throw new Error(pendingResult.error.message);
      if (acceptedResult.error) throw new Error(acceptedResult.error.message);

      setPendingAlerts(pendingResult.data || []);
      setAcceptedAlerts(acceptedResult.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    setScanMessage('🔍 Analyzing external events against risk register using AI...');

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setScanMessage('❌ Not authenticated. Please log in.');
        setScanning(false);
        return;
      }

      // Call Supabase Edge Function
      const { data: result, error } = await supabase.functions.invoke('analyze-intelligence', {
        body: {
          minConfidence: 70,
        },
      });

      if (error) {
        throw error;
      }

      if (result.success) {
        if (result.errors.length > 0) {
          setScanMessage(
            `⚠️ Analysis completed with ${result.errors.length} error(s). ` +
            `Scanned ${result.scanned} events, created ${result.alertsCreated} alerts.`
          );
        } else {
          setScanMessage(
            `✅ Analysis complete! Scanned ${result.scanned} events. ` +
            `Created ${result.alertsCreated} new alerts.`
          );
        }

        // Reload alerts
        await loadAlerts();
      } else {
        setScanMessage(`❌ Analysis failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error running intelligence analyzer:', err);
      setScanMessage(`❌ Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setScanning(false);
      setTimeout(() => setScanMessage(''), 5000);
    }
  }

  async function handleAccept(id: string) {
    console.log('🟢 Accept button clicked, alert ID:', id);
    try {
      console.log('Calling acceptIntelligenceAlert...');
      const result = await acceptIntelligenceAlert(id);
      console.log('Accept result:', result);
      if (result.error) throw new Error(result.error.message);
      console.log('Reloading alerts...');
      await loadAlerts();
      console.log('✅ Alert accepted successfully');
    } catch (err) {
      console.error('❌ Accept error:', err);
      alert(err instanceof Error ? err.message : 'Failed to accept alert');
    }
  }

  async function handleReject(id: string) {
    console.log('🔴 Reject button clicked, alert ID:', id);
    try {
      console.log('Calling rejectIntelligenceAlert...');
      const result = await rejectIntelligenceAlert(id);
      console.log('Reject result:', result);
      if (result.error) throw new Error(result.error.message);
      console.log('Reloading alerts...');
      await loadAlerts();
      console.log('✅ Alert rejected successfully');
    } catch (err) {
      console.error('❌ Reject error:', err);
      alert(err instanceof Error ? err.message : 'Failed to reject alert');
    }
  }

  async function handleApplyAlert(alertId: string) {
    setApplyingAlert(alertId);
    try {
      const notes = treatmentNotes[alertId] || '';
      const result = await applyIntelligenceAlert(alertId, notes);
      if (result.error) throw new Error(result.error.message);
      await loadAlerts();
      // Clear notes after successful application
      const newNotes = { ...treatmentNotes };
      delete newNotes[alertId];
      setTreatmentNotes(newNotes);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to apply alert');
    } finally {
      setApplyingAlert(null);
    }
  }

  async function handleUndoAlert(alertId: string) {
    if (!confirm('Undo this alert application? Risk scores will be recalculated using remaining alerts.')) {
      return;
    }

    setUndoingAlert(alertId);
    try {
      const result = await undoAppliedAlert(alertId, 'Undone by user from intelligence alerts');
      if (result.error) throw new Error(result.error.message);
      await loadAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to undo alert');
    } finally {
      setUndoingAlert(null);
    }
  }

  function handleToggleSelect(alertId: string) {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  }

  function handleSelectAll() {
    const unappliedAlerts = acceptedAlerts.filter(a => !a.applied_to_risk);
    const newSelected = new Set(unappliedAlerts.map(a => a.id));
    setSelectedAlerts(newSelected);
  }

  function handleDeselectAll() {
    setSelectedAlerts(new Set());
  }

  async function handleBatchApply() {
    if (selectedAlerts.size === 0) {
      alert('Please select at least one alert to apply');
      return;
    }

    if (!confirm(`Apply ${selectedAlerts.size} selected alert(s) to risk register?`)) {
      return;
    }

    setBatchApplying(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const alertId of Array.from(selectedAlerts)) {
      try {
        const notes = treatmentNotes[alertId] || '';
        const result = await applyIntelligenceAlert(alertId, notes);
        if (result.error) {
          errorCount++;
          errors.push(`Alert ${alertId}: ${result.error.message}`);
        } else {
          successCount++;
        }
      } catch (err) {
        errorCount++;
        errors.push(`Alert ${alertId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setBatchApplying(false);
    setSelectedAlerts(new Set());
    await loadAlerts();

    // Show summary
    if (errorCount === 0) {
      alert(`✅ Successfully applied ${successCount} alert(s) to risk register`);
    } else {
      alert(
        `⚠️ Batch apply completed:\n` +
        `✅ Success: ${successCount}\n` +
        `❌ Errors: ${errorCount}\n\n` +
        `Errors:\n${errors.join('\n')}`
      );
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Scan Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Scan external events against your risk register using AI
          </p>
        </div>
        <Button onClick={handleScan} disabled={scanning}>
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Scan for Threats
            </>
          )}
        </Button>
      </div>

      {scanMessage && (
        <Alert>
          <AlertDescription>{scanMessage}</AlertDescription>
        </Alert>
      )}

      {/* Alert Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingAlertsTable
            alerts={pendingAlerts}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </TabsContent>

        <TabsContent value="accepted" className="mt-6">
          <AcceptedAlertsTable
            alerts={acceptedAlerts}
            applyingAlert={applyingAlert}
            undoingAlert={undoingAlert}
            treatmentNotes={treatmentNotes}
            selectedAlerts={selectedAlerts}
            batchApplying={batchApplying}
            onNotesChange={setTreatmentNotes}
            onApply={handleApplyAlert}
            onUndo={handleUndoAlert}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBatchApply={handleBatchApply}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendingAlertsTable({
  alerts,
  onAccept,
  onReject,
}: {
  alerts: any[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-600">No pending intelligence alerts</p>
            <p className="text-sm text-gray-500 mt-2">
              Click "Scan for Threats" to analyze external events
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Related Risk</TableHead>
          <TableHead>Change</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>AI Reasoning</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.id}>
            <TableCell className="font-medium max-w-xs">
              {alert.external_events?.title || 'Unknown Event'}
            </TableCell>
            <TableCell>
              <div>
                <p className="font-mono text-sm">{alert.risk_code}</p>
                <p className="text-xs text-gray-600">{alert.risks?.risk_title}</p>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                {alert.likelihood_change !== 0 && (
                  <Badge variant={alert.likelihood_change > 0 ? 'destructive' : 'default'}>
                    {alert.likelihood_change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    L: {alert.likelihood_change > 0 ? '+' : ''}{alert.likelihood_change}
                  </Badge>
                )}
                {alert.impact_change !== 0 && (
                  <Badge variant={alert.impact_change > 0 ? 'destructive' : 'default'}>
                    {alert.impact_change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    I: {alert.impact_change > 0 ? '+' : ''}{alert.impact_change}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{alert.confidence_score}%</Badge>
            </TableCell>
            <TableCell className="max-w-md">
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-500">Reasoning:</p>
                  <p className="text-sm text-gray-700 whitespace-normal break-words">
                    {alert.ai_reasoning || 'No reasoning provided'}
                  </p>
                </div>
                {alert.suggested_controls && alert.suggested_controls.length > 0 && (
                  <div className="bg-blue-50 border-l-2 border-blue-300 pl-2 py-1">
                    <p className="text-xs font-medium text-blue-900">💡 Suggested Controls:</p>
                    <ul className="list-disc list-inside text-xs text-blue-800 mt-1">
                      {alert.suggested_controls.slice(0, 2).map((control: string, idx: number) => (
                        <li key={idx}>{control}</li>
                      ))}
                      {alert.suggested_controls.length > 2 && (
                        <li className="text-blue-600">+{alert.suggested_controls.length - 2} more...</li>
                      )}
                    </ul>
                  </div>
                )}
                {alert.impact_assessment && (
                  <div className="bg-amber-50 border-l-2 border-amber-300 pl-2 py-1">
                    <p className="text-xs font-medium text-amber-900">⚠️ Impact:</p>
                    <p className="text-xs text-amber-800 mt-1 line-clamp-2">
                      {alert.impact_assessment}
                    </p>
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onAccept(alert.id)}>
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject(alert.id)}>
                  Reject
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AcceptedAlertsTable({
  alerts,
  applyingAlert,
  undoingAlert,
  treatmentNotes,
  selectedAlerts,
  batchApplying,
  onNotesChange,
  onApply,
  onUndo,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onBatchApply,
}: {
  alerts: any[];
  applyingAlert: string | null;
  undoingAlert: string | null;
  treatmentNotes: Record<string, string>;
  selectedAlerts: Set<string>;
  batchApplying: boolean;
  onNotesChange: (notes: Record<string, string>) => void;
  onApply: (alertId: string) => void;
  onUndo: (alertId: string) => void;
  onToggleSelect: (alertId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchApply: () => void;
}) {
  const unappliedAlerts = alerts.filter(a => !a.applied_to_risk);
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-600">No accepted alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch Apply Controls */}
      {unappliedAlerts.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedAlerts.size > 0 ? `${selectedAlerts.size} selected` : 'Select alerts to apply in batch'}
            </span>
            {selectedAlerts.size > 0 && (
              <Button size="sm" variant="outline" onClick={onDeselectAll}>
                Deselect All
              </Button>
            )}
            {selectedAlerts.size === 0 && unappliedAlerts.length > 0 && (
              <Button size="sm" variant="outline" onClick={onSelectAll}>
                Select All Unapplied ({unappliedAlerts.length})
              </Button>
            )}
          </div>
          <Button
            onClick={onBatchApply}
            disabled={selectedAlerts.size === 0 || batchApplying}
            size="sm"
          >
            {batchApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying {selectedAlerts.size} alert(s)...
              </>
            ) : (
              `Apply Selected (${selectedAlerts.size})`
            )}
          </Button>
        </div>
      )}

      {alerts.map((alert) => (
        <Card key={alert.id} className={alert.applied_to_risk ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* Checkbox for unapplied alerts */}
                {!alert.applied_to_risk && (
                  <Checkbox
                    checked={selectedAlerts.has(alert.id)}
                    onCheckedChange={() => onToggleSelect(alert.id)}
                    className="mt-1"
                  />
                )}
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {alert.applied_to_risk && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {alert.risk_code} - {alert.risks?.risk_title}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Event: {alert.external_events?.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {alert.likelihood_change !== 0 && (
                  <Badge variant={alert.likelihood_change > 0 ? 'destructive' : 'default'}>
                    Likelihood: {alert.likelihood_change > 0 ? '+' : ''}{alert.likelihood_change}
                  </Badge>
                )}
                {alert.impact_change !== 0 && (
                  <Badge variant={alert.impact_change > 0 ? 'destructive' : 'default'}>
                    Impact: {alert.impact_change > 0 ? '+' : ''}{alert.impact_change}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">AI Reasoning:</p>
              <p className="text-sm text-gray-600 mt-1">{alert.ai_reasoning || 'No reasoning provided'}</p>
            </div>

            {alert.suggested_controls && alert.suggested_controls.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm font-medium text-blue-900 mb-2">💡 Suggested Controls:</p>
                <ul className="list-disc list-inside space-y-1">
                  {alert.suggested_controls.map((control, idx) => (
                    <li key={idx} className="text-sm text-blue-800">{control}</li>
                  ))}
                </ul>
              </div>
            )}

            {alert.impact_assessment && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm font-medium text-amber-900 mb-2">⚠️ Impact Assessment:</p>
                <p className="text-sm text-amber-800">{alert.impact_assessment}</p>
              </div>
            )}

            {!alert.applied_to_risk && (
              <>
                <div>
                  <Label htmlFor={`notes-${alert.id}`}>Treatment Notes (Optional)</Label>
                  <Textarea
                    id={`notes-${alert.id}`}
                    value={treatmentNotes[alert.id] || ''}
                    onChange={(e) => onNotesChange({ ...treatmentNotes, [alert.id]: e.target.value })}
                    placeholder="Document your decision and any actions taken..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={() => onApply(alert.id)}
                  disabled={applyingAlert === alert.id}
                  size="sm"
                >
                  {applyingAlert === alert.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    'Apply to Risk Register'
                  )}
                </Button>
              </>
            )}

            {alert.applied_to_risk && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Applied to risk register</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUndo(alert.id)}
                  disabled={undoingAlert === alert.id}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  {undoingAlert === alert.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Undoing...
                    </>
                  ) : (
                    <>
                      <Undo2 className="h-3 w-3 mr-1" />
                      Undo
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
