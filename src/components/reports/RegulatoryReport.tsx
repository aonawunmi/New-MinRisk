/**
 * RegulatoryReport Component
 *
 * Compliance Report for Nigerian Regulators (CBN, SEC, PENCOM)
 * - Organization Information
 * - Risk Governance Structure
 * - Risk Taxonomy
 * - Risk Register Extract
 * - Control Environment Summary
 * - KRI Framework
 * - Incident Reporting
 * - Attestation Block
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Shield, AlertTriangle, FileText, Users, Radar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDashboardMetrics, getTopRisks, type TopRisk } from '@/lib/analytics';

type RegulatorType = 'cbn' | 'sec' | 'pencom';

interface RegulatoryReportProps {
    primaryPeriodId: string;
    comparisonPeriodId?: string;
    regulator: RegulatorType;
    onDataLoaded?: () => void;
}

interface OrganizationInfo {
    name: string;
    rcNumber: string;
    licenseType: string;
    industry: string;
}

const REGULATOR_INFO = {
    cbn: {
        name: 'Central Bank of Nigeria',
        shortName: 'CBN',
        circulars: ['BSD/DIR/GEN/LAB/14/001', 'BSD/DIR/GEN/CIR/04/021'],
        focus: 'Banking Sector Risk Management Framework',
    },
    sec: {
        name: 'Securities and Exchange Commission',
        shortName: 'SEC',
        circulars: ['SEC/CMP/DIR/15/2019', 'SEC/CMP/DIR/02/2021'],
        focus: 'Capital Market Operator Risk Management Guidelines',
    },
    pencom: {
        name: 'National Pension Commission',
        shortName: 'PENCOM',
        circulars: ['PEN/R&I/2015/01', 'PEN/CIR/RG/2020/01'],
        focus: 'Pension Industry Risk-Based Supervision Framework',
    },
};

export default function RegulatoryReport({
    primaryPeriodId,
    comparisonPeriodId,
    regulator,
    onDataLoaded,
}: RegulatoryReportProps) {
    const [loading, setLoading] = useState(true);
    const [periodName, setPeriodName] = useState('');
    const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
    const [metrics, setMetrics] = useState<any>(null);
    const [risks, setRisks] = useState<TopRisk[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [controlCount, setControlCount] = useState(0);
    const [incidentCount, setIncidentCount] = useState(0);

    const regulatorInfo = REGULATOR_INFO[regulator];

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Parse period name from ID format "YYYY-Q"
                const parsePeriodId = (id: string) => {
                    const [year, quarter] = id.split('-').map(Number);
                    return { year, quarter, name: `Q${quarter} ${year}` };
                };

                const period = parsePeriodId(primaryPeriodId);
                setPeriodName(period.name || 'Current Period');

                // Get organization info
                const { data: org } = await supabase
                    .from('organizations')
                    .select('name, settings')
                    .limit(1)
                    .single();

                if (org) {
                    setOrgInfo({
                        name: org.name || 'Organization Name',
                        rcNumber: org.settings?.rc_number || 'RC-XXXXXX',
                        licenseType: org.settings?.license_type || 'Operating License',
                        industry: org.settings?.industry_type || 'Financial Services',
                    });
                }

                // Get dashboard metrics
                const { data: metricsData } = await getDashboardMetrics();
                setMetrics(metricsData);

                if (metricsData?.by_category) {
                    setCategories(Object.keys(metricsData.by_category));
                }

                // Get all risks for register extract
                const { data: riskData } = await getTopRisks(50);
                setRisks(riskData || []);

                // Get control count
                const { count: controlsCount } = await supabase
                    .from('controls')
                    .select('*', { count: 'exact', head: true });
                setControlCount(controlsCount || 0);

                // Get incident count
                const { count: incidentsCount } = await supabase
                    .from('incidents')
                    .select('*', { count: 'exact', head: true });
                setIncidentCount(incidentsCount || 0);

                onDataLoaded?.();
            } catch (error) {
                console.error('Error loading regulatory report data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [primaryPeriodId, regulator]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">Loading regulatory report...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 print:space-y-4">
            {/* Report Header */}
            <div className="text-center border-b pb-6">
                <Badge className="mb-2">{regulatorInfo.shortName} Compliance Report</Badge>
                <h1 className="text-2xl font-bold">{regulatorInfo.focus}</h1>
                <p className="text-gray-600 mt-2">Reporting Period: {periodName}</p>
                <p className="text-sm text-gray-400 mt-1">
                    Generated: {new Date().toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                </p>
            </div>

            {/* Section 1: Organization Information */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        1. Organization Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Organization Name:</span>
                            <div className="font-medium">{orgInfo?.name}</div>
                        </div>
                        <div>
                            <span className="text-gray-500">RC Number:</span>
                            <div className="font-medium">{orgInfo?.rcNumber}</div>
                        </div>
                        <div>
                            <span className="text-gray-500">License Type:</span>
                            <div className="font-medium">{orgInfo?.licenseType}</div>
                        </div>
                        <div>
                            <span className="text-gray-500">Industry Classification:</span>
                            <div className="font-medium">{orgInfo?.industry}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Regulatory Reference */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        2. Regulatory Framework Reference
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm space-y-2">
                        <p><strong>Regulator:</strong> {regulatorInfo.name}</p>
                        <p><strong>Applicable Circulars:</strong></p>
                        <ul className="list-disc list-inside text-gray-600">
                            {regulatorInfo.circulars.map((c, i) => (
                                <li key={i}>{c}</li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Section 3: Risk Taxonomy */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        3. Risk Taxonomy & Categories
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                        The organization employs a {categories.length}-category risk taxonomy aligned with {regulatorInfo.shortName} guidelines:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat, idx) => (
                            <Badge key={idx} variant="outline" className="text-sm">
                                {cat} ({metrics?.by_category[cat] || 0})
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Section 4: Risk Register Summary */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        4. Risk Register Extract
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm mb-4">
                        <p><strong>Total Active Risks:</strong> {metrics?.total_risks || 0}</p>
                        <p><strong>High/Extreme Risks:</strong> {(metrics?.by_level?.High || 0) + (metrics?.by_level?.Extreme || 0)}</p>
                    </div>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b text-left bg-gray-50">
                                <th className="p-2 font-medium">Risk Code</th>
                                <th className="p-2 font-medium">Title</th>
                                <th className="p-2 font-medium">Category</th>
                                <th className="p-2 font-medium text-center">Inherent</th>
                                <th className="p-2 font-medium text-center">Residual</th>
                                <th className="p-2 font-medium text-center">Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {risks.slice(0, 15).map((risk) => (
                                <tr key={risk.risk_code} className="border-b">
                                    <td className="p-2 font-mono">{risk.risk_code}</td>
                                    <td className="p-2 max-w-[200px] truncate">{risk.risk_title}</td>
                                    <td className="p-2">{risk.category}</td>
                                    <td className="p-2 text-center">{risk.inherent_score}</td>
                                    <td className="p-2 text-center">{risk.residual_score}</td>
                                    <td className="p-2 text-center">
                                        <Badge variant={risk.level === 'Extreme' || risk.level === 'High' ? 'destructive' : 'secondary'} className="text-xs">
                                            {risk.level}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {risks.length > 15 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Showing 15 of {risks.length} risks. Full register available on request.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Section 5: Control Environment */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        5. Control Environment Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold">{controlCount}</div>
                            <div className="text-sm text-gray-600">Total Controls</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold">{(metrics?.avg_control_effectiveness || 0).toFixed(0)}%</div>
                            <div className="text-sm text-gray-600">Avg Effectiveness</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold">DIME</div>
                            <div className="text-sm text-gray-600">Assessment Framework</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 6: Incident Reporting */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Radar className="h-5 w-5" />
                        6. Incident Reporting Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm">
                        <p><strong>Total Incidents Reported:</strong> {incidentCount}</p>
                        <p className="text-gray-600 mt-2">
                            All incidents are logged, investigated, and tracked to resolution in accordance with
                            {regulatorInfo.shortName} incident reporting requirements.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Section 7: Attestation */}
            <Card className="border-2 border-dashed">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">7. Management Attestation</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 mb-6">
                        I hereby attest that the information contained in this report is accurate and complete to
                        the best of my knowledge, and that the organization maintains adequate risk management
                        practices in compliance with {regulatorInfo.name} guidelines.
                    </p>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="border-t border-gray-400 pt-2 mt-12">
                                <p className="text-sm font-medium">Chief Risk Officer</p>
                                <p className="text-xs text-gray-500">Signature / Date</p>
                            </div>
                        </div>
                        <div>
                            <div className="border-t border-gray-400 pt-2 mt-12">
                                <p className="text-sm font-medium">Chief Executive Officer</p>
                                <p className="text-xs text-gray-500">Signature / Date</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
