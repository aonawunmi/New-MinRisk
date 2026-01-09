/**
 * ReportHub Component
 *
 * Central hub for generating stakeholder reports:
 * - CEO Executive Summary
 * - Board Risk Committee Report
 * - Regulatory Reports (CBN, SEC, PENCOM)
 *
 * Features:
 * - Report type selector
 * - Multi-period comparison support
 * - On-screen preview with edit capabilities
 * - PDF export
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    FileText,
    Users,
    Building2,
    Loader2,
    Download,
    Eye,
    RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CEOReport from './CEOReport';
import BoardReport from './BoardReport';
import RegulatoryReport from './RegulatoryReport';
import { exportToPDF, generateReportFilename } from '@/lib/pdfExport';

// Report type definitions
type ReportType = 'ceo' | 'board' | 'regulatory';
type RegulatorType = 'cbn' | 'sec' | 'pencom';

interface Period {
    id: string; // format: "YYYY-Q"
    name: string;
    year: number;
    quarter: number;
    is_active: boolean;
}

interface ReportConfig {
    type: ReportType;
    regulator?: RegulatorType;
    primaryPeriod: string;
    comparisonPeriod?: string;
}

const REPORT_TYPES = [
    {
        id: 'ceo' as ReportType,
        name: 'CEO Executive Summary',
        description: 'High-level risk snapshot for executive decision-making',
        icon: FileText,
        pages: '1-2 pages',
    },
    {
        id: 'board' as ReportType,
        name: 'Board Risk Committee Report',
        description: 'Comprehensive governance report for quarterly Board meetings',
        icon: Users,
        pages: '5-8 pages',
    },
    {
        id: 'regulatory' as ReportType,
        name: 'Regulatory Compliance Report',
        description: 'Compliance submission for CBN, SEC, or PENCOM',
        icon: Building2,
        pages: 'Variable',
    },
];

const REGULATORS = [
    { id: 'cbn' as RegulatorType, name: 'Central Bank of Nigeria (CBN)', description: 'Banking sector regulations' },
    { id: 'sec' as RegulatorType, name: 'Securities & Exchange Commission (SEC)', description: 'Capital market regulations' },
    { id: 'pencom' as RegulatorType, name: 'National Pension Commission (PENCOM)', description: 'Pension industry regulations' },
];

export default function ReportHub() {
    // State
    const [periods, setPeriods] = useState<Period[]>([]);
    const [loadingPeriods, setLoadingPeriods] = useState(true);
    const [selectedType, setSelectedType] = useState<ReportType | null>(null);
    const [selectedRegulator, setSelectedRegulator] = useState<RegulatorType>('cbn');
    const [primaryPeriod, setPrimaryPeriod] = useState<string>('');
    const [comparisonPeriod, setComparisonPeriod] = useState<string>('');
    const [generating, setGenerating] = useState(false);
    const [reportReady, setReportReady] = useState(false);
    const [exporting, setExporting] = useState(false);
    const reportContainerRef = useRef<HTMLDivElement>(null);

    // Load available periods
    useEffect(() => {
        async function loadPeriods() {
            try {
                // Get committed periods from period_commits table
                const { data, error } = await supabase
                    .from('period_commits')
                    .select('period_year, period_quarter, committed_at')
                    .order('period_year', { ascending: false })
                    .order('period_quarter', { ascending: false });

                if (error) throw error;

                // Transform to Period format
                const transformedPeriods: Period[] = (data || []).map(p => ({
                    id: `${p.period_year}-${p.period_quarter}`,
                    name: `Q${p.period_quarter} ${p.period_year}`,
                    year: p.period_year,
                    quarter: p.period_quarter,
                    is_active: false, // Will be set below
                }));

                // Also get active period from active_period view
                const { data: activePeriodData } = await supabase
                    .from('active_period')
                    .select('current_period_year, current_period_quarter')
                    .limit(1)
                    .single();

                if (activePeriodData) {
                    const activeId = `${activePeriodData.current_period_year}-${activePeriodData.current_period_quarter}`;

                    // Check if active period exists in committed periods
                    const existing = transformedPeriods.find(p => p.id === activeId);
                    if (existing) {
                        existing.is_active = true;
                    } else {
                        // Add the active period if not yet committed
                        transformedPeriods.unshift({
                            id: activeId,
                            name: `Q${activePeriodData.current_period_quarter} ${activePeriodData.current_period_year} (Current)`,
                            year: activePeriodData.current_period_year,
                            quarter: activePeriodData.current_period_quarter,
                            is_active: true,
                        });
                    }
                }

                // If no periods at all, add current quarter
                if (transformedPeriods.length === 0) {
                    const now = new Date();
                    const currentQ = Math.floor(now.getMonth() / 3) + 1;
                    const currentY = now.getFullYear();
                    transformedPeriods.push({
                        id: `${currentY}-${currentQ}`,
                        name: `Q${currentQ} ${currentY} (Current)`,
                        year: currentY,
                        quarter: currentQ,
                        is_active: true,
                    });
                }

                setPeriods(transformedPeriods);

                // Set default to active period
                const activePeriod = transformedPeriods.find(p => p.is_active);
                if (activePeriod) {
                    setPrimaryPeriod(activePeriod.id);
                    // Set comparison to previous period if available
                    const activeIndex = transformedPeriods.findIndex(p => p.id === activePeriod.id);
                    if (transformedPeriods[activeIndex + 1]) {
                        setComparisonPeriod(transformedPeriods[activeIndex + 1].id);
                    }
                } else if (transformedPeriods.length > 0) {
                    setPrimaryPeriod(transformedPeriods[0].id);
                }
            } catch (error) {
                console.error('Error loading periods:', error);
            } finally {
                setLoadingPeriods(false);
            }
        }

        loadPeriods();
    }, []);

    const handleGenerateReport = async () => {
        if (!selectedType || !primaryPeriod) return;

        setGenerating(true);
        setReportReady(false);

        try {
            // TODO: Generate report based on config
            const config: ReportConfig = {
                type: selectedType,
                regulator: selectedType === 'regulatory' ? selectedRegulator : undefined,
                primaryPeriod,
                comparisonPeriod: comparisonPeriod || undefined,
            };

            console.log('Generating report with config:', config);

            // Simulate generation time
            await new Promise(resolve => setTimeout(resolve, 1500));

            setReportReady(true);
        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setGenerating(false);
        }
    };

    const selectedReportInfo = REPORT_TYPES.find(r => r.id === selectedType);

    const handleExportPDF = async () => {
        if (!reportContainerRef.current || !selectedType) return;

        setExporting(true);
        try {
            const periodName = periods.find(p => p.id === primaryPeriod)?.name || 'Report';
            const filename = generateReportFilename(
                selectedType,
                periodName,
                selectedType === 'regulatory' ? selectedRegulator : undefined
            );

            await exportToPDF(reportContainerRef.current, {
                filename,
                margin: 10,
                pageSize: 'a4',
                orientation: selectedType === 'board' ? 'portrait' : 'portrait',
            });
        } catch (error) {
            console.error('Error exporting PDF:', error);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Stakeholder Reports</h3>
                    <p className="text-sm text-gray-600">
                        Generate tailored reports for executives, board, and regulators
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Report Type Selection */}
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">1. Select Report Type</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {REPORT_TYPES.map((report) => {
                                const Icon = report.icon;
                                const isSelected = selectedType === report.id;
                                return (
                                    <button
                                        key={report.id}
                                        onClick={() => setSelectedType(report.id)}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm">{report.name}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{report.description}</div>
                                                <div className="text-xs text-gray-400 mt-1">{report.pages}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Regulator Selection (only for regulatory reports) */}
                    {selectedType === 'regulatory' && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Select Regulator</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {REGULATORS.map((reg) => (
                                    <button
                                        key={reg.id}
                                        onClick={() => setSelectedRegulator(reg.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedRegulator === reg.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="font-medium text-sm">{reg.name}</div>
                                        <div className="text-xs text-gray-500">{reg.description}</div>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Configuration Panel */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">2. Configure Report</CardTitle>
                            <CardDescription>
                                Select periods for comparison and customize report settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingPeriods ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Primary Period *</Label>
                                            <Select value={primaryPeriod} onValueChange={setPrimaryPeriod}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select period" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {periods.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name} {p.is_active && '(Active)'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Comparison Period (Optional)</Label>
                                            <Select
                                                value={comparisonPeriod || 'none'}
                                                onValueChange={(val) => setComparisonPeriod(val === 'none' ? '' : val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select for comparison" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No comparison</SelectItem>
                                                    {periods
                                                        .filter(p => p.id !== primaryPeriod)
                                                        .map((p) => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {selectedType && (
                                        <Alert className="bg-blue-50 border-blue-200">
                                            <AlertDescription className="text-sm">
                                                <strong>{selectedReportInfo?.name}</strong> will include{' '}
                                                {comparisonPeriod ? 'period-over-period comparison' : 'single period data'}.
                                                {selectedType === 'regulatory' && (
                                                    <> Using <strong>{REGULATORS.find(r => r.id === selectedRegulator)?.name}</strong> template.</>
                                                )}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            onClick={handleGenerateReport}
                                            disabled={!selectedType || !primaryPeriod || generating}
                                            className="flex-1"
                                        >
                                            {generating ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Preview Report
                                                </>
                                            )}
                                        </Button>

                                        {reportReady && (
                                            <Button
                                                variant="outline"
                                                onClick={handleExportPDF}
                                                disabled={exporting}
                                            >
                                                {exporting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Exporting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Export PDF
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Report Preview Area */}
                    {reportReady && (
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">Report Preview</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={handleGenerateReport}>
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                        Regenerate
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div ref={reportContainerRef} className="border rounded-lg p-6 min-h-[400px] bg-white overflow-auto">
                                    {selectedType === 'ceo' && (
                                        <CEOReport
                                            primaryPeriodId={primaryPeriod}
                                            comparisonPeriodId={comparisonPeriod || undefined}
                                        />
                                    )}
                                    {selectedType === 'board' && (
                                        <BoardReport
                                            primaryPeriodId={primaryPeriod}
                                            comparisonPeriodId={comparisonPeriod || undefined}
                                        />
                                    )}
                                    {selectedType === 'regulatory' && (
                                        <RegulatoryReport
                                            primaryPeriodId={primaryPeriod}
                                            comparisonPeriodId={comparisonPeriod || undefined}
                                            regulator={selectedRegulator}
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
