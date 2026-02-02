/**
 * Regulator Management Component
 *
 * Allows super admins to:
 * - View all regulator users
 * - Invite new regulator users
 * - Manage regulator access (which regulators each user can access)
 * - View regulator assignments to organizations
 */

import { useState, useEffect } from 'react';
import {
  getAllRegulators,
  listRegulatorUsers,
  inviteRegulatorUser,
  updateRegulatorAccess,
  type Regulator,
  type RegulatorUser,
} from '@/lib/regulators';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Edit,
  Building2,
} from 'lucide-react';

export default function RegulatorManagement() {
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [regulatorUsers, setRegulatorUsers] = useState<RegulatorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invitation dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [selectedRegulators, setSelectedRegulators] = useState<string[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Edit access dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string>('');
  const [editUserName, setEditUserName] = useState<string>('');
  const [editSelectedRegulators, setEditSelectedRegulators] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Load regulators
      const { data: regsData, error: regsError } = await getAllRegulators();
      if (regsError) {
        setError('Failed to load regulators: ' + regsError.message);
        return;
      }
      setRegulators(regsData || []);

      // Load regulator users
      const { data: usersData, error: usersError } = await listRegulatorUsers();
      if (usersError) {
        setError('Failed to load regulator users: ' + usersError.message);
        return;
      }
      setRegulatorUsers(usersData || []);
    } catch (err) {
      setError('Unexpected error loading data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleInviteDialogOpen() {
    setInviteEmail('');
    setInviteFullName('');
    setSelectedRegulators([]);
    setInviteDialogOpen(true);
  }

  async function handleInviteSubmit() {
    if (!inviteEmail || !inviteFullName || selectedRegulators.length === 0) {
      setError('Please fill all fields and select at least one regulator');
      return;
    }

    setInviteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: inviteError } = await inviteRegulatorUser(
        inviteEmail,
        inviteFullName,
        selectedRegulators
      );

      if (inviteError) {
        setError('Failed to invite regulator user: ' + inviteError.message);
        return;
      }

      setSuccess(`Regulator user ${inviteEmail} invited successfully! Password reset email sent.`);
      setInviteDialogOpen(false);
      loadData(); // Reload data
    } catch (err) {
      setError('Unexpected error inviting user');
      console.error(err);
    } finally {
      setInviteLoading(false);
    }
  }

  function handleEditAccess(user: RegulatorUser) {
    setEditUserId(user.id);
    setEditUserName(user.full_name);
    setEditSelectedRegulators(user.regulators.map(r => r.id));
    setEditDialogOpen(true);
  }

  async function handleEditSubmit() {
    if (editSelectedRegulators.length === 0) {
      setError('Please select at least one regulator');
      return;
    }

    setEditLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await updateRegulatorAccess(
        editUserId,
        editSelectedRegulators
      );

      if (updateError) {
        setError('Failed to update regulator access: ' + updateError.message);
        return;
      }

      setSuccess(`Regulator access updated for ${editUserName}`);
      setEditDialogOpen(false);
      loadData(); // Reload data
    } catch (err) {
      setError('Unexpected error updating access');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  }

  function toggleRegulatorSelection(regulatorId: string, isEdit: boolean = false) {
    if (isEdit) {
      setEditSelectedRegulators(prev =>
        prev.includes(regulatorId)
          ? prev.filter(id => id !== regulatorId)
          : [...prev, regulatorId]
      );
    } else {
      setSelectedRegulators(prev =>
        prev.includes(regulatorId)
          ? prev.filter(id => id !== regulatorId)
          : [...prev, regulatorId]
      );
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Regulators Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Regulatory Bodies
              </CardTitle>
              <CardDescription>
                Active regulators in the system
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {regulators.map(reg => (
              <div
                key={reg.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="font-semibold">{reg.name}</div>
                <div className="text-sm text-muted-foreground">
                  Code: {reg.code}
                </div>
                {reg.jurisdiction && (
                  <Badge variant="secondary">{reg.jurisdiction}</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regulator Users Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Regulator Users
              </CardTitle>
              <CardDescription>
                Users with regulator access to view organization data
              </CardDescription>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleInviteDialogOpen}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Regulator User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Invite Regulator User</DialogTitle>
                  <DialogDescription>
                    Create a new regulator user and assign access to regulatory bodies
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@regulator.gov"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label>Assign to Regulators</Label>
                    <div className="border rounded-md p-4 space-y-3 mt-2">
                      {regulators.map(reg => (
                        <div key={reg.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`invite-${reg.id}`}
                            checked={selectedRegulators.includes(reg.id)}
                            onCheckedChange={() => toggleRegulatorSelection(reg.id)}
                          />
                          <label
                            htmlFor={`invite-${reg.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {reg.name} ({reg.code})
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      User will be able to view data from organizations assigned to these regulators
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    disabled={inviteLoading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleInviteSubmit} disabled={inviteLoading}>
                    {inviteLoading ? 'Inviting...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {regulatorUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No regulator users yet. Invite users to grant them regulator access.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Regulators</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regulatorUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.regulators.map(reg => (
                          <Badge key={reg.id} variant="outline">
                            {reg.code}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAccess(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Access Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Regulator Access</DialogTitle>
            <DialogDescription>
              Update regulator access for {editUserName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Assign to Regulators</Label>
              <div className="border rounded-md p-4 space-y-3 mt-2">
                {regulators.map(reg => (
                  <div key={reg.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${reg.id}`}
                      checked={editSelectedRegulators.includes(reg.id)}
                      onCheckedChange={() => toggleRegulatorSelection(reg.id, true)}
                    />
                    <label
                      htmlFor={`edit-${reg.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {reg.name} ({reg.code})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={editLoading}>
              {editLoading ? 'Updating...' : 'Update Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
