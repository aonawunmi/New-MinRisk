/**
 * RiskLevelChart Component
 *
 * Visualizes risk level distribution with colored bars
 */

import { getRiskLevelColor } from '@/lib/analytics';

interface RiskLevelChartProps {
  distribution: Array<{ name: string; count: number; percentage: number }>;
}

export default function RiskLevelChart({ distribution }: RiskLevelChartProps) {
  if (distribution.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No risk level data available
      </div>
    );
  }

  // Order by risk level severity
  const levelOrder = ['Extreme', 'High', 'Medium', 'Low'];
  const sortedDistribution = [...distribution].sort((a, b) => {
    return levelOrder.indexOf(a.name) - levelOrder.indexOf(b.name);
  });

  return (
    <div className="space-y-4">
      {sortedDistribution.map((item) => {
        const color = getRiskLevelColor(
          item.name as 'Low' | 'Medium' | 'High' | 'Extreme'
        );

        return (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="text-gray-600">
                {item.count} ({item.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
