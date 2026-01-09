/**
 * DataCleanup Component
 * 
 * Admin panel component for safely deleting operational data.
 * - super_admin: Can delete all orgs or select specific org
 * - primary_admin: Can only delete their own organization
 * 
 * Features:
 * - Two-step confirmation modal
 * - Type "DELETE ALL DATA" to confirm
 * - Shows what will be deleted before proceeding
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    AlertTriangle,
    Trash2,
    Loader2,
    CheckCircle,
    XCircle
} from 'lucide-react';

interface CleanupResult {
    table_name: string;
    rows_deleted: number;
    status: string;
}

export default function DataCleanup() {
    const { profile } = useAuth();
    const [scope, setScope] = useState<'current_org' | 'all_orgs'>('current_org');
    const [resetTaxonomy, setResetTaxonomy] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<CleanupResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isSuperAdmin = profile?.role === 'super_admin';
    const canDeleteAllOrgs = isSuperAdmin;

    const CONFIRMATION_PHRASE = 'DELETE ALL DATA';

    const handleInitiateCleanup = () => {
        setShowConfirmation(true);
        setConfirmText('');
        setResults(null);
        setError(null);
    };

    const handleCancel = () => {
        setShowConfirmation(false);
        setConfirmText('');
    };

    const handleConfirmCleanup = async () => {
        if (confirmText !== CONFIRMATION_PHRASE) {
            setError(`Please type "${CONFIRMATION_PHRASE}" exactly to confirm`);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('cleanup_operational_data', {
                p_scope: scope,
                p_organization_id: scope === 'current_org' ? profile?.organization_id : null,
                p_reset_taxonomy: resetTaxonomy
            });

            if (rpcError) throw rpcError;

            setResults(data as CleanupResult[]);
            setShowConfirmation(false);
            setConfirmText('');
        } catch (err: any) {
            console.error('Cleanup error:', err);
            setError(err.message || 'Failed to execute cleanup');
        } finally {
            setIsLoading(false);
        }
    };

    const dataCategories = [
        'Risks (all periods)',
        'Controls',
        'KRIs/KCIs',
        'Risk Appetite Statements',
        'Risk Appetite Categories',
        'Risk Thresholds',
        'Incidents',
        'Audit Log',
        'Risk Intelligence Data',
        'Periods',
        'Divisions & Departments',
        'Organization Libraries'
    ];

    return (
        <Card style={{ border: '2px solid #ef4444', backgroundColor: '#fef2f2' }}>
            <CardHeader>
                <CardTitle style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={24} />
                    Danger Zone: Data Cleanup
                </CardTitle>
                <CardDescription style={{ color: '#991b1b' }}>
                    Permanently delete operational data. This action cannot be undone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Scope Selection */}
                {canDeleteAllOrgs && (
                    <div style={{ marginBottom: '16px' }}>
                        <Label htmlFor="cleanup-scope" style={{ fontWeight: '600' }}>Cleanup Scope</Label>
                        <Select value={scope} onValueChange={(v) => setScope(v as 'current_org' | 'all_orgs')}>
                            <SelectTrigger id="cleanup-scope" style={{ marginTop: '4px' }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="current_org">Current Organization Only</SelectItem>
                                <SelectItem value="all_orgs">⚠️ ALL Organizations (Super Admin)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* What will be deleted */}
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px', color: '#991b1b' }}>
                        The following will be permanently deleted:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#7f1d1d' }}>
                        {dataCategories.map((cat) => (
                            <li key={cat}>{cat}</li>
                        ))}
                        {resetTaxonomy && (
                            <li style={{ fontWeight: '600' }}>Risk Taxonomy (Categories & Subcategories)</li>
                        )}
                    </ul>
                    <p style={{ marginTop: '12px', fontSize: '13px', color: '#059669', fontWeight: '500' }}>
                        ✓ User accounts and organizations will be preserved
                    </p>
                    {resetTaxonomy && (
                        <p style={{ marginTop: '4px', fontSize: '13px', color: '#2563eb', fontWeight: '500' }}>
                            → Taxonomy will be reseeded with industry defaults
                        </p>
                    )}
                </div>

                {/* Taxonomy Reset Option */}
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={resetTaxonomy}
                            onChange={(e) => setResetTaxonomy(e.target.checked)}
                            style={{ marginTop: '3px' }}
                        />
                        <div>
                            <span style={{ fontWeight: '600', color: '#92400e' }}>Also reset Risk Taxonomy</span>
                            <p style={{ fontSize: '13px', color: '#a16207', margin: '4px 0 0 0' }}>
                                Clear and reseed risk categories/subcategories with industry defaults.
                                Useful for starting fresh with a clean taxonomy structure.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Initiate Button */}
                {!showConfirmation && !results && (
                    <Button
                        variant="destructive"
                        onClick={handleInitiateCleanup}
                        style={{ width: '100%' }}
                    >
                        <Trash2 size={16} style={{ marginRight: '8px' }} />
                        Delete {scope === 'all_orgs' ? 'All Organizations Data' : 'Organization Data'}
                    </Button>
                )}

                {/* Confirmation Modal */}
                {showConfirmation && (
                    <div style={{
                        padding: '16px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '2px solid #dc2626'
                    }}>
                        <p style={{ fontWeight: '600', color: '#dc2626', marginBottom: '12px' }}>
                            ⚠️ Final Confirmation Required
                        </p>
                        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                            Type <strong>{CONFIRMATION_PHRASE}</strong> to confirm deletion:
                        </p>
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={CONFIRMATION_PHRASE}
                            style={{ marginBottom: '12px' }}
                            autoComplete="off"
                        />
                        {error && (
                            <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
                                {error}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                style={{ flex: 1 }}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmCleanup}
                                disabled={confirmText !== CONFIRMATION_PHRASE || isLoading}
                                style={{ flex: 1 }}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} style={{ marginRight: '8px' }} />
                                        Deleting...
                                    </>
                                ) : (
                                    'Confirm Delete'
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Results */}
                {results && (
                    <div style={{
                        padding: '16px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        border: '1px solid #86efac'
                    }}>
                        <p style={{ fontWeight: '600', color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={20} />
                            Cleanup Complete
                        </p>
                        <div style={{ maxHeight: '200px', overflow: 'auto', fontSize: '13px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #bbf7d0' }}>
                                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Table</th>
                                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Deleted</th>
                                        <th style={{ textAlign: 'center', padding: '4px 8px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.filter(r => r.rows_deleted > 0 || r.status === 'cleared').map((r) => (
                                        <tr key={r.table_name} style={{ borderBottom: '1px solid #dcfce7' }}>
                                            <td style={{ padding: '4px 8px' }}>{r.table_name}</td>
                                            <td style={{ textAlign: 'right', padding: '4px 8px' }}>{r.rows_deleted}</td>
                                            <td style={{ textAlign: 'center', padding: '4px 8px' }}>
                                                {r.status === 'cleared' ? '✓' : '−'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setResults(null)}
                            style={{ marginTop: '12px', width: '100%' }}
                        >
                            Done
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
