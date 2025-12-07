/**
 * Invitation Management Component
 *
 * Allows admins to:
 * - Create invitation codes for new users
 * - View pending/used/revoked invitations
 * - Copy invite codes
 * - Revoke unused invitations
 */

import { useState, useEffect } from 'react';
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  type UserInvitation,
  type InvitationStatus,
} from '@/lib/invitations';
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
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function InvitationManagement() {
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create invitation dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'user' as UserRole,
    expiresInDays: 7,
    notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<UserInvitation | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  async function loadInvitations() {
    setLoading(true);
    setError(null);

    try {
      const { data: profile } = await getCurrentUserProfile();
      if (!profile) {
        setError('Could not load user profile');
        return;
      }

      setOrganizationId(profile.organization_id);

      const { data, error: invError } = await listInvitations(
        profile.organization_id
      );

      if (invError) throw invError;

      setInvitations(data || []);
    } catch (err: any) {
      console.error('Load invitations error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvitation() {
    if (!newInvite.email.trim()) {
      setError('Email is required');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: createError } = await createInvitation({
        email: newInvite.email,
        organizationId,
        role: newInvite.role,
        expiresInDays: newInvite.expiresInDays,
        notes: newInvite.notes || undefined,
      });

      if (createError) throw createError;

      setCreatedInvite(data);
      setSuccess('Invitation created successfully!');

      // Reset form
      setNewInvite({
        email: '',
        role: 'user',
        expiresInDays: 7,
        notes: '',
      });

      // Reload list
      await loadInvitations();
    } catch (err: any) {
      console.error('Create invitation error:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeInvitation(invitationId: string, email: string) {
    if (!confirm(`Revoke invitation for ${email}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    const reason = prompt('Reason for revocation (optional):');

    const { success, error: revokeError } = await revokeInvitation(
      invitationId,
      reason || undefined
    );

    if (revokeError) {
      setError(revokeError.message);
    } else if (success) {
      setSuccess('Invitation revoked successfully');
      await loadInvitations();
    } else {
      setError('Failed to revoke invitation');
    }
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code);
    setSuccess(`Invite code ${code} copied to clipboard!`);
    setTimeout(() => setSuccess(null), 3000);
  }

  function handleCopySignupLink(code: string) {
    const signupLink = `${window.location.origin}/signup?invite=${code}`;
    navigator.clipboard.writeText(signupLink);

    // Immediate button feedback
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);

    // Success message
    setSuccess('Signup link copied to clipboard! Send this to the user.');
    setTimeout(() => setSuccess(null), 3000);
  }

  function getStatusBadge(status: InvitationStatus) {
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
            <Ban className="h-3 w-3 mr-1" />
            Revoked
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
    }
  }

  function getRoleBadge(role: UserRole) {
    const colors = {
      user: 'bg-blue-50 text-blue-700 border-blue-200',
      secondary_admin: 'bg-purple-50 text-purple-700 border-purple-200',
      primary_admin: 'bg-red-50 text-red-700 border-red-200',
      super_admin: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    return (
      <Badge variant="outline" className={colors[role]}>
        {role.replace('_', ' ')}
      </Badge>
    );
  }

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');
  const usedInvitations = invitations.filter((inv) => inv.status === 'used');
  const revokedInvitations = invitations.filter((inv) => inv.status === 'revoked');
  const expiredInvitations = invitations.filter((inv) => inv.status === 'expired');

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
                Invite new users with pre-approved access codes
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invitation
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

      {/* Invitations Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pending ({pendingInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="used">
            Used ({usedInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="revoked">
            Revoked ({revokedInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired ({expiredInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <InvitationsTable
            invitations={pendingInvitations}
            onCopy={handleCopyCode}
            onRevoke={handleRevokeInvitation}
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="used" className="mt-6">
          <InvitationsTable
            invitations={usedInvitations}
            onCopy={handleCopyCode}
            onRevoke={handleRevokeInvitation}
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
            showActions={false}
          />
        </TabsContent>

        <TabsContent value="revoked" className="mt-6">
          <InvitationsTable
            invitations={revokedInvitations}
            onCopy={handleCopyCode}
            onRevoke={handleRevokeInvitation}
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
            showActions={false}
          />
        </TabsContent>

        <TabsContent value="expired" className="mt-6">
          <InvitationsTable
            invitations={expiredInvitations}
            onCopy={handleCopyCode}
            onRevoke={handleRevokeInvitation}
            getStatusBadge={getStatusBadge}
            getRoleBadge={getRoleBadge}
            showActions={false}
          />
        </TabsContent>
      </Tabs>

      {/* Create Invitation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User Invitation</DialogTitle>
            <DialogDescription>
              Generate an invite code for a new user. They will be automatically
              approved when they sign up with this code.
            </DialogDescription>
          </DialogHeader>

          {createdInvite ? (
            // Show created invite code
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  Invitation created successfully!
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Signup Link</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono text-blue-600 flex-1 truncate">
                      {window.location.origin}/signup?invite={createdInvite.invite_code}
                    </code>
                    <Button
                      size="sm"
                      variant={linkCopied ? "outline" : "default"}
                      onClick={() => handleCopySignupLink(createdInvite.invite_code)}
                      className={`shrink-0 ${linkCopied ? 'bg-green-50 text-green-700 border-green-300' : ''}`}
                    >
                      {linkCopied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Copy this link and send it to the user. The invite code will be pre-filled.
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="text-sm">{createdInvite.email}</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Role</Label>
                  <div className="mt-1">{getRoleBadge(createdInvite.role)}</div>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Expires</Label>
                  <p className="text-sm">
                    {new Date(createdInvite.expires_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Next step:</strong> Copy the signup link above and send it to{' '}
                  <strong>{createdInvite.email}</strong> via email. When they click it,
                  they'll be taken directly to the signup page with the invite code already filled in.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            // Creation form
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
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">User Role *</Label>
                <Select
                  value={newInvite.role}
                  onValueChange={(value: UserRole) =>
                    setNewInvite({ ...newInvite, role: value })
                  }
                  disabled={creating}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (View & Edit)</SelectItem>
                    <SelectItem value="secondary_admin">
                      Secondary Admin (User Management)
                    </SelectItem>
                    <SelectItem value="primary_admin">
                      Primary Admin (Full Access)
                    </SelectItem>
                    <SelectItem value="super_user">
                      Super User (System Admin)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Expires In (Days) *</Label>
                <Select
                  value={String(newInvite.expiresInDays)}
                  onValueChange={(value) =>
                    setNewInvite({ ...newInvite, expiresInDays: parseInt(value) })
                  }
                  disabled={creating}
                >
                  <SelectTrigger id="expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days (recommended)</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g., New team member, Finance department"
                  value={newInvite.notes}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, notes: e.target.value })
                  }
                  disabled={creating}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {createdInvite ? (
              <Button
                onClick={() => {
                  setCreatedInvite(null);
                  setLinkCopied(false);
                  setShowCreateDialog(false);
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateInvitation} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Invitation'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// Invitations Table Component
// =====================================================

interface InvitationsTableProps {
  invitations: UserInvitation[];
  onCopy: (code: string) => void;
  onRevoke: (id: string, email: string) => void;
  getStatusBadge: (status: InvitationStatus) => JSX.Element;
  getRoleBadge: (role: UserRole) => JSX.Element;
  showActions: boolean;
}

function InvitationsTable({
  invitations,
  onCopy,
  onRevoke,
  getStatusBadge,
  getRoleBadge,
  showActions,
}: InvitationsTableProps) {
  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">No invitations found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invite Code</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {invitation.invite_code}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCopy(invitation.invite_code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{invitation.email}</TableCell>
                <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {new Date(invitation.created_at).toLocaleDateString()}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRevoke(invitation.id, invitation.email)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
