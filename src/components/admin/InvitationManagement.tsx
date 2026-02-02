/**
 * Invitation Management Component
 *
 * Allows admins to:
 * - Send email invitations to new users
 * - View invited users and their status
 */

import { useState, useEffect } from 'react';
import { inviteUser, listUsersInOrganization } from '@/lib/admin';
import { getCurrentUserProfile } from '@/lib/profiles';
import type { UserRole } from '@/lib/profiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail,
  Plus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Clock,
  UserCheck,
} from 'lucide-react';

export default function InvitationManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    fullName: '',
    role: 'user' as UserRole,
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const { data: profile } = await getCurrentUserProfile();
      if (!profile) {
        setError('Could not load user profile');
        return;
      }

      setOrganizationId(profile.organization_id);

      const { data, error: listError } = await listUsersInOrganization(
        profile.organization_id
      );

      if (listError) throw listError;

      setUsers(data || []);
    } catch (err: any) {
      console.error('Load users error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvite() {
    if (!newInvite.email.trim() || !newInvite.fullName.trim()) {
      setError('Email and full name are required');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: inviteError } = await inviteUser({
        email: newInvite.email.trim(),
        fullName: newInvite.fullName.trim(),
        organizationId,
        role: newInvite.role,
      });

      if (inviteError) throw inviteError;

      setSuccess(`Invitation email sent to ${newInvite.email}. They will receive a link to set their password and activate their account.`);

      // Reset form and close dialog
      setNewInvite({ email: '', fullName: '', role: 'user' });
      setShowInviteDialog(false);

      // Reload users list
      await loadUsers();
    } catch (err: any) {
      console.error('Send invite error:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <UserCheck className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Invited (Pending)
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {status}
          </Badge>
        );
    }
  }

  function getRoleBadge(role: string) {
    const colors: Record<string, string> = {
      user: 'bg-blue-50 text-blue-700 border-blue-200',
      secondary_admin: 'bg-purple-50 text-purple-700 border-purple-200',
      primary_admin: 'bg-red-50 text-red-700 border-red-200',
      super_admin: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    return (
      <Badge variant="outline" className={colors[role] || 'bg-gray-50 text-gray-700'}>
        {role.replace('_', ' ')}
      </Badge>
    );
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
                <Mail className="h-5 w-5" />
                User Invitations
              </CardTitle>
              <CardDescription>
                Invite new users via email. They will receive a link to set their password and join the platform.
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Invite User
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

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organization Users</CardTitle>
          <CardDescription>All users in your organization</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No users found. Invite your first team member above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-sm">{user.email || 'N/A'}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Send Invitation Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an email invitation. The user will receive a link to set their password
              and activate their account immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Smith"
                value={newInvite.fullName}
                onChange={(e) =>
                  setNewInvite({ ...newInvite, fullName: e.target.value })
                }
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={newInvite.email}
                onChange={(e) =>
                  setNewInvite({ ...newInvite, email: e.target.value })
                }
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">User Role *</Label>
              <Select
                value={newInvite.role}
                onValueChange={(value: UserRole) =>
                  setNewInvite({ ...newInvite, role: value })
                }
                disabled={sending}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (View & Edit)</SelectItem>
                  <SelectItem value="secondary_admin">
                    Secondary Admin (User Management)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Send className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                An email will be sent to the user with a link to set their password.
                They will be immediately active once they set their password.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={sending}>
              {sending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
