/**
 * ControlRegister Component
 *
 * Main control register view showing all controls with filtering and CRUD operations
 */

import { useState, useEffect } from 'react';
import { getAllControls, createControl, updateControl, deleteControl, calculateControlEffectiveness } from '@/lib/controls';
import { getRisks } from '@/lib/risks';
import { getCurrentProfileId } from '@/lib/auth';
import type { Control } from '@/types/control';
import type { Risk } from '@/types/risk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Search, Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ControlForm from './ControlForm';

export default function ControlRegister() {
  const [controls, setControls] = useState<Control[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingControl, setEditingControl] = useState<Control | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTarget, setFilterTarget] = useState<'all' | 'Likelihood' | 'Impact'>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadData();
    loadCurrentProfile();
  }, []);

  async function loadCurrentProfile() {
    const profileId = await getCurrentProfileId();
    setCurrentProfileId(profileId);
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Load controls
      const { data: controlsData, error: controlsError } = await getAllControls();
      if (controlsError) throw controlsError;

      // Load risks for filtering
      const { data: risksData, error: risksError } = await getRisks();
      if (risksError) throw risksError;

      setControls(controlsData || []);
      setRisks(risksData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: Partial<Control>) {
    try {
      if (editingControl) {
        // Update existing control
        const { error } = await updateControl(editingControl.id, data);
        if (error) throw error;
      } else {
        // Create new control
        if (!data.risk_id) {
          alert('Please select a risk for this control');
          return;
        }
        const { error } = await createControl(data as any);
        if (error) throw error;
      }

      await loadData();
      setShowForm(false);
      setEditingControl(null);
    } catch (err) {
      console.error('Error saving control:', err);
      alert(err instanceof Error ? err.message : 'Failed to save control');
    }
  }

  async function handleDelete(control: Control) {
    if (!confirm(`Delete control "${control.name}"?`)) return;

    try {
      const { error } = await deleteControl(control.id);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Error deleting control:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete control');
    }
  }

  function handleEdit(control: Control) {
    setEditingControl(control);
    setShowForm(true);
  }

  function handleAddNew() {
    setEditingControl(null);
    setShowForm(true);
  }

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

  // Filter and sort controls
  const filteredControls = controls
    .filter((control) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        control.name.toLowerCase().includes(query) ||
        control.control_code.toLowerCase().includes(query) ||
        control.description?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Target filter
    if (filterTarget !== 'all' && control.target !== filterTarget) {
      return false;
    }

    // Risk filter
    if (filterRisk !== 'all' && control.risk_id !== filterRisk) {
      return false;
    }

    return true;
  })
  .sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'code':
        aValue = a.control_code || '';
        bValue = b.control_code || '';
        break;
      case 'risk':
        const aRisk = risks.find(r => r.id === a.risk_id);
        const bRisk = risks.find(r => r.id === b.risk_id);
        aValue = aRisk?.risk_code || '';
        bValue = bRisk?.risk_code || '';
        break;
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'type':
        aValue = a.control_type || '';
        bValue = b.control_type || '';
        break;
      case 'target':
        aValue = a.target || '';
        bValue = b.target || '';
        break;
      case 'effectiveness':
        aValue = calculateControlEffectiveness(
          a.design_score,
          a.implementation_score,
          a.monitoring_score,
          a.evaluation_score
        );
        bValue = calculateControlEffectiveness(
          b.design_score,
          b.implementation_score,
          b.monitoring_score,
          b.evaluation_score
        );
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness === 0) return 'bg-gray-400';
    if (effectiveness < 0.33) return 'bg-red-500';
    if (effectiveness < 0.67) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getEffectivenessLabel = (effectiveness: number) => {
    if (effectiveness === 0) return 'None';
    if (effectiveness < 0.33) return 'Weak';
    if (effectiveness < 0.67) return 'Adequate';
    return 'Strong';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading controls...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Control Register</h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage all risk controls with DIME framework assessment
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Control
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search controls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterTarget} onValueChange={(value: any) => setFilterTarget(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="Likelihood">Likelihood</SelectItem>
                <SelectItem value="Impact">Impact</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                {risks.map((risk) => (
                  <SelectItem key={risk.id} value={risk.id}>
                    {risk.risk_code} - {risk.risk_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{controls.length}</div>
            <div className="text-sm text-gray-600">Total Controls</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {controls.filter((c) => c.target === 'Likelihood').length}
            </div>
            <div className="text-sm text-gray-600">Targeting Likelihood</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {controls.filter((c) => c.target === 'Impact').length}
            </div>
            <div className="text-sm text-gray-600">Targeting Impact</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {
                controls.filter((c) => {
                  const eff = calculateControlEffectiveness(
                    c.design_score,
                    c.implementation_score,
                    c.monitoring_score,
                    c.evaluation_score
                  );
                  return eff >= 0.67;
                }).length
              }
            </div>
            <div className="text-sm text-gray-600">Strong Controls</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Controls ({filteredControls.length}{filteredControls.length !== controls.length && ` of ${controls.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredControls.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {searchQuery || filterTarget !== 'all' || filterRisk !== 'all'
                  ? 'No controls match your filters'
                  : 'No controls yet'}
              </p>
              {!searchQuery && filterTarget === 'all' && filterRisk === 'all' && (
                <Button className="mt-4" onClick={handleAddNew}>
                  Add First Control
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                        onClick={() => handleSort('name')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Name {getSortIcon('name')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('risk')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Risk {getSortIcon('risk')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('type')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Type {getSortIcon('type')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('target')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Target {getSortIcon('target')}
                      </button>
                    </TableHead>
                    <TableHead>DIME Scores</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('effectiveness')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Effectiveness {getSortIcon('effectiveness')}
                      </button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredControls.map((control) => {
                    const risk = risks.find((r) => r.id === control.risk_id);
                    const effectiveness = calculateControlEffectiveness(
                      control.design_score,
                      control.implementation_score,
                      control.monitoring_score,
                      control.evaluation_score
                    );

                    return (
                      <TableRow key={control.id}>
                        <TableCell className="font-mono text-sm">
                          {control.control_code}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="font-medium">{control.name}</div>
                            {control.description && (
                              <div className="text-sm text-gray-600 truncate">
                                {control.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {risk ? (
                            <div className="text-sm">
                              <div className="font-mono">{risk.risk_code}</div>
                              <div className="text-gray-600 text-xs truncate max-w-xs">
                                {risk.risk_title}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {control.control_type ? (
                            <Badge variant="outline" className="capitalize">
                              {control.control_type}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={control.target === 'Likelihood' ? 'default' : 'secondary'}
                          >
                            {control.target}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <span className="text-xs font-mono">
                              D:{control.design_score ?? '-'}
                            </span>
                            <span className="text-xs font-mono">
                              I:{control.implementation_score ?? '-'}
                            </span>
                            <span className="text-xs font-mono">
                              M:{control.monitoring_score ?? '-'}
                            </span>
                            <span className="text-xs font-mono">
                              E:{control.evaluation_score ?? '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${getEffectivenessColor(
                                effectiveness
                              )}`}
                            />
                            <span className="text-sm">
                              {(effectiveness * 100).toFixed(0)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ({getEffectivenessLabel(effectiveness)})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {/* Only control owner can edit/delete */}
                            {control.created_by_profile_id === currentProfileId ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(control)}
                                  title="Edit control"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(control)}
                                  title="Delete control"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(control)}
                                title="View control (read-only)"
                                className="text-gray-600"
                              >
                                View
                              </Button>
                            )}
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

      {/* Control Form Dialog */}
      <ControlForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingControl(null);
        }}
        onSave={handleSave}
        editingControl={editingControl}
        availableRisks={risks.map((r) => ({
          id: r.id,
          risk_code: r.risk_code,
          risk_title: r.risk_title,
        }))}
        isReadOnly={editingControl !== null && editingControl.created_by_profile_id !== currentProfileId}
      />
    </div>
  );
}
