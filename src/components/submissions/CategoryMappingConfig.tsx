/**
 * Category Mapping Configuration Component
 *
 * Allows CMO admins to map their internal risk categories to SEC's 5 standard
 * categories. This mapping is used when generating quarterly SEC submissions.
 *
 * Features:
 * - Shows all internal categories from the org's risk register
 * - Dropdown to assign each to one of 5 SEC categories
 * - Auto-suggests mappings based on keyword matching
 * - Saves all mappings at once
 * - Shows unmapped category warnings
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getSecStandardCategories,
  getOrgSecMappings,
  getDefaultSecMappings,
  getOrgRiskCategoryNames,
  saveSecMappings,
  suggestSecCategory,
  type SecStandardCategory,
  type SecCategoryMapping,
  type SecDefaultMapping,
  type MappingSaveItem,
} from '@/lib/sec-categories';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Wand2,
  Save,
  Loader2,
  ArrowRight,
} from 'lucide-react';

// SEC category display colors
const SEC_CATEGORY_COLORS: Record<string, string> = {
  STRATEGIC: 'bg-purple-100 text-purple-800',
  MARKET: 'bg-blue-100 text-blue-800',
  REGULATORY: 'bg-amber-100 text-amber-800',
  OPERATIONAL: 'bg-orange-100 text-orange-800',
  IT_CYBER: 'bg-red-100 text-red-800',
};

export default function CategoryMappingConfig() {
  const { profile } = useAuth();

  // Data state
  const [secCategories, setSecCategories] = useState<SecStandardCategory[]>([]);
  const [orgCategories, setOrgCategories] = useState<string[]>([]);
  const [existingMappings, setExistingMappings] = useState<SecCategoryMapping[]>([]);
  const [defaults, setDefaults] = useState<SecDefaultMapping[]>([]);

  // Working state (user's current selections, not yet saved)
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const organizationId = profile?.organization_id;

  // Load all data on mount
  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId]);

  const loadData = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const [secResult, orgResult, mapResult, defaultResult] = await Promise.all([
        getSecStandardCategories(),
        getOrgRiskCategoryNames(organizationId),
        getOrgSecMappings(organizationId),
        getDefaultSecMappings(),
      ]);

      if (secResult.error) throw secResult.error;
      if (orgResult.error) throw orgResult.error;
      if (mapResult.error) throw mapResult.error;
      if (defaultResult.error) throw defaultResult.error;

      const secCats = secResult.data || [];
      const orgCats = orgResult.data || [];
      const existingMaps = mapResult.data || [];
      const defaultMaps = defaultResult.data || [];

      setSecCategories(secCats);
      setOrgCategories(orgCats);
      setExistingMappings(existingMaps);
      setDefaults(defaultMaps);

      // Build initial mapping state from existing mappings
      const initialMappings: Record<string, string> = {};
      existingMaps.forEach(m => {
        initialMappings[m.internal_category_name] = m.sec_category_id;
      });

      setMappings(initialMappings);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mapping data');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Handle mapping change
  function handleMappingChange(categoryName: string, secCategoryId: string) {
    setMappings(prev => ({
      ...prev,
      [categoryName]: secCategoryId,
    }));
    setHasChanges(true);
    setSuccess(null);
  }

  // Auto-suggest all unmapped categories
  function handleAutoSuggest() {
    const newMappings = { ...mappings };
    let suggestionsApplied = 0;

    for (const category of orgCategories) {
      if (!newMappings[category]) {
        const suggestedId = suggestSecCategory(category, defaults);
        if (suggestedId) {
          newMappings[category] = suggestedId;
          suggestionsApplied++;
        }
      }
    }

    if (suggestionsApplied > 0) {
      setMappings(newMappings);
      setHasChanges(true);
      setSuccess(`Auto-suggested ${suggestionsApplied} mapping${suggestionsApplied > 1 ? 's' : ''}`);
    }
  }

  // Save all mappings
  async function handleSave() {
    if (!organizationId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const mappingItems: MappingSaveItem[] = Object.entries(mappings)
        .filter(([, secId]) => secId)
        .map(([name, secId]) => ({
          internal_category_name: name,
          sec_category_id: secId,
        }));

      const { error: saveError } = await saveSecMappings(organizationId, mappingItems);
      if (saveError) throw saveError;

      setSuccess('Category mappings saved successfully!');
      setHasChanges(false);

      // Reload to confirm
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mappings');
    } finally {
      setSaving(false);
    }
  }

  // Get SEC category name from ID
  function getSecCategoryName(secCategoryId: string): string {
    const cat = secCategories.find(c => c.id === secCategoryId);
    return cat?.name || 'Unknown';
  }

  function getSecCategoryCode(secCategoryId: string): string {
    const cat = secCategories.find(c => c.id === secCategoryId);
    return cat?.code || '';
  }

  // Calculate stats
  const totalCategories = orgCategories.length;
  const mappedCategories = orgCategories.filter(c => mappings[c]).length;
  const unmappedCategories = orgCategories.filter(c => !mappings[c]);
  const isComplete = unmappedCategories.length === 0 && totalCategories > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading category mappings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">SEC Risk Category Mapping</CardTitle>
              <CardDescription className="mt-1">
                Map your internal risk categories to the SEC's 5 standard categories.
                This mapping is used when generating your quarterly Risk Profile Report.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isComplete ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {unmappedCategories.length} unmapped
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{mappedCategories} of {totalCategories} categories mapped</span>
              <span>{totalCategories > 0 ? Math.round((mappedCategories / totalCategories) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${totalCategories > 0 ? (mappedCategories / totalCategories) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* SEC Category Legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {secCategories.map(sc => (
              <Badge key={sc.id} className={SEC_CATEGORY_COLORS[sc.code] || 'bg-gray-100'}>
                {sc.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
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

      {/* No categories warning */}
      {totalCategories === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No risk categories found in your risk register. Add risks with categories first,
            then come back to configure the SEC mapping.
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Table */}
      {totalCategories > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Category Mappings</CardTitle>
              <div className="flex items-center gap-2">
                {unmappedCategories.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoSuggest}
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    Auto-Suggest
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save Mappings
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Internal Category</TableHead>
                  <TableHead className="w-[10%] text-center" />
                  <TableHead className="w-[40%]">SEC Category</TableHead>
                  <TableHead className="w-[10%] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgCategories.map(categoryName => {
                  const selectedSecId = mappings[categoryName] || '';
                  const selectedCode = selectedSecId ? getSecCategoryCode(selectedSecId) : '';
                  const isMapped = !!selectedSecId;

                  return (
                    <TableRow key={categoryName}>
                      <TableCell className="font-medium">{categoryName}</TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        <ArrowRight className="h-4 w-4 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedSecId}
                          onValueChange={(val) => handleMappingChange(categoryName, val)}
                        >
                          <SelectTrigger className={`w-full ${!isMapped ? 'border-amber-300' : ''}`}>
                            <SelectValue placeholder="Select SEC category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {secCategories.map(sc => (
                              <SelectItem key={sc.id} value={sc.id}>
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs ${SEC_CATEGORY_COLORS[sc.code] || ''}`}>
                                    {sc.code.replace('_', '/')}
                                  </Badge>
                                  {sc.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        {isMapped ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Unmapped warning */}
            {unmappedCategories.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {unmappedCategories.length} category{unmappedCategories.length > 1 ? 'ies are' : ' is'} unmapped
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Unmapped categories will default to "Operational Risk" in SEC submissions.
                      Use the Auto-Suggest button to automatically map based on category names.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEC Category Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">SEC Standard Categories Reference</CardTitle>
          <CardDescription>
            These are the 5 standard risk categories defined by the SEC Nigeria for quarterly reporting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {secCategories.map(sc => (
              <div
                key={sc.id}
                className="p-3 border rounded-lg"
              >
                <Badge className={`mb-2 ${SEC_CATEGORY_COLORS[sc.code] || 'bg-gray-100'}`}>
                  {sc.name}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {sc.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {orgCategories.filter(c => mappings[c] === sc.id).length} categories mapped
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
