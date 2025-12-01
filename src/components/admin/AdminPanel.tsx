/**
 * Admin Panel Component
 *
 * Main admin interface with four sections:
 * 1. Risk Taxonomy Management
 * 2. Risk Configuration (Divisions, Departments, Labels)
 * 3. User Management
 * 4. Organization Settings
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaxonomyManagement from './TaxonomyManagement';
import UserManagement from './UserManagement';
import OrganizationSettings from './OrganizationSettings';
import RiskConfiguration from './RiskConfiguration';
import PeriodManagement from './PeriodManagement';
import { Shield, Users, Settings, BookOpen, Sliders, Calendar } from 'lucide-react';
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="taxonomy" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Risk Taxonomy
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Risk Configuration
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="periods" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Period Management
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Organization Settings
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

        <TabsContent value="settings" className="mt-6">
          <OrganizationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
