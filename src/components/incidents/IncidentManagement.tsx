/**
 * IncidentManagement Component
 *
 * Comprehensive incident tracking with AI-powered risk linking
 */

import { useState, useEffect } from 'react';
import {
  getIncidents,
  createIncident,
  updateIncident,
  linkIncidentToRisk,
  suggestRisksForIncident,
  acceptRiskSuggestion,
  rejectRiskSuggestion,
  type Incident,
  type AISuggestedRisk,
} from '@/lib/incidents';
import { isUserAdmin } from '@/lib/profiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function IncidentManagement() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    division: '',
    severity: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    status: 'Open' as 'Open' | 'Investigating' | 'Resolved' | 'Closed',
  });

  // AI Suggestions state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestedRisk[]>([]);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    loadIncidents();
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    const adminStatus = await isUserAdmin();
    setIsAdmin(adminStatus);
  }

  async function loadIncidents() {
    setLoading(true);
    try {
      const result = await getIncidents();
      if (result.error) throw new Error(result.error.message);
      setIncidents(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await createIncident(formData);
      if (result.error) throw new Error(result.error.message);

      // Trigger AI analysis for newly created incident
      if (result.data) {
        await triggerAiAnalysis(result.data);
      }

      await loadIncidents();
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        division: '',
        severity: 'Medium',
        status: 'Open',
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create incident');
    }
  }

  async function triggerAiAnalysis(incident: Incident) {
    setSelectedIncident(incident);
    setAiLoading(true);
    setAiError(null);
    setShowAiDialog(true);

    try {
      const result = await suggestRisksForIncident(incident.id);
      if (result.error) throw new Error(result.error.message);
      setAiSuggestions(result.data || []);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to analyze incident');
      console.error('AI analysis error:', err);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAcceptSuggestion(riskCode: string) {
    if (!selectedIncident) return;

    try {
      const result = await acceptRiskSuggestion(selectedIncident.id, riskCode);
      if (result.error) throw new Error(result.error.message);

      // Update UI to reflect accepted status
      setAiSuggestions(prev =>
        prev.map(s => s.risk_code === riskCode ? { ...s, status: 'accepted' as const } : s)
      );

      await loadIncidents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept suggestion');
    }
  }

  async function handleRejectSuggestion(riskCode: string) {
    if (!selectedIncident) return;

    try {
      const result = await rejectRiskSuggestion(selectedIncident.id, riskCode);
      if (result.error) throw new Error(result.error.message);

      // Update UI to reflect rejected status
      setAiSuggestions(prev =>
        prev.map(s => s.risk_code === riskCode ? { ...s, status: 'rejected' as const } : s)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject suggestion');
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-500 text-white';
    if (confidence >= 80) return 'bg-blue-500 text-white';
    if (confidence >= 70) return 'bg-yellow-500 text-black';
    return 'bg-gray-500 text-white';
  };

  if (loading) return <div className="text-center py-12">Loading incidents...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Incident Management</h2>
          <p className="text-gray-600 text-sm mt-1">
            Track and manage operational incidents
          </p>
        </div>
        {isAdmin && <Button onClick={() => setShowForm(true)}>+ Report Incident</Button>}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {['Open', 'Investigating', 'Resolved', 'Closed'].map((status) => {
          const count = incidents.filter((i) => i.status === status).length;
          return (
            <Card key={status}>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-600">{status}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Incidents ({incidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No incidents reported</p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => setShowForm(true)}>
                  Report First Incident
                </Button>
              )}
              {!isAdmin && <p className="text-gray-500 text-sm mt-2">Contact your administrator to report incidents</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>AI Analysis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-mono text-sm">
                      {incident.incident_code}
                    </TableCell>
                    <TableCell className="font-medium">{incident.incident_title}</TableCell>
                    <TableCell>{incident.division}</TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{incident.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(incident.incident_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerAiAnalysis(incident)}
                      >
                        {incident.ai_analysis_status === 'completed' ? 'View AI' : 'Analyze'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Incident Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report New Incident</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Division</Label>
                <Input
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                />
              </div>
              <div>
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, severity: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Report Incident</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              AI Risk Analysis
              {selectedIncident && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  for {selectedIncident.incident_code}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {aiLoading && (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing incident and matching with organizational risks...</p>
            </div>
          )}

          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800 font-medium">Analysis Failed</p>
              <p className="text-red-600 text-sm mt-1">{aiError}</p>
            </div>
          )}

          {!aiLoading && !aiError && aiSuggestions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No related risks found with sufficient confidence (≥70%).</p>
              <p className="text-gray-500 text-sm mt-2">
                The AI could not identify any existing risks that strongly relate to this incident.
              </p>
            </div>
          )}

          {!aiLoading && !aiError && aiSuggestions.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Found {aiSuggestions.length} potential risk link{aiSuggestions.length !== 1 ? 's' : ''}:
              </p>

              {aiSuggestions.map((suggestion) => (
                <Card key={suggestion.risk_code} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">
                            {suggestion.risk_code}
                          </span>
                          <Badge className={getConfidenceColor(suggestion.confidence)}>
                            {suggestion.confidence}% confidence
                          </Badge>
                          {suggestion.status === 'accepted' && (
                            <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                          )}
                          {suggestion.status === 'rejected' && (
                            <Badge className="bg-gray-100 text-gray-800">Rejected</Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-lg">{suggestion.risk_title}</h4>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Relationship Type:</p>
                      <Badge variant="outline" className="capitalize">
                        {suggestion.link_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">AI Reasoning:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {suggestion.reasoning}
                      </p>
                    </div>

                    {suggestion.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptSuggestion(suggestion.risk_code)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Accept & Link Risk
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectSuggestion(suggestion.risk_code)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowAiDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
