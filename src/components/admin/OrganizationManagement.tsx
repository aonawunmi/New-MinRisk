/**
 * Super Admin: Organization Management
 * 
 * Allows Super Admin to:
 * - View all organizations
 * - Create new organizations
 * - Invite Primary Admins to organizations
 * - Suspend/Reactivate organizations
 */

import React, { useState, useEffect } from 'react';
import { supabase, getClerkToken } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Users, UserPlus, RefreshCw, Ban, CheckCircle, ClipboardList } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
    code: string;
    description: string | null;
    status: 'active' | 'suspended';
    created_at: string;
    suspended_at: string | null;
    user_count: number;
    plan_id: string | null;
    plan_name: string | null;
    subscription_status: string | null;
    trial_ends_at: string | null;
    institution_type: string | null;
}

const INSTITUTION_TYPES = [
    'Bank',
    'Securities Exchange',
    'Capital Market Operator',
    'Insurance Company',
    'Pension Fund Administrator',
    'Microfinance Bank',
    'Fintech',
    'Asset Management',
    'Brokerage Firm',
    'Clearing House',
    'Development Finance Institution',
    'Other',
];

interface CreateOrgForm {
    name: string;
    code: string;
    description: string;
    institutionType: string;
    planId: string;
    isTrial: boolean;
}

interface InviteAdminForm {
    organizationId: string;
    organizationName: string;
    email: string;
    fullName: string;
}

export function OrganizationManagement() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [managePlanDialogOpen, setManagePlanDialogOpen] = useState(false);
    const [selectedOrgForPlan, setSelectedOrgForPlan] = useState<Organization | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [createForm, setCreateForm] = useState<CreateOrgForm>({
        name: '',
        code: '',
        description: '',
        institutionType: '',
        planId: '',
        isTrial: false,
    });

    const [inviteForm, setInviteForm] = useState<InviteAdminForm>({
        organizationId: '',
        organizationName: '',
        email: '',
        fullName: '',
    });

    const [planForm, setPlanForm] = useState({
        planId: '',
        isTrial: false
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        await Promise.all([loadOrganizations(), loadPlans()]);
        setLoading(false);
    }

    async function loadPlans() {
        const { data } = await supabase.rpc('list_subscription_plans');
        if (data) setPlans(data);
    }

    async function loadOrganizations() {
        try {
            const { data, error } = await supabase.rpc('list_organizations_admin');

            if (error) {
                console.error('Failed to load organizations:', error);
                alert('Failed to load organizations');
                return;
            }

            setOrganizations(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred');
        }
    }

    async function handleCreateOrganization() {
        if (!createForm.name || !createForm.code) {
            alert('Name and code are required');
            return;
        }

        setSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('create_organization', {
                p_name: createForm.name,
                p_code: createForm.code.toUpperCase(),
                p_description: createForm.description || null,
                p_plan_id: createForm.planId || null,
                p_start_trial: createForm.isTrial,
                p_institution_type: createForm.institutionType || null,
            });

            if (error) {
                console.error('Failed to create organization:', error);
                alert('Error: ' + error.message);
                return;
            }

            alert(`Organization "${createForm.name}" created successfully!`);
            setCreateDialogOpen(false);
            setCreateForm({ name: '', code: '', description: '', institutionType: '', planId: '', isTrial: false });
            loadOrganizations();
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleInvitePrimaryAdmin() {
        if (!inviteForm.email || !inviteForm.fullName) {
            alert('Email and full name are required');
            return;
        }

        setSubmitting(true);
        try {
            const token = await getClerkToken();
            if (!token) {
                alert('Not authenticated');
                return;
            }

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/super-admin-invite-primary-admin`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        organizationId: inviteForm.organizationId,
                        email: inviteForm.email,
                        fullName: inviteForm.fullName,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                alert(result.error || 'Failed to invite Primary Admin');
                return;
            }

            alert(`Invite sent to ${inviteForm.email}! They will receive an email to set their password.`);
            setInviteDialogOpen(false);
            setInviteForm({ organizationId: '', organizationName: '', email: '', fullName: '' });
            loadOrganizations();
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    }

    function openInviteDialog(org: Organization) {
        setInviteForm({
            organizationId: org.id,
            organizationName: org.name,
            email: '',
            fullName: '',
        });
        setInviteDialogOpen(true);
    }

    function openManagePlan(org: Organization) {
        setSelectedOrgForPlan(org);
        setPlanForm({
            planId: org.plan_id || '',
            isTrial: org.subscription_status === 'trial'
        });
        setManagePlanDialogOpen(true);
    }

    async function handleUpdatePlan() {
        if (!selectedOrgForPlan || !planForm.planId) return;

        setSubmitting(true);
        try {
            const { error } = await supabase.rpc('update_organization_plan', {
                p_org_id: selectedOrgForPlan.id,
                p_plan_id: planForm.planId,
                p_start_trial: planForm.isTrial
            });

            if (error) {
                console.error('Failed to update plan:', error);
                alert('Error: ' + error.message);
                return;
            }

            alert(`Plan updated for "${selectedOrgForPlan.name}"`);
            setManagePlanDialogOpen(false);
            loadOrganizations();
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSuspendOrg(org: Organization) {
        if (!confirm(`Are you sure you want to suspend "${org.name}"? All ${org.user_count} users will be blocked from accessing the system.`)) {
            return;
        }

        try {
            const { error } = await supabase.rpc('suspend_organization', {
                p_organization_id: org.id,
            });

            if (error) {
                console.error('Failed to suspend organization:', error);
                alert('Error: ' + error.message);
                return;
            }

            alert(`Organization "${org.name}" has been suspended.`);
            loadOrganizations();
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred');
        }
    }

    async function handleReactivateOrg(org: Organization) {
        if (!confirm(`Reactivate "${org.name}"? All ${org.user_count} users will regain access.`)) {
            return;
        }

        try {
            const { error } = await supabase.rpc('reactivate_organization', {
                p_organization_id: org.id,
            });

            if (error) {
                console.error('Failed to reactivate organization:', error);
                alert('Error: ' + error.message);
                return;
            }

            alert(`Organization "${org.name}" has been reactivated.`);
            loadOrganizations();
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred');
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Organizations</h2>
                    <p className="text-muted-foreground">
                        Manage all organizations on the platform
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadOrganizations} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Organization
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Organization</DialogTitle>
                                <DialogDescription>
                                    Add a new organization to the platform. You'll be able to invite
                                    their Primary Admin after creation.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="org-name">Organization Name *</Label>
                                    <Input
                                        id="org-name"
                                        placeholder="Acme Corporation"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org-code">Organization Code *</Label>
                                    <Input
                                        id="org-code"
                                        placeholder="ACME"
                                        value={createForm.code}
                                        onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                                        maxLength={10}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Short unique identifier (max 10 characters)
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        id="org-desc"
                                        placeholder="Brief description of the organization"
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org-type">Institution Type *</Label>
                                    <Select
                                        value={createForm.institutionType}
                                        onValueChange={(val) => setCreateForm({ ...createForm, institutionType: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select institution type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {INSTITUTION_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Determines which regulators oversee this organization
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org-plan">Subscription Plan</Label>
                                    <Select
                                        value={createForm.planId}
                                        onValueChange={(val) => setCreateForm({ ...createForm, planId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plans.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} (${p.price_monthly}/mo)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch
                                        id="trial-mode"
                                        checked={createForm.isTrial}
                                        onCheckedChange={(checked) => setCreateForm({ ...createForm, isTrial: checked })}
                                    />
                                    <Label htmlFor="trial-mode">Start with 14-day Free Trial</Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateOrganization} disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create Organization'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Organizations Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        All Organizations
                    </CardTitle>
                    <CardDescription>
                        {organizations.length} organization{organizations.length !== 1 ? 's' : ''} on the platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : organizations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No organizations yet</p>
                            <p className="text-sm">Create your first organization to get started</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Users</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizations.map((org) => (
                                    <TableRow key={org.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{org.name}</div>
                                                {org.description && (
                                                    <div className="text-sm text-muted-foreground">{org.description}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{org.code}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {org.institution_type ? (
                                                <Badge variant="secondary">{org.institution_type}</Badge>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{org.plan_name || 'N/A'}</div>
                                                {org.subscription_status === 'trial' && (
                                                    <span className="text-xs text-amber-600 font-semibold">
                                                        Trial ends {new Date(org.trial_ends_at!).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {org.status === 'suspended' ? (
                                                <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                    <Ban className="h-3 w-3" />
                                                    Suspended
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="flex w-fit items-center gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Active
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                {org.user_count}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(org.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openInviteDialog(org)}
                                                    disabled={org.status === 'suspended'}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                    Invite Admin
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openManagePlan(org)}
                                                >
                                                    <ClipboardList className="h-4 w-4 mr-1" />
                                                    Plan
                                                </Button>

                                                {org.status === 'suspended' ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleReactivateOrg(org)}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Reactivate
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleSuspendOrg(org)}
                                                    >
                                                        <Ban className="h-4 w-4 mr-1" />
                                                        Suspend
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Invite Primary Admin Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Primary Admin</DialogTitle>
                        <DialogDescription>
                            Invite the first admin for <strong>{inviteForm.organizationName}</strong>.
                            They will receive an email to set their password and activate their account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin-name">Full Name *</Label>
                            <Input
                                id="admin-name"
                                placeholder="John Doe"
                                value={inviteForm.fullName}
                                onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admin-email">Email *</Label>
                            <Input
                                id="admin-email"
                                type="email"
                                placeholder="john@example.com"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                An invite email will be sent to this address
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleInvitePrimaryAdmin} disabled={submitting}>
                            {submitting ? 'Sending Invite...' : 'Send Invite'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Plan Dialog */}
            <Dialog open={managePlanDialogOpen} onOpenChange={setManagePlanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Subscription Plan</DialogTitle>
                        <DialogDescription>
                            Update the subscription for <strong>{selectedOrgForPlan?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-plan">Subscription Plan</Label>
                            <Select
                                value={planForm.planId}
                                onValueChange={(val) => setPlanForm({ ...planForm, planId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} (${p.price_monthly}/mo)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="edit-trial-mode"
                                checked={planForm.isTrial}
                                onCheckedChange={(checked) => setPlanForm({ ...planForm, isTrial: checked })}
                            />
                            <Label htmlFor="edit-trial-mode">Enable 14-day Free Trial</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setManagePlanDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdatePlan} disabled={submitting}>
                            {submitting ? 'Updating...' : 'Update Plan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
