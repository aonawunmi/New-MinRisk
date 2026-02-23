/**
 * PCITemplateSelector Component
 *
 * Modal showing the library of 16 PCI templates.
 * User selects a template to create a new PCI instance,
 * or marks it as "Not Applicable" to dismiss the suggestion.
 *
 * REDESIGNED 2026-02-23: Added category icons, colour borders,
 * "when to use" hints, promoted purpose text, AI rationale display.
 */

import { useState, useEffect } from 'react';
import { getPCITemplates, declinePCITemplate, undoDeclinePCITemplate } from '@/lib/pci';
import type { PCITemplate, RiskResponseType } from '@/types/pci';
import { RESPONSE_PCI_PRIORITY } from '@/types/pci';
import type { PCISuggestion } from '@/lib/pci';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Shield,
  Target,
  Search,
  Sparkles,
  ArrowRight,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Undo2,
  Ban,
  KeyRound,
  Users,
  Gauge,
  FileCheck,
  GitCompareArrows,
  Eye,
  Scale,
  Banknote,
  LifeBuoy,
  GraduationCap,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// CATEGORY CONFIGURATION — Icons, Colours, Short Labels
// ============================================================================

interface CategoryConfig {
  icon: LucideIcon;
  borderColor: string;
  bgColor: string;
  iconColor: string;
  headerBg: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'Exposure & Activity Constraints': {
    icon: Ban,
    borderColor: 'border-l-red-400',
    bgColor: 'bg-red-50/50',
    iconColor: 'text-red-500',
    headerBg: 'bg-red-50 border-red-200',
  },
  'Authority & Access Management': {
    icon: KeyRound,
    borderColor: 'border-l-amber-400',
    bgColor: 'bg-amber-50/50',
    iconColor: 'text-amber-600',
    headerBg: 'bg-amber-50 border-amber-200',
  },
  'Segregation & Dual Control': {
    icon: Users,
    borderColor: 'border-l-blue-400',
    bgColor: 'bg-blue-50/50',
    iconColor: 'text-blue-500',
    headerBg: 'bg-blue-50 border-blue-200',
  },
  'Rules, Thresholds & Limits Enforcement': {
    icon: Gauge,
    borderColor: 'border-l-orange-400',
    bgColor: 'bg-orange-50/50',
    iconColor: 'text-orange-500',
    headerBg: 'bg-orange-50 border-orange-200',
  },
  'Input & Transaction Validation': {
    icon: FileCheck,
    borderColor: 'border-l-teal-400',
    bgColor: 'bg-teal-50/50',
    iconColor: 'text-teal-600',
    headerBg: 'bg-teal-50 border-teal-200',
  },
  'Independent Verification & Reconciliation': {
    icon: GitCompareArrows,
    borderColor: 'border-l-green-400',
    bgColor: 'bg-green-50/50',
    iconColor: 'text-green-600',
    headerBg: 'bg-green-50 border-green-200',
  },
  'Monitoring, Surveillance & Exception Handling': {
    icon: Eye,
    borderColor: 'border-l-indigo-400',
    bgColor: 'bg-indigo-50/50',
    iconColor: 'text-indigo-500',
    headerBg: 'bg-indigo-50 border-indigo-200',
  },
  'Risk Offsetting Mechanisms': {
    icon: Scale,
    borderColor: 'border-l-purple-400',
    bgColor: 'bg-purple-50/50',
    iconColor: 'text-purple-500',
    headerBg: 'bg-purple-50 border-purple-200',
  },
  'Financial Protection & Risk Transfer': {
    icon: Banknote,
    borderColor: 'border-l-emerald-400',
    bgColor: 'bg-emerald-50/50',
    iconColor: 'text-emerald-600',
    headerBg: 'bg-emerald-50 border-emerald-200',
  },
  'Resilience, Continuity & Recovery': {
    icon: LifeBuoy,
    borderColor: 'border-l-cyan-400',
    bgColor: 'bg-cyan-50/50',
    iconColor: 'text-cyan-600',
    headerBg: 'bg-cyan-50 border-cyan-200',
  },
  'People Capability & Operating Discipline': {
    icon: GraduationCap,
    borderColor: 'border-l-yellow-400',
    bgColor: 'bg-yellow-50/50',
    iconColor: 'text-yellow-600',
    headerBg: 'bg-yellow-50 border-yellow-200',
  },
};

// Fallback config for unknown categories
const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  icon: Shield,
  borderColor: 'border-l-gray-400',
  bgColor: 'bg-gray-50/50',
  iconColor: 'text-gray-500',
  headerBg: 'bg-gray-50 border-gray-200',
};

// ============================================================================
// "WHEN TO USE" HINTS — Practical one-line guidance per template
// ============================================================================

const TEMPLATE_HINTS: Record<string, string> = {
  'PCI-01': 'Use when a specific activity must be completely prohibited',
  'PCI-02': 'Use when you need to cap or limit exposure/concentration levels',
  'PCI-03': 'Use when actions must be restricted to authorised roles only',
  'PCI-04': 'Use for admin/superuser access that could cause outsized harm',
  'PCI-05': 'Use when a second person must independently review before execution',
  'PCI-06': 'Use for high-impact actions requiring two separate approvals',
  'PCI-07': 'Use to block actions when pre-set limits or thresholds are breached',
  'PCI-08': 'Use to detect and escalate breaches after they occur',
  'PCI-09': 'Use to validate data and transactions at the point of entry',
  'PCI-10': 'Use when reference or master data changes need formal governance',
  'PCI-11': 'Use for independent reconciliation between two or more data sources',
  'PCI-12': 'Use for real-time monitoring with alerting and exception queues',
  'PCI-13': 'Use to offset risk exposure via hedging or counter-arrangements',
  'PCI-14': 'Use for insurance, guarantees, or loss absorption mechanisms',
  'PCI-15': 'Use for business continuity, disaster recovery, or resilience plans',
  'PCI-16': 'Use when human competence, training, or supervision is the key control',
};

// ============================================================================
// RESPONSE TYPE LABELS — For display in rationale
// ============================================================================

const RESPONSE_LABELS: Record<string, string> = {
  avoid: 'Avoid',
  reduce_likelihood: 'Reduce Likelihood',
  reduce_impact: 'Reduce Impact',
  transfer_share: 'Transfer / Share',
  accept: 'Accept',
};

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

// ============================================================================
// COMPONENT
// ============================================================================

interface PCITemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: PCITemplate) => void;
  riskId: string;
  riskResponse?: RiskResponseType;
  aiSuggestions?: string[]; // Array of suggested PCI template IDs
  aiSuggestionsWithRationale?: PCISuggestion[]; // Full AI suggestions with rationale
  existingTemplateIds?: string[]; // Array of template IDs already added to this risk
  declinedTemplateIds?: string[]; // Array of template IDs marked as not applicable
  onDecline?: (templateId: string) => void;
  onUndoDecline?: (templateId: string) => void;
}

export default function PCITemplateSelector({
  open,
  onOpenChange,
  onSelect,
  riskId,
  riskResponse,
  aiSuggestions = [],
  aiSuggestionsWithRationale = [],
  existingTemplateIds = [],
  declinedTemplateIds = [],
  onDecline,
  onUndoDecline,
}: PCITemplateSelectorProps) {
  const [templates, setTemplates] = useState<PCITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('suggested');
  const [declining, setDeclining] = useState<string | null>(null);
  const [showDeclined, setShowDeclined] = useState(false);

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

  async function handleDecline(e: React.MouseEvent, templateId: string) {
    e.stopPropagation(); // Prevent card click
    setDeclining(templateId);
    try {
      const { error } = await declinePCITemplate(riskId, templateId);
      if (error) {
        console.error('Failed to decline template:', error);
      } else {
        onDecline?.(templateId);
      }
    } catch (err) {
      console.error('Error declining template:', err);
    } finally {
      setDeclining(null);
    }
  }

  async function handleUndoDecline(e: React.MouseEvent, templateId: string) {
    e.stopPropagation();
    setDeclining(templateId);
    try {
      const { error } = await undoDeclinePCITemplate(riskId, templateId);
      if (error) {
        console.error('Failed to undo decline:', error);
      } else {
        onUndoDecline?.(templateId);
      }
    } catch (err) {
      console.error('Error undoing decline:', err);
    } finally {
      setDeclining(null);
    }
  }

  // Build rationale lookup from AI suggestions
  const aiRationaleMap = new Map<string, string>();
  aiSuggestionsWithRationale.forEach((s) => {
    if (s.rationale) {
      aiRationaleMap.set(s.template_id, s.rationale);
    }
  });

  // Filter templates based on search (now also searches hints)
  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.purpose.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      (TEMPLATE_HINTS[t.id] || '').toLowerCase().includes(search.toLowerCase())
  );

  // Get recommended template IDs based on risk response
  const recommendedIds = riskResponse
    ? RESPONSE_PCI_PRIORITY[riskResponse]
    : [];

  // Combine recommended + AI suggestions, excluding already-added AND declined templates
  const suggestedTemplateIds = new Set([...recommendedIds, ...aiSuggestions]);
  const suggestedTemplates = filteredTemplates.filter(
    (t) =>
      suggestedTemplateIds.has(t.id) &&
      !existingTemplateIds.includes(t.id) &&
      !declinedTemplateIds.includes(t.id)
  );

  // Get declined templates that were suggested
  const declinedSuggestedTemplates = filteredTemplates.filter(
    (t) => declinedTemplateIds.includes(t.id) && suggestedTemplateIds.has(t.id)
  );

  // Also filter out existing AND declined templates from the "All" view
  const availableTemplates = filteredTemplates.filter(
    (t) => !existingTemplateIds.includes(t.id) && !declinedTemplateIds.includes(t.id)
  );

  // Group available templates by category (excluding already-added and declined)
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

  // ============================================================================
  // TEMPLATE CARD — Redesigned with icons, colours, hints
  // ============================================================================

  function renderTemplateCard(
    template: PCITemplate,
    showRecommended = false,
    showAI = false,
    showDeclineButton = false,
    isDeclined = false
  ) {
    const isDeclining = declining === template.id;
    const config = CATEGORY_CONFIG[template.category] || DEFAULT_CATEGORY_CONFIG;
    const CategoryIcon = config.icon;
    const hint = TEMPLATE_HINTS[template.id];
    const aiRationale = aiRationaleMap.get(template.id);

    return (
      <Card
        key={template.id}
        className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${config.borderColor} ${
          isDeclined
            ? 'opacity-50 border-l-gray-300'
            : 'hover:border-l-blue-500'
        }`}
        onClick={() => !isDeclined && onSelect(template)}
      >
        <CardHeader className="pb-2 pt-3 px-4">
          {/* Row 1: Icon + Name + Template ID */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className={`mt-0.5 p-1.5 rounded-md ${config.bgColor}`}>
                <CategoryIcon className={`h-4 w-4 ${config.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold leading-tight">
                  {template.name}
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                {template.id}
              </Badge>
            </div>
          </div>

          {/* Badges row: objective + recommended/AI */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${objectiveColors[template.objective_default]}`}
            >
              <Target className="h-2.5 w-2.5 mr-0.5" />
              {template.objective_default === 'both'
                ? 'Likelihood + Impact'
                : template.objective_default === 'likelihood'
                ? 'Likelihood'
                : 'Impact'}
            </Badge>
            {showRecommended && !isDeclined && (
              <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 border-green-200">
                Recommended
              </Badge>
            )}
            {showAI && !showRecommended && !isDeclined && (
              <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-200">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                AI Suggested
              </Badge>
            )}
            {isDeclined && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600">
                Not Applicable
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-4 pb-3">
          {/* Purpose — promoted from tiny muted text to readable */}
          <p className="text-sm text-foreground/80 leading-snug mb-2">
            {template.purpose}
          </p>

          {/* "When to use" hint */}
          {hint && !isDeclined && (
            <div className="flex items-start gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground italic leading-snug">
                {hint}
              </p>
            </div>
          )}

          {/* AI Rationale (if available, for suggested cards) */}
          {aiRationale && !isDeclined && (showAI || showRecommended) && (
            <div className="flex items-start gap-1.5 mb-2 bg-purple-50 rounded px-2 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-purple-700 leading-snug">
                {aiRationale}
              </p>
            </div>
          )}

          {/* Recommended reason (fallback when no AI rationale) */}
          {!aiRationale && showRecommended && !isDeclined && riskResponse && (
            <div className="flex items-start gap-1.5 mb-2">
              <Target className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-green-700 leading-snug">
                Recommended for &ldquo;{RESPONSE_LABELS[riskResponse] || riskResponse}&rdquo; response
              </p>
            </div>
          )}

          {/* Footer: category + actions */}
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100">
            <span className="text-[10px] text-muted-foreground truncate mr-2 flex items-center gap-1">
              <CategoryIcon className={`h-3 w-3 ${config.iconColor}`} />
              {template.category}
            </span>
            <div className="flex items-center gap-1">
              {showDeclineButton && !isDeclined && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => handleDecline(e, template.id)}
                  disabled={isDeclining}
                >
                  {isDeclining ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      N/A
                    </>
                  )}
                </Button>
              )}
              {isDeclined && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={(e) => handleUndoDecline(e, template.id)}
                  disabled={isDeclining}
                >
                  {isDeclining ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Undo2 className="h-3 w-3 mr-1" />
                      Undo
                    </>
                  )}
                </Button>
              )}
              {!isDeclined && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 font-medium"
                  onClick={() => onSelect(template)}
                >
                  Select
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // CATEGORY HEADER — Icon + name + count badge
  // ============================================================================

  function renderCategoryHeader(category: string, count: number) {
    const config = CATEGORY_CONFIG[category] || DEFAULT_CATEGORY_CONFIG;
    const CategoryIcon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.headerBg} mb-3`}>
        <CategoryIcon className={`h-4 w-4 ${config.iconColor}`} />
        <h3 className="text-sm font-medium text-foreground flex-1">
          {category}
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          {count}
        </Badge>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Select Control Template
          </DialogTitle>
          <DialogDescription>
            Choose a control template from the library. Each template includes 10 secondary controls
            that you&apos;ll attest to, generating a DIME effectiveness score.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, purpose, or use case..."
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
              <TabsContent value="suggested" className="mt-0 space-y-4">
                {suggestedTemplates.length === 0 && declinedSuggestedTemplates.length === 0 ? (
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
                  <>
                    {/* Response context banner */}
                    {riskResponse && suggestedTemplates.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          Showing templates recommended for the &ldquo;
                          <strong>{RESPONSE_LABELS[riskResponse] || riskResponse}</strong>
                          &rdquo; treatment decision
                        </span>
                      </div>
                    )}

                    {/* Active Suggestions */}
                    {suggestedTemplates.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {suggestedTemplates.map((t) =>
                          renderTemplateCard(
                            t,
                            recommendedIds.includes(t.id),
                            aiSuggestions.includes(t.id),
                            true, // showDeclineButton
                            false // isDeclined
                          )
                        )}
                      </div>
                    )}

                    {/* Declined Suggestions (Collapsible) */}
                    {declinedSuggestedTemplates.length > 0 && (
                      <Collapsible open={showDeclined} onOpenChange={setShowDeclined}>
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-between text-muted-foreground hover:text-foreground"
                          >
                            <span className="flex items-center gap-2">
                              <X className="h-4 w-4" />
                              Declined ({declinedSuggestedTemplates.length})
                            </span>
                            {showDeclined ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {declinedSuggestedTemplates.map((t) =>
                              renderTemplateCard(
                                t,
                                recommendedIds.includes(t.id),
                                aiSuggestions.includes(t.id),
                                false, // showDeclineButton
                                true // isDeclined
                              )
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </>
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
                      {renderCategoryHeader(category, templatesByCategory[category].length)}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {templatesByCategory[category].map((t) =>
                          renderTemplateCard(
                            t,
                            recommendedIds.includes(t.id),
                            aiSuggestions.includes(t.id),
                            false, // No decline button in "All" tab
                            false
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
