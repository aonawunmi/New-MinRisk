/**
 * Risk Configuration Component
 *
 * Allows admins to configure:
 * - Divisions and Departments (organizational structure)
 * - Likelihood and Impact labels (numeric-to-text mapping)
 * - Matrix size (5x5 or 6x6)
 *
 * Note: Risk categories are managed via Risk Taxonomy (Admin > Risk Taxonomy tab)
 */

import { useState, useEffect } from 'react';
import {
  getOrganizationConfig,
  updateOrganizationConfig,
  resetToDefaultLabels,
  DEFAULT_5X5_LIKELIHOOD_LABELS,
  DEFAULT_5X5_IMPACT_LABELS,
  DEFAULT_6X6_LIKELIHOOD_LABELS,
  DEFAULT_6X6_IMPACT_LABELS,
  DEFAULT_DIME_DESCRIPTIONS,
  type OrganizationConfig,
  type LikelihoodLabels,
  type ImpactLabels,
  type DIMEDescriptions,
} from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Settings,
  Plus,
  X,
  RotateCcw,
  Building2,
  Tag,
  Shield,
} from 'lucide-react';

export default function RiskConfiguration() {
  const [config, setConfig] = useState<OrganizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [matrixSize, setMatrixSize] = useState<5 | 6>(5);
  const [likelihoodLabels, setLikelihoodLabels] = useState<LikelihoodLabels>(DEFAULT_5X5_LIKELIHOOD_LABELS);
  const [impactLabels, setImpactLabels] = useState<ImpactLabels>(DEFAULT_5X5_IMPACT_LABELS);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [dimeDescriptions, setDimeDescriptions] = useState<DIMEDescriptions>(DEFAULT_DIME_DESCRIPTIONS);

  // New item inputs
  const [newDivision, setNewDivision] = useState('');
  const [newDepartment, setNewDepartment] = useState('');

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    setError(null);

    try {
      const { data, error: configError } = await getOrganizationConfig();

      if (configError) {
        console.error('Load config error:', configError);
        setError(configError.message);
        return;
      }

      if (data) {
        setConfig(data);
        setMatrixSize(data.matrix_size);
        setLikelihoodLabels(data.likelihood_labels);
        setImpactLabels(data.impact_labels);
        setDivisions(data.divisions || []);
        setDepartments(data.departments || []);
        setDimeDescriptions(data.dime_descriptions || DEFAULT_DIME_DESCRIPTIONS);
      }
    } catch (err: any) {
      console.error('Unexpected error loading config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await updateOrganizationConfig({
        matrix_size: matrixSize,
        likelihood_labels: likelihoodLabels,
        impact_labels: impactLabels,
        divisions,
        departments,
        dime_descriptions: dimeDescriptions,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess('Configuration saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await loadConfig();
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetLabels() {
    if (!confirm('Reset likelihood and impact labels to default values?')) {
      return;
    }

    const defaults = matrixSize === 5
      ? {
        likelihood: DEFAULT_5X5_LIKELIHOOD_LABELS,
        impact: DEFAULT_5X5_IMPACT_LABELS,
      }
      : {
        likelihood: DEFAULT_6X6_LIKELIHOOD_LABELS,
        impact: DEFAULT_6X6_IMPACT_LABELS,
      };

    setLikelihoodLabels(defaults.likelihood);
    setImpactLabels(defaults.impact);
    setSuccess('Labels reset to defaults. Click Save to apply changes.');
    setTimeout(() => setSuccess(null), 3000);
  }

  function handleMatrixSizeChange(size: '5' | '6') {
    const newSize = parseInt(size) as 5 | 6;
    setMatrixSize(newSize);

    // Update labels to match matrix size
    if (newSize === 5) {
      setLikelihoodLabels(DEFAULT_5X5_LIKELIHOOD_LABELS);
      setImpactLabels(DEFAULT_5X5_IMPACT_LABELS);
    } else {
      setLikelihoodLabels(DEFAULT_6X6_LIKELIHOOD_LABELS);
      setImpactLabels(DEFAULT_6X6_IMPACT_LABELS);
    }
  }

  function updateLikelihoodLabel(level: string, value: string) {
    setLikelihoodLabels({ ...likelihoodLabels, [level]: value });
  }

  function updateImpactLabel(level: string, value: string) {
    setImpactLabels({ ...impactLabels, [level]: value });
  }

  function addDivision() {
    if (newDivision.trim() && !divisions.includes(newDivision.trim())) {
      setDivisions([...divisions, newDivision.trim()]);
      setNewDivision('');
    }
  }

  function removeDivision(division: string) {
    setDivisions(divisions.filter(d => d !== division));
  }

  function addDepartment() {
    if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      setDepartments([...departments, newDepartment.trim()]);
      setNewDepartment('');
    }
  }

  function removeDepartment(department: string) {
    setDepartments(departments.filter(d => d !== department));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Risk Configuration
        </h2>
        <p className="text-gray-600 mt-1">
          Configure organizational structure and risk assessment parameters
        </p>
      </div>

      {/* Feedback */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Tabs defaultValue="structure" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="structure">
            <Building2 className="h-4 w-4 mr-2" />
            Organizational Structure
          </TabsTrigger>
          <TabsTrigger value="labels">
            <Tag className="h-4 w-4 mr-2" />
            Risk Labels
          </TabsTrigger>
          <TabsTrigger value="dime">
            <Shield className="h-4 w-4 mr-2" />
            DIME Framework
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Organizational Structure */}
        <TabsContent value="structure" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Divisions</CardTitle>
              <CardDescription>
                Define the divisions in your organization. These will appear as dropdown options when creating risks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter division name..."
                  value={newDivision}
                  onChange={(e) => setNewDivision(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDivision()}
                />
                <Button onClick={addDivision} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {divisions.map((division) => (
                  <Badge key={division} variant="secondary" className="text-sm py-1 px-3">
                    {division}
                    <X
                      className="h-3 w-3 ml-2 cursor-pointer hover:text-red-600"
                      onClick={() => removeDivision(division)}
                    />
                  </Badge>
                ))}
                {divisions.length === 0 && (
                  <p className="text-sm text-gray-500">No divisions defined</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Define the departments in your organization. These will appear as dropdown options when creating risks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter department name..."
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
                />
                <Button onClick={addDepartment} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((department) => (
                  <Badge key={department} variant="secondary" className="text-sm py-1 px-3">
                    {department}
                    <X
                      className="h-3 w-3 ml-2 cursor-pointer hover:text-red-600"
                      onClick={() => removeDepartment(department)}
                    />
                  </Badge>
                ))}
                {departments.length === 0 && (
                  <p className="text-sm text-gray-500">No departments defined</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Risk Labels */}
        <TabsContent value="labels" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Matrix Configuration</CardTitle>
              <CardDescription>
                Choose your risk matrix size and customize likelihood/impact labels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Matrix Size */}
              <div className="space-y-2">
                <Label>Matrix Size</Label>
                <Select value={matrixSize.toString()} onValueChange={handleMatrixSizeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5x5 Matrix</SelectItem>
                    <SelectItem value="6">6x6 Matrix</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Changing matrix size will reset all labels to defaults
                </p>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleResetLabels}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>

              {/* Likelihood Labels */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Likelihood Labels</Label>
                <div className="grid gap-3">
                  {Array.from({ length: matrixSize }, (_, i) => i + 1).map((level) => (
                    <div key={`likelihood-${level}`} className="flex items-center gap-3">
                      <span className="w-12 text-sm font-medium text-gray-600">{level}:</span>
                      <Input
                        value={likelihoodLabels[level.toString() as keyof LikelihoodLabels] || ''}
                        onChange={(e) => updateLikelihoodLabel(level.toString(), e.target.value)}
                        placeholder={`Likelihood level ${level}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Labels */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Impact Labels</Label>
                <div className="grid gap-3">
                  {Array.from({ length: matrixSize }, (_, i) => i + 1).map((level) => (
                    <div key={`impact-${level}`} className="flex items-center gap-3">
                      <span className="w-12 text-sm font-medium text-gray-600">{level}:</span>
                      <Input
                        value={impactLabels[level.toString() as keyof ImpactLabels] || ''}
                        onChange={(e) => updateImpactLabel(level.toString(), e.target.value)}
                        placeholder={`Impact level ${level}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: DIME Framework */}
        <TabsContent value="dime" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>DIME Framework Labels</CardTitle>
                  <CardDescription>
                    Customize the labels used for control effectiveness scoring (Design, Implementation, Monitoring, Evaluation)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDimeDescriptions(DEFAULT_DIME_DESCRIPTIONS)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Design Dimension */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Design (D)</Label>
                <p className="text-sm text-gray-600">How well the control addresses the risk</p>
                <div className="grid gap-3">
                  {(['0', '1', '2', '3'] as const).map((score) => (
                    <div key={`design-${score}`} className="flex items-center gap-3">
                      <span className="w-8 text-sm font-medium text-gray-600">{score}:</span>
                      <Input
                        value={dimeDescriptions.design[score]?.label || ''}
                        onChange={(e) => setDimeDescriptions({
                          ...dimeDescriptions,
                          design: {
                            ...dimeDescriptions.design,
                            [score]: { ...dimeDescriptions.design[score], label: e.target.value }
                          }
                        })}
                        placeholder={`Label for score ${score}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Implementation Dimension */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">Implementation (I)</Label>
                <p className="text-sm text-gray-600">How consistently the control is applied</p>
                <div className="grid gap-3">
                  {(['0', '1', '2', '3'] as const).map((score) => (
                    <div key={`impl-${score}`} className="flex items-center gap-3">
                      <span className="w-8 text-sm font-medium text-gray-600">{score}:</span>
                      <Input
                        value={dimeDescriptions.implementation[score]?.label || ''}
                        onChange={(e) => setDimeDescriptions({
                          ...dimeDescriptions,
                          implementation: {
                            ...dimeDescriptions.implementation,
                            [score]: { ...dimeDescriptions.implementation[score], label: e.target.value }
                          }
                        })}
                        placeholder={`Label for score ${score}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Monitoring Dimension */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">Monitoring (M)</Label>
                <p className="text-sm text-gray-600">How actively the control is monitored</p>
                <div className="grid gap-3">
                  {(['0', '1', '2', '3'] as const).map((score) => (
                    <div key={`mon-${score}`} className="flex items-center gap-3">
                      <span className="w-8 text-sm font-medium text-gray-600">{score}:</span>
                      <Input
                        value={dimeDescriptions.monitoring[score]?.label || ''}
                        onChange={(e) => setDimeDescriptions({
                          ...dimeDescriptions,
                          monitoring: {
                            ...dimeDescriptions.monitoring,
                            [score]: { ...dimeDescriptions.monitoring[score], label: e.target.value }
                          }
                        })}
                        placeholder={`Label for score ${score}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Evaluation Dimension */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">Evaluation (E)</Label>
                <p className="text-sm text-gray-600">How regularly control effectiveness is evaluated</p>
                <div className="grid gap-3">
                  {(['0', '1', '2', '3'] as const).map((score) => (
                    <div key={`eval-${score}`} className="flex items-center gap-3">
                      <span className="w-8 text-sm font-medium text-gray-600">{score}:</span>
                      <Input
                        value={dimeDescriptions.evaluation[score]?.label || ''}
                        onChange={(e) => setDimeDescriptions({
                          ...dimeDescriptions,
                          evaluation: {
                            ...dimeDescriptions.evaluation,
                            [score]: { ...dimeDescriptions.evaluation[score], label: e.target.value }
                          }
                        })}
                        placeholder={`Label for score ${score}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={loadConfig} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
