/**
 * Regulatory Reports Component
 *
 * Allows organizations to:
 * - Generate regulatory reports (CBN, SEC, PENCOM)
 * - View and manage generated reports
 * - Schedule automated report generation
 * - Submit reports to regulators
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
  getReportTemplates,
  createRegulatoryReport,
  getOrganizationReports,
  updateReportStatus,
  type ReportTemplate,
  type RegulatoryReport,
} from '@/lib/regulatory-reports';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  Calendar,
  Building2,
} from 'lucide-react';

export default function RegulatoryReports() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate dialog state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [reportName, setReportName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [generating, setGenerating] = useState(false);

  // View report dialog state
  const [viewReportDialogOpen, setViewReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, [profile?.organization_id]);

  async function loadData() {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load templates
      const { data: templatesData, error: templatesError } = await getReportTemplates();
      if (templatesError) {
        setError('Failed to load report templates');
        return;
      }
      setTemplates(templatesData || []);

      // Load reports
      const { data: reportsData, error: reportsError } = await getOrganizationReports(
        profile.organization_id
      );
      if (reportsError) {
        setError('Failed to load reports');
        return;
      }
      setReports(reportsData || []);
    } catch (err) {
      setError('Unexpected error loading data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerateDialogOpen() {
    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setPeriodStart(firstDay.toISOString().split('T')[0]);
    setPeriodEnd(lastDay.toISOString().split('T')[0]);
    setReportName('');
    setSelectedTemplateId('');
    setGenerateDialogOpen(true);
  }

  async function handleGenerateReport() {
    if (!selectedTemplateId || !reportName || !periodStart || !periodEnd || !profile?.organization_id) {
      setError('Please fill all fields');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: genError } = await createRegulatoryReport(
        selectedTemplateId,
        profile.organization_id,
        reportName,
        periodStart,
        periodEnd
      );

      if (genError) {
        setError('Failed to generate report: ' + genError.message);
        return;
      }

      setSuccess('Report generated successfully!');
      setGenerateDialogOpen(false);
      loadData(); // Reload reports
    } catch (err) {
      setError('Unexpected error generating report');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  function handleViewReport(report: any) {
    setSelectedReport(report);
    setViewReportDialogOpen(true);
  }

  async function handleSubmitReport(reportId: string) {
    setError(null);
    setSuccess(null);

    const { error: submitError } = await updateReportStatus(reportId, 'submitted');
    if (submitError) {
      setError('Failed to submit report');
      return;
    }

    setSuccess('Report submitted successfully!');
    loadData();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>;
      case 'reviewed':
        return <Badge variant="outline">Reviewed</Badge>;
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage regulatory compliance reports
          </p>
        </div>
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleGenerateDialogOpen}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Regulatory Report</DialogTitle>
              <DialogDescription>
                Create a new regulatory report for submission
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="template">Report Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {templates.find(t => t.id === selectedTemplateId)?.description}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="reportName">Report Name</Label>
                <Input
                  id="reportName"
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  placeholder="e.g., January 2026 Risk Report"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodStart">Period Start</Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={periodStart}
                    onChange={e => setPeriodStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="periodEnd">Period End</Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={periodEnd}
                    onChange={e => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setGenerateDialogOpen(false)}
                disabled={generating}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerateReport} disabled={generating}>
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Available Report Templates</CardTitle>
          <CardDescription>
            Templates for regulatory compliance reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map(template => (
              <div key={template.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <FileText className="h-5 w-5 text-primary" />
                  <Badge variant="outline">{template.version}</Badge>
                </div>
                <div className="font-semibold">{template.name}</div>
                <div className="text-sm text-muted-foreground">{template.description}</div>
                <div className="text-xs text-muted-foreground">
                  {template.config.sections.length} sections,{' '}
                  {template.config.metrics.length} metrics
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generated Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>
            View and manage your regulatory reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No reports generated yet. Click "Generate Report" to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.report_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{report.template?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {report.template?.regulator?.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(report.reporting_period_start).toLocaleDateString()} -{' '}
                      {new Date(report.reporting_period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(report.generated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          View
                        </Button>
                        {report.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSubmitReport(report.id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Submit
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

      {/* View Report Dialog */}
      <Dialog open={viewReportDialogOpen} onOpenChange={setViewReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.report_name}</DialogTitle>
            <DialogDescription>
              Report generated on {new Date(selectedReport?.generated_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Executive Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border rounded p-3">
                    <div className="text-sm text-muted-foreground">Total Risks</div>
                    <div className="text-2xl font-bold">
                      {selectedReport.data.executive_summary.total_risks}
                    </div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-sm text-muted-foreground">Critical</div>
                    <div className="text-2xl font-bold text-red-600">
                      {selectedReport.data.executive_summary.critical_risks}
                    </div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-sm text-muted-foreground">High</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedReport.data.executive_summary.high_risks}
                    </div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-sm text-muted-foreground">Risk Reduction</div>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedReport.data.executive_summary.risk_reduction_percentage}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Risks by Category */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Risks by Category</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Critical</TableHead>
                      <TableHead className="text-right">High</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReport.data.risks.by_category.map((cat: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell className="text-right">{cat.count}</TableCell>
                        <TableCell className="text-right text-red-600">{cat.critical}</TableCell>
                        <TableCell className="text-right text-orange-600">{cat.high}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Top Risks */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Top 10 Risks</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="text-right">Residual Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReport.data.risks.top_risks.map((risk: any) => (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium">{risk.title}</TableCell>
                        <TableCell>{risk.category}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              risk.severity === 'CRITICAL' ? 'destructive' : 'default'
                            }
                          >
                            {risk.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {risk.residual_score.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Controls & KRIs Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded p-4">
                  <h4 className="font-semibold mb-2">Controls</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Controls</span>
                      <span className="font-medium">{selectedReport.data.controls.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Effectiveness</span>
                      <span className="font-medium">
                        {selectedReport.data.controls.avg_effectiveness}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border rounded p-4">
                  <h4 className="font-semibold mb-2">KRIs & Incidents</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total KRIs</span>
                      <span className="font-medium">{selectedReport.data.kris.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Incidents</span>
                      <span className="font-medium">{selectedReport.data.incidents.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewReportDialogOpen(false)}>
              Close
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
