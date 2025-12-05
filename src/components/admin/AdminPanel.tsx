import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import TaxonomyManagement from './TaxonomyManagement';
import UserManagement from './UserManagement';
import OrganizationSettings from './OrganizationSettings';
import RiskConfiguration from './RiskConfiguration';
import PeriodManagement from './PeriodManagement';
import AuditTrail from './AuditTrail';
import HelpTab from './HelpTab';

export default function AdminPanel() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('taxonomy');

  const tabs = [
    { id: 'taxonomy', label: 'Risk Taxonomy' },
    { id: 'configuration', label: 'Risk Configuration' },
    { id: 'users', label: 'User Management' },
    { id: 'periods', label: 'Period Management' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'help', label: 'Help' },
    { id: 'settings', label: 'Organization Settings' },
  ];

  return (
    <div style={{ width: '100%', padding: '0' }}>
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
        {activeTab === 'taxonomy' && <TaxonomyManagement />}
        {activeTab === 'configuration' && <RiskConfiguration />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'periods' && user && profile && (
          <PeriodManagement orgId={profile.organization_id} userId={user.id} />
        )}
        {activeTab === 'audit' && <AuditTrail />}
        {activeTab === 'help' && <HelpTab />}
        {activeTab === 'settings' && <OrganizationSettings />}
      </div>
    </div>
  );
}
