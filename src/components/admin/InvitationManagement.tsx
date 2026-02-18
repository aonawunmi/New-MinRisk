/**
 * Invitation Management Component
 *
 * Uses Edge Function (admin-invite-user) to send invitations via Clerk API.
 * Displays invitation history from the user_invitations table.
 *
 * Flow:
 *   1. Admin fills out invite form (email, name, role)
 *   2. Edge Function creates a pending user_profiles entry
 *   3. Edge Function sends a Clerk invitation email
 *   4. When user accepts, claim_profile_by_email links their Clerk ID
 */

import { useState, useEffect, useCallback } from 'react';
import { inviteUser } from '@/lib/admin';
import { getCurrentUserProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
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
  XCircle,
} from 'lucide-react';
import type { UserRole } from '@/lib/profiles';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  notes: string | null;
  created_at: string;
  expires_at: string;
}

type InviteRole = 'secondary_admin' | 'user';

export default function InvitationManagement() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    fullName: '',
    role: 'user' as InviteRole,
  });
  const [sending, setSending] = useState(false);

  // Load current user's org
  useEffect(() => {
    async function loadOrg() {
      const { data: profile } = await getCurrentUserProfile();
      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
      } else {
        setLoading(false);
      }
    }
    loadOrg();
  }, []);

  const loadInvitations = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('user_invitations')
        .select('id, email, role, status, notes, created_at, expires_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('Load invitations error:', queryError);
        setError(queryError.message);
      } else {
        setInvitations(data || []);
      }
    } catch (err: any) {
      console.error('Load invitations error:', err);
      setError(err.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      loadInvitations();
    }
  }, [organizationId, loadInvitations]);

  async function handleSendInvite() {
    if (!organizationId) {
      setError('No organization context available');
      return;
    }

    if (!newInvite.email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!newInvite.fullName.trim()) {
      setError('Full name is required');
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
        role: newInvite.role as UserRole,
      });

      if (inviteError) {
        setError(inviteError.message);
        return;
      }

      setSuccess(
        `Invitation sent to ${newInvite.email}. They will receive an email with a link to create their account.`
      );

      // Reset form and close dialog
      setNewInvite({ email: '', fullName: '', role: 'user' });
      setShowInviteDialog(false);

      // Reload invitation list
      await loadInvitations();
    } catch (err: any) {
      console.error('Send invite error:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  }

  function getInviteStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'used':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Revoked
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            Expired
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
      secondary_admin: 'bg-purple-50 text-purple-700 border-purple-200',
      user: 'bg-blue-50 text-blue-700 border-blue-200',
      primary_admin: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    const labels: Record<string, string> = {
      secondary_admin: 'Secondary Admin',
      user: 'User',
      primary_admin: 'Primary Admin',
    };

    return (
      <Badge variant="outline" className={colors[role] || 'bg-gray-50 text-gray-700'}>
        {labels[role] || role}
      </Badge>
    );
  }

  // Summary counts
  const pendingCount = invitations.filter((i) => i.status === 'pending').length;
  const acceptedCount = invitations.filter((i) => i.status === 'used').length;
  const revokedCount = invitations.filter((i) => i.status === 'revoked').length;

  // No organization context
  if (!loading && !organizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            User Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              No organization context found. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                User Invitations
              </CardTitle>
              <CardDescription>
                Invite new users via email. Invited users receive a link to create their account.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadInvitations}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button onClick={() => setShowInviteDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
            <div className="text-xs text-gray-500">Accepted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold text-gray-500">{revokedCount}</div>
            <div className="text-xs text-gray-500">Revoked</div>
          </CardContent>
        </Card>
      </div>

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

      {/* Invitation List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invitation History</CardTitle>
          <CardDescription>All invitations sent from your organization</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invitations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No invitations sent yet. Invite your first team member above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium text-sm">
                        {invitation.email}
                      </TableCell>
                      <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                      <TableCell>
                        {getInviteStatusBadge(invitation.status)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Invitation Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an email invitation. The user will receive a link to create their account
              and join your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
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
              <Label htmlFor="role">Role *</Label>
              <Select
                value={newInvite.role}
                onValueChange={(value: InviteRole) =>
                  setNewInvite({ ...newInvite, role: value })
                }
                disabled={sending}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="secondary_admin">Secondary Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Send className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                The invited user will receive an email with a link to create their account.
                Once they sign up, they'll be automatically linked to your organization.
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
