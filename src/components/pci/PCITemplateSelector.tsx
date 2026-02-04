/**
 * PCITemplateSelector Component
 *
 * Modal showing the library of 16 PCI templates.
 * User selects a template to create a new PCI instance.
 */

import { useState, useEffect } from 'react';
import { getPCITemplates } from '@/lib/pci';
import type { PCITemplate, RiskResponseType } from '@/types/pci';
import { RESPONSE_PCI_PRIORITY } from '@/types/pci';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Shield,
  Target,
  Search,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface PCITemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: PCITemplate) => void;
  riskResponse?: RiskResponseType;
  aiSuggestions?: string[]; // Array of suggested PCI template IDs
  existingTemplateIds?: string[]; // Array of template IDs already added to this risk
}

// Group templates by category
const CATEGORY_ORDER = [
  'Exposure & Activity Constraints',
  'Authority & Access Management',
  'Segregation & Dual Control',
  'Rules, Thresholds & Limits Enforcement',
  'Input & Transaction Validation',
  'Independent Verification & Reconciliation',
  'Monitoring, Surveillance & Exception Handling',
  'Risk Offsetting Mechanisms',
  'Financial Protection & Risk Transfer',
  'Resilience, Continuity & Recovery',
  'People Capability & Operating Discipline',
];

export default function PCITemplateSelector({
  open,
  onOpenChange,
  onSelect,
  riskResponse,
  aiSuggestions = [],
  existingTemplateIds = [],
}: PCITemplateSelectorProps) {
  const [templates, setTemplates] = useState<PCITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('suggested');

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  async function loadTemplates() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getPCITemplates();
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setTemplates(data || []);
      }
    } catch (err) {
      setError('Failed to load PCI templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filter templates based on search
  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.purpose.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  // Get recommended template IDs based on risk response
  const recommendedIds = riskResponse
    ? RESPONSE_PCI_PRIORITY[riskResponse]
    : [];

  // Combine recommended + AI suggestions, excluding already-added templates
  const suggestedTemplateIds = new Set([...recommendedIds, ...aiSuggestions]);
  const suggestedTemplates = filteredTemplates.filter(
    (t) => suggestedTemplateIds.has(t.id) && !existingTemplateIds.includes(t.id)
  );

  // Also filter out existing templates from the "All" view (for consistency)
  const availableTemplates = filteredTemplates.filter(
    (t) => !existingTemplateIds.includes(t.id)
  );

  // Group available templates by category (excluding already-added)
  const templatesByCategory = availableTemplates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, PCITemplate[]>);

  const objectiveColors = {
    likelihood: 'bg-blue-100 text-blue-800 border-blue-200',
    impact: 'bg-purple-100 text-purple-800 border-purple-200',
    both: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  function renderTemplateCard(
    template: PCITemplate,
    showRecommended = false,
    showAI = false
  ) {
    return (
      <Card
        key={template.id}
        className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
        onClick={() => onSelect(template)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {template.id}
              </Badge>
              <Badge
                variant="outline"
                className={objectiveColors[template.objective_default]}
              >
                <Target className="h-3 w-3 mr-1" />
                {template.objective_default === 'both'
                  ? 'L+I'
                  : template.objective_default === 'likelihood'
                  ? 'Likelihood'
                  : 'Impact'}
              </Badge>
            </div>
            {showRecommended && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Recommended
              </Badge>
            )}
            {showAI && !showRecommended && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Suggested
              </Badge>
            )}
          </div>
          <CardTitle className="text-sm mt-2">{template.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.purpose}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {template.category}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Select Control Template
          </DialogTitle>
          <DialogDescription>
            Choose a control template from the library. Each template defines
            the control type and includes 10 secondary assurance checks.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center text-red-600 p-4">{error}</div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suggested">
                <Sparkles className="h-4 w-4 mr-1" />
                Suggested
                {suggestedTemplates.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {suggestedTemplates.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                All Templates
                <Badge variant="secondary" className="ml-2">
                  {availableTemplates.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="suggested" className="mt-0">
                {suggestedTemplates.length === 0 ? (
                  <div className="text-center text-muted-foreground p-8">
                    {!riskResponse ? (
                      <>
                        Set a risk response first to see suggestions.
                        <br />
                        Or browse all templates below.
                      </>
                    ) : existingTemplateIds.length > 0 && suggestedTemplateIds.size > 0 ? (
                      <>
                        All suggested templates have already been added.
                        <br />
                        Browse all templates for more options.
                      </>
                    ) : (
                      <>
                        No suggestions available for this risk yet.
                        <br />
                        Browse all templates to find suitable controls.
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {suggestedTemplates.map((t) =>
                      renderTemplateCard(
                        t,
                        recommendedIds.includes(t.id),
                        aiSuggestions.includes(t.id)
                      )
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all" className="mt-0 space-y-6">
                {availableTemplates.length === 0 ? (
                  <div className="text-center text-muted-foreground p-8">
                    All templates have been added to this risk.
                  </div>
                ) : (
                  CATEGORY_ORDER.filter(
                    (cat) => templatesByCategory[cat]?.length > 0
                  ).map((category) => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        {category}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {templatesByCategory[category].map((t) =>
                          renderTemplateCard(
                            t,
                            recommendedIds.includes(t.id),
                            aiSuggestions.includes(t.id)
                          )
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
