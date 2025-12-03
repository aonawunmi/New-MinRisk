import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * RiskLevelChart Component
 *
 * Visualizes risk level distribution with colored bars
 */
import { getRiskLevelColor } from '@/lib/analytics';
export default function RiskLevelChart({ distribution }) {
    if (distribution.length === 0) {
        return (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No risk level data available" }));
    }
    // Order by risk level severity
    const levelOrder = ['Extreme', 'High', 'Medium', 'Low'];
    const sortedDistribution = [...distribution].sort((a, b) => {
        return levelOrder.indexOf(a.name) - levelOrder.indexOf(b.name);
    });
    return (_jsx("div", { className: "space-y-4", children: sortedDistribution.map((item) => {
            const color = getRiskLevelColor(item.name);
            return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: color } }), _jsx("span", { className: "font-medium", children: item.name })] }), _jsxs("span", { className: "text-gray-600", children: [item.count, " (", item.percentage, "%)"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-3", children: _jsx("div", { className: "h-3 rounded-full transition-all", style: {
                                width: `${item.percentage}%`,
                                backgroundColor: color,
                            } }) })] }, item.name));
        }) }));
}
