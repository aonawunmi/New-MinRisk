/**
 * Institution Type Management — Super Admin
 *
 * CRUD interface for managing institution types (data-driven taxonomy).
 * Replaces the hardcoded INSTITUTION_TYPES array in OrganizationManagement.
 *
 * Features:
 * - View all institution types grouped by category
 * - Create new institution types
 * - Edit existing types (name, category, description, keywords)
 * - Toggle active/inactive status
 * - View mapped regulators per type
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
import { Plus, Pencil, CheckCircle, XCircle, Building2, Shield } from 'lucide-react';
import {
  getInstitutionTypes,
  createInstitutionType,
  updateInstitutionType,
  getRegulatorsByInstitutionType,
  INSTITUTION_CATEGORIES,
  type InstitutionType,
  type InstitutionCategory,
} from '@/lib/institutionTypes';

interface CreateForm {
  name: string;
  slug: string;
  category: InstitutionCategory | '';
  description: string;
  keywords: string;
}

const emptyForm: CreateForm = {
  name: '',
  slug: '',
  category: '',
  description: '',
  keywords: '',
};

export default function InstitutionTypeManagement() {
  const [types, setTypes] = useState<InstitutionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<InstitutionType | null>(null);
  const [editForm, setEditForm] = useState<CreateForm>(emptyForm);

  // Regulator detail dialog
  const [regulatorDetailOpen, setRegulatorDetailOpen] = useState(false);
  const [selectedTypeRegulators, setSelectedTypeRegulators] = useState<any[]>([]);
  const [selectedTypeName, setSelectedTypeName] = useState('');

  // Show all (including inactive)
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadTypes();
  }, [showAll]);

  async function loadTypes() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await getInstitutionTypes(!showAll);
      if (err) throw err;
      setTypes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async function handleCreate() {
    if (!createForm.name || !createForm.category) {
      setError('Name and category are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const keywords = createForm.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      const { error: err } = await createInstitutionType({
        name: createForm.name,
        slug: createForm.slug || generateSlug(createForm.name),
        category: createForm.category as InstitutionCategory,
        description: createForm.description || undefined,
        default_scan_keywords: keywords,
      });

      if (err) throw err;

      setSuccess(`Institution type "${createForm.name}" created successfully`);
      setCreateOpen(false);
      setCreateForm(emptyForm);
      loadTypes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(type: InstitutionType) {
    setEditingType(type);
    setEditForm({
      name: type.name,
      slug: type.slug,
      category: type.category as InstitutionCategory,
      description: type.description || '',
      keywords: (type.default_scan_keywords || []).join(', '),
    });
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editingType || !editForm.name || !editForm.category) return;

    setSubmitting(true);
    setError(null);

    try {
      const keywords = editForm.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      const { error: err } = await updateInstitutionType(editingType.id, {
        name: editForm.name,
        category: editForm.category as InstitutionCategory,
        description: editForm.description || null,
        default_scan_keywords: keywords,
      });

      if (err) throw err;

      setSuccess(`"${editForm.name}" updated successfully`);
      setEditOpen(false);
      setEditingType(null);
      loadTypes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(type: InstitutionType) {
    setError(null);
    try {
      const { error: err } = await updateInstitutionType(type.id, {
        is_active: !type.is_active,
      });
      if (err) throw err;
      setSuccess(`"${type.name}" ${type.is_active ? 'deactivated' : 'activated'}`);
      loadTypes();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function viewRegulators(type: InstitutionType) {
    setSelectedTypeName(type.name);
    const { data } = await getRegulatorsByInstitutionType(type.id);
    setSelectedTypeRegulators(data || []);
    setRegulatorDetailOpen(true);
  }

  // Group types by category
  const groupedTypes = types.reduce((acc, type) => {
    const cat = type.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(type);
    return acc;
  }, {} as Record<string, InstitutionType[]>);

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading institution types...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Institution Types
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage institution type taxonomy for the platform. {types.length} types loaded.
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
                Add Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Institution Type</DialogTitle>
                <DialogDescription>
                  Add a new institution type to the platform taxonomy.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g. Commercial Bank"
                    value={createForm.name}
                    onChange={(e) => {
                      setCreateForm({
                        ...createForm,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    placeholder="auto-generated"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={createForm.category}
                    onValueChange={(val) => setCreateForm({ ...createForm, category: val as InstitutionCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTITUTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description of this institution type"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Scan Keywords (comma-separated)</Label>
                  <Input
                    placeholder="keyword1, keyword2, keyword3"
                    value={createForm.keywords}
                    onChange={(e) => setCreateForm({ ...createForm, keywords: e.target.value })}
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

      {/* Grouped Table */}
      {Object.entries(groupedTypes).map(([category, categoryTypes]) => (
        <Card key={category}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {category} ({categoryTypes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {type.slug}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {type.description || '-'}
                    </TableCell>
                    <TableCell>
                      {(type.default_scan_keywords || []).length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {type.default_scan_keywords.slice(0, 3).join(', ')}
                          {type.default_scan_keywords.length > 3 && ` +${type.default_scan_keywords.length - 3}`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.is_active ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewRegulators(type)}
                          title="View regulators"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(type)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(type)}
                          title={type.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {type.is_active ? (
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
      ))}

      {types.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No institution types found. Create one to get started.
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Institution Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={editForm.category}
                onValueChange={(val) => setEditForm({ ...editForm, category: val as InstitutionCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Scan Keywords (comma-separated)</Label>
              <Input
                value={editForm.keywords}
                onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
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

      {/* Regulator Detail Dialog */}
      <Dialog open={regulatorDetailOpen} onOpenChange={setRegulatorDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regulators for {selectedTypeName}</DialogTitle>
            <DialogDescription>
              Regulatory bodies mapped to this institution type.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedTypeRegulators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No regulators mapped to this institution type.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedTypeRegulators.map((mapping: any) => (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {mapping.regulators?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {mapping.regulators?.code} - {mapping.regulators?.country || 'Nigeria'}
                      </div>
                    </div>
                    {mapping.is_primary && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        Primary
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
