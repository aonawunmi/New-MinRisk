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
        <TabsList className="w-full flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="taxonomy" className="flex items-center gap-1.5 text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            Taxonomy
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-1.5 text-sm">
            <Sliders className="h-3.5 w-3.5" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1.5 text-sm">
            <Users className="h-3.5 w-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="periods" className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-3.5 w-3.5" />
            Periods
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5 text-sm">
            <ScrollText className="h-3.5 w-3.5" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-1.5 text-sm">
            <HelpCircle className="h-3.5 w-3.5" />
            Help
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 text-sm">
            <Settings className="h-3.5 w-3.5" />
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
