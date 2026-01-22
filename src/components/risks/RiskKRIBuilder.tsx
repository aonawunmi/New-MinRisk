
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2, Sparkles, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateAIKRISuggestionsForRisk, type AISuggestedKRI } from '@/lib/ai';
import { getRiskIndicators, createAndLinkKRI, unlinkRiskIndicator, type RiskIndicator } from '@/lib/risk-indicators';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RiskKRIBuilderProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    riskId: string;
    riskCode: string;
    riskTitle: string;
    riskDescription: string;
    riskCategory: string;
    rootCause?: string;
    impact?: string;
    onRiskUpdated?: () => void;
}

export default function RiskKRIBuilder({
    open,
    onOpenChange,
    riskId,
    riskCode,
    riskTitle,
    riskDescription,
    riskCategory,
    rootCause = 'Not specified',
    impact = 'Not specified',
    onRiskUpdated
}: RiskKRIBuilderProps) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [existingKRIs, setExistingKRIs] = useState<RiskIndicator[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestedKRI[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Selected suggestions to add
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('current');
    const [linkConfig, setLinkConfig] = useState<{
        signal_type: 'leading' | 'lagging' | 'concurrent';
    }>({
        signal_type: 'leading'
    });

    useEffect(() => {
        if (open && riskId) {
            loadExistingKRIs();
        }
    }, [open, riskId]);

    // When a suggestion is selected, auto-fill signal type
    useEffect(() => {
        if (selectedSuggestionIndex !== null && aiSuggestions[selectedSuggestionIndex]) {
            const suggestion = aiSuggestions[selectedSuggestionIndex];
            setLinkConfig(prev => ({
                ...prev,
                // Map AI 'Type' to lowercase signal_type
                signal_type: suggestion.kri_type.toLowerCase() as any
            }));
        }
    }, [selectedSuggestionIndex]);

    async function loadExistingKRIs() {
        setLoading(true);
        try {
            const { data, error } = await getRiskIndicators(riskId);
            if (error) throw error;
            setExistingKRIs(data || []);
        } catch (err) {
            console.error('Failed to load KRIs:', err);
            setError('Failed to load existing KRIs');
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerate() {
        setGenerating(true);
        setError(null);
        try {
            // Updated to fetch 5 suggestions
            const data = await generateAIKRISuggestionsForRisk(riskTitle, riskDescription, riskCategory, rootCause, impact);
            setAiSuggestions(data || []);
            setActiveTab('ai'); // Switch to AI tab automatically
        } catch (err) {
            console.error('AI Generation Failed:', err);
            setError('Failed to generate KRI suggestions. Please try again.');
        } finally {
            setGenerating(false);
        }
    }

    function mapDirectionToDb(direction: string): string {
        const d = direction.toLowerCase();
        if (d.includes('lower') || d.includes('minimize')) return 'above'; // Alert if above (because lower is better)
        if (d.includes('higher') || d.includes('maximize')) return 'below'; // Alert if below (because higher is better)
        return 'above'; // Default
    }

    async function handleAddSuggestion() {
        if (selectedSuggestionIndex === null) return;
        const suggestion = aiSuggestions[selectedSuggestionIndex];

        setLoading(true);
        try {
            const { error } = await createAndLinkKRI({
                riskId,
                kriData: {
                    kri_name: suggestion.kri_name,
                    description: suggestion.description,
                    indicator_type: linkConfig.signal_type, // Map signal type here
                    measurement_unit: suggestion.measurement_unit,
                    collection_frequency: suggestion.collection_frequency,
                    lower_threshold: suggestion.threshold_green,
                    upper_threshold: suggestion.threshold_red,
                    target_value: suggestion.threshold_green,
                    threshold_direction: mapDirectionToDb(suggestion.direction)
                },
                linkData: {
                    // coverage_strength and rationale removed as not supported by DB schema presently
                }
            });

            if (error) throw error;

            // Refresh list
            await loadExistingKRIs();
            // Remove added suggestion
            setAiSuggestions(prev => prev.filter((_, i) => i !== selectedSuggestionIndex));
            setSelectedSuggestionIndex(null);

            // Stay on AI tab is implicit since we don't change activeTab here

            if (onRiskUpdated) onRiskUpdated();

        } catch (err) {
            console.error('Failed to add KRI:', err);
            setError('Failed to create and link KRI');
        } finally {
            setLoading(false);
        }
    }

    async function handleUnlink(linkId: string) {
        if (!confirm('Are you sure you want to unlink this KRI?')) return;

        setLoading(true);
        try {
            // Note: linkId is the junction table ID
            await unlinkRiskIndicator(linkId);
            await loadExistingKRIs();
            if (onRiskUpdated) onRiskUpdated();
        } catch (err) {
            console.error('Failed to unlink:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Risk Indicators (KRIs)</DialogTitle>
                    <DialogDescription>
                        Define how this risk is monitored. KRIs provide early warning signals and performance tracking.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="current">Current KRIs ({existingKRIs.length})</TabsTrigger>
                            <TabsTrigger value="ai">AI Suggestions</TabsTrigger>
                        </TabsList>

                        <TabsContent value="current" className="space-y-4 mt-4">
                            {loading && existingKRIs.length === 0 ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                            ) : existingKRIs.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                                    <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500 font-medium">No KRIs linked yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Use the "AI Suggestions" tab to generate indicators.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {existingKRIs.map(kri => (
                                        <Card key={kri.id} className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                                            <CardContent className="pt-4 flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-gray-900">{kri.kri_definition?.kri_name}</h4>
                                                        <Badge variant="secondary" className="text-[10px]">{kri.kri_definition?.kri_code}</Badge>
                                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
                                                            {kri.kri_definition?.indicator_type?.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">{kri.kri_definition?.measurement_unit} measured {kri.kri_definition?.collection_frequency}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => handleUnlink(kri.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="ai" className="space-y-4 mt-4">
                            {!generating && aiSuggestions.length === 0 && (
                                <div className="text-center py-12">
                                    <Sparkles className="h-12 w-12 text-purple-200 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">Generate Smart Indicators</h3>
                                    <p className="text-gray-500 max-w-md mx-auto mt-2 mb-6">
                                        Use AI to analyze your risk context and suggest leading and lagging indicators tailored to your specific scenario.
                                    </p>
                                    <Button onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700">
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Generate Suggestions
                                    </Button>
                                </div>
                            )}

                            {generating && (
                                <div className="text-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
                                    <p className="text-gray-600">Analyzing Risk Context...</p>
                                    <p className="text-xs text-gray-400 mt-2">Generating Leading & Lagging Indicators</p>
                                </div>
                            )}

                            {aiSuggestions.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* List */}
                                    <div className="space-y-3 h-[500px] overflow-y-auto pr-2">
                                        {aiSuggestions.map((suggestion, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedSuggestionIndex(idx)}
                                                className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedSuggestionIndex === idx ? 'border-purple-500 bg-purple-50' : 'hover:border-gray-300'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-semibold text-sm">{suggestion.kri_name}</h4>
                                                    <Badge className={suggestion.kri_type === 'Leading' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                                        {suggestion.kri_type}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-gray-600 mb-2">{suggestion.description}</p>
                                                <p className="text-[10px] text-gray-400 italic">"{suggestion.reasoning}"</p>
                                            </div>
                                        ))}
                                        <Button variant="outline" size="sm" onClick={handleGenerate} className="w-full mt-4">
                                            <RefreshCw className="h-3 w-3 mr-2" /> Regenerate
                                        </Button>
                                    </div>

                                    {/* Config & Add */}
                                    <div className="bg-gray-50 p-4 rounded-lg border h-fit">
                                        {selectedSuggestionIndex !== null ? (
                                            <div className="space-y-4">
                                                <h4 className="font-bold border-b pb-2">Configure Linkage</h4>

                                                <div className="space-y-2">
                                                    <Label>Signal Type</Label>
                                                    <Select
                                                        value={linkConfig.signal_type}
                                                        onValueChange={(v: any) => setLinkConfig(p => ({ ...p, signal_type: v }))}
                                                    >
                                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="leading">Leading (Predictive)</SelectItem>
                                                            <SelectItem value="lagging">Lagging (Reactive)</SelectItem>
                                                            <SelectItem value="concurrent">Concurrent</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
                                                    <strong>AI Rationale:</strong> {aiSuggestions[selectedSuggestionIndex].reasoning}
                                                </div>

                                                <Button onClick={handleAddSuggestion} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                                                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                    Create & Link KRI
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                                <p>Select a suggestion to configure</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
