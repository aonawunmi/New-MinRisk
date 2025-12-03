import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MetricCard Component
 *
 * Displays a single metric with icon, value, and optional subtitle
 */
import { Card, CardContent } from '@/components/ui/card';
const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
};
export default function MetricCard({ title, value, icon, color, subtitle, }) {
    return (_jsx(Card, { children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-medium text-gray-600 mb-1", children: title }), _jsx("p", { className: "text-3xl font-bold text-gray-900", children: value }), subtitle && (_jsx("p", { className: "text-xs text-gray-500 mt-1", children: subtitle }))] }), _jsx("div", { className: `w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorClasses[color]}`, children: icon })] }) }) }));
}
