/**
 * RiskRegister Component
 *
 * Risk register table with CRUD operations.
 * Clean implementation using new risk management system.
 * UI pattern referenced from old RiskRegisterTab.
 */

import { useState, useEffect } from 'react';
import { getRisks, deleteRisk, updateRisk } from '@/lib/risks';
import { calculateResidualRisk } from '@/lib/controls';
import { getActivePeriod as getActivePeriodV2, formatPeriod, type Period } from '@/lib/periods-v2';
import { getKRIsForRisk, type KRIDefinition } from '@/lib/kri';
import { getIncidentsForRisk } from '@/lib/incidents';
import { getOrganizationConfig, getLikelihoodLabel, getImpactLabel, type OrganizationConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { Risk } from '@/types/risk';
import type { ResidualRisk } from '@/types/control';
import RiskForm from './RiskForm';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertCircle, RefreshCw, Star, Archive, ArrowUpDown, ArrowUp, ArrowDown, Activity, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RiskRegister() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [showPriorityOnly, setShowPriorityOnly] = useState(false);
  const [selectedOwnerEmail, setSelectedOwnerEmail] = useState<string>('all');
  const [residualRisks, setResidualRisks] = useState<Map<string, ResidualRisk>>(new Map());
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [kriCounts, setKriCounts] = useState<Map<string, number>>(new Map());
  const [showKRIDialog, setShowKRIDialog] = useState(false);
  const [selectedRiskKRIs, setSelectedRiskKRIs] = useState<{ risk: Risk; kris: any[] } | null>(null);
  const [incidentCounts, setIncidentCounts] = useState<Map<string, number>>(new Map());
  const [showIncidentsDialog, setShowIncidentsDialog] = useState(false);
  const [selectedRiskIncidents, setSelectedRiskIncidents] = useState<{ risk: Risk; incidents: any[] } | null>(null);
  const [orgConfig, setOrgConfig] = useState<OrganizationConfig | null>(null);

  // Bulk delete state
  const [selectedRiskIds, setSelectedRiskIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadRisks = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getRisks();

      if (fetchError) {
        setError(fetchError.message);
        console.error('Failed to load risks:', fetchError);
      } else {
        setRisks(data || []);
        console.log('Risks loaded:', data?.length || 0);

        // Stop loading immediately so table displays
        setLoading(false);

        // Load residual risks and KRI counts in background (non-blocking)
        if (data && data.length > 0) {
          loadRiskMetadata(data);
        }
      }
    } catch (err) {
      console.error('Unexpected error loading risks:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const loadRiskMetadata = async (risks: Risk[]) => {
    const residualMap = new Map<string, ResidualRisk>();
    const kriCountMap = new Map<string, number>();
    const incidentCountMap = new Map<string, number>();

    // Fetch all residual risks, KRI counts, and incident counts in parallel
    const promises = risks.map(async (risk) => {
      const [residualResult, krisResult, incidentsResult] = await Promise.all([
        calculateResidualRisk(
          risk.id,
          risk.likelihood_inherent,
          risk.impact_inherent
        ),
        getKRIsForRisk(risk.risk_code),
        getIncidentsForRisk(risk.id),
      ]);

      return {
        riskId: risk.id,
        residual: residualResult.data,
        kriCount: krisResult.data?.length || 0,
        incidentCount: incidentsResult.data?.length || 0,
      };
    });

    const results = await Promise.all(promises);

    // Populate maps
    results.forEach(({ riskId, residual, kriCount, incidentCount }) => {
      if (residual) {
        residualMap.set(riskId, residual);
      }
      kriCountMap.set(riskId, kriCount);
      incidentCountMap.set(riskId, incidentCount);
    });

    setResidualRisks(residualMap);
    setKriCounts(kriCountMap);
    setIncidentCounts(incidentCountMap);
  };

  useEffect(() => {
    loadActivePeriodData();
    loadRisks();
    checkAdminRole();
    loadConfig();
  }, []);

  async function loadActivePeriodData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    const { data } = await getActivePeriodV2(profile.organization_id);
    if (data) {
      setActivePeriod({
        year: data.current_period_year,
        quarter: data.current_period_quarter,
      });
    }
  }

  async function checkAdminRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Check if user has any admin role (primary_admin, secondary_admin, or super_admin)
      const isAdminRole = profile?.role && ['super_admin', 'primary_admin', 'secondary_admin'].includes(profile.role);
      setIsAdmin(!!isAdminRole);
    } catch (err) {
      console.error('Error checking admin role:', err);
    }
  }

  async function loadConfig() {
    try {
      const { data, error: configError } = await getOrganizationConfig();
      if (configError) {
        console.error('Failed to load organization config:', configError);
      } else {
        setOrgConfig(data);
      }
    } catch (err) {
      console.error('Unexpected config load error:', err);
    }
  }

  async function handlePriorityToggle(risk: Risk, checked: boolean) {
    try {
      const { error } = await updateRisk({
        id: risk.id,
        is_priority: checked,
      });

      if (error) {
        alert('Failed to update priority: ' + error.message);
        console.error('Priority update error:', error);
      } else {
        // Update local state
        setRisks((prev) =>
          prev.map((r) => (r.id === risk.id ? { ...r, is_priority: checked } : r))
        );
      }
    } catch (err) {
      console.error('Unexpected priority update error:', err);
      alert('An unexpected error occurred');
    }
  }

  async function handleBulkPriorityToggle(checked: boolean) {
    try {
      // Update all filtered risks
      const updates = filteredRisks.map((risk) =>
        updateRisk({
          id: risk.id,
          is_priority: checked,
        })
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        alert(`Failed to update ${errors.length} risks`);
        console.error('Bulk priority update errors:', errors);
      }

      // Reload to ensure consistency
      await loadRisks();
    } catch (err) {
      console.error('Unexpected bulk priority update error:', err);
      alert('An unexpected error occurred');
    }
  }

  const handleDelete = async (riskId: string, riskCode: string) => {
    if (!confirm(`Delete risk ${riskCode}? This cannot be undone.`)) return;

    try {
      const { error: deleteError } = await deleteRisk(riskId);

      if (deleteError) {
        alert('Failed to delete risk: ' + deleteError.message);
        console.error('Delete error:', deleteError);
      } else {
        console.log('Risk deleted:', riskId);
        // Reload risks after deletion
        await loadRisks();
      }
    } catch (err) {
      console.error('Unexpected delete error:', err);
      alert('An unexpected error occurred during deletion');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRiskIds.size === 0) {
      alert('Please select risks to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedRiskIds.size} risk(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setBulkDeleting(true);
    try {
      let successCount = 0;
      let failCount = 0;

      // Delete each selected risk
      for (const riskId of selectedRiskIds) {
        const { error: deleteError } = await deleteRisk(riskId);
        if (deleteError) {
          console.error('Failed to delete risk:', riskId, deleteError);
          failCount++;
        } else {
          successCount++;
        }
      }

      // Show result
      if (failCount > 0) {
        alert(`Deleted ${successCount} risk(s). Failed to delete ${failCount} risk(s).`);
      } else {
        alert(`Successfully deleted ${successCount} risk(s).`);
      }

      // Clear selection and reload
      setSelectedRiskIds(new Set());
      await loadRisks();
    } catch (err) {
      console.error('Unexpected bulk delete error:', err);
      alert('An unexpected error occurred during bulk deletion');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredRisks.map((r) => r.id));
      setSelectedRiskIds(allIds);
    } else {
      setSelectedRiskIds(new Set());
    }
  };

  const handleSelectRisk = (riskId: string, checked: boolean) => {
    const newSelection = new Set(selectedRiskIds);
    if (checked) {
      newSelection.add(riskId);
    } else {
      newSelection.delete(riskId);
    }
    setSelectedRiskIds(newSelection);
  };

  const getRiskScore = (likelihood: number, impact: number) => likelihood * impact;

  const getRiskLevel = (score: number): string => {
    if (score >= 15) return 'Critical';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  };

  const getRiskLevelColor = (score: number): string => {
    if (score >= 15) return 'text-red-600 font-bold';
    if (score >= 10) return 'text-orange-600 font-semibold';
    if (score >= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleAddRisk = () => {
    setEditingRisk(null);
    setFormOpen(true);
  };

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk(risk);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadRisks();
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleKRIClick = async (risk: Risk) => {
    try {
      const { data: krisData, error } = await getKRIsForRisk(risk.risk_code);

      if (error) {
        alert('Failed to load KRIs: ' + error.message);
        return;
      }

      setSelectedRiskKRIs({ risk, kris: krisData || [] });
      setShowKRIDialog(true);
    } catch (err) {
      console.error('Error loading KRIs:', err);
      alert('An unexpected error occurred');
    }
  };

  const handleIncidentClick = async (risk: Risk) => {
    try {
      const { data: incidentsData, error } = await getIncidentsForRisk(risk.id);

      if (error) {
        alert('Failed to load incidents: ' + error.message);
        return;
      }

      setSelectedRiskIncidents({ risk, incidents: incidentsData || [] });
      setShowIncidentsDialog(true);
    } catch (err) {
      console.error('Error loading incidents:', err);
      alert('An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Loading risks...</p>
        </div>
      </div>
    );
  }

  // Get unique owner emails for filter dropdown (admin only)
  const uniqueOwnerEmails = Array.from(new Set(risks.map(r => r.owner_email).filter(Boolean))).sort();

  // Filter and sort risks
  const filteredRisks = risks
    .filter((risk) => {
      // Priority filter
      if (showPriorityOnly && !risk.is_priority) {
        return false;
      }

      // Owner filter (admin only)
      if (selectedOwnerEmail !== 'all' && risk.owner_email !== selectedOwnerEmail) {
        return false;
      }

      // No period filter needed - continuous model shows all risks

      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'code':
          aValue = a.risk_code || '';
          bValue = b.risk_code || '';
          break;
        case 'title':
          aValue = a.risk_title || '';
          bValue = b.risk_title || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'owner':
          aValue = a.owner || '';
          bValue = b.owner || '';
          break;
        case 'owner_email':
          aValue = a.owner_email || '';
          bValue = b.owner_email || '';
          break;
        case 'period':
          aValue = a.period || '';
          bValue = b.period || '';
          break;
        case 'inherent':
          aValue = a.likelihood_inherent * a.impact_inherent;
          bValue = b.likelihood_inherent * b.impact_inherent;
          break;
        case 'residual':
          const aResidual = residualRisks.get(a.id);
          const bResidual = residualRisks.get(b.id);
          aValue = aResidual ? Math.round(aResidual.residual_score) : a.likelihood_inherent * a.impact_inherent;
          bValue = bResidual ? Math.round(bResidual.residual_score) : b.likelihood_inherent * b.impact_inherent;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Current Period Banner */}
            {activePeriod && (
              <Alert className="border-blue-500 bg-blue-50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div className="font-medium text-blue-900">
                    Current Period: {formatPeriod(activePeriod)}
                  </div>
                </div>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Risk Register</CardTitle>
                <CardDescription>
                  Manage risks continuously across all periods
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedRiskIds.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedRiskIds.size})`}
                  </Button>
                )}
                <Button onClick={handleAddRisk}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Risk
                </Button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={showPriorityOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowPriorityOnly(!showPriorityOnly)}
              >
                {showPriorityOnly ? 'Show All Risks' : 'Priority Only'}
              </Button>

              {/* Owner Filter (Admin only) */}
              {isAdmin && uniqueOwnerEmails.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Owner:</label>
                  <Select value={selectedOwnerEmail} onValueChange={setSelectedOwnerEmail}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="All Owners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {uniqueOwnerEmails.map((email) => (
                        <SelectItem key={email} value={email}>
                          {email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="text-sm text-gray-600 ml-auto">
                Showing {filteredRisks.length} of {risks.length} risks
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {risks.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No risks yet
              </h3>
              <p className="text-gray-600 mb-4">
                Get started by adding your first risk
              </p>
              <Button onClick={handleAddRisk}>
                <Plus className="h-4 w-4 mr-2" />
                Add Risk
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={filteredRisks.length > 0 && filteredRisks.every((r) => selectedRiskIds.has(r.id))}
                        onCheckedChange={handleSelectAll}
                        title="Select all risks"
                      />
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('code')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Code {getSortIcon('code')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('title')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Title {getSortIcon('title')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('category')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Category {getSortIcon('category')}
                      </button>
                    </TableHead>
                    {isAdmin && (
                      <TableHead>
                        <button
                          onClick={() => handleSort('owner_email')}
                          className="flex items-center hover:text-gray-900 transition-colors"
                        >
                          Owner {getSortIcon('owner_email')}
                        </button>
                      </TableHead>
                    )}
                    <TableHead className="text-center">
                      <button
                        onClick={() => handleSort('created')}
                        className="flex items-center justify-center hover:text-gray-900 transition-colors mx-auto"
                      >
                        Created {getSortIcon('created')}
                      </button>
                    </TableHead>
                    <TableHead className="text-center" colSpan={3}>Inherent</TableHead>
                    <TableHead className="text-center" colSpan={3}>Residual</TableHead>
                    <TableHead className="text-center">KRIs</TableHead>
                    <TableHead className="text-center">Incidents</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Status {getSortIcon('status')}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead colSpan={isAdmin ? 6 : 5}></TableHead>
                    <TableHead className="text-center text-xs w-12">L</TableHead>
                    <TableHead className="text-center text-xs w-12">I</TableHead>
                    <TableHead className="text-center text-xs w-16">
                      <button
                        onClick={() => handleSort('inherent')}
                        className="flex items-center justify-center hover:text-gray-900 transition-colors mx-auto"
                      >
                        L×I {getSortIcon('inherent')}
                      </button>
                    </TableHead>
                    <TableHead className="text-center text-xs w-12">L</TableHead>
                    <TableHead className="text-center text-xs w-12">I</TableHead>
                    <TableHead className="text-center text-xs w-16">
                      <button
                        onClick={() => handleSort('residual')}
                        className="flex items-center justify-center hover:text-gray-900 transition-colors mx-auto"
                      >
                        L×I {getSortIcon('residual')}
                      </button>
                    </TableHead>
                    <TableHead className="text-center text-xs w-16">Count</TableHead>
                    <TableHead className="text-center text-xs w-16">Count</TableHead>
                    <TableHead colSpan={2}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.map((risk) => {
                    const inherentScore = getRiskScore(
                      risk.likelihood_inherent,
                      risk.impact_inherent
                    );
                    const inherentLevel = getRiskLevel(inherentScore);
                    const inherentLevelColor = getRiskLevelColor(inherentScore);

                    // Get residual risk
                    const residual = residualRisks.get(risk.id);
                    const residualScore = residual
                      ? Math.round(residual.residual_score)
                      : inherentScore;
                    const residualLevel = getRiskLevel(residualScore);
                    const residualLevelColor = getRiskLevelColor(residualScore);

                    return (
                      <TableRow key={risk.id}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedRiskIds.has(risk.id)}
                            onCheckedChange={(checked) =>
                              handleSelectRisk(risk.id, checked === true)
                            }
                            title="Select for deletion"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {risk.risk_code}
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-normal break-words text-xs">
                          {risk.risk_title}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-xs">{risk.category}</TableCell>
                        {isAdmin && (
                          <TableCell className="max-w-[200px] whitespace-normal break-words text-xs">
                            {risk.owner_email || <span className="text-gray-400 italic">No email</span>}
                          </TableCell>
                        )}
                        <TableCell className="text-center text-xs text-gray-600">
                          {risk.created_period_year && risk.created_period_quarter
                            ? `Q${risk.created_period_quarter} ${risk.created_period_year}`
                            : '-'}
                        </TableCell>
                        {/* Inherent Likelihood - Show number with label in tooltip */}
                        <TableCell className="text-center text-xs font-medium" title={getLikelihoodLabel(orgConfig, risk.likelihood_inherent)}>
                          {risk.likelihood_inherent}
                        </TableCell>
                        {/* Inherent Impact - Show number with label in tooltip */}
                        <TableCell className="text-center text-xs font-medium" title={getImpactLabel(orgConfig, risk.impact_inherent)}>
                          {risk.impact_inherent}
                        </TableCell>
                        {/* Inherent Score with Level color */}
                        <TableCell className={`text-center text-xs font-semibold ${inherentLevelColor}`} title={`${inherentLevel} Risk`}>
                          {inherentScore}
                        </TableCell>
                        {/* Residual Likelihood - Show number with label in tooltip */}
                        <TableCell className="text-center text-xs font-medium" title={residual ? getLikelihoodLabel(orgConfig, residual.residual_likelihood) : 'No controls applied'}>
                          {residual ? residual.residual_likelihood : '-'}
                        </TableCell>
                        {/* Residual Impact - Show number with label in tooltip */}
                        <TableCell className="text-center text-xs font-medium" title={residual ? getImpactLabel(orgConfig, residual.residual_impact) : 'No controls applied'}>
                          {residual ? residual.residual_impact : '-'}
                        </TableCell>
                        {/* Residual Score with Level color */}
                        <TableCell className={`text-center text-xs font-semibold ${residualLevelColor}`} title={`${residualLevel} Risk`}>
                          {residualScore}
                        </TableCell>
                        <TableCell className="text-center">
                          {kriCounts.get(risk.id) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleKRIClick(risk)}
                              className="h-7 px-2 hover:bg-blue-50"
                            >
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                <Activity className="h-3 w-3 mr-1" />
                                {kriCounts.get(risk.id)}
                              </Badge>
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {incidentCounts.get(risk.id) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleIncidentClick(risk)}
                              className="h-7 px-2 hover:bg-orange-50"
                            >
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {incidentCounts.get(risk.id)}
                              </Badge>
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              risk.status === 'OPEN'
                                ? 'bg-green-100 text-green-800'
                                : risk.status === 'MONITORING'
                                ? 'bg-blue-100 text-blue-800'
                                : risk.status === 'CLOSED'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {risk.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRisk(risk)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDelete(risk.id, risk.risk_code)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Total risks: <span className="font-semibold">{risks.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={loadRisks}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <RiskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        editingRisk={editingRisk}
      />

      {/* KRI Details Dialog */}
      <Dialog open={showKRIDialog} onOpenChange={setShowKRIDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              KRIs for Risk: {selectedRiskKRIs?.risk.risk_code} - {selectedRiskKRIs?.risk.risk_title}
            </DialogTitle>
          </DialogHeader>

          {selectedRiskKRIs && selectedRiskKRIs.kris.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No KRIs linked to this risk
            </div>
          ) : (
            <div className="space-y-4">
              {selectedRiskKRIs?.kris.map((link: any) => {
                const kri = link.kri_definitions;
                return (
                  <Card key={link.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">KRI Code</p>
                          <p className="text-lg font-semibold">{kri.kri_code}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">KRI Name</p>
                          <p className="text-lg font-semibold">{kri.kri_name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Category</p>
                          <p>{kri.category || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Type</p>
                          <Badge variant="outline">{kri.indicator_type || 'Not specified'}</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Unit of Measure</p>
                          <p>{kri.measurement_unit || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Frequency</p>
                          <p>{kri.collection_frequency || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-500">Description</p>
                          <p className="text-sm text-gray-700">{kri.description || 'No description'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Target Value</p>
                          <p>{kri.target_value !== null ? kri.target_value : '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Thresholds</p>
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-yellow-500">Yellow</Badge>
                              <span>{kri.lower_threshold || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-red-500">Red</Badge>
                              <span>{kri.upper_threshold || '-'}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Data Source</p>
                          <p className="text-sm">{kri.data_source || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Responsible User</p>
                          <p className="text-sm">{kri.responsible_user || '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowKRIDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incidents Details Dialog */}
      <Dialog open={showIncidentsDialog} onOpenChange={setShowIncidentsDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Incidents for Risk: {selectedRiskIncidents?.risk.risk_code} - {selectedRiskIncidents?.risk.risk_title}
            </DialogTitle>
          </DialogHeader>

          {selectedRiskIncidents && selectedRiskIncidents.incidents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No incidents linked to this risk
            </div>
          ) : (
            <div className="space-y-4">
              {selectedRiskIncidents?.incidents.map((link: any) => {
                const incident = link.incidents;
                const getSeverityColor = (sev: number) => {
                  switch (sev) {
                    case 1: return 'bg-blue-100 text-blue-800';
                    case 2: return 'bg-yellow-100 text-yellow-800';
                    case 3: return 'bg-orange-100 text-orange-800';
                    case 4: return 'bg-red-100 text-red-800';
                    default: return 'bg-gray-100 text-gray-800';
                  }
                };
                const getSeverityText = (sev: number) => {
                  switch (sev) {
                    case 1: return 'LOW';
                    case 2: return 'MEDIUM';
                    case 3: return 'HIGH';
                    case 4: return 'CRITICAL';
                    default: return 'UNKNOWN';
                  }
                };
                const getLinkTypeColor = (linkType: string) => {
                  switch (linkType) {
                    case 'PRIMARY': return 'bg-red-100 text-red-800';
                    case 'SECONDARY': return 'bg-yellow-100 text-yellow-800';
                    case 'CONTRIBUTORY': return 'bg-orange-100 text-orange-800';
                    case 'ASSOCIATED': return 'bg-blue-100 text-blue-800';
                    default: return 'bg-gray-100 text-gray-800';
                  }
                };

                return (
                  <Card key={link.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Header with incident code and severity */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-lg">{incident.incident_code}</span>
                            <Badge className={getSeverityColor(incident.severity)}>
                              {getSeverityText(incident.severity)}
                            </Badge>
                            <Badge className={getLinkTypeColor(link.link_type)}>
                              {link.link_type}
                            </Badge>
                          </div>
                          <Badge variant="outline">{incident.resolution_status}</Badge>
                        </div>

                        {/* Title */}
                        <div>
                          <h4 className="font-semibold text-lg">{incident.title}</h4>
                        </div>

                        {/* Grid of details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Incident Type</p>
                            <p className="text-sm">{incident.incident_type || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Incident Date</p>
                            <p className="text-sm">
                              {incident.incident_date
                                ? new Date(incident.incident_date).toLocaleDateString()
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Financial Impact</p>
                            <p className="text-sm">
                              {incident.financial_impact
                                ? `₦${Number(incident.financial_impact).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Mapping Source</p>
                            <p className="text-sm">{link.mapping_source || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Classification Confidence</p>
                            <p className="text-sm">{link.classification_confidence}%</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Linked At</p>
                            <p className="text-sm">
                              {link.linked_at
                                ? new Date(link.linked_at).toLocaleDateString()
                                : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-sm font-medium text-gray-500">Description</p>
                          <p className="text-sm text-gray-700 mt-1">{incident.description || 'No description'}</p>
                        </div>

                        {/* Notes if available */}
                        {link.notes && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Mapping Notes</p>
                            <p className="text-sm text-gray-700 italic mt-1">"{link.notes}"</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowIncidentsDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
