/**
 * Analytics Component
 *
 * Comprehensive risk analytics page with heatmap, trends, and detailed reports
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdvancedRiskHeatmap from './AdvancedRiskHeatmap';
import HeatmapComparison from './HeatmapComparison';
import EnhancedTrendsView from './EnhancedTrendsView';
import ReportHub from '@/components/reports/ReportHub';

export default function Analytics() {
  const [matrixSize, setMatrixSize] = useState<5 | 6>(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Risk Analytics & Reports</h2>
          <p className="text-gray-600 text-sm mt-1">
            Visualize and analyze your risk portfolio
          </p>
        </div>

        {/* Matrix Size Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Matrix Size:</span>
          <button
            onClick={() => setMatrixSize(5)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${matrixSize === 5
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            5×5
          </button>
          <button
            onClick={() => setMatrixSize(6)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${matrixSize === 6
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            6×6
          </button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="advanced" className="w-full">
        <TabsList>
          <TabsTrigger value="advanced">⚡ Risk Analysis</TabsTrigger>
          <TabsTrigger value="comparison">🔄 Period Comparison</TabsTrigger>
          <TabsTrigger value="trends">📈 Trends</TabsTrigger>
          <TabsTrigger value="reports">📊 Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedRiskHeatmap matrixSize={matrixSize} />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <HeatmapComparison />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <EnhancedTrendsView />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportHub />
        </TabsContent>
      </Tabs>
    </div>
  );
}
