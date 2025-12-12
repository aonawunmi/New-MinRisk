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
  bulkDeleteExternalEvents,
  cleanupDuplicateEvents,
  getPendingIntelligenceAlerts,
  getAcceptedIntelligenceAlerts,
  acceptIntelligenceAlert,
  applyIntelligenceAlert,
  rejectIntelligenceAlert,
  undoAppliedAlert,
  bulkDeleteIntelligenceAlerts,
  triggerRssScan,
  getUniqueSources,
  getUniqueEventTypes,
  type ExternalEvent,
  type RiskIntelligenceAlert,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Loader2, CheckCircle2, TrendingUp, TrendingDown, Trash2, Trash, Undo2, RefreshCw, Info, ChevronDown, ChevronUp, Download, Filter, X, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import RssSourceManagement from './RssSourceManagement';

export default function RiskIntelligenceManagement() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Risk Intelligence</h2>
            <p className="text-gray-600 text-sm mt-1">
              AI-powered external event tracking and automated risk correlation
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGuide(!showGuide)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Info className="h-4 w-4 mr-2" />
            {showGuide ? 'Hide' : 'How It Works'}
            {showGuide ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {showGuide && (
          <Card className="mt-4 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 flex items-center">
                <Brain className="h-5 w-5 mr-2 text-blue-600" />
                How Risk Intelligence Works
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600 min-w-[24px]">1.</span>
                  <p><strong>Daily Automation:</strong> RSS scanner runs every day at 2:00 AM UTC, fetching news from 9+ sources (Nigerian + Global security feeds).</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600 min-w-[24px]">2.</span>
                  <p><strong>AI Analysis:</strong> Each event is analyzed by Claude AI against YOUR organization's active risks. Events with 60%+ confidence match are flagged as alerts.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600 min-w-[24px]">3.</span>
                  <p><strong>Review Alerts:</strong> Go to "🔔 Intelligence Alerts" tab to see which events match your risks. AI provides reasoning and suggested likelihood changes.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600 min-w-[24px]">4.</span>
                  <p><strong>Take Action:</strong> ✅ Accept alert to automatically update risk, or ❌ Reject to dismiss. All changes are tracked in treatment history.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-600"><strong>Admin privileges required:</strong> Manually trigger scans, add custom events, manage RSS sources, and cleanup duplicates.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">🌐 External Events</TabsTrigger>
          <TabsTrigger value="alerts">🔔 Intelligence Alerts</TabsTrigger>
          <TabsTrigger value="rss-sources">📡 RSS Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-6">
          <EventsFeed />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <IntelligenceAlerts />
        </TabsContent>

        <TabsContent value="rss-sources" className="mt-6">
          <RssSourceManagement />
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

  // Filter states
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);

  // Bulk action states
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    loadFilterOptions();
    loadEvents();
    checkAdminStatus();
  }, []);

  // Reload events when filters change
  useEffect(() => {
    loadEvents();
  }, [sourceFilter, eventTypeFilter, dateFrom, dateTo]);

  async function checkAdminStatus() {
    const adminStatus = await isUserAdmin();
    setIsAdmin(adminStatus);
  }

  async function loadFilterOptions() {
    try {
      const [sourcesResult, typesResult] = await Promise.all([
        getUniqueSources(),
        getUniqueEventTypes(),
      ]);

      if (sourcesResult.data) setAvailableSources(sourcesResult.data);
      if (typesResult.data) setAvailableEventTypes(typesResult.data);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const result = await getExternalEvents({
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        event_type: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
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

  async function handleTriggerRssScan() {
    setScanning(true);
    setScanMessage({ type: 'info', text: '🔄 Starting RSS scan... This may take 2-3 minutes.' });

    try {
      const result = await triggerRssScan();

      if (result.success) {
        setScanMessage({
          type: 'success',
          text: `✅ ${result.message}`
        });
        // Reload events after successful scan
        await loadEvents();
      } else {
        setScanMessage({
          type: 'error',
          text: `❌ ${result.error || 'Scan failed'}`
        });
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: `❌ ${err instanceof Error ? err.message : 'Failed to trigger scan'}`
      });
    } finally {
      setScanning(false);
      setTimeout(() => setScanMessage(null), 10000); // Clear after 10 seconds
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

  // Bulk selection handlers
  function handleSelectEvent(eventId: string, checked: boolean) {
    const newSelection = new Set(selectedEvents);
    if (checked) {
      newSelection.add(eventId);
    } else {
      newSelection.delete(eventId);
    }
    setSelectedEvents(newSelection);
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedEvents(new Set(events.map(e => e.id)));
    } else {
      setSelectedEvents(new Set());
    }
  }

  async function handleBulkDelete() {
    if (selectedEvents.size === 0) {
      alert('No events selected');
      return;
    }

    if (!confirm(`Delete ${selectedEvents.size} selected event(s)? All associated intelligence alerts will also be removed.`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const result = await bulkDeleteExternalEvents(Array.from(selectedEvents));
      if (result.error) throw new Error(result.error.message);
      alert(`Successfully deleted ${result.deletedCount} event(s)`);
      setSelectedEvents(new Set());
      await loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete events');
    } finally {
      setBulkDeleting(false);
    }
  }

  function handleExportCSV() {
    if (events.length === 0) {
      alert('No events to export');
      return;
    }

    // Create CSV content
    const headers = ['Title', 'Source', 'Event Type', 'Published Date', 'URL', 'Summary'];
    const rows = events.map(event => [
      event.title,
      event.source,
      event.event_type,
      new Date(event.published_date).toLocaleDateString(),
      event.url || '',
      event.summary || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `external-events-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleClearFilters() {
    setSourceFilter('all');
    setEventTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  }

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const hasActiveFilters = sourceFilter !== 'all' || eventTypeFilter !== 'all' || dateFrom || dateTo;
  const allSelected = events.length > 0 && selectedEvents.size === events.length;
  const someSelected = selectedEvents.size > 0 && !allSelected;

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filter Events
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="ml-auto text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {availableSources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Event Type</Label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {availableEventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isAdmin && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className={someSelected ? "data-[state=checked]:bg-blue-600" : ""}
            />
            <span className="text-sm text-gray-600">
              {selectedEvents.size > 0 ? `${selectedEvents.size} selected` : 'Select all'}
            </span>
            {selectedEvents.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={events.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleTriggerRssScan}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Scan RSS Now
                </>
              )}
            </Button>
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
        </div>
      )}

      {/* RSS Scanning Info Note */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Note:</strong> RSS scanning is designed to run on an automated daily schedule.
          Manual scanning may timeout for large feed lists. Use "Scan for Threats" in the Intelligence Alerts tab
          to analyze existing events instead.
        </AlertDescription>
      </Alert>

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
            <Card key={event.id} className={selectedEvents.has(event.id) ? 'border-blue-500 bg-blue-50/50' : ''}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {isAdmin && (
                    <Checkbox
                      checked={selectedEvents.has(event.id)}
                      onCheckedChange={(checked) => handleSelectEvent(event.id, checked as boolean)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex items-start justify-between flex-1">
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
  const [resetting, setResetting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [applyingAlert, setApplyingAlert] = useState<string | null>(null);
  const [undoingAlert, setUndoingAlert] = useState<string | null>(null);
  const [treatmentNotes, setTreatmentNotes] = useState<Record<string, string>>({});
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [batchApplying, setBatchApplying] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState(70); // Filter threshold
  const [selectedPendingAlerts, setSelectedPendingAlerts] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeletingAccepted, setBulkDeletingAccepted] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadAlerts();
  }, []);

  async function checkAdminStatus() {
    const adminStatus = await isUserAdmin();
    setIsAdmin(adminStatus);
  }

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
    setScanMessage('🔍 Counting unanalyzed events...');

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setScanMessage('❌ Not authenticated. Please log in.');
        setScanning(false);
        return;
      }

      // Get count of unanalyzed events
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        setScanMessage('❌ User profile not found');
        setScanning(false);
        return;
      }

      const { count } = await supabase
        .from('external_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('relevance_checked', false);

      if (!count || count === 0) {
        setScanMessage('✅ No new events to analyze');
        setScanning(false);
        return;
      }

      // Process in batches of 3 to avoid timeouts
      const batchSize = 3;
      const totalBatches = Math.ceil(count / batchSize);
      let totalScanned = 0;
      let totalAlerts = 0;
      let allErrors: string[] = [];

      for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
        setScanMessage(`🔍 Analyzing batch ${batchNum}/${totalBatches} (${count} total events)...`);

        // Call Edge Function for this batch
        const { data: result, error } = await supabase.functions.invoke('analyze-intelligence', {
          body: {
            minConfidence: 70,
            limit: batchSize,
          },
        });

        if (error) {
          allErrors.push(`Batch ${batchNum} error: ${error.message}`);
          continue;
        }

        if (result) {
          totalScanned += result.scanned || 0;
          totalAlerts += result.alertsCreated || 0;
          if (result.errors && result.errors.length > 0) {
            allErrors.push(...result.errors);
          }
        }

        // If this batch processed fewer events than the batch size, we're done
        if ((result?.scanned || 0) < batchSize) {
          break;
        }
      }

      // Show final results
      if (allErrors.length > 0) {
        setScanMessage(
          `⚠️ Analysis completed with ${allErrors.length} error(s). ` +
          `Scanned ${totalScanned} events, created ${totalAlerts} alerts.`
        );
      } else {
        setScanMessage(
          `✅ Analysis complete! Scanned ${totalScanned} events. ` +
          `Created ${totalAlerts} new alerts.`
        );
      }

      // Reload alerts to show new results
      await loadAlerts();
    } catch (err) {
      console.error('Error running intelligence analyzer:', err);
      setScanMessage(`❌ Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setScanning(false);
      setTimeout(() => setScanMessage(''), 5000);
    }
  }

  async function handleResetEvents() {
    if (!confirm('Reset the last 20 analyzed events so they can be re-analyzed? This is useful for testing or re-running analysis after fixing issues.')) {
      return;
    }

    setResetting(true);
    setScanMessage('🔄 Resetting events...');

    try {
      // Get auth session and profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setScanMessage('❌ Not authenticated');
        setResetting(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        setScanMessage('❌ Profile not found');
        setResetting(false);
        return;
      }

      // Reset last 20 events
      const { data: eventsToReset } = await supabase
        .from('external_events')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('relevance_checked', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!eventsToReset || eventsToReset.length === 0) {
        setScanMessage('ℹ️ No analyzed events to reset');
        setResetting(false);
        return;
      }

      const eventIds = eventsToReset.map(e => e.id);

      const { error } = await supabase
        .from('external_events')
        .update({ relevance_checked: false })
        .in('id', eventIds);

      if (error) throw error;

      setScanMessage(`✅ Reset ${eventIds.length} events. Click "Scan for Threats" to re-analyze them.`);
    } catch (err) {
      console.error('Error resetting events:', err);
      setScanMessage(`❌ Failed to reset events: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setResetting(false);
      setTimeout(() => setScanMessage(''), 10000);
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

  async function handleBulkDeletePending() {
    if (selectedPendingAlerts.size === 0) {
      alert('Please select at least one alert to delete');
      return;
    }

    const count = selectedPendingAlerts.size;
    if (!confirm(`Delete ${count} selected alert(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const result = await bulkDeleteIntelligenceAlerts(Array.from(selectedPendingAlerts));
      if (result.error) throw new Error(result.error.message);

      alert(`✅ Successfully deleted ${result.deletedCount} alert(s)`);
      setSelectedPendingAlerts(new Set());
      await loadAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete alerts');
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleBulkDeleteAccepted() {
    if (selectedAlerts.size === 0) {
      alert('Please select at least one alert to delete');
      return;
    }

    const count = selectedAlerts.size;
    if (!confirm(`Delete ${count} selected accepted alert(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkDeletingAccepted(true);
    try {
      const result = await bulkDeleteIntelligenceAlerts(Array.from(selectedAlerts));
      if (result.error) throw new Error(result.error.message);

      alert(`✅ Successfully deleted ${result.deletedCount} alert(s)`);
      setSelectedAlerts(new Set());
      await loadAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete alerts');
    } finally {
      setBulkDeletingAccepted(false);
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
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              onClick={handleResetEvents}
              disabled={resetting}
              variant="outline"
              size="sm"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Reset Events
                </>
              )}
            </Button>
          )}
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
          {/* Confidence Filter */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">
                    Confidence Threshold: {confidenceFilter}%
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Show alerts with AI confidence ≥ {confidenceFilter}%
                  </p>
                </div>
                <div className="flex-1 max-w-md">
                  <input
                    type="range"
                    min="60"
                    max="100"
                    step="5"
                    value={confidenceFilter}
                    onChange={(e) => setConfidenceFilter(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>60%</span>
                    <span>80%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <PendingAlertsTable
            alerts={pendingAlerts.filter(a => (a.confidence_score * 100) >= confidenceFilter)}
            selectedAlerts={selectedPendingAlerts}
            onToggleSelect={(id, checked) => {
              const newSet = new Set(selectedPendingAlerts);
              if (checked) newSet.add(id);
              else newSet.delete(id);
              setSelectedPendingAlerts(newSet);
            }}
            onSelectAll={(checked) => {
              if (checked) {
                const filtered = pendingAlerts.filter(a => (a.confidence_score * 100) >= confidenceFilter);
                setSelectedPendingAlerts(new Set(filtered.map(a => a.id)));
              } else {
                setSelectedPendingAlerts(new Set());
              }
            }}
            onBulkDelete={handleBulkDeletePending}
            bulkDeleting={bulkDeleting}
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
            bulkDeleting={bulkDeletingAccepted}
            onNotesChange={setTreatmentNotes}
            onApply={handleApplyAlert}
            onUndo={handleUndoAlert}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBatchApply={handleBatchApply}
            onBulkDelete={handleBulkDeleteAccepted}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendingAlertsTable({
  alerts,
  selectedAlerts,
  onToggleSelect,
  onSelectAll,
  onBulkDelete,
  bulkDeleting,
  onAccept,
  onReject,
}: {
  alerts: any[];
  selectedAlerts: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onBulkDelete: () => void;
  bulkDeleting: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [sortBy, setSortBy] = useState('confidence-desc');
  const allSelected = alerts.length > 0 && alerts.every(a => selectedAlerts.has(a.id));

  // Sort alerts based on selected option
  const sortedAlerts = [...alerts].sort((a, b) => {
    switch (sortBy) {
      case 'confidence-desc':
        return (b.confidence_score || 0) - (a.confidence_score || 0);
      case 'confidence-asc':
        return (a.confidence_score || 0) - (b.confidence_score || 0);
      case 'date-desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date-asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'risk-code':
        return (a.risk_code || '').localeCompare(b.risk_code || '');
      default:
        return 0;
    }
  });

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
    <div className="space-y-4">
      {/* Bulk Delete Controls & Sort */}
      {alerts.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedAlerts.size > 0 ? `${selectedAlerts.size} selected` : 'Select alerts to delete'}
            </span>
            {selectedAlerts.size > 0 && (
              <Button size="sm" variant="outline" onClick={() => onSelectAll(false)}>
                Deselect All
              </Button>
            )}
            <div className="flex items-center gap-2 ml-4 border-l pl-4">
              <Label className="text-sm">Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence-desc">Confidence (High → Low)</SelectItem>
                  <SelectItem value="confidence-asc">Confidence (Low → High)</SelectItem>
                  <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="risk-code">Risk Code (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={onBulkDelete}
            disabled={selectedAlerts.size === 0 || bulkDeleting}
            variant="destructive"
            size="sm"
          >
            {bulkDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting {selectedAlerts.size} alert(s)...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedAlerts.size})
              </>
            )}
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
            </TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Related Risk</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="min-w-[400px]">AI Reasoning</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAlerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedAlerts.has(alert.id)}
                  onChange={(e) => onToggleSelect(alert.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </TableCell>
              <TableCell className="font-medium max-w-xs">
                {alert.external_events?.title ? (
                  alert.external_events.title
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs">
                      Event {alert.event_id.slice(0, 8)}... (orphaned)
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-mono text-sm">{alert.risk_code}</p>
                  <p className="text-xs text-gray-600">{alert.risks?.risk_title}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {alert.suggested_likelihood_change !== 0 && (
                    <Badge variant={alert.suggested_likelihood_change > 0 ? 'destructive' : 'default'}>
                      {alert.suggested_likelihood_change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      L: {alert.suggested_likelihood_change > 0 ? '+' : ''}{alert.suggested_likelihood_change}
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
                <Badge variant="outline">{Math.round((alert.confidence_score || 0) * 100)}%</Badge>
              </TableCell>
              <TableCell className="min-w-[400px]">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Reasoning:</p>
                    <p className="text-sm text-gray-700 whitespace-normal break-words">
                      {alert.reasoning || 'No reasoning provided'}
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
    </div>
  );
}

function AcceptedAlertsTable({
  alerts,
  applyingAlert,
  undoingAlert,
  treatmentNotes,
  selectedAlerts,
  batchApplying,
  bulkDeleting,
  onNotesChange,
  onApply,
  onUndo,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onBatchApply,
  onBulkDelete,
}: {
  alerts: any[];
  applyingAlert: string | null;
  undoingAlert: string | null;
  treatmentNotes: Record<string, string>;
  selectedAlerts: Set<string>;
  batchApplying: boolean;
  bulkDeleting: boolean;
  onNotesChange: (notes: Record<string, string>) => void;
  onApply: (alertId: string) => void;
  onUndo: (alertId: string) => void;
  onToggleSelect: (alertId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchApply: () => void;
  onBulkDelete: () => void;
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
      {/* Batch Apply & Delete Controls */}
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
          <div className="flex items-center gap-2">
            <Button
              onClick={onBulkDelete}
              disabled={selectedAlerts.size === 0 || bulkDeleting}
              variant="destructive"
              size="sm"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting {selectedAlerts.size} alert(s)...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedAlerts.size})
                </>
              )}
            </Button>
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
                {alert.suggested_likelihood_change !== 0 && (
                  <Badge variant={alert.suggested_likelihood_change > 0 ? 'destructive' : 'default'}>
                    Likelihood: {alert.suggested_likelihood_change > 0 ? '+' : ''}{alert.suggested_likelihood_change}
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
              <p className="text-sm text-gray-600 mt-1">{alert.reasoning || 'No reasoning provided'}</p>
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
