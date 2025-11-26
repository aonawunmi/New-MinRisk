/**
 * Organization Settings Component
 *
 * Allows admins to configure organization-wide settings:
 * - Risk matrix size (3x3 or 5x5)
 * - Risk appetite statement
 * - Risk tolerance level
 * - Active period
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getActivePeriod, setActivePeriod, PERIOD_OPTIONS } from '@/lib/periods';
import { getCurrentUserProfile } from '@/lib/profiles';
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
import { AlertCircle, CheckCircle, Settings } from 'lucide-react';

interface RiskConfig {
  id: string;
  organization_id: string;
  matrix_size: number;
  risk_appetite_statement: string | null;
  risk_tolerance_level: string | null;
  active_period: string;
  created_at: string;
  updated_at: string;
}

export default function OrganizationSettings() {
  const [config, setConfig] = useState<RiskConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [matrixSize, setMatrixSize] = useState<number>(5);
  const [riskAppetite, setRiskAppetite] = useState('');
  const [riskTolerance, setRiskTolerance] = useState('');
  const [activePeriod, setActivePeriodState] = useState('Q1 2025');

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
      // Get current user's organization
      const { data: profile } = await getCurrentUserProfile();
      if (!profile) {
        setError('Could not load user profile');
        return;
      }

      // Fetch risk config
      const { data, error: configError } = await supabase
        .from('risk_configs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .single();

      if (configError) {
        console.error('Load config error:', configError);
        setError(configError.message);
        return;
      }

      setConfig(data);
      setMatrixSize(data.matrix_size);
      setRiskAppetite(data.risk_appetite_statement || '');
      setRiskTolerance(data.risk_tolerance_level || '');
      setActivePeriodState(data.active_period);
    } catch (err: any) {
      console.error('Unexpected error loading config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update risk_configs
      const { error: updateError } = await supabase
        .from('risk_configs')
        .update({
          matrix_size: matrixSize,
          risk_appetite_statement: riskAppetite || null,
          risk_tolerance_level: riskTolerance || null,
          active_period: activePeriod,
        })
        .eq('id', config.id);

      if (updateError) throw updateError;

      setSuccess('Settings saved successfully');
      await loadConfig();
    } catch (err: any) {
      console.error('Save settings error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Could not load organization settings. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Configure risk management settings for your organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Risk Matrix Size */}
            <div className="space-y-2">
              <Label htmlFor="matrix-size">Risk Matrix Size</Label>
              <Select
                value={matrixSize.toString()}
                onValueChange={(value) => setMatrixSize(parseInt(value))}
              >
                <SelectTrigger id="matrix-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5×5 Matrix (Standard)</SelectItem>
                  <SelectItem value="6">6×6 Matrix (Advanced)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                Determines the granularity of likelihood and impact assessments
              </p>
            </div>

            {/* Active Period */}
            <div className="space-y-2">
              <Label htmlFor="active-period">Active Period</Label>
              <Select
                value={activePeriod}
                onValueChange={(value) => setActivePeriodState(value)}
              >
                <SelectTrigger id="active-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                The current period for risk register entries
              </p>
            </div>

            {/* Risk Appetite Statement */}
            <div className="space-y-2">
              <Label htmlFor="risk-appetite">
                Risk Appetite Statement (Optional)
              </Label>
              <Textarea
                id="risk-appetite"
                value={riskAppetite}
                onChange={(e) => setRiskAppetite(e.target.value)}
                placeholder="Define the level and type of risk your organization is willing to accept..."
                rows={4}
              />
              <p className="text-sm text-gray-600">
                High-level statement defining the organization's willingness to
                take on risk
              </p>
            </div>

            {/* Risk Tolerance Level */}
            <div className="space-y-2">
              <Label htmlFor="risk-tolerance">
                Risk Tolerance Level (Optional)
              </Label>
              <Textarea
                id="risk-tolerance"
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(e.target.value)}
                placeholder="Specify specific thresholds and limits for acceptable risk levels..."
                rows={4}
              />
              <p className="text-sm text-gray-600">
                Specific, measurable thresholds for different risk categories
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving} size="lg">
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Configuration ID:</p>
              <p className="font-mono text-xs">{config.id}</p>
            </div>
            <div>
              <p className="text-gray-600">Organization ID:</p>
              <p className="font-mono text-xs">{config.organization_id}</p>
            </div>
            <div>
              <p className="text-gray-600">Created:</p>
              <p>{new Date(config.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Updated:</p>
              <p>{new Date(config.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
