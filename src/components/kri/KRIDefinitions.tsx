/**
 * KRIDefinitions Component
 *
 * Manage KRI (Key Risk Indicator) definitions, including creation,
 * editing, linking to risks, and viewing coverage
 */

import { useState, useEffect } from 'react';
import {
  getKRIDefinitions,
  createKRI,
  updateKRI,
  deleteKRI,
  linkKRIToRisk,
  unlinkKRIFromRisk,
  getKRICoverageStats,
  type KRIDefinition,
} from '@/lib/kri';
import { getRisks } from '@/lib/risks';
import { isUserAdmin } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import KRIForm from './KRIForm';
import type { Risk } from '@/types/risk';

export default function KRIDefinitions() {
  const [kris, setKris] = useState<KRIDefinition[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [coverage, setCoverage] = useState<{
    total_risks: number;
    risks_with_kris: number;
    coverage_percentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingKRI, setEditingKRI] = useState<KRIDefinition | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedKRIs, setSelectedKRIs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    const adminStatus = await isUserAdmin();
    setIsAdmin(adminStatus);
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [krisResult, risksResult, coverageResult] = await Promise.all([
        getKRIDefinitions(),
        getRisks(),
        getKRICoverageStats(),
      ]);

      if (krisResult.error) throw new Error(krisResult.error.message);
      if (risksResult.error) throw new Error(risksResult.error.message);
      if (coverageResult.error) throw new Error(coverageResult.error.message);

      setKris(krisResult.data || []);
      setRisks(risksResult.data || []);
      setCoverage(coverageResult.data);
    } catch (err) {
      console.error('Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveKRI(kriData: Partial<KRIDefinition>, riskCodeToLink?: string) {
    try {
      let kriId: string | undefined;

      console.log('handleSaveKRI called with riskCodeToLink:', riskCodeToLink);

      if (editingKRI) {
        // When editing: Only update KRI data, don't modify risk links (they're read-only)
        const result = await updateKRI(editingKRI.id, kriData);
        if (result.error) throw new Error(result.error.message);
        kriId = editingKRI.id;
        console.log('KRI updated:', kriId);
      } else {
        // When creating: Create KRI and link to risk if specified
        const result = await createKRI(kriData);
        if (result.error) throw new Error(result.error.message);
        kriId = result.data?.id;
        console.log('KRI created with ID:', kriId);

        // Link to risk if specified
        if (riskCodeToLink && kriId) {
          console.log('Linking KRI', kriId, 'to risk', riskCodeToLink);
          const linkResult = await linkKRIToRisk(kriId, riskCodeToLink);
          if (linkResult.error) {
            console.error('Link error:', linkResult.error);
            alert(`KRI created but failed to link to risk: ${linkResult.error.message}`);
          } else {
            console.log('Successfully linked KRI to risk');
          }
        } else {
          console.log('No risk code to link or no KRI ID');
        }
      }

      await loadData();
      setShowForm(false);
      setEditingKRI(null);
    } catch (err) {
      console.error('Save error:', err);
      alert(err instanceof Error ? err.message : 'Failed to save KRI');
    }
  }

  async function handleDeleteKRI(id: string) {
    // Find the KRI
    const kri = kris.find((k) => k.id === id);
    if (!kri) return;

    try {
      // Check if KRI is linked to any risks
      const { data: links, error: linksError } = await supabase
        .from('kri_risk_links')
        .select('risk_code')
        .eq('kri_id', id);

      if (linksError) {
        console.error('Error checking risk links:', linksError);
      }

      // Build confirmation message
      let confirmMessage = 'Are you sure you want to delete this KRI?';

      if (links && links.length > 0) {
        const riskCodes = links.map((link) => link.risk_code).join(', ');
        confirmMessage = `⚠️ WARNING: This KRI is currently monitoring ${links.length} risk(s): ${riskCodes}\n\nDeleting this KRI will remove all risk associations and historical data.\n\nAre you sure you want to permanently delete "${kri.kri_name}"?`;
      }

      if (!confirm(confirmMessage)) return;

      // Proceed with deletion
      const result = await deleteKRI(id);
      if (result.error) throw new Error(result.error.message);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete KRI');
    }
  }

  async function handleBulkDelete() {
    if (selectedKRIs.size === 0) {
      alert('Please select KRIs to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedKRIs.size} KRI(s)?\n\nThis will remove all risk associations and historical data.\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    let successCount = 0;
    let failCount = 0;

    for (const kriId of Array.from(selectedKRIs)) {
      try {
        const result = await deleteKRI(kriId);
        if (result.error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Delete error:', err);
        failCount++;
      }
    }

    alert(`Deleted ${successCount} KRI(s)${failCount > 0 ? `. ${failCount} failed.` : ''}`);
    setSelectedKRIs(new Set());
    await loadData();
  }

  function handleSelectKRI(kriId: string, checked: boolean) {
    const newSelection = new Set(selectedKRIs);
    if (checked) {
      newSelection.add(kriId);
    } else {
      newSelection.delete(kriId);
    }
    setSelectedKRIs(newSelection);
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedKRIs(new Set(kris.map(k => k.id)));
    } else {
      setSelectedKRIs(new Set());
    }
  }


  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading KRI definitions...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">KRI Definitions</h3>
          <p className="text-sm text-gray-600">
            Define and manage Key Risk Indicators
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {selectedKRIs.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
              >
                Delete Selected ({selectedKRIs.size})
              </Button>
            )}
            <Button onClick={() => setShowForm(true)}>+ New KRI</Button>
          </div>
        )}
      </div>

      {/* Coverage Stats */}
      {coverage && (
        <Card className={coverage.coverage_percentage < 50 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {coverage.coverage_percentage}%
                </p>
                <p className="text-sm text-gray-700">KRI Coverage</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>{coverage.risks_with_kris} of {coverage.total_risks} risks have KRIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KRI Table */}
      <Card>
        <CardHeader>
          <CardTitle>All KRI Definitions ({kris.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {kris.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-2">No KRIs defined yet</p>
              {isAdmin && <Button onClick={() => setShowForm(true)}>Create First KRI</Button>}
              {!isAdmin && <p className="text-gray-500 text-sm">Contact your administrator to create KRIs</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={kris.length > 0 && selectedKRIs.size === kris.length}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      />
                    </TableHead>
                  )}
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Thresholds</TableHead>
                  <TableHead>Linked Risks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kris.map((kri) => (
                  <TableRow key={kri.id}>
                    {isAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedKRIs.has(kri.id)}
                          onCheckedChange={(checked) => handleSelectKRI(kri.id, checked === true)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">
                      {kri.kri_code}
                    </TableCell>
                    <TableCell className="font-medium">{kri.kri_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{kri.kri_type}</Badge>
                    </TableCell>
                    <TableCell>{kri.unit_of_measure}</TableCell>
                    <TableCell>{kri.frequency}</TableCell>
                    <TableCell className="text-xs">
                      <div>Yellow: {kri.threshold_yellow_lower || '-'} - {kri.threshold_yellow_upper || '-'}</div>
                      <div>Red: {kri.threshold_red_lower || '-'} - {kri.threshold_red_upper || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge>{kri.linked_risk_codes?.length || 0} risk(s)</Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingKRI(kri);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteKRI(kri.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                      {!isAdmin && <span className="text-gray-400 text-sm">View only</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* KRI Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingKRI(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKRI ? 'Edit KRI' : 'New KRI Definition'}
            </DialogTitle>
          </DialogHeader>
          <KRIForm
            kri={editingKRI}
            onSave={handleSaveKRI}
            onCancel={() => {
              setShowForm(false);
              setEditingKRI(null);
            }}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
