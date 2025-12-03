import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MinRisk - Clean Rebuild Main App
 *
 * Phase 2: Auth & Layout
 * Using new auth system with proper admin tab visibility.
 */
import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentUserProfile, isUserAdmin, isSuperAdmin } from '@/lib/profiles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginForm from '@/components/auth/LoginForm';
import UserMenu from '@/components/auth/UserMenu';
import Dashboard from '@/components/dashboard/Dashboard';
import Analytics from '@/components/analytics/Analytics';
import RiskHistoryView from '@/components/analytics/RiskHistoryView';
import RiskRegister from '@/components/risks/RiskRegister';
import ControlRegister from '@/components/controls/ControlRegister';
import KRIManagement from '@/components/kri/KRIManagement';
import RiskIntelligenceManagement from '@/components/riskIntelligence/RiskIntelligenceManagement';
import IncidentManagement from '@/components/incidents/IncidentManagement';
import { AdminIncidentReview } from '@/components/incidents/AdminIncidentReview';
import ImportExportManager from '@/components/importExport/ImportExportManager';
import AIAssistant from '@/components/ai/AIAssistant';
import AdminPanel from '@/components/admin/AdminPanel';
export default function App() {
    const [authState, setAuthState] = useState({
        user: null,
        profile: null,
        isAdmin: false,
        isSuperAdmin: false,
        loading: true,
    });
    useEffect(() => {
        loadAuthState();
    }, []);
    async function loadAuthState() {
        try {
            // 1. Get authenticated user
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                setAuthState(prev => ({ ...prev, loading: false }));
                return;
            }
            // 2. Get user profile
            const { data: profileData, error: profileError } = await getCurrentUserProfile();
            if (profileError || !profileData) {
                console.error('Profile error:', profileError);
                setAuthState(prev => ({ ...prev, loading: false }));
                return;
            }
            // 3. Check admin status
            const adminStatus = await isUserAdmin();
            const superAdminStatus = await isSuperAdmin();
            console.log('Auth state loaded:', {
                user: currentUser.email,
                role: profileData.role,
                isAdmin: adminStatus,
                isSuperAdmin: superAdminStatus,
            });
            setAuthState({
                user: currentUser,
                profile: profileData,
                isAdmin: adminStatus,
                isSuperAdmin: superAdminStatus,
                loading: false,
            });
        }
        catch (error) {
            console.error('Auth state load error:', error);
            setAuthState(prev => ({ ...prev, loading: false }));
        }
    }
    // Loading state
    if (authState.loading) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading..." }) }));
    }
    // Not logged in - show login form
    if (!authState.user || !authState.profile) {
        return _jsx(LoginForm, { onSuccess: loadAuthState });
    }
    // Logged in - show main app
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx("header", { className: "bg-white border-b border-gray-200 px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "MinRisk" }), _jsx("p", { className: "text-sm text-gray-600", children: "Enterprise Risk Management" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "text-sm text-right", children: [_jsx("div", { className: "font-medium", children: authState.profile.full_name }), _jsx("div", { className: "text-gray-600", children: authState.profile.role })] }), _jsx(UserMenu, { user: authState.user, profile: authState.profile, isAdmin: authState.isAdmin })] })] }) }), _jsx("main", { className: "container mx-auto px-6 py-6", children: _jsxs(Tabs, { defaultValue: "dashboard", className: "w-full", children: [_jsxs(TabsList, { className: "mb-6", children: [_jsx(TabsTrigger, { value: "dashboard", children: "\uD83D\uDCCA Dashboard" }), _jsx(TabsTrigger, { value: "risks", children: "\uD83D\uDCCB Risks" }), _jsx(TabsTrigger, { value: "controls", children: "\uD83D\uDEE1\uFE0F Controls" }), _jsx(TabsTrigger, { value: "analytics", children: "\uD83D\uDCC8 Analytics" }), _jsx(TabsTrigger, { value: "kri", children: "\uD83D\uDCC9 KRI" }), _jsx(TabsTrigger, { value: "intelligence", children: "\uD83E\uDDE0 Intelligence" }), _jsx(TabsTrigger, { value: "incidents", children: "\uD83D\uDEA8 Incidents" }), _jsx(TabsTrigger, { value: "ai", children: "\u2728 AI Assistant" }), authState.isAdmin && (_jsx(TabsTrigger, { value: "admin", children: "\u2699\uFE0F Admin" }))] }), _jsx(TabsContent, { value: "dashboard", children: _jsx(Dashboard, {}) }), _jsx(TabsContent, { value: "risks", children: _jsxs(Tabs, { defaultValue: "register", className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "register", children: "\uD83D\uDCCB Risk Register" }), _jsx(TabsTrigger, { value: "import-export", children: "\uD83D\uDCBE Import/Export" })] }), _jsx(TabsContent, { value: "register", children: _jsx(RiskRegister, {}) }), _jsx(TabsContent, { value: "import-export", children: _jsx(ImportExportManager, { mode: "risks" }) })] }) }), _jsx(TabsContent, { value: "controls", children: _jsxs(Tabs, { defaultValue: "register", className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "register", children: "\uD83D\uDEE1\uFE0F Control Register" }), _jsx(TabsTrigger, { value: "import-export", children: "\uD83D\uDCBE Import/Export" })] }), _jsx(TabsContent, { value: "register", children: _jsx(ControlRegister, {}) }), _jsx(TabsContent, { value: "import-export", children: _jsx(ImportExportManager, { mode: "controls" }) })] }) }), _jsx(TabsContent, { value: "analytics", children: _jsxs(Tabs, { defaultValue: "current", className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "current", children: "\uD83D\uDCCA Current Analysis" }), _jsx(TabsTrigger, { value: "history", children: "\uD83D\uDD50 Risk History" })] }), _jsx(TabsContent, { value: "current", children: _jsx(Analytics, {}) }), _jsx(TabsContent, { value: "history", children: _jsx(RiskHistoryView, {}) })] }) }), _jsx(TabsContent, { value: "kri", children: _jsx(KRIManagement, {}) }), _jsx(TabsContent, { value: "intelligence", children: _jsx(RiskIntelligenceManagement, {}) }), _jsx(TabsContent, { value: "incidents", children: _jsxs(Tabs, { defaultValue: "management", className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "management", children: "\uD83D\uDCDD Incident Management" }), authState.isAdmin && (_jsx(TabsTrigger, { value: "ai-review", children: "\uD83E\uDDE0 AI Review (ADMIN)" }))] }), _jsx(TabsContent, { value: "management", children: _jsx(IncidentManagement, {}) }), authState.isAdmin && (_jsx(TabsContent, { value: "ai-review", children: _jsx(AdminIncidentReview, {}) }))] }) }), _jsx(TabsContent, { value: "ai", children: _jsx(AIAssistant, {}) }), authState.isAdmin && (_jsx(TabsContent, { value: "admin", children: _jsx(AdminPanel, {}) }))] }) })] }));
}
