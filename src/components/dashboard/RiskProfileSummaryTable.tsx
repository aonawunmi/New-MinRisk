
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoveUp, MoveDown, Minus } from 'lucide-react';
import type { RiskProfileSummary } from '@/lib/analytics';

interface RiskProfileSummaryTableProps {
    data: RiskProfileSummary[];
}

export default function RiskProfileSummaryTable({ data }: RiskProfileSummaryTableProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-2 bg-gray-50 border-b px-3 sm:px-6 py-2 sm:py-4">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase text-gray-700">Residual Risk Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm text-left min-w-[500px]">
                        <thead className="text-[10px] sm:text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-2 sm:px-4 py-2 sm:py-3 border-b text-center w-10 sm:w-12">#</th>
                                <th className="px-2 sm:px-4 py-2 sm:py-3 border-b">Category</th>
                                <th className="px-2 sm:px-4 py-2 sm:py-3 border-b text-center">Count</th>
                                <th className="px-2 sm:px-4 py-2 sm:py-3 border-b text-center">Prob</th>
                                <th className="px-2 sm:px-4 py-2 sm:py-3 border-b text-center">Impact</th>
                                <th className="px-2 sm:px-4 py-2 sm:py-3 border-b text-center">Severity</th>
                                <th className="px-2 sm:px-4 py-2 sm:py-3 border-b text-center">Trend</th>
                                <th className="px-2 sm:px-4 py-2 sm:py-3 border-b hidden sm:table-cell">Comments</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((item, index) => (
                                <tr key={item.category} className="hover:bg-gray-50">
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-medium text-gray-900">{index + 1}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900">{item.category}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{item.risk_count}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{item.avg_likelihood}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{item.avg_impact}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold">
                                        {item.avg_severity}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                        {getTrendIcon(item.trend)}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-500 italic text-xs hidden sm:table-cell">
                                        No major changes.
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                                        No risk data available to generate profile.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

function getTrendIcon(trend: 'up' | 'down' | 'unchanged' | 'new') {
    switch (trend) {
        case 'up':
            return <MoveUp className="w-4 h-4 text-red-500 mx-auto" />;
        case 'down':
            return <MoveDown className="w-4 h-4 text-green-500 mx-auto" />;
        case 'unchanged':
            return <Minus className="w-4 h-4 text-yellow-500 mx-auto" />;
        case 'new':
            return <Badge variant="outline" className="text-xs">New</Badge>;
        default:
            return null;
    }
}
