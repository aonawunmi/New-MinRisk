/**
 * Super Admin: Platform Metrics & Billing
 * 
 * Shows seat counts per organization for billing purposes.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, TrendingUp, Users, Building2, CreditCard } from 'lucide-react';

interface MetricRow {
    organization_id: string;
    organization_name: string;
    organization_code: string;
    organization_status: string;
    created_at: string;
    total_users: number;
    active_users_last_30d: number;
    admins_count: number;
    regular_users_count: number;
    last_login_at: string | null;
}

export default function PlatformMetrics() {
    const [metrics, setMetrics] = useState<MetricRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMetrics();
    }, []);

    async function loadMetrics() {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_platform_metrics');
            if (error) {
                console.error('Failed to load metrics:', error);
                return;
            }
            setMetrics(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleExportCSV() {
        const headers = [
            'Organization',
            'Code',
            'Status',
            'Total Seats (Billable)',
            'Active Users (30d)',
            'Admins',
            'Standard Users',
            'Created Date',
            'Last Login'
        ];

        const rows = metrics.map(m => [
            m.organization_name,
            m.organization_code,
            m.organization_status,
            m.total_users,
            m.active_users_last_30d,
            m.admins_count,
            m.regular_users_count,
            new Date(m.created_at).toLocaleDateString(),
            m.last_login_at ? new Date(m.last_login_at).toISOString() : 'Never'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `minrisk_billing_metrics_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    const totalSeats = metrics.reduce((acc, curr) => acc + curr.total_users, 0);
    const totalOrgs = metrics.length;
    const activeOrgs = metrics.filter(m => m.organization_status === 'active').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Platform Metrics</h2>
                    <p className="text-muted-foreground">
                        Seat utilization and billing overview
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadMetrics} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleExportCSV} disabled={metrics.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Billable Seats</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSeats}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all organizations
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeOrgs} / {totalOrgs}</div>
                        <p className="text-xs text-muted-foreground">
                            {totalOrgs - activeOrgs} suspended
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics.reduce((acc, curr) => acc + curr.active_users_last_30d, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Logged in within last 30 days
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Metrics Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Organization Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Total Seats</TableHead>
                                <TableHead>Active (30d)</TableHead>
                                <TableHead>Admins</TableHead>
                                <TableHead>Users</TableHead>
                                <TableHead>Last Activity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {metrics.map((m) => (
                                <TableRow key={m.organization_id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{m.organization_name}</div>
                                            <div className="text-xs text-muted-foreground">{m.organization_code}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={m.organization_status === 'active' ? 'default' : 'destructive'}>
                                            {m.organization_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold">
                                        {m.total_users}
                                    </TableCell>
                                    <TableCell>
                                        {m.active_users_last_30d}
                                    </TableCell>
                                    <TableCell>{m.admins_count}</TableCell>
                                    <TableCell>{m.regular_users_count}</TableCell>
                                    <TableCell>
                                        {m.last_login_at ? (
                                            <span title={new Date(m.last_login_at).toLocaleString()}>
                                                {new Date(m.last_login_at).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
