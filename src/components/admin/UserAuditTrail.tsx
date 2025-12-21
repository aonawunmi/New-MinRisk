/**
 * User Audit Trail Component
 *
 * Shows semantic audit trail for user status and role changes
 * Uses the enterprise-grade audit tables: user_status_transitions, user_role_transitions
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ScrollText,
  RefreshCw,
  Eye,
  ArrowRight,
  UserCheck,
  UserX,
  Shield,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface UserAuditEntry {
  id: string;
  changed_at: string;
  audit_type: 'status' | 'role';
  user_email: string;
  user_full_name: string;
  from_value: string | null;
  to_value: string;
  transition_type?: string;
  actor_email: string;
  actor_role: string;
  reason: string;
  request_id: string | null;
}

export default function UserAuditTrail() {
  const [entries, setEntries] = useState<UserAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<UserAuditEntry | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filters
  const [searchEmail, setSearchEmail] = useState('');
  const [auditType, setAuditType] = useState<'all' | 'status' | 'role'>('all');
  const [transitionType, setTransitionType] = useState('all');
  const [dateRange, setDateRange] = useState('7'); // days

  useEffect(() => {
    loadAuditTrail();
  }, [auditType, transitionType, dateRange]);

  async function loadAuditTrail() {
    setLoading(true);
    try {
      const entries: UserAuditEntry[] = [];

      // Calculate date filter
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Load status transitions
      if (auditType === 'all' || auditType === 'status') {
        const { data: statusData, error: statusError } = await supabase
          .from('user_status_transitions')
          .select(`
            id,
            changed_at,
            from_status,
            to_status,
            transition_type,
            actor_role,
            reason,
            request_id,
            user_id,
            actor_user_id
          `)
          .gte('changed_at', startDate.toISOString())
          .order('changed_at', { ascending: false })
          .limit(100);

        if (statusError) {
          console.error('Error loading status transitions:', statusError);
        } else if (statusData) {
          // Get emails for users
          const userIds = [...new Set(statusData.map(s => s.user_id))];
          const actorIds = [...new Set(statusData.map(s => s.actor_user_id))];
          const allIds = [...new Set([...userIds, ...actorIds])];

          const { data: users } = await supabase.auth.admin.listUsers();
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', allIds);

          const emailMap = new Map(users?.users.map(u => [u.id, u.email]) || []);
          const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

          for (const item of statusData) {
            // Filter by transition type
            if (transitionType !== 'all' && item.transition_type !== transitionType) {
              continue;
            }

            entries.push({
              id: item.id,
              changed_at: item.changed_at,
              audit_type: 'status',
              user_email: emailMap.get(item.user_id) || 'Unknown',
              user_full_name: nameMap.get(item.user_id) || 'Unknown',
              from_value: item.from_status,
              to_value: item.to_status,
              transition_type: item.transition_type,
              actor_email: emailMap.get(item.actor_user_id) || 'Unknown',
              actor_role: item.actor_role,
              reason: item.reason,
              request_id: item.request_id,
            });
          }
        }
      }

      // Load role transitions
      if (auditType === 'all' || auditType === 'role') {
        const { data: roleData, error: roleError } = await supabase
          .from('user_role_transitions')
          .select(`
            id,
            changed_at,
            from_role,
            to_role,
            actor_role,
            reason,
            request_id,
            user_id,
            actor_user_id
          `)
          .gte('changed_at', startDate.toISOString())
          .order('changed_at', { ascending: false })
          .limit(100);

        if (roleError) {
          console.error('Error loading role transitions:', roleError);
        } else if (roleData) {
          const userIds = [...new Set(roleData.map(r => r.user_id))];
          const actorIds = [...new Set(roleData.map(r => r.actor_user_id))];
          const allIds = [...new Set([...userIds, ...actorIds])];

          const { data: users } = await supabase.auth.admin.listUsers();
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', allIds);

          const emailMap = new Map(users?.users.map(u => [u.id, u.email]) || []);
          const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

          for (const item of roleData) {
            entries.push({
              id: item.id,
              changed_at: item.changed_at,
              audit_type: 'role',
              user_email: emailMap.get(item.user_id) || 'Unknown',
              user_full_name: nameMap.get(item.user_id) || 'Unknown',
              from_value: item.from_role,
              to_value: item.to_role,
              actor_email: emailMap.get(item.actor_user_id) || 'Unknown',
              actor_role: item.actor_role,
              reason: item.reason,
              request_id: item.request_id,
            });
          }
        }
      }

      // Sort by date descending
      entries.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());

      // Apply email search filter
      if (searchEmail) {
        const filtered = entries.filter(
          e =>
            e.user_email.toLowerCase().includes(searchEmail.toLowerCase()) ||
            e.actor_email.toLowerCase().includes(searchEmail.toLowerCase())
        );
        setEntries(filtered);
      } else {
        setEntries(entries);
      }
    } catch (error) {
      console.error('Error loading audit trail:', error);
    } finally {
      setLoading(false);
    }
  }

  function getTransitionIcon(entry: UserAuditEntry) {
    if (entry.audit_type === 'role') {
      return <Shield className="h-4 w-4" />;
    }

    switch (entry.transition_type) {
      case 'onboarding_approval':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'onboarding_rejection':
        return <UserX className="h-4 w-4 text-orange-600" />;
      case 'disciplinary_suspension':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'reinstatement':
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case 'override':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  }

  function getTransitionLabel(entry: UserAuditEntry): string {
    if (entry.audit_type === 'role') {
      return 'Role Change';
    }

    switch (entry.transition_type) {
      case 'onboarding_approval':
        return 'Approved';
      case 'onboarding_rejection':
        return 'Rejected';
      case 'disciplinary_suspension':
        return 'Suspended';
      case 'reinstatement':
        return 'Reinstated';
      case 'override':
        return 'Override';
      case 're_application':
        return 'Re-Application';
      default:
        return 'Legacy Data';
    }
  }

  function formatValue(value: string | null, type: 'status' | 'role'): string {
    if (!value) return 'N/A';

    if (type === 'status') {
      switch (value) {
        case 'pending':
          return 'Pending';
        case 'approved':
          return 'Active';
        case 'rejected':
          return 'Rejected';
        case 'suspended':
          return 'Suspended';
        default:
          return value;
      }
    } else {
      // role
      switch (value) {
        case 'super_admin':
          return 'Super Admin';
        case 'primary_admin':
          return 'Primary Admin';
        case 'secondary_admin':
          return 'Secondary Admin';
        case 'user':
          return 'User';
        case 'viewer':
          return 'Viewer';
        default:
          return value;
      }
    }
  }

  function getSemanticDescription(entry: UserAuditEntry): string {
    const actor = entry.actor_email.split('@')[0];
    const user = entry.user_full_name;
    const from = formatValue(entry.from_value, entry.audit_type);
    const to = formatValue(entry.to_value, entry.audit_type);

    if (entry.from_value === null) {
      return `${user} (backfilled legacy data)`;
    }

    if (entry.audit_type === 'status') {
      return `${actor} changed ${user} status from ${from} to ${to}`;
    } else {
      return `${actor} changed ${user} role from ${from} to ${to}`;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          User Audit Trail
        </CardTitle>
        <CardDescription>
          Complete history of user status and role changes with full accountability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Email</label>
            <Input
              placeholder="user@example.com"
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={auditType} onValueChange={(v: any) => setAuditType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Changes</SelectItem>
                <SelectItem value="status">Status Changes</SelectItem>
                <SelectItem value="role">Role Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Transition Type</label>
            <Select value={transitionType} onValueChange={setTransitionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="onboarding_approval">Approvals</SelectItem>
                <SelectItem value="onboarding_rejection">Rejections</SelectItem>
                <SelectItem value="disciplinary_suspension">Suspensions</SelectItem>
                <SelectItem value="reinstatement">Reinstatements</SelectItem>
                <SelectItem value="override">Overrides</SelectItem>
                <SelectItem value="unknown">Legacy Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 Hours</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => loadAuditTrail()} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button
            onClick={() => {
              setSearchEmail('');
              setAuditType('all');
              setTransitionType('all');
              setDateRange('7');
            }}
            variant="outline"
            size="sm"
          >
            Clear Filters
          </Button>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-600">
          Showing {entries.length} audit {entries.length === 1 ? 'entry' : 'entries'}
        </div>

        {/* Audit Trail Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Timestamp</TableHead>
                <TableHead className="w-[140px]">Type</TableHead>
                <TableHead className="w-[320px]">Description</TableHead>
                <TableHead className="w-[240px]">Changed By</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Loading audit trail...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No audit entries found for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(entry.changed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransitionIcon(entry)}
                        <span className="text-sm">{getTransitionLabel(entry)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatValue(entry.from_value, entry.audit_type)}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{formatValue(entry.to_value, entry.audit_type)}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{entry.user_full_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{entry.actor_email}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {entry.actor_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Timestamp</label>
                  <div className="text-sm mt-1">
                    {new Date(selectedEntry.changed_at).toLocaleString('en-US', {
                      dateStyle: 'full',
                      timeStyle: 'long',
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <div className="text-sm mt-1 flex items-center gap-2">
                    {getTransitionIcon(selectedEntry)}
                    {getTransitionLabel(selectedEntry)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">User Affected</label>
                  <div className="text-sm mt-1">{selectedEntry.user_full_name}</div>
                  <div className="text-xs text-gray-500">{selectedEntry.user_email}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Changed By</label>
                  <div className="text-sm mt-1">{selectedEntry.actor_email}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {selectedEntry.actor_role}
                  </Badge>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">From</label>
                  <div className="text-sm mt-1 font-medium">
                    {formatValue(selectedEntry.from_value, selectedEntry.audit_type)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">To</label>
                  <div className="text-sm mt-1 font-medium">
                    {formatValue(selectedEntry.to_value, selectedEntry.audit_type)}
                  </div>
                </div>

                {selectedEntry.request_id && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Request ID</label>
                    <div className="text-xs font-mono mt-1 bg-gray-100 p-2 rounded">
                      {selectedEntry.request_id}
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Reason</label>
                  <div className="text-sm mt-1 bg-gray-50 p-3 rounded">{selectedEntry.reason}</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="text-sm font-medium text-blue-900">Semantic Description</div>
                <div className="text-sm text-blue-800 mt-1">{getSemanticDescription(selectedEntry)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
