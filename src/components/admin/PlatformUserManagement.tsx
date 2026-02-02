/**
 * Platform User Management Component (Super Admin Only)
 *
 * Allows the Super Admin to manage ALL users across ALL organizations:
 * - View all users with organization context
 * - Approve/reject pending users
 * - Change user roles and status
 * - Filter by organization and status
 */

import { useState, useEffect } from 'react';
import {
  listUsersInOrganization,
  listPendingUsers,
  approveUser,
  rejectUser,
  updateUserRole,
  updateUserStatus,
} from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { UserRole, UserStatus } from '@/lib/profiles';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Shield,
  User,
  Eye,
  Users,
  RefreshCw,
  Filter,
  Building2,
} from 'lucide-react';

interface OrgInfo {
  id: string;
  name: string;
}

export default function PlatformUserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<OrgInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Load all users (null org = all organizations)
      const [usersResult, pendingResult] = await Promise.all([
        listUsersInOrganization(null),
        listPendingUsers(null),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (pendingResult.error) throw pendingResult.error;

      setUsers(usersResult.data || []);
      setPendingUsers(pendingResult.data || []);

      // Load organizations for filter and display
      const { data: orgs, error: orgError } = await supabase.rpc('list_organizations_admin');
      if (!orgError && orgs) {
        setOrganizations(orgs.map((o: any) => ({ id: o.id, name: o.name })));
      }
    } catch (err: any) {
      console.error('Load platform users error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getOrgName(orgId: string | null): string {
    if (!orgId) return 'No Organization';
    const org = organizations.find((o) => o.id === orgId);
    return org?.name || orgId.slice(0, 8) + '...';
  }

  async function handleApproveUser(userId: string) {
    if (!user) return;
    setError(null);
    setSuccess(null);

    const targetUser = pendingUsers.find((u) => u.id === userId);
    const { error } = await approveUser(userId, user.id);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(`${targetUser?.full_name || 'User'} (${targetUser?.email || ''}) approved successfully`);
      await loadData();
    }
  }

  async function handleRejectUser(userId: string) {
    const targetUser = pendingUsers.find((u) => u.id === userId);
    if (!confirm(`Reject ${targetUser?.full_name || 'this user'}? They will be marked as suspended.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    const { error } = await rejectUser(userId);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(`${targetUser?.full_name || 'User'} rejected`);
      await loadData();
    }
  }

  async function handleChangeRole(userId: string, newRole: UserRole) {
    if (userId === user?.id) {
      setError('You cannot change your own role');
      return;
    }

    setError(null);
    setSuccess(null);

    const targetUser = users.find((u) => u.id === userId);
    const { error } = await updateUserRole(userId, newRole);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(`${targetUser?.email || 'User'} role updated to ${getRoleLabel(newRole)}`);
      await loadData();
    }
  }

  async function handleChangeStatus(userId: string, newStatus: UserStatus) {
    if (userId === user?.id) {
      setError('You cannot change your own status');
      return;
    }

    setError(null);
    setSuccess(null);

    const targetUser = users.find((u) => u.id === userId);
    const { error } = await updateUserStatus(userId, newStatus);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(`${targetUser?.email || 'User'} status updated to ${getStatusLabel(newStatus)}`);
      await loadData();
    }
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (orgFilter !== 'all' && u.organization_id !== orgFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  const filteredPending = pendingUsers.filter((u) => {
    if (orgFilter !== 'all' && u.organization_id !== orgFilter) return false;
    return true;
  });

  function getRoleBadge(role: string) {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className="bg-red-600">
            <Shield className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        );
      case 'primary_admin':
        return (
          <Badge className="bg-purple-600">
            <Shield className="h-3 w-3 mr-1" />
            Primary Admin
          </Badge>
        );
      case 'secondary_admin':
        return (
          <Badge className="bg-blue-600">
            <Shield className="h-3 w-3 mr-1" />
            Secondary Admin
          </Badge>
        );
      case 'regulator':
        return (
          <Badge className="bg-teal-600">
            <Eye className="h-3 w-3 mr-1" />
            Regulator
          </Badge>
        );
      case 'user':
        return (
          <Badge variant="outline">
            <User className="h-3 w-3 mr-1" />
            User
          </Badge>
        );
      case 'viewer':
        return (
          <Badge variant="outline">
            <Eye className="h-3 w-3 mr-1" />
            Viewer
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="bg-orange-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            {role}
          </Badge>
        );
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-orange-600">Rejected</Badge>;
      case 'suspended':
        return <Badge className="bg-red-600">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getRoleLabel(role: UserRole): string {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      primary_admin: 'Primary Admin',
      secondary_admin: 'Secondary Admin',
      user: 'User',
      viewer: 'Viewer',
      regulator: 'Regulator',
    };
    return labels[role] || role;
  }

  function getStatusLabel(status: UserStatus): string {
    const labels: Record<string, string> = {
      approved: 'Active',
      pending: 'Pending',
      rejected: 'Rejected',
      suspended: 'Suspended',
    };
    return labels[status] || status;
  }

  // All assignable roles for super admin
  const assignableRoles: UserRole[] = ['primary_admin', 'secondary_admin', 'user', 'viewer', 'regulator'];

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
                <Users className="h-5 w-5" />
                Platform Users
              </CardTitle>
              <CardDescription>
                Manage all users across all organizations. {users.length} total users.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Users */}
      {filteredPending.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Pending Users ({filteredPending.length})
            </CardTitle>
            <CardDescription>
              Users awaiting approval. These users were invited but need manual approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-sm">{getOrgName(u.organization_id)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => handleApproveUser(u.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectUser(u.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}{' '}
            {orgFilter !== 'all' || statusFilter !== 'all' ? '(filtered)' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No users found matching filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name}
                      {u.id === user?.id && (
                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      {u.id === user?.id || u.role === 'super_admin' ? (
                        getRoleBadge(u.role)
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(value) =>
                            handleChangeRole(u.id, value as UserRole)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {getRoleLabel(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getOrgName(u.organization_id)}
                    </TableCell>
                    <TableCell>
                      {u.id === user?.id || u.role === 'super_admin' ? (
                        getStatusBadge(u.status)
                      ) : (
                        <Select
                          value={u.status}
                          onValueChange={(value) =>
                            handleChangeStatus(u.id, value as UserStatus)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
