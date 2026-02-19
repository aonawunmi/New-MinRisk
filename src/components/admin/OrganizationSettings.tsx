/**
 * Organization Settings Component
 *
 * Displays system information for the organization.
 * Allows primary admin to set/change institution type.
 *
 * Note: Risk matrix, appetite, and tolerance settings are managed in dedicated tabs:
 * - Risk Configuration: Matrix size, likelihood/impact labels
 * - Appetite & Tolerance: Category-level appetite and tolerance settings
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserProfile } from '@/lib/profiles';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Settings, Building, Building2, Shield, CheckCircle } from 'lucide-react';
import LogoUploader from './LogoUploader';
import {
  getInstitutionTypes,
  getOrganizationInstitutionType,
  setOrganizationInstitutionType,
  type InstitutionType,
  type Regulator,
} from '@/lib/institutionTypes';

interface OrgConfig {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export default function OrganizationSettings() {
  const [config, setConfig] = useState<OrgConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Institution type state
  const [currentInstitutionType, setCurrentInstitutionType] = useState<InstitutionType | null>(null);
  const [mappedRegulators, setMappedRegulators] = useState<Regulator[]>([]);
  const [allInstitutionTypes, setAllInstitutionTypes] = useState<InstitutionType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [savingType, setSavingType] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    setError(null);

    try {
      const { data: profile } = await getCurrentUserProfile();
      if (!profile) {
        setError('Could not load user profile');
        return;
      }

      setOrgId(profile.organization_id);

      // Load config, logo, institution types in parallel
      const [configResult, orgResult, typesResult, orgTypeResult] = await Promise.all([
        supabase
          .from('risk_configs')
          .select('id, organization_id, created_at, updated_at')
          .eq('organization_id', profile.organization_id)
          .single(),
        supabase
          .from('organizations')
          .select('logo_url')
          .eq('id', profile.organization_id)
          .single(),
        getInstitutionTypes(true),
        getOrganizationInstitutionType(profile.organization_id),
      ]);

      if (!configResult.error) {
        setConfig(configResult.data);
      }

      if (orgResult.data) {
        setLogoUrl(orgResult.data.logo_url);
      }

      if (typesResult.data) {
        setAllInstitutionTypes(typesResult.data);
      }

      if (orgTypeResult.data) {
        setCurrentInstitutionType(orgTypeResult.data.institutionType);
        setMappedRegulators(orgTypeResult.data.regulators);
        if (orgTypeResult.data.institutionType) {
          setSelectedTypeId(orgTypeResult.data.institutionType.id);
        }
      }
    } catch (err: any) {
      console.error('Unexpected error loading config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveInstitutionType() {
    if (!orgId || !selectedTypeId) return;

    setSavingType(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: saveError } = await setOrganizationInstitutionType(orgId, selectedTypeId);
      if (saveError) throw saveError;

      setSuccess('Institution type updated successfully');

      // Reload to get updated regulators
      const { data: orgTypeData } = await getOrganizationInstitutionType(orgId);
      if (orgTypeData) {
        setCurrentInstitutionType(orgTypeData.institutionType);
        setMappedRegulators(orgTypeData.regulators);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingType(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  if (!config && !logoUrl && !loading && error) {
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
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Institution Type Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Institution Type</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select your institution type to receive tailored risk intelligence and regulatory context.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current type display */}
            {currentInstitutionType && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{currentInstitutionType.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Category: {currentInstitutionType.category}
                    </p>
                    {currentInstitutionType.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentInstitutionType.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Current
                  </Badge>
                </div>
              </div>
            )}

            {/* Mapped regulators */}
            {mappedRegulators.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Applicable Regulators
                </p>
                <div className="flex flex-wrap gap-2">
                  {mappedRegulators.map((reg) => (
                    <Badge key={reg.id} variant="outline">
                      {reg.code} - {reg.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Selector */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select institution type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allInstitutionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSaveInstitutionType}
                disabled={savingType || !selectedTypeId || selectedTypeId === currentInstitutionType?.id}
              >
                {savingType ? 'Saving...' : 'Update Type'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Building className="h-6 w-6 text-white" />
            </div>
            <CardTitle>Branding & Customization</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <LogoUploader
            currentLogoUrl={logoUrl}
            onLogoUpdated={setLogoUrl}
          />
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <CardTitle>System Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Configuration ID:</p>
              <p className="font-mono text-xs">{config?.id || '-'}</p>
            </div>
            <div>
              <p className="text-gray-600">Organization ID:</p>
              <p className="font-mono text-xs">{config?.organization_id || orgId || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-gray-600">Created:</p>
              <p>{config ? new Date(config.created_at).toLocaleString() : '-'}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Updated:</p>
              <p>{config ? new Date(config.updated_at).toLocaleString() : '-'}</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> Risk matrix configuration is managed in the{' '}
              <span className="font-medium text-purple-600">Risk Configuration</span> tab.
              Appetite and tolerance settings are in the{' '}
              <span className="font-medium text-purple-600">Appetite & Tolerance</span> tab.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
