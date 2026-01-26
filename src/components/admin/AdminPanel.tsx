import { useState, useEffect } from 'react';
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

export default function AdminPanel() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('taxonomy');

  const [hasUnmappedOwners, setHasUnmappedOwners] = useState(false);
  const [checkingOwners, setCheckingOwners] = useState(true);

  // Check if there are any unmapped owners
  useEffect(() => {
    async function checkLegacyOwners() {
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
  }, [profile?.organization_id]);

  // Check if user is super_admin
  const isSuperAdmin = profile?.role === 'super_admin';

  // Build tabs dynamically
  const tabs = [
    // Super Admin only tabs
    ...(isSuperAdmin ? [{ id: 'organizations', label: 'Organizations' }] : []),
    { id: 'taxonomy', label: 'Risk Taxonomy' },
    { id: 'configuration', label: 'Risk Configuration' },
    { id: 'appetite', label: 'Appetite & Tolerance' },
    { id: 'library', label: 'Library Setup' },
    { id: 'users', label: 'User Management' },
    ...(hasUnmappedOwners ? [{ id: 'owner-mapping', label: 'Owner Mapping' }] : []),
    { id: 'periods', label: 'Period Management' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'help', label: 'Help' },
    ...(isSuperAdmin ? [] : [{ id: 'settings', label: 'Organization Settings' }]),
  ];

  return (
    <div style={{ width: '100%', padding: '0' }}>
      <LibrarySetupAlert onNavigateToLibrary={() => setActiveTab('library')} />

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

      {/* Tab Content */}
      <div>
        {activeTab === 'organizations' && isSuperAdmin && <OrganizationManagement />}
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
    </div>
  );
}

