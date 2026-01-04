/**
 * Enhanced RiskForm Component
 *
 * Dialog form for adding and editing risks with:
 * - Taxonomy-based category/subcategory dropdowns
 * - Optional AI statement refinement
 */

import { useState, useEffect } from 'react';
import { createRisk, updateRisk } from '@/lib/risks';
import { getCategoriesWithSubcategories, type CategoryWithSubcategories, exportTaxonomy } from '@/lib/taxonomy';
import { getRootCauses, getImpacts, createCustomRootCause, createCustomImpact, type RootCause, type Impact } from '@/lib/libraries';
import { refineRiskStatement, type RiskStatementRefinement, revalidateEditedStatement, type RevalidationResult, getAIControlRecommendations, type AISuggestedControl } from '@/lib/ai';
import { createControl, getControlsForRisk, updateControl, deleteControl, calculateControlEffectiveness } from '@/lib/controls';
import { getAlertsWithEventsForRisk, type RiskIntelligenceAlert, type ExternalEvent } from '@/lib/riskIntelligence';
import { getOrganizationConfig, getLikelihoodOptions, getImpactOptions, type OrganizationConfig } from '@/lib/config';
import { listUsersInOrganization } from '@/lib/admin';
import { isUserAdmin } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import type { Control, UpdateControlData } from '@/types/control';
import type { Risk, CreateRiskData } from '@/types/risk';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { AlertCircle, Sparkles, Loader2, CheckCircle, X, Edit, AlertTriangle, Plus, Shield, XCircle, Check, Trash2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TreatmentLogViewer from '@/components/riskIntelligence/TreatmentLogViewer';

interface RiskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingRisk?: Risk | null;
  readOnly?: boolean;
}

export default function RiskForm({
  open,
  onOpenChange,
  onSuccess,
  editingRisk,
  readOnly = false,
}: RiskFormProps) {
  const [formData, setFormData] = useState<CreateRiskData>({
    risk_title: '',
    risk_description: '',
    division: '',
    department: '',
    category: '',
    owner: '',
    likelihood_inherent: 1,
    impact_inherent: 1,
    status: 'OPEN',
    period: null,
    is_priority: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Taxonomy state
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);

  // Library state (root causes, impacts, etc.)
  const [rootCauses, setRootCauses] = useState<RootCause[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [selectedRootCauseId, setSelectedRootCauseId] = useState<string>('');
  const [selectedImpactId, setSelectedImpactId] = useState<string>('');
  const [loadingLibraries, setLoadingLibraries] = useState(false);
  const [rootCauseSearch, setRootCauseSearch] = useState<string>('');
  const [impactSearch, setImpactSearch] = useState<string>('');

  // Custom library entry state
  const [showCustomRootCause, setShowCustomRootCause] = useState(false);
  const [showCustomImpact, setShowCustomImpact] = useState(false);
  const [customRootCause, setCustomRootCause] = useState({
    cause_code: '',
    cause_name: '',
    cause_description: '',
    category: '',
  });
  const [customImpact, setCustomImpact] = useState({
    impact_code: '',
    impact_name: '',
    impact_description: '',
    category: '',
  });
  const [savingCustom, setSavingCustom] = useState(false);

  // Admin access state
  const [isAdmin, setIsAdmin] = useState(false);

  // AI Refinement state
  const [isRefining, setIsRefining] = useState(false);
  const [refinement, setRefinement] = useState<RiskStatementRefinement | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);

  // Editing refined statement state
  const [isEditingRefinement, setIsEditingRefinement] = useState(false);
  const [editedRefinedStatement, setEditedRefinedStatement] = useState('');
  const [revalidation, setRevalidation] = useState<RevalidationResult | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // Controls state (integrated into risk form)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestedControl[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [loadingAISuggestions, setLoadingAISuggestions] = useState(false);
  const [aiSuggestionsError, setAiSuggestionsError] = useState<string | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [editingAISuggestionIndex, setEditingAISuggestionIndex] = useState<number | null>(null);

  // Manual control entry state
  const [showManualControl, setShowManualControl] = useState(false);
  const [manualControl, setManualControl] = useState({
    name: '',
    description: '',
    control_type: 'preventive' as 'preventive' | 'detective' | 'corrective',
    target: 'Likelihood' as 'Likelihood' | 'Impact',
    design_score: 2,
    implementation_score: 2,
    monitoring_score: 2,
    evaluation_score: 2,
  });
  const [manualControls, setManualControls] = useState<typeof manualControl[]>([]);

  // Existing controls state (when editing a risk)
  const [existingControls, setExistingControls] = useState<Control[]>([]);
  const [loadingControls, setLoadingControls] = useState(false);
  const [editingControlId, setEditingControlId] = useState<string | null>(null);
  const [editingControlData, setEditingControlData] = useState<UpdateControlData | null>(null);
  const [updatingControl, setUpdatingControl] = useState(false);
  const [deletingControlId, setDeletingControlId] = useState<string | null>(null);

  // Intelligence alerts state (when editing a risk)
  type AlertWithEvent = RiskIntelligenceAlert & { external_events: ExternalEvent };
  const [intelligenceAlerts, setIntelligenceAlerts] = useState<AlertWithEvent[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // User selection state (for owner dropdown)
  interface OrgUser {
    id: string;
    full_name: string;
    email: string;
    role: string;
  }
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');

  // Organization configuration state
  const [orgConfig, setOrgConfig] = useState<OrganizationConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  // Load existing controls for a risk
  async function loadExistingControls(riskId: string) {
    setLoadingControls(true);
    try {
      const { data, error } = await getControlsForRisk(riskId);
      if (error) {
        console.error('Error loading controls:', error);
        setExistingControls([]);
      } else {
        setExistingControls(data || []);
      }
    } catch (err) {
      console.error('Unexpected error loading controls:', err);
      setExistingControls([]);
    } finally {
      setLoadingControls(false);
    }
  }

  // Load intelligence alerts for a risk
  async function loadIntelligenceAlerts(riskCode: string) {
    setLoadingAlerts(true);
    try {
      const { data, error } = await getAlertsWithEventsForRisk(riskCode);
      if (error) {
        console.error('Error loading intelligence alerts:', error);
        setIntelligenceAlerts([]);
      } else {
        setIntelligenceAlerts(data as AlertWithEvent[] || []);
      }
    } catch (err) {
      console.error('Unexpected error loading intelligence alerts:', err);
      setIntelligenceAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }

  // Start editing a control
  function handleStartEditControl(control: Control) {
    setEditingControlId(control.id);
    setEditingControlData({
      name: control.name,
      description: control.description || undefined,
      control_type: control.control_type || undefined,
      target: control.target,
      design_score: control.design_score || undefined,
      implementation_score: control.implementation_score || undefined,
      monitoring_score: control.monitoring_score || undefined,
      evaluation_score: control.evaluation_score || undefined,
    });
  }

  // Cancel editing control
  function handleCancelEditControl() {
    setEditingControlId(null);
    setEditingControlData(null);
  }

  // Save control changes
  async function handleSaveControl(controlId: string) {
    if (!editingControlData) return;

    setUpdatingControl(true);
    try {
      const { error } = await updateControl(controlId, editingControlData);
      if (error) {
        alert('Failed to update control: ' + error.message);
        return;
      }

      // Update local state
      setExistingControls(prevControls =>
        prevControls.map(c =>
          c.id === controlId
            ? {
              ...c,
              ...editingControlData,
              updated_at: new Date().toISOString(),
            }
            : c
        )
      );

      // Clear edit state
      setEditingControlId(null);
      setEditingControlData(null);
    } catch (err) {
      console.error('Error updating control:', err);
      alert('An unexpected error occurred');
    } finally {
      setUpdatingControl(false);
    }
  }

  // Delete control
  async function handleDeleteControl(controlId: string, controlName: string) {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete the control "${controlName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingControlId(controlId);
    try {
      const { error } = await deleteControl(controlId);
      if (error) {
        alert('Failed to delete control: ' + error.message);
        return;
      }

      // Remove from local state
      setExistingControls(prevControls =>
        prevControls.filter(c => c.id !== controlId)
      );

      // Trigger parent component to reload risks (including residual risk recalculation)
      onSuccess();
    } catch (err) {
      console.error('Error deleting control:', err);
      alert('An unexpected error occurred');
    } finally {
      setDeletingControlId(null);
    }
  }

  // Load taxonomy, libraries, config, and users on component mount
  useEffect(() => {
    if (open) {
      loadTaxonomy();
      loadLibraries();
      loadConfig();
      loadUsers();
      loadAdminStatus();
    }
  }, [open]);

  async function loadConfig() {
    setLoadingConfig(true);
    try {
      const { data, error } = await getOrganizationConfig();
      if (error) {
        console.error('Failed to load organization config:', error);
      } else {
        setOrgConfig(data);
      }
    } catch (err) {
      console.error('Unexpected config load error:', err);
    } finally {
      setLoadingConfig(false);
    }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      // Get current user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        console.error('User profile not found');
        return;
      }

      // Load all users in organization
      const { data: users, error } = await listUsersInOrganization(profile.organization_id);

      if (error) {
        console.error('Failed to load users:', error);
      } else {
        setOrgUsers(users || []);
      }
    } catch (err) {
      console.error('Unexpected user load error:', err);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadAdminStatus() {
    try {
      const adminStatus = await isUserAdmin();
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false); // Default to non-admin on error
    }
  }

  async function loadLibraries() {
    setLoadingLibraries(true);
    try {
      // Load root causes
      const { data: rootCausesData, error: rcError } = await getRootCauses();
      if (rcError) {
        console.error('Failed to load root causes:', rcError);
      } else {
        setRootCauses(rootCausesData || []);
      }

      // Load impacts
      const { data: impactsData, error: impError } = await getImpacts();
      if (impError) {
        console.error('Failed to load impacts:', impError);
      } else {
        setImpacts(impactsData || []);
      }
    } catch (err) {
      console.error('Unexpected library load error:', err);
    } finally {
      setLoadingLibraries(false);
    }
  }

  // Auto-generate risk statement when event, root cause, and impact are selected
  useEffect(() => {
    // Only auto-generate if we have all three components AND user hasn't already typed a custom statement
    if (formData.event_text && selectedRootCauseId && selectedImpactId) {
      const rootCause = rootCauses.find(rc => rc.id === selectedRootCauseId);
      const impact = impacts.find(imp => imp.id === selectedImpactId);

      if (rootCause && impact) {
        const generatedStatement = `Due to ${rootCause.cause_name}, ${formData.event_text}, resulting in ${impact.impact_name}.`;

        // Only auto-fill if risk_description is empty or was previously auto-generated
        // (to avoid overwriting user's custom edits)
        if (!formData.risk_description || formData.risk_description.startsWith('Due to ')) {
          setFormData(prev => ({
            ...prev,
            risk_description: generatedStatement
          }));
        }
      }
    }
  }, [formData.event_text, selectedRootCauseId, selectedImpactId, rootCauses, impacts]);

  // Initialize form when editing
  useEffect(() => {
    if (editingRisk) {
      setFormData({
        risk_code: editingRisk.risk_code,
        risk_title: editingRisk.risk_title,
        risk_description: editingRisk.risk_description,
        division: editingRisk.division,
        department: editingRisk.department,
        category: editingRisk.category,
        owner: editingRisk.owner,
        owner_id: editingRisk.owner_id || null,
        likelihood_inherent: editingRisk.likelihood_inherent,
        impact_inherent: editingRisk.impact_inherent,
        status: editingRisk.status,
        period: editingRisk.period,
        is_priority: editingRisk.is_priority,
        root_cause_id: editingRisk.root_cause_id || null,
        impact_id: editingRisk.impact_id || null,
        event_text: editingRisk.event_text || null,
      });

      // Set selected owner
      setSelectedOwnerId(editingRisk.owner_id || '');

      // Set selected root cause and impact
      setSelectedRootCauseId(editingRisk.root_cause_id || '');
      setSelectedImpactId(editingRisk.impact_id || '');

      // Load existing controls for this risk
      loadExistingControls(editingRisk.id);

      // Load intelligence alerts for this risk
      loadIntelligenceAlerts(editingRisk.risk_code);

      // Find and set category/subcategory from existing risk
      // Handle both legacy (subcategory in category field) and new (main category in category field) data
      const storedCategory = editingRisk.category;

      if (categories.length > 0 && storedCategory) {
        // Check if stored value is a Main Category
        const isMainCategory = categories.some(cat => cat.name === storedCategory);

        if (isMainCategory) {
          setSelectedCategory(storedCategory);
          console.log('Found main category:', storedCategory);
          // We don't have subcategory stored separately yet, so leave it empty
          // unless we parse it from description later
        } else {
          // Check if it's a Subcategory (Legacy behavior)
          const parentCategory = categories.find((cat) =>
            cat.subcategories.some((sub) => sub.name === storedCategory)
          );

          if (parentCategory) {
            setSelectedCategory(parentCategory.name);
            setSelectedSubcategory(storedCategory);
            console.log('Found legacy subcategory:', parentCategory.name, '→', storedCategory);
          }
        }
      }
    } else {
      // Reset form for new risk
      setFormData({
        risk_title: '',
        risk_description: '',
        division: '',
        department: '',
        category: '',
        owner: '',
        owner_id: null,
        likelihood_inherent: 1,
        impact_inherent: 1,
        status: 'OPEN',
        period: null,
        is_priority: false,
        root_cause_id: null,
        impact_id: null,
        event_text: null,
      });
      setSelectedCategory('');
      setSelectedSubcategory('');
      setSelectedRootCauseId('');
      setSelectedImpactId('');
      setSelectedOwnerId('');
    }
    setError(null);
    setRefinement(null);
    setShowRefinement(false);
    setIsEditingRefinement(false);
    setEditedRefinedStatement('');
    setRevalidation(null);
  }, [editingRisk, open, categories]);

  async function loadTaxonomy() {
    setLoadingTaxonomy(true);
    try {
      const { data, error: taxError } = await getCategoriesWithSubcategories();
      if (taxError) {
        console.error('Failed to load taxonomy:', taxError);
        setError('Failed to load risk categories');
      } else {
        setCategories(data || []);
      }
    } catch (err) {
      console.error('Unexpected taxonomy load error:', err);
      setError('Failed to load risk categories');
    } finally {
      setLoadingTaxonomy(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions (defensive check)
    if (loading) {
      console.log('⚠️ Risk save already in progress, ignoring duplicate submit');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use refined statement if available and accepted
      const finalDescription = refinement && showRefinement
        ? refinement.refined_statement
        : formData.risk_description;

      // Destructure to exclude fields that don't exist in database
      const { event_text, root_cause_id, impact_id, ...validFormData } = formData as any;

      const dataToSave = {
        ...validFormData,
        risk_description: finalDescription,
        category: selectedCategory, // Store Main Category (standardized)
        // We currently don't have a separate subcategory field in the DB, 
        // but strictly aligning 'category' to the main taxonomy fixes the dashboard aggregation issues.
        // The specific subcategory context is preserved in the AI refinement or description if needed.
      };

      let riskId: string | null = null;

      if (editingRisk) {
        // Update existing risk
        const { error: updateError } = await updateRisk({
          id: editingRisk.id,
          ...dataToSave,
        });

        if (updateError) {
          setError(updateError.message);
          console.error('Update risk error:', updateError);
          return;
        }

        riskId = editingRisk.id;
        console.log('Risk updated successfully');
      } else {
        // Create new risk
        console.log('[DEBUG] Calling createRisk with data:', dataToSave);
        const { data: newRisk, error: createError } = await createRisk(dataToSave);

        if (createError || !newRisk) {
          setError(createError?.message || 'Failed to create risk');
          console.error('Create risk error:', createError);
          return;
        }

        riskId = newRisk.id;
        console.log('Risk created successfully:', riskId);
      }

      // Create selected AI-suggested controls (if any)
      if (riskId && selectedSuggestions.size > 0) {
        console.log(`Creating ${selectedSuggestions.size} AI-suggested controls for risk ${riskId}`);

        const controlCreationPromises = Array.from(selectedSuggestions).map(async (index) => {
          const suggestion = aiSuggestions[index];
          if (!suggestion) return;

          try {
            await createControl({
              control_code: `CTRL-AI-${Date.now()}-${index}`,
              name: suggestion.name,
              description: suggestion.description,
              control_type: suggestion.control_type,
              target: suggestion.target,
              design_score: suggestion.design_score,
              implementation_score: suggestion.implementation_score,
              monitoring_score: suggestion.monitoring_score,
              evaluation_score: suggestion.evaluation_score,
              risk_id: riskId,
            });
            console.log(`Created AI control: ${suggestion.name}`);
          } catch (controlError) {
            console.error(`Failed to create control ${suggestion.name}:`, controlError);
            // Don't fail the whole operation if one control fails
          }
        });

        await Promise.all(controlCreationPromises);
        console.log('All AI controls created');
      }

      // Create manual controls (if any)
      if (riskId && manualControls.length > 0) {
        console.log(`Creating ${manualControls.length} manual controls for risk ${riskId}`);

        const manualControlPromises = manualControls.map(async (control, index) => {
          try {
            await createControl({
              control_code: `CTRL-MAN-${Date.now()}-${index}`,
              name: control.name,
              description: control.description,
              control_type: control.control_type,
              target: control.target,
              design_score: control.design_score,
              implementation_score: control.implementation_score,
              monitoring_score: control.monitoring_score,
              evaluation_score: control.evaluation_score,
              risk_id: riskId,
            });
            console.log(`Created manual control: ${control.name}`);
          } catch (controlError) {
            console.error(`Failed to create manual control ${control.name}:`, controlError);
          }
        });

        await Promise.all(manualControlPromises);
        console.log('All manual controls created');
      }

      // Success!
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Unexpected submit error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof CreateRiskData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedSubcategory(''); // Reset subcategory when category changes
  };

  const handleSubcategoryChange = (subcategoryName: string) => {
    setSelectedSubcategory(subcategoryName);
  };

  async function handleRefineWithAI() {
    if (!formData.risk_description.trim()) {
      setError('Please enter a risk description first');
      return;
    }

    if (!selectedCategory || !selectedSubcategory) {
      setError('Please select a category and subcategory first');
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const { data, error: refineError } = await refineRiskStatement(
        formData.risk_description,
        selectedCategory,
        selectedSubcategory
      );

      if (refineError) {
        setError(refineError.message);
      } else if (data) {
        setRefinement(data);
        setShowRefinement(true);
      }
    } catch (err) {
      console.error('Refinement error:', err);
      setError('Failed to refine statement');
    } finally {
      setIsRefining(false);
    }
  }

  function handleAcceptRefinement() {
    if (refinement) {
      // Keep refinement visible for submission
      setShowRefinement(true);
    }
  }

  function handleRejectRefinement() {
    setRefinement(null);
    setShowRefinement(false);
    setIsEditingRefinement(false);
    setEditedRefinedStatement('');
    setRevalidation(null);
  }

  function handleStartEditingRefinement() {
    if (refinement) {
      setIsEditingRefinement(true);
      setEditedRefinedStatement(refinement.refined_statement);
      setRevalidation(null); // Clear any previous revalidation
    }
  }

  function handleCancelEditingRefinement() {
    setIsEditingRefinement(false);
    setEditedRefinedStatement('');
    setRevalidation(null);
  }

  async function handleRevalidateEdit() {
    if (!editedRefinedStatement.trim()) {
      setError('Edited statement cannot be empty');
      return;
    }

    setIsRevalidating(true);
    setError(null);

    try {
      // Get full taxonomy for re-validation
      const { data: taxonomyData, error: taxonomyError } = await exportTaxonomy();
      if (taxonomyError || !taxonomyData) {
        setError('Failed to load taxonomy for validation');
        return;
      }

      const taxonomy = taxonomyData.map(row => ({
        category: row.category,
        subcategory: row.subcategory,
        category_description: row.category_description || '',
        subcategory_description: row.subcategory_description || '',
      }));

      const { data, error: revalidateError } = await revalidateEditedStatement(
        editedRefinedStatement,
        selectedCategory,
        selectedSubcategory,
        taxonomy
      );

      if (revalidateError) {
        setError(revalidateError.message);
      } else if (data) {
        setRevalidation(data);

        // Debug: Log the revalidation result
        console.log('Revalidation result:', {
          category_still_valid: data.category_still_valid,
          subcategory_still_valid: data.subcategory_still_valid,
          suggested_category: data.suggested_category,
          suggested_subcategory: data.suggested_subcategory,
          current_category: selectedCategory,
          current_subcategory: selectedSubcategory,
        });

        // Update category/subcategory if AI suggests change
        // Use React's flushSync to ensure subcategory is set AFTER category is fully updated
        if (!data.category_still_valid || !data.subcategory_still_valid) {
          console.log('Updating category/subcategory based on AI suggestion');

          // Update both category and subcategory together
          if (data.suggested_category && data.suggested_subcategory) {
            console.log('Setting category to:', data.suggested_category);
            console.log('Setting subcategory to:', data.suggested_subcategory);

            // First update the category
            setSelectedCategory(data.suggested_category);

            // Use setTimeout to ensure subcategory is set after category update is processed
            setTimeout(() => {
              setSelectedSubcategory(data.suggested_subcategory!);
              console.log('Subcategory updated via setTimeout');
            }, 0);
          }
        } else {
          console.log('Category and subcategory are still valid, no update needed');
        }

        // Update the refinement with the edited statement
        if (refinement) {
          setRefinement({
            ...refinement,
            refined_statement: data.final_statement,
          });
        }

        // Exit edit mode after successful revalidation
        setIsEditingRefinement(false);
      }
    } catch (err) {
      console.error('Revalidation error:', err);
      setError('Failed to revalidate statement');
    } finally {
      setIsRevalidating(false);
    }
  }

  // AI Control Suggestions Handlers
  async function handleGetAISuggestions() {
    if (!formData.risk_title || !formData.risk_description) {
      setAiSuggestionsError('Please fill in risk title and description first');
      return;
    }

    setLoadingAISuggestions(true);
    setAiSuggestionsError(null);
    setAiSuggestions([]);
    setSelectedSuggestions(new Set());

    try {
      const { data, error: aiError } = await getAIControlRecommendations(
        formData.risk_title,
        formData.risk_description,
        selectedCategory,
        formData.division,
        formData.likelihood_inherent,
        formData.impact_inherent
      );

      if (aiError) {
        setAiSuggestionsError(aiError.message);
        return;
      }

      if (!data || data.length === 0) {
        setAiSuggestionsError('No control suggestions generated. Please try again.');
        return;
      }

      setAiSuggestions(data);
      setShowAISuggestions(true);
      // Select all by default
      setSelectedSuggestions(new Set(data.map((_, i) => i)));
    } catch (err) {
      setAiSuggestionsError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
    } finally {
      setLoadingAISuggestions(false);
    }
  }

  function toggleSuggestion(index: number) {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  }

  // Custom library entry creation handlers
  async function handleSaveCustomRootCause() {
    if (!customRootCause.cause_code || !customRootCause.cause_name) {
      alert('Please fill in code and name');
      return;
    }

    setSavingCustom(true);
    try {
      const { data, error } = await createCustomRootCause(customRootCause);

      if (error) {
        alert(`Failed to create custom root cause: ${error.message}`);
        return;
      }

      if (data) {
        // Reload library list
        const { data: updatedRootCauses } = await getRootCauses();
        if (updatedRootCauses) {
          setRootCauses(updatedRootCauses);
          setSelectedRootCauseId(data.id);
        }

        // Reset form and close dialog
        setCustomRootCause({ cause_code: '', cause_name: '', cause_description: '', category: '' });
        setShowCustomRootCause(false);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingCustom(false);
    }
  }

  async function handleSaveCustomImpact() {
    if (!customImpact.impact_code || !customImpact.impact_name) {
      alert('Please fill in code and name');
      return;
    }

    setSavingCustom(true);
    try {
      const { data, error } = await createCustomImpact(customImpact);

      if (error) {
        alert(`Failed to create custom impact: ${error.message}`);
        return;
      }

      if (data) {
        // Reload library list
        const { data: updatedImpacts } = await getImpacts();
        if (updatedImpacts) {
          setImpacts(updatedImpacts);
          setSelectedImpactId(data.id);
        }

        // Reset form and close dialog
        setCustomImpact({ impact_code: '', impact_name: '', impact_description: '', category: '' });
        setShowCustomImpact(false);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingCustom(false);
    }
  }

  function calculateEffectiveness(control: AISuggestedControl): number {
    // Use single source of truth from src/lib/controls.ts
    const effectivenessFraction = calculateControlEffectiveness(
      control.design_score,
      control.implementation_score,
      control.monitoring_score,
      control.evaluation_score
    );
    // Convert from fraction (0-1) to percentage (0-100)
    return Math.round(effectivenessFraction * 100);
  }

  function updateAISuggestionDIME(
    index: number,
    field: 'design_score' | 'implementation_score' | 'monitoring_score' | 'evaluation_score',
    value: number
  ) {
    const updatedSuggestions = [...aiSuggestions];
    updatedSuggestions[index] = {
      ...updatedSuggestions[index],
      [field]: value as 0 | 1 | 2 | 3,
    };
    setAiSuggestions(updatedSuggestions);
  }

  // Calculate residual risk based on all controls (existing + manual + selected AI)
  function calculateResidualRisk(): {
    residual_likelihood: number;
    residual_impact: number;
    residual_score: number;
  } {
    const inherentLikelihood = formData.likelihood_inherent;
    const inherentImpact = formData.impact_inherent;

    // Collect all controls (existing from DB + manual + selected AI)
    const allControls: Array<{
      target: 'Likelihood' | 'Impact';
      design_score: number | null;
      implementation_score: number | null;
      monitoring_score: number | null;
      evaluation_score: number | null;
    }> = [];

    // Add existing controls from database
    allControls.push(...existingControls);

    // Add manual controls
    allControls.push(...manualControls);

    // Add selected AI suggestions
    selectedSuggestions.forEach((index) => {
      const suggestion = aiSuggestions[index];
      if (suggestion) {
        allControls.push(suggestion);
      }
    });

    // Find MAX effectiveness for Likelihood controls
    let maxLikelihoodEffectiveness = 0;
    // Find MAX effectiveness for Impact controls
    let maxImpactEffectiveness = 0;

    for (const control of allControls) {
      // Use single source of truth from src/lib/controls.ts
      const effectiveness = calculateControlEffectiveness(
        control.design_score,
        control.implementation_score,
        control.monitoring_score,
        control.evaluation_score
      );

      // Skip controls with 0 effectiveness
      if (effectiveness === 0) {
        continue;
      }

      // Track maximum effectiveness per target
      if (control.target === 'Likelihood') {
        maxLikelihoodEffectiveness = Math.max(maxLikelihoodEffectiveness, effectiveness);
      } else if (control.target === 'Impact') {
        maxImpactEffectiveness = Math.max(maxImpactEffectiveness, effectiveness);
      }
    }

    // Apply DIME framework formula:
    // residual = GREATEST(1, inherent - ROUND((inherent - 1) * max_effectiveness))
    const residualLikelihood = Math.max(
      1,
      inherentLikelihood - Math.round((inherentLikelihood - 1) * maxLikelihoodEffectiveness)
    );

    const residualImpact = Math.max(
      1,
      inherentImpact - Math.round((inherentImpact - 1) * maxImpactEffectiveness)
    );

    const residualScore = residualLikelihood * residualImpact;

    return {
      residual_likelihood: residualLikelihood,
      residual_impact: residualImpact,
      residual_score: residualScore,
    };
  }

  // Manual Control Handlers
  function handleAddManualControl() {
    if (!manualControl.name || !manualControl.description) {
      setError('Control name and description are required');
      return;
    }

    setManualControls([...manualControls, manualControl]);

    // Reset form
    setManualControl({
      name: '',
      description: '',
      control_type: 'preventive',
      target: 'Likelihood',
      design_score: 2,
      implementation_score: 2,
      monitoring_score: 2,
      evaluation_score: 2,
    });
    setShowManualControl(false);
  }

  function handleRemoveManualControl(index: number) {
    setManualControls(manualControls.filter((_, i) => i !== index));
  }

  function calculateManualEffectiveness(control: typeof manualControl): number {
    // DIME Framework Rule: If Design = 0 OR Implementation = 0, effectiveness = 0
    if (control.design_score === 0 || control.implementation_score === 0) {
      return 0;
    }

    return Math.round(
      ((control.design_score +
        control.implementation_score +
        control.monitoring_score +
        control.evaluation_score) /
        12) *
      100
    );
  }

  // Get filtered subcategories based on selected category
  const filteredSubcategories = selectedCategory
    ? categories.find((cat) => cat.name === selectedCategory)?.subcategories || []
    : [];

  // Filter root causes and impacts based on search
  const filteredRootCauses = rootCauses.filter((rc) =>
    rootCauseSearch.trim() === ''
      ? true
      : rc.cause_code.toLowerCase().includes(rootCauseSearch.toLowerCase()) ||
      rc.cause_name.toLowerCase().includes(rootCauseSearch.toLowerCase()) ||
      (rc.cause_description && rc.cause_description.toLowerCase().includes(rootCauseSearch.toLowerCase()))
  );

  const filteredImpacts = impacts.filter((imp) =>
    impactSearch.trim() === ''
      ? true
      : imp.impact_code.toLowerCase().includes(impactSearch.toLowerCase()) ||
      imp.impact_name.toLowerCase().includes(impactSearch.toLowerCase()) ||
      (imp.impact_description && imp.impact_description.toLowerCase().includes(impactSearch.toLowerCase()))
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRisk ? 'Edit Risk' : 'Add New Risk'}
            </DialogTitle>
            <DialogDescription>
              {editingRisk
                ? 'Update the risk information below.'
                : 'Fill in the details to create a new risk. You can optionally use AI to refine your risk statement.'}
            </DialogDescription>
          </DialogHeader>

          {/* Read-Only Mode Banner */}
          {readOnly && editingRisk && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Read-only view.</strong> Owner: <strong>{editingRisk.owner_email || 'Unassigned'}</strong>.
                Only the risk owner or administrators can edit this risk.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit}
            className={`space-y-4 ${readOnly ? 'pointer-events-none opacity-70' : ''}`}
          >
            {/* Risk Code - only show when editing (read-only) */}
            {editingRisk && (
              <div className="space-y-2">
                <Label htmlFor="risk_code">Risk Code</Label>
                <Input
                  id="risk_code"
                  value={formData.risk_code || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Risk codes cannot be changed</p>
              </div>
            )}

            {/* Show auto-generation info when creating new risk */}
            {!editingRisk && (
              <Alert>
                <AlertDescription>
                  Risk code will be auto-generated (e.g., STR-001, FIN-002)
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Risk Owner *</Label>
                <Select
                  value={selectedOwnerId}
                  onValueChange={(userId) => {
                    setSelectedOwnerId(userId);
                    // Find the selected user
                    const selectedUser = orgUsers.find(u => u.id === userId);
                    if (selectedUser) {
                      // Update both owner (display name) and owner_id (UUID)
                      handleChange('owner', selectedUser.full_name);
                      setFormData(prev => ({
                        ...prev,
                        owner_id: userId,
                      }));
                    }
                  }}
                  disabled={loading || loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select risk owner"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orgUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orgUsers.length === 0 && !loadingUsers && (
                  <p className="text-xs text-gray-500">No users available</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk_title">Risk Title *</Label>
              <Input
                id="risk_title"
                value={formData.risk_title}
                onChange={(e) => handleChange('risk_title', e.target.value)}
                placeholder="e.g., Cybersecurity Breach"
                required
                disabled={loading}
              />
            </div>

            {/* EVENT TEXT (Free text describing what's happening) */}
            <div className="space-y-2">
              <Label htmlFor="event_text">Event / Situation (Optional)</Label>
              <Textarea
                id="event_text"
                value={formData.event_text || ''}
                onChange={(e) => handleChange('event_text', e.target.value)}
                placeholder="Describe the observable event or situation (e.g., 'An employee clicks on a phishing email link')"
                rows={3}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Describe what is happening. This will be combined with root cause and impact to create a structured risk statement.
              </p>
            </div>

            {/* ROOT CAUSE AND IMPACT DROPDOWNS (from global libraries) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="root_cause">Root Cause (Optional)</Label>
                  {/* Admin-only: Add custom root causes */}
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomRootCause(true)}
                      className="h-7 text-xs"
                      disabled={loading}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Custom
                    </Button>
                  )}
                </div>
                {loadingLibraries ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading root causes...
                  </div>
                ) : (
                  <Select
                    value={selectedRootCauseId}
                    onValueChange={setSelectedRootCauseId}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select root cause" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      <div className="p-2 border-b sticky top-0 bg-white">
                        <Input
                          placeholder="Search root causes..."
                          value={rootCauseSearch}
                          onChange={(e) => setRootCauseSearch(e.target.value)}
                          className="h-8"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {filteredRootCauses.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No root causes found matching "{rootCauseSearch}"
                          </div>
                        ) : (
                          filteredRootCauses.map((rc) => (
                            <SelectItem key={rc.id} value={rc.id}>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-gray-500">{rc.cause_code}</span>
                                  <span className="font-medium">{rc.cause_name}</span>
                                  {rc.source === 'global' && (
                                    <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">Global</span>
                                  )}
                                </div>
                                {rc.cause_description && (
                                  <span className="text-xs text-gray-500">{rc.cause_description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                )}
                {selectedRootCauseId && (
                  <p className="text-xs text-gray-500">
                    {rootCauses.find((rc) => rc.id === selectedRootCauseId)?.cause_description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="impact">Impact (Optional)</Label>
                  {/* Admin-only: Add custom impacts */}
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomImpact(true)}
                      className="h-7 text-xs"
                      disabled={loading}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Custom
                    </Button>
                  )}
                </div>
                {loadingLibraries ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading impacts...
                  </div>
                ) : (
                  <Select
                    value={selectedImpactId}
                    onValueChange={setSelectedImpactId}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select impact" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      <div className="p-2 border-b sticky top-0 bg-white">
                        <Input
                          placeholder="Search impacts..."
                          value={impactSearch}
                          onChange={(e) => setImpactSearch(e.target.value)}
                          className="h-8"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {filteredImpacts.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No impacts found matching "{impactSearch}"
                          </div>
                        ) : (
                          filteredImpacts.map((imp) => (
                            <SelectItem key={imp.id} value={imp.id}>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-gray-500">{imp.impact_code}</span>
                                  <span className="font-medium">{imp.impact_name}</span>
                                  {imp.source === 'global' && (
                                    <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">Global</span>
                                  )}
                                </div>
                                {imp.impact_description && (
                                  <span className="text-xs text-gray-500">{imp.impact_description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                )}
                {selectedImpactId && (
                  <p className="text-xs text-gray-500">
                    {impacts.find((imp) => imp.id === selectedImpactId)?.impact_description}
                  </p>
                )}
              </div>
            </div>

            {/* TAXONOMY DROPDOWNS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Risk Category *</Label>
                {loadingTaxonomy ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : (
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCategory && (
                  <p className="text-xs text-gray-500">
                    {categories.find((c) => c.name === selectedCategory)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Risk Sub-Category *</Label>
                <Select
                  value={selectedSubcategory}
                  onValueChange={handleSubcategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCategory ? "Select sub-category" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((subcat) => (
                      <SelectItem key={subcat.id} value={subcat.name}>
                        {subcat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSubcategory && (
                  <p className="text-xs text-gray-500">
                    {filteredSubcategories.find((s) => s.name === selectedSubcategory)?.description}
                  </p>
                )}
              </div>
            </div>

            {/* RISK DESCRIPTION WITH AI REFINEMENT */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="risk_description">Risk Statement *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefineWithAI}
                  disabled={isRefining || loading || !formData.risk_description.trim() || !selectedCategory || !selectedSubcategory}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  {isRefining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Fine-tune with AI
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="risk_description"
                value={formData.risk_description}
                onChange={(e) => handleChange('risk_description', e.target.value)}
                placeholder="Describe the risk in your own words... (AI can help refine this)"
                rows={4}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Write your risk statement naturally, then optionally click "Fine-tune with AI" to improve it
              </p>
            </div>

            {/* AI REFINEMENT SUGGESTION */}
            {refinement && showRefinement && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-sm text-green-900">
                        AI-Refined Statement
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditingRefinement && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleStartEditingRefinement}
                          title="Edit refined statement"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRejectRefinement}
                        title="Reject and use original"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Display Mode */}
                  {!isEditingRefinement && (
                    <>
                      <div className="bg-white p-3 rounded border border-green-200">
                        <p className="text-sm text-gray-900">{refinement.refined_statement}</p>
                      </div>
                      <div className="text-xs text-green-800">
                        <strong>What was improved:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {refinement.improvements_made.map((improvement, idx) => (
                            <li key={idx}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-xs text-green-700 italic">
                        {refinement.explanation}
                      </div>
                      <Alert className="bg-green-100 border-green-300">
                        <AlertDescription className="text-green-900 text-xs">
                          This refined version will be saved when you submit the form. Click the edit icon to make changes, or X to use your original version.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}

                  {/* Edit Mode */}
                  {isEditingRefinement && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="edited-refinement">Edit Refined Statement</Label>
                        <Textarea
                          id="edited-refinement"
                          value={editedRefinedStatement}
                          onChange={(e) => setEditedRefinedStatement(e.target.value)}
                          rows={4}
                          className="bg-white"
                          placeholder="Edit the AI-refined statement..."
                        />
                        <p className="text-xs text-gray-600">
                          Edit the statement as needed. Click "Revalidate" to check if the category/subcategory still fit.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleRevalidateEdit}
                          disabled={isRevalidating || !editedRefinedStatement.trim()}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isRevalidating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Revalidating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Revalidate Category
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEditingRefinement}
                          disabled={isRevalidating}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Revalidation Results */}
                  {revalidation && !isEditingRefinement && (
                    <Alert className={revalidation.category_still_valid && revalidation.subcategory_still_valid ? "bg-blue-50 border-blue-300" : "bg-yellow-50 border-yellow-300"}>
                      <div className="flex items-start gap-2">
                        {revalidation.category_still_valid && revalidation.subcategory_still_valid ? (
                          <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <AlertDescription className="text-xs space-y-2">
                            <p className="font-semibold">
                              {revalidation.category_still_valid && revalidation.subcategory_still_valid
                                ? '✓ Category and Subcategory Validated'
                                : '⚠ Category/Subcategory Changed'}
                            </p>
                            <p>{revalidation.explanation}</p>
                            {(!revalidation.category_still_valid || !revalidation.subcategory_still_valid) && (
                              <div className="mt-2 p-2 bg-white rounded border">
                                <p className="font-semibold text-gray-900">Updated Classification:</p>
                                <p className="text-gray-700">
                                  Category: <strong>{revalidation.suggested_category}</strong>
                                </p>
                                <p className="text-gray-700">
                                  Sub-category: <strong>{revalidation.suggested_subcategory}</strong>
                                </p>
                                <p className="text-gray-600 text-xs mt-1">
                                  (The dropdowns above have been updated automatically)
                                </p>
                              </div>
                            )}
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="division">Division *</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) => handleChange('division', value)}
                  disabled={loading || !orgConfig?.divisions?.length}
                >
                  <SelectTrigger id="division">
                    <SelectValue placeholder={orgConfig?.divisions?.length ? "Select division" : "No divisions configured"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orgConfig?.divisions?.filter(d => d && d.trim()).map((division) => (
                      <SelectItem key={division} value={division}>
                        {division}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!orgConfig?.divisions || orgConfig.divisions.length === 0) && (
                  <p className="text-sm text-amber-600">No divisions configured. Please configure in Admin panel.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => handleChange('department', value)}
                  disabled={loading || !orgConfig?.departments?.length}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder={orgConfig?.departments?.length ? "Select department" : "No departments configured"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orgConfig?.departments?.filter(d => d && d.trim()).map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!orgConfig?.departments || orgConfig.departments.length === 0) && (
                  <p className="text-sm text-amber-600">No departments configured. Please configure in Admin panel.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="flex items-center space-x-2 h-10">
                  <input
                    type="checkbox"
                    id="is_priority"
                    checked={formData.is_priority}
                    onChange={(e) => handleChange('is_priority', e.target.checked)}
                    disabled={loading}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_priority" className="text-sm font-normal cursor-pointer">
                    Priority Risk
                  </Label>
                </div>
              </div>
            </div>

            {/* Active Intelligence Advisory Memo */}
            {intelligenceAlerts.filter(a => a.applied_to_risk).length > 0 && (
              <Card className="border-purple-200 bg-purple-50 mb-6">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-sm text-purple-900">
                      Active Intelligence Advice
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-white/80 border-purple-200 mb-3">
                    <Info className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-800 text-xs">
                      You have acknowledged the following intelligence alerts.
                      Consider updating the Inherent Risk scores based on this advice.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    {intelligenceAlerts.filter(a => a.applied_to_risk).map(alert => (
                      <div key={alert.id} className="text-sm border-l-2 border-purple-400 pl-3 py-1">
                        <div className="font-medium text-purple-900">{alert.external_events?.title}</div>
                        <div className="text-xs text-purple-700 flex gap-2 mt-1">
                          {/* Show suggestions if non-zero */}
                          {(alert.suggested_likelihood_change !== 0 || alert.impact_change !== 0) ? (
                            <>
                              {alert.suggested_likelihood_change !== 0 && (
                                <span className={alert.suggested_likelihood_change > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                  Likelihood: {alert.suggested_likelihood_change > 0 ? '+' : ''}{alert.suggested_likelihood_change}
                                </span>
                              )}
                              {alert.impact_change !== 0 && (
                                <span className={alert.impact_change > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                  Impact: {alert.impact_change > 0 ? '+' : ''}{alert.impact_change}
                                </span>
                              )}
                            </>
                          ) : (
                            <span>No score change suggested</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="likelihood_inherent">
                  Inherent Likelihood *
                </Label>
                <Select
                  value={formData.likelihood_inherent.toString()}
                  onValueChange={(value) =>
                    handleChange('likelihood_inherent', parseInt(value))
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="likelihood_inherent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getLikelihoodOptions(orgConfig).map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="impact_inherent">
                  Inherent Impact *
                </Label>
                <Select
                  value={formData.impact_inherent.toString()}
                  onValueChange={(value) =>
                    handleChange('impact_inherent', parseInt(value))
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="impact_inherent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getImpactOptions(orgConfig).map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* === CONTROLS SECTION === */}
            <div className="space-y-4 pt-6 border-t mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Controls (Optional)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Add controls to mitigate this risk
                  </p>
                </div>

                <div className="flex gap-2">
                  {!showManualControl && !showAISuggestions && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setShowManualControl(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Control
                    </Button>
                  )}

                  {!showAISuggestions && !showManualControl && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50"
                      onClick={handleGetAISuggestions}
                      disabled={loadingAISuggestions}
                    >
                      {loadingAISuggestions ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Getting Suggestions...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Get AI Suggestions
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Manual Control Form */}
              {showManualControl && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Add Control Manually</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowManualControl(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Control Name *</Label>
                      <Input
                        value={manualControl.name}
                        onChange={(e) =>
                          setManualControl({ ...manualControl, name: e.target.value })
                        }
                        placeholder="e.g., Multi-Factor Authentication"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Control Description *</Label>
                      <Textarea
                        value={manualControl.description}
                        onChange={(e) =>
                          setManualControl({ ...manualControl, description: e.target.value })
                        }
                        placeholder="Describe how this control works..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Control Type</Label>
                        <Select
                          value={manualControl.control_type}
                          onValueChange={(value: 'preventive' | 'detective' | 'corrective') =>
                            setManualControl({ ...manualControl, control_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preventive">Preventive</SelectItem>
                            <SelectItem value="detective">Detective</SelectItem>
                            <SelectItem value="corrective">Corrective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Target</Label>
                        <Select
                          value={manualControl.target}
                          onValueChange={(value: 'Likelihood' | 'Impact') =>
                            setManualControl({ ...manualControl, target: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Likelihood">Likelihood</SelectItem>
                            <SelectItem value="Impact">Impact</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>DIME Scores (0-3)</Label>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Design</Label>
                          <Select
                            value={manualControl.design_score.toString()}
                            onValueChange={(value) =>
                              setManualControl({ ...manualControl, design_score: parseInt(value) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0 - Not designed</SelectItem>
                              <SelectItem value="1">1 - Poorly designed</SelectItem>
                              <SelectItem value="2">2 - Partially designed</SelectItem>
                              <SelectItem value="3">3 - Well designed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Implementation</Label>
                          <Select
                            value={manualControl.implementation_score.toString()}
                            onValueChange={(value) =>
                              setManualControl({
                                ...manualControl,
                                implementation_score: parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0 - Not applied</SelectItem>
                              <SelectItem value="1">1 - Sometimes applied</SelectItem>
                              <SelectItem value="2">2 - Generally oper~</SelectItem>
                              <SelectItem value="3">3 - Always applied</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Monitoring</Label>
                          <Select
                            value={manualControl.monitoring_score.toString()}
                            onValueChange={(value) =>
                              setManualControl({ ...manualControl, monitoring_score: parseInt(value) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0 - Not monitored</SelectItem>
                              <SelectItem value="1">1 - Ad-hoc monito~</SelectItem>
                              <SelectItem value="2">2 - Usually monitored</SelectItem>
                              <SelectItem value="3">3 - Always monitored</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Evaluation</Label>
                          <Select
                            value={manualControl.evaluation_score.toString()}
                            onValueChange={(value) =>
                              setManualControl({ ...manualControl, evaluation_score: parseInt(value) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0 - Never evaluated</SelectItem>
                              <SelectItem value="1">1 - Infrequently eval~</SelectItem>
                              <SelectItem value="2">2 - Occasionally eval~</SelectItem>
                              <SelectItem value="3">3 - Regularly evaluated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowManualControl(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={handleAddManualControl}>
                        Add Control
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Display Added Manual Controls */}
              {manualControls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Manual Controls ({manualControls.length})
                  </p>
                  {manualControls.map((control, index) => (
                    <Card key={index} className="border-blue-200 bg-blue-50/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{control.name}</CardTitle>
                            <div className="flex gap-2 mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded ${control.control_type === 'preventive'
                                  ? 'bg-blue-100 text-blue-700'
                                  : control.control_type === 'detective'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                  }`}
                              >
                                {control.control_type.charAt(0).toUpperCase() +
                                  control.control_type.slice(1)}
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                                {control.target}
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                                {calculateManualEffectiveness(control)}% Effective
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveManualControl(index)}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-700 mb-3">{control.description}</p>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="font-medium">D:</span> {control.design_score}
                          </div>
                          <div>
                            <span className="font-medium">I:</span> {control.implementation_score}
                          </div>
                          <div>
                            <span className="font-medium">M:</span> {control.monitoring_score}
                          </div>
                          <div>
                            <span className="font-medium">E:</span> {control.evaluation_score}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* AI Suggestions Error */}
              {aiSuggestionsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{aiSuggestionsError}</AlertDescription>
                </Alert>
              )}

              {/* AI Suggestions Display */}
              {showAISuggestions && aiSuggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">
                      AI suggested {aiSuggestions.length} controls. Select the ones you want to create:
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGetAISuggestions}
                      disabled={loadingAISuggestions}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Regenerate
                    </Button>
                  </div>

                  {aiSuggestions.map((suggestion, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all ${selectedSuggestions.has(index)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => toggleSuggestion(index)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div
                              className={`mt-1 flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${selectedSuggestions.has(index)
                                ? 'bg-green-600 border-green-600'
                                : 'border-gray-300'
                                }`}
                            >
                              {selectedSuggestions.has(index) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                {suggestion.name}
                              </CardTitle>
                              <div className="flex gap-2 mt-2">
                                <span
                                  className={`text-xs px-2 py-1 rounded ${suggestion.control_type === 'preventive'
                                    ? 'bg-blue-100 text-blue-700'
                                    : suggestion.control_type === 'detective'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                    }`}
                                >
                                  {suggestion.control_type.charAt(0).toUpperCase() +
                                    suggestion.control_type.slice(1)}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                                  {suggestion.target}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                                  {calculateEffectiveness(suggestion)}% Effective
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm text-gray-700 mb-3">
                          {suggestion.description}
                        </p>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-600">DIME Scores (Click to edit):</Label>
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <Label className="text-xs">Design</Label>
                              <Select
                                value={suggestion.design_score.toString()}
                                onValueChange={(value) =>
                                  updateAISuggestionDIME(index, 'design_score', parseInt(value))
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0 - Not designed</SelectItem>
                                  <SelectItem value="1">1 - Poorly designed</SelectItem>
                                  <SelectItem value="2">2 - Partially designed</SelectItem>
                                  <SelectItem value="3">3 - Well designed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Implement</Label>
                              <Select
                                value={suggestion.implementation_score.toString()}
                                onValueChange={(value) =>
                                  updateAISuggestionDIME(index, 'implementation_score', parseInt(value))
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0 - Not applied</SelectItem>
                                  <SelectItem value="1">1 - Sometimes applied</SelectItem>
                                  <SelectItem value="2">2 - Generally oper~</SelectItem>
                                  <SelectItem value="3">3 - Always applied</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Monitor</Label>
                              <Select
                                value={suggestion.monitoring_score.toString()}
                                onValueChange={(value) =>
                                  updateAISuggestionDIME(index, 'monitoring_score', parseInt(value))
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0 - Not monitored</SelectItem>
                                  <SelectItem value="1">1 - Ad-hoc monito~</SelectItem>
                                  <SelectItem value="2">2 - Usually monitored</SelectItem>
                                  <SelectItem value="3">3 - Always monitored</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Evaluate</Label>
                              <Select
                                value={suggestion.evaluation_score.toString()}
                                onValueChange={(value) =>
                                  updateAISuggestionDIME(index, 'evaluation_score', parseInt(value))
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0 - Never evaluated</SelectItem>
                                  <SelectItem value="1">1 - Infrequently eval~</SelectItem>
                                  <SelectItem value="2">2 - Occasionally eval~</SelectItem>
                                  <SelectItem value="3">3 - Regularly evaluated</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-3 italic">
                          {suggestion.rationale}
                        </p>
                      </CardContent>
                    </Card>
                  ))}

                  {selectedSuggestions.size === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No controls selected. Click on suggestions above to select them.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* Residual Risk Calculation - ALWAYS VISIBLE */}
            <Card className="border-indigo-200 bg-indigo-50 mt-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-indigo-600" />
                  Residual Risk (Post-Controls)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const residual = calculateResidualRisk();
                  const inherent = formData.likelihood_inherent * formData.impact_inherent;
                  const totalControls = existingControls.length + manualControls.length + selectedSuggestions.size;
                  const reduction = inherent > 0
                    ? Math.round(((inherent - residual.residual_score) / inherent) * 100)
                    : 0;

                  return (
                    <div className="space-y-4">
                      {/* Warning when no controls exist */}
                      {totalControls === 0 && (
                        <Alert className="border-amber-300 bg-amber-50">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800">
                            <strong>No controls are currently linked to this risk.</strong>
                            <br />
                            Residual risk equals inherent risk until controls are applied.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-indigo-200">
                          <p className="text-xs text-gray-600 mb-1">Inherent Risk</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formData.likelihood_inherent} × {formData.impact_inherent} = {inherent}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-indigo-200">
                          <p className="text-xs text-gray-600 mb-1">Residual Risk</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {residual.residual_likelihood} × {residual.residual_impact} ={' '}
                            {residual.residual_score}
                          </p>
                        </div>
                        <div className={`bg-white p-4 rounded-lg border ${totalControls === 0 ? 'border-gray-200' : 'border-green-200'}`}>
                          <p className="text-xs text-gray-600 mb-1">Risk Reduction</p>
                          <p className={`text-2xl font-bold ${totalControls === 0 ? 'text-gray-400' : 'text-green-600'}`}>
                            {reduction}%
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-indigo-200">
                        <p className="text-xs text-gray-700 mb-2">
                          <strong>DIME Framework Calculation:</strong>
                        </p>
                        {totalControls > 0 ? (
                          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                            <li>
                              Control Effectiveness = (Design + Implementation + Monitoring + Evaluation) /
                              12
                            </li>
                            <li>
                              Using <strong>maximum</strong> effectiveness from controls targeting each
                              dimension
                            </li>
                            <li>
                              Residual = MAX(1, Inherent - ROUND((Inherent - 1) × Max Effectiveness))
                            </li>
                            <li>
                              Total Controls: {totalControls} (
                              {existingControls.length} existing + {manualControls.length} manual + {selectedSuggestions.size} AI)
                            </li>
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-600">
                            No controls applied. DIME effectiveness = 0. Residual risk unchanged from inherent risk.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Existing Controls Section - Only show when editing */}
            {editingRisk && (
              <Card className="border-blue-200 bg-blue-50 mt-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Existing Controls ({existingControls.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingControls ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-sm text-gray-600">Loading controls...</span>
                    </div>
                  ) : existingControls.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-600">No controls have been applied to this risk yet.</p>
                      <p className="text-xs text-gray-500 mt-2">Go to the Controls tab to add controls for this risk.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {existingControls.map((control) => {
                        // Use single source of truth from src/lib/controls.ts
                        const effectivenessFraction = calculateControlEffectiveness(
                          control.design_score,
                          control.implementation_score,
                          control.monitoring_score,
                          control.evaluation_score
                        );
                        const effectiveness = Math.round(effectivenessFraction * 100);

                        // Calculate average for display purposes only (not used in residual calc)
                        const d = control.design_score ?? 0;
                        const i = control.implementation_score ?? 0;
                        const m = control.monitoring_score ?? 0;
                        const e = control.evaluation_score ?? 0;
                        const avgDIME = ((d + i + m + e) / 4).toFixed(2);

                        const isEditing = editingControlId === control.id;

                        return (
                          <Card key={control.id} className="bg-white border border-blue-200">
                            <CardContent className="pt-4">
                              {isEditing && editingControlData ? (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="font-mono text-xs font-semibold text-gray-600">
                                      {control.control_code}
                                    </span>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleSaveControl(control.id)}
                                        disabled={updatingControl}
                                      >
                                        {updatingControl ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Check className="h-3 w-3 mr-1" />
                                            Save
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEditControl}
                                        disabled={updatingControl}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Control Name</Label>
                                      <Input
                                        value={editingControlData.name || ''}
                                        onChange={(e) =>
                                          setEditingControlData({ ...editingControlData, name: e.target.value })
                                        }
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Control Type</Label>
                                      <Select
                                        value={editingControlData.control_type || 'preventive'}
                                        onValueChange={(value) =>
                                          setEditingControlData({
                                            ...editingControlData,
                                            control_type: value as 'preventive' | 'detective' | 'corrective',
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-8 text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="preventive">Preventive</SelectItem>
                                          <SelectItem value="detective">Detective</SelectItem>
                                          <SelectItem value="corrective">Corrective</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-xs">Description</Label>
                                    <Textarea
                                      value={editingControlData.description || ''}
                                      onChange={(e) =>
                                        setEditingControlData({
                                          ...editingControlData,
                                          description: e.target.value,
                                        })
                                      }
                                      className="text-sm h-16"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs">Target</Label>
                                    <Select
                                      value={editingControlData.target || 'Likelihood'}
                                      onValueChange={(value) =>
                                        setEditingControlData({
                                          ...editingControlData,
                                          target: value as 'Likelihood' | 'Impact',
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Likelihood">Likelihood</SelectItem>
                                        <SelectItem value="Impact">Impact</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="border-t pt-3">
                                    <p className="text-xs font-semibold text-gray-700 mb-3">DIME Scores (0-3)</p>
                                    <div className="grid grid-cols-4 gap-3">
                                      <div>
                                        <Label className="text-xs">Design</Label>
                                        <Select
                                          value={String(editingControlData.design_score ?? 0)}
                                          onValueChange={(value) =>
                                            setEditingControlData({
                                              ...editingControlData,
                                              design_score: parseInt(value) as 0 | 1 | 2 | 3,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="0">0 - Not designed</SelectItem>
                                            <SelectItem value="1">1 - Poorly designed</SelectItem>
                                            <SelectItem value="2">2 - Partially designed</SelectItem>
                                            <SelectItem value="3">3 - Well designed</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Implementation</Label>
                                        <Select
                                          value={String(editingControlData.implementation_score ?? 0)}
                                          onValueChange={(value) =>
                                            setEditingControlData({
                                              ...editingControlData,
                                              implementation_score: parseInt(value) as 0 | 1 | 2 | 3,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="0">0 - Not applied</SelectItem>
                                            <SelectItem value="1">1 - Sometimes applied</SelectItem>
                                            <SelectItem value="2">2 - Generally operational</SelectItem>
                                            <SelectItem value="3">3 - Always applied</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Monitoring</Label>
                                        <Select
                                          value={String(editingControlData.monitoring_score ?? 0)}
                                          onValueChange={(value) =>
                                            setEditingControlData({
                                              ...editingControlData,
                                              monitoring_score: parseInt(value) as 0 | 1 | 2 | 3,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="0">0 - Not monitored</SelectItem>
                                            <SelectItem value="1">1 - Ad-hoc monitoring</SelectItem>
                                            <SelectItem value="2">2 - Usually monitored</SelectItem>
                                            <SelectItem value="3">3 - Always monitored</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Evaluation</Label>
                                        <Select
                                          value={String(editingControlData.evaluation_score ?? 0)}
                                          onValueChange={(value) =>
                                            setEditingControlData({
                                              ...editingControlData,
                                              evaluation_score: parseInt(value) as 0 | 1 | 2 | 3,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="0">0 - Never evaluated</SelectItem>
                                            <SelectItem value="1">1 - Infrequently evaluated</SelectItem>
                                            <SelectItem value="2">2 - Occasionally evaluated</SelectItem>
                                            <SelectItem value="3">3 - Regularly evaluated</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {/* Control Header */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-semibold text-gray-600">
                                          {control.control_code}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                                          {control.control_type || 'N/A'}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${control.target === 'Likelihood'
                                          ? 'bg-purple-100 text-purple-700'
                                          : 'bg-orange-100 text-orange-700'
                                          }`}>
                                          ↓ {control.target}
                                        </span>
                                      </div>
                                      <h4 className="font-semibold text-sm text-gray-900 mt-1">{control.name}</h4>
                                      {control.description && (
                                        <p className="text-xs text-gray-600 mt-1">{control.description}</p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleStartEditControl(control)}
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Edit
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleDeleteControl(control.id, control.name)}
                                          disabled={deletingControlId === control.id}
                                        >
                                          {deletingControlId === control.id ? (
                                            <>
                                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                              Deleting...
                                            </>
                                          ) : (
                                            <>
                                              <Trash2 className="h-3 w-3 mr-1" />
                                              Delete
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Effectiveness</p>
                                        <p className="text-lg font-bold text-blue-600">{effectiveness}%</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* DIME Scores Grid */}
                                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200">
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500 mb-1">Design</p>
                                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${(control.design_score || 0) >= 2
                                        ? 'bg-green-100 text-green-700'
                                        : (control.design_score || 0) === 1
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                        }`}>
                                        {control.design_score ?? '-'}
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500 mb-1">Implement</p>
                                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${(control.implementation_score || 0) >= 2
                                        ? 'bg-green-100 text-green-700'
                                        : (control.implementation_score || 0) === 1
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                        }`}>
                                        {control.implementation_score ?? '-'}
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500 mb-1">Monitor</p>
                                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${(control.monitoring_score || 0) >= 2
                                        ? 'bg-green-100 text-green-700'
                                        : (control.monitoring_score || 0) === 1
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                        }`}>
                                        {control.monitoring_score ?? '-'}
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500 mb-1">Evaluate</p>
                                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${(control.evaluation_score || 0) >= 2
                                        ? 'bg-green-100 text-green-700'
                                        : (control.evaluation_score || 0) === 1
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                        }`}>
                                        {control.evaluation_score ?? '-'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* DIME Legend */}
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs text-gray-500">
                                      DIME Average: <span className="font-semibold text-gray-700">{avgDIME}</span> / 3.0
                                      <span className="ml-2 text-gray-400">•</span>
                                      <span className="ml-2">
                                        Scale: 0-3 (dimension-specific criteria)
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Intelligence Advisory Section - Only show when editing */}
            {editingRisk && (
              <Card className="border-purple-200 bg-purple-50 mt-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Intelligence Advisory ({intelligenceAlerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAlerts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                      <span className="ml-2 text-sm text-gray-600">Loading intelligence advisory...</span>
                    </div>
                  ) : intelligenceAlerts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-600">No active intelligence advice for this risk.</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Relevant external events will appear here as advisory memos to help guide manual risk updates.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Alert className="border-blue-200 bg-blue-100/50 mb-4">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 text-xs">
                          <strong>Advisory Mode:</strong> The alerts below are AI-generated memos based on external events.
                          Acknowledging them does <u>not</u> automatically change scores. Please review the advice and update Impact/Likelihood manually if needed.
                        </AlertDescription>
                      </Alert>

                      {intelligenceAlerts.map((alert) => {
                        const event = alert.external_events;
                        const isExpanded = expandedAlertId === alert.id;

                        // Status badge styling
                        const statusColors = {
                          pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                          accepted: 'bg-green-100 text-green-700 border-green-300',
                          rejected: 'bg-red-100 text-red-700 border-red-300',
                          expired: 'bg-gray-100 text-gray-700 border-gray-300',
                        };

                        return (
                          <Card key={alert.id} className="bg-white border border-purple-200 shadow-sm">
                            <CardContent className="pt-4">
                              {/* Header row */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${statusColors[alert.status]
                                        }`}
                                    >
                                      {alert.status.toUpperCase()}
                                    </span>
                                    {alert.applied_to_risk && (
                                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Acknowledged
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      Confidence: {alert.confidence_score}%
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-900">{event.title}</h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Source: {event.source} • {event.event_type} • {new Date(event.published_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                                  className="ml-2"
                                >
                                  {isExpanded ? (
                                    <>
                                      <AlertTriangle className="h-4 w-4 mr-1" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      Show Details
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* Change indicators */}
                              {(alert.likelihood_change !== null && alert.likelihood_change !== 0) ||
                                (alert.impact_change !== null && alert.impact_change !== 0) ? (
                                <div className="flex gap-3 mb-3">
                                  {alert.likelihood_change !== null && alert.likelihood_change !== 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-600">Likelihood:</span>
                                      <span
                                        className={`px-2 py-0.5 text-xs font-semibold rounded ${alert.likelihood_change > 0
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-green-100 text-green-700'
                                          }`}
                                      >
                                        {alert.likelihood_change > 0 ? '+' : ''}
                                        {alert.likelihood_change}
                                      </span>
                                    </div>
                                  )}
                                  {alert.impact_change !== null && alert.impact_change !== 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-600">Impact:</span>
                                      <span
                                        className={`px-2 py-0.5 text-xs font-semibold rounded ${alert.impact_change > 0
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-green-100 text-green-700'
                                          }`}
                                      >
                                        {alert.impact_change > 0 ? '+' : ''}
                                        {alert.impact_change}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              {/* Expanded details */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-purple-200 space-y-3">
                                  {/* Event Summary */}
                                  {event.summary && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-700 mb-1">Event Summary:</p>
                                      <p className="text-xs text-gray-600">{event.summary}</p>
                                    </div>
                                  )}

                                  {/* AI Reasoning */}
                                  {alert.ai_reasoning && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-purple-600" />
                                        AI Analysis:
                                      </p>
                                      <p className="text-xs text-gray-600 bg-purple-50 p-2 rounded border border-purple-200">
                                        {alert.ai_reasoning}
                                      </p>
                                    </div>
                                  )}

                                  {/* Event URL */}
                                  {event.url && (
                                    <div>
                                      <a
                                        href={event.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                                      >
                                        View original source →
                                      </a>
                                    </div>
                                  )}

                                  {/* Review info */}
                                  {alert.reviewed_by && alert.reviewed_at && (
                                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                                      Reviewed on {new Date(alert.reviewed_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Treatment Log Section - Only show when editing and risk code exists */}
            {editingRisk && editingRisk.risk_code && (
              <div className="mt-6">
                <TreatmentLogViewer riskCode={editingRisk.risk_code} />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {readOnly ? 'Close' : 'Cancel'}
              </Button>
              {!readOnly && (
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !selectedCategory || !selectedSubcategory}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingRisk ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>{editingRisk ? 'Update Risk' : 'Create Risk'}</>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Root Cause Dialog */}
      <Dialog open={showCustomRootCause} onOpenChange={setShowCustomRootCause}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Root Cause</DialogTitle>
            <DialogDescription>
              Create a custom root cause for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom_cause_code">Code *</Label>
              <Input
                id="custom_cause_code"
                placeholder="e.g., RC-ORG-001"
                value={customRootCause.cause_code}
                onChange={(e) => setCustomRootCause({ ...customRootCause, cause_code: e.target.value })}
                disabled={savingCustom}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_cause_name">Name *</Label>
              <Input
                id="custom_cause_name"
                placeholder="e.g., Legacy system vulnerability"
                value={customRootCause.cause_name}
                onChange={(e) => setCustomRootCause({ ...customRootCause, cause_name: e.target.value })}
                disabled={savingCustom}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_cause_description">Description</Label>
              <Textarea
                id="custom_cause_description"
                placeholder="Detailed description of this root cause"
                value={customRootCause.cause_description}
                onChange={(e) => setCustomRootCause({ ...customRootCause, cause_description: e.target.value })}
                disabled={savingCustom}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_cause_category">Category</Label>
              <Input
                id="custom_cause_category"
                placeholder="e.g., Technology, Process"
                value={customRootCause.category}
                onChange={(e) => setCustomRootCause({ ...customRootCause, category: e.target.value })}
                disabled={savingCustom}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCustomRootCause(false)}
              disabled={savingCustom}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCustomRootCause}
              disabled={savingCustom}
            >
              {savingCustom ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Custom Root Cause'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Impact Dialog */}
      <Dialog open={showCustomImpact} onOpenChange={setShowCustomImpact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Impact</DialogTitle>
            <DialogDescription>
              Create a custom impact for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom_impact_code">Code *</Label>
              <Input
                id="custom_impact_code"
                placeholder="e.g., IMP-ORG-001"
                value={customImpact.impact_code}
                onChange={(e) => setCustomImpact({ ...customImpact, impact_code: e.target.value })}
                disabled={savingCustom}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_impact_name">Name *</Label>
              <Input
                id="custom_impact_name"
                placeholder="e.g., Customer data exposure"
                value={customImpact.impact_name}
                onChange={(e) => setCustomImpact({ ...customImpact, impact_name: e.target.value })}
                disabled={savingCustom}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_impact_description">Description</Label>
              <Textarea
                id="custom_impact_description"
                placeholder="Detailed description of this impact"
                value={customImpact.impact_description}
                onChange={(e) => setCustomImpact({ ...customImpact, impact_description: e.target.value })}
                disabled={savingCustom}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_impact_category">Category</Label>
              <Input
                id="custom_impact_category"
                placeholder="e.g., Financial, Operational"
                value={customImpact.category}
                onChange={(e) => setCustomImpact({ ...customImpact, category: e.target.value })}
                disabled={savingCustom}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCustomImpact(false)}
              disabled={savingCustom}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCustomImpact}
              disabled={savingCustom}
            >
              {savingCustom ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Custom Impact'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
