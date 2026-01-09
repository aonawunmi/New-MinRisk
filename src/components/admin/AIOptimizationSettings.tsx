/**
 * AI Optimization Settings Component
 * 
 * Admin UI for configuring AI cost optimization features:
 * - Pre-filtering threshold
 * - Deduplication similarity
 * - Cache settings
 * - View cache statistics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Zap,
    Database,
    TrendingDown,
    RefreshCw,
    Trash2,
    Info,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCacheStats, clearCache } from '@/lib/aiCache';

interface AIOptimizationConfig {
    enable_prefilter: boolean;
    prefilter_threshold: number;
    enable_dedup: boolean;
    dedup_similarity: number;
    enable_batch: boolean;
    batch_size: number;
    enable_intel_cache: boolean;
    enable_library_cache: boolean;
    enable_control_cache: boolean;
    critical_keywords: string[];
}

const DEFAULT_CONFIG: AIOptimizationConfig = {
    enable_prefilter: true,
    prefilter_threshold: 30,
    enable_dedup: true,
    dedup_similarity: 0.7,
    enable_batch: true,
    batch_size: 5,
    enable_intel_cache: true,
    enable_library_cache: true,
    enable_control_cache: true,
    critical_keywords: [
        'cyberattack', 'ransomware', 'data breach', 'hacked',
        'bank failure', 'market crash', 'default', 'bankruptcy',
        'SEC action', 'CBN directive', 'regulatory fine', 'sanction',
        'system outage', 'major disruption', 'operational failure'
    ]
};

interface CacheStats {
    totalEntries: number;
    byFeature: Record<string, { count: number; totalHits: number }>;
    expiringWithin7Days: number;
}

export function AIOptimizationSettings() {
    const [config, setConfig] = useState<AIOptimizationConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        loadConfig();
        loadCacheStats();
    }, []);

    const loadConfig = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) return;

            const { data: org } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', profile.organization_id)
                .single();

            if (org?.settings?.ai_optimization) {
                setConfig({ ...DEFAULT_CONFIG, ...org.settings.ai_optimization });
            }
        } catch (err) {
            console.error('Error loading AI optimization config:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadCacheStats = async () => {
        setLoadingStats(true);
        try {
            const stats = await getCacheStats();
            setCacheStats(stats);
        } catch (err) {
            console.error('Error loading cache stats:', err);
        } finally {
            setLoadingStats(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) throw new Error('No organization found');

            // Get existing settings
            const { data: org } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', profile.organization_id)
                .single();

            // Merge with new AI optimization config
            const updatedSettings = {
                ...(org?.settings || {}),
                ai_optimization: config
            };

            await supabase
                .from('organizations')
                .update({ settings: updatedSettings })
                .eq('id', profile.organization_id);

            alert('AI optimization settings saved');
        } catch (err) {
            console.error('Error saving config:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleClearCache = async (feature?: string) => {
        try {
            const result = await clearCache(feature);
            alert(`Cleared ${result.deleted} cache entries`);
            loadCacheStats();
        } catch (err) {
            console.error('Error clearing cache:', err);
            alert('Failed to clear cache');
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">Loading settings...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Zap className="h-6 w-6 text-yellow-500" />
                        AI Cost Optimization
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Configure settings to reduce AI API costs while maintaining quality
                    </p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    ~95% Cost Reduction
                </Badge>
            </div>

            <Tabs defaultValue="intelligence" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="intelligence">Risk Intelligence</TabsTrigger>
                    <TabsTrigger value="caching">Caching</TabsTrigger>
                    <TabsTrigger value="stats">Cache Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="intelligence" className="space-y-4 mt-4">
                    {/* Pre-filtering */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Pre-Filtering</CardTitle>
                                <Switch
                                    checked={config.enable_prefilter}
                                    onCheckedChange={(checked) => setConfig({ ...config, enable_prefilter: checked })}
                                />
                            </div>
                            <CardDescription>
                                Score events before AI analysis. Low-relevance events are skipped.
                            </CardDescription>
                        </CardHeader>
                        {config.enable_prefilter && (
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Threshold Score</Label>
                                        <span className="text-sm text-muted-foreground">{config.prefilter_threshold}</span>
                                    </div>
                                    <Slider
                                        value={[config.prefilter_threshold]}
                                        onValueChange={([value]) => setConfig({ ...config, prefilter_threshold: value })}
                                        min={0}
                                        max={100}
                                        step={5}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Lower = more events pass (higher AI cost). Higher = stricter filtering.
                                    </p>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Deduplication */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Deduplication</CardTitle>
                                <Switch
                                    checked={config.enable_dedup}
                                    onCheckedChange={(checked) => setConfig({ ...config, enable_dedup: checked })}
                                />
                            </div>
                            <CardDescription>
                                Skip events that are similar to recently analyzed news.
                            </CardDescription>
                        </CardHeader>
                        {config.enable_dedup && (
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Similarity Threshold</Label>
                                        <span className="text-sm text-muted-foreground">{Math.round(config.dedup_similarity * 100)}%</span>
                                    </div>
                                    <Slider
                                        value={[config.dedup_similarity * 100]}
                                        onValueChange={([value]) => setConfig({ ...config, dedup_similarity: value / 100 })}
                                        min={50}
                                        max={95}
                                        step={5}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Events with ≥{Math.round(config.dedup_similarity * 100)}% similarity are considered duplicates.
                                    </p>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Batch Analysis */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Batch Analysis</CardTitle>
                                <Switch
                                    checked={config.enable_batch}
                                    onCheckedChange={(checked) => setConfig({ ...config, enable_batch: checked })}
                                />
                            </div>
                            <CardDescription>
                                Analyze multiple events in a single API call.
                            </CardDescription>
                        </CardHeader>
                        {config.enable_batch && (
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Batch Size</Label>
                                        <span className="text-sm text-muted-foreground">{config.batch_size} events</span>
                                    </div>
                                    <Slider
                                        value={[config.batch_size]}
                                        onValueChange={([value]) => setConfig({ ...config, batch_size: value })}
                                        min={2}
                                        max={10}
                                        step={1}
                                    />
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="caching" className="space-y-4 mt-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Caching Strategy</AlertTitle>
                        <AlertDescription>
                            Cached responses are reused for similar requests, significantly reducing API calls.
                        </AlertDescription>
                    </Alert>

                    {/* Intelligence Cache */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Intelligence Analysis Cache</CardTitle>
                                <Switch
                                    checked={config.enable_intel_cache}
                                    onCheckedChange={(checked) => setConfig({ ...config, enable_intel_cache: checked })}
                                />
                            </div>
                            <CardDescription>
                                Cache event analyses. Same news story = reuse existing analysis. (7-day TTL)
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Library Cache */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Library Generation Cache</CardTitle>
                                <Switch
                                    checked={config.enable_library_cache}
                                    onCheckedChange={(checked) => setConfig({ ...config, enable_library_cache: checked })}
                                />
                            </div>
                            <CardDescription>
                                Cache library generation results by industry + categories. (30-day TTL)
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Control Cache */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Control Suggestions Cache</CardTitle>
                                <Switch
                                    checked={config.enable_control_cache}
                                    onCheckedChange={(checked) => setConfig({ ...config, enable_control_cache: checked })}
                                />
                            </div>
                            <CardDescription>
                                Cache control recommendations by risk category. (7-day TTL)
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Database className="h-5 w-5" />
                                    Cache Statistics
                                </CardTitle>
                                <Button variant="outline" size="sm" onClick={loadCacheStats} disabled={loadingStats}>
                                    <RefreshCw className={`h-4 w-4 mr-1 ${loadingStats ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {cacheStats ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-muted rounded-lg">
                                            <div className="text-2xl font-bold">{cacheStats.totalEntries}</div>
                                            <div className="text-sm text-muted-foreground">Total Entries</div>
                                        </div>
                                        <div className="text-center p-4 bg-muted rounded-lg">
                                            <div className="text-2xl font-bold">
                                                {Object.values(cacheStats.byFeature).reduce((sum, f) => sum + f.totalHits, 0)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Total Hits</div>
                                        </div>
                                        <div className="text-center p-4 bg-muted rounded-lg">
                                            <div className="text-2xl font-bold">{cacheStats.expiringWithin7Days}</div>
                                            <div className="text-sm text-muted-foreground">Expiring Soon</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>By Feature</Label>
                                        {Object.entries(cacheStats.byFeature).length > 0 ? (
                                            <div className="space-y-2">
                                                {Object.entries(cacheStats.byFeature).map(([feature, stats]) => (
                                                    <div key={feature} className="flex items-center justify-between p-2 bg-muted rounded">
                                                        <span className="font-medium">{feature.replace('_', ' ')}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-sm">{stats.count} entries</span>
                                                            <span className="text-sm text-muted-foreground">{stats.totalHits} hits</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleClearCache(feature)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground text-sm">No cached entries yet.</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Loading statistics...</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleClearCache()}
                                disabled={!cacheStats?.totalEntries}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Clear All Cache
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end">
                <Button onClick={saveConfig} disabled={saving}>
                    {saving ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
