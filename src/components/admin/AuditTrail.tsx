/**
 * Audit Trail Component
 *
 * Comprehensive audit logging view for admin users.
 * Shows all system actions with filtering, searching, and export capabilities.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ScrollText, RefreshCw, Download, Eye, Search } from 'lucide-react';
import {
  loadAuditTrail,
  downloadAuditTrailCSV,
  formatChangeDetails,
  type AuditTrailEntry,
  type AuditFilters,
} from '@/lib/audit';

export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filter state
  // NOTE: Excluding 'user' entity type by default since user management
  // has its own dedicated audit trail in User Management > Audit Trail
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    riskCode: '',
    userEmail: '',
    actionType: '',
    entityType: '',
    excludeEntityTypes: ['user'], // Exclude user management events
    startDate: '',
    endDate: '',
    limit: 100,
  });

  // Load audit trail
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await loadAuditTrail(filters);
      setEntries(data);
    } catch (error) {
      console.error('Error loading audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Apply filters
  const handleApplyFilters = () => {
    loadData();
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      riskCode: '',
      userEmail: '',
      actionType: '',
      entityType: '',
      excludeEntityTypes: ['user'], // Keep excluding user events after reset
      startDate: '',
      endDate: '',
      limit: 100,
    });
  };

  // View details
  const handleViewDetails = (entry: AuditTrailEntry) => {
    setSelectedEntry(entry);
    setShowDetailsDialog(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    downloadAuditTrailCSV(entries);
  };

  // Action type color coding
  const getActionColor = (actionType: string): string => {
    switch (actionType.toLowerCase()) {
      case 'create':
        return 'text-green-600 bg-green-50';
      case 'update':
        return 'text-blue-600 bg-blue-50';
      case 'delete':
        return 'text-red-600 bg-red-50';
      case 'archive':
        return 'text-orange-600 bg-orange-50';
      case 'restore':
        return 'text-purple-600 bg-purple-50';
      case 'approve':
        return 'text-emerald-600 bg-emerald-50';
      case 'reject':
        return 'text-rose-600 bg-rose-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

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
                <ScrollText className="h-5 w-5" />
                System Audit Trail
              </CardTitle>
              <CardDescription>
                System operations and configuration changes (User management audit trail is in User Management tab)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search user, code, action..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Risk Code */}
            <div>
              <Label>Risk Code</Label>
              <Input
                placeholder="e.g., RISK-001"
                value={filters.riskCode || ''}
                onChange={(e) => setFilters({ ...filters, riskCode: e.target.value })}
              />
            </div>

            {/* User Email */}
            <div>
              <Label>User</Label>
              <Input
                placeholder="User name..."
                value={filters.userEmail || ''}
                onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
              />
            </div>

            {/* Action Type */}
            <div>
              <Label>Action Type</Label>
              <Select
                value={filters.actionType || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, actionType: value === 'all' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="restore">Restore</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type */}
            <div>
              <Label>Entity Type</Label>
              <Select
                value={filters.entityType || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, entityType: value === 'all' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="kri">KRI</SelectItem>
                  <SelectItem value="config">Configuration</SelectItem>
                  {/* User entity type removed - use User Management > Audit Trail instead */}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            {/* End Date */}
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            {/* Load Limit */}
            <div>
              <Label>Load Limit</Label>
              <Select
                value={String(filters.limit || 100)}
                onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 entries</SelectItem>
                  <SelectItem value="100">100 entries</SelectItem>
                  <SelectItem value="200">200 entries</SelectItem>
                  <SelectItem value="500">500 entries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
            <Button variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Audit Log ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Timestamp</th>
                  <th className="text-left p-2 font-medium">Action</th>
                  <th className="text-left p-2 font-medium">Entity</th>
                  <th className="text-left p-2 font-medium">Code</th>
                  <th className="text-left p-2 font-medium">User</th>
                  <th className="text-center p-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-xs text-gray-600">
                      {new Date(entry.performed_at).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${getActionColor(
                          entry.action_type
                        )}`}
                      >
                        {entry.action_type}
                      </span>
                    </td>
                    <td className="p-2 text-gray-600">{entry.entity_type}</td>
                    <td className="p-2 font-mono text-xs">{entry.entity_code || '-'}</td>
                    <td className="p-2 text-gray-600 text-xs">{entry.user_email}</td>
                    <td className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(entry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {entries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No audit trail entries found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Trail Entry Details</DialogTitle>
            <DialogDescription>
              {selectedEntry?.action_type} - {selectedEntry?.entity_type}
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Timestamp</Label>
                  <p className="text-sm font-medium">
                    {new Date(selectedEntry.performed_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">User</Label>
                  <p className="text-sm font-medium">{selectedEntry.user_email}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Action</Label>
                  <p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getActionColor(
                        selectedEntry.action_type
                      )}`}
                    >
                      {selectedEntry.action_type}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Entity Type</Label>
                  <p className="text-sm">{selectedEntry.entity_type}</p>
                </div>
                {selectedEntry.entity_code && (
                  <div>
                    <Label className="text-xs text-gray-500">Entity Code</Label>
                    <p className="text-sm font-mono">{selectedEntry.entity_code}</p>
                  </div>
                )}
              </div>

              {/* Change Details */}
              {(() => {
                const { before, after, hasChanges } = formatChangeDetails(selectedEntry);

                if (!hasChanges) {
                  return (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No detailed change information available
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {selectedEntry.action_type === 'create' && (
                      <div>
                        <Label className="font-semibold">Created Values</Label>
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(after, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {selectedEntry.action_type === 'delete' && (
                      <div>
                        <Label className="font-semibold">Deleted Values</Label>
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(before, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {selectedEntry.action_type === 'update' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-semibold">Before</Label>
                          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded">
                            <pre className="text-xs whitespace-pre-wrap">
                              {JSON.stringify(before, null, 2)}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <Label className="font-semibold">After</Label>
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                            <pre className="text-xs whitespace-pre-wrap">
                              {JSON.stringify(after, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Metadata */}
              {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                <div>
                  <Label className="font-semibold">Additional Context</Label>
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
