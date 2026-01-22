/**
 * Coverage Builder Modal
 * 
 * Allows users to link existing KRIs to a tolerance or create new ones.
 * Replaces the old "Generate KRI" 1-to-1 auto-generation approach.
 * Implements many-to-many relationship between KRIs and Tolerances.
 */

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertTriangle,
    CheckCircle,
    Link2,
    Loader2,
    Plus,
    Search,
    Unlink,
    Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

interface ToleranceLimit {
    id: string;
    metric_name: string;
    metric_type: string;
    unit: string;
    green_max: number | null;
    amber_max: number | null;
    red_min: number | null;
    status?: string;
}

interface KRIDefinition {
    id: string;
    kri_code: string;
    kri_name: string;
    category: string | null;
    indicator_type: string | null;
    measurement_unit: string | null;
}

interface Coverage {
    id: string;
    kri_id: string;
    coverage_strength: 'primary' | 'secondary' | 'supplementary';
    signal_type: 'leading' | 'concurrent' | 'lagging';
    coverage_rationale: string | null;
    kri?: KRIDefinition;
}

interface CoverageBuilderProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tolerance: ToleranceLimit | null;
    organizationId: string;
    onCoverageUpdated: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getCoverageCompleteness(coverages: Coverage[]): {
    level: 'gap' | 'fragile' | 'good';
    label: string;
    color: string;
} {
    const hasPrimary = coverages.some(c => c.coverage_strength === 'primary');

    if (coverages.length === 0) {
        return { level: 'gap', label: 'Monitoring Gap', color: 'bg-red-100 text-red-800' };
    }
    if (coverages.length === 1) {
        return { level: 'fragile', label: 'Fragile Coverage', color: 'bg-amber-100 text-amber-800' };
    }
    if (coverages.length >= 2 && hasPrimary) {
        return { level: 'good', label: 'Good Coverage', color: 'bg-green-100 text-green-800' };
    }
    return { level: 'fragile', label: 'No Primary Link', color: 'bg-amber-100 text-amber-800' };
}

// ============================================================================
// COMPONENT
// ============================================================================

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateAIKRISuggestionsForTolerance, createKRI, type AIKRISuggestion } from '@/lib/kri';

// ... (existing helper functions)

// ============================================================================
// COMPONENT
// ============================================================================

export default function CoverageBuilder({
    open,
    onOpenChange,
    tolerance,
    organizationId,
    onCoverageUpdated,
}: CoverageBuilderProps) {
    // State
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [availableKRIs, setAvailableKRIs] = useState<KRIDefinition[]>([]);
    const [linkedCoverages, setLinkedCoverages] = useState<Coverage[]>([]);

    // New link form state
    const [selectedKRIId, setSelectedKRIId] = useState<string>('');
    const [newCoverageStrength, setNewCoverageStrength] = useState<'primary' | 'secondary' | 'supplementary'>('secondary');
    const [newSignalType, setNewSignalType] = useState<'leading' | 'concurrent' | 'lagging'>('leading');
    const [newRationale, setNewRationale] = useState('');

    // AI Creation State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<AIKRISuggestion[]>([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);

    // Load data when modal opens
    useEffect(() => {
        if (open && tolerance) {
            loadData();
            // Reset AI state
            setAiSuggestions([]);
            setSelectedSuggestionIndex(null);
        }
    }, [open, tolerance]);

    const loadData = async () => {
        if (!tolerance) return;
        setLoading(true);

        try {
            // Load existing coverages for this tolerance
            const { data: coverages } = await supabase
                .from('tolerance_kri_coverage')
                .select(`
                    *,
                    kri:kri_definitions (
                        id,
                        kri_code,
                        kri_name,
                        category,
                        indicator_type,
                        measurement_unit
                    )
                `)
                .eq('tolerance_limit_id', tolerance.id);

            setLinkedCoverages(coverages || []);

            // Load all available KRIs not already linked
            const linkedKRIIds = (coverages || []).map(c => c.kri_id);

            let kriQuery = supabase
                .from('kri_definitions')
                .select('*')
                .eq('organization_id', organizationId);

            if (linkedKRIIds.length > 0) {
                kriQuery = kriQuery.not('id', 'in', `(${linkedKRIIds.join(',')})`);
            }

            const { data: kris } = await kriQuery;
            setAvailableKRIs(kris || []);

        } catch (err) {
            console.error('Error loading coverage data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter available KRIs by search
    const filteredKRIs = availableKRIs.filter(kri =>
        kri.kri_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kri.kri_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (kri.category?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Link a KRI to this tolerance
    const handleLinkKRI = async () => {
        if (!tolerance || !selectedKRIId) return;

        // Require rationale for primary links
        if (newCoverageStrength === 'primary' && !newRationale.trim()) {
            alert('Rationale is required for primary coverage links.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('tolerance_kri_coverage')
                .insert([{
                    organization_id: organizationId,
                    tolerance_limit_id: tolerance.id,
                    kri_id: selectedKRIId,
                    coverage_strength: newCoverageStrength,
                    signal_type: newSignalType,
                    coverage_rationale: newRationale || null,
                }]);

            if (error) throw error;

            // Reset form & reload
            setSelectedKRIId('');
            setNewCoverageStrength('secondary');
            setNewSignalType('leading');
            setNewRationale('');
            await loadData();
            onCoverageUpdated();

        } catch (err: any) {
            console.error('Error linking KRI:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Generate AI Suggestions
    const handleGenerateAI = async () => {
        if (!tolerance) return;
        setAiLoading(true);
        setAiSuggestions([]);
        try {
            const result = await generateAIKRISuggestionsForTolerance(tolerance);
            if (result.error) throw result.error;
            setAiSuggestions(result.data || []);
        } catch (err: any) {
            alert(`AI Generation Failed: ${err.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    // Create and Link from AI Suggestion
    const handleCreateAndLinkAI = async () => {
        if (selectedSuggestionIndex === null || !tolerance) return;
        const suggestion = aiSuggestions[selectedSuggestionIndex];

        setSaving(true);
        try {
            // 1. Create KRI
            const createResult = await createKRI({
                kri_name: suggestion.kri_name,
                description: suggestion.description,
                category: suggestion.category,
                indicator_type: suggestion.indicator_type,
                measurement_unit: suggestion.measurement_unit,
                data_source: suggestion.data_source,
                collection_frequency: suggestion.collection_frequency,
                target_value: suggestion.target_value,
                lower_threshold: suggestion.lower_threshold,
                upper_threshold: suggestion.upper_threshold,
                threshold_direction: suggestion.threshold_direction,
                responsible_user: suggestion.responsible_user,
            });

            if (createResult.error) throw createResult.error;
            const newKRI = createResult.data;

            // 2. Link to Tolerance
            const { error: linkError } = await supabase
                .from('tolerance_kri_coverage')
                .insert([{
                    organization_id: organizationId,
                    tolerance_limit_id: tolerance.id,
                    kri_id: newKRI.id,
                    // Use AI rationale if available, else generic
                    coverage_rationale: suggestion.reasoning || 'Created via AI Suggestion',
                    coverage_strength: 'primary', // Assume primary if created specifically for this
                    signal_type: suggestion.indicator_type || 'leading'
                }]);

            if (linkError) throw linkError;

            // Success
            alert(`Successfully created and linked "${newKRI.kri_name}"`);
            setAiSuggestions([]); // Clear suggestions
            setSelectedSuggestionIndex(null);
            await loadData(); // Reload list
            onCoverageUpdated();

        } catch (err: any) {
            console.error('Error creating AI KRI:', err);
            alert(`Failed: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Unlink a KRI from this tolerance
    const handleUnlinkKRI = async (coverageId: string) => {
        if (!confirm('Remove this KRI from coverage?')) return;

        try {
            await supabase
                .from('tolerance_kri_coverage')
                .delete()
                .eq('id', coverageId);

            await loadData();
            onCoverageUpdated();
        } catch (err) {
            console.error('Error unlinking KRI:', err);
        }
    };

    // Update coverage attributes
    const handleUpdateCoverage = async (
        coverageId: string,
        field: 'coverage_strength' | 'signal_type',
        value: string
    ) => {
        try {
            await supabase
                .from('tolerance_kri_coverage')
                .update({ [field]: value })
                .eq('id', coverageId);

            await loadData();
            onCoverageUpdated();
        } catch (err) {
            console.error('Error updating coverage:', err);
        }
    };

    const completeness = getCoverageCompleteness(linkedCoverages);

    if (!tolerance) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        Coverage Builder
                    </DialogTitle>
                    <DialogDescription>
                        Link KRIs to provide early warning for: <strong>{tolerance.metric_name}</strong>
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Coverage Completeness Indicator */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                            <div className="flex items-center gap-2">
                                {completeness.level === 'gap' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                                {completeness.level === 'fragile' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                {completeness.level === 'good' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                <span className="font-medium">Coverage Status:</span>
                                <Badge className={completeness.color}>{completeness.label}</Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {linkedCoverages.length} KRI(s) linked
                            </span>
                        </div>

                        {/* Current Linked KRIs */}
                        <div>
                            <h4 className="font-medium mb-3">Linked KRIs</h4>
                            {linkedCoverages.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground border rounded-lg border-dashed">
                                    <p>No KRIs linked yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {linkedCoverages.map((coverage) => (
                                        <div
                                            key={coverage.id}
                                            className="flex items-center justify-between p-3 border rounded-lg bg-white"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {coverage.kri?.kri_name || 'Unknown KRI'}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {coverage.kri?.kri_code}
                                                    </Badge>
                                                </div>
                                                {coverage.coverage_rationale && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {coverage.coverage_rationale}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={coverage.coverage_strength}
                                                    onValueChange={(v) => handleUpdateCoverage(coverage.id, 'coverage_strength', v)}
                                                >
                                                    <SelectTrigger className="w-28 h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="primary">Primary</SelectItem>
                                                        <SelectItem value="secondary">Secondary</SelectItem>
                                                        <SelectItem value="supplementary">Suppl.</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleUnlinkKRI(coverage.id)}
                                                >
                                                    <Unlink className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Coverage Tabs                    {/* Add Coverage Section */}
                        <div className="border-t pt-4">
                            <h4 className="text-sm font-semibold mb-3">Link Additional KRI (Manual)</h4>

                            {/* Search */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search KRI Library by name or code..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* KRI List */}
                            <div className="max-h-40 overflow-y-auto border rounded-lg mb-4">
                                {filteredKRIs.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">
                                        {availableKRIs.length === 0
                                            ? 'All available KRIs are already linked'
                                            : 'No KRIs match your search'}
                                    </div>
                                ) : (
                                    filteredKRIs.map((kri) => (
                                        <div
                                            key={kri.id}
                                            className={`flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${selectedKRIId === kri.id ? 'bg-blue-50 border-blue-200' : ''
                                                }`}
                                            onClick={() => setSelectedKRIId(kri.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedKRIId === kri.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                                    {selectedKRIId === kri.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-sm">{kri.kri_name}</span>
                                                    <Badge variant="outline" className="ml-2 text-[10px]">
                                                        {kri.kri_code}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Link Configuration Form */}
                            {selectedKRIId && (
                                <div className="space-y-4 pt-4 border-t bg-gray-50/50 p-4 rounded-lg">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Coverage Strength <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={newCoverageStrength}
                                                onValueChange={(v: any) => setNewCoverageStrength(v)}
                                            >
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="primary">Primary (Direct)</SelectItem>
                                                    <SelectItem value="secondary">Secondary (Proxy)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Signal Type <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={newSignalType}
                                                onValueChange={(v: any) => setNewSignalType(v)}
                                            >
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="leading">Leading (Predictive)</SelectItem>
                                                    <SelectItem value="lagging">Lagging (Reactive)</SelectItem>
                                                    <SelectItem value="concurrent">Concurrent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Rationale <span className="text-red-500">*</span></Label>
                                        <Textarea
                                            value={newRationale}
                                            onChange={e => setNewRationale(e.target.value)}
                                            placeholder="Validation Rule: Explain why this KRI provides coverage for this specific tolerance..."
                                            className="h-20 bg-white"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleLinkKRI}
                                        disabled={saving}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                                        {saving ? 'Linking...' : 'Link KRI to Tolerance'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
