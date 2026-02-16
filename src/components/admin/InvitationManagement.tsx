/**
 * Invitation Management Component
 *
 * Allows admins to:
 * - Send email invitations to new users
 * - View invitation history from user_invitations table
 * - Revoke pending invitations
 * - Resend expired invitations
 *
 * Updated: 2026-02-16 (Auth Overhaul: now uses user_invitations table)
 */

import { useState, useEffect } from 'react';
import { inviteUser } from '@/lib/admin';
import { listInvitations, revokeInvitation } from '@/lib/invitations';
import type { UserInvitation } from '@/lib/invitations';
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
  XCircle,
  RotateCcw,
  Ban,
} from 'lucide-react';

export default function InvitationManagement() {
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
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

  // Revoke dialog state
  const [revokeTarget, setRevokeTarget] = useState<UserInvitation | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Resend state
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const { data: profile } = await getCurrentUserProfile();
      if (!profile) {
        setError('Could not load user profile');
        return;
      }

      setOrganizationId(profile.organization_id);

      // Load invitations from user_invitations table
      const { data: inviteData, error: inviteError } = await listInvitations(
        profile.organization_id
      );

      if (inviteError) throw inviteError;

      setInvitations(inviteData || []);
    } catch (err: any) {
      console.error('Load data error:', err);
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

      setSuccess(
        `Invitation email sent to ${newInvite.email}. They will receive a link to set their password. Their account will need to be approved before they can log in.`
      );

      // Reset form and close dialog
      setNewInvite({ email: '', fullName: '', role: 'user' });
      setShowInviteDialog(false);

      // Reload invitation list
      await loadData();
    } catch (err: any) {
      console.error('Send invite error:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;

    setRevoking(true);
    setError(null);

    try {
      const { success: ok, error: revokeError } = await revokeInvitation(
        revokeTarget.id,
        revokeReason || 'Revoked by administrator'
      );

      if (revokeError) throw revokeError;

      if (ok) {
        setSuccess(`Invitation for ${revokeTarget.email} has been revoked.`);
      }

      setRevokeTarget(null);
      setRevokeReason('');
      await loadData();
    } catch (err: any) {
      console.error('Revoke error:', err);
      setError(err.message);
    } finally {
      setRevoking(false);
    }
  }

  async function handleResend(invitation: UserInvitation) {
    setResending(invitation.id);
    setError(null);
    setSuccess(null);

    try {
      // Send a new invitation to the same email with the same role
      const { error: inviteError } = await inviteUser({
        email: invitation.email,
        fullName: invitation.email.split('@')[0], // Best guess — the name from original invite may not be available
        organizationId,
        role: invitation.role as UserRole,
      });

      if (inviteError) throw inviteError;

      setSuccess(`New invitation email sent to ${invitation.email}.`);
      await loadData();
    } catch (err: any) {
      console.error('Resend invite error:', err);
      setError(err.message);
    } finally {
      setResending(null);
    }
  }

  function getInviteStatusBadge(status: string, expiresAt: string) {
    // Check if pending invite has actually expired
    const isExpired = status === 'pending' && new Date(expiresAt) < new Date();

    if (isExpired) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
          <Clock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }

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
            Used
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
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
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

  function isExpiredOrRevoked(invitation: UserInvitation): boolean {
    return (
      invitation.status === 'revoked' ||
      invitation.status === 'expired' ||
      (invitation.status === 'pending' && new Date(invitation.expires_at) < new Date())
    );
  }

  function canRevoke(invitation: UserInvitation): boolean {
    return invitation.status === 'pending' && new Date(invitation.expires_at) >= new Date();
  }

  function canResend(invitation: UserInvitation): boolean {
    return (
      invitation.status === 'expired' ||
      invitation.status === 'revoked' ||
      (invitation.status === 'pending' && new Date(invitation.expires_at) < new Date())
    );
  }

  // Summary counts
  const pendingCount = invitations.filter(
    (i) => i.status === 'pending' && new Date(i.expires_at) >= new Date()
  ).length;
  const usedCount = invitations.filter((i) => i.status === 'used').length;
  const expiredOrRevokedCount = invitations.filter((i) => isExpiredOrRevoked(i)).length;

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
                Invite new users via email. Invited users must be approved by an administrator before they can log in.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
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
            <div className="text-xs text-gray-500">Active Invites</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold text-green-600">{usedCount}</div>
            <div className="text-xs text-gray-500">Accepted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold text-gray-500">{expiredOrRevokedCount}</div>
            <div className="text-xs text-gray-500">Expired / Revoked</div>
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

      {/* Invitation History */}
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
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {invitation.invite_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {getInviteStatusBadge(invitation.status, invitation.expires_at)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canRevoke(invitation) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setRevokeTarget(invitation)}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" />
                              Revoke
                            </Button>
                          )}
                          {canResend(invitation) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleResend(invitation)}
                              disabled={resending === invitation.id}
                            >
                              {resending === invitation.id ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                  Resend
                                </>
                              )}
                            </Button>
                          )}
                        </div>
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
              Send an email invitation. The user will receive a link to set their password.
              After setting their password, their account must be approved by an administrator before they can log in.
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

            <Alert className="bg-amber-50 border-amber-200">
              <Send className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                The invited user will need to set their password, then wait for admin approval before they can log in.
                You can approve them in the "Pending Approvals" section of User Management.
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

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the invitation for{' '}
              <strong>{revokeTarget?.email}</strong>? They will no longer be able to use
              this invitation link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="revokeReason">Reason (optional)</Label>
              <Input
                id="revokeReason"
                placeholder="e.g., Position no longer available"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                disabled={revoking}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeTarget(null);
                setRevokeReason('');
              }}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Revoke Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
