/**
 * Breach Dashboard Component
 *
 * Displays active breaches with:
 * - Summary statistics
 * - Breach list with severity indicators
 * - Acknowledgment workflow
 * - Resolution tracking
 * - Escalation status
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
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Clock,
    TrendingUp,
    Users,
    Loader2,
    ShieldAlert,
    ArrowUpRight,
} from 'lucide-react';
import {
    getActiveBreaches,
    acknowledgeBreach,
    resolveBreach,
    getBreachStatistics,
    type BreachRecord,
    type BreachType,
    type BreachSeverity,
    type BreachStatus,
} from '@/lib/breachManagement';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

// Database record type (snake_case from Supabase)
interface BreachWithDetails {
    id: string;
    organization_id: string;
    tolerance_id: string | null;
    limit_id: string | null;
    breach_type: string;
    breach_date: string;
    breach_value: number;
    threshold_value: number;
    variance_amount: number;
    variance_percentage: number;
    severity: string;
    status: string;
    root_cause: string | null;
    resolution_notes: string | null;
    escalated_to_cro: boolean;
    escalated_to_board: boolean;
    tolerance?: {
        metric_name: string;
        metric_type: string;
        appetite_category?: {
            risk_category: string;
            appetite_level: string;
        };
    };
}

interface BreachStats {
    total: number;
    open: number;
    byType: Record<BreachType, number>;
    bySeverity: Record<BreachSeverity, number>;
    avgResolutionDays: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSeverityColor(severity: BreachSeverity): string {
    const colors: Record<BreachSeverity, string> = {
        LOW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        MEDIUM: 'bg-orange-100 text-orange-800 border-orange-200',
        HIGH: 'bg-red-100 text-red-800 border-red-200',
        CRITICAL: 'bg-red-600 text-white border-red-700',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
}

function getBreachTypeIcon(breachType: BreachType) {
    switch (breachType) {
        case 'SOFT':
            return <AlertCircle className="h-4 w-4" />;
        case 'HARD':
            return <AlertTriangle className="h-4 w-4" />;
        case 'CRITICAL':
            return <ShieldAlert className="h-4 w-4" />;
    }
}

function getStatusColor(status: BreachStatus): string {
    const colors: Record<BreachStatus, string> = {
        OPEN: 'bg-red-100 text-red-800',
        ACKNOWLEDGED: 'bg-blue-100 text-blue-800',
        INVESTIGATING: 'bg-purple-100 text-purple-800',
        REMEDIATION_IN_PROGRESS: 'bg-amber-100 text-amber-800',
        PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        RESOLVED: 'bg-green-100 text-green-800',
        CLOSED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function formatDate(dateString: string | null): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BreachDashboard() {
    const [breaches, setBreaches] = useState<BreachWithDetails[]>([]);
    const [stats, setStats] = useState<BreachStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [organizationId, setOrganizationId] = useState<string | null>(null);

    // Dialog state
    const [selectedBreach, setSelectedBreach] = useState<BreachWithDetails | null>(null);
    const [actionType, setActionType] = useState<'acknowledge' | 'resolve' | null>(null);
    const [actionNotes, setActionNotes] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

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

    // Load breaches
    const loadBreaches = useCallback(async () => {
        if (!organizationId) return;

        setLoading(true);
        try {
            const { data } = await getActiveBreaches(organizationId);
            setBreaches((data as unknown as BreachWithDetails[]) || []);

            const statsData = await getBreachStatistics(organizationId);
            setStats(statsData);
        } catch (err) {
            console.error('Error loading breaches:', err);
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        if (organizationId) {
            loadBreaches();
        }
    }, [organizationId, loadBreaches]);

    // Handle actions
    const handleAcknowledge = async () => {
        if (!selectedBreach) return;

        setActionLoading(true);
        const { success, error } = await acknowledgeBreach(selectedBreach.id, actionNotes);

        if (success) {
            await loadBreaches();
            setSelectedBreach(null);
            setActionType(null);
            setActionNotes('');
        } else {
            console.error('Error acknowledging breach:', error);
        }
        setActionLoading(false);
    };

    const handleResolve = async () => {
        if (!selectedBreach) return;

        setActionLoading(true);
        const { success, error } = await resolveBreach(selectedBreach.id, actionNotes);

        if (success) {
            await loadBreaches();
            setSelectedBreach(null);
            setActionType(null);
            setActionNotes('');
        } else {
            console.error('Error resolving breach:', error);
        }
        setActionLoading(false);
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Breach Dashboard</h2>
                    <p className="text-muted-foreground">
                        Monitor and manage tolerance breaches
                    </p>
                </div>
                <Button onClick={loadBreaches} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Open Breaches</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.open}</div>
                            <p className="text-xs text-muted-foreground">
                                of {stats.total} total
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Critical</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {stats.bySeverity.CRITICAL}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Require immediate action
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Hard Limits</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {stats.byType.HARD}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Escalated to CRO
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Resolution</CardTitle>
                            <Clock className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.avgResolutionDays}</div>
                            <p className="text-xs text-muted-foreground">
                                days to resolve
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Breach List */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Breaches</CardTitle>
                    <CardDescription>
                        {breaches.length} breach{breaches.length !== 1 ? 'es' : ''} requiring attention
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {breaches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                            <h3 className="text-lg font-medium">No Active Breaches</h3>
                            <p className="text-muted-foreground">
                                All tolerance metrics are within acceptable limits
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {breaches.map((breach) => (
                                <div
                                    key={breach.id}
                                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-full ${getSeverityColor(breach.severity as BreachSeverity)}`}>
                                            {getBreachTypeIcon(breach.breach_type as BreachType)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium">
                                                    {breach.tolerance?.metric_name || 'Unknown Metric'}
                                                </h4>
                                                <Badge className={getSeverityColor(breach.severity as BreachSeverity)}>
                                                    {breach.severity}
                                                </Badge>
                                                <Badge variant="outline" className={getStatusColor(breach.status as BreachStatus)}>
                                                    {breach.status.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {breach.tolerance?.appetite_category?.risk_category || 'Uncategorized'} •
                                                {breach.breach_type} breach
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="text-red-600 font-medium">
                                                    Value: {breach.breach_value}
                                                </span>
                                                <span className="text-gray-500">
                                                    Threshold: {breach.threshold_value}
                                                </span>
                                                <span className="text-orange-600">
                                                    +{breach.variance_percentage?.toFixed(1)}% over
                                                </span>
                                            </div>
                                            {breach.escalated_to_cro && (
                                                <div className="flex items-center gap-1 mt-2 text-sm text-purple-600">
                                                    <Users className="h-3 w-3" />
                                                    Escalated to CRO
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">
                                                Detected: {formatDate(breach.breach_date)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {breach.status === 'OPEN' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedBreach(breach);
                                                    setActionType('acknowledge');
                                                }}
                                            >
                                                Acknowledge
                                            </Button>
                                        )}
                                        {['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'REMEDIATION_IN_PROGRESS'].includes(breach.status) && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedBreach(breach);
                                                    setActionType('resolve');
                                                }}
                                            >
                                                Resolve
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Dialog */}
            <Dialog open={!!actionType} onOpenChange={() => {
                setActionType(null);
                setSelectedBreach(null);
                setActionNotes('');
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'acknowledge' ? 'Acknowledge Breach' : 'Resolve Breach'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'acknowledge'
                                ? 'Confirm that you have reviewed this breach and are taking action.'
                                : 'Document the resolution and close this breach.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBreach && (
                        <div className="py-4">
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                <h4 className="font-medium">{selectedBreach.tolerance?.metric_name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Value: {selectedBreach.breach_value} (Threshold: {selectedBreach.threshold_value})
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {actionType === 'acknowledge' ? 'Review Notes' : 'Resolution Notes'}
                                </label>
                                <Textarea
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                    placeholder={
                                        actionType === 'acknowledge'
                                            ? 'Notes on initial review and planned actions...'
                                            : 'Describe the root cause and resolution actions taken...'
                                    }
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setActionType(null);
                                setSelectedBreach(null);
                                setActionNotes('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={actionType === 'acknowledge' ? handleAcknowledge : handleResolve}
                            disabled={actionLoading || !actionNotes.trim()}
                        >
                            {actionLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : actionType === 'acknowledge' ? (
                                'Acknowledge'
                            ) : (
                                'Mark Resolved'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
