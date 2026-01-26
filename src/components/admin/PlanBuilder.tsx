/**
 * Plan Builder - Super Admin
 * 
 * CRUD interface for subscription plans.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, RefreshCw, Users, DollarSign } from 'lucide-react';

interface SubscriptionPlan {
    id: string;
    name: string;
    max_users: number | null;
    price_monthly: number;
    features: Record<string, boolean>;
    is_active: boolean;
    org_count: number;
}

const FEATURE_LABELS: Record<string, string> = {
    risk_register: 'Risk Register',
    controls_library: 'Controls Library',
    kri_monitoring: 'KRI Monitoring',
    basic_incidents: 'Basic Incidents',
    basic_ai: 'Basic AI',
    ai_full: 'Full AI Suite',
    risk_intel: 'Risk Intelligence',
    sso: 'SSO / SAML',
    board_reporting: 'Board Reporting',
    dedicated_instance: 'Dedicated Instance',
};

export default function PlanBuilder() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formMaxUsers, setFormMaxUsers] = useState<string>('');
    const [formPrice, setFormPrice] = useState('');
    const [formFeatures, setFormFeatures] = useState<Record<string, boolean>>({});
    const [formActive, setFormActive] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPlans();
    }, []);

    async function loadPlans() {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('list_subscription_plans');
            if (error) {
                console.error('Failed to load plans:', error);
                alert('Failed to load plans: ' + error.message);
                return;
            }
            setPlans(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }

    function openCreateDialog() {
        setEditingPlan(null);
        setFormName('');
        setFormMaxUsers('');
        setFormPrice('');
        setFormFeatures({});
        setFormActive(true);
        setIsDialogOpen(true);
    }

    function openEditDialog(plan: SubscriptionPlan) {
        setEditingPlan(plan);
        setFormName(plan.name);
        setFormMaxUsers(plan.max_users?.toString() || '');
        setFormPrice(plan.price_monthly.toString());
        setFormFeatures(plan.features || {});
        setFormActive(plan.is_active);
        setIsDialogOpen(true);
    }

    async function handleSave() {
        if (!formName.trim()) {
            alert('Plan name is required');
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase.rpc('upsert_subscription_plan', {
                p_id: editingPlan?.id || null,
                p_name: formName.trim(),
                p_max_users: formMaxUsers ? parseInt(formMaxUsers) : null,
                p_price_monthly: parseFloat(formPrice) || 0,
                p_features: formFeatures,
                p_is_active: formActive,
            });

            if (error) {
                alert('Failed to save plan: ' + error.message);
                return;
            }

            setIsDialogOpen(false);
            loadPlans();
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    }

    function toggleFeature(key: string) {
        setFormFeatures(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Plans & Pricing</h2>
                    <p className="text-muted-foreground">
                        Manage subscription tiers and feature access
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadPlans} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={openCreateDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Plan
                    </Button>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => (
                    <Card key={plan.id} className={!plan.is_active ? 'opacity-50' : ''}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-2">
                                ${plan.price_monthly}
                                <span className="text-sm font-normal text-muted-foreground">/mo</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                <Users className="h-4 w-4" />
                                {plan.max_users ? `${plan.max_users} users` : 'Unlimited users'}
                            </div>
                            <div className="flex items-center gap-2 text-sm mb-3">
                                <Badge variant="outline">{plan.org_count} orgs</Badge>
                                {!plan.is_active && <Badge variant="destructive">Inactive</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {Object.entries(plan.features || {})
                                    .filter(([_, v]) => v)
                                    .map(([k]) => FEATURE_LABELS[k] || k)
                                    .slice(0, 3)
                                    .join(', ')}
                                {Object.values(plan.features || {}).filter(Boolean).length > 3 && '...'}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                        <DialogDescription>
                            Configure the plan's limits and feature access.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Plan Name *</Label>
                                <Input
                                    id="name"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g., Professional"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Monthly Price ($)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formPrice}
                                    onChange={(e) => setFormPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="maxUsers">Max Users (leave empty for unlimited)</Label>
                                <Input
                                    id="maxUsers"
                                    type="number"
                                    value={formMaxUsers}
                                    onChange={(e) => setFormMaxUsers(e.target.value)}
                                    placeholder="Unlimited"
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                                <Switch
                                    id="active"
                                    checked={formActive}
                                    onCheckedChange={setFormActive}
                                />
                                <Label htmlFor="active">Plan is Active</Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Features Included</Label>
                            <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg">
                                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                                    <div key={key} className="flex items-center space-x-2">
                                        <Switch
                                            id={`feature-${key}`}
                                            checked={formFeatures[key] || false}
                                            onCheckedChange={() => toggleFeature(key)}
                                        />
                                        <Label htmlFor={`feature-${key}`} className="text-sm">
                                            {label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
