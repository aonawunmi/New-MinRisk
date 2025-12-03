import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Enhanced RiskForm Component
 *
 * Dialog form for adding and editing risks with:
 * - Taxonomy-based category/subcategory dropdowns
 * - Optional AI statement refinement
 */
import { useState, useEffect } from 'react';
import { createRisk, updateRisk } from '@/lib/risks';
import { getCategoriesWithSubcategories, exportTaxonomy } from '@/lib/taxonomy';
import { getRootCauses, getImpacts, createCustomRootCause, createCustomImpact } from '@/lib/libraries';
import { refineRiskStatement, revalidateEditedStatement, getAIControlRecommendations } from '@/lib/ai';
import { createControl, getControlsForRisk, updateControl, deleteControl } from '@/lib/controls';
import { getAlertsWithEventsForRisk } from '@/lib/riskIntelligence';
import { getOrganizationConfig, getLikelihoodOptions, getImpactOptions } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { AlertCircle, Sparkles, Loader2, CheckCircle, X, Edit, AlertTriangle, Plus, Shield, XCircle, Check, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TreatmentLogViewer from '@/components/riskIntelligence/TreatmentLogViewer';
export default function RiskForm({ open, onOpenChange, onSuccess, editingRisk, }) {
    const [formData, setFormData] = useState({
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
    const [error, setError] = useState(null);
    // Taxonomy state
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);
    // Library state (root causes, impacts, etc.)
    const [rootCauses, setRootCauses] = useState([]);
    const [impacts, setImpacts] = useState([]);
    const [selectedRootCauseId, setSelectedRootCauseId] = useState('');
    const [selectedImpactId, setSelectedImpactId] = useState('');
    const [loadingLibraries, setLoadingLibraries] = useState(false);
    const [rootCauseSearch, setRootCauseSearch] = useState('');
    const [impactSearch, setImpactSearch] = useState('');
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
    // AI Refinement state
    const [isRefining, setIsRefining] = useState(false);
    const [refinement, setRefinement] = useState(null);
    const [showRefinement, setShowRefinement] = useState(false);
    // Editing refined statement state
    const [isEditingRefinement, setIsEditingRefinement] = useState(false);
    const [editedRefinedStatement, setEditedRefinedStatement] = useState('');
    const [revalidation, setRevalidation] = useState(null);
    const [isRevalidating, setIsRevalidating] = useState(false);
    // Controls state (integrated into risk form)
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
    const [loadingAISuggestions, setLoadingAISuggestions] = useState(false);
    const [aiSuggestionsError, setAiSuggestionsError] = useState(null);
    const [showAISuggestions, setShowAISuggestions] = useState(false);
    const [editingAISuggestionIndex, setEditingAISuggestionIndex] = useState(null);
    // Manual control entry state
    const [showManualControl, setShowManualControl] = useState(false);
    const [manualControl, setManualControl] = useState({
        name: '',
        description: '',
        control_type: 'preventive',
        target: 'Likelihood',
        design_score: 2,
        implementation_score: 2,
        monitoring_score: 2,
        evaluation_score: 2,
    });
    const [manualControls, setManualControls] = useState([]);
    // Existing controls state (when editing a risk)
    const [existingControls, setExistingControls] = useState([]);
    const [loadingControls, setLoadingControls] = useState(false);
    const [editingControlId, setEditingControlId] = useState(null);
    const [editingControlData, setEditingControlData] = useState(null);
    const [updatingControl, setUpdatingControl] = useState(false);
    const [deletingControlId, setDeletingControlId] = useState(null);
    const [intelligenceAlerts, setIntelligenceAlerts] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    // Organization configuration state
    const [orgConfig, setOrgConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [expandedAlertId, setExpandedAlertId] = useState(null);
    // Load existing controls for a risk
    async function loadExistingControls(riskId) {
        setLoadingControls(true);
        try {
            const { data, error } = await getControlsForRisk(riskId);
            if (error) {
                console.error('Error loading controls:', error);
                setExistingControls([]);
            }
            else {
                setExistingControls(data || []);
            }
        }
        catch (err) {
            console.error('Unexpected error loading controls:', err);
            setExistingControls([]);
        }
        finally {
            setLoadingControls(false);
        }
    }
    // Load intelligence alerts for a risk
    async function loadIntelligenceAlerts(riskCode) {
        setLoadingAlerts(true);
        try {
            const { data, error } = await getAlertsWithEventsForRisk(riskCode);
            if (error) {
                console.error('Error loading intelligence alerts:', error);
                setIntelligenceAlerts([]);
            }
            else {
                setIntelligenceAlerts(data || []);
            }
        }
        catch (err) {
            console.error('Unexpected error loading intelligence alerts:', err);
            setIntelligenceAlerts([]);
        }
        finally {
            setLoadingAlerts(false);
        }
    }
    // Start editing a control
    function handleStartEditControl(control) {
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
    async function handleSaveControl(controlId) {
        if (!editingControlData)
            return;
        setUpdatingControl(true);
        try {
            const { error } = await updateControl(controlId, editingControlData);
            if (error) {
                alert('Failed to update control: ' + error.message);
                return;
            }
            // Update local state
            setExistingControls(prevControls => prevControls.map(c => c.id === controlId
                ? {
                    ...c,
                    ...editingControlData,
                    updated_at: new Date().toISOString(),
                }
                : c));
            // Clear edit state
            setEditingControlId(null);
            setEditingControlData(null);
        }
        catch (err) {
            console.error('Error updating control:', err);
            alert('An unexpected error occurred');
        }
        finally {
            setUpdatingControl(false);
        }
    }
    // Delete control
    async function handleDeleteControl(controlId, controlName) {
        // Confirm deletion
        const confirmed = window.confirm(`Are you sure you want to delete the control "${controlName}"?\n\nThis action cannot be undone.`);
        if (!confirmed)
            return;
        setDeletingControlId(controlId);
        try {
            const { error } = await deleteControl(controlId);
            if (error) {
                alert('Failed to delete control: ' + error.message);
                return;
            }
            // Remove from local state
            setExistingControls(prevControls => prevControls.filter(c => c.id !== controlId));
            // Trigger parent component to reload risks (including residual risk recalculation)
            onSuccess();
        }
        catch (err) {
            console.error('Error deleting control:', err);
            alert('An unexpected error occurred');
        }
        finally {
            setDeletingControlId(null);
        }
    }
    // Load taxonomy, libraries, and config on component mount
    useEffect(() => {
        if (open) {
            loadTaxonomy();
            loadLibraries();
            loadConfig();
        }
    }, [open]);
    async function loadConfig() {
        setLoadingConfig(true);
        try {
            const { data, error } = await getOrganizationConfig();
            if (error) {
                console.error('Failed to load organization config:', error);
            }
            else {
                setOrgConfig(data);
            }
        }
        catch (err) {
            console.error('Unexpected config load error:', err);
        }
        finally {
            setLoadingConfig(false);
        }
    }
    async function loadLibraries() {
        setLoadingLibraries(true);
        try {
            // Load root causes
            const { data: rootCausesData, error: rcError } = await getRootCauses();
            if (rcError) {
                console.error('Failed to load root causes:', rcError);
            }
            else {
                setRootCauses(rootCausesData || []);
            }
            // Load impacts
            const { data: impactsData, error: impError } = await getImpacts();
            if (impError) {
                console.error('Failed to load impacts:', impError);
            }
            else {
                setImpacts(impactsData || []);
            }
        }
        catch (err) {
            console.error('Unexpected library load error:', err);
        }
        finally {
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
                likelihood_inherent: editingRisk.likelihood_inherent,
                impact_inherent: editingRisk.impact_inherent,
                status: editingRisk.status,
                period: editingRisk.period,
                is_priority: editingRisk.is_priority,
                root_cause_id: editingRisk.root_cause_id || null,
                impact_id: editingRisk.impact_id || null,
                event_text: editingRisk.event_text || null,
            });
            // Set selected root cause and impact
            setSelectedRootCauseId(editingRisk.root_cause_id || '');
            setSelectedImpactId(editingRisk.impact_id || '');
            // Load existing controls for this risk
            loadExistingControls(editingRisk.id);
            // Load intelligence alerts for this risk
            loadIntelligenceAlerts(editingRisk.risk_code);
            // Find and set category/subcategory from existing risk
            // (category field currently stores subcategory name)
            const subcategoryName = editingRisk.category;
            setSelectedSubcategory(subcategoryName);
            // Find the parent category for this subcategory
            if (categories.length > 0 && subcategoryName) {
                const parentCategory = categories.find((cat) => cat.subcategories.some((sub) => sub.name === subcategoryName));
                if (parentCategory) {
                    setSelectedCategory(parentCategory.name);
                    console.log('Found category for editing:', parentCategory.name, '→', subcategoryName);
                }
            }
        }
        else {
            // Reset form for new risk
            setFormData({
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
                root_cause_id: null,
                impact_id: null,
                event_text: null,
            });
            setSelectedCategory('');
            setSelectedSubcategory('');
            setSelectedRootCauseId('');
            setSelectedImpactId('');
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
            }
            else {
                setCategories(data || []);
            }
        }
        catch (err) {
            console.error('Unexpected taxonomy load error:', err);
            setError('Failed to load risk categories');
        }
        finally {
            setLoadingTaxonomy(false);
        }
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // Use refined statement if available and accepted
            const finalDescription = refinement && showRefinement
                ? refinement.refined_statement
                : formData.risk_description;
            // Destructure to exclude fields that don't exist in database
            const { event_text, root_cause_id, impact_id, ...validFormData } = formData;
            const dataToSave = {
                ...validFormData,
                risk_description: finalDescription,
                category: selectedSubcategory, // Store subcategory in category field
            };
            let riskId = null;
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
            }
            else {
                // Create new risk
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
                    if (!suggestion)
                        return;
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
                    }
                    catch (controlError) {
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
                    }
                    catch (controlError) {
                        console.error(`Failed to create manual control ${control.name}:`, controlError);
                    }
                });
                await Promise.all(manualControlPromises);
                console.log('All manual controls created');
            }
            // Success!
            onSuccess();
            onOpenChange(false);
        }
        catch (err) {
            console.error('Unexpected submit error:', err);
            setError('An unexpected error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };
    const handleCategoryChange = (categoryName) => {
        setSelectedCategory(categoryName);
        setSelectedSubcategory(''); // Reset subcategory when category changes
    };
    const handleSubcategoryChange = (subcategoryName) => {
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
            const { data, error: refineError } = await refineRiskStatement(formData.risk_description, selectedCategory, selectedSubcategory);
            if (refineError) {
                setError(refineError.message);
            }
            else if (data) {
                setRefinement(data);
                setShowRefinement(true);
            }
        }
        catch (err) {
            console.error('Refinement error:', err);
            setError('Failed to refine statement');
        }
        finally {
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
            const { data, error: revalidateError } = await revalidateEditedStatement(editedRefinedStatement, selectedCategory, selectedSubcategory, taxonomy);
            if (revalidateError) {
                setError(revalidateError.message);
            }
            else if (data) {
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
                            setSelectedSubcategory(data.suggested_subcategory);
                            console.log('Subcategory updated via setTimeout');
                        }, 0);
                    }
                }
                else {
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
        }
        catch (err) {
            console.error('Revalidation error:', err);
            setError('Failed to revalidate statement');
        }
        finally {
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
            const { data, error: aiError } = await getAIControlRecommendations(formData.risk_title, formData.risk_description, selectedCategory, formData.division, formData.likelihood_inherent, formData.impact_inherent);
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
        }
        catch (err) {
            setAiSuggestionsError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
        }
        finally {
            setLoadingAISuggestions(false);
        }
    }
    function toggleSuggestion(index) {
        const newSelected = new Set(selectedSuggestions);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        }
        else {
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
        }
        catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        finally {
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
        }
        catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        finally {
            setSavingCustom(false);
        }
    }
    function calculateEffectiveness(control) {
        // DIME Framework Rule: If Design = 0 OR Implementation = 0, effectiveness = 0
        if (control.design_score === 0 || control.implementation_score === 0) {
            return 0;
        }
        return Math.round(((control.design_score +
            control.implementation_score +
            control.monitoring_score +
            control.evaluation_score) /
            12) *
            100);
    }
    function updateAISuggestionDIME(index, field, value) {
        const updatedSuggestions = [...aiSuggestions];
        updatedSuggestions[index] = {
            ...updatedSuggestions[index],
            [field]: value,
        };
        setAiSuggestions(updatedSuggestions);
    }
    // Calculate residual risk based on all controls (manual + selected AI)
    function calculateResidualRisk() {
        const inherentLikelihood = formData.likelihood_inherent;
        const inherentImpact = formData.impact_inherent;
        // Collect all controls (manual + selected AI)
        const allControls = [];
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
            // DIME Framework Rule: If Design = 0 OR Implementation = 0, effectiveness = 0
            let effectiveness = 0;
            if (control.design_score !== 0 && control.implementation_score !== 0) {
                // Calculate effectiveness: (D + I + M + E) / 12
                effectiveness =
                    (control.design_score +
                        control.implementation_score +
                        control.monitoring_score +
                        control.evaluation_score) /
                        12.0;
            }
            // Track maximum effectiveness per target
            if (control.target === 'Likelihood') {
                maxLikelihoodEffectiveness = Math.max(maxLikelihoodEffectiveness, effectiveness);
            }
            else if (control.target === 'Impact') {
                maxImpactEffectiveness = Math.max(maxImpactEffectiveness, effectiveness);
            }
        }
        // Apply DIME framework formula:
        // residual = GREATEST(1, inherent - ROUND((inherent - 1) * max_effectiveness))
        const residualLikelihood = Math.max(1, inherentLikelihood - Math.round((inherentLikelihood - 1) * maxLikelihoodEffectiveness));
        const residualImpact = Math.max(1, inherentImpact - Math.round((inherentImpact - 1) * maxImpactEffectiveness));
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
    function handleRemoveManualControl(index) {
        setManualControls(manualControls.filter((_, i) => i !== index));
    }
    function calculateManualEffectiveness(control) {
        // DIME Framework Rule: If Design = 0 OR Implementation = 0, effectiveness = 0
        if (control.design_score === 0 || control.implementation_score === 0) {
            return 0;
        }
        return Math.round(((control.design_score +
            control.implementation_score +
            control.monitoring_score +
            control.evaluation_score) /
            12) *
            100);
    }
    // Get filtered subcategories based on selected category
    const filteredSubcategories = selectedCategory
        ? categories.find((cat) => cat.name === selectedCategory)?.subcategories || []
        : [];
    // Filter root causes and impacts based on search
    const filteredRootCauses = rootCauses.filter((rc) => rootCauseSearch.trim() === ''
        ? true
        : rc.cause_code.toLowerCase().includes(rootCauseSearch.toLowerCase()) ||
            rc.cause_name.toLowerCase().includes(rootCauseSearch.toLowerCase()) ||
            (rc.cause_description && rc.cause_description.toLowerCase().includes(rootCauseSearch.toLowerCase())));
    const filteredImpacts = impacts.filter((imp) => impactSearch.trim() === ''
        ? true
        : imp.impact_code.toLowerCase().includes(impactSearch.toLowerCase()) ||
            imp.impact_name.toLowerCase().includes(impactSearch.toLowerCase()) ||
            (imp.impact_description && imp.impact_description.toLowerCase().includes(impactSearch.toLowerCase())));
    return (_jsxs(_Fragment, { children: [_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[90vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: editingRisk ? 'Edit Risk' : 'Add New Risk' }), _jsx(DialogDescription, { children: editingRisk
                                        ? 'Update the risk information below.'
                                        : 'Fill in the details to create a new risk. You can optionally use AI to refine your risk statement.' })] }), error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [editingRisk && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "risk_code", children: "Risk Code" }), _jsx(Input, { id: "risk_code", value: formData.risk_code || '', disabled: true, className: "bg-gray-50" }), _jsx("p", { className: "text-xs text-gray-500", children: "Risk codes cannot be changed" })] })), !editingRisk && (_jsx(Alert, { children: _jsx(AlertDescription, { children: "Risk code will be auto-generated (e.g., STR-001, FIN-002)" }) })), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "owner", children: "Risk Owner *" }), _jsx(Input, { id: "owner", value: formData.owner, onChange: (e) => handleChange('owner', e.target.value), placeholder: "e.g., John Doe", required: true, disabled: loading })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "status", children: "Status" }), _jsxs(Select, { value: formData.status, onValueChange: (value) => handleChange('status', value), disabled: loading, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select status" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "OPEN", children: "Open" }), _jsx(SelectItem, { value: "CLOSED", children: "Closed" }), _jsx(SelectItem, { value: "ARCHIVED", children: "Archived" })] })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "risk_title", children: "Risk Title *" }), _jsx(Input, { id: "risk_title", value: formData.risk_title, onChange: (e) => handleChange('risk_title', e.target.value), placeholder: "e.g., Cybersecurity Breach", required: true, disabled: loading })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "event_text", children: "Event / Situation (Optional)" }), _jsx(Textarea, { id: "event_text", value: formData.event_text || '', onChange: (e) => handleChange('event_text', e.target.value), placeholder: "Describe the observable event or situation (e.g., 'An employee clicks on a phishing email link')", rows: 3, disabled: loading }), _jsx("p", { className: "text-xs text-gray-500", children: "Describe what is happening. This will be combined with root cause and impact to create a structured risk statement." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx(Label, { htmlFor: "root_cause", children: "Root Cause (Optional)" }), _jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: () => setShowCustomRootCause(true), className: "h-7 text-xs", disabled: loading, children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), "Add Custom"] })] }), loadingLibraries ? (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Loading root causes..."] })) : (_jsxs(Select, { value: selectedRootCauseId, onValueChange: setSelectedRootCauseId, disabled: loading, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select root cause" }) }), _jsxs(SelectContent, { className: "max-h-[400px]", children: [_jsx("div", { className: "p-2 border-b sticky top-0 bg-white", children: _jsx(Input, { placeholder: "Search root causes...", value: rootCauseSearch, onChange: (e) => setRootCauseSearch(e.target.value), className: "h-8", onClick: (e) => e.stopPropagation(), onKeyDown: (e) => e.stopPropagation() }) }), _jsx("div", { className: "max-h-[300px] overflow-y-auto", children: filteredRootCauses.length === 0 ? (_jsxs("div", { className: "p-4 text-center text-sm text-gray-500", children: ["No root causes found matching \"", rootCauseSearch, "\""] })) : (filteredRootCauses.map((rc) => (_jsx(SelectItem, { value: rc.id, children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-xs text-gray-500", children: rc.cause_code }), _jsx("span", { className: "font-medium", children: rc.cause_name }), rc.source === 'global' && (_jsx("span", { className: "text-xs text-blue-600 bg-blue-50 px-1 rounded", children: "Global" }))] }), rc.cause_description && (_jsx("span", { className: "text-xs text-gray-500", children: rc.cause_description }))] }) }, rc.id)))) })] })] })), selectedRootCauseId && (_jsx("p", { className: "text-xs text-gray-500", children: rootCauses.find((rc) => rc.id === selectedRootCauseId)?.cause_description }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx(Label, { htmlFor: "impact", children: "Impact (Optional)" }), _jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: () => setShowCustomImpact(true), className: "h-7 text-xs", disabled: loading, children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), "Add Custom"] })] }), loadingLibraries ? (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Loading impacts..."] })) : (_jsxs(Select, { value: selectedImpactId, onValueChange: setSelectedImpactId, disabled: loading, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select impact" }) }), _jsxs(SelectContent, { className: "max-h-[400px]", children: [_jsx("div", { className: "p-2 border-b sticky top-0 bg-white", children: _jsx(Input, { placeholder: "Search impacts...", value: impactSearch, onChange: (e) => setImpactSearch(e.target.value), className: "h-8", onClick: (e) => e.stopPropagation(), onKeyDown: (e) => e.stopPropagation() }) }), _jsx("div", { className: "max-h-[300px] overflow-y-auto", children: filteredImpacts.length === 0 ? (_jsxs("div", { className: "p-4 text-center text-sm text-gray-500", children: ["No impacts found matching \"", impactSearch, "\""] })) : (filteredImpacts.map((imp) => (_jsx(SelectItem, { value: imp.id, children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-xs text-gray-500", children: imp.impact_code }), _jsx("span", { className: "font-medium", children: imp.impact_name }), imp.source === 'global' && (_jsx("span", { className: "text-xs text-blue-600 bg-blue-50 px-1 rounded", children: "Global" }))] }), imp.impact_description && (_jsx("span", { className: "text-xs text-gray-500", children: imp.impact_description }))] }) }, imp.id)))) })] })] })), selectedImpactId && (_jsx("p", { className: "text-xs text-gray-500", children: impacts.find((imp) => imp.id === selectedImpactId)?.impact_description }))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "category", children: "Risk Category *" }), loadingTaxonomy ? (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Loading categories..."] })) : (_jsxs(Select, { value: selectedCategory, onValueChange: handleCategoryChange, disabled: loading, required: true, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select category" }) }), _jsx(SelectContent, { children: categories.map((cat) => (_jsx(SelectItem, { value: cat.name, children: cat.name }, cat.id))) })] })), selectedCategory && (_jsx("p", { className: "text-xs text-gray-500", children: categories.find((c) => c.name === selectedCategory)?.description }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "subcategory", children: "Risk Sub-Category *" }), _jsxs(Select, { value: selectedSubcategory, onValueChange: handleSubcategoryChange, disabled: loading || !selectedCategory, required: true, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: selectedCategory ? "Select sub-category" : "Select category first" }) }), _jsx(SelectContent, { children: filteredSubcategories.map((subcat) => (_jsx(SelectItem, { value: subcat.name, children: subcat.name }, subcat.id))) })] }), selectedSubcategory && (_jsx("p", { className: "text-xs text-gray-500", children: filteredSubcategories.find((s) => s.name === selectedSubcategory)?.description }))] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { htmlFor: "risk_description", children: "Risk Statement *" }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: handleRefineWithAI, disabled: isRefining || loading || !formData.risk_description.trim() || !selectedCategory || !selectedSubcategory, className: "text-purple-600 border-purple-600 hover:bg-purple-50", children: isRefining ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Refining..."] })) : (_jsxs(_Fragment, { children: [_jsx(Sparkles, { className: "h-4 w-4 mr-2" }), "Fine-tune with AI"] })) })] }), _jsx(Textarea, { id: "risk_description", value: formData.risk_description, onChange: (e) => handleChange('risk_description', e.target.value), placeholder: "Describe the risk in your own words... (AI can help refine this)", rows: 4, required: true, disabled: loading }), _jsx("p", { className: "text-xs text-gray-500", children: "Write your risk statement naturally, then optionally click \"Fine-tune with AI\" to improve it" })] }), refinement && showRefinement && (_jsxs(Card, { className: "border-green-200 bg-green-50", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "h-5 w-5 text-green-600" }), _jsx(CardTitle, { className: "text-sm text-green-900", children: "AI-Refined Statement" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [!isEditingRefinement && (_jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: handleStartEditingRefinement, title: "Edit refined statement", children: _jsx(Edit, { className: "h-4 w-4" }) })), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: handleRejectRefinement, title: "Reject and use original", children: _jsx(X, { className: "h-4 w-4" }) })] })] }) }), _jsxs(CardContent, { className: "space-y-3", children: [!isEditingRefinement && (_jsxs(_Fragment, { children: [_jsx("div", { className: "bg-white p-3 rounded border border-green-200", children: _jsx("p", { className: "text-sm text-gray-900", children: refinement.refined_statement }) }), _jsxs("div", { className: "text-xs text-green-800", children: [_jsx("strong", { children: "What was improved:" }), _jsx("ul", { className: "list-disc list-inside mt-1 space-y-1", children: refinement.improvements_made.map((improvement, idx) => (_jsx("li", { children: improvement }, idx))) })] }), _jsx("div", { className: "text-xs text-green-700 italic", children: refinement.explanation }), _jsx(Alert, { className: "bg-green-100 border-green-300", children: _jsx(AlertDescription, { className: "text-green-900 text-xs", children: "This refined version will be saved when you submit the form. Click the edit icon to make changes, or X to use your original version." }) })] })), isEditingRefinement && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edited-refinement", children: "Edit Refined Statement" }), _jsx(Textarea, { id: "edited-refinement", value: editedRefinedStatement, onChange: (e) => setEditedRefinedStatement(e.target.value), rows: 4, className: "bg-white", placeholder: "Edit the AI-refined statement..." }), _jsx("p", { className: "text-xs text-gray-600", children: "Edit the statement as needed. Click \"Revalidate\" to check if the category/subcategory still fit." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { type: "button", onClick: handleRevalidateEdit, disabled: isRevalidating || !editedRefinedStatement.trim(), size: "sm", className: "bg-purple-600 hover:bg-purple-700", children: isRevalidating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Revalidating..."] })) : (_jsxs(_Fragment, { children: [_jsx(Sparkles, { className: "h-4 w-4 mr-2" }), "Revalidate Category"] })) }), _jsx(Button, { type: "button", variant: "outline", onClick: handleCancelEditingRefinement, disabled: isRevalidating, size: "sm", children: "Cancel" })] })] })), revalidation && !isEditingRefinement && (_jsx(Alert, { className: revalidation.category_still_valid && revalidation.subcategory_still_valid ? "bg-blue-50 border-blue-300" : "bg-yellow-50 border-yellow-300", children: _jsxs("div", { className: "flex items-start gap-2", children: [revalidation.category_still_valid && revalidation.subcategory_still_valid ? (_jsx(CheckCircle, { className: "h-4 w-4 text-blue-600 mt-0.5" })) : (_jsx(AlertTriangle, { className: "h-4 w-4 text-yellow-600 mt-0.5" })), _jsx("div", { className: "flex-1", children: _jsxs(AlertDescription, { className: "text-xs space-y-2", children: [_jsx("p", { className: "font-semibold", children: revalidation.category_still_valid && revalidation.subcategory_still_valid
                                                                                ? '✓ Category and Subcategory Validated'
                                                                                : '⚠ Category/Subcategory Changed' }), _jsx("p", { children: revalidation.explanation }), (!revalidation.category_still_valid || !revalidation.subcategory_still_valid) && (_jsxs("div", { className: "mt-2 p-2 bg-white rounded border", children: [_jsx("p", { className: "font-semibold text-gray-900", children: "Updated Classification:" }), _jsxs("p", { className: "text-gray-700", children: ["Category: ", _jsx("strong", { children: revalidation.suggested_category })] }), _jsxs("p", { className: "text-gray-700", children: ["Sub-category: ", _jsx("strong", { children: revalidation.suggested_subcategory })] }), _jsx("p", { className: "text-gray-600 text-xs mt-1", children: "(The dropdowns above have been updated automatically)" })] }))] }) })] }) }))] })] })), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "division", children: "Division *" }), _jsxs(Select, { value: formData.division, onValueChange: (value) => handleChange('division', value), disabled: loading || !orgConfig?.divisions?.length, children: [_jsx(SelectTrigger, { id: "division", children: _jsx(SelectValue, { placeholder: orgConfig?.divisions?.length ? "Select division" : "No divisions configured" }) }), _jsx(SelectContent, { children: orgConfig?.divisions?.filter(d => d && d.trim()).map((division) => (_jsx(SelectItem, { value: division, children: division }, division))) })] }), (!orgConfig?.divisions || orgConfig.divisions.length === 0) && (_jsx("p", { className: "text-sm text-amber-600", children: "No divisions configured. Please configure in Admin panel." }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "department", children: "Department *" }), _jsxs(Select, { value: formData.department, onValueChange: (value) => handleChange('department', value), disabled: loading || !orgConfig?.departments?.length, children: [_jsx(SelectTrigger, { id: "department", children: _jsx(SelectValue, { placeholder: orgConfig?.departments?.length ? "Select department" : "No departments configured" }) }), _jsx(SelectContent, { children: orgConfig?.departments?.filter(d => d && d.trim()).map((department) => (_jsx(SelectItem, { value: department, children: department }, department))) })] }), (!orgConfig?.departments || orgConfig.departments.length === 0) && (_jsx("p", { className: "text-sm text-amber-600", children: "No departments configured. Please configure in Admin panel." }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "\u00A0" }), _jsxs("div", { className: "flex items-center space-x-2 h-10", children: [_jsx("input", { type: "checkbox", id: "is_priority", checked: formData.is_priority, onChange: (e) => handleChange('is_priority', e.target.checked), disabled: loading, className: "rounded border-gray-300" }), _jsx(Label, { htmlFor: "is_priority", className: "text-sm font-normal cursor-pointer", children: "Priority Risk" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "likelihood_inherent", children: "Inherent Likelihood *" }), _jsxs(Select, { value: formData.likelihood_inherent.toString(), onValueChange: (value) => handleChange('likelihood_inherent', parseInt(value)), disabled: loading, children: [_jsx(SelectTrigger, { id: "likelihood_inherent", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: getLikelihoodOptions(orgConfig).map((option) => (_jsx(SelectItem, { value: option.value.toString(), children: option.label }, option.value))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "impact_inherent", children: "Inherent Impact *" }), _jsxs(Select, { value: formData.impact_inherent.toString(), onValueChange: (value) => handleChange('impact_inherent', parseInt(value)), disabled: loading, children: [_jsx(SelectTrigger, { id: "impact_inherent", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: getImpactOptions(orgConfig).map((option) => (_jsx(SelectItem, { value: option.value.toString(), children: option.label }, option.value))) })] })] })] }), _jsxs("div", { className: "space-y-4 pt-6 border-t mt-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold flex items-center gap-2", children: [_jsx(Shield, { className: "h-5 w-5 text-blue-600" }), "Controls (Optional)"] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Add controls to mitigate this risk" })] }), _jsxs("div", { className: "flex gap-2", children: [!showManualControl && !showAISuggestions && (_jsxs(Button, { type: "button", variant: "outline", className: "border-blue-200 text-blue-700 hover:bg-blue-50", onClick: () => setShowManualControl(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Add Control"] })), !showAISuggestions && !showManualControl && (_jsx(Button, { type: "button", variant: "outline", className: "border-purple-200 text-purple-700 hover:bg-purple-50", onClick: handleGetAISuggestions, disabled: loadingAISuggestions, children: loadingAISuggestions ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Getting Suggestions..."] })) : (_jsxs(_Fragment, { children: [_jsx(Sparkles, { className: "h-4 w-4 mr-2" }), "Get AI Suggestions"] })) }))] })] }), showManualControl && (_jsxs(Card, { className: "border-blue-200 bg-blue-50/50", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-base flex items-center justify-between", children: [_jsx("span", { children: "Add Control Manually" }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setShowManualControl(false), children: _jsx(X, { className: "h-4 w-4" }) })] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Control Name *" }), _jsx(Input, { value: manualControl.name, onChange: (e) => setManualControl({ ...manualControl, name: e.target.value }), placeholder: "e.g., Multi-Factor Authentication" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Control Description *" }), _jsx(Textarea, { value: manualControl.description, onChange: (e) => setManualControl({ ...manualControl, description: e.target.value }), placeholder: "Describe how this control works...", rows: 3 })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Control Type" }), _jsxs(Select, { value: manualControl.control_type, onValueChange: (value) => setManualControl({ ...manualControl, control_type: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "preventive", children: "Preventive" }), _jsx(SelectItem, { value: "detective", children: "Detective" }), _jsx(SelectItem, { value: "corrective", children: "Corrective" })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Target" }), _jsxs(Select, { value: manualControl.target, onValueChange: (value) => setManualControl({ ...manualControl, target: value }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Likelihood", children: "Likelihood" }), _jsx(SelectItem, { value: "Impact", children: "Impact" })] })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "DIME Scores (0-3)" }), _jsxs("div", { className: "grid grid-cols-4 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Design" }), _jsxs(Select, { value: manualControl.design_score.toString(), onValueChange: (value) => setManualControl({ ...manualControl, design_score: parseInt(value) }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0" }), _jsx(SelectItem, { value: "1", children: "1" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Implementation" }), _jsxs(Select, { value: manualControl.implementation_score.toString(), onValueChange: (value) => setManualControl({
                                                                                        ...manualControl,
                                                                                        implementation_score: parseInt(value),
                                                                                    }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0" }), _jsx(SelectItem, { value: "1", children: "1" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Monitoring" }), _jsxs(Select, { value: manualControl.monitoring_score.toString(), onValueChange: (value) => setManualControl({ ...manualControl, monitoring_score: parseInt(value) }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0" }), _jsx(SelectItem, { value: "1", children: "1" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Evaluation" }), _jsxs(Select, { value: manualControl.evaluation_score.toString(), onValueChange: (value) => setManualControl({ ...manualControl, evaluation_score: parseInt(value) }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0" }), _jsx(SelectItem, { value: "1", children: "1" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" })] })] })] })] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setShowManualControl(false), children: "Cancel" }), _jsx(Button, { type: "button", onClick: handleAddManualControl, children: "Add Control" })] })] })] })), manualControls.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsxs("p", { className: "text-sm font-medium text-gray-700", children: ["Manual Controls (", manualControls.length, ")"] }), manualControls.map((control, index) => (_jsxs(Card, { className: "border-blue-200 bg-blue-50/30", children: [_jsx(CardHeader, { className: "pb-3", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx(CardTitle, { className: "text-base", children: control.name }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsx("span", { className: `text-xs px-2 py-1 rounded ${control.control_type === 'preventive'
                                                                                            ? 'bg-blue-100 text-blue-700'
                                                                                            : control.control_type === 'detective'
                                                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                                                : 'bg-green-100 text-green-700'}`, children: control.control_type.charAt(0).toUpperCase() +
                                                                                            control.control_type.slice(1) }), _jsx("span", { className: "text-xs px-2 py-1 rounded bg-gray-100 text-gray-700", children: control.target }), _jsxs("span", { className: "text-xs px-2 py-1 rounded bg-blue-100 text-blue-700", children: [calculateManualEffectiveness(control), "% Effective"] })] })] }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => handleRemoveManualControl(index), children: _jsx(XCircle, { className: "h-4 w-4 text-red-600" }) })] }) }), _jsxs(CardContent, { className: "pt-0", children: [_jsx("p", { className: "text-sm text-gray-700 mb-3", children: control.description }), _jsxs("div", { className: "grid grid-cols-4 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "D:" }), " ", control.design_score] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "I:" }), " ", control.implementation_score] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "M:" }), " ", control.monitoring_score] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "E:" }), " ", control.evaluation_score] })] })] })] }, index)))] })), aiSuggestionsError && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: aiSuggestionsError })] })), showAISuggestions && aiSuggestions.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between bg-purple-50 p-3 rounded-lg", children: [_jsxs("p", { className: "text-sm font-medium text-purple-900", children: ["AI suggested ", aiSuggestions.length, " controls. Select the ones you want to create:"] }), _jsxs(Button, { type: "button", variant: "ghost", size: "sm", onClick: handleGetAISuggestions, disabled: loadingAISuggestions, children: [_jsx(Sparkles, { className: "h-3 w-3 mr-1" }), "Regenerate"] })] }), aiSuggestions.map((suggestion, index) => (_jsxs(Card, { className: `cursor-pointer transition-all ${selectedSuggestions.has(index)
                                                        ? 'border-green-500 bg-green-50'
                                                        : 'border-gray-200 hover:border-gray-300'}`, onClick: () => toggleSuggestion(index), children: [_jsx(CardHeader, { className: "pb-3", children: _jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { className: "flex items-start gap-3 flex-1", children: [_jsx("div", { className: `mt-1 flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${selectedSuggestions.has(index)
                                                                                ? 'bg-green-600 border-green-600'
                                                                                : 'border-gray-300'}`, children: selectedSuggestions.has(index) && (_jsx(Check, { className: "h-3 w-3 text-white" })) }), _jsxs("div", { className: "flex-1", children: [_jsx(CardTitle, { className: "text-base", children: suggestion.name }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsx("span", { className: `text-xs px-2 py-1 rounded ${suggestion.control_type === 'preventive'
                                                                                                ? 'bg-blue-100 text-blue-700'
                                                                                                : suggestion.control_type === 'detective'
                                                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                                                    : 'bg-green-100 text-green-700'}`, children: suggestion.control_type.charAt(0).toUpperCase() +
                                                                                                suggestion.control_type.slice(1) }), _jsx("span", { className: "text-xs px-2 py-1 rounded bg-gray-100 text-gray-700", children: suggestion.target }), _jsxs("span", { className: "text-xs px-2 py-1 rounded bg-purple-100 text-purple-700", children: [calculateEffectiveness(suggestion), "% Effective"] })] })] })] }) }) }), _jsxs(CardContent, { className: "pt-0", onClick: (e) => e.stopPropagation(), children: [_jsx("p", { className: "text-sm text-gray-700 mb-3", children: suggestion.description }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-xs text-gray-600", children: "DIME Scores (Click to edit):" }), _jsxs("div", { className: "grid grid-cols-4 gap-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Design" }), _jsxs(Select, { value: suggestion.design_score.toString(), onValueChange: (value) => updateAISuggestionDIME(index, 'design_score', parseInt(value)), children: [_jsx(SelectTrigger, { className: "h-8", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0" }), _jsx(SelectItem, { value: "1", children: "1" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Implement" }), _jsxs(Select, { value: suggestion.implementation_score.toString(), onValueChange: (value) => updateAISuggestionDIME(index, 'implementation_score', parseInt(value)), children: [_jsx(SelectTrigger, { className: "h-8", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0" }), _jsx(SelectItem, { value: "1", children: "1" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Monitor" }), _jsxs(Select, { value: suggestion.monitoring_score.toString(), onValueChange: (value) => updateAISuggestionDIME(index, 'monitoring_score', parseInt(value)), children: [_jsx(SelectTrigger, { className: "h-8", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0" }), _jsx(SelectItem, { value: "1", children: "1" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Evaluate" }), _jsxs(Select, { value: suggestion.evaluation_score.toString(), onValueChange: (value) => updateAISuggestionDIME(index, 'evaluation_score', parseInt(value)), children: [_jsx(SelectTrigger, { className: "h-8", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0" }), _jsx(SelectItem, { value: "1", children: "1" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" })] })] })] })] })] }), _jsx("p", { className: "text-xs text-gray-600 mt-3 italic", children: suggestion.rationale })] })] }, index))), selectedSuggestions.size === 0 && (_jsxs(Alert, { children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: "No controls selected. Click on suggestions above to select them." })] }))] }))] }), (manualControls.length > 0 || selectedSuggestions.size > 0) && (_jsxs(Card, { className: "border-indigo-200 bg-indigo-50 mt-6", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "h-5 w-5 text-indigo-600" }), "Residual Risk (Post-Controls)"] }) }), _jsx(CardContent, { children: (() => {
                                                const residual = calculateResidualRisk();
                                                const inherent = formData.likelihood_inherent * formData.impact_inherent;
                                                const reduction = Math.round(((inherent - residual.residual_score) / inherent) * 100);
                                                return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-white p-4 rounded-lg border border-indigo-200", children: [_jsx("p", { className: "text-xs text-gray-600 mb-1", children: "Inherent Risk" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: [formData.likelihood_inherent, " \u00D7 ", formData.impact_inherent, " = ", inherent] })] }), _jsxs("div", { className: "bg-white p-4 rounded-lg border border-indigo-200", children: [_jsx("p", { className: "text-xs text-gray-600 mb-1", children: "Residual Risk" }), _jsxs("p", { className: "text-2xl font-bold text-indigo-600", children: [residual.residual_likelihood, " \u00D7 ", residual.residual_impact, " =", ' ', residual.residual_score] })] }), _jsxs("div", { className: "bg-white p-4 rounded-lg border border-green-200", children: [_jsx("p", { className: "text-xs text-gray-600 mb-1", children: "Risk Reduction" }), _jsxs("p", { className: "text-2xl font-bold text-green-600", children: [reduction, "%"] })] })] }), _jsxs("div", { className: "bg-white p-3 rounded-lg border border-indigo-200", children: [_jsx("p", { className: "text-xs text-gray-700 mb-2", children: _jsx("strong", { children: "DIME Framework Calculation:" }) }), _jsxs("ul", { className: "text-xs text-gray-600 space-y-1 list-disc list-inside", children: [_jsx("li", { children: "Control Effectiveness = (Design + Implementation + Monitoring + Evaluation) / 12" }), _jsxs("li", { children: ["Using ", _jsx("strong", { children: "maximum" }), " effectiveness from controls targeting each dimension"] }), _jsx("li", { children: "Residual = MAX(1, Inherent - ROUND((Inherent - 1) \u00D7 Max Effectiveness))" }), _jsxs("li", { children: ["Total Controls: ", manualControls.length + selectedSuggestions.size, " (", manualControls.length, " manual + ", selectedSuggestions.size, " AI)"] })] })] })] }));
                                            })() })] })), editingRisk && (_jsxs(Card, { className: "border-blue-200 bg-blue-50 mt-6", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [_jsx(Shield, { className: "h-5 w-5 text-blue-600" }), "Existing Controls (", existingControls.length, ")"] }) }), _jsx(CardContent, { children: loadingControls ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin text-blue-600" }), _jsx("span", { className: "ml-2 text-sm text-gray-600", children: "Loading controls..." })] })) : existingControls.length === 0 ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("p", { className: "text-sm text-gray-600", children: "No controls have been applied to this risk yet." }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "Go to the Controls tab to add controls for this risk." })] })) : (_jsx("div", { className: "space-y-3", children: existingControls.map((control) => {
                                                    // Calculate average DIME score
                                                    const dimeScores = [
                                                        control.design_score || 0,
                                                        control.implementation_score || 0,
                                                        control.monitoring_score || 0,
                                                        control.evaluation_score || 0,
                                                    ];
                                                    const avgDIME = (dimeScores.reduce((sum, score) => sum + score, 0) / 4).toFixed(2);
                                                    const effectiveness = ((parseFloat(avgDIME) / 3) * 100).toFixed(0);
                                                    const isEditing = editingControlId === control.id;
                                                    return (_jsx(Card, { className: "bg-white border border-blue-200", children: _jsx(CardContent, { className: "pt-4", children: isEditing && editingControlData ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("span", { className: "font-mono text-xs font-semibold text-gray-600", children: control.control_code }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", size: "sm", onClick: () => handleSaveControl(control.id), disabled: updatingControl, children: updatingControl ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-3 w-3 mr-1 animate-spin" }), "Saving..."] })) : (_jsxs(_Fragment, { children: [_jsx(Check, { className: "h-3 w-3 mr-1" }), "Save"] })) }), _jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: handleCancelEditControl, disabled: updatingControl, children: [_jsx(X, { className: "h-3 w-3 mr-1" }), "Cancel"] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Control Name" }), _jsx(Input, { value: editingControlData.name || '', onChange: (e) => setEditingControlData({ ...editingControlData, name: e.target.value }), className: "h-8 text-sm" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Control Type" }), _jsxs(Select, { value: editingControlData.control_type || 'preventive', onValueChange: (value) => setEditingControlData({
                                                                                            ...editingControlData,
                                                                                            control_type: value,
                                                                                        }), children: [_jsx(SelectTrigger, { className: "h-8 text-sm", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "preventive", children: "Preventive" }), _jsx(SelectItem, { value: "detective", children: "Detective" }), _jsx(SelectItem, { value: "corrective", children: "Corrective" })] })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Description" }), _jsx(Textarea, { value: editingControlData.description || '', onChange: (e) => setEditingControlData({
                                                                                    ...editingControlData,
                                                                                    description: e.target.value,
                                                                                }), className: "text-sm h-16" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Target" }), _jsxs(Select, { value: editingControlData.target || 'Likelihood', onValueChange: (value) => setEditingControlData({
                                                                                    ...editingControlData,
                                                                                    target: value,
                                                                                }), children: [_jsx(SelectTrigger, { className: "h-8 text-sm", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Likelihood", children: "Likelihood" }), _jsx(SelectItem, { value: "Impact", children: "Impact" })] })] })] }), _jsxs("div", { className: "border-t pt-3", children: [_jsx("p", { className: "text-xs font-semibold text-gray-700 mb-3", children: "DIME Scores (0-3)" }), _jsxs("div", { className: "grid grid-cols-4 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Design" }), _jsxs(Select, { value: String(editingControlData.design_score ?? 0), onValueChange: (value) => setEditingControlData({
                                                                                                    ...editingControlData,
                                                                                                    design_score: parseInt(value),
                                                                                                }), children: [_jsx(SelectTrigger, { className: "h-8", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0 - None" }), _jsx(SelectItem, { value: "1", children: "1 - Weak" }), _jsx(SelectItem, { value: "2", children: "2 - Adequate" }), _jsx(SelectItem, { value: "3", children: "3 - Strong" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Implementation" }), _jsxs(Select, { value: String(editingControlData.implementation_score ?? 0), onValueChange: (value) => setEditingControlData({
                                                                                                    ...editingControlData,
                                                                                                    implementation_score: parseInt(value),
                                                                                                }), children: [_jsx(SelectTrigger, { className: "h-8", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0 - None" }), _jsx(SelectItem, { value: "1", children: "1 - Weak" }), _jsx(SelectItem, { value: "2", children: "2 - Adequate" }), _jsx(SelectItem, { value: "3", children: "3 - Strong" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Monitoring" }), _jsxs(Select, { value: String(editingControlData.monitoring_score ?? 0), onValueChange: (value) => setEditingControlData({
                                                                                                    ...editingControlData,
                                                                                                    monitoring_score: parseInt(value),
                                                                                                }), children: [_jsx(SelectTrigger, { className: "h-8", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0 - None" }), _jsx(SelectItem, { value: "1", children: "1 - Weak" }), _jsx(SelectItem, { value: "2", children: "2 - Adequate" }), _jsx(SelectItem, { value: "3", children: "3 - Strong" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Evaluation" }), _jsxs(Select, { value: String(editingControlData.evaluation_score ?? 0), onValueChange: (value) => setEditingControlData({
                                                                                                    ...editingControlData,
                                                                                                    evaluation_score: parseInt(value),
                                                                                                }), children: [_jsx(SelectTrigger, { className: "h-8", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "0", children: "0 - None" }), _jsx(SelectItem, { value: "1", children: "1 - Weak" }), _jsx(SelectItem, { value: "2", children: "2 - Adequate" }), _jsx(SelectItem, { value: "3", children: "3 - Strong" })] })] })] })] })] })] })) : (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-xs font-semibold text-gray-600", children: control.control_code }), _jsx("span", { className: "text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize", children: control.control_type || 'N/A' }), _jsxs("span", { className: `text-xs px-2 py-1 rounded-full ${control.target === 'Likelihood'
                                                                                                    ? 'bg-purple-100 text-purple-700'
                                                                                                    : 'bg-orange-100 text-orange-700'}`, children: ["\u2193 ", control.target] })] }), _jsx("h4", { className: "font-semibold text-sm text-gray-900 mt-1", children: control.name }), control.description && (_jsx("p", { className: "text-xs text-gray-600 mt-1", children: control.description }))] }), _jsxs("div", { className: "flex flex-col items-end gap-2", children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: () => handleStartEditControl(control), children: [_jsx(Edit, { className: "h-3 w-3 mr-1" }), "Edit"] }), _jsx(Button, { type: "button", size: "sm", variant: "outline", className: "text-red-600 hover:text-red-700 hover:bg-red-50", onClick: () => handleDeleteControl(control.id, control.name), disabled: deletingControlId === control.id, children: deletingControlId === control.id ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-3 w-3 mr-1 animate-spin" }), "Deleting..."] })) : (_jsxs(_Fragment, { children: [_jsx(Trash2, { className: "h-3 w-3 mr-1" }), "Delete"] })) })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-gray-500 mb-1", children: "Effectiveness" }), _jsxs("p", { className: "text-lg font-bold text-blue-600", children: [effectiveness, "%"] })] })] })] }), _jsxs("div", { className: "grid grid-cols-4 gap-2 pt-2 border-t border-gray-200", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500 mb-1", children: "Design" }), _jsx("div", { className: `inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${(control.design_score || 0) >= 2
                                                                                            ? 'bg-green-100 text-green-700'
                                                                                            : (control.design_score || 0) === 1
                                                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                                                : 'bg-red-100 text-red-700'}`, children: control.design_score ?? '-' })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500 mb-1", children: "Implement" }), _jsx("div", { className: `inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${(control.implementation_score || 0) >= 2
                                                                                            ? 'bg-green-100 text-green-700'
                                                                                            : (control.implementation_score || 0) === 1
                                                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                                                : 'bg-red-100 text-red-700'}`, children: control.implementation_score ?? '-' })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500 mb-1", children: "Monitor" }), _jsx("div", { className: `inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${(control.monitoring_score || 0) >= 2
                                                                                            ? 'bg-green-100 text-green-700'
                                                                                            : (control.monitoring_score || 0) === 1
                                                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                                                : 'bg-red-100 text-red-700'}`, children: control.monitoring_score ?? '-' })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500 mb-1", children: "Evaluate" }), _jsx("div", { className: `inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${(control.evaluation_score || 0) >= 2
                                                                                            ? 'bg-green-100 text-green-700'
                                                                                            : (control.evaluation_score || 0) === 1
                                                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                                                : 'bg-red-100 text-red-700'}`, children: control.evaluation_score ?? '-' })] })] }), _jsx("div", { className: "pt-2 border-t border-gray-200", children: _jsxs("p", { className: "text-xs text-gray-500", children: ["DIME Average: ", _jsx("span", { className: "font-semibold text-gray-700", children: avgDIME }), " / 3.0", _jsx("span", { className: "ml-2 text-gray-400", children: "\u2022" }), _jsx("span", { className: "ml-2", children: "Scale: 0=None, 1=Weak, 2=Adequate, 3=Strong" })] }) })] })) }) }, control.id));
                                                }) })) })] })), editingRisk && (_jsxs(Card, { className: "border-purple-200 bg-purple-50 mt-6", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [_jsx(AlertCircle, { className: "h-5 w-5 text-purple-600" }), "Intelligence Alerts (", intelligenceAlerts.length, ")"] }) }), _jsx(CardContent, { children: loadingAlerts ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin text-purple-600" }), _jsx("span", { className: "ml-2 text-sm text-gray-600", children: "Loading intelligence alerts..." })] })) : intelligenceAlerts.length === 0 ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("p", { className: "text-sm text-gray-600", children: "No intelligence alerts for this risk yet." }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "Intelligence alerts appear when external events are detected that may affect this risk." })] })) : (_jsx("div", { className: "space-y-3", children: intelligenceAlerts.map((alert) => {
                                                    const event = alert.external_events;
                                                    const isExpanded = expandedAlertId === alert.id;
                                                    // Status badge styling
                                                    const statusColors = {
                                                        pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                                                        accepted: 'bg-green-100 text-green-700 border-green-300',
                                                        rejected: 'bg-red-100 text-red-700 border-red-300',
                                                        expired: 'bg-gray-100 text-gray-700 border-gray-300',
                                                    };
                                                    return (_jsx(Card, { className: "bg-white border border-purple-200", children: _jsxs(CardContent, { className: "pt-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: `px-2 py-0.5 text-xs font-semibold rounded-full border ${statusColors[alert.status]}`, children: alert.status.toUpperCase() }), alert.applied_to_risk && (_jsxs("span", { className: "px-2 py-0.5 text-xs font-semibold rounded-full border bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1", children: [_jsx(CheckCircle, { className: "h-3 w-3" }), "Applied"] })), _jsxs("span", { className: "text-xs text-gray-500", children: ["Confidence: ", alert.confidence_score, "%"] })] }), _jsx("h4", { className: "text-sm font-semibold text-gray-900", children: event.title }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Source: ", event.source, " \u2022 ", event.event_type, " \u2022 ", new Date(event.published_date).toLocaleDateString()] })] }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => setExpandedAlertId(isExpanded ? null : alert.id), className: "ml-2", children: isExpanded ? (_jsxs(_Fragment, { children: [_jsx(AlertTriangle, { className: "h-4 w-4 mr-1" }), "Hide Details"] })) : (_jsxs(_Fragment, { children: [_jsx(AlertCircle, { className: "h-4 w-4 mr-1" }), "Show Details"] })) })] }), (alert.likelihood_change !== null && alert.likelihood_change !== 0) ||
                                                                    (alert.impact_change !== null && alert.impact_change !== 0) ? (_jsxs("div", { className: "flex gap-3 mb-3", children: [alert.likelihood_change !== null && alert.likelihood_change !== 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-xs text-gray-600", children: "Likelihood:" }), _jsxs("span", { className: `px-2 py-0.5 text-xs font-semibold rounded ${alert.likelihood_change > 0
                                                                                        ? 'bg-red-100 text-red-700'
                                                                                        : 'bg-green-100 text-green-700'}`, children: [alert.likelihood_change > 0 ? '+' : '', alert.likelihood_change] })] })), alert.impact_change !== null && alert.impact_change !== 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-xs text-gray-600", children: "Impact:" }), _jsxs("span", { className: `px-2 py-0.5 text-xs font-semibold rounded ${alert.impact_change > 0
                                                                                        ? 'bg-red-100 text-red-700'
                                                                                        : 'bg-green-100 text-green-700'}`, children: [alert.impact_change > 0 ? '+' : '', alert.impact_change] })] }))] })) : null, isExpanded && (_jsxs("div", { className: "mt-3 pt-3 border-t border-purple-200 space-y-3", children: [event.summary && (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold text-gray-700 mb-1", children: "Event Summary:" }), _jsx("p", { className: "text-xs text-gray-600", children: event.summary })] })), alert.ai_reasoning && (_jsxs("div", { children: [_jsxs("p", { className: "text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1", children: [_jsx(Sparkles, { className: "h-3 w-3 text-purple-600" }), "AI Analysis:"] }), _jsx("p", { className: "text-xs text-gray-600 bg-purple-50 p-2 rounded border border-purple-200", children: alert.ai_reasoning })] })), event.url && (_jsx("div", { children: _jsx("a", { href: event.url, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-blue-600 hover:text-blue-700 underline", children: "View original source \u2192" }) })), alert.reviewed_by && alert.reviewed_at && (_jsxs("div", { className: "text-xs text-gray-500 pt-2 border-t border-gray-200", children: ["Reviewed on ", new Date(alert.reviewed_at).toLocaleDateString()] }))] }))] }) }, alert.id));
                                                }) })) })] })), editingRisk && editingRisk.risk_code && (_jsx("div", { className: "mt-6", children: _jsx(TreatmentLogViewer, { riskCode: editingRisk.risk_code }) })), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), disabled: loading, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: loading || !selectedCategory || !selectedSubcategory, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), editingRisk ? 'Updating...' : 'Creating...'] })) : (_jsx(_Fragment, { children: editingRisk ? 'Update Risk' : 'Create Risk' })) })] })] })] }) }), _jsx(Dialog, { open: showCustomRootCause, onOpenChange: setShowCustomRootCause, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Add Custom Root Cause" }), _jsx(DialogDescription, { children: "Create a custom root cause for your organization" })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "custom_cause_code", children: "Code *" }), _jsx(Input, { id: "custom_cause_code", placeholder: "e.g., RC-ORG-001", value: customRootCause.cause_code, onChange: (e) => setCustomRootCause({ ...customRootCause, cause_code: e.target.value }), disabled: savingCustom })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "custom_cause_name", children: "Name *" }), _jsx(Input, { id: "custom_cause_name", placeholder: "e.g., Legacy system vulnerability", value: customRootCause.cause_name, onChange: (e) => setCustomRootCause({ ...customRootCause, cause_name: e.target.value }), disabled: savingCustom })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "custom_cause_description", children: "Description" }), _jsx(Textarea, { id: "custom_cause_description", placeholder: "Detailed description of this root cause", value: customRootCause.cause_description, onChange: (e) => setCustomRootCause({ ...customRootCause, cause_description: e.target.value }), disabled: savingCustom, rows: 3 })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "custom_cause_category", children: "Category" }), _jsx(Input, { id: "custom_cause_category", placeholder: "e.g., Technology, Process", value: customRootCause.category, onChange: (e) => setCustomRootCause({ ...customRootCause, category: e.target.value }), disabled: savingCustom })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setShowCustomRootCause(false), disabled: savingCustom, children: "Cancel" }), _jsx(Button, { type: "button", onClick: handleSaveCustomRootCause, disabled: savingCustom, children: savingCustom ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Saving..."] })) : ('Save Custom Root Cause') })] })] }) }), _jsx(Dialog, { open: showCustomImpact, onOpenChange: setShowCustomImpact, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Add Custom Impact" }), _jsx(DialogDescription, { children: "Create a custom impact for your organization" })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "custom_impact_code", children: "Code *" }), _jsx(Input, { id: "custom_impact_code", placeholder: "e.g., IMP-ORG-001", value: customImpact.impact_code, onChange: (e) => setCustomImpact({ ...customImpact, impact_code: e.target.value }), disabled: savingCustom })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "custom_impact_name", children: "Name *" }), _jsx(Input, { id: "custom_impact_name", placeholder: "e.g., Customer data exposure", value: customImpact.impact_name, onChange: (e) => setCustomImpact({ ...customImpact, impact_name: e.target.value }), disabled: savingCustom })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "custom_impact_description", children: "Description" }), _jsx(Textarea, { id: "custom_impact_description", placeholder: "Detailed description of this impact", value: customImpact.impact_description, onChange: (e) => setCustomImpact({ ...customImpact, impact_description: e.target.value }), disabled: savingCustom, rows: 3 })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "custom_impact_category", children: "Category" }), _jsx(Input, { id: "custom_impact_category", placeholder: "e.g., Financial, Operational", value: customImpact.category, onChange: (e) => setCustomImpact({ ...customImpact, category: e.target.value }), disabled: savingCustom })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setShowCustomImpact(false), disabled: savingCustom, children: "Cancel" }), _jsx(Button, { type: "button", onClick: handleSaveCustomImpact, disabled: savingCustom, children: savingCustom ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Saving..."] })) : ('Save Custom Impact') })] })] }) })] }));
}
