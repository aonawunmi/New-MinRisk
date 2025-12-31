import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getRssSources,
  createRssSource,
  updateRssSource,
  deleteRssSource,
  toggleRssSourceStatus,
  type RssSource,
  type CreateRssSourceInput,
} from '@/lib/riskIntelligence';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Rss,
  AlertCircle,
  Power,
  PowerOff,
  Download,
} from 'lucide-react';
import { isUserAdmin } from '@/lib/profiles';
import { getCategories } from '@/lib/taxonomy';
import { RECOMMENDED_SOURCES, type RecommendedSource } from '@/lib/recommendedSources';

// Categories are now loaded dynamically from taxonomy
const DEFAULT_CATEGORY = 'cybersecurity';

export default function RssSourceManagement() {
  const [sources, setSources] = useState<RssSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<{ value: string; label: string }[]>([]);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSource, setSelectedSource] = useState<RssSource | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateRssSourceInput>({
    name: '',
    url: '',
    description: '',
    category: [], // Array of selected categories
  });

  useEffect(() => {
    checkAdminStatus();
    loadData();
  }, []);

  async function checkAdminStatus() {
    const adminStatus = await isUserAdmin();
    setIsAdmin(adminStatus);
  }

  async function loadData() {
    setLoading(true);

    // Load taxonomy categories
    try {
      const { data: taxCategories } = await getCategories();
      if (taxCategories) {
        const formatted = taxCategories.map(c => ({
          value: c.name.toLowerCase(),
          label: c.name
        }));
        setAvailableCategories(formatted);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }

    // Load sources
    const { data, error } = await getRssSources();
    if (error) {
      alert('Error: Failed to load RSS sources');
    } else if (data) {
      setSources(data);
    }
    setLoading(false);
  }

  function resetForm() {
    setFormData({
      name: '',
      url: '',
      description: '',
      category: [],
    });
  }

  function openAddDialog() {
    resetForm();
    setShowAddDialog(true);
  }

  function openEditDialog(source: RssSource) {
    setSelectedSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      description: source.description || '',
      category: source.category,
    });
    setShowEditDialog(true);
  }

  function openDeleteDialog(source: RssSource) {
    setSelectedSource(source);
    setShowDeleteDialog(true);
  }

  function toggleCategory(categoryValue: string) {
    setFormData((prev) => {
      const categories = prev.category || [];
      if (categories.includes(categoryValue)) {
        // Remove category
        return { ...prev, category: categories.filter((c) => c !== categoryValue) };
      } else {
        // Add category
        return { ...prev, category: [...categories, categoryValue] };
      }
    });
  }

  async function handleCreate() {
    if (!formData.name || !formData.url || formData.category.length === 0) {
      alert('Validation Error: Name, URL, and at least one category are required');
      return;
    }

    // Validate URL format
    try {
      new URL(formData.url);
    } catch {
      alert('Validation Error: Please enter a valid URL');
      return;
    }

    setSubmitting(true);
    const { data, error } = await createRssSource(formData);
    setSubmitting(false);

    if (error) {
      alert(`Error: ${error.message}`);
    } else if (data) {
      alert('Success: RSS source created successfully');
      setShowAddDialog(false);
      resetForm();
      alert('Success: RSS source created successfully');
      setShowAddDialog(false);
      resetForm();
      loadData();
    }
  }

  async function handleUpdate() {
    if (!selectedSource) return;

    if (!formData.name || !formData.url || !formData.category) {
      alert('Validation Error: Name, URL, and category are required');
      return;
    }

    // Validate URL format
    try {
      new URL(formData.url);
    } catch {
      alert('Validation Error: Please enter a valid URL');
      return;
    }

    setSubmitting(true);
    const { data, error } = await updateRssSource(selectedSource.id, formData);
    setSubmitting(false);

    if (error) {
      alert(`Error: ${error.message}`);
    } else if (data) {
      alert('Success: RSS source updated successfully');
      setShowEditDialog(false);
      setSelectedSource(null);
      resetForm();
      setSelectedSource(null);
      resetForm();
      loadData();
    }
  }

  async function handleDelete() {
    if (!selectedSource) return;

    setSubmitting(true);
    const { success, error } = await deleteRssSource(selectedSource.id);
    setSubmitting(false);

    if (error) {
      alert(`Error: ${error.message}`);
    } else if (success) {
      alert('Success: RSS source deleted successfully');
      setShowDeleteDialog(false);
      setSelectedSource(null);
      alert('Success: RSS source deleted successfully');
      setShowDeleteDialog(false);
      setSelectedSource(null);
      loadData();
    }
  }

  async function handleToggleStatus(source: RssSource) {
    const newStatus = !source.is_active;
    const { success, error } = await toggleRssSourceStatus(source.id, newStatus);

    if (error) {
      alert(`Error: ${error.message}`);
    } else if (success) {
      alert(`Success: RSS source ${newStatus ? 'activated' : 'deactivated'}`);
      loadData();
    }
  }



  async function handleImport(source: RecommendedSource) {
    setSubmitting(true);
    const input: CreateRssSourceInput = {
      name: source.name,
      url: source.url,
      description: source.description,
      category: [source.category]
    };

    // Check if exists
    const exists = sources.some(s => s.url === source.url);
    if (exists) {
      alert('Source already exists');
      setSubmitting(false);
      return;
    }

    const { data, error } = await createRssSource(input);
    setSubmitting(false);

    if (error) {
      alert('Failed to import: ' + error.message);
    } else {
      alert('Imported ' + source.name);
      loadData();
    }
  }

  function getCategoryBadgeColor(category: string) {
    const colors: Record<string, string> = {
      cybersecurity: 'bg-red-100 text-red-800 border-red-200',
      regulatory: 'bg-blue-100 text-blue-800 border-blue-200',
      market: 'bg-green-100 text-green-800 border-green-200',
      operational: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      geopolitical: 'bg-purple-100 text-purple-800 border-purple-200',
      environmental: 'bg-teal-100 text-teal-800 border-teal-200',
      social: 'bg-pink-100 text-pink-800 border-pink-200',
      technology: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category] || colors.other;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rss className="h-5 w-5" />
                RSS Feed Sources
              </CardTitle>
              <CardDescription>
                Manage RSS feeds for automated external event monitoring
                {!isAdmin && ' (View only - Admin access required to manage)'}
              </CardDescription>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button onClick={() => { console.log('Import Recommended clicked, setting showImportDialog to true'); setShowImportDialog(true); }} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Import Recommended
                </Button>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add RSS Source
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Rss className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No RSS sources configured yet</p>
              {isAdmin && (
                <Button className="mt-4" onClick={openAddDialog} variant="outline">
                  Add your first RSS source
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Scan</TableHead>
                  <TableHead>Events</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{source.name}</p>
                        {source.description && (
                          <p className="text-sm text-gray-500 mt-1">{source.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {source.category.map((cat) => (
                          <Badge
                            key={cat}
                            variant="outline"
                            className={getCategoryBadgeColor(cat)}
                          >
                            {availableCategories.find((c) => c.value === cat)?.label || cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-blue-600">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {new URL(source.url).hostname}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          source.is_active
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }
                      >
                        {source.is_active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {source.last_scanned_at ? (
                        <div>
                          <p className="text-sm">
                            {new Date(source.last_scanned_at).toLocaleDateString()}
                          </p>
                          {source.last_scan_status && (
                            <Badge
                              variant="outline"
                              className={
                                source.last_scan_status === 'success'
                                  ? 'bg-green-50 text-green-700 border-green-200 text-xs'
                                  : 'bg-red-50 text-red-700 border-red-200 text-xs'
                              }
                            >
                              {source.last_scan_status}
                            </Badge>
                          )}
                          {source.last_scan_error && (
                            <p className="text-xs text-red-600 mt-1" title={source.last_scan_error}>
                              <AlertCircle className="h-3 w-3 inline mr-1" />
                              Error
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Never scanned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {source.events_count}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(source)}
                            title={source.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {source.is_active ? (
                              <PowerOff className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Power className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(source)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(source)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add RSS Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add RSS Source</DialogTitle>
            <DialogDescription>
              Add a new RSS feed to monitor for external events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Source Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Krebs on Security"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="url">RSS Feed URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/feed"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
            <div>
              <Label>Categories * (select at least one)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2 p-3 border rounded-md bg-gray-50">
                {availableCategories.map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${cat.value}`}
                      checked={formData.category.includes(cat.value)}
                      onCheckedChange={() => toggleCategory(cat.value)}
                    />
                    <label
                      htmlFor={`cat-${cat.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {cat.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this RSS source..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Source'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Recommended Sources Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Import Recommended Sources
            </DialogTitle>
            <DialogDescription>
              Add curated RSS feeds from trusted security and risk news sources. Click "Import" to add a source to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.entries(
              RECOMMENDED_SOURCES.reduce((acc, source) => {
                const cat = source.category;
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(source);
                return acc;
              }, {} as Record<string, RecommendedSource[]>)
            ).map(([category, categorySources]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-semibold capitalize flex items-center gap-2">
                  <Badge className={getCategoryBadgeColor(category)}>{category}</Badge>
                </h3>
                <div className="space-y-2">
                  {categorySources.map((source) => {
                    const alreadyExists = sources.some(s => s.url === source.url);
                    return (
                      <div
                        key={source.url}
                        className="flex items-center justify-between p-3 border rounded-md bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{source.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-md">{source.description}</p>
                        </div>
                        {alreadyExists ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Added
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleImport(source)}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Import
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit RSS Source Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit RSS Source</DialogTitle>
            <DialogDescription>Update RSS feed details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Source Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-url">RSS Feed URL *</Label>
              <Input
                id="edit-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
            <div>
              <Label>Categories * (select at least one)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2 p-3 border rounded-md bg-gray-50">
                {availableCategories.map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-cat-${cat.value}`}
                      checked={formData.category.includes(cat.value)}
                      onCheckedChange={() => toggleCategory(cat.value)}
                    />
                    <label
                      htmlFor={`edit-cat-${cat.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {cat.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Source'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete RSS Source?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">{selectedSource?.name}</strong>? This action cannot
              be undone. Historical events from this source will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Source'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

