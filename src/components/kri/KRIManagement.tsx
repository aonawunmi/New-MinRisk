/**
 * KRIManagement Component
 *
 * Main KRI management page with tabs for definitions, data entry, and alerts
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KRIDefinitions from './KRIDefinitions';
import KRIDataEntry from './KRIDataEntry';
import KRIAlerts from './KRIAlerts';

export default function KRIManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">KRI Monitoring</h2>
        <p className="text-gray-600 text-sm mt-1">
          Key Risk Indicator definitions, data entry, and alert management
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="definitions" className="w-full">
        <TabsList>
          <TabsTrigger value="definitions">📋 Definitions</TabsTrigger>
          <TabsTrigger value="data-entry">📝 Data Entry</TabsTrigger>
          <TabsTrigger value="alerts">🚨 Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="definitions" className="mt-6">
          <KRIDefinitions />
        </TabsContent>

        <TabsContent value="data-entry" className="mt-6">
          <KRIDataEntry />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <KRIAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
