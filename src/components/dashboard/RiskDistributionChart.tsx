/**
 * RiskDistributionChart Component
 *
 * Generic chart for displaying risk distribution by any dimension
 * (division, category, etc.)
 */

interface RiskDistributionChartProps {
  data: Array<{ name: string; count: number; percentage: number }>;
  emptyMessage?: string;
}

export default function RiskDistributionChart({
  data,
  emptyMessage = 'No data available',
}: RiskDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">{emptyMessage}</div>
    );
  }

  // Color palette for bars
  const colors = [
    '#3b82f6', // blue-500
    '#8b5cf6', // purple-500
    '#06b6d4', // cyan-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
  ];

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((item, index) => {
        const color = colors[index % colors.length];

        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium truncate max-w-[200px]">
                  {item.name}
                </span>
              </div>
              <span className="text-gray-600 whitespace-nowrap ml-2">
                {item.count} ({item.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
      {data.length > 8 && (
        <p className="text-xs text-gray-500 text-center pt-2">
          Showing top 8 of {data.length} items
        </p>
      )}
    </div>
  );
}
