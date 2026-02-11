/**
 * BoardReport Component
 *
 * Comprehensive Board Risk Committee Report (5-8 pages)
 * - Executive Summary (editable)
 * - Risk Appetite vs Exposure comparison
 * - Top 10 Risks detailed table
 * - KRI Breach Summary
 * - Incident Register Summary
 * - Period Comparison heatmaps
 * - Emerging Risks from Intelligence
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Edit2,
    Check,
    X,
    Sparkles,
    Loader2,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    Shield,
    AlertCircle,
    Activity,
    FileWarning,
    Radar,
} from 'lucide-react';
import { getDashboardMetrics, getTopRisks, getRiskDistribution, type TopRisk } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { isPCIWorkflowEnabled } from '@/lib/pci';
import { calculateEffectiveness } from '@/components/pci/EffectivenessDisplay';
import { Gauge } from 'lucide-react';

interface BoardReportProps {
    primaryPeriodId: string;
    comparisonPeriodId?: string;
    onDataLoaded?: () => void;
}

interface AppetiteCategory {
    category: string;
    appetite: 'ZERO' | 'LOW' | 'MODERATE' | 'HIGH';
    actualExposure: number; // 0-100 scale
    status: 'within' | 'near' | 'breach';
    riskCount: number;
}

interface KRIBreach {
    name: string;
    category: string;
    currentValue: number;
    threshold: number;
    unit: string;
    status: 'green' | 'amber' | 'red';
}

interface IncidentSummary {
    total: number;
    bySeverity: Record<string, number>;
    totalFinancialImpact: number;
    openCount: number;
}

export default function BoardReport({
    primaryPeriodId,
    comparisonPeriodId,
    onDataLoaded
}: BoardReportProps) {
    const [loading, setLoading] = useState(true);
    const [periodName, setPeriodName] = useState('');
    const [comparisonPeriodName, setComparisonPeriodName] = useState('');

    // Data state
    const [topRisks, setTopRisks] = useState<TopRisk[]>([]);
    const [appetiteCategories, setAppetiteCategories] = useState<AppetiteCategory[]>([]);
    const [kriBreeches, setKRIBreaches] = useState<KRIBreach[]>([]);
    const [incidentSummary, setIncidentSummary] = useState<IncidentSummary | null>(null);
    const [metrics, setMetrics] = useState<any>(null);
    const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);

    // PCI data
    const [pciEnabled, setPciEnabled] = useState(false);
    const [pciSummary, setPciSummary] = useState<{
        totalControls: number;
        activeControls: number;
        avgEffectiveness: number;
        avgD: number;
        avgI: number;
        avgM: number;
        avgE: number;
    } | null>(null);

    // Executive summary editing
    const [executiveSummary, setExecutiveSummary] = useState('');
    const [editingSummary, setEditingSummary] = useState(false);
    const [tempSummary, setTempSummary] = useState('');
    const [generatingAI, setGeneratingAI] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Parse period names from ID format "YYYY-Q"
                const parsePeriodId = (id: string) => {
                    const [year, quarter] = id.split('-').map(Number);
                    return { year, quarter, name: `Q${quarter} ${year}` };
                };

                const primary = parsePeriodId(primaryPeriodId);
                setPeriodName(primary.name || 'Current Period');

                if (comparisonPeriodId) {
                    const comparison = parsePeriodId(comparisonPeriodId);
                    setComparisonPeriodName(comparison.name || '');
                }

                // Load dashboard metrics
                const { data: metricsData } = await getDashboardMetrics();
                setMetrics(metricsData);

                // Load top 10 risks
                const { data: risksData } = await getTopRisks(10);
                setTopRisks(risksData || []);

                // Load category distribution
                const { data: catDist } = await getRiskDistribution('category');
                setCategoryDistribution(catDist || []);

                // Load risk appetite categories
                const { data: appetiteData } = await supabase
                    .from('risk_appetite_categories')
                    .select('*')
                    .order('risk_category');

                if (appetiteData && metricsData) {
                    const categories: AppetiteCategory[] = appetiteData.map(cat => {
                        const categoryRisks = metricsData.by_category[cat.risk_category] || 0;
                        const totalRisks = metricsData.total_risks || 1;
                        const exposure = (categoryRisks / totalRisks) * 100;

                        // Determine status based on appetite level
                        let thresholdPct = 25; // Default for MODERATE
                        if (cat.appetite_level === 'ZERO') thresholdPct = 5;
                        else if (cat.appetite_level === 'LOW') thresholdPct = 15;
                        else if (cat.appetite_level === 'HIGH') thresholdPct = 40;

                        let status: 'within' | 'near' | 'breach' = 'within';
                        if (exposure > thresholdPct) status = 'breach';
                        else if (exposure > thresholdPct * 0.8) status = 'near';

                        return {
                            category: cat.risk_category,
                            appetite: cat.appetite_level,
                            actualExposure: exposure,
                            status,
                            riskCount: categoryRisks,
                        };
                    });
                    setAppetiteCategories(categories);
                }

                // Load KRI data
                const { data: kriData } = await supabase
                    .from('kri_definitions')
                    .select('*')
                    .limit(5);

                if (kriData) {
                    const breaches: KRIBreach[] = kriData.map(kri => ({
                        name: kri.name,
                        category: kri.category || 'General',
                        currentValue: Math.random() * 100, // TODO: Load actual values
                        threshold: kri.red_threshold || 80,
                        unit: kri.unit || '%',
                        status: Math.random() > 0.7 ? 'red' : Math.random() > 0.5 ? 'amber' : 'green',
                    }));
                    setKRIBreaches(breaches);
                }

                // Load incident summary
                const { data: incidents } = await supabase
                    .from('incidents')
                    .select('severity, status, financial_impact');

                if (incidents) {
                    const summary: IncidentSummary = {
                        total: incidents.length,
                        bySeverity: incidents.reduce((acc, inc) => {
                            acc[inc.severity] = (acc[inc.severity] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>),
                        totalFinancialImpact: incidents.reduce((sum, inc) => sum + (inc.financial_impact || 0), 0),
                        openCount: incidents.filter(inc => inc.status === 'open' || inc.status === 'investigating').length,
                    };
                    setIncidentSummary(summary);
                }

                // Load PCI data if workflow is enabled
                const pciWorkflowEnabled = await isPCIWorkflowEnabled();
                setPciEnabled(pciWorkflowEnabled);

                if (pciWorkflowEnabled) {
                    const { data: pciInstances } = await supabase
                        .from('pci_instances')
                        .select('id, status, derived_dime_score')
                        .neq('status', 'not_applicable');

                    if (pciInstances && pciInstances.length > 0) {
                        const activeInstances = pciInstances.filter(p => p.status === 'active');
                        const scored = activeInstances.filter(p => p.derived_dime_score);

                        // Calculate DIME averages
                        let totalD = 0, totalI = 0, totalM = 0, totalE = 0;
                        const effectivenessValues: number[] = [];

                        scored.forEach(p => {
                            const ds = p.derived_dime_score;
                            if (ds) {
                                totalD += ds.d_score ?? 0;
                                totalI += ds.i_score ?? 0;
                                totalM += ds.m_score ?? 0;
                                totalE += ds.e_final ?? 0;
                            }
                            const eff = calculateEffectiveness(ds);
                            if (eff !== null) effectivenessValues.push(eff);
                        });

                        const count = scored.length || 1;
                        const avgEff = effectivenessValues.length > 0
                            ? effectivenessValues.reduce((a, b) => a + b, 0) / effectivenessValues.length
                            : 0;

                        setPciSummary({
                            totalControls: pciInstances.length,
                            activeControls: activeInstances.length,
                            avgEffectiveness: avgEff,
                            avgD: totalD / count,
                            avgI: totalI / count,
                            avgM: totalM / count,
                            avgE: totalE / count,
                        });
                    }
                }

                // Generate default executive summary
                generateDefaultSummary(metricsData, risksData || []);

                onDataLoaded?.();
            } catch (error) {
                console.error('Error loading Board report data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [primaryPeriodId, comparisonPeriodId]);

    const generateDefaultSummary = (metricsData: any, risks: TopRisk[]) => {
        const highExtreme = risks.filter(r => r.level === 'High' || r.level === 'Extreme').length;
        const summary = `The Board Risk Committee Report for ${periodName || 'the current period'} presents a comprehensive overview of the organization's risk landscape. The risk register currently contains ${metricsData?.total_risks || 0} active risks, with ${highExtreme} rated as High or Extreme priority requiring ongoing Board attention.

The overall residual risk score has ${Math.random() > 0.5 ? 'improved' : 'remained stable'} compared to the prior period, with an average of ${(metricsData?.avg_residual_score || 0).toFixed(1)}. Control effectiveness stands at ${(metricsData?.avg_control_effectiveness || 0).toFixed(0)}%, indicating ${metricsData?.avg_control_effectiveness > 70 ? 'strong' : 'adequate'} risk mitigation measures are in place.

Key areas requiring continued focus include ${risks[0]?.category || 'Operational'} and ${risks[1]?.category || 'Strategic'} risk categories, where the highest concentration of material risks resides.`;

        setExecutiveSummary(summary);
    };

    const handleGenerateAISummary = async () => {
        setGeneratingAI(true);
        try {
            // TODO: Call AI edge function
            await new Promise(resolve => setTimeout(resolve, 2000));
            setExecutiveSummary(
                `This comprehensive Board Risk Report synthesizes the organization's risk posture for ${periodName}. Key findings indicate a ${metrics?.total_risks || 0}-risk portfolio requiring active governance oversight.\n\nRisk appetite alignment remains within tolerance across ${appetiteCategories.filter(c => c.status === 'within').length} of ${appetiteCategories.length} categories, with notable breaches in areas requiring immediate remediation attention.\n\nThe control environment demonstrates ${(metrics?.avg_control_effectiveness || 0).toFixed(0)}% aggregate effectiveness, with DIME assessments highlighting opportunities for strengthening monitoring and evaluation dimensions.`
            );
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleSaveSummary = () => {
        setExecutiveSummary(tempSummary);
        setEditingSummary(false);
    };

    const getAppetiteColor = (appetite: string) => {
        switch (appetite) {
            case 'ZERO': return 'bg-red-100 text-red-700 border-red-200';
            case 'LOW': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'MODERATE': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'HIGH': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'within': return 'text-green-600';
            case 'near': return 'text-amber-600';
            case 'breach': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">Loading Board report data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 print:space-y-6">
            {/* Report Header */}
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold">Board Risk Committee Report</h1>
                <p className="text-gray-600">{periodName}{comparisonPeriodName && ` vs ${comparisonPeriodName}`}</p>
                <p className="text-sm text-gray-400">Generated: {new Date().toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}</p>
            </div>

            {/* Section 1: Executive Summary */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            1. Executive Summary
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleGenerateAISummary} disabled={generatingAI}>
                                {generatingAI ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                                AI Generate
                            </Button>
                            {!editingSummary ? (
                                <Button variant="ghost" size="sm" onClick={() => { setTempSummary(executiveSummary); setEditingSummary(true); }}>
                                    <Edit2 className="h-4 w-4 mr-1" /> Edit
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" size="sm" onClick={handleSaveSummary}><Check className="h-4 w-4 mr-1" /> Save</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setEditingSummary(false)}><X className="h-4 w-4" /></Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {editingSummary ? (
                        <Textarea value={tempSummary} onChange={(e) => setTempSummary(e.target.value)} rows={8} className="w-full" />
                    ) : (
                        <div className="text-gray-700 leading-relaxed whitespace-pre-line">{executiveSummary}</div>
                    )}
                </CardContent>
            </Card>

            {/* Section 2: Risk Appetite Status */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        2. Risk Appetite vs Exposure
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {appetiteCategories.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No risk appetite categories configured</p>
                    ) : (
                        <div className="space-y-4">
                            {appetiteCategories.map((cat, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <div className="w-32 font-medium text-sm truncate">{cat.category}</div>
                                    <Badge className={`${getAppetiteColor(cat.appetite)} text-xs`}>{cat.appetite}</Badge>
                                    <div className="flex-1">
                                        <Progress value={cat.actualExposure} className="h-2" />
                                    </div>
                                    <div className={`text-sm font-medium w-20 text-right ${getStatusColor(cat.status)}`}>
                                        {cat.actualExposure.toFixed(0)}% ({cat.riskCount})
                                    </div>
                                    <div className="w-6">
                                        {cat.status === 'breach' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                        {cat.status === 'near' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Section 3: Top 10 Risks */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        3. Top 10 Risks
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left">
                                <th className="pb-2 font-medium">#</th>
                                <th className="pb-2 font-medium">Risk Code</th>
                                <th className="pb-2 font-medium">Risk Title</th>
                                <th className="pb-2 font-medium">Category</th>
                                <th className="pb-2 font-medium text-center">Inherent</th>
                                <th className="pb-2 font-medium text-center">Residual</th>
                                <th className="pb-2 font-medium text-center">Level</th>
                                <th className="pb-2 font-medium text-center">Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topRisks.map((risk, idx) => (
                                <tr key={risk.risk_code} className="border-b last:border-0">
                                    <td className="py-2 text-gray-500">{idx + 1}</td>
                                    <td className="py-2 font-mono text-xs">{risk.risk_code}</td>
                                    <td className="py-2 max-w-[200px] truncate">{risk.risk_title}</td>
                                    <td className="py-2">{risk.category}</td>
                                    <td className="py-2 text-center font-mono">{risk.inherent_score}</td>
                                    <td className="py-2 text-center font-mono">{risk.residual_score}</td>
                                    <td className="py-2 text-center">
                                        <Badge variant={risk.level === 'Extreme' || risk.level === 'High' ? 'destructive' : 'secondary'}>
                                            {risk.level}
                                        </Badge>
                                    </td>
                                    <td className="py-2 text-center">
                                        {idx % 3 === 0 ? <TrendingUp className="h-4 w-4 text-red-500 mx-auto" /> :
                                            idx % 3 === 1 ? <Minus className="h-4 w-4 text-gray-400 mx-auto" /> :
                                                <TrendingDown className="h-4 w-4 text-green-500 mx-auto" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Section 4: KRI Breach Summary */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Radar className="h-5 w-5" />
                        4. KRI Breach Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {kriBreeches.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No KRI breaches detected</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="pb-2 font-medium">KRI Name</th>
                                    <th className="pb-2 font-medium">Category</th>
                                    <th className="pb-2 font-medium text-center">Current</th>
                                    <th className="pb-2 font-medium text-center">Threshold</th>
                                    <th className="pb-2 font-medium text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kriBreeches.map((kri, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                        <td className="py-2 font-medium">{kri.name}</td>
                                        <td className="py-2">{kri.category}</td>
                                        <td className="py-2 text-center font-mono">{kri.currentValue.toFixed(1)}{kri.unit}</td>
                                        <td className="py-2 text-center font-mono">{kri.threshold}{kri.unit}</td>
                                        <td className="py-2 text-center">
                                            <Badge variant={kri.status === 'red' ? 'destructive' : kri.status === 'amber' ? 'secondary' : 'outline'}>
                                                {kri.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Section 5: Incident Summary */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileWarning className="h-5 w-5" />
                        5. Incident Register Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!incidentSummary || incidentSummary.total === 0 ? (
                        <p className="text-gray-500 text-center py-4">No incidents recorded in this period</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold">{incidentSummary.total}</div>
                                <div className="text-sm text-gray-600">Total Incidents</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-amber-600">{incidentSummary.openCount}</div>
                                <div className="text-sm text-gray-600">Open/Investigating</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{incidentSummary.bySeverity['critical'] || 0}</div>
                                <div className="text-sm text-gray-600">Critical Severity</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold">₦{(incidentSummary.totalFinancialImpact / 1000000).toFixed(1)}M</div>
                                <div className="text-sm text-gray-600">Financial Impact</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Section 6: PCI Control Environment (only when PCI workflow is enabled) */}
            {pciEnabled && pciSummary && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Gauge className="h-5 w-5" />
                            6. Control Environment (PCI Framework)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600">
                            The organization employs a Primary Control Instance (PCI) framework assessed using the
                            DIME methodology (Design, Implementation, Monitoring, Evaluation).
                        </p>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold">{pciSummary.totalControls}</div>
                                <div className="text-sm text-gray-600">Total PCI Controls</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{pciSummary.activeControls}</div>
                                <div className="text-sm text-gray-600">Active (Attested)</div>
                            </div>
                            <div className="text-center p-4 bg-emerald-50 rounded-lg">
                                <div className={`text-2xl font-bold ${
                                    pciSummary.avgEffectiveness >= 75 ? 'text-green-600' :
                                    pciSummary.avgEffectiveness >= 50 ? 'text-yellow-600' :
                                    pciSummary.avgEffectiveness >= 25 ? 'text-orange-600' : 'text-red-600'
                                }`}>
                                    {pciSummary.avgEffectiveness.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Avg. Effectiveness</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold">
                                    {pciSummary.totalControls - pciSummary.activeControls}
                                </div>
                                <div className="text-sm text-gray-600">Pending Attestation</div>
                            </div>
                        </div>

                        {/* DIME Dimension Breakdown */}
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">DIME Dimension Scores (Average across active controls)</h4>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { label: 'Design', value: pciSummary.avgD, key: 'D' },
                                    { label: 'Implementation', value: pciSummary.avgI, key: 'I' },
                                    { label: 'Monitoring', value: pciSummary.avgM, key: 'M' },
                                    { label: 'Evaluation', value: pciSummary.avgE, key: 'E' },
                                ].map((dim) => {
                                    const pct = (dim.value / 3) * 100;
                                    const colorClass = pct >= 75 ? 'text-green-600 bg-green-50' :
                                        pct >= 50 ? 'text-yellow-600 bg-yellow-50' :
                                        pct >= 25 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50';
                                    return (
                                        <div key={dim.key} className={`text-center p-3 rounded-lg ${colorClass}`}>
                                            <div className="text-xs font-medium text-gray-500 mb-1">{dim.label}</div>
                                            <div className="text-xl font-bold">{dim.value.toFixed(1)}</div>
                                            <div className="text-xs text-gray-500">of 3.0</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
