/**
 * Library Generator Component
 *
 * Allows admins to seed global libraries based on:
 * 1. Organization's industry type
 * 2. Organization's risk taxonomy categories
 *
 * Uses the seed_master_library table as source data.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Library,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Building2,
} from 'lucide-react';

// Industry options
const INDUSTRY_OPTIONS = [
    { value: 'financial_services', label: 'Financial Services' },
    { value: 'banking', label: 'Banking' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'asset_management', label: 'Asset Management' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'pharmaceuticals', label: 'Pharmaceuticals' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'technology', label: 'Technology' },
    { value: 'telecommunications', label: 'Telecommunications' },
    { value: 'energy_utilities', label: 'Energy & Utilities' },
    { value: 'oil_gas', label: 'Oil & Gas' },
    { value: 'mining', label: 'Mining' },
    { value: 'retail', label: 'Retail' },
    { value: 'consumer_goods', label: 'Consumer Goods' },
    { value: 'transportation_logistics', label: 'Transportation & Logistics' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'construction', label: 'Construction' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'hospitality_tourism', label: 'Hospitality & Tourism' },
    { value: 'media_entertainment', label: 'Media & Entertainment' },
    { value: 'education', label: 'Education' },
    { value: 'professional_services', label: 'Professional Services' },
    { value: 'government_public_sector', label: 'Government / Public Sector' },
    { value: 'non_profit', label: 'Non-Profit' },
    { value: 'defense_aerospace', label: 'Defense & Aerospace' },
    { value: 'other', label: 'Other' },
];

interface LibraryCounts {
    root_cause: number;
    impact: number;
    control: number;
    kri: number;
    kci: number;
}

interface CategoryMatch {
    categoryName: string;
    matchCount: number;
    selected: boolean;
}

interface GenerationResult {
    success: boolean;
    rootCausesAdded: number;
    impactsAdded: number;
    controlsAdded: number;
    krisAdded: number;
    kcisAdded: number;
    errors: string[];
}

export default function LibraryGenerator() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<GenerationResult | null>(null);

    // Organization data
    const [industryType, setIndustryType] = useState<string | null>(null);
    const [savingIndustry, setSavingIndustry] = useState(false);

    // Taxonomy categories
    const [categories, setCategories] = useState<CategoryMatch[]>([]);

    // Master library counts
    const [masterCounts, setMasterCounts] = useState<LibraryCounts | null>(null);

    // Current library counts
    const [currentCounts, setCurrentCounts] = useState<LibraryCounts | null>(null);

    useEffect(() => {
        if (profile?.organization_id) {
            loadData();
        }
    }, [profile?.organization_id]);

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            // Load organization industry type
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('industry_type')
                .eq('id', profile!.organization_id)
                .single();

            if (orgError) throw orgError;
            setIndustryType(org?.industry_type || null);

            // Load taxonomy categories
            const { data: cats, error: catsError } = await supabase
                .from('risk_categories')
                .select('name')
                .eq('organization_id', profile!.organization_id)
                .order('name');

            if (catsError) throw catsError;

            // For each category, count matching seed data
            const categoryMatches: CategoryMatch[] = [];
            for (const cat of (cats || [])) {
                const { count } = await supabase
                    .from('seed_master_library')
                    .select('*', { count: 'exact', head: true })
                    .contains('category_hints', [cat.name]);

                categoryMatches.push({
                    categoryName: cat.name,
                    matchCount: count || 0,
                    selected: true,
                });
            }
            setCategories(categoryMatches);

            // Load master library counts
            const { data: masterData } = await supabase
                .from('seed_master_library')
                .select('library_type');

            if (masterData) {
                const counts: LibraryCounts = {
                    root_cause: masterData.filter(r => r.library_type === 'root_cause').length,
                    impact: masterData.filter(r => r.library_type === 'impact').length,
                    control: masterData.filter(r => r.library_type === 'control').length,
                    kri: masterData.filter(r => r.library_type === 'kri').length,
                    kci: masterData.filter(r => r.library_type === 'kci').length,
                };
                setMasterCounts(counts);
            }

            // Load current library counts
            await loadCurrentCounts();

        } catch (err: any) {
            console.error('Error loading data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadCurrentCounts() {
        try {
            const [rootCauses, impacts, controls, kris] = await Promise.all([
                supabase.from('global_root_cause_library').select('*', { count: 'exact', head: true }),
                supabase.from('global_impact_library').select('*', { count: 'exact', head: true }),
                supabase.from('global_control_library').select('*', { count: 'exact', head: true }),
                supabase.from('global_kri_kci_library').select('*', { count: 'exact', head: true }),
            ]);

            setCurrentCounts({
                root_cause: rootCauses.count || 0,
                impact: impacts.count || 0,
                control: controls.count || 0,
                kri: kris.count || 0,
                kci: 0, // KCIs are in same table
            });
        } catch (err) {
            console.error('Error loading current counts:', err);
        }
    }

    async function saveIndustryType(value: string) {
        setSavingIndustry(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ industry_type: value })
                .eq('id', profile!.organization_id);

            if (error) throw error;
            setIndustryType(value);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingIndustry(false);
        }
    }

    async function generateLibraries() {
        setGenerating(true);
        setError(null);
        setSuccess(null);

        const result: GenerationResult = {
            success: true,
            rootCausesAdded: 0,
            impactsAdded: 0,
            controlsAdded: 0,
            krisAdded: 0,
            kcisAdded: 0,
            errors: [],
        };

        try {
            const selectedCategories = categories
                .filter(c => c.selected)
                .map(c => c.categoryName);

            if (selectedCategories.length === 0) {
                throw new Error('Please select at least one category');
            }

            // Build query for master library
            // Get all universal items + items matching selected categories + items matching industry
            let query = supabase
                .from('seed_master_library')
                .select('*')
                .eq('is_active', true);

            const { data: seedData, error: seedError } = await query;
            if (seedError) throw seedError;

            // Filter seed data by category matches and industry
            const relevantSeeds = (seedData || []).filter(seed => {
                // Check if any category hint matches selected categories
                const categoryMatch = seed.category_hints?.some((hint: string) =>
                    selectedCategories.some(cat =>
                        cat.toLowerCase().includes(hint.toLowerCase()) ||
                        hint.toLowerCase().includes(cat.toLowerCase())
                    )
                );

                // Check industry match
                const industryMatch = seed.industry_tags?.includes('universal') ||
                    seed.industry_tags?.includes(industryType);

                return categoryMatch || (seed.industry_tags?.includes('universal') && !seed.category_hints?.length);
            });

            // Group by type
            const rootCauses = relevantSeeds.filter(s => s.library_type === 'root_cause');
            const impacts = relevantSeeds.filter(s => s.library_type === 'impact');
            const controls = relevantSeeds.filter(s => s.library_type === 'control');
            const kris = relevantSeeds.filter(s => s.library_type === 'kri');
            const kcis = relevantSeeds.filter(s => s.library_type === 'kci');

            // Insert root causes
            for (const seed of rootCauses) {
                try {
                    const { error } = await supabase
                        .from('global_root_cause_library')
                        .upsert({
                            cause_code: seed.code,
                            cause_name: seed.name,
                            cause_description: seed.description,
                            category: seed.category_hints?.[0] || 'General',
                            subcategory: seed.category_hints?.[1] || null,
                            severity_indicator: seed.metadata?.severity_indicator || 'Medium',
                            is_active: true,
                        }, { onConflict: 'cause_code' });

                    if (!error) result.rootCausesAdded++;
                } catch (e: any) {
                    result.errors.push(`Root cause ${seed.code}: ${e.message}`);
                }
            }

            // Insert impacts
            for (const seed of impacts) {
                try {
                    const { error } = await supabase
                        .from('global_impact_library')
                        .upsert({
                            impact_code: seed.code,
                            impact_name: seed.name,
                            impact_description: seed.description,
                            impact_type: seed.metadata?.impact_type || 'operational',
                            category: seed.category_hints?.[0] || 'General',
                            severity_level: seed.metadata?.severity_level || 'Moderate',
                            is_active: true,
                        }, { onConflict: 'impact_code' });

                    if (!error) result.impactsAdded++;
                } catch (e: any) {
                    result.errors.push(`Impact ${seed.code}: ${e.message}`);
                }
            }

            // Insert controls
            for (const seed of controls) {
                try {
                    const { error } = await supabase
                        .from('global_control_library')
                        .upsert({
                            control_code: seed.code,
                            control_name: seed.name,
                            control_description: seed.description,
                            control_type: seed.metadata?.control_type || 'preventive',
                            control_category: seed.category_hints?.[0] || 'General',
                            automation_level: seed.metadata?.automation_level || 'Manual',
                            is_active: true,
                        }, { onConflict: 'control_code' });

                    if (!error) result.controlsAdded++;
                } catch (e: any) {
                    result.errors.push(`Control ${seed.code}: ${e.message}`);
                }
            }

            // Insert KRIs and KCIs
            for (const seed of [...kris, ...kcis]) {
                try {
                    const { error } = await supabase
                        .from('global_kri_kci_library')
                        .upsert({
                            indicator_code: seed.code,
                            indicator_name: seed.name,
                            indicator_description: seed.description,
                            indicator_type: seed.library_type === 'kri' ? 'KRI' : 'KCI',
                            category: seed.category_hints?.[0] || 'General',
                            measurement_unit: seed.metadata?.measurement_unit || '%',
                            measurement_frequency: seed.metadata?.frequency || 'Monthly',
                            warning_threshold: seed.metadata?.warning_threshold,
                            critical_threshold: seed.metadata?.critical_threshold,
                            threshold_direction: seed.metadata?.threshold_direction || 'above',
                            is_active: true,
                        }, { onConflict: 'indicator_code' });

                    if (!error) {
                        if (seed.library_type === 'kri') result.krisAdded++;
                        else result.kcisAdded++;
                    }
                } catch (e: any) {
                    result.errors.push(`KRI/KCI ${seed.code}: ${e.message}`);
                }
            }

            // Log generation
            await supabase.from('library_generation_log').insert({
                organization_id: profile!.organization_id,
                generated_by: profile!.id,
                industry_type: industryType,
                categories_used: selectedCategories,
                root_causes_generated: result.rootCausesAdded,
                impacts_generated: result.impactsAdded,
                controls_generated: result.controlsAdded,
                kris_generated: result.krisAdded,
                kcis_generated: result.kcisAdded,
                generation_mode: 'initial',
                status: 'completed',
            });

            setSuccess(result);
            await loadCurrentCounts();

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message);
            result.success = false;
        } finally {
            setGenerating(false);
        }
    }

    function toggleCategory(categoryName: string) {
        setCategories(prev => prev.map(c =>
            c.categoryName === categoryName ? { ...c, selected: !c.selected } : c
        ));
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Loading library data...</p>
                </CardContent>
            </Card>
        );
    }

    const totalSelected = categories.filter(c => c.selected).reduce((sum, c) => sum + c.matchCount, 0);

    return (
        <div className="space-y-4">
            {/* Industry Selection */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 rounded-lg">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Industry Type</CardTitle>
                            <CardDescription>Select your organization's industry for tailored risk data</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Select
                            value={industryType || ''}
                            onValueChange={saveIndustryType}
                            disabled={savingIndustry}
                        >
                            <SelectTrigger className="w-[300px]">
                                <SelectValue placeholder="Select industry..." />
                            </SelectTrigger>
                            <SelectContent>
                                {INDUSTRY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {savingIndustry && <Loader2 className="h-4 w-4 animate-spin" />}
                        {industryType && !savingIndustry && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Library Generator */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Library Generator</CardTitle>
                            <CardDescription>
                                Generate root causes, impacts, controls, and KRIs/KCIs based on your taxonomy
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="border-green-200 bg-green-50">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                <strong>Library generated successfully!</strong>
                                <div className="mt-2 grid grid-cols-5 gap-2 text-sm">
                                    <div>Root Causes: <strong>{success.rootCausesAdded}</strong></div>
                                    <div>Impacts: <strong>{success.impactsAdded}</strong></div>
                                    <div>Controls: <strong>{success.controlsAdded}</strong></div>
                                    <div>KRIs: <strong>{success.krisAdded}</strong></div>
                                    <div>KCIs: <strong>{success.kcisAdded}</strong></div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Master Library Stats */}
                    {masterCounts && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Library className="h-4 w-4" />
                                Master Library Available
                            </h4>
                            <div className="grid grid-cols-5 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Root Causes:</span>
                                    <span className="font-semibold ml-1">{masterCounts.root_cause}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Impacts:</span>
                                    <span className="font-semibold ml-1">{masterCounts.impact}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Controls:</span>
                                    <span className="font-semibold ml-1">{masterCounts.control}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">KRIs:</span>
                                    <span className="font-semibold ml-1">{masterCounts.kri}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">KCIs:</span>
                                    <span className="font-semibold ml-1">{masterCounts.kci}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Library Stats */}
                    {currentCounts && (
                        <div className="p-4 bg-purple-50 rounded-lg">
                            <h4 className="font-medium mb-2">Your Current Library</h4>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Root Causes:</span>
                                    <span className="font-semibold ml-1">{currentCounts.root_cause}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Impacts:</span>
                                    <span className="font-semibold ml-1">{currentCounts.impact}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Controls:</span>
                                    <span className="font-semibold ml-1">{currentCounts.control}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">KRIs/KCIs:</span>
                                    <span className="font-semibold ml-1">{currentCounts.kri}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Category Selection */}
                    <div>
                        <h4 className="font-medium mb-3">Select Categories to Generate</h4>
                        {categories.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                No taxonomy categories found. Please configure your taxonomy first.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {categories.map(cat => (
                                    <label
                                        key={cat.categoryName}
                                        className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50"
                                    >
                                        <Checkbox
                                            checked={cat.selected}
                                            onCheckedChange={() => toggleCategory(cat.categoryName)}
                                        />
                                        <span className="flex-1">{cat.categoryName}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            ~{cat.matchCount} items
                                        </Badge>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-sm text-gray-500">
                            Estimated items: <strong>{totalSelected}</strong> based on selected categories
                        </p>
                        <Button
                            onClick={generateLibraries}
                            disabled={generating || categories.length === 0 || !industryType}
                            className="gap-2"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Generate Libraries
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
