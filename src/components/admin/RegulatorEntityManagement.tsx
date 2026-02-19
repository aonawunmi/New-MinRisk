/**
 * Regulator Entity Management — Super Admin
 *
 * CRUD interface for managing regulatory bodies (e.g., CBN, SEC, NAICOM).
 * NOTE: This is for managing REGULATORY BODY records, NOT regulator user accounts.
 *       RegulatorManagement.tsx handles regulator USER management — keep it unchanged.
 *
 * Features:
 * - View all regulatory bodies
 * - Create new regulators
 * - Edit regulator details (name, code, website, RSS feeds)
 * - Toggle active/inactive
 * - Manage institution type mappings
 */

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Pencil,
  CheckCircle,
  XCircle,
  Shield,
  ExternalLink,
  Building2,
  Link2,
  Trash2,
} from 'lucide-react';
import {
  getRegulators,
  createRegulator,
  updateRegulator,
  getInstitutionTypesByRegulator,
  getInstitutionTypes,
  mapRegulatorToInstitutionType,
  unmapRegulatorFromInstitutionType,
  type Regulator,
  type InstitutionType,
} from '@/lib/institutionTypes';

interface CreateForm {
  code: string;
  name: string;
  country: string;
  websiteUrl: string;
  rssFeedUrls: string;
  description: string;
}

const emptyForm: CreateForm = {
  code: '',
  name: '',
  country: 'Nigeria',
  websiteUrl: '',
  rssFeedUrls: '',
  description: '',
};

export default function RegulatorEntityManagement() {
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingRegulator, setEditingRegulator] = useState<Regulator | null>(null);
  const [editForm, setEditForm] = useState<CreateForm>(emptyForm);

  // Mapping dialog
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingRegulator, setMappingRegulator] = useState<Regulator | null>(null);
  const [currentMappings, setCurrentMappings] = useState<any[]>([]);
  const [allInstitutionTypes, setAllInstitutionTypes] = useState<InstitutionType[]>([]);
  const [selectedTypeToMap, setSelectedTypeToMap] = useState('');

  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadRegulators();
  }, [showAll]);

  async function loadRegulators() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await getRegulators(!showAll);
      if (err) throw err;
      setRegulators(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!createForm.code || !createForm.name) {
      setError('Code and name are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const rssUrls = createForm.rssFeedUrls
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      const { error: err } = await createRegulator({
        code: createForm.code,
        name: createForm.name,
        country: createForm.country || 'Nigeria',
        website_url: createForm.websiteUrl || undefined,
        rss_feed_urls: rssUrls,
        description: createForm.description || undefined,
      });

      if (err) throw err;

      setSuccess(`Regulator "${createForm.name}" created successfully`);
      setCreateOpen(false);
      setCreateForm(emptyForm);
      loadRegulators();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(reg: Regulator) {
    setEditingRegulator(reg);
    setEditForm({
      code: reg.code,
      name: reg.name,
      country: reg.country || 'Nigeria',
      websiteUrl: reg.website_url || '',
      rssFeedUrls: (reg.rss_feed_urls || []).join('\n'),
      description: reg.description || '',
    });
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editingRegulator || !editForm.name) return;

    setSubmitting(true);
    setError(null);

    try {
      const rssUrls = editForm.rssFeedUrls
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      const { error: err } = await updateRegulator(editingRegulator.id, {
        name: editForm.name,
        code: editForm.code.toUpperCase(),
        country: editForm.country,
        website_url: editForm.websiteUrl || null,
        rss_feed_urls: rssUrls,
        description: editForm.description || null,
      });

      if (err) throw err;

      setSuccess(`"${editForm.name}" updated`);
      setEditOpen(false);
      setEditingRegulator(null);
      loadRegulators();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(reg: Regulator) {
    setError(null);
    try {
      const { error: err } = await updateRegulator(reg.id, {
        is_active: !reg.is_active,
      });
      if (err) throw err;
      setSuccess(`"${reg.name}" ${reg.is_active ? 'deactivated' : 'activated'}`);
      loadRegulators();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function openMappings(reg: Regulator) {
    setMappingRegulator(reg);
    setSelectedTypeToMap('');

    const [mappingsResult, typesResult] = await Promise.all([
      getInstitutionTypesByRegulator(reg.id),
      getInstitutionTypes(true),
    ]);

    setCurrentMappings(mappingsResult.data || []);
    setAllInstitutionTypes(typesResult.data || []);
    setMappingOpen(true);
  }

  async function handleAddMapping() {
    if (!mappingRegulator || !selectedTypeToMap) return;

    setError(null);
    try {
      const { error: err } = await mapRegulatorToInstitutionType(selectedTypeToMap, mappingRegulator.id);
      if (err) throw err;

      setSuccess('Mapping added');
      setSelectedTypeToMap('');

      // Refresh mappings
      const { data } = await getInstitutionTypesByRegulator(mappingRegulator.id);
      setCurrentMappings(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRemoveMapping(mappingId: string) {
    if (!mappingRegulator) return;

    setError(null);
    try {
      const { error: err } = await unmapRegulatorFromInstitutionType(mappingId);
      if (err) throw err;

      setSuccess('Mapping removed');
      const { data } = await getInstitutionTypesByRegulator(mappingRegulator.id);
      setCurrentMappings(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Filter out already-mapped institution types from the dropdown
  const mappedTypeIds = new Set(currentMappings.map((m: any) => m.institution_type_id));
  const unmappedTypes = allInstitutionTypes.filter(t => !mappedTypeIds.has(t.id));

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading regulators...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Regulatory Bodies
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage regulatory bodies and their institution type mappings. {regulators.length} regulators loaded.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show inactive
          </label>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Regulator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Regulator</DialogTitle>
                <DialogDescription>
                  Add a new regulatory body to the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code *</Label>
                    <Input
                      placeholder="e.g. CBN"
                      value={createForm.code}
                      onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={createForm.country}
                      onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g. Central Bank of Nigeria"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website URL</Label>
                  <Input
                    placeholder="https://www.cbn.gov.ng"
                    value={createForm.websiteUrl}
                    onChange={(e) => setCreateForm({ ...createForm, websiteUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RSS Feed URLs (one per line)</Label>
                  <textarea
                    className="w-full min-h-[80px] p-2 border rounded-md text-sm"
                    placeholder="https://example.com/feed.xml"
                    value={createForm.rssFeedUrls}
                    onChange={(e) => setCreateForm({ ...createForm, rssFeedUrls: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
          {success}
        </div>
      )}

      {/* Regulators Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>RSS Feeds</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regulators.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono font-bold">
                      {reg.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{reg.name}</div>
                      {reg.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {reg.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{reg.country || '-'}</TableCell>
                  <TableCell>
                    {reg.website_url ? (
                      <a
                        href={reg.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {(reg.rss_feed_urls || []).length} feed(s)
                    </span>
                  </TableCell>
                  <TableCell>
                    {reg.is_active ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMappings(reg)}
                        title="Manage institution type mappings"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(reg)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(reg)}
                        title={reg.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {reg.is_active ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {regulators.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No regulators found.
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Regulator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={editForm.websiteUrl}
                onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>RSS Feed URLs (one per line)</Label>
              <textarea
                className="w-full min-h-[80px] p-2 border rounded-md text-sm"
                value={editForm.rssFeedUrls}
                onChange={(e) => setEditForm({ ...editForm, rssFeedUrls: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Institution Type Mapping Dialog */}
      <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Institution Types for {mappingRegulator?.name}
            </DialogTitle>
            <DialogDescription>
              Manage which institution types are regulated by {mappingRegulator?.code}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current mappings */}
            {currentMappings.length > 0 ? (
              <div className="space-y-2">
                {currentMappings.map((mapping: any) => (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">
                          {mapping.institution_types?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({mapping.institution_types?.category})
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMapping(mapping.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No institution types mapped yet.
              </p>
            )}

            {/* Add new mapping */}
            {unmappedTypes.length > 0 && (
              <div className="flex gap-2 pt-2 border-t">
                <Select value={selectedTypeToMap} onValueChange={setSelectedTypeToMap}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select institution type to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unmappedTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleAddMapping}
                  disabled={!selectedTypeToMap}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
