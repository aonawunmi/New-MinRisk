import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * KRIManagement Component
 *
 * Main KRI management page with tabs for definitions, data entry, and alerts
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KRIDefinitions from './KRIDefinitions';
import KRIDataEntry from './KRIDataEntry';
import KRIAlerts from './KRIAlerts';
export default function KRIManagement() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold", children: "KRI Monitoring" }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: "Key Risk Indicator definitions, data entry, and alert management" })] }), _jsxs(Tabs, { defaultValue: "definitions", className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "definitions", children: "\uD83D\uDCCB Definitions" }), _jsx(TabsTrigger, { value: "data-entry", children: "\uD83D\uDCDD Data Entry" }), _jsx(TabsTrigger, { value: "alerts", children: "\uD83D\uDEA8 Alerts" })] }), _jsx(TabsContent, { value: "definitions", className: "mt-6", children: _jsx(KRIDefinitions, {}) }), _jsx(TabsContent, { value: "data-entry", className: "mt-6", children: _jsx(KRIDataEntry, {}) }), _jsx(TabsContent, { value: "alerts", className: "mt-6", children: _jsx(KRIAlerts, {}) })] })] }));
}
