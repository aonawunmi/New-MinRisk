/**
 * Advanced Risk Heatmap Component
 *
 * Full-featured heatmap with:
 * - Filters (search, division, department, category, owner, status)
 * - Export to PNG/JPEG
 * - Quarter comparison mode
 * - Axis labels
 * - Popover (non-blocking) risk details
 * - SVG arrow visualization for risk migration
 * - Data source toggle (active/history)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, ArrowRight, Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { getRiskLevel, getRiskLevelColor } from '@/lib/analytics';
import { calculateResidualRisk } from '@/lib/controls';
import { getOrganizationConfig, getLikelihoodLabel, getImpactLabel, type OrganizationConfig } from '@/lib/config';
import { getCommittedPeriods, formatPeriod, type Period } from '@/lib/periods-v2';
import { useAuth } from '@/lib/auth';
import type { Risk } from '@/types/risk';

interface AdvancedRiskHeatmapProps {
  matrixSize?: 5 | 6;
}

// Extended Risk type with calculated residual values
interface ProcessedRisk extends Risk {
  likelihood_residual_calc: number;
  impact_residual_calc: number;
  residual_score_calc: number;
}

// Axis labels configuration
const LIKELIHOOD_LABELS_5X5 = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS_5X5 = ['Minimal', 'Low', 'Moderate', 'High', 'Severe'];
const LIKELIHOOD_LABELS_6X6 = ['Very Rare', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS_6X6 = ['Insignificant', 'Minimal', 'Low', 'Moderate', 'High', 'Severe'];

export default function AdvancedRiskHeatmap({
  matrixSize: propMatrixSize,
}: AdvancedRiskHeatmapProps) {
  // Auth
  const { profile } = useAuth();

  // State management
  const [risks, setRisks] = useState<ProcessedRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgConfig, setOrgConfig] = useState<OrganizationConfig | null>(null);

  // Period management (NEW)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [isHistorical, setIsHistorical] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState<string | undefined>();

  // Use matrix size from config if available, otherwise use prop
  const matrixSize = orgConfig?.matrix_size || propMatrixSize || 5;

  // View toggles
  const [showInherent, setShowInherent] = useState(true);
  const [showResidual, setShowResidual] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Export
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Highlighting
  const [highlightedRisk, setHighlightedRisk] = useState<ProcessedRisk | null>(null);

  // Get axis labels from config or use defaults
  const getLikelihoodLabels = (): string[] => {
    if (!orgConfig) {
      return matrixSize === 5 ? LIKELIHOOD_LABELS_5X5 : LIKELIHOOD_LABELS_6X6;
    }
    const labels: string[] = [];
    for (let i = 1; i <= matrixSize; i++) {
      labels.push(getLikelihoodLabel(orgConfig, i));
    }
    return labels;
  };

  const getImpactLabels = (): string[] => {
    if (!orgConfig) {
      return matrixSize === 5 ? IMPACT_LABELS_5X5 : IMPACT_LABELS_6X6;
    }
    const labels: string[] = [];
    for (let i = 1; i <= matrixSize; i++) {
      labels.push(getImpactLabel(orgConfig, i));
    }
    return labels;
  };

  const likelihoodLabels = getLikelihoodLabels();
  const impactLabels = getImpactLabels();

  // Load risks data and config
  useEffect(() => {
    loadConfig();
    if (profile?.organization_id) {
      loadAvailablePeriods();
    }
  }, [profile]);

  // Reload risks when period or matrix size changes
  useEffect(() => {
    loadRisks();
  }, [selectedPeriod, matrixSize]);

  // Load available periods
  async function loadAvailablePeriods() {
    if (!profile?.organization_id) return;

    const { data: committedPeriods, error } = await getCommittedPeriods(profile.organization_id);
    if (error) {
      console.error('Failed to load committed periods:', error);
      return;
    }

    if (committedPeriods && committedPeriods.length > 0) {
      // Sort periods by year and quarter (most recent first)
      const sortedPeriods = [...committedPeriods].sort((a, b) => {
        if (a.period_year !== b.period_year) return b.period_year - a.period_year;
        return b.period_quarter - a.period_quarter;
      });

      // Format periods as strings (e.g., "Q2 2026")
      const periods = sortedPeriods.map((cp) => formatPeriod({ year: cp.period_year, quarter: cp.period_quarter }));

      // Always include "current" as first option
      setAvailablePeriods(['current', ...periods]);
    } else {
      setAvailablePeriods(['current']);
    }
  }

  async function loadConfig() {
    try {
      const { data, error } = await getOrganizationConfig();
      if (error) {
        console.error('Failed to load organization config:', error);
      } else {
        setOrgConfig(data);
      }
    } catch (err) {
      console.error('Unexpected config load error:', err);
    }
  }

  async function loadRisks() {
    setLoading(true);
    setError(null);

    try {
      let rawRisks: any[] = [];
      let historical = false;
      let snapDate: string | undefined;

      // Load from risk_history if period is specified
      if (selectedPeriod && selectedPeriod !== 'current' && profile?.organization_id) {
        // Parse period string (e.g., "Q2 2026" -> {year: 2026, quarter: 2})
        const periodMatch = selectedPeriod.match(/Q(\d+)\s+(\d{4})/);
        if (!periodMatch) {
          throw new Error(`Invalid period format: ${selectedPeriod}`);
        }

        const quarter = parseInt(periodMatch[1]);
        const year = parseInt(periodMatch[2]);

        // Load from risk_history table
        const { data: historyRecords, error: historyError } = await supabase
          .from('risk_history')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .eq('period_year', year)
          .eq('period_quarter', quarter);

        if (historyError) {
          throw new Error(`Failed to load risk history: ${historyError.message}`);
        }

        if (!historyRecords || historyRecords.length === 0) {
          throw new Error(`No risk history found for period ${selectedPeriod}`);
        }

        // Convert risk_history records to risk objects
        rawRisks = historyRecords.map((h: any) => ({
          id: h.risk_id,
          risk_code: h.risk_code,
          risk_title: h.risk_title,
          risk_description: h.risk_description,
          category: h.category,
          division: h.division,
          department: h.department,
          owner: h.owner,
          status: h.status,
          likelihood_inherent: h.likelihood_inherent,
          impact_inherent: h.impact_inherent,
          score_inherent: h.score_inherent,
          residual_likelihood: h.likelihood_residual,
          residual_impact: h.impact_residual,
          residual_score: h.score_residual,
        }));

        historical = true;
        snapDate = historyRecords[0]?.committed_at;
      } else {
        // Load current risks from risks table
        const { data, error: fetchError } = await supabase
          .from('risks')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        rawRisks = data || [];
      }

      setIsHistorical(historical);
      setSnapshotDate(snapDate);

      // Process risks based on whether they're historical or current
      const processed: ProcessedRisk[] = await Promise.all(
        rawRisks.map(async (risk) => {
          if (historical) {
            // For historical snapshots: Use stored residual values (no calculation)
            const resL = risk.residual_likelihood || risk.likelihood_residual || risk.likelihood_inherent;
            const resI = risk.residual_impact || risk.impact_residual || risk.impact_inherent;
            return {
              ...risk,
              likelihood_residual_calc: resL,
              impact_residual_calc: resI,
              residual_score_calc: risk.residual_score || risk.score_residual || (resL * resI),
            };
          } else {
            // For current risks: Calculate residual risk using controls
            const { data: residualData } = await calculateResidualRisk(
              risk.id,
              risk.likelihood_inherent,
              risk.impact_inherent
            );

            return {
              ...risk,
              likelihood_residual_calc: residualData?.residual_likelihood ?? risk.likelihood_inherent,
              impact_residual_calc: residualData?.residual_impact ?? risk.impact_inherent,
              residual_score_calc: residualData?.residual_score ?? (risk.likelihood_inherent * risk.impact_inherent),
            };
          }
        })
      );

      setRisks(processed);
    } catch (err) {
      console.error('Load risks error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load risks');
    } finally {
      setLoading(false);
    }
  }

  // Get unique filter values
  const uniqueValues = useMemo(() => {
    return {
      divisions: Array.from(new Set(risks.map(r => r.division))).filter(Boolean).sort(),
      departments: Array.from(new Set(risks.map(r => r.department))).filter(Boolean).sort(),
      categories: Array.from(new Set(risks.map(r => r.category))).filter(Boolean).sort(),
      owners: Array.from(new Set(risks.map(r => r.owner))).filter(Boolean).sort(),
      statuses: Array.from(new Set(risks.map(r => r.status))).filter(Boolean).sort(),
      periods: Array.from(new Set(risks.map(r => r.period).filter(Boolean))).sort(),
    };
  }, [risks]);

  // Apply all filters
  const filteredRisks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return risks.filter(r => {
      // Search filter
      if (searchQuery && !(
        r.risk_code?.toLowerCase().includes(query) ||
        r.risk_title?.toLowerCase().includes(query) ||
        r.risk_description?.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query) ||
        r.owner?.toLowerCase().includes(query)
      )) return false;

      // Dropdown filters
      if (filterDivision !== 'all' && r.division !== filterDivision) return false;
      if (filterDepartment !== 'all' && r.department !== filterDepartment) return false;
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (filterOwner !== 'all' && r.owner !== filterOwner) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;

      return true;
    });
  }, [risks, searchQuery, filterDivision, filterDepartment, filterCategory, filterOwner, filterStatus]);

  // Build heatmap grid data
  const heatmapData = useMemo(() => {
    const grid: { inherent: ProcessedRisk[], residual: ProcessedRisk[] }[][] =
      Array(matrixSize).fill(0).map(() =>
        Array(matrixSize).fill(0).map(() => ({ inherent: [], residual: [] }))
      );

    filteredRisks.forEach(risk => {
      if (showInherent) {
        const i = risk.impact_inherent - 1;
        const l = risk.likelihood_inherent - 1;
        if (i >= 0 && i < matrixSize && l >= 0 && l < matrixSize) {
          grid[i][l].inherent.push(risk);
        }
      }
      if (showResidual) {
        const i = Math.round(risk.impact_residual_calc) - 1;
        const l = Math.round(risk.likelihood_residual_calc) - 1;
        if (i >= 0 && i < matrixSize && l >= 0 && l < matrixSize) {
          grid[i][l].residual.push(risk);
        }
      }
    });

    return grid;
  }, [filteredRisks, showInherent, showResidual, matrixSize]);

  // Export heatmap
  const handleExport = async () => {
    if (!heatmapRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `risk-heatmap-${timestamp}.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
      }, `image/${exportFormat}`);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  };

  // Get cell center for arrow drawing
  const getCellCenter = (likelihood: number, impact: number, cellSize: number = 80) => {
    const xOffset = 80; // Left axis width
    const yOffset = 60; // Top padding
    const x = xOffset + (likelihood - 1) * cellSize + cellSize / 2;
    const y = yOffset + (matrixSize - impact) * cellSize + cellSize / 2;
    return { x, y };
  };

  // Get bucket color
  const getBucketColor = (likelihood: number, impact: number): string => {
    const score = likelihood * impact;
    const level = getRiskLevel(likelihood, impact);
    return getRiskLevelColor(level);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading heatmap...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        {/* Controls Section */}
        <div className="mb-3 space-y-3">
          {/* Top row: Risk count and view toggles */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Displaying {filteredRisks.length} risk(s)
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showInherent"
                  checked={showInherent}
                  onCheckedChange={(c) => setShowInherent(!!c)}
                />
                <label htmlFor="showInherent" className="text-sm cursor-pointer">
                  Show Inherent
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showResidual"
                  checked={showResidual}
                  onCheckedChange={(c) => setShowResidual(!!c)}
                />
                <label htmlFor="showResidual" className="text-sm cursor-pointer">
                  Show Residual
                </label>
              </div>
            </div>
          </div>

          {/* Period Selector & Status */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">View Period:</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-medium">Current (Live Data)</span>
                    </div>
                  </SelectItem>
                  {availablePeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Historical/Live Indicator */}
            {isHistorical && snapshotDate ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-100 border-amber-300 text-amber-800">
                  <Clock className="h-3 w-3 mr-1" />
                  HISTORICAL
                </Badge>
                <span className="text-xs text-gray-600">
                  As of {new Date(snapshotDate).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <Badge variant="outline" className="bg-green-100 border-green-300 text-green-800">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                LIVE DATA
              </Badge>
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Input
              placeholder="Search risks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />

            <Select value={filterDivision} onValueChange={setFilterDivision}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {uniqueValues.divisions.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueValues.departments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueValues.categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {uniqueValues.owners.map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueValues.statuses.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export and Comparison Controls */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Heatmap'}
              </Button>
              <Select
                value={exportFormat}
                onValueChange={(v: 'png' | 'jpeg') => setExportFormat(v)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>

        {/* Heatmap Grid */}
        <div ref={heatmapRef} className="flex mt-4">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-start pt-8 pr-2">
            {Array.from({ length: matrixSize }, (_, i) => matrixSize - i).map(imp => (
              <div
                key={imp}
                className="h-20 flex items-center justify-center text-xs font-semibold"
              >
                {impactLabels[imp - 1]}
              </div>
            ))}
          </div>

          {/* Main heatmap */}
          <div className="flex-grow relative">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${matrixSize}, 1fr)`,
              }}
            >
              {heatmapData.slice().reverse().map((row, impIndex) =>
                row.map((cell, probIndex) => {
                  const impact = matrixSize - impIndex;
                  const likelihood = probIndex + 1;
                  const bgColor = getBucketColor(likelihood, impact);
                  const allRisksInCell = [
                    ...new Map(
                      [...cell.inherent, ...cell.residual].map(item => [item.risk_code, item])
                    ).values(),
                  ];

                  return (
                    <Popover key={`${likelihood}-${impact}`}>
                      <PopoverTrigger asChild>
                        <div
                          className={`h-20 border flex items-center justify-center p-1 relative cursor-pointer ${
                            highlightedRisk &&
                            ((Math.round(highlightedRisk.likelihood_residual_calc) === likelihood &&
                              Math.round(highlightedRisk.impact_residual_calc) === impact) ||
                              (highlightedRisk.likelihood_inherent === likelihood &&
                                highlightedRisk.impact_inherent === impact))
                              ? 'border-4 border-purple-600 ring-4 ring-purple-300'
                              : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: `${bgColor}E6` }}
                        >
                          <div className="flex gap-2 text-lg font-bold">
                            {showInherent && cell.inherent.length > 0 && (
                              <span className="text-blue-700">{cell.inherent.length}</span>
                            )}
                            {showInherent && showResidual && cell.inherent.length > 0 && cell.residual.length > 0 && (
                              <span className="text-gray-400">/</span>
                            )}
                            {showResidual && cell.residual.length > 0 && (
                              <span className="text-rose-700">{cell.residual.length}</span>
                            )}
                          </div>
                        </div>
                      </PopoverTrigger>
                      {allRisksInCell.length > 0 && (
                        <PopoverContent className="w-96">
                          <div className="font-bold text-sm mb-2">
                            Risks in cell (L:{likelihood}, I:{impact})
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {showInherent && cell.inherent.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-blue-700 mt-2">
                                  Inherent Position
                                </h4>
                                {cell.inherent.map(risk => (
                                  <div key={risk.risk_code} className="border-b">
                                    <button
                                      className={`w-full text-left p-2 text-xs hover:bg-gray-100 ${
                                        highlightedRisk?.risk_code === risk.risk_code
                                          ? 'bg-purple-50'
                                          : ''
                                      }`}
                                      onClick={() => {
                                        if (highlightedRisk?.risk_code === risk.risk_code) {
                                          setHighlightedRisk(null);
                                        } else {
                                          setHighlightedRisk(risk);
                                        }
                                      }}
                                    >
                                      <p className="font-bold">
                                        {risk.risk_code}: {risk.risk_title}
                                      </p>
                                      <p className="text-gray-600 text-xs">
                                        (Residual L: {risk.likelihood_residual_calc.toFixed(1)}, I:{' '}
                                        {risk.impact_residual_calc.toFixed(1)})
                                      </p>
                                      {highlightedRisk?.risk_code === risk.risk_code && (
                                        <p className="text-purple-600 text-xs mt-1">
                                          ✓ Showing migration path
                                        </p>
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {showResidual && cell.residual.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-rose-700 mt-2">
                                  Residual Position
                                </h4>
                                {cell.residual.map(risk => (
                                  <button
                                    key={risk.risk_code}
                                    className={`w-full text-left border-b p-2 text-xs hover:bg-gray-100 ${
                                      highlightedRisk?.risk_code === risk.risk_code
                                        ? 'bg-purple-50'
                                        : ''
                                    }`}
                                    onClick={() => {
                                      if (highlightedRisk?.risk_code === risk.risk_code) {
                                        setHighlightedRisk(null);
                                      } else {
                                        setHighlightedRisk(risk);
                                      }
                                    }}
                                  >
                                    <p className="font-bold">
                                      {risk.risk_code}: {risk.risk_title}
                                    </p>
                                    {highlightedRisk?.risk_code === risk.risk_code && (
                                      <p className="text-purple-600 text-xs mt-1">
                                        ✓ Showing migration path (click again to close)
                                      </p>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  );
                })
              )}
            </div>

            {/* SVG Overlay for migration arrows */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <marker
                  id="arrowhead-green"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#16a34a" />
                </marker>
                <marker
                  id="arrowhead-red"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#dc2626" />
                </marker>
              </defs>

              {/* Draw connection line for highlighted risk */}
              {highlightedRisk && showInherent && showResidual && (
                <>
                  {(() => {
                    const inherentPos = getCellCenter(
                      highlightedRisk.likelihood_inherent,
                      highlightedRisk.impact_inherent
                    );
                    const residualPos = getCellCenter(
                      Math.round(highlightedRisk.likelihood_residual_calc),
                      Math.round(highlightedRisk.impact_residual_calc)
                    );
                    const inherentScore =
                      highlightedRisk.likelihood_inherent * highlightedRisk.impact_inherent;
                    const residualScore = highlightedRisk.residual_score_calc;
                    const isImprovement = residualScore < inherentScore;
                    const lineColor = isImprovement ? '#16a34a' : '#dc2626';
                    const markerUrl = isImprovement
                      ? 'url(#arrowhead-green)'
                      : 'url(#arrowhead-red)';

                    return (
                      <>
                        <line
                          x1={inherentPos.x}
                          y1={inherentPos.y}
                          x2={residualPos.x}
                          y2={residualPos.y}
                          stroke={lineColor}
                          strokeWidth="3"
                          strokeDasharray="5,5"
                          markerEnd={markerUrl}
                        />
                        <circle
                          cx={inherentPos.x}
                          cy={inherentPos.y}
                          r="6"
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <circle
                          cx={residualPos.x}
                          cy={residualPos.y}
                          r="6"
                          fill="#e11d48"
                          stroke="white"
                          strokeWidth="2"
                        />
                      </>
                    );
                  })()}
                </>
              )}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between pl-8 pr-8 mt-2">
              {Array.from({ length: matrixSize }, (_, i) => i + 1).map(lik => (
                <div key={lik} className="w-20 text-center text-xs font-semibold">
                  {likelihoodLabels[lik - 1]}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend for migration visualization */}
        {highlightedRisk && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm font-semibold mb-2">Legend:</div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                <span>Inherent Position</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-rose-600 border-2 border-white"></div>
                <span>Residual Position</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-green-600"></div>
                <span>Risk Improved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-600"></div>
                <span>Risk Worsened</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
