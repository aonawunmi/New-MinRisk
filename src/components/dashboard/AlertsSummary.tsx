/**
 * AlertsSummary Component
 *
 * Displays summary of KRI alerts and Risk Intelligence alerts
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AlertsSummaryProps {
  kriAlerts: number;
  intelligenceAlerts: number;
  totalAlerts: number;
  kriByLevel: Record<string, number>;
}

export default function AlertsSummary({
  kriAlerts,
  intelligenceAlerts,
  totalAlerts,
  kriByLevel,
}: AlertsSummaryProps) {
  // If no alerts, show a success message
  if (totalAlerts === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="font-semibold text-green-900">All Clear</p>
              <p className="text-sm text-green-700">
                No active alerts at this time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get level colors
  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'red':
        return 'bg-red-500 text-white';
      case 'yellow':
        return 'bg-yellow-500 text-white';
      case 'green':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🚨</span>
          <span>Active Alerts</span>
          <Badge className="ml-auto" variant="destructive">
            {totalAlerts}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KRI Alerts */}
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900">KRI Alerts</p>
              <Badge variant="outline">{kriAlerts}</Badge>
            </div>
            {Object.keys(kriByLevel).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(kriByLevel).map(([level, count]) => (
                  <div
                    key={level}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={getLevelBadgeColor(level)}>
                        {level.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-gray-600">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No KRI alerts</p>
            )}
          </div>

          {/* Intelligence Alerts */}
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900">
                Risk Intelligence Alerts
              </p>
              <Badge variant="outline">{intelligenceAlerts}</Badge>
            </div>
            {intelligenceAlerts > 0 ? (
              <p className="text-sm text-gray-700">
                External events requiring review and assessment
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                No intelligence alerts pending
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
