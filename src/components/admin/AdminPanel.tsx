/**
 * Admin Panel Component
 *
 * Main admin interface with three sections:
 * 1. Risk Taxonomy Management
 * 2. User Management
 * 3. Organization Settings
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaxonomyManagement from './TaxonomyManagement';
import UserManagement from './UserManagement';
import OrganizationSettings from './OrganizationSettings';
import { Shield, Users, Settings, BookOpen } from 'lucide-react';

export default function AdminPanel() {
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="taxonomy" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Risk Taxonomy
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Organization Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="taxonomy" className="mt-6">
          <TaxonomyManagement />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <OrganizationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
