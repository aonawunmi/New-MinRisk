/**
 * MinRisk - Clean Rebuild Main App
 *
 * Phase 2: Auth & Layout
 * Using new auth system with proper admin tab visibility.
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentUserProfile, isUserAdmin, isSuperAdmin } from '@/lib/profiles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
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
import AdminCheck from '@/components/debug/AdminCheck';
import type { AuthState} from '@/types/auth';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
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
    } catch (error) {
      console.error('Auth state load error:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }

  // Loading state
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Not logged in - show auth pages with routing
  if (!authState.user || !authState.profile) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginForm onSuccess={loadAuthState} />} />
          <Route path="/signup" element={<SignupForm onSuccess={loadAuthState} />} />
          <Route path="/admin-check" element={<AdminCheck />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Logged in - show main app
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MinRisk</h1>
            <p className="text-sm text-gray-600">Enterprise Risk Management</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <div className="font-medium">{authState.profile.full_name}</div>
              <div className="text-gray-600">{authState.profile.role}</div>
            </div>
            <UserMenu
              user={authState.user}
              profile={authState.profile}
              isAdmin={authState.isAdmin}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {/* USER Role Context Banner */}
        {!authState.isAdmin && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 text-lg">ℹ️</div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Operational User Access
                </h3>
                <p className="text-xs text-blue-800">
                  You have access to operational risk management features (Dashboard, Risks, Controls, Incidents).
                  Advanced analytics, KRI monitoring, and intelligence features are available to Risk Management team members.
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6">
            {/* Tabs visible to all users (First Line of Defense) */}
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="risks">📋 Risks</TabsTrigger>
            <TabsTrigger value="controls">🛡️ Controls</TabsTrigger>
            <TabsTrigger value="incidents">🚨 Incidents</TabsTrigger>

            {/* Tabs visible only to ADMIN (Second/Third Line of Defense) */}
            {authState.isAdmin && (
              <>
                <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
                <TabsTrigger value="kri">📉 KRI</TabsTrigger>
                <TabsTrigger value="intelligence">🧠 Intelligence</TabsTrigger>
                <TabsTrigger value="ai">✨ AI Assistant</TabsTrigger>
                <TabsTrigger value="admin">⚙️ Admin</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="risks">
            <Tabs defaultValue="register" className="w-full">
              <TabsList>
                <TabsTrigger value="register">📋 Risk Register</TabsTrigger>
                <TabsTrigger value="import-export">💾 Import/Export</TabsTrigger>
              </TabsList>
              <TabsContent value="register">
                <RiskRegister />
              </TabsContent>
              <TabsContent value="import-export">
                <ImportExportManager mode="risks" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="controls">
            <Tabs defaultValue="register" className="w-full">
              <TabsList>
                <TabsTrigger value="register">🛡️ Control Register</TabsTrigger>
                <TabsTrigger value="import-export">💾 Import/Export</TabsTrigger>
              </TabsList>
              <TabsContent value="register">
                <ControlRegister />
              </TabsContent>
              <TabsContent value="import-export">
                <ImportExportManager mode="controls" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Admin-only tabs */}
          {authState.isAdmin && (
            <>
              <TabsContent value="analytics">
                <Tabs defaultValue="current" className="w-full">
                  <TabsList>
                    <TabsTrigger value="current">📊 Current Analysis</TabsTrigger>
                    <TabsTrigger value="history">🕐 Risk History</TabsTrigger>
                  </TabsList>
                  <TabsContent value="current">
                    <Analytics />
                  </TabsContent>
                  <TabsContent value="history">
                    <RiskHistoryView />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="kri">
                <KRIManagement />
              </TabsContent>

              <TabsContent value="intelligence">
                <RiskIntelligenceManagement />
              </TabsContent>
            </>
          )}

          <TabsContent value="incidents">
            <Tabs defaultValue="management" className="w-full">
              <TabsList>
                <TabsTrigger value="management">📝 Incident Management</TabsTrigger>
                {authState.isAdmin && (
                  <TabsTrigger value="ai-review">🧠 AI Review (ADMIN)</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="management">
                <IncidentManagement />
              </TabsContent>
              {authState.isAdmin && (
                <TabsContent value="ai-review">
                  <AdminIncidentReview />
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>

          {authState.isAdmin && (
            <>
              <TabsContent value="ai">
                <AIAssistant />
              </TabsContent>

              <TabsContent value="admin">
                <AdminPanel />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}
