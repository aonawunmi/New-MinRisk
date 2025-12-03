import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TopRisksTable Component
 *
 * Displays a table of top risks by score
 */
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { getRiskLevelColor } from '@/lib/analytics';
export default function TopRisksTable({ risks }) {
    return (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "w-[100px]", children: "Risk Code" }), _jsx(TableHead, { children: "Title" }), _jsx(TableHead, { children: "Division" }), _jsx(TableHead, { children: "Category" }), _jsx(TableHead, { className: "text-center", children: "Score" }), _jsx(TableHead, { className: "text-center", children: "Level" })] }) }), _jsx(TableBody, { children: risks.map((risk) => {
                    const levelColor = getRiskLevelColor(risk.level);
                    return (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-mono text-sm", children: risk.risk_code }), _jsx(TableCell, { className: "font-medium max-w-[300px] truncate", children: risk.risk_title }), _jsx(TableCell, { children: risk.division }), _jsx(TableCell, { children: risk.category }), _jsx(TableCell, { className: "text-center font-semibold", children: risk.inherent_score }), _jsx(TableCell, { className: "text-center", children: _jsx(Badge, { style: {
                                        backgroundColor: levelColor,
                                        color: 'white',
                                    }, children: risk.level }) })] }, risk.risk_code));
                }) })] }));
}
