/**
 * User Management Component
 *
 * Allows admins to manage users in their organization:
 * - View all users
 * - Approve/reject pending users
 * - Change user roles
 * - Suspend/unsuspend users
 * - Create and manage user invitations
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
import { getCurrentUserProfile } from '@/lib/profiles';
import type { UserProfile, UserRole, UserStatus } from '@/lib/profiles';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InvitationManagement from './InvitationManagement';
import UserAuditTrail from './UserAuditTrail';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Shield,
  User,
  Eye,
  Users,
  Mail,
  History,
} from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      // Get current user profile
      const { data: profile } = await getCurrentUserProfile();
      if (!profile) {
        setError('Could not load user profile');
        return;
      }

      console.log('🔍 DEBUG - Current user profile:', {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        status: profile.status,
      });

      setCurrentUserId(profile.id);
      setCurrentUserRole(profile.role);

      // Get all users
      const { data: allUsers, error: usersError } =
        await listUsersInOrganization(profile.organization_id);

      if (usersError) throw usersError;

      // Get pending users
      const { data: pending, error: pendingError } = await listPendingUsers(
        profile.organization_id
      );

      if (pendingError) throw pendingError;

      setUsers(allUsers || []);
      setPendingUsers(pending || []);
    } catch (err: any) {
      console.error('Load users error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveUser(userId: string) {
    // Security check: Find the target user and verify we can manage them
    const targetUser = pendingUsers.find(u => u.id === userId);
    if (targetUser && !canManageUser(targetUser.role)) {
      setError('You cannot approve users with equal or higher privileges');
      return;
    }

    setError(null);
    setSuccess(null);

    const { error } = await approveUser(userId, currentUserId);
    if (error) {
      setError(error.message);
    } else {
      const userEmail = targetUser?.email || 'User';
      setSuccess(`${userEmail} approved successfully`);
      await loadUsers();
    }
  }

  async function handleRejectUser(userId: string) {
    // Security check: Find the target user and verify we can manage them
    const targetUser = pendingUsers.find(u => u.id === userId);
    if (targetUser && !canManageUser(targetUser.role)) {
      setError('You cannot reject users with equal or higher privileges');
      return;
    }

    if (!confirm('Reject this user? They will be marked as suspended.')) {
      return;
    }

    setError(null);
    setSuccess(null);

    const { error } = await rejectUser(userId);
    if (error) {
      setError(error.message);
    } else {
      const userEmail = targetUser?.email || 'User';
      setSuccess(`${userEmail} rejected successfully`);
      await loadUsers();
    }
  }

  async function handleChangeRole(userId: string, newRole: UserRole) {
    if (userId === currentUserId) {
      setError('You cannot change your own role');
      return;
    }

    // Security check: Find the target user and verify we can manage them
    const targetUser = users.find(u => u.id === userId);
    if (targetUser && !canManageUser(targetUser.role)) {
      setError('You cannot change the role of users with equal or higher privileges');
      return;
    }

    // Security check: Verify the new role is lower than current user's role
    if (!getAvailableRoles().includes(newRole)) {
      setError('You cannot assign a role equal to or higher than your own');
      return;
    }

    setError(null);
    setSuccess(null);

    const { error } = await updateUserRole(userId, newRole);
    if (error) {
      setError(error.message);
    } else {
      const userEmail = targetUser?.email || 'User';
      const roleLabel = getRoleLabel(newRole);
      setSuccess(`${userEmail} role updated to ${roleLabel}`);
      await loadUsers();
    }
  }

  async function handleChangeStatus(userId: string, newStatus: UserStatus) {
    if (userId === currentUserId) {
      setError('You cannot change your own status');
      return;
    }

    // Security check: Find the target user and verify we can manage them
    const targetUser = users.find(u => u.id === userId);
    if (targetUser && !canManageUser(targetUser.role)) {
      setError('You cannot change the status of users with equal or higher privileges');
      return;
    }

    setError(null);
    setSuccess(null);

    const { error } = await updateUserStatus(userId, newStatus);
    if (error) {
      setError(error.message);
    } else {
      const userEmail = targetUser?.email || 'User';
      const statusLabel = getStatusLabel(newStatus);
      setSuccess(`${userEmail} status updated to ${statusLabel}`);
      await loadUsers();
    }
  }

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
        // Invalid role - show warning badge
        return (
          <Badge variant="destructive" className="bg-orange-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Invalid: {role}
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

  /**
   * Get user-friendly status label for display
   */
  function getStatusLabel(status: UserStatus): string {
    switch (status) {
      case 'approved':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      case 'suspended':
        return 'Suspended';
      default:
        return status;
    }
  }

  /**
   * Get role hierarchy level (higher number = higher privilege)
   */
  function getRoleLevel(role: UserRole): number {
    switch (role) {
      case 'super_admin':
        return 4;
      case 'primary_admin':
        return 3;
      case 'secondary_admin':
        return 2;
      case 'user':
        return 1;
      case 'viewer':
        return 0;
      default:
        return -1;
    }
  }

  /**
   * Check if current user can manage (view/edit) a target user
   * Rule: You can only manage users with LOWER privilege than yours
   * You CANNOT manage users at your level or above
   */
  function canManageUser(targetUserRole: UserRole): boolean {
    if (!currentUserRole) return false;

    const currentLevel = getRoleLevel(currentUserRole);
    const targetLevel = getRoleLevel(targetUserRole);

    // Can only manage users with STRICTLY LOWER privilege
    return currentLevel > targetLevel;
  }

  /**
   * Get available roles for the role dropdown based on current user's role
   * Rule: You can only assign roles LOWER than yours
   */
  function getAvailableRoles(): UserRole[] {
    if (!currentUserRole) {
      return ['user', 'viewer']; // Fallback - minimal permissions
    }

    const currentLevel = getRoleLevel(currentUserRole);
    const allRoles: UserRole[] = ['super_admin', 'primary_admin', 'secondary_admin', 'user', 'viewer'];

    // Only return roles with LOWER privilege level
    return allRoles.filter(role => getRoleLevel(role) < currentLevel);
  }

  /**
   * Get display label for a role value
   */
  function getRoleLabel(role: UserRole): string {
    switch (role) {
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
        return role;
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="users" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          User Management
        </TabsTrigger>
        <TabsTrigger value="invitations" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Invitations
        </TabsTrigger>
        <TabsTrigger value="audit" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Audit Trail
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="mt-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending User Approvals</CardTitle>
            <CardDescription>
              {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''}{' '}
              awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers
                  .filter((user) => {
                    // Only show pending users you can manage (lower privilege level)
                    return canManageUser(user.role);
                  })
                  .map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => handleApproveUser(user.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectUser(user.id)}
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
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage user roles and access in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .filter((user) => {
                  // Always show current user (yourself)
                  if (user.id === currentUserId) return true;
                  // Only show users you can manage (lower privilege level)
                  return canManageUser(user.role);
                })
                .map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-gray-500">(You)</span>
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.id === currentUserId ? (
                      getRoleBadge(user.role)
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleChangeRole(user.id, value as UserRole)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableRoles().map((role) => (
                            <SelectItem key={role} value={role}>
                              {getRoleLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.id === currentUserId ? (
                      getStatusBadge(user.status)
                    ) : (
                      <Select
                        value={user.status}
                        onValueChange={(value) =>
                          handleChangeStatus(user.id, value as UserStatus)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Active</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(user.updated_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="invitations" className="mt-6">
        <InvitationManagement />
      </TabsContent>

      <TabsContent value="audit" className="mt-6">
        <UserAuditTrail />
      </TabsContent>
    </Tabs>
  );
}
