/**
 * PCIControlsDashboard Component
 *
 * Shows all PCI instances across all risks with effectiveness ranking.
 * Only visible when pci_workflow_enabled is true for the organization.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getRisks } from '@/lib/risks';
import type { Risk } from '@/types/risk';
import type { PCIInstance, DerivedDIMEScore } from '@/types/pci';
import { calculateEffectiveness } from '@/components/pci/EffectivenessDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Gauge,
  Target,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface PCIWithRisk extends PCIInstance {
  risk?: Risk;
  effectiveness: number | null;
}

export default function PCIControlsDashboard() {
  const [pciInstances, setPCIInstances] = useState<PCIWithRisk[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'retired'>('all');
  const [filterObjective, setFilterObjective] = useState<'all' | 'likelihood' | 'impact' | 'both'>('all');
  const [filterEffectiveness, setFilterEffectiveness] = useState<'all' | 'strong' | 'moderate' | 'weak' | 'critical'>('all');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('effectiveness');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Load all PCI instances with DIME scores
      const { data: pciData, error: pciError } = await supabase
        .from('pci_instances')
        .select(`
          *,
          pci_template:pci_templates(id, name, category),
          derived_dime_score:derived_dime_scores(*)
        `)
        .neq('status', 'retired')
        .order('created_at', { ascending: false });

      if (pciError) throw pciError;

      // Load risks
      const { data: risksData, error: risksError } = await getRisks();
      if (risksError) throw risksError;

      setRisks(risksData || []);

      // Map PCI instances with risk data and effectiveness
      const pciWithRisk: PCIWithRisk[] = (pciData || []).map((pci) => {
        const risk = risksData?.find((r) => r.id === pci.risk_id);
        const dimeScore = pci.derived_dime_score as DerivedDIMEScore | null;
        const effectiveness = calculateEffectiveness(dimeScore);

        return {
          ...pci,
          risk,
          effectiveness,
          derived_dime_score: dimeScore,
        };
      });

      setPCIInstances(pciWithRisk);
    } catch (err) {
      console.error('Error loading PCI data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'effectiveness' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const getEffectivenessLevel = (effectiveness: number | null): 'strong' | 'moderate' | 'weak' | 'critical' | null => {
    if (effectiveness === null) return null;
    if (effectiveness >= 75) return 'strong';
    if (effectiveness >= 50) return 'moderate';
    if (effectiveness >= 25) return 'weak';
    return 'critical';
  };

  const getEffectivenessColor = (effectiveness: number | null) => {
    if (effectiveness === null) return 'bg-gray-200';
    if (effectiveness >= 75) return 'bg-green-500';
    if (effectiveness >= 50) return 'bg-yellow-500';
    if (effectiveness >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getEffectivenessTextColor = (effectiveness: number | null) => {
    if (effectiveness === null) return 'text-gray-500';
    if (effectiveness >= 75) return 'text-green-600';
    if (effectiveness >= 50) return 'text-yellow-600';
    if (effectiveness >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  // Filter and sort
  const filteredPCIs = pciInstances
    .filter((pci) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const templateName = pci.pci_template?.name || '';
        const riskCode = pci.risk?.risk_code || '';
        const riskTitle = pci.risk?.risk_title || '';
        if (
          !templateName.toLowerCase().includes(query) &&
          !pci.pci_template_id.toLowerCase().includes(query) &&
          !riskCode.toLowerCase().includes(query) &&
          !riskTitle.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== 'all' && pci.status !== filterStatus) {
        return false;
      }

      // Objective filter
      if (filterObjective !== 'all' && pci.objective !== filterObjective) {
        return false;
      }

      // Effectiveness filter
      if (filterEffectiveness !== 'all') {
        const level = getEffectivenessLevel(pci.effectiveness);
        if (level !== filterEffectiveness) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'template':
          aValue = a.pci_template?.name || a.pci_template_id;
          bValue = b.pci_template?.name || b.pci_template_id;
          break;
        case 'risk':
          aValue = a.risk?.risk_code || '';
          bValue = b.risk?.risk_code || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'objective':
          aValue = a.objective;
          bValue = b.objective;
          break;
        case 'effectiveness':
          aValue = a.effectiveness ?? -1;
          bValue = b.effectiveness ?? -1;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Stats
  const activeControls = pciInstances.filter((p) => p.status === 'active');
  const avgEffectiveness =
    activeControls.length > 0
      ? activeControls
          .filter((p) => p.effectiveness !== null)
          .reduce((sum, p) => sum + (p.effectiveness || 0), 0) /
        activeControls.filter((p) => p.effectiveness !== null).length
      : 0;
  const strongControls = activeControls.filter((p) => (p.effectiveness || 0) >= 75).length;
  const weakControls = activeControls.filter((p) => p.effectiveness !== null && p.effectiveness < 50).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading PCI controls...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">PCI Controls Dashboard</h2>
        <p className="text-gray-600 text-sm mt-1">
          View all Primary Control Instances across risks with effectiveness metrics
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pciInstances.length}</div>
                <div className="text-sm text-gray-600">Total Controls</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${avgEffectiveness >= 50 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Gauge className={`h-5 w-5 ${avgEffectiveness >= 50 ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${getEffectivenessTextColor(avgEffectiveness)}`}>
                  {avgEffectiveness.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Avg. Effectiveness</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{strongControls}</div>
                <div className="text-sm text-gray-600">Strong Controls (75%+)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{weakControls}</div>
                <div className="text-sm text-gray-600">Needs Attention (&lt;50%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search controls or risks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterObjective} onValueChange={(value: any) => setFilterObjective(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Objectives</SelectItem>
                <SelectItem value="likelihood">Likelihood</SelectItem>
                <SelectItem value="impact">Impact</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterEffectiveness} onValueChange={(value: any) => setFilterEffectiveness(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Effectiveness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="strong">Strong (75%+)</SelectItem>
                <SelectItem value="moderate">Moderate (50-74%)</SelectItem>
                <SelectItem value="weak">Weak (25-49%)</SelectItem>
                <SelectItem value="critical">Critical (&lt;25%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Controls Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            PCI Controls ({filteredPCIs.length}
            {filteredPCIs.length !== pciInstances.length && ` of ${pciInstances.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPCIs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-gray-600">
                {searchQuery || filterStatus !== 'all' || filterObjective !== 'all' || filterEffectiveness !== 'all'
                  ? 'No controls match your filters'
                  : 'No PCI controls found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('template')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Control Template {getSortIcon('template')}
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
                        onClick={() => handleSort('status')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Status {getSortIcon('status')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('objective')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Objective {getSortIcon('objective')}
                      </button>
                    </TableHead>
                    <TableHead>DIME Scores</TableHead>
                    <TableHead className="w-[200px]">
                      <button
                        onClick={() => handleSort('effectiveness')}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Effectiveness {getSortIcon('effectiveness')}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPCIs.map((pci) => {
                    const dime = pci.derived_dime_score as DerivedDIMEScore | null;

                    return (
                      <TableRow key={pci.id}>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="font-mono mb-1">
                              {pci.pci_template_id}
                            </Badge>
                            <div className="font-medium text-sm">
                              {pci.pci_template?.name || pci.pci_template_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pci.risk ? (
                            <div className="text-sm">
                              <div className="font-mono">{pci.risk.risk_code}</div>
                              <div className="text-gray-600 text-xs truncate max-w-[200px]">
                                {pci.risk.risk_title}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              pci.status === 'active'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : pci.status === 'draft'
                                ? 'bg-gray-100 text-gray-800 border-gray-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {pci.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              pci.objective === 'likelihood'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : pci.objective === 'impact'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            }
                          >
                            <Target className="h-3 w-3 mr-1" />
                            {pci.objective === 'both' ? 'L+I' : pci.objective}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {dime ? (
                            <div className="flex gap-1 text-xs font-mono">
                              <span>D:{dime.d_score?.toFixed(1) ?? '-'}</span>
                              <span>I:{dime.i_score?.toFixed(1) ?? '-'}</span>
                              <span>M:{dime.m_score?.toFixed(1) ?? '-'}</span>
                              <span>E:{dime.e_final?.toFixed(1) ?? '-'}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not attested</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {pci.effectiveness !== null ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${getEffectivenessColor(pci.effectiveness)} transition-all`}
                                    style={{ width: `${pci.effectiveness}%` }}
                                  />
                                </div>
                                <span className={`text-sm font-medium min-w-[50px] ${getEffectivenessTextColor(pci.effectiveness)}`}>
                                  {pci.effectiveness.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Minus className="h-4 w-4" />
                              <span className="text-sm">Not attested</span>
                            </div>
                          )}
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
    </div>
  );
}
