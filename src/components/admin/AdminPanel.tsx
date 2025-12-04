/**
 * Admin Panel Component
 *
 * Main admin interface with seven sections:
 * 1. Risk Taxonomy Management
 * 2. Risk Configuration (Divisions, Departments, Labels)
 * 3. User Management
 * 4. Period Management
 * 5. Audit Trail (NEW - complete activity logging)
 * 6. Help Documentation
 * 7. Organization Settings
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaxonomyManagement from './TaxonomyManagement';
import UserManagement from './UserManagement';
import OrganizationSettings from './OrganizationSettings';
import RiskConfiguration from './RiskConfiguration';
import PeriodManagement from './PeriodManagement';
import AuditTrail from './AuditTrail';
import HelpTab from './HelpTab';
import { Shield, Users, Settings, BookOpen, Sliders, Calendar, ScrollText, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function AdminPanel() {
  const { user, profile } = useAuth();

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 rounded-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Administration Panel
            </h2>
            <p className="text-gray-600">
              Manage risk taxonomy, users, and organization settings
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="taxonomy" className="w-full">
        <TabsList className="w-full !flex !flex-row !flex-wrap !justify-start !items-start gap-1 h-auto p-2">
          <TabsTrigger value="taxonomy" className="flex-none">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Taxonomy
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex-none">
            <Sliders className="h-4 w-4 mr-1.5" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-none">
            <Users className="h-4 w-4 mr-1.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="periods" className="flex-none">
            <Calendar className="h-4 w-4 mr-1.5" />
            Periods
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-none">
            <ScrollText className="h-4 w-4 mr-1.5" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="help" className="flex-none">
            <HelpCircle className="h-4 w-4 mr-1.5" />
            Help
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-none">
            <Settings className="h-4 w-4 mr-1.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="taxonomy" className="mt-6">
          <TaxonomyManagement />
        </TabsContent>

        <TabsContent value="configuration" className="mt-6">
          <RiskConfiguration />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="periods" className="mt-6">
          {user && profile && (
            <PeriodManagement
              orgId={profile.organization_id}
              userId={user.id}
            />
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditTrail />
        </TabsContent>

        <TabsContent value="help" className="mt-6">
          <HelpTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <OrganizationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
