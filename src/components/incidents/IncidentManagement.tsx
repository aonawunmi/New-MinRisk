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
  suggestRisksForIncident,
  linkIncidentToRisk,
  type Incident,
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
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
    </div>
  );
}
