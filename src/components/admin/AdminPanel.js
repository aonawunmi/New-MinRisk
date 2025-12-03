import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Admin Panel Component
 *
 * Main admin interface with four sections:
 * 1. Risk Taxonomy Management
 * 2. Risk Configuration (Divisions, Departments, Labels)
 * 3. User Management
 * 4. Organization Settings
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaxonomyManagement from './TaxonomyManagement';
import UserManagement from './UserManagement';
import OrganizationSettings from './OrganizationSettings';
import RiskConfiguration from './RiskConfiguration';
import PeriodManagement from './PeriodManagement';
import { Shield, Users, Settings, BookOpen, Sliders, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth';
export default function AdminPanel() {
    const { user, profile } = useAuth();
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-3 bg-purple-600 rounded-lg", children: _jsx(Shield, { className: "h-8 w-8 text-white" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Administration Panel" }), _jsx("p", { className: "text-gray-600", children: "Manage risk taxonomy, users, and organization settings" })] })] }) }), _jsxs(Tabs, { defaultValue: "taxonomy", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-5", children: [_jsxs(TabsTrigger, { value: "taxonomy", className: "flex items-center gap-2", children: [_jsx(BookOpen, { className: "h-4 w-4" }), "Risk Taxonomy"] }), _jsxs(TabsTrigger, { value: "configuration", className: "flex items-center gap-2", children: [_jsx(Sliders, { className: "h-4 w-4" }), "Risk Configuration"] }), _jsxs(TabsTrigger, { value: "users", className: "flex items-center gap-2", children: [_jsx(Users, { className: "h-4 w-4" }), "User Management"] }), _jsxs(TabsTrigger, { value: "periods", className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-4 w-4" }), "Period Management"] }), _jsxs(TabsTrigger, { value: "settings", className: "flex items-center gap-2", children: [_jsx(Settings, { className: "h-4 w-4" }), "Organization Settings"] })] }), _jsx(TabsContent, { value: "taxonomy", className: "mt-6", children: _jsx(TaxonomyManagement, {}) }), _jsx(TabsContent, { value: "configuration", className: "mt-6", children: _jsx(RiskConfiguration, {}) }), _jsx(TabsContent, { value: "users", className: "mt-6", children: _jsx(UserManagement, {}) }), _jsx(TabsContent, { value: "periods", className: "mt-6", children: user && profile && (_jsx(PeriodManagement, { orgId: profile.organization_id, userId: user.id })) }), _jsx(TabsContent, { value: "settings", className: "mt-6", children: _jsx(OrganizationSettings, {}) })] })] }));
}
