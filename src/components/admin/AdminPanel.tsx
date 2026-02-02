import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import TaxonomyManagement from './TaxonomyManagement';
import UserManagement from './UserManagement';
import OrganizationSettings from './OrganizationSettings';
import RiskConfiguration from './RiskConfiguration';
import AppetiteToleranceConfig from './AppetiteToleranceConfig';
import PeriodManagement from './PeriodManagement';
import AuditTrail from './AuditTrail';
import HelpTab from './HelpTab';
import OwnerMappingTool from './OwnerMappingTool';
import DataCleanup from './DataCleanup';
import LibraryGenerator from './LibraryGenerator';
import LibrarySetupAlert from './LibrarySetupAlert';
import { OrganizationManagement } from './OrganizationManagement';
import ActiveSessions from './ActiveSessions';
import PlatformMetrics from './PlatformMetrics';
import PlanBuilder from './PlanBuilder';
import PlatformAuditTrail from './PlatformAuditTrail';
import RegulatorManagement from './RegulatorManagement';
import PlatformUserManagement from './PlatformUserManagement';

export default function AdminPanel() {
  const { user, profile } = useAuth();

  const [hasUnmappedOwners, setHasUnmappedOwners] = useState(false);
  const [checkingOwners, setCheckingOwners] = useState(true);

  // CRITICAL: Strict role check - ONLY 'super_admin' role gets platform tabs
  const isSuperAdmin = useMemo(() => {
    return profile?.role === 'super_admin';
  }, [profile?.role]);

  // Set default tab based on role - update when role changes
  const [activeTab, setActiveTab] = useState('taxonomy');

  useEffect(() => {
    // When profile loads, set appropriate default tab
    if (profile?.role === 'super_admin') {
      setActiveTab('organizations');
    } else if (profile) {
      setActiveTab('taxonomy');
    }
  }, [profile?.role]);

  // Check if there are any unmapped owners (only for non-super-admins)
  useEffect(() => {
    async function checkLegacyOwners() {
      // Super admins don't need this check
      if (isSuperAdmin) {
        setCheckingOwners(false);
        return;
      }

      if (!profile?.organization_id) return;

      try {
        const { count, error } = await supabase
          .from('risks')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .is('owner_id', null);

        if (!error && count !== null) {
          setHasUnmappedOwners(count > 0);
        }
      } catch (err) {
        console.error('Error checking legacy owners:', err);
      } finally {
        setCheckingOwners(false);
      }
    }

    checkLegacyOwners();
  }, [profile?.organization_id, isSuperAdmin]);

  // Build tabs dynamically based on role using useMemo for stability
  const tabs = useMemo(() => {
    // STRICTLY check for super_admin role
    if (profile?.role === 'super_admin') {
      return [
        { id: 'organizations', label: 'Organizations' },
        { id: 'regulators', label: 'Regulators' },
        { id: 'platform-users', label: 'Platform Users' },
        { id: 'plans', label: 'Plans & Pricing' },
        { id: 'metrics', label: 'Platform Metrics' },
        { id: 'sessions', label: 'Active Sessions' },
        { id: 'platform-audit', label: 'Audit Trail' },
        { id: 'help', label: 'Help' },
      ];
    }

    // ALL other roles (primary_admin, admin, user) see org-specific tabs
    return [
      { id: 'taxonomy', label: 'Risk Taxonomy' },
      { id: 'configuration', label: 'Risk Configuration' },
      { id: 'appetite', label: 'Appetite & Tolerance' },
      { id: 'library', label: 'Library Setup' },
      { id: 'users', label: 'User Management' },
      ...(hasUnmappedOwners ? [{ id: 'owner-mapping', label: 'Owner Mapping' }] : []),
      { id: 'periods', label: 'Period Management' },
      { id: 'audit', label: 'Audit Trail' },
      { id: 'help', label: 'Help' },
      { id: 'settings', label: 'Organization Settings' },
    ];
  }, [profile?.role, hasUnmappedOwners]);

  // Loading state - don't render tabs until profile is loaded
  if (!profile) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Loading admin panel...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '0' }}>
      {/* Only show library alert for non-super-admins */}
      {!isSuperAdmin && (
        <LibrarySetupAlert onNavigateToLibrary={() => setActiveTab('library')} />
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px',
        overflowX: 'auto',
        flexWrap: 'nowrap'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
              color: activeTab === tab.id ? '#7c3aed' : '#6b7280',
              fontWeight: activeTab === tab.id ? '600' : '400',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = '#374151';
                e.currentTarget.style.borderBottom = '2px solid #d1d5db';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.borderBottom = '2px solid transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content - Super Admin tabs */}
      {isSuperAdmin && (
        <div>
          {activeTab === 'organizations' && <OrganizationManagement />}
          {activeTab === 'regulators' && <RegulatorManagement />}
          {activeTab === 'platform-users' && <PlatformUserManagement />}
          {activeTab === 'plans' && <PlanBuilder />}
          {activeTab === 'metrics' && <PlatformMetrics />}
          {activeTab === 'sessions' && <ActiveSessions />}
          {activeTab === 'platform-audit' && <PlatformAuditTrail />}
          {activeTab === 'help' && <HelpTab />}
        </div>
      )}

      {/* Tab Content - Regular Admin tabs */}
      {!isSuperAdmin && (
        <div>
          {activeTab === 'taxonomy' && <TaxonomyManagement />}
          {activeTab === 'configuration' && <RiskConfiguration />}
          {activeTab === 'appetite' && <AppetiteToleranceConfig />}
          {activeTab === 'library' && <LibraryGenerator />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'owner-mapping' && hasUnmappedOwners && <OwnerMappingTool />}
          {activeTab === 'periods' && user && profile && (
            <PeriodManagement orgId={profile.organization_id} userId={user.id} />
          )}
          {activeTab === 'audit' && <AuditTrail />}
          {activeTab === 'help' && <HelpTab />}
          {activeTab === 'settings' && (
            <>
              <OrganizationSettings />
              <div style={{ marginTop: '24px' }}>
                <DataCleanup />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
