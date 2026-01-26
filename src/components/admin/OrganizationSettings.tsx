/**
 * Organization Settings Component
 *
 * Displays system information for the organization.
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
import { AlertCircle, Settings, Building } from 'lucide-react';
import LogoUploader from './LogoUploader';

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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

      const { data, error: configError } = await supabase
        .from('risk_configs')
        .select('id, organization_id, created_at, updated_at')
        .eq('organization_id', profile.organization_id)
        .single();

      if (configError) {
        console.error('Load config error:', configError);
        // Don't error out completely if config missing (might be new org)
      } else {
        setConfig(data);
      }

      // Load Org Details (Logo)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('logo_url')
        .eq('id', profile.organization_id)
        .single();

      if (orgData) {
        setLogoUrl(orgData.logo_url);
      }
    } catch (err: any) {
      console.error('Unexpected error loading config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  // Allow render if at least we loaded something or error
  // But strictly config might be missing?
  // We'll show partial UI if config missing but loading done

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
              <p className="font-mono text-xs">{config.id}</p>
            </div>
            <div>
              <p className="text-gray-600">Organization ID:</p>
              <p className="font-mono text-xs">{config?.organization_id || 'Loading...'}</p>
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
