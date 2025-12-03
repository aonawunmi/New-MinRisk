import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AlertsSummary Component
 *
 * Displays summary of KRI alerts and Risk Intelligence alerts
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
export default function AlertsSummary({ kriAlerts, intelligenceAlerts, totalAlerts, kriByLevel, }) {
    // If no alerts, show a success message
    if (totalAlerts === 0) {
        return (_jsx(Card, { className: "border-green-200 bg-green-50", children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl", children: "\u2705" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-green-900", children: "All Clear" }), _jsx("p", { className: "text-sm text-green-700", children: "No active alerts at this time" })] })] }) }) }));
    }
    // Get level colors
    const getLevelBadgeColor = (level) => {
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
    return (_jsxs(Card, { className: "border-orange-200 bg-orange-50", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDEA8" }), _jsx("span", { children: "Active Alerts" }), _jsx(Badge, { className: "ml-auto", variant: "destructive", children: totalAlerts })] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "bg-white rounded-lg p-4 border border-orange-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("p", { className: "font-semibold text-gray-900", children: "KRI Alerts" }), _jsx(Badge, { variant: "outline", children: kriAlerts })] }), Object.keys(kriByLevel).length > 0 ? (_jsx("div", { className: "space-y-2", children: Object.entries(kriByLevel).map(([level, count]) => (_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx(Badge, { className: getLevelBadgeColor(level), children: level.toUpperCase() }) }), _jsx("span", { className: "text-gray-600", children: count })] }, level))) })) : (_jsx("p", { className: "text-sm text-gray-500", children: "No KRI alerts" }))] }), _jsxs("div", { className: "bg-white rounded-lg p-4 border border-orange-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("p", { className: "font-semibold text-gray-900", children: "Risk Intelligence Alerts" }), _jsx(Badge, { variant: "outline", children: intelligenceAlerts })] }), intelligenceAlerts > 0 ? (_jsx("p", { className: "text-sm text-gray-700", children: "External events requiring review and assessment" })) : (_jsx("p", { className: "text-sm text-gray-500", children: "No intelligence alerts pending" }))] })] }) })] }));
}
