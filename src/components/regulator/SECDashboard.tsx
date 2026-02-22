/**
 * SEC Regulator Dashboard Component
 *
 * Main dashboard for the Nigerian Securities and Exchange Commission (SEC)
 * regulatory oversight portal. Provides a comprehensive view of all Capital
 * Market Operators (CMOs) with tab-based navigation for:
 *
 * 1. Portfolio Overview — traffic-light risk heatmap across SEC categories
 * 2. Submission Tracker — quarterly submission compliance tracking
 * 3. Firm Drilldown — detailed per-CMO risk profile review
 * 4. Sector Analytics — cross-sector risk trend analysis
 *
 * Data Sources:
 * - organization_regulators: CMOs assigned to the regulator
 * - risks + sec_category_mappings: risk-to-SEC-category linkage
 * - sec_standard_categories: the 5 SEC standard risk categories
 * - sec_submissions: quarterly submission status
 */

import { useState, useEffect, useCallback } from 'react';
import { getAllRegulators, type Regulator } from '@/lib/regulators';
import {
  getOrganizationRiskSummaries,
  type OrganizationRiskSummary,
} from '@/lib/regulator-analytics';
import {
  getSubmissionComplianceStats,
  getAllSubmissionsForRegulator,
  getCurrentPeriod,
  type SecSubmission,
} from '@/lib/sec-submissions';
import {
  getSecStandardCategories,
  type SecStandardCategory,
} from '@/lib/sec-categories';
import { supabase } from '@/lib/supabase';
import SECSubmissionTracker from './SECSubmissionTracker';
import SECFirmDrilldown from './SECFirmDrilldown';
import SECSectorAnalytics from './SECSectorAnalytics';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Building2,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Shield,
} from 'lucide-react';

// ============================================
// Types
// ============================================

/** SEC category risk data for a single organization */
interface OrgSECCategoryData {
  risk_count: number;
  avg_rating: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

/** A row in the portfolio overview table */
interface PortfolioRow {
  organization_id: string;
  organization_name: string;
  institution_type: string | null;
  total_risks: number;
  sec_categories: Record<string, OrgSECCategoryData>;
  overall_severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  last_submission_date: string | null;
  last_submission_status: string | null;
}

/** The 5 SEC standard category codes in display order */
const SEC_CATEGORY_ORDER = ['STRATEGIC', 'MARKET', 'REGULATORY', 'OPERATIONAL', 'IT_CYBER'];

/** Short display labels for SEC categories */
const SEC_CATEGORY_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  MARKET: 'Market',
  REGULATORY: 'Regulatory',
  OPERATIONAL: 'Operational',
  IT_CYBER: 'IT/Cyber',
};

// ============================================
// Helpers
// ============================================

function getSeverityFromRating(avgRating: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
  if (avgRating >= 20) return 'CRITICAL';
  if (avgRating >= 12) return 'HIGH';
  if (avgRating >= 6) return 'MEDIUM';
  if (avgRating > 0) return 'LOW';
  return 'NONE';
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-600 text-white';
    case 'HIGH': return 'bg-orange-500 text-white';
    case 'MEDIUM': return 'bg-yellow-400 text-yellow-900';
    case 'LOW': return 'bg-green-500 text-white';
    default: return 'bg-gray-100 text-gray-400';
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return <Badge className="bg-red-600 text-white hover:bg-red-700">Critical</Badge>;
    case 'HIGH':
      return <Badge className="bg-orange-500 text-white hover:bg-orange-600">High</Badge>;
    case 'MEDIUM':
      return <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500">Medium</Badge>;
    case 'LOW':
      return <Badge className="bg-green-500 text-white hover:bg-green-600">Low</Badge>;
    default:
      return <Badge variant="secondary">N/A</Badge>;
  }
}

function computeOverallSeverity(
  secCategories: Record<string, OrgSECCategoryData>
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
  const entries = Object.values(secCategories);
  if (entries.length === 0) return 'NONE';

  // Overall severity is the worst across all categories
  const severityRank: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
    NONE: 0,
  };

  let worstRank = 0;
  for (const entry of entries) {
    const rank = severityRank[entry.severity] || 0;
    if (rank > worstRank) worstRank = rank;
  }

  const rankToSeverity: Record<number, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'> = {
    4: 'CRITICAL',
    3: 'HIGH',
    2: 'MEDIUM',
    1: 'LOW',
    0: 'NONE',
  };

  return rankToSeverity[worstRank] || 'NONE';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================
// Component
// ============================================

export default function SECDashboard() {
  // Regulator selection
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [selectedRegulatorId, setSelectedRegulatorId] = useState<string>('');

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('portfolio');

  // Portfolio Overview data
  const [portfolioRows, setPortfolioRows] = useState<PortfolioRow[]>([]);
  const [secCategories, setSecCategories] = useState<SecStandardCategory[]>([]);
  const [orgSummaries, setOrgSummaries] = useState<OrganizationRiskSummary[]>([]);

  // Metrics
  const [totalCMOs, setTotalCMOs] = useState(0);
  const [totalRisks, setTotalRisks] = useState(0);
  const [firmsAtRisk, setFirmsAtRisk] = useState(0);
  const [avgComplianceRate, setAvgComplianceRate] = useState(0);

  // Firm Drilldown selected org
  const [selectedOrg, setSelectedOrg] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Load regulators on mount
  // ============================================

  useEffect(() => {
    loadRegulators();
  }, []);

  async function loadRegulators() {
    const { data, error: regError } = await getAllRegulators();
    if (regError) {
      setError('Failed to load regulators: ' + (regError as Error).message);
      setLoading(false);
      return;
    }
    const regList = (data || []) as Regulator[];
    setRegulators(regList);
    if (regList.length > 0) {
      setSelectedRegulatorId(regList[0].id);
    }
    setLoading(false);
  }

  // ============================================
  // Load dashboard data when regulator changes
  // ============================================

  const loadDashboardData = useCallback(async () => {
    if (!selectedRegulatorId) return;

    setRefreshing(true);
    setError(null);

    try {
      // Load SEC categories, org summaries, submissions, and compliance stats in parallel
      const currentPeriod = getCurrentPeriod();
      const [
        secCatsResult,
        summariesResult,
        submissionsResult,
        complianceResult,
      ] = await Promise.all([
        getSecStandardCategories(),
        getOrganizationRiskSummaries(selectedRegulatorId),
        getAllSubmissionsForRegulator(selectedRegulatorId),
        getSubmissionComplianceStats(selectedRegulatorId, currentPeriod),
      ]);

      if (secCatsResult.error) throw secCatsResult.error;
      if (summariesResult.error) throw summariesResult.error;
      if (submissionsResult.error) throw submissionsResult.error;

      const cats = secCatsResult.data || [];
      const summaries = summariesResult.data || [];
      const submissions = submissionsResult.data || [];
      const compliance = complianceResult.data;

      setSecCategories(cats);
      setOrgSummaries(summaries);

      // Build a lookup: org_id -> latest submission
      const latestSubByOrg = new Map<string, SecSubmission>();
      for (const sub of submissions) {
        const existing = latestSubByOrg.get(sub.organization_id);
        if (
          !existing ||
          new Date(sub.submitted_at || sub.created_at).getTime() >
            new Date(existing.submitted_at || existing.created_at).getTime()
        ) {
          latestSubByOrg.set(sub.organization_id, sub);
        }
      }

      // Load SEC category data for each organization
      const rows = await loadSECCategoryData(
        selectedRegulatorId,
        summaries,
        cats,
        latestSubByOrg
      );

      setPortfolioRows(rows);

      // Calculate metrics
      setTotalCMOs(summaries.length);
      setTotalRisks(summaries.reduce((sum, s) => sum + s.total_risks, 0));
      setFirmsAtRisk(rows.filter(r => r.overall_severity === 'CRITICAL').length);
      setAvgComplianceRate(compliance?.compliance_rate ?? 0);
    } catch (err) {
      console.error('SECDashboard loadDashboardData error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setRefreshing(false);
    }
  }, [selectedRegulatorId]);

  useEffect(() => {
    if (selectedRegulatorId) {
      loadDashboardData();
    }
  }, [selectedRegulatorId, loadDashboardData]);

  // ============================================
  // Load SEC Category Data per Organization
  // ============================================

  /**
   * For each org under this regulator, load risks grouped by SEC category.
   * Uses sec_category_mappings when available, falls back to keyword matching.
   */
  async function loadSECCategoryData(
    regulatorId: string,
    summaries: OrganizationRiskSummary[],
    cats: SecStandardCategory[],
    latestSubByOrg: Map<string, SecSubmission>
  ): Promise<PortfolioRow[]> {
    const rows: PortfolioRow[] = [];

    // Build a category ID -> code lookup
    const catIdToCode = new Map<string, string>();
    for (const cat of cats) {
      catIdToCode.set(cat.id, cat.code);
    }

    for (const summary of summaries) {
      const orgId = summary.organization_id;

      // Try to load mappings + risks for this org
      const secCatData = await loadOrgSECData(orgId, cats, catIdToCode);

      const latestSub = latestSubByOrg.get(orgId);

      rows.push({
        organization_id: orgId,
        organization_name: summary.organization_name,
        institution_type: summary.institution_type,
        total_risks: summary.total_risks,
        sec_categories: secCatData,
        overall_severity: computeOverallSeverity(secCatData),
        last_submission_date: latestSub?.submitted_at || null,
        last_submission_status: latestSub?.status || null,
      });
    }

    // Sort: Critical firms first, then by name
    rows.sort((a, b) => {
      const severityRank: Record<string, number> = {
        CRITICAL: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
        NONE: 0,
      };
      const rankDiff =
        (severityRank[b.overall_severity] || 0) - (severityRank[a.overall_severity] || 0);
      if (rankDiff !== 0) return rankDiff;
      return a.organization_name.localeCompare(b.organization_name);
    });

    return rows;
  }

  /**
   * Load SEC-category-grouped risk data for a single organization.
   * Step 1: Check sec_category_mappings for explicit mappings.
   * Step 2: If no mappings exist, fall back to keyword matching on risk category names.
   */
  async function loadOrgSECData(
    orgId: string,
    cats: SecStandardCategory[],
    catIdToCode: Map<string, string>
  ): Promise<Record<string, OrgSECCategoryData>> {
    const result: Record<string, OrgSECCategoryData> = {};

    try {
      // Get explicit mappings for this org
      const { data: mappings } = await supabase
        .from('sec_category_mappings')
        .select('internal_category_name, sec_category_id')
        .eq('organization_id', orgId);

      // Get all open risks for this org
      const { data: risks } = await supabase
        .from('risks')
        .select('id, category, likelihood_inherent, impact_inherent, severity')
        .eq('organization_id', orgId)
        .eq('status', 'Open');

      if (!risks || risks.length === 0) {
        return result;
      }

      // Build mapping lookup: internal category -> SEC category code
      const mappingLookup = new Map<string, string>();
      if (mappings && mappings.length > 0) {
        for (const m of mappings) {
          const code = catIdToCode.get(m.sec_category_id);
          if (code) {
            mappingLookup.set(m.internal_category_name, code);
          }
        }
      }

      // Keyword fallback patterns
      const keywordPatterns: Array<{ pattern: RegExp; code: string }> = [
        { pattern: /strateg/i, code: 'STRATEGIC' },
        { pattern: /market|trading|liquidity|price/i, code: 'MARKET' },
        { pattern: /regulat|compliance|legal/i, code: 'REGULATORY' },
        { pattern: /operat|process|fraud|people|human/i, code: 'OPERATIONAL' },
        { pattern: /cyber|tech|it\b|information|data|system/i, code: 'IT_CYBER' },
      ];

      function resolveCategory(categoryName: string | null): string {
        if (!categoryName) return 'OPERATIONAL';

        // Check explicit mappings first
        const mapped = mappingLookup.get(categoryName);
        if (mapped) return mapped;

        // Keyword fallback
        for (const { pattern, code } of keywordPatterns) {
          if (pattern.test(categoryName)) {
            return code;
          }
        }

        // Default to Operational if nothing matches
        return 'OPERATIONAL';
      }

      // Group risks by SEC category
      const grouped = new Map<string, { count: number; totalRating: number; severities: string[] }>();

      for (const risk of risks) {
        const secCode = resolveCategory(risk.category);
        if (!grouped.has(secCode)) {
          grouped.set(secCode, { count: 0, totalRating: 0, severities: [] });
        }
        const group = grouped.get(secCode)!;
        group.count++;
        const rating = (risk.likelihood_inherent || 0) * (risk.impact_inherent || 0);
        group.totalRating += rating;
        if (risk.severity) {
          group.severities.push(risk.severity);
        }
      }

      // Build result
      for (const [code, group] of grouped.entries()) {
        const avgRating = group.count > 0 ? group.totalRating / group.count : 0;
        result[code] = {
          risk_count: group.count,
          avg_rating: Math.round(avgRating * 100) / 100,
          severity: getSeverityFromRating(avgRating),
        };
      }
    } catch (err) {
      console.error(`Failed to load SEC data for org ${orgId}:`, err);
    }

    return result;
  }

  // ============================================
  // Firm Drilldown Navigation
  // ============================================

  function handleSelectOrg(orgId: string, orgName: string) {
    setSelectedOrg({ id: orgId, name: orgName });
    setActiveTab('drilldown');
  }

  function handleDrilldownBack() {
    setSelectedOrg(null);
    setActiveTab('portfolio');
  }

  // ============================================
  // Render
  // ============================================

  const selectedRegulator = regulators.find(r => r.id === selectedRegulatorId);

  if (loading && regulators.length === 0) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Loading SEC Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-700" />
            <div>
              <h1 className="text-3xl font-bold">SEC Regulatory Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Capital Market Operator risk oversight and submission compliance
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {regulators.length > 1 && (
            <div className="w-56">
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
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Portfolio Overview</span>
            <span className="sm:hidden">Portfolio</span>
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Submission Tracker</span>
            <span className="sm:hidden">Submissions</span>
          </TabsTrigger>
          <TabsTrigger value="drilldown" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Firm Drilldown</span>
            <span className="sm:hidden">Drilldown</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Sector Analytics</span>
            <span className="sm:hidden">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* Tab 1: Portfolio Overview */}
        {/* ============================================ */}
        <TabsContent value="portfolio" className="space-y-6 mt-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Total CMOs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalCMOs}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Under {selectedRegulator?.code || 'SEC'} oversight
                </p>
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
                <div className="text-3xl font-bold">{totalRisks}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active open risks across all CMOs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Firms At Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{firmsAtRisk}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  CMOs with Critical overall rating
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Compliance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${
                    avgComplianceRate >= 80
                      ? 'text-green-600'
                      : avgComplianceRate >= 50
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {avgComplianceRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getCurrentPeriod()} submission rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Heatmap Table */}
          <Card>
            <CardHeader>
              <CardTitle>CMO Risk Portfolio</CardTitle>
              <CardDescription>
                Traffic-light view of risk ratings per SEC category for each Capital Market Operator.
                Click a row to drill down into a firm's detailed risk profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {refreshing && portfolioRows.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-3" />
                  <p className="text-muted-foreground">Loading portfolio data...</p>
                </div>
              ) : portfolioRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  No organizations are assigned to this regulator.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white z-10 min-w-[200px]">
                          CMO Name
                        </TableHead>
                        <TableHead className="min-w-[100px]">Type</TableHead>
                        <TableHead className="text-center min-w-[70px]">Risks</TableHead>
                        {SEC_CATEGORY_ORDER.map(code => (
                          <TableHead
                            key={code}
                            className="text-center min-w-[100px]"
                          >
                            {SEC_CATEGORY_LABELS[code]}
                          </TableHead>
                        ))}
                        <TableHead className="text-center min-w-[100px]">Overall</TableHead>
                        <TableHead className="min-w-[120px]">Last Submission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portfolioRows.map(row => (
                        <TableRow
                          key={row.organization_id}
                          className="cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => handleSelectOrg(row.organization_id, row.organization_name)}
                        >
                          <TableCell className="sticky left-0 bg-white z-10 font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span>{row.organization_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.institution_type ? (
                              <Badge variant="secondary" className="text-xs">
                                {row.institution_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {row.total_risks}
                          </TableCell>
                          {SEC_CATEGORY_ORDER.map(code => {
                            const catData = row.sec_categories[code];
                            if (!catData || catData.risk_count === 0) {
                              return (
                                <TableCell
                                  key={code}
                                  className="text-center"
                                >
                                  <div className="inline-flex flex-col items-center px-3 py-1 rounded bg-gray-100 text-gray-400 text-xs">
                                    <span>--</span>
                                  </div>
                                </TableCell>
                              );
                            }
                            return (
                              <TableCell
                                key={code}
                                className="text-center"
                              >
                                <div
                                  className={`inline-flex flex-col items-center px-3 py-1 rounded ${getSeverityColor(
                                    catData.severity
                                  )}`}
                                >
                                  <span className="text-sm font-bold">{catData.risk_count}</span>
                                  <span className="text-xs opacity-80">
                                    {catData.avg_rating.toFixed(1)}
                                  </span>
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            {getSeverityBadge(row.overall_severity)}
                          </TableCell>
                          <TableCell>
                            {row.last_submission_date ? (
                              <div>
                                <div className="text-sm">{formatDate(row.last_submission_date)}</div>
                                {row.last_submission_status && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs mt-0.5 ${
                                      row.last_submission_status === 'approved'
                                        ? 'border-green-300 text-green-700'
                                        : row.last_submission_status === 'submitted'
                                        ? 'border-blue-300 text-blue-700'
                                        : row.last_submission_status === 'revision_requested'
                                        ? 'border-red-300 text-red-700'
                                        : ''
                                    }`}
                                  >
                                    {row.last_submission_status === 'revision_requested'
                                      ? 'Revision'
                                      : row.last_submission_status === 'under_review'
                                      ? 'Under Review'
                                      : row.last_submission_status.charAt(0).toUpperCase() +
                                        row.last_submission_status.slice(1)}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No submission</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm border-t pt-4">
                    <span className="font-medium text-muted-foreground">Legend:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-600" />
                      <span>Critical (20+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-orange-500" />
                      <span>High (12-19)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-yellow-400" />
                      <span>Medium (6-11)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      <span>Low (1-5)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gray-100 border" />
                      <span>No data</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* Tab 2: Submission Tracker */}
        {/* ============================================ */}
        <TabsContent value="submissions" className="mt-6">
          {selectedRegulatorId ? (
            <SECSubmissionTracker regulatorId={selectedRegulatorId} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Select a regulator to view submission tracking.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* Tab 3: Firm Drilldown */}
        {/* ============================================ */}
        <TabsContent value="drilldown" className="mt-6">
          {selectedOrg && selectedRegulatorId ? (
            <SECFirmDrilldown
              regulatorId={selectedRegulatorId}
              organizationId={selectedOrg.id}
            />
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Firm to Drill Down</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Click on any CMO row in the Portfolio Overview tab to view their detailed
                  SEC Risk Profile Report, including category summaries, heatmaps, and
                  submission history.
                </p>
                {portfolioRows.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                      Or select a firm directly:
                    </p>
                    <div className="w-80 mx-auto">
                      <Select
                        value={selectedOrg?.id || ''}
                        onValueChange={(value) => {
                          const org = portfolioRows.find(r => r.organization_id === value);
                          if (org) {
                            setSelectedOrg({
                              id: org.organization_id,
                              name: org.organization_name,
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a CMO..." />
                        </SelectTrigger>
                        <SelectContent>
                          {portfolioRows.map(row => (
                            <SelectItem key={row.organization_id} value={row.organization_id}>
                              {row.organization_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* Tab 4: Sector Analytics */}
        {/* ============================================ */}
        <TabsContent value="analytics" className="mt-6">
          {selectedRegulatorId ? (
            <SECSectorAnalytics regulatorId={selectedRegulatorId} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Select a regulator to view sector analytics.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

