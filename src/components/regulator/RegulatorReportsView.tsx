/**
 * Regulator Reports View Component
 *
 * Allows regulators to:
 * - View submitted reports from assigned organizations
 * - Review and approve reports
 * - Track compliance status
 */

import { useState, useEffect } from 'react';
import {
  getRegulatorReports,
  updateReportStatus,
} from '@/lib/regulatory-reports';
import { getAllRegulators, type Regulator } from '@/lib/regulators';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  ThumbsUp,
} from 'lucide-react';

export default function RegulatorReportsView() {
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [selectedRegulatorId, setSelectedRegulatorId] = useState<string>('');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // View report dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    loadRegulators();
  }, []);

  useEffect(() => {
    if (selectedRegulatorId) {
      loadReports();
    }
  }, [selectedRegulatorId]);

  async function loadRegulators() {
    const { data, error: regError } = await getAllRegulators();
    if (regError) {
      setError('Failed to load regulators');
      return;
    }
    setRegulators(data || []);
    if (data && data.length > 0) {
      setSelectedRegulatorId(data[0].id);
    }
    setLoading(false);
  }

  async function loadReports() {
    if (!selectedRegulatorId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: reportsError } = await getRegulatorReports(selectedRegulatorId);
      if (reportsError) {
        setError('Failed to load reports');
        return;
      }
      setReports(data || []);
    } catch (err) {
      setError('Unexpected error loading reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleViewReport(report: any) {
    setSelectedReport(report);
    setViewDialogOpen(true);
  }

  async function handleApproveReport(reportId: string) {
    setError(null);
    setSuccess(null);

    const { error: approveError } = await updateReportStatus(reportId, 'approved');
    if (approveError) {
      setError('Failed to approve report');
      return;
    }

    setSuccess('Report approved successfully!');
    loadReports();
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

  if (loading && regulators.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const selectedRegulator = regulators.find(r => r.id === selectedRegulatorId);
  const submittedReports = reports.filter(r => r.status !== 'draft');
  const pendingReports = reports.filter(r => r.status === 'submitted');
  const approvedReports = reports.filter(r => r.status === 'approved');

  return (
    <div className="space-y-6 p-6">
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Submitted Reports</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve regulatory reports from organizations
          </p>
        </div>
        <div className="w-64">
          <Select value={selectedRegulatorId} onValueChange={setSelectedRegulatorId}>
            <SelectTrigger>
              <SelectValue placeholder="Select regulator" />
            </SelectTrigger>
            <SelectContent>
              {regulators.map(reg => (
                <SelectItem key={reg.id} value={reg.id}>
                  {reg.name} ({reg.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedRegulator && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Submitted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{submittedReports.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{pendingReports.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{approvedReports.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Reports Table */}
          <Card>
            <CardHeader>
              <CardTitle>Report Submissions</CardTitle>
              <CardDescription>
                Reports submitted by organizations under {selectedRegulator.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submittedReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No reports submitted yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submittedReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{report.organization?.name}</div>
                            {report.organization?.institution_type && (
                              <div className="text-xs text-muted-foreground">
                                {report.organization.institution_type}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{report.report_name}</TableCell>
                        <TableCell className="text-sm">{report.template?.name}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(report.reporting_period_start).toLocaleDateString()} -{' '}
                          {new Date(report.reporting_period_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {report.submitted_at
                            ? new Date(report.submitted_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReport(report)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {report.status === 'submitted' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveReport(report.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Approve
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
        </>
      )}

      {/* View Report Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.report_name}</DialogTitle>
            <DialogDescription>
              Submitted by {selectedReport?.organization?.name} on{' '}
              {selectedReport?.submitted_at
                ? new Date(selectedReport.submitted_at).toLocaleDateString()
                : 'N/A'}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && selectedReport.data && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Executive Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border rounded p-3">
                    <div className="text-sm text-muted-foreground">Total Risks</div>
                    <div className="text-2xl font-bold">
                      {selectedReport.data.executive_summary?.total_risks || 0}
                    </div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-sm text-muted-foreground">Critical</div>
                    <div className="text-2xl font-bold text-red-600">
                      {selectedReport.data.executive_summary?.critical_risks || 0}
                    </div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-sm text-muted-foreground">High</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedReport.data.executive_summary?.high_risks || 0}
                    </div>
                  </div>
                  <div className="border rounded p-3">
                    <div className="text-sm text-muted-foreground">Risk Reduction</div>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedReport.data.executive_summary?.risk_reduction_percentage || 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Risks by Category */}
              {selectedReport.data.risks?.by_category && (
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
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedReport?.status === 'submitted' && (
              <Button onClick={() => {
                handleApproveReport(selectedReport.id);
                setViewDialogOpen(false);
              }}>
                <ThumbsUp className="h-4 w-4 mr-2" />
                Approve Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
