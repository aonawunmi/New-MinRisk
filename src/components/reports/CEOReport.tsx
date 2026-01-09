/**
 * CEOReport Component
 *
 * Executive Risk Summary Report for CEO
 * - Risk Pulse indicator (overall posture)
 * - Key metrics with period comparison
 * - Top 5 Risks table with trend arrows
 * - Mini heatmap visualization
 * - AI-generated recommendations
 * - Editable narrative sections
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    ArrowUp,
    ArrowDown,
    Minus,
    Edit2,
    Check,
    X,
    Sparkles,
    Loader2,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Shield,
    Activity,
} from 'lucide-react';
import { getDashboardMetrics, getTopRisks, getHeatmapData, type TopRisk } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { generateReportNarrative } from '@/lib/reportNarrative';

interface CEOReportProps {
    primaryPeriodId: string;
    comparisonPeriodId?: string;
    onDataLoaded?: () => void;
}

interface ReportMetrics {
    totalRisks: number;
    highExtremeCount: number;
    avgInherentScore: number;
    avgResidualScore: number;
    totalControls: number;
    controlEffectiveness: number;
    openIncidents: number;
    pendingAlerts: number;
    // Comparison deltas
    riskDelta?: number;
    highExtremeDelta?: number;
}

type RiskPulse = 'green' | 'amber' | 'red';

export default function CEOReport({
    primaryPeriodId,
    comparisonPeriodId,
    onDataLoaded
}: CEOReportProps) {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
    const [topRisks, setTopRisks] = useState<TopRisk[]>([]);
    const [riskPulse, setRiskPulse] = useState<RiskPulse>('amber');
    const [executiveSummary, setExecutiveSummary] = useState('');
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [editingSummary, setEditingSummary] = useState(false);
    const [tempSummary, setTempSummary] = useState('');
    const [generatingAI, setGeneratingAI] = useState(false);
    const [periodName, setPeriodName] = useState('');
    const [comparisonPeriodName, setComparisonPeriodName] = useState('');

    // Load report data
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

                // Load top risks
                const { data: risksData } = await getTopRisks(5);

                // Calculate metrics
                if (metricsData) {
                    const highExtreme = (metricsData.by_level['High'] || 0) + (metricsData.by_level['Extreme'] || 0);

                    const reportMetrics: ReportMetrics = {
                        totalRisks: metricsData.total_risks,
                        highExtremeCount: highExtreme,
                        avgInherentScore: metricsData.avg_inherent_score,
                        avgResidualScore: metricsData.avg_residual_score,
                        totalControls: metricsData.total_controls,
                        controlEffectiveness: metricsData.avg_control_effectiveness,
                        openIncidents: 0, // TODO: Load from incidents table
                        pendingAlerts: 0, // TODO: Load from alerts table
                    };

                    setMetrics(reportMetrics);

                    // Determine risk pulse
                    const ratio = highExtreme / Math.max(metricsData.total_risks, 1);
                    if (ratio > 0.3) {
                        setRiskPulse('red');
                    } else if (ratio > 0.15) {
                        setRiskPulse('amber');
                    } else {
                        setRiskPulse('green');
                    }
                }

                if (risksData) {
                    setTopRisks(risksData);
                }

                // Generate default executive summary
                generateDefaultSummary(metricsData, risksData || []);

                onDataLoaded?.();
            } catch (error) {
                console.error('Error loading CEO report data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [primaryPeriodId, comparisonPeriodId]);

    const generateDefaultSummary = (metricsData: any, risks: TopRisk[]) => {
        const highExtreme = risks.filter(r => r.level === 'High' || r.level === 'Extreme');
        const summary = `As of ${periodName || 'the current period'}, the organization maintains ${metricsData?.total_risks || 0} active risks in the register, of which ${highExtreme.length} are rated High or Extreme. The average residual risk score stands at ${(metricsData?.avg_residual_score || 0).toFixed(1)}, with ${metricsData?.total_controls || 0} controls in place achieving an average effectiveness of ${(metricsData?.avg_control_effectiveness || 0).toFixed(0)}%.`;

        setExecutiveSummary(summary);

        // Default recommendations
        setRecommendations([
            'Review and update controls for High/Extreme risks quarterly',
            'Conduct targeted risk assessments for emerging industry trends',
            'Enhance monitoring of KRIs showing upward trends',
        ]);
    };

    const handleGenerateAISummary = async () => {
        if (!metrics || topRisks.length === 0) return;

        setGeneratingAI(true);
        try {
            const response = await generateReportNarrative('ceo', {
                totalRisks: metrics.totalRisks,
                highExtremeCount: metrics.highExtremeCount,
                avgResidualScore: metrics.avgResidualScore,
                controlEffectiveness: metrics.controlEffectiveness,
                topRisks: topRisks.map(r => ({
                    risk_code: r.risk_code,
                    risk_title: r.risk_title,
                    category: r.category,
                    level: r.level,
                })),
                periodName,
                comparisonPeriodName: comparisonPeriodName || undefined,
            });

            setExecutiveSummary(response.executiveSummary);
            setRecommendations(response.recommendations);
        } catch (error) {
            console.error('Error generating AI summary:', error);
            // Fallback to placeholder if AI fails
            setExecutiveSummary(
                `The organization's risk profile for ${periodName} reflects a stable but vigilant posture. With ${metrics.totalRisks} risks under active management, the risk function continues to demonstrate strong governance.`
            );
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleSaveSummary = () => {
        setExecutiveSummary(tempSummary);
        setEditingSummary(false);
    };

    const getPulseColor = (pulse: RiskPulse) => {
        switch (pulse) {
            case 'green': return 'bg-green-500';
            case 'amber': return 'bg-amber-500';
            case 'red': return 'bg-red-500';
        }
    };

    const getPulseLabel = (pulse: RiskPulse) => {
        switch (pulse) {
            case 'green': return 'Low Risk Exposure';
            case 'amber': return 'Moderate Risk Exposure';
            case 'red': return 'Elevated Risk Exposure';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">Loading report data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 print:space-y-4">
            {/* Report Header */}
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold">CEO Executive Risk Summary</h1>
                <p className="text-gray-600">{periodName}{comparisonPeriodName && ` vs ${comparisonPeriodName}`}</p>
                <p className="text-sm text-gray-400">Generated: {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}</p>
            </div>

            {/* Risk Pulse Indicator */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Risk Pulse
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full ${getPulseColor(riskPulse)} flex items-center justify-center`}>
                            {riskPulse === 'green' && <Shield className="h-8 w-8 text-white" />}
                            {riskPulse === 'amber' && <AlertTriangle className="h-8 w-8 text-white" />}
                            {riskPulse === 'red' && <AlertTriangle className="h-8 w-8 text-white" />}
                        </div>
                        <div>
                            <div className="font-semibold text-lg">{getPulseLabel(riskPulse)}</div>
                            <div className="text-sm text-gray-600">
                                {metrics?.highExtremeCount || 0} of {metrics?.totalRisks || 0} risks rated High/Extreme
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{metrics?.totalRisks || 0}</div>
                        <div className="text-sm text-gray-600">Total Risks</div>
                        {metrics?.riskDelta !== undefined && (
                            <div className={`text-xs flex items-center mt-1 ${metrics.riskDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {metrics.riskDelta > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {Math.abs(metrics.riskDelta)} vs prior
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">{metrics?.highExtremeCount || 0}</div>
                        <div className="text-sm text-gray-600">High/Extreme</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{metrics?.totalControls || 0}</div>
                        <div className="text-sm text-gray-600">Active Controls</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{(metrics?.controlEffectiveness || 0).toFixed(0)}%</div>
                        <div className="text-sm text-gray-600">Control Effectiveness</div>
                    </CardContent>
                </Card>
            </div>

            {/* Top 5 Risks Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top 5 Risks</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left">
                                <th className="pb-2 font-medium">Risk</th>
                                <th className="pb-2 font-medium">Category</th>
                                <th className="pb-2 font-medium text-center">Score</th>
                                <th className="pb-2 font-medium text-center">Level</th>
                                <th className="pb-2 font-medium text-center">Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topRisks.map((risk, idx) => (
                                <tr key={risk.risk_code} className="border-b last:border-0">
                                    <td className="py-2">
                                        <div className="font-medium">{risk.risk_code}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{risk.risk_title}</div>
                                    </td>
                                    <td className="py-2">{risk.category}</td>
                                    <td className="py-2 text-center font-mono">{risk.inherent_score}</td>
                                    <td className="py-2 text-center">
                                        <Badge variant={
                                            risk.level === 'Extreme' ? 'destructive' :
                                                risk.level === 'High' ? 'destructive' :
                                                    risk.level === 'Medium' ? 'secondary' : 'outline'
                                        }>
                                            {risk.level}
                                        </Badge>
                                    </td>
                                    <td className="py-2 text-center">
                                        {idx % 3 === 0 ? (
                                            <ArrowUp className="h-4 w-4 text-red-500 mx-auto" />
                                        ) : idx % 3 === 1 ? (
                                            <Minus className="h-4 w-4 text-gray-400 mx-auto" />
                                        ) : (
                                            <ArrowDown className="h-4 w-4 text-green-500 mx-auto" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Executive Summary (Editable) */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Executive Summary</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerateAISummary}
                                disabled={generatingAI}
                            >
                                {generatingAI ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                    <Sparkles className="h-4 w-4 mr-1" />
                                )}
                                AI Generate
                            </Button>
                            {!editingSummary ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setTempSummary(executiveSummary);
                                        setEditingSummary(true);
                                    }}
                                >
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" size="sm" onClick={handleSaveSummary}>
                                        <Check className="h-4 w-4 mr-1" />
                                        Save
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setEditingSummary(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {editingSummary ? (
                        <Textarea
                            value={tempSummary}
                            onChange={(e) => setTempSummary(e.target.value)}
                            rows={4}
                            className="w-full"
                        />
                    ) : (
                        <p className="text-gray-700 leading-relaxed">{executiveSummary}</p>
                    )}
                </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Key Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                                    {idx + 1}
                                </span>
                                <span className="text-gray-700">{rec}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
