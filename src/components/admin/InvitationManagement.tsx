/**
 * Invitation Management Component — CLERK VERSION
 *
 * Uses Clerk Organization API to manage invitations:
 * - Send email invitations via Clerk
 * - View pending / accepted / revoked invitations
 * - Revoke pending invitations
 *
 * With Clerk Restricted mode, the invitation IS the approval.
 * No more "pending approvals" limbo.
 */

import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@clerk/clerk-react';
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
  Ban,
} from 'lucide-react';

interface ClerkInvitation {
  id: string;
  emailAddress: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  revoke: () => Promise<void>;
}

type ClerkOrgRole = 'org:admin' | 'org:member';

export default function InvitationManagement() {
  const { organization, isLoaded: orgLoaded } = useOrganization();

  const [invitations, setInvitations] = useState<ClerkInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'org:member' as ClerkOrgRole,
  });
  const [sending, setSending] = useState(false);

  // Revoke dialog state
  const [revokeTarget, setRevokeTarget] = useState<ClerkInvitation | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadInvitations = useCallback(async () => {
    if (!organization) return;

    setLoading(true);
    setError(null);

    try {
      const { totalCount, data } = await organization.getInvitations();
      setInvitations((data as ClerkInvitation[]) || []);
    } catch (err: any) {
      console.error('Load invitations error:', err);
      setError(err.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    if (orgLoaded && organization) {
      loadInvitations();
    } else if (orgLoaded && !organization) {
      setLoading(false);
    }
  }, [orgLoaded, organization, loadInvitations]);

  async function handleSendInvite() {
    if (!organization) {
      setError('No organization context available');
      return;
    }

    if (!newInvite.email.trim()) {
      setError('Email address is required');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      await organization.inviteMember({
        emailAddress: newInvite.email.trim(),
        role: newInvite.role,
      });

      setSuccess(
        `Invitation sent to ${newInvite.email}. They will receive an email with a link to join.`
      );

      // Reset form and close dialog
      setNewInvite({ email: '', role: 'org:member' });
      setShowInviteDialog(false);

      // Reload invitation list
      await loadInvitations();
    } catch (err: any) {
      console.error('Send invite error:', err);
      setError(err.errors?.[0]?.longMessage || err.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;

    setRevoking(true);
    setError(null);

    try {
      await revokeTarget.revoke();

      setSuccess(`Invitation for ${revokeTarget.emailAddress} has been revoked.`);
      setRevokeTarget(null);
      await loadInvitations();
    } catch (err: any) {
      console.error('Revoke error:', err);
      setError(err.message || 'Failed to revoke invitation');
    } finally {
      setRevoking(false);
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
      case 'accepted':
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
      'org:admin': 'bg-purple-50 text-purple-700 border-purple-200',
      'org:member': 'bg-blue-50 text-blue-700 border-blue-200',
    };

    const labels: Record<string, string> = {
      'org:admin': 'Admin',
      'org:member': 'Member',
    };

    return (
      <Badge variant="outline" className={colors[role] || 'bg-gray-50 text-gray-700'}>
        {labels[role] || role}
      </Badge>
    );
  }

  // Summary counts
  const pendingCount = invitations.filter((i) => i.status === 'pending').length;
  const acceptedCount = invitations.filter((i) => i.status === 'accepted').length;
  const revokedCount = invitations.filter((i) => i.status === 'revoked').length;

  // No organization context — show setup message
  if (orgLoaded && !organization) {
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
              Organization context not available. Please ensure your Clerk organization
              is configured and you have selected an active organization.
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
                Invite new users via email. Invited users are automatically approved when they accept.
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium text-sm">
                        {invitation.emailAddress}
                      </TableCell>
                      <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                      <TableCell>
                        {getInviteStatusBadge(invitation.status)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {invitation.status === 'pending' && (
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
              and join your organization. They are automatically approved upon accepting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
              <Label htmlFor="role">Organization Role *</Label>
              <Select
                value={newInvite.role}
                onValueChange={(value: ClerkOrgRole) =>
                  setNewInvite({ ...newInvite, role: value })
                }
                disabled={sending}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org:member">Member</SelectItem>
                  <SelectItem value="org:admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                You can adjust the user's specific app role after they join via User Management.
              </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Send className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                The invited user will receive an email with a link to create their account.
                Once they accept, they'll be automatically approved and can start using the platform.
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
              <strong>{revokeTarget?.emailAddress}</strong>? They will no longer be able to use
              this invitation link.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
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
