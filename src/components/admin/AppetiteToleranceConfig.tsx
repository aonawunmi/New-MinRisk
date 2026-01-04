/**
 * Risk Appetite & Tolerance Configuration
 *
 * Admin interface for configuring:
 * 1. Risk Appetite Statements (Board-approved strategic appetite)
 * 2. Appetite Categories (appetite level per risk category)
 * 3. Tolerance Metrics (quantitative Green/Amber/Red thresholds)
 * 4. Chain Validation (ensures appetite → tolerance → KRI linkage)
 *
 * Regulatory Compliance: CBN, SEC, PENCOM, ISO 31000, COSO ERM
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  validateAppetiteChain,
  approveRiskAppetiteStatement,
  activateToleranceMetric,
  calculateEnterpriseAppetiteStatus,
  type ChainValidationResult,
  type EnterpriseAppetiteStatus
} from '@/lib/appetiteValidation';
import {
  generateAppetiteStatement,
  generateAppetiteCategories,
  generateToleranceMetrics,
  generateCategoryAppetiteStatement,
  generateAppetiteSummaryReport,
  getOrganizationContext,
} from '@/lib/appetiteAI';
import { APPETITE_LEVEL_DEFINITIONS, getAppetiteLevels, type AppetiteLevel } from '@/lib/appetiteDefinitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  Target,
  Gauge,
  FileText,
  Plus,
  Play,
  AlertTriangle,
  Sparkles,
  Loader2,
  Trash2,
  History,
  X,
} from 'lucide-react';

export default function AppetiteToleranceConfig() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validation state
  const [validation, setValidation] = useState<ChainValidationResult | null>(null);
  const [enterpriseStatus, setEnterpriseStatus] = useState<EnterpriseAppetiteStatus | null>(null);

  // Risk Appetite Statement state
  const [statements, setStatements] = useState<any[]>([]);
  const [activeStatement, setActiveStatement] = useState<any | null>(null);
  const [newStatement, setNewStatement] = useState({
    statement_text: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

  // Appetite Categories state
  const [categories, setCategories] = useState<any[]>([]);
  const [riskCategories, setRiskCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState({
    risk_category: '',
    appetite_level: 'MODERATE' as 'ZERO' | 'LOW' | 'MODERATE' | 'HIGH',
    rationale: '',
  });

  // Tolerance Metrics state
  const [metrics, setMetrics] = useState<any[]>([]);
  const [kriList, setKRIList] = useState<any[]>([]);
  const [newMetric, setNewMetric] = useState({
    appetite_category_id: '',
    metric_name: '',
    metric_description: '',
    metric_type: 'MAXIMUM' as 'RANGE' | 'MAXIMUM' | 'MINIMUM' | 'DIRECTIONAL',
    unit: '',
    materiality_type: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL' | 'DUAL',
    green_max: '',
    amber_max: '',
    red_min: '',
    kri_id: '',
  });

  // AI Assistant state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    statement?: string;
    categories?: any[];
    metrics?: any[];
  }>({});
  const [showAiPreview, setShowAiPreview] = useState<'statement' | 'categories' | 'metrics' | null>(null);
  const [summaryReport, setSummaryReport] = useState<string | null>(null);
  const [showSummaryReport, setShowSummaryReport] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      loadAllData();
    }
  }, [profile?.organization_id]);

  async function loadAllData() {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadStatements(),
        loadCategories(),
        loadMetrics(),
        loadRiskCategories(),
        loadKRIList(),
        runValidation(),
      ]);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStatements() {
    const { data, error: stmtError } = await supabase
      .from('risk_appetite_statements')
      .select('*')
      .eq('organization_id', profile!.organization_id)
      .order('version_number', { ascending: false });

    if (stmtError) throw stmtError;
    setStatements(data || []);

    // Use APPROVED statement if exists, otherwise use most recent DRAFT
    // (Allows editing categories on DRAFT after superseding)
    const approved = data?.find(s => s.status === 'APPROVED');
    const latestDraft = data?.find(s => s.status === 'DRAFT');
    setActiveStatement(approved || latestDraft || null);
  }

  async function loadCategories() {
    const { data, error: catError } = await supabase
      .from('risk_appetite_categories')
      .select('*')
      .eq('organization_id', profile!.organization_id);

    if (catError) throw catError;
    setCategories(data || []);
  }

  async function loadMetrics() {
    const { data, error: metricError } = await supabase
      .from('tolerance_metrics')
      .select(`
        *,
        appetite_category:risk_appetite_categories(risk_category, appetite_level)
      `)
      .eq('organization_id', profile!.organization_id)
      .order('created_at', { ascending: false });

    if (metricError) throw metricError;
    setMetrics(data || []);
  }

  async function loadRiskCategories() {
    // Get risk categories from the taxonomy (not from created risks)
    const { data, error: catError } = await supabase
      .from('risk_categories')
      .select('name')
      .order('name', { ascending: true });

    if (catError) throw catError;

    const categoryNames = data?.map(c => c.name) || [];
    setRiskCategories(categoryNames);
  }

  async function loadKRIList() {
    const { data, error: kriError } = await supabase
      .from('kri_kci_library')
      .select('id, indicator_code, indicator_name, indicator_type')
      .eq('organization_id', profile!.organization_id)
      .eq('status', 'active')
      .eq('indicator_type', 'KRI');

    if (kriError) throw kriError;
    setKRIList(data || []);
  }

  async function runValidation() {
    if (!profile?.organization_id) return;

    const result = await validateAppetiteChain(profile.organization_id);
    setValidation(result);

    // Also get enterprise status if chain is valid
    if (result.isValid) {
      const status = await calculateEnterpriseAppetiteStatus(profile.organization_id);
      setEnterpriseStatus(status);
    }
  }

  async function handleCreateStatement() {
    if (!profile || !user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const nextVersion = Math.max(...statements.map(s => s.version_number), 0) + 1;

      const { error: insertError } = await supabase
        .from('risk_appetite_statements')
        .insert({
          organization_id: profile.organization_id,
          version_number: nextVersion,
          statement_text: newStatement.statement_text,
          effective_from: newStatement.effective_from,
          status: 'DRAFT',
          created_by: user.id,
        });

      if (insertError) throw insertError;

      setSuccess('Risk Appetite Statement created successfully!');
      setNewStatement({ statement_text: '', effective_from: new Date().toISOString().split('T')[0] });
      await loadStatements();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error creating statement:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveStatement(statementId: string) {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await approveRiskAppetiteStatement(statementId, user.id);

      if (!result.success) {
        setError(result.error || 'Failed to approve statement');
        return;
      }

      setSuccess('Risk Appetite Statement approved successfully!');
      await loadAllData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error approving statement:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory() {
    if (!profile || !user || !activeStatement) {
      setError('Please create and approve a Risk Appetite Statement first');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: insertError } = await supabase
        .from('risk_appetite_categories')
        .insert({
          statement_id: activeStatement.id,
          organization_id: profile.organization_id,
          risk_category: newCategory.risk_category,
          appetite_level: newCategory.appetite_level,
          rationale: newCategory.rationale,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      setSuccess('Appetite category added successfully!');
      setNewCategory({ risk_category: '', appetite_level: 'MODERATE', rationale: '' });
      await loadCategories();
      await runValidation();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error adding category:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMetric() {
    if (!profile || !user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: insertError } = await supabase
        .from('tolerance_metrics')
        .insert({
          organization_id: profile.organization_id,
          appetite_category_id: newMetric.appetite_category_id,
          metric_name: newMetric.metric_name,
          metric_description: newMetric.metric_description,
          metric_type: newMetric.metric_type,
          unit: newMetric.unit,
          materiality_type: newMetric.materiality_type,
          green_max: newMetric.green_max ? parseFloat(newMetric.green_max) : null,
          amber_max: newMetric.amber_max ? parseFloat(newMetric.amber_max) : null,
          red_min: newMetric.red_min ? parseFloat(newMetric.red_min) : null,
          kri_id: newMetric.kri_id || null,
          is_active: false, // Start inactive until KRI is linked and has data
          created_by: user.id,
        });

      if (insertError) throw insertError;

      setSuccess('Tolerance metric added successfully!');
      setNewMetric({
        appetite_category_id: '',
        metric_name: '',
        metric_description: '',
        metric_type: 'MAXIMUM',
        unit: '',
        materiality_type: 'INTERNAL',
        green_max: '',
        amber_max: '',
        red_min: '',
        kri_id: '',
      });
      await loadMetrics();
      await runValidation();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error adding metric:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleActivateMetric(metricId: string) {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await activateToleranceMetric(metricId, user.id);

      if (!result.success) {
        setError(result.error || 'Failed to activate metric');
        return;
      }

      setSuccess('Tolerance metric activated successfully!');
      await loadMetrics();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error activating metric:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ============================================================================
  // GOVERNANCE-PROOF DELETE & SUPERSEDE HANDLERS
  // ============================================================================

  async function handleDeleteDraftStatement(statementId: string) {
    if (!confirm('Delete this draft statement? This cannot be undone.')) return;

    setSaving(true);
    setError(null);

    try {
      // Check if can delete (should only be DRAFT)
      const { data: canDelete, error: checkError } = await supabase.rpc(
        'can_delete_statement',
        { statement_id: statementId }
      );

      if (checkError) throw checkError;

      if (!canDelete) {
        setError('Cannot delete approved or superseded statements. They may only be superseded.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('risk_appetite_statements')
        .delete()
        .eq('id', statementId);

      if (deleteError) throw deleteError;

      setSuccess('Draft statement deleted successfully');
      await loadStatements();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting statement:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSupersedeStatement(statementId: string) {
    if (!confirm(
      'Supersede this approved statement?\n\n' +
      'This will:\n' +
      '• Mark the current statement as SUPERSEDED\n' +
      '• Create a new DRAFT statement for editing\n' +
      '• Migrate existing categories to the new statement\n' +
      '• Preserve the old statement for audit trail'
    )) return;

    setSaving(true);
    setError(null);

    try {
      // Calculate tomorrow's date for new statement
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const effectiveFrom = tomorrow.toISOString().split('T')[0];

      const { data: newStatementId, error: supersedeError } = await supabase.rpc(
        'supersede_appetite_statement',
        { statement_id: statementId, new_effective_from: effectiveFrom }
      );

      if (supersedeError) throw supersedeError;

      // Migrate existing categories to the new statement
      const { error: migrateError } = await supabase
        .from('risk_appetite_categories')
        .update({ statement_id: newStatementId })
        .eq('statement_id', statementId);

      if (migrateError) {
        console.error('Error migrating categories:', migrateError);
        // Don't fail the whole operation, just warn
      }

      setSuccess('Statement superseded successfully. Categories migrated to new version. Edit the draft statement above.');
      await loadStatements();
      await loadCategories();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error superseding statement:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm(
      'Delete this appetite category?\n\n' +
      'This will also delete any tolerance metrics linked to this category.'
    )) return;

    setSaving(true);
    setError(null);

    try {
      // Check if can delete
      const { data: canDelete, error: checkError } = await supabase.rpc(
        'can_delete_appetite_category',
        { category_id: categoryId }
      );

      if (checkError) throw checkError;

      if (!canDelete) {
        setError('Cannot delete this category. It may be locked (parent statement approved) or has linked metrics.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('risk_appetite_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;

      setSuccess('Category deleted successfully');
      await loadCategories();
      await runValidation();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMetric(metricId: string) {
    if (!confirm(
      'Delete this tolerance metric?\n\n' +
      'Note: Only metrics that have never been activated can be deleted.'
    )) return;

    setSaving(true);
    setError(null);

    try {
      // Check if can delete
      const { data: canDelete, error: checkError } = await supabase.rpc(
        'can_delete_tolerance_metric',
        { metric_id: metricId }
      );

      if (checkError) throw checkError;

      if (!canDelete) {
        setError('Cannot delete this metric. Active or previously activated metrics must be deactivated, not deleted.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('tolerance_metrics')
        .delete()
        .eq('id', metricId);

      if (deleteError) throw deleteError;

      setSuccess('Metric deleted successfully');
      await loadMetrics();
      await runValidation();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting metric:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateMetric(metricId: string) {
    if (!confirm(
      'Deactivate this tolerance metric?\n\n' +
      'This will:\n' +
      '• Mark the metric as inactive\n' +
      '• Set effective_to date to today\n' +
      '• Preserve it for historical breach interpretation\n' +
      '• Allow you to create a new version if needed'
    )) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('tolerance_metrics')
        .update({
          is_active: false,
          effective_to: new Date().toISOString().split('T')[0],
        })
        .eq('id', metricId);

      if (updateError) throw updateError;

      setSuccess('Metric deactivated successfully. It remains visible as a historical record.');
      await loadMetrics();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deactivating metric:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSupersedeMetric(metricId: string) {
    if (!confirm(
      'Create new version of this metric?\n\n' +
      'This will:\n' +
      '• Deactivate the current metric\n' +
      '• Create a new version (inactive) with same thresholds\n' +
      '• You can then edit and activate the new version'
    )) return;

    setSaving(true);
    setError(null);

    try {
      // Calculate tomorrow's date for new metric version
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const effectiveFrom = tomorrow.toISOString().split('T')[0];

      const { data: newMetricId, error: supersedeError } = await supabase.rpc(
        'supersede_tolerance_metric',
        { metric_id: metricId, new_effective_from: effectiveFrom }
      );

      if (supersedeError) throw supersedeError;

      setSuccess('New metric version created successfully. Edit and activate it when ready.');
      await loadMetrics();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error superseding metric:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // AI Assistant Handlers
  async function handleGenerateStatement() {
    if (!profile) return;

    setAiGenerating(true);
    setError(null);

    try {
      const context = await getOrganizationContext(profile.organization_id, supabase);
      const generatedStatement = await generateAppetiteStatement(context);

      setAiSuggestions({ ...aiSuggestions, statement: generatedStatement });
      setNewStatement({ ...newStatement, statement_text: generatedStatement });
      setShowAiPreview('statement');
      setSuccess('AI generated statement! Review and edit before creating.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error generating statement:', err);
      setError('AI generation failed: ' + err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleGenerateCategories() {
    if (!profile) return;

    setAiGenerating(true);
    setError(null);

    try {
      const context = await getOrganizationContext(profile.organization_id, supabase);
      const generatedCategories = await generateAppetiteCategories(context);

      setAiSuggestions({ ...aiSuggestions, categories: generatedCategories });
      setShowAiPreview('categories');
      setSuccess(`AI generated ${generatedCategories.length} category suggestions! Review below.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error generating categories:', err);
      setError('AI generation failed: ' + err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleGenerateMetrics(categoryId: string, categoryName: string, appetiteLevel: string) {
    if (!profile) return;

    setAiGenerating(true);
    setError(null);

    try {
      const context = await getOrganizationContext(profile.organization_id, supabase);
      const generatedMetrics = await generateToleranceMetrics(
        categoryName,
        appetiteLevel as any,
        context
      );

      setAiSuggestions({ ...aiSuggestions, metrics: generatedMetrics });
      setShowAiPreview('metrics');
      setSuccess(`AI generated ${generatedMetrics.length} metric suggestions! Review below.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error generating metrics:', err);
      setError('AI generation failed: ' + err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  /**
   * Generate a category-specific appetite statement using GLOBAL definitions
   * Called when user selects an appetite level for a category
   */
  async function handleGenerateCategoryStatement(riskCategory: string, appetiteLevel: AppetiteLevel) {
    if (!profile || !riskCategory) return;

    setAiGenerating(true);
    setError(null);

    try {
      // Get org name for personalization
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single();

      const statement = await generateCategoryAppetiteStatement(
        riskCategory,
        appetiteLevel,
        org?.name
      );

      // Update the rationale field with the AI-generated statement
      setNewCategory({
        ...newCategory,
        risk_category: riskCategory,
        appetite_level: appetiteLevel,
        rationale: statement,
      });

      setSuccess('AI generated statement! Review and edit before adding.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error generating category statement:', err);
      setError('AI generation failed: ' + err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  /**
   * Generate a summary report of all configured appetite categories
   */
  async function handleGenerateSummaryReport() {
    if (!profile || categories.length === 0) {
      setError('Please configure at least one appetite category first');
      return;
    }

    setAiGenerating(true);
    setError(null);

    try {
      // Get org name
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single();

      // Build category statements array
      const categoryStatements = categories.map((cat: any) => ({
        category: cat.risk_category,
        level: cat.appetite_level as AppetiteLevel,
        statement: cat.rationale || `${cat.appetite_level} appetite for ${cat.risk_category}`,
      }));

      const report = await generateAppetiteSummaryReport(
        org?.name || 'Organization',
        categoryStatements
      );

      setSummaryReport(report);
      setShowSummaryReport(true);
      setSuccess('Summary report generated!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error generating summary report:', err);
      setError('Report generation failed: ' + err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleAcceptAiCategory(category: any) {
    if (!profile || !user || !activeStatement) return;

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('risk_appetite_categories')
        .insert({
          statement_id: activeStatement.id,
          organization_id: profile.organization_id,
          risk_category: category.risk_category,
          appetite_level: category.appetite_level,
          rationale: category.rationale,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      setSuccess(`Added: ${category.risk_category}`);
      await loadCategories();
      await runValidation();

      // Remove from suggestions
      setAiSuggestions({
        ...aiSuggestions,
        categories: aiSuggestions.categories?.filter(c => c.risk_category !== category.risk_category)
      });

      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error accepting category:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptAiMetric(metric: any, categoryId: string) {
    if (!profile || !user) return;

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('tolerance_metrics')
        .insert({
          organization_id: profile.organization_id,
          appetite_category_id: categoryId,
          metric_name: metric.metric_name,
          metric_description: metric.metric_description,
          metric_type: metric.metric_type,
          unit: metric.unit,
          materiality_type: metric.materiality_type,
          green_max: metric.green_max,
          amber_max: metric.amber_max,
          red_min: metric.red_min,
          green_min: metric.green_min,
          amber_min: metric.amber_min,
          red_max: metric.red_max,
          is_active: false,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      setSuccess(`Added: ${metric.metric_name}`);
      await loadMetrics();
      await runValidation();

      // Remove from suggestions
      setAiSuggestions({
        ...aiSuggestions,
        metrics: aiSuggestions.metrics?.filter(m => m.metric_name !== metric.metric_name)
      });

      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error accepting metric:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading appetite & tolerance configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#111827' }}>
          <ShieldAlert style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} size={28} />
          Risk Appetite & Tolerance
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Configure strategic risk appetite and operational tolerance thresholds
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert style={{ marginBottom: '16px', borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
          <AlertCircle style={{ color: '#ef4444' }} size={16} />
          <AlertDescription style={{ color: '#991b1b' }}>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert style={{ marginBottom: '16px', borderColor: '#10b981', backgroundColor: '#f0fdf4' }}>
          <CheckCircle style={{ color: '#10b981' }} size={16} />
          <AlertDescription style={{ color: '#065f46' }}>{success}</AlertDescription>
        </Alert>
      )}

      {/* Chain Validation Status */}
      {validation && (
        <Card style={{ marginBottom: '24px', borderColor: validation.isValid ? '#10b981' : '#f59e0b' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
              {validation.isValid ? (
                <CheckCircle style={{ color: '#10b981' }} size={20} />
              ) : (
                <AlertTriangle style={{ color: '#f59e0b' }} size={20} />
              )}
              Chain Validation Status
            </CardTitle>
            <CardDescription>
              {validation.isValid
                ? 'All chains complete - appetite framework is enforceable'
                : 'Gaps detected - resolve before approval'}
            </CardDescription>
          </CardHeader>
          {!validation.isValid && validation.gaps.length > 0 && (
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {validation.gaps.map((gap, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      borderLeft: gap.severity === 'CRITICAL' ? '4px solid #ef4444' : '4px solid #f59e0b',
                      backgroundColor: gap.severity === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                      {gap.category}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                      {gap.issue}
                    </div>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                      {gap.details}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="statements" style={{ width: '100%' }}>
        <TabsList>
          <TabsTrigger value="statements">
            <FileText size={16} style={{ marginRight: '6px' }} />
            Appetite Statements
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Target size={16} style={{ marginRight: '6px' }} />
            Appetite Categories
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <Gauge size={16} style={{ marginRight: '6px' }} />
            Tolerance Metrics
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Appetite Statements */}
        <TabsContent value="statements">
          <Card>
            <CardHeader>
              <CardTitle>Risk Appetite Statements</CardTitle>
              <CardDescription>
                Board-approved strategic declarations of risk appetite (reviewed annually)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Create New Statement */}
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                    Create New Statement
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateStatement}
                    disabled={aiGenerating || saving}
                    style={{ backgroundColor: '#7c3aed', color: '#ffffff', border: 'none' }}
                  >
                    {aiGenerating ? (
                      <Loader2 size={14} style={{ marginRight: '6px' }} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} style={{ marginRight: '6px' }} />
                    )}
                    AI Assistant
                  </Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <Label htmlFor="statement_text">Statement Text</Label>
                    <Textarea
                      id="statement_text"
                      value={newStatement.statement_text}
                      onChange={(e) => setNewStatement({ ...newStatement, statement_text: e.target.value })}
                      placeholder="Enter Board-approved risk appetite statement... or use AI Assistant above"
                      rows={4}
                    />
                    {showAiPreview === 'statement' && newStatement.statement_text && (
                      <p style={{ fontSize: '12px', color: '#7c3aed', marginTop: '4px' }}>
                        ✨ AI-generated content - Edit as needed before creating
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="effective_from">Effective From</Label>
                    <Input
                      id="effective_from"
                      type="date"
                      value={newStatement.effective_from}
                      onChange={(e) => setNewStatement({ ...newStatement, effective_from: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateStatement} disabled={saving || !newStatement.statement_text}>
                    <Plus size={16} style={{ marginRight: '6px' }} />
                    Create Statement
                  </Button>
                </div>
              </div>

              {/* Existing Statements */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {statements.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>
                    No risk appetite statements yet. Create one above.
                  </p>
                ) : (
                  statements.map((stmt) => (
                    <div
                      key={stmt.id}
                      style={{
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: stmt.status === 'APPROVED' ? '#f0fdf4' : '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: '600', marginRight: '8px' }}>
                            Version {stmt.version_number}
                          </span>
                          <Badge variant={stmt.status === 'APPROVED' ? 'default' : 'secondary'}>
                            {stmt.status}
                          </Badge>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {stmt.status === 'DRAFT' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveStatement(stmt.id)}
                                disabled={saving}
                              >
                                <CheckCircle size={14} style={{ marginRight: '4px' }} />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteDraftStatement(stmt.id)}
                                disabled={saving}
                              >
                                <Trash2 size={14} style={{ marginRight: '4px' }} />
                                Delete Draft
                              </Button>
                            </>
                          )}
                          {stmt.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSupersedeStatement(stmt.id)}
                              disabled={saving}
                            >
                              <FileText size={14} style={{ marginRight: '4px' }} />
                              Supersede & Replace
                            </Button>
                          )}
                        </div>
                      </div>
                      <p style={{ color: '#374151', marginBottom: '8px' }}>
                        {stmt.statement_text}
                      </p>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        Effective: {new Date(stmt.effective_from).toLocaleDateString()}
                        {stmt.approved_date && ` • Approved: ${new Date(stmt.approved_date).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Appetite Categories */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Appetite Categories</CardTitle>
              <CardDescription>
                Define appetite level (ZERO/LOW/MODERATE/HIGH) for each risk category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!activeStatement ? (
                <Alert>
                  <AlertCircle size={16} />
                  <AlertDescription>
                    Please create a Risk Appetite Statement first (Statements tab)
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Add New Category */}
                  <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                        Add Appetite Category
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateSummaryReport}
                          disabled={aiGenerating || saving || categories.length === 0}
                          style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none' }}
                        >
                          {aiGenerating ? (
                            <Loader2 size={14} style={{ marginRight: '6px' }} className="animate-spin" />
                          ) : (
                            <FileText size={14} style={{ marginRight: '6px' }} />
                          )}
                          Generate Summary Report
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateCategories}
                          disabled={aiGenerating || saving}
                          style={{ backgroundColor: '#7c3aed', color: '#ffffff', border: 'none' }}
                        >
                          {aiGenerating ? (
                            <Loader2 size={14} style={{ marginRight: '6px' }} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} style={{ marginRight: '6px' }} />
                          )}
                          AI Generate All
                        </Button>
                      </div>
                    </div>

                    {/* Summary Report Display */}
                    {showSummaryReport && summaryReport && (
                      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #059669' }}>
                        <div className="flex items-center justify-between mb-3">
                          <p style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                            📊 Risk Appetite Summary Report
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowSummaryReport(false)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                        <div
                          className="prose prose-sm max-w-none bg-white p-4 rounded border"
                          dangerouslySetInnerHTML={{ __html: summaryReport.replace(/\n/g, '<br/>').replace(/##/g, '<h3>').replace(/###/g, '<h4>') }}
                        />
                      </div>
                    )}

                    {/* AI Suggestions */}
                    {showAiPreview === 'categories' && aiSuggestions.categories && aiSuggestions.categories.length > 0 && (
                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #7c3aed' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#7c3aed', marginBottom: '12px' }}>
                          ✨ AI Suggestions - Click Accept to add or manually configure below
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
                          {aiSuggestions.categories.map((aiCat, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '12px',
                                backgroundColor: '#ffffff',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                              }}
                            >
                              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                                {aiCat.risk_category}
                              </div>
                              <Badge variant="outline" style={{ marginBottom: '8px' }}>
                                {aiCat.appetite_level}
                              </Badge>
                              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                {aiCat.rationale.substring(0, 80)}...
                              </p>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptAiCategory(aiCat)}
                                disabled={saving}
                                style={{ width: '100%' }}
                              >
                                Accept
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <Label htmlFor="risk_category">Risk Category</Label>
                        <Select
                          value={newCategory.risk_category}
                          onValueChange={(val) => setNewCategory({ ...newCategory, risk_category: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {riskCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="appetite_level">Appetite Level</Label>
                        <Select
                          value={newCategory.appetite_level}
                          onValueChange={(val: AppetiteLevel) => {
                            setNewCategory({ ...newCategory, appetite_level: val });
                            // Auto-generate statement if category is selected
                            if (newCategory.risk_category && val) {
                              handleGenerateCategoryStatement(newCategory.risk_category, val);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAppetiteLevels().map((def) => (
                              <SelectItem key={def.level} value={def.level}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{def.label}</span>
                                  <span className="text-xs text-gray-500 truncate max-w-[300px]">{def.enterpriseMeaning}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {newCategory.appetite_level && (
                          <p className="text-xs text-gray-600 mt-1 italic">
                            "{APPETITE_LEVEL_DEFINITIONS[newCategory.appetite_level]?.enterpriseMeaning}"
                          </p>
                        )}
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor="rationale">Appetite Statement</Label>
                          {aiGenerating && (
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                              <Loader2 size={12} className="animate-spin" />
                              AI generating...
                            </span>
                          )}
                        </div>
                        <Textarea
                          id="rationale"
                          value={newCategory.rationale}
                          onChange={(e) => setNewCategory({ ...newCategory, rationale: e.target.value })}
                          placeholder="Why this appetite level? (or use AI Generate All above)"
                          rows={2}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <Button onClick={handleAddCategory} disabled={saving || !newCategory.risk_category}>
                          <Plus size={16} style={{ marginRight: '6px' }} />
                          Add Category Manually
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Existing Categories */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                    {categories.length === 0 ? (
                      <p style={{ color: '#6b7280', gridColumn: 'span 2', textAlign: 'center', padding: '24px' }}>
                        No appetite categories yet. Add one above.
                      </p>
                    ) : (
                      categories.map((cat) => {
                        const parentStatement = statements.find(s => s.id === cat.statement_id);
                        const canDelete = parentStatement?.status === 'DRAFT';

                        return (
                          <div
                            key={cat.id}
                            style={{
                              padding: '16px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                              <div style={{ fontWeight: '600' }}>
                                {cat.risk_category}
                              </div>
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  disabled={saving}
                                  style={{ padding: '4px', height: 'auto' }}
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </div>
                            <Badge
                              variant={
                                cat.appetite_level === 'ZERO' ? 'destructive' :
                                  cat.appetite_level === 'LOW' ? 'secondary' :
                                    cat.appetite_level === 'MODERATE' ? 'default' :
                                      'outline'
                              }
                            >
                              {cat.appetite_level}
                            </Badge>
                            {cat.rationale && (
                              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                                {cat.rationale}
                              </p>
                            )}
                            {!canDelete && (
                              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px', fontStyle: 'italic' }}>
                                🔒 Locked (parent statement approved)
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Tolerance Metrics */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Tolerance Metrics</CardTitle>
              <CardDescription>
                Configure quantitative thresholds (Green/Amber/Red) linked to KRIs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <Alert>
                  <AlertCircle size={16} />
                  <AlertDescription>
                    Please configure Appetite Categories first
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Add New Metric */}
                  <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                        Add Tolerance Metric
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const selectedCategory = categories.find(c => c.id === newMetric.appetite_category_id);
                          if (selectedCategory) {
                            handleGenerateMetrics(
                              selectedCategory.id,
                              selectedCategory.risk_category,
                              selectedCategory.appetite_level
                            );
                          }
                        }}
                        disabled={aiGenerating || saving || !newMetric.appetite_category_id}
                        style={{ backgroundColor: '#7c3aed', color: '#ffffff', border: 'none' }}
                      >
                        {aiGenerating ? (
                          <Loader2 size={14} style={{ marginRight: '6px' }} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} style={{ marginRight: '6px' }} />
                        )}
                        AI Generate Metrics
                      </Button>
                    </div>

                    {/* AI Suggestions Preview */}
                    {showAiPreview === 'metrics' && aiSuggestions.metrics && aiSuggestions.metrics.length > 0 && (
                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #7c3aed' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#7c3aed', marginBottom: '12px' }}>
                          ✨ AI Suggestions - Click Accept to add or configure manually below
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                          {aiSuggestions.metrics.map((aiMetric, idx) => (
                            <div key={idx} style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                                {aiMetric.metric_name}
                              </div>
                              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                                <Badge variant="outline" style={{ fontSize: '11px' }}>
                                  {aiMetric.metric_type}
                                </Badge>
                                <Badge variant="outline" style={{ fontSize: '11px' }}>
                                  {aiMetric.materiality_type}
                                </Badge>
                              </div>
                              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                {aiMetric.metric_description.substring(0, 100)}...
                              </p>
                              <div style={{ fontSize: '11px', color: '#374151', marginBottom: '8px', fontFamily: 'monospace' }}>
                                {aiMetric.green_max && <div>🟢 Green: ≤ {aiMetric.green_max}{aiMetric.unit}</div>}
                                {aiMetric.amber_max && <div>🟠 Amber: ≤ {aiMetric.amber_max}{aiMetric.unit}</div>}
                                {aiMetric.red_min && <div>🔴 Red: ≥ {aiMetric.red_min}{aiMetric.unit}</div>}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptAiMetric(aiMetric, newMetric.appetite_category_id)}
                                disabled={saving}
                                style={{ width: '100%' }}
                              >
                                Accept
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <Label htmlFor="appetite_category">Appetite Category</Label>
                        <Select
                          value={newMetric.appetite_category_id}
                          onValueChange={(val) => setNewMetric({ ...newMetric, appetite_category_id: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category (or use AI above)" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.risk_category} ({cat.appetite_level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="metric_name">Metric Name</Label>
                        <Input
                          id="metric_name"
                          value={newMetric.metric_name}
                          onChange={(e) => setNewMetric({ ...newMetric, metric_name: e.target.value })}
                          placeholder="e.g., Maximum Credit Exposure"
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <Label htmlFor="metric_description">Description</Label>
                        <Textarea
                          id="metric_description"
                          value={newMetric.metric_description}
                          onChange={(e) => setNewMetric({ ...newMetric, metric_description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="metric_type">Metric Type</Label>
                        <Select
                          value={newMetric.metric_type}
                          onValueChange={(val: any) => setNewMetric({ ...newMetric, metric_type: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MAXIMUM">Maximum (upper limit)</SelectItem>
                            <SelectItem value="MINIMUM">Minimum (lower limit)</SelectItem>
                            <SelectItem value="RANGE">Range (between values)</SelectItem>
                            <SelectItem value="DIRECTIONAL">Directional (trend-based)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Input
                          id="unit"
                          value={newMetric.unit}
                          onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
                          placeholder="e.g., ₦M, %, count"
                        />
                      </div>
                      <div>
                        <Label htmlFor="green_max">Green Max</Label>
                        <Input
                          id="green_max"
                          type="number"
                          value={newMetric.green_max}
                          onChange={(e) => setNewMetric({ ...newMetric, green_max: e.target.value })}
                          placeholder="Safe threshold"
                        />
                      </div>
                      <div>
                        <Label htmlFor="amber_max">Amber Max</Label>
                        <Input
                          id="amber_max"
                          type="number"
                          value={newMetric.amber_max}
                          onChange={(e) => setNewMetric({ ...newMetric, amber_max: e.target.value })}
                          placeholder="Warning threshold"
                        />
                      </div>
                      <div>
                        <Label htmlFor="red_min">Red Min</Label>
                        <Input
                          id="red_min"
                          type="number"
                          value={newMetric.red_min}
                          onChange={(e) => setNewMetric({ ...newMetric, red_min: e.target.value })}
                          placeholder="Critical threshold"
                        />
                      </div>
                      <div>
                        <Label htmlFor="kri_link">Link to KRI (Optional)</Label>
                        <Select
                          value={newMetric.kri_id}
                          onValueChange={(val) => setNewMetric({ ...newMetric, kri_id: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select KRI" />
                          </SelectTrigger>
                          <SelectContent>
                            {kriList.map((kri) => (
                              <SelectItem key={kri.id} value={kri.id}>
                                {kri.indicator_code} - {kri.indicator_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <Button onClick={handleAddMetric} disabled={saving || !newMetric.metric_name || !newMetric.appetite_category_id}>
                          <Plus size={16} style={{ marginRight: '6px' }} />
                          Add Metric Manually
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Existing Metrics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {metrics.length === 0 ? (
                      <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>
                        No tolerance metrics yet. Add one above.
                      </p>
                    ) : (
                      metrics.map((metric) => {
                        const neverActivated = metric.never_activated ?? true;
                        const canDelete = !metric.is_active && neverActivated;
                        const isHistorical = !metric.is_active && !neverActivated;

                        return (
                          <div
                            key={metric.id}
                            style={{
                              padding: '16px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              backgroundColor: metric.is_active ? '#f0fdf4' : isHistorical ? '#fafafa' : '#ffffff',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                              <div>
                                <span style={{ fontWeight: '600', fontSize: '16px' }}>
                                  {metric.metric_name}
                                </span>
                                {metric.version && metric.version > 1 && (
                                  <Badge variant="outline" style={{ marginLeft: '8px', fontSize: '11px' }}>
                                    v{metric.version}
                                  </Badge>
                                )}
                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                  {metric.appetite_category?.risk_category} • {metric.metric_type} • {metric.unit}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {isHistorical && (
                                  <Badge variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <History size={12} />
                                    Historical
                                  </Badge>
                                )}
                                {metric.is_active && (
                                  <>
                                    <Badge variant="default">Active</Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeactivateMetric(metric.id)}
                                      disabled={saving}
                                    >
                                      Deactivate
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSupersedeMetric(metric.id)}
                                      disabled={saving}
                                    >
                                      <FileText size={14} style={{ marginRight: '4px' }} />
                                      Supersede Metric
                                    </Button>
                                  </>
                                )}
                                {!metric.is_active && !isHistorical && metric.kri_id && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleActivateMetric(metric.id)}
                                    disabled={saving}
                                  >
                                    <Play size={14} style={{ marginRight: '4px' }} />
                                    Activate
                                  </Button>
                                )}
                                {!metric.is_active && !isHistorical && (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                                {canDelete && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteMetric(metric.id)}
                                    disabled={saving}
                                  >
                                    <Trash2 size={14} style={{ marginRight: '4px' }} />
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginTop: '12px' }}>
                              <div>
                                <span style={{ color: '#10b981', fontWeight: '600' }}>Green:</span> {' '}
                                ≤ {metric.green_max || 'N/A'}
                              </div>
                              <div>
                                <span style={{ color: '#f59e0b', fontWeight: '600' }}>Amber:</span> {' '}
                                ≤ {metric.amber_max || 'N/A'}
                              </div>
                              <div>
                                <span style={{ color: '#ef4444', fontWeight: '600' }}>Red:</span> {' '}
                                ≥ {metric.red_min || 'N/A'}
                              </div>
                            </div>
                            {metric.metric_description && (
                              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                                {metric.metric_description}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
