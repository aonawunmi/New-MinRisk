/**
 * SEC Sector Analytics Component
 *
 * Cross-firm analytics for the SEC regulator comparing risk profiles
 * across all CMOs by SEC standard category. Includes:
 *
 * 1. Aggregate Heatmap: SEC Categories x All CMOs
 * 2. Category Averages Cards (per SEC category)
 * 3. Outlier Detection (statistical z-score flagging)
 * 4. Sector Summary Statistics
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getSecStandardCategories, type SecStandardCategory } from '@/lib/sec-categories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BarChart3, AlertTriangle, TrendingUp, Building2, AlertCircle, RefreshCw, Shield } from 'lucide-react';

// ============================================
// Types
// ============================================

interface SECSectorAnalyticsProps {
  regulatorId: string;
}

/** Per-firm, per-SEC-category aggregated data */
interface FirmCategoryData {
  riskCount: number;
  avgRating: number;       // avg of (likelihood * impact) across risks in this cell
  criticalCount: number;
  highCount: number;
}

/** Full row of data for a single CMO */
interface FirmRow {
  organizationId: string;
  organizationName: string;
  institutionType: string | null;
  categories: Record<string, FirmCategoryData>; // keyed by SEC category code
  totalRisks: number;
}

/** Category-level sector averages */
interface CategoryAverage {
  code: string;
  name: string;
  avgRating: number;
  totalRisks: number;
  criticalCount: number;
  highCount: number;
  firmCount: number; // how many firms have data in this category
}

/** A detected outlier row */
interface OutlierRow {
  organizationName: string;
  categoryCode: string;
  categoryName: string;
  rating: number;
  sectorAvg: number;
  stdDev: number;
  deviation: number;   // how many std devs away
  status: 'Above' | 'Below';
}

/** Summary statistics */
interface SectorSummary {
  totalCMOs: number;
  totalRisks: number;
  highestRiskCategory: string;
  mostAtRiskFirm: string;
  complianceRate: number; // percentage of firms with all 5 SEC categories mapped
}

// ============================================
// Constants
// ============================================

const SEC_CATEGORY_ORDER = ['STRATEGIC', 'MARKET', 'REGULATORY', 'OPERATIONAL', 'IT_CYBER'];

const SEC_CATEGORY_SHORT_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  MARKET: 'Market',
  REGULATORY: 'Regulatory',
  OPERATIONAL: 'Operational',
  IT_CYBER: 'IT/Cyber',
};

const OUTLIER_THRESHOLD = 1.5; // standard deviations

// ============================================
// Helper Functions
// ============================================

/** Color for heatmap cell based on average rating */
function getHeatmapCellStyle(avgRating: number, hasData: boolean): string {
  if (!hasData) return 'bg-gray-100 text-gray-400';
  if (avgRating >= 16) return 'bg-red-500 text-white';
  if (avgRating >= 12) return 'bg-orange-400 text-white';
  if (avgRating >= 6) return 'bg-yellow-300 text-yellow-900';
  return 'bg-green-400 text-green-900';
}

/** Calculate mean of an array */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Calculate population standard deviation */
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => (v - avg) ** 2);
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  return Math.sqrt(variance);
}

// ============================================
// Component
// ============================================

export default function SECSectorAnalytics({ regulatorId }: SECSectorAnalyticsProps) {
  const [secCategories, setSecCategories] = useState<SecStandardCategory[]>([]);
  const [firmRows, setFirmRows] = useState<FirmRow[]>([]);
  const [categoryAverages, setCategoryAverages] = useState<CategoryAverage[]>([]);
  const [outliers, setOutliers] = useState<OutlierRow[]>([]);
  const [sectorSummary, setSectorSummary] = useState<SectorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------
  // Data Loading
  // ------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Load SEC standard categories
      const { data: cats, error: catError } = await getSecStandardCategories();
      if (catError) throw catError;
      if (!cats || cats.length === 0) throw new Error('No SEC standard categories found');
      setSecCategories(cats);

      // Build lookup: sec_category_id -> code
      const catIdToCode = new Map<string, string>();
      const catCodeToName = new Map<string, string>();
      for (const c of cats) {
        catIdToCode.set(c.id, c.code);
        catCodeToName.set(c.code, c.name);
      }

      // 2. Get all organizations assigned to this regulator
      const { data: orgData, error: orgError } = await supabase
        .from('organization_regulators')
        .select('organization:organizations(id, name, institution_type)')
        .eq('regulator_id', regulatorId);

      if (orgError) throw orgError;

      const organizations = (orgData || [])
        .map(o => (o as any).organization)
        .filter((o): o is { id: string; name: string; institution_type: string | null } => o != null);

      if (organizations.length === 0) {
        setFirmRows([]);
        setCategoryAverages([]);
        setOutliers([]);
        setSectorSummary({
          totalCMOs: 0,
          totalRisks: 0,
          highestRiskCategory: 'N/A',
          mostAtRiskFirm: 'N/A',
          complianceRate: 0,
        });
        setLoading(false);
        return;
      }

      // 3. For each org, load SEC category mappings and risks
      const orgIds = organizations.map(o => o.id);

      // Load all SEC category mappings for these orgs
      const { data: allMappings, error: mapError } = await supabase
        .from('sec_category_mappings')
        .select('organization_id, internal_category_name, sec_category_id')
        .in('organization_id', orgIds);

      if (mapError) throw mapError;

      // Build per-org mapping lookup: org_id -> Map<internal_category, sec_code>
      const orgMappingLookup = new Map<string, Map<string, string>>();
      for (const m of (allMappings || [])) {
        if (!orgMappingLookup.has(m.organization_id)) {
          orgMappingLookup.set(m.organization_id, new Map());
        }
        const secCode = catIdToCode.get(m.sec_category_id);
        if (secCode) {
          orgMappingLookup.get(m.organization_id)!.set(m.internal_category_name, secCode);
        }
      }

      // Load default keyword mappings for fallback
      const { data: defaultMappings } = await supabase
        .from('sec_default_category_mappings')
        .select('keyword_pattern, sec_category_id, priority')
        .order('priority');

      const defaults = (defaultMappings || []).map(d => ({
        keyword: d.keyword_pattern,
        secCode: catIdToCode.get(d.sec_category_id) || 'OPERATIONAL',
      }));

      // Load all risks for these orgs (severity computed client-side)
      const { data: allRisks, error: riskError } = await supabase
        .from('risks')
        .select('id, organization_id, category, likelihood_inherent, impact_inherent')
        .in('organization_id', orgIds)
        .eq('status', 'Open');

      if (riskError) throw riskError;

      // 4. Build firm rows
      const rows: FirmRow[] = [];

      for (const org of organizations) {
        const orgRisks = (allRisks || []).filter(r => r.organization_id === org.id);
        const orgMapping = orgMappingLookup.get(org.id) || new Map<string, string>();

        const catData: Record<string, FirmCategoryData> = {};

        // Initialize all 5 categories
        for (const code of SEC_CATEGORY_ORDER) {
          catData[code] = { riskCount: 0, avgRating: 0, criticalCount: 0, highCount: 0 };
        }

        // Assign each risk to its SEC category
        const ratingAccumulator: Record<string, number[]> = {};
        for (const code of SEC_CATEGORY_ORDER) {
          ratingAccumulator[code] = [];
        }

        for (const risk of orgRisks) {
          const category = risk.category || '';
          let secCode = orgMapping.get(category);

          // Fallback to keyword matching if no explicit mapping
          if (!secCode) {
            const lowerCat = category.toLowerCase();
            const match = defaults.find(d => lowerCat.includes(d.keyword));
            secCode = match ? match.secCode : 'OPERATIONAL';
          }

          // Ensure valid code
          if (!SEC_CATEGORY_ORDER.includes(secCode)) {
            secCode = 'OPERATIONAL';
          }

          const rating = (risk.likelihood_inherent || 0) * (risk.impact_inherent || 0);
          ratingAccumulator[secCode].push(rating);
          catData[secCode].riskCount++;
          // Compute severity from inherent score
          if (rating >= 20) catData[secCode].criticalCount++;
          else if (rating >= 12) catData[secCode].highCount++;
        }

        // Calculate averages
        for (const code of SEC_CATEGORY_ORDER) {
          const ratings = ratingAccumulator[code];
          catData[code].avgRating = ratings.length > 0
            ? Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 100) / 100
            : 0;
        }

        rows.push({
          organizationId: org.id,
          organizationName: org.name,
          institutionType: org.institution_type,
          categories: catData,
          totalRisks: orgRisks.length,
        });
      }

      setFirmRows(rows);

      // 5. Compute category averages across all firms
      const catAvgs: CategoryAverage[] = SEC_CATEGORY_ORDER.map(code => {
        const firmsWithData = rows.filter(r => r.categories[code].riskCount > 0);
        const allRatings = firmsWithData.map(r => r.categories[code].avgRating);
        const totalRisks = rows.reduce((sum, r) => sum + r.categories[code].riskCount, 0);
        const totalCritical = rows.reduce((sum, r) => sum + r.categories[code].criticalCount, 0);
        const totalHigh = rows.reduce((sum, r) => sum + r.categories[code].highCount, 0);

        return {
          code,
          name: catCodeToName.get(code) || code,
          avgRating: allRatings.length > 0
            ? Math.round(mean(allRatings) * 100) / 100
            : 0,
          totalRisks,
          criticalCount: totalCritical,
          highCount: totalHigh,
          firmCount: firmsWithData.length,
        };
      });

      setCategoryAverages(catAvgs);

      // 6. Detect outliers
      const detectedOutliers: OutlierRow[] = [];

      for (const code of SEC_CATEGORY_ORDER) {
        const firmsWithData = rows.filter(r => r.categories[code].riskCount > 0);
        if (firmsWithData.length < 3) continue; // need at least 3 data points for meaningful stats

        const ratings = firmsWithData.map(r => r.categories[code].avgRating);
        const avg = mean(ratings);
        const sd = stddev(ratings);

        if (sd === 0) continue; // no variation, no outliers

        for (const firm of firmsWithData) {
          const firmRating = firm.categories[code].avgRating;
          const zScore = (firmRating - avg) / sd;

          if (Math.abs(zScore) > OUTLIER_THRESHOLD) {
            detectedOutliers.push({
              organizationName: firm.organizationName,
              categoryCode: code,
              categoryName: catCodeToName.get(code) || code,
              rating: firmRating,
              sectorAvg: Math.round(avg * 100) / 100,
              stdDev: Math.round(sd * 100) / 100,
              deviation: Math.round(Math.abs(zScore) * 100) / 100,
              status: zScore > 0 ? 'Above' : 'Below',
            });
          }
        }
      }

      // Sort outliers by deviation descending
      detectedOutliers.sort((a, b) => b.deviation - a.deviation);
      setOutliers(detectedOutliers);

      // 7. Compute sector summary
      const totalRisksAcross = rows.reduce((sum, r) => sum + r.totalRisks, 0);

      // Highest risk category by average rating
      const highestCat = catAvgs.reduce(
        (best, c) => (c.avgRating > best.avgRating ? c : best),
        catAvgs[0]
      );

      // Most at-risk firm (highest total average rating across all categories)
      const mostAtRisk = rows.reduce((best, r) => {
        const ratingSum = SEC_CATEGORY_ORDER.reduce((s, code) => {
          return s + (r.categories[code].riskCount > 0 ? r.categories[code].avgRating : 0);
        }, 0);
        const categoriesWithData = SEC_CATEGORY_ORDER.filter(code => r.categories[code].riskCount > 0).length;
        const overallAvg = categoriesWithData > 0 ? ratingSum / categoriesWithData : 0;

        const bestRatingSum = SEC_CATEGORY_ORDER.reduce((s, code) => {
          return s + (best.categories[code].riskCount > 0 ? best.categories[code].avgRating : 0);
        }, 0);
        const bestCategoriesWithData = SEC_CATEGORY_ORDER.filter(code => best.categories[code].riskCount > 0).length;
        const bestOverallAvg = bestCategoriesWithData > 0 ? bestRatingSum / bestCategoriesWithData : 0;

        return overallAvg > bestOverallAvg ? r : best;
      }, rows[0]);

      // Compliance rate: percentage of firms that have at least 1 risk in all 5 categories
      const fullyMappedFirms = rows.filter(r =>
        SEC_CATEGORY_ORDER.every(code => r.categories[code].riskCount > 0)
      ).length;
      const complianceRate = rows.length > 0
        ? Math.round((fullyMappedFirms / rows.length) * 100)
        : 0;

      setSectorSummary({
        totalCMOs: rows.length,
        totalRisks: totalRisksAcross,
        highestRiskCategory: highestCat?.name || 'N/A',
        mostAtRiskFirm: mostAtRisk?.organizationName || 'N/A',
        complianceRate,
      });
    } catch (err) {
      console.error('SECSectorAnalytics loadData error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sector analytics');
    } finally {
      setLoading(false);
    }
  }, [regulatorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ------------------------------------------
  // Render: Loading State
  // ------------------------------------------

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading sector analytics...</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------
  // Render: Error State
  // ------------------------------------------

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // ------------------------------------------
  // Render: Main Content
  // ------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            SEC Sector Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Cross-firm risk comparison across SEC standard categories
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Empty State */}
      {firmRows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Organizations Found</h3>
            <p className="text-muted-foreground">
              No organizations are currently assigned to this regulator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Section 1: Sector Summary Statistics */}
          {sectorSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    CMOs Analyzed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{sectorSummary.totalCMOs}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Total Risks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{sectorSummary.totalRisks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Highest Risk Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate" title={sectorSummary.highestRiskCategory}>
                    {sectorSummary.highestRiskCategory}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Most At-Risk Firm
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate" title={sectorSummary.mostAtRiskFirm}>
                    {sectorSummary.mostAtRiskFirm}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Mapping Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${
                    sectorSummary.complianceRate >= 80 ? 'text-green-600' :
                    sectorSummary.complianceRate >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {sectorSummary.complianceRate}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Firms with all 5 categories
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section 2: Aggregate Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Aggregate Heatmap: SEC Categories x CMOs</CardTitle>
              <CardDescription>
                Each cell shows risk count and average risk rating (likelihood x impact).
                Color indicates severity level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-3 bg-gray-50 text-left sticky left-0 z-10 min-w-[200px]">
                        Organization
                      </th>
                      {SEC_CATEGORY_ORDER.map(code => (
                        <th key={code} className="border p-3 bg-gray-50 text-center text-xs font-semibold min-w-[110px]">
                          {SEC_CATEGORY_SHORT_LABELS[code]}
                        </th>
                      ))}
                      <th className="border p-3 bg-gray-50 text-center text-xs font-semibold min-w-[80px]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {firmRows.map(firm => (
                      <tr key={firm.organizationId}>
                        <td className="border p-3 font-medium sticky left-0 bg-white z-10">
                          <div>
                            <div className="text-sm">{firm.organizationName}</div>
                            {firm.institutionType && (
                              <div className="text-xs text-muted-foreground">{firm.institutionType}</div>
                            )}
                          </div>
                        </td>
                        {SEC_CATEGORY_ORDER.map(code => {
                          const cell = firm.categories[code];
                          const hasData = cell.riskCount > 0;
                          return (
                            <td
                              key={code}
                              className={`border p-3 text-center ${getHeatmapCellStyle(cell.avgRating, hasData)}`}
                            >
                              {hasData ? (
                                <div>
                                  <div className="text-lg font-bold">{cell.riskCount}</div>
                                  <div className="text-xs font-medium">{cell.avgRating.toFixed(1)}</div>
                                </div>
                              ) : (
                                <span className="text-xs">--</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border p-3 text-center bg-gray-50 font-semibold">
                          {firm.totalRisks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-medium">Legend:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Critical (&ge;16)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-400 rounded"></div>
                    <span>High (12-15)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-300 rounded"></div>
                    <span>Medium (6-11)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-400 rounded"></div>
                    <span>Low (&lt;6)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                    <span>No data</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Category Averages Cards */}
          <Card>
            <CardHeader>
              <CardTitle>SEC Category Averages</CardTitle>
              <CardDescription>
                Sector-wide statistics for each SEC standard category.
                Categories with an average rating above 12 are flagged as concerning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {categoryAverages.map(cat => {
                  const isConcerning = cat.avgRating > 12;
                  return (
                    <div
                      key={cat.code}
                      className={`rounded-lg border p-4 ${
                        isConcerning
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold truncate" title={cat.name}>
                          {SEC_CATEGORY_SHORT_LABELS[cat.code] || cat.name}
                        </h4>
                        {isConcerning && (
                          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                      </div>

                      <div className={`text-2xl font-bold ${
                        isConcerning ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {cat.avgRating.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">Avg rating across firms</p>

                      <div className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total risks</span>
                          <span className="font-medium">{cat.totalRisks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Critical + High</span>
                          <span className={`font-medium ${
                            (cat.criticalCount + cat.highCount) > 0 ? 'text-red-600' : ''
                          }`}>
                            {cat.criticalCount + cat.highCount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Firms reporting</span>
                          <span className="font-medium">{cat.firmCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Outlier Detection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Outlier Detection
              </CardTitle>
              <CardDescription>
                Firms where a category's average risk rating deviates more than {OUTLIER_THRESHOLD} standard
                deviations from the sector average. Requires at least 3 firms with data in a category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {outliers.length === 0 ? (
                <div className="py-8 text-center">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No statistical outliers detected. All firms are within {OUTLIER_THRESHOLD} standard
                    deviations of the sector average in every category.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CMO Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                        <TableHead className="text-right">Sector Avg</TableHead>
                        <TableHead className="text-right">Std Dev</TableHead>
                        <TableHead className="text-right">Deviation</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outliers.map((outlier, idx) => (
                        <TableRow key={`${outlier.organizationName}-${outlier.categoryCode}-${idx}`}>
                          <TableCell className="font-medium">{outlier.organizationName}</TableCell>
                          <TableCell>{outlier.categoryName}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {outlier.rating.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">{outlier.sectorAvg.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{outlier.stdDev.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {outlier.deviation.toFixed(2)} &sigma;
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                outlier.status === 'Above'
                                  ? 'bg-red-100 text-red-700 border-red-300'
                                  : 'bg-orange-100 text-orange-700 border-orange-300'
                              }
                              variant="outline"
                            >
                              {outlier.status === 'Above' ? (
                                <TrendingUp className="h-3 w-3 mr-1 inline" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 mr-1 inline" />
                              )}
                              {outlier.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
