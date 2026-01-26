/**
 * Platform Audit Trail - Super Admin
 * 
 * Shows platform-wide audit events across all organizations:
 * - Organization creation/suspension/reactivation
 * - Plan changes
 * - User invitations by Super Admin
 * 
 * This is distinct from the org-specific AuditTrail component.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollText, RefreshCw, Download, Search, Building2 } from 'lucide-react';

interface PlatformAuditEntry {
    id: string;
    action_type: string;
    entity_type: string;
    entity_id: string | null;
    entity_code: string | null;
    performed_at: string;
    user_email: string;
    organization_name: string | null;
    metadata: any;
}

export default function PlatformAuditTrail() {
    const [entries, setEntries] = useState<PlatformAuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');

    useEffect(() => {
        loadAuditTrail();
    }, []);

    async function loadAuditTrail() {
        setLoading(true);
        try {
            // Call RPC that fetches platform-wide audit events
            const { data, error } = await supabase.rpc('get_platform_audit_trail', {
                p_limit: 200
            });

            if (error) {
                console.error('Failed to load platform audit:', error);
                return;
            }

            setEntries(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }

    // Filter entries client-side
    const filteredEntries = entries.filter(entry => {
        const matchesSearch = !searchTerm ||
            entry.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.entity_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.organization_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = !actionFilter || entry.action_type === actionFilter;
        const matchesEntity = !entityFilter || entry.entity_type === entityFilter;

        return matchesSearch && matchesAction && matchesEntity;
    });

    function getActionColor(action: string): string {
        switch (action.toLowerCase()) {
            case 'create': return 'text-green-600 bg-green-50';
            case 'suspend': return 'text-red-600 bg-red-50';
            case 'reactivate': return 'text-blue-600 bg-blue-50';
            case 'update': return 'text-amber-600 bg-amber-50';
            case 'invite': return 'text-purple-600 bg-purple-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    }

    function exportCSV() {
        const headers = ['Timestamp', 'Action', 'Entity', 'Code', 'Organization', 'User', 'Details'];
        const rows = filteredEntries.map(e => [
            new Date(e.performed_at).toLocaleString(),
            e.action_type,
            e.entity_type,
            e.entity_code || '-',
            e.organization_name || '-',
            e.user_email,
            JSON.stringify(e.metadata || {}).replace(/,/g, ';')
        ].map(cell => `"${cell}"`).join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-audit-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ScrollText className="h-5 w-5" />
                                Platform Audit Trail
                            </CardTitle>
                            <CardDescription>
                                Track platform-wide administrative actions across all organizations
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={loadAuditTrail}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportCSV}>
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <Label>Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search user, org, code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Action Type</Label>
                            <Select value={actionFilter || 'all'} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All actions</SelectItem>
                                    <SelectItem value="create">Create</SelectItem>
                                    <SelectItem value="update">Update</SelectItem>
                                    <SelectItem value="suspend">Suspend</SelectItem>
                                    <SelectItem value="reactivate">Reactivate</SelectItem>
                                    <SelectItem value="invite">Invite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Entity Type</Label>
                            <Select value={entityFilter || 'all'} onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All entities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All entities</SelectItem>
                                    <SelectItem value="organization">Organization</SelectItem>
                                    <SelectItem value="subscription_plan">Subscription Plan</SelectItem>
                                    <SelectItem value="user">User Invite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Audit Log ({filteredEntries.length} entries)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2 font-medium">Timestamp</th>
                                    <th className="text-left p-2 font-medium">Action</th>
                                    <th className="text-left p-2 font-medium">Entity</th>
                                    <th className="text-left p-2 font-medium">Organization</th>
                                    <th className="text-left p-2 font-medium">Performed By</th>
                                    <th className="text-left p-2 font-medium">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((entry) => (
                                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2 text-xs text-gray-600">
                                            {new Date(entry.performed_at).toLocaleString()}
                                        </td>
                                        <td className="p-2">
                                            <span className={`text-xs px-2 py-1 rounded ${getActionColor(entry.action_type)}`}>
                                                {entry.action_type}
                                            </span>
                                        </td>
                                        <td className="p-2">
                                            <div className="flex items-center gap-1">
                                                {entry.entity_type === 'organization' && <Building2 className="h-3 w-3 text-muted-foreground" />}
                                                <span className="text-gray-600">{entry.entity_type}</span>
                                            </div>
                                            {entry.entity_code && (
                                                <span className="text-xs font-mono text-muted-foreground">{entry.entity_code}</span>
                                            )}
                                        </td>
                                        <td className="p-2 text-gray-600">
                                            {entry.organization_name || '-'}
                                        </td>
                                        <td className="p-2 text-gray-600 text-xs">
                                            {entry.user_email}
                                        </td>
                                        <td className="p-2 text-xs text-muted-foreground max-w-[200px] truncate">
                                            {entry.metadata?.reason || entry.metadata?.plan_name || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredEntries.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No platform audit entries found
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
