/**
 * RAF Management Page
 *
 * Main administration interface for Risk Appetite Framework:
 * - Appetite statement management
 * - Category configuration
 * - Tolerance/limit management
 * - KRI auto-generation
 * - Breach overview
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    AlertTriangle,
    CheckCircle,
    FileText,
    Gauge,
    Loader2,
    Plus,
    Settings,
    ShieldAlert,
    Target,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    getOrganizationAppetiteSummary,
    generateKRIFromTolerance,
    recalculateAllRAFScores,
    type AppetiteLevel,
} from '@/lib/rafEngine';
import { getBreachStatistics } from '@/lib/breachManagement';
import BreachDashboard from './BreachDashboard';

// ============================================================================
// TYPES
// ============================================================================

interface AppetiteStatement {
    id: string;
    version_number: number;
    statement_text: string;
    effective_from: string;
    status: 'DRAFT' | 'APPROVED' | 'SUPERSEDED' | 'ARCHIVED';
    approved_by: string | null;
    approved_at: string | null;
}

interface AppetiteCategory {
    id: string;
    statement_id: string;
    risk_category: string;
    appetite_level: AppetiteLevel;
    rationale: string | null;
}

interface ToleranceMetric {
    id: string;
    appetite_category_id: string;
    metric_name: string;
    metric_type: 'RANGE' | 'MAXIMUM' | 'MINIMUM' | 'DIRECTIONAL';
    unit: string;
    green_max: number | null;
    amber_max: number | null;
    red_min: number | null;
    is_active: boolean;
}

interface RiskLimit {
    id: string;
    tolerance_id: string;
    soft_limit: number;
    hard_limit: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAppetiteLevelColor(level: AppetiteLevel): string {
    const colors: Record<AppetiteLevel, string> = {
        ZERO: 'bg-red-100 text-red-800 border-red-200',
        LOW: 'bg-orange-100 text-orange-800 border-orange-200',
        MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        HIGH: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[level];
}

function getMultiplierForLevel(level: AppetiteLevel): number {
    const multipliers: Record<AppetiteLevel, number> = {
        ZERO: 2.0,
        LOW: 1.5,
        MODERATE: 1.0,
        HIGH: 0.8,
    };
    return multipliers[level];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RAFManagement() {
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Data state
    const [statements, setStatements] = useState<AppetiteStatement[]>([]);
    const [categories, setCategories] = useState<AppetiteCategory[]>([]);
    const [tolerances, setTolerances] = useState<ToleranceMetric[]>([]);
    const [limits, setLimits] = useState<RiskLimit[]>([]);
    const [summary, setSummary] = useState<Awaited<ReturnType<typeof getOrganizationAppetiteSummary>> | null>(null);
    const [breachStats, setBreachStats] = useState<Awaited<ReturnType<typeof getBreachStatistics>> | null>(null);

    // Dialog state
    const [showAddLimit, setShowAddLimit] = useState(false);
    const [selectedTolerance, setSelectedTolerance] = useState<ToleranceMetric | null>(null);
    const [limitForm, setLimitForm] = useState({ soft: '', hard: '' });
    const [recalculating, setRecalculating] = useState(false);

    // Load organization ID
    useEffect(() => {
        async function loadOrgId() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    setOrganizationId(profile.organization_id);
                }
            }
        }
        loadOrgId();
    }, []);

    // Load all RAF data
    const loadData = useCallback(async () => {
        if (!organizationId) return;

        setLoading(true);
        try {
            // Load statements
            const { data: stmts } = await supabase
                .from('risk_appetite_statements')
                .select('*')
                .eq('organization_id', organizationId)
                .order('version_number', { ascending: false });
            setStatements(stmts || []);

            // Load categories
            const { data: cats } = await supabase
                .from('risk_appetite_categories')
                .select('*')
                .eq('organization_id', organizationId);
            setCategories(cats || []);

            // Load tolerances
            const { data: tols } = await supabase
                .from('appetite_kri_thresholds')
                .select('*')
                .eq('organization_id', organizationId);
            setTolerances(tols || []);

            // Load limits
            const { data: lims } = await supabase
                .from('risk_limits')
                .select('*')
                .eq('organization_id', organizationId);
            setLimits(lims || []);

            // Load summary
            const summaryData = await getOrganizationAppetiteSummary(organizationId);
            setSummary(summaryData);

            // Load breach stats
            const stats = await getBreachStatistics(organizationId);
            setBreachStats(stats);

        } catch (err) {
            console.error('Error loading RAF data:', err);
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        if (organizationId) {
            loadData();
        }
    }, [organizationId, loadData]);

    // Handle recalculate all scores
    const handleRecalculateScores = async () => {
        if (!organizationId) return;

        setRecalculating(true);
        try {
            const result = await recalculateAllRAFScores(organizationId);
            console.log(`Recalculated RAF scores: ${result.updated} updated, ${result.errors} errors`);
            await loadData();
        } catch (err) {
            console.error('Error recalculating scores:', err);
        } finally {
            setRecalculating(false);
        }
    };

    // Handle add limit
    const handleAddLimit = async () => {
        if (!selectedTolerance || !organizationId) return;

        try {
            await supabase
                .from('risk_limits')
                .insert([{
                    organization_id: organizationId,
                    tolerance_id: selectedTolerance.id,
                    soft_limit: parseFloat(limitForm.soft),
                    hard_limit: parseFloat(limitForm.hard),
                }]);

            await loadData();
            setShowAddLimit(false);
            setSelectedTolerance(null);
            setLimitForm({ soft: '', hard: '' });
        } catch (err) {
            console.error('Error adding limit:', err);
        }
    };

    // Handle generate KRI from tolerance
    const handleGenerateKRI = async (toleranceId: string) => {
        try {
            const { data: mapping, error } = await generateKRIFromTolerance(toleranceId);
            if (mapping) {
                console.log('Generated KRI mapping:', mapping);
                // Here you would create or update a KRI with these thresholds
            }
        } catch (err) {
            console.error('Error generating KRI:', err);
        }
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const currentStatement = statements.find(s => s.status === 'APPROVED');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Risk Appetite Framework</h1>
                    <p className="text-muted-foreground">
                        Configure and monitor your organization's risk appetite
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRecalculateScores}
                        disabled={recalculating}
                    >
                        {recalculating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Recalculating...
                            </>
                        ) : (
                            <>
                                <Zap className="mr-2 h-4 w-4" />
                                Recalculate All Scores
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="categories">
                        <Target className="mr-2 h-4 w-4" />
                        Categories
                    </TabsTrigger>
                    <TabsTrigger value="tolerances">
                        <Gauge className="mr-2 h-4 w-4" />
                        Tolerances & Limits
                    </TabsTrigger>
                    <TabsTrigger value="breaches">
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Breaches
                        {breachStats && breachStats.open > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {breachStats.open}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Current Statement */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Current Appetite Statement
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {currentStatement ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-green-100 text-green-800">
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                            APPROVED
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            Version {currentStatement.version_number}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            Effective from {new Date(currentStatement.effective_from).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <blockquote className="border-l-4 border-primary pl-4 italic">
                                        "{currentStatement.statement_text}"
                                    </blockquote>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>No approved appetite statement</p>
                                    <p className="text-sm">Create and approve a statement in Admin → Appetite & Tolerance</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary Stats */}
                    {summary && (
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.summary.total}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-red-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-red-600">Zero/Low Appetite</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-600">
                                        {summary.summary.byLevel.ZERO + summary.summary.byLevel.LOW}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Require tight controls</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Moderate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.summary.byLevel.MODERATE}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-green-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-green-600">High Appetite</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        {summary.summary.byLevel.HIGH}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Breach Summary */}
                    {breachStats && breachStats.open > 0 && (
                        <Card className="border-red-200 bg-red-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-800">
                                    <AlertTriangle className="h-5 w-5" />
                                    Active Breaches Require Attention
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-6">
                                    <div>
                                        <span className="text-3xl font-bold text-red-600">{breachStats.open}</span>
                                        <span className="text-sm text-red-700 ml-2">open breaches</span>
                                    </div>
                                    {breachStats.bySeverity.CRITICAL > 0 && (
                                        <Badge variant="destructive">
                                            {breachStats.bySeverity.CRITICAL} CRITICAL
                                        </Badge>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="ml-auto"
                                        onClick={() => setActiveTab('breaches')}
                                    >
                                        View Breaches
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Appetite by Category</CardTitle>
                            <CardDescription>
                                Risk categories with their appetite levels and multipliers
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {categories.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>No categories configured</p>
                                    <p className="text-sm">Configure categories in Admin → Appetite & Tolerance</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {categories.map((cat) => {
                                        const catSummary = summary?.categories.find(
                                            c => c.category === cat.risk_category
                                        );
                                        return (
                                            <div
                                                key={cat.id}
                                                className="flex items-center justify-between p-4 border rounded-lg"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Badge className={getAppetiteLevelColor(cat.appetite_level)}>
                                                        {cat.appetite_level}
                                                    </Badge>
                                                    <div>
                                                        <h4 className="font-medium">{cat.risk_category}</h4>
                                                        {cat.rationale && (
                                                            <p className="text-sm text-muted-foreground">{cat.rationale}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 text-sm">
                                                    <div className="text-right">
                                                        <div className="font-medium">
                                                            {getMultiplierForLevel(cat.appetite_level)}x
                                                        </div>
                                                        <div className="text-muted-foreground">multiplier</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium">{catSummary?.risksCount || 0}</div>
                                                        <div className="text-muted-foreground">risks</div>
                                                    </div>
                                                    {(catSummary?.outOfAppetiteCount || 0) > 0 && (
                                                        <Badge variant="destructive">
                                                            {catSummary?.outOfAppetiteCount} out of appetite
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tolerances Tab */}
                <TabsContent value="tolerances" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tolerance Metrics & Limits</CardTitle>
                            <CardDescription>
                                Quantified thresholds with soft and hard limits
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {tolerances.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Gauge className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>No tolerance metrics configured</p>
                                    <p className="text-sm">Configure tolerances in Admin → Appetite & Tolerance</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {tolerances.map((tol) => {
                                        const tolLimits = limits.filter(l => l.tolerance_id === tol.id);
                                        const category = categories.find(c => c.id === tol.appetite_category_id);
                                        return (
                                            <div
                                                key={tol.id}
                                                className="p-4 border rounded-lg"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-medium">{tol.metric_name}</h4>
                                                            {tol.is_active ? (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                                                            ) : (
                                                                <Badge variant="outline">Inactive</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {category?.risk_category || 'Uncategorized'} • {tol.metric_type} • {tol.unit}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleGenerateKRI(tol.id)}
                                                        >
                                                            <Zap className="mr-1 h-3 w-3" />
                                                            Generate KRI
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedTolerance(tol);
                                                                setShowAddLimit(true);
                                                            }}
                                                        >
                                                            <Plus className="mr-1 h-3 w-3" />
                                                            Add Limit
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Thresholds */}
                                                <div className="flex gap-4 mt-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                                        <span className="text-sm">Green: ≤{tol.green_max}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                                                        <span className="text-sm">Amber: ≤{tol.amber_max}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                                        <span className="text-sm">Red: ≥{tol.red_min}</span>
                                                    </div>
                                                </div>

                                                {/* Limits */}
                                                {tolLimits.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <span className="text-sm font-medium">Limits:</span>
                                                        {tolLimits.map(limit => (
                                                            <div key={limit.id} className="flex gap-4 mt-1 text-sm">
                                                                <span className="text-orange-600">Soft: {limit.soft_limit}</span>
                                                                <span className="text-red-600">Hard: {limit.hard_limit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Breaches Tab */}
                <TabsContent value="breaches">
                    <BreachDashboard />
                </TabsContent>
            </Tabs>

            {/* Add Limit Dialog */}
            <Dialog open={showAddLimit} onOpenChange={setShowAddLimit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Limit</DialogTitle>
                        <DialogDescription>
                            Set soft and hard limits for {selectedTolerance?.metric_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Soft Limit (Warning)</Label>
                            <Input
                                type="number"
                                value={limitForm.soft}
                                onChange={(e) => setLimitForm(prev => ({ ...prev, soft: e.target.value }))}
                                placeholder="e.g., 4"
                            />
                            <p className="text-xs text-muted-foreground">Triggers warning notification to CRO</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Hard Limit (Critical)</Label>
                            <Input
                                type="number"
                                value={limitForm.hard}
                                onChange={(e) => setLimitForm(prev => ({ ...prev, hard: e.target.value }))}
                                placeholder="e.g., 6"
                            />
                            <p className="text-xs text-muted-foreground">Triggers mandatory board escalation</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddLimit(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddLimit} disabled={!limitForm.soft || !limitForm.hard}>
                            Add Limit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
