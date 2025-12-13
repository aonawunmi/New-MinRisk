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
  TrendingUp,
  FileText,
  Plus,
  X,
  Play,
  AlertTriangle,
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

    const active = data?.find(s => s.status === 'APPROVED');
    setActiveStatement(active || null);
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
    // Get unique risk categories from risks table
    const { data, error: riskError } = await supabase
      .from('risks')
      .select('category')
      .eq('organization_id', profile!.organization_id)
      .eq('is_active', true);

    if (riskError) throw riskError;

    const uniqueCategories = [...new Set(data?.map(r => r.category) || [])];
    setRiskCategories(uniqueCategories.filter(Boolean) as string[]);
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
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Create New Statement
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <Label htmlFor="statement_text">Statement Text</Label>
                    <Textarea
                      id="statement_text"
                      value={newStatement.statement_text}
                      onChange={(e) => setNewStatement({ ...newStatement, statement_text: e.target.value })}
                      placeholder="Enter Board-approved risk appetite statement..."
                      rows={4}
                    />
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
                        {stmt.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveStatement(stmt.id)}
                            disabled={saving}
                          >
                            <CheckCircle size={14} style={{ marginRight: '4px' }} />
                            Approve
                          </Button>
                        )}
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
                    Please create and approve a Risk Appetite Statement first
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Add New Category */}
                  <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                      Add Appetite Category
                    </h3>
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
                          onValueChange={(val: any) => setNewCategory({ ...newCategory, appetite_level: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ZERO">ZERO</SelectItem>
                            <SelectItem value="LOW">LOW</SelectItem>
                            <SelectItem value="MODERATE">MODERATE</SelectItem>
                            <SelectItem value="HIGH">HIGH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <Label htmlFor="rationale">Rationale</Label>
                        <Textarea
                          id="rationale"
                          value={newCategory.rationale}
                          onChange={(e) => setNewCategory({ ...newCategory, rationale: e.target.value })}
                          placeholder="Why this appetite level?"
                          rows={2}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <Button onClick={handleAddCategory} disabled={saving || !newCategory.risk_category}>
                          <Plus size={16} style={{ marginRight: '6px' }} />
                          Add Category
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
                      categories.map((cat) => (
                        <div
                          key={cat.id}
                          style={{
                            padding: '16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                            {cat.risk_category}
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
                        </div>
                      ))
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
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                      Add Tolerance Metric
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <Label htmlFor="appetite_category">Appetite Category</Label>
                        <Select
                          value={newMetric.appetite_category_id}
                          onValueChange={(val) => setNewMetric({ ...newMetric, appetite_category_id: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
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
                          Add Metric
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
                      metrics.map((metric) => (
                        <div
                          key={metric.id}
                          style={{
                            padding: '16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            backgroundColor: metric.is_active ? '#f0fdf4' : '#ffffff',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <div>
                              <span style={{ fontWeight: '600', fontSize: '16px' }}>
                                {metric.metric_name}
                              </span>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                {metric.appetite_category?.risk_category} • {metric.metric_type} • {metric.unit}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Badge variant={metric.is_active ? 'default' : 'secondary'}>
                                {metric.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {!metric.is_active && metric.kri_id && (
                                <Button
                                  size="sm"
                                  onClick={() => handleActivateMetric(metric.id)}
                                  disabled={saving}
                                >
                                  <Play size={14} style={{ marginRight: '4px' }} />
                                  Activate
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
                      ))
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
