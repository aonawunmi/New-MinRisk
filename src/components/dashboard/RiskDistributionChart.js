import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function RiskDistributionChart({ data, emptyMessage = 'No data available', }) {
    if (data.length === 0) {
        return (_jsx("div", { className: "text-center py-8 text-gray-500", children: emptyMessage }));
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
    return (_jsxs("div", { className: "space-y-3", children: [data.slice(0, 8).map((item, index) => {
                const color = colors[index % colors.length];
                return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: color } }), _jsx("span", { className: "font-medium truncate max-w-[200px]", children: item.name })] }), _jsxs("span", { className: "text-gray-600 whitespace-nowrap ml-2", children: [item.count, " (", item.percentage, "%)"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "h-2 rounded-full transition-all", style: {
                                    width: `${item.percentage}%`,
                                    backgroundColor: color,
                                } }) })] }, item.name));
            }), data.length > 8 && (_jsxs("p", { className: "text-xs text-gray-500 text-center pt-2", children: ["Showing top 8 of ", data.length, " items"] }))] }));
}
