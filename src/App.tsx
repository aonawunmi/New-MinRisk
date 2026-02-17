/**
 * MinRisk - Main App
 *
 * Authentication handled by Clerk.
 * When signed out: shows Clerk <SignIn /> component.
 * When signed in: loads profile from Supabase and shows main app.
 */

import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SignIn, SignUp, useClerk, useSignIn } from '@clerk/clerk-react';
import { useAuth } from '@/lib/auth';
import { useOrgBranding } from '@/hooks/useOrgBranding';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import { isUserAdmin, isSuperAdmin as checkSuperAdmin } from '@/lib/profiles';
import { isPCIWorkflowEnabled } from '@/lib/pci';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserMenu from '@/components/auth/UserMenu';
import MobileNav from '@/components/layout/MobileNav';
import Dashboard from '@/components/dashboard/Dashboard';
import Analytics from '@/components/analytics/Analytics';
import RiskHistoryView from '@/components/analytics/RiskHistoryView';
import RiskRegister from '@/components/risks/RiskRegister';
import ControlRegister from '@/components/controls/ControlRegister';
import PCIControlsDashboard from '@/components/controls/PCIControlsDashboard';
import KRIManagement from '@/components/kri/KRIManagement';
import RiskIntelligenceManagement from '@/components/riskIntelligence/RiskIntelligenceManagement';
import IncidentManagement from '@/components/incidents/IncidentManagement';
import { AdminIncidentReview } from '@/components/incidents/AdminIncidentReview';
import ImportExportManager from '@/components/importExport/ImportExportManager';
import AIAssistant from '@/components/ai/AIAssistant';
import AdminPanel from '@/components/admin/AdminPanel';
import RegulatorDashboard from '@/components/regulator/RegulatorDashboard';
import ReportHub from '@/components/reports/ReportHub';

export default function App() {
  const { user, profile, loading } = useAuth();
  const { signOut } = useClerk();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { logoUrl } = useOrgBranding();
  const { features } = useOrgFeatures();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pciWorkflowEnabled, setPciWorkflowEnabled] = useState(false);
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [adminLoaded, setAdminLoaded] = useState(false);

  // Magic link auto-sign-in: detect ?signin_token= in URL
  const [autoSigningIn, setAutoSigningIn] = useState(() => {
    return !!new URLSearchParams(window.location.search).get('signin_token');
  });
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('signin_token');

    if (!token || !signIn || !signInLoaded || !setActive) return;

    setAutoSigningIn(true);
    signIn.create({ strategy: 'ticket', ticket: token })
      .then(async (result) => {
        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      })
      .catch((err) => {
        console.error('Magic link sign-in failed:', err);
        setSignInError('This sign-in link has expired or has already been used. Please ask your administrator for a new link.');
        setAutoSigningIn(false);
        window.history.replaceState({}, '', window.location.pathname);
      });
  }, [signIn, signInLoaded, setActive]);

  // Load admin status and PCI config when profile is available
  useEffect(() => {
    if (!profile) {
      setIsAdmin(false);
      setIsSuperAdminUser(false);
      setAdminLoaded(false);
      return;
    }

    async function loadAdminStatus() {
      try {
        const [adminStatus, superAdminStatus, pciEnabled] = await Promise.all([
          isUserAdmin(),
          checkSuperAdmin(),
          isPCIWorkflowEnabled(),
        ]);

        console.log('Auth state loaded:', {
          email: user?.email,
          role: profile?.role,
          isAdmin: adminStatus,
          isSuperAdmin: superAdminStatus,
        });

        setIsAdmin(adminStatus);
        setIsSuperAdminUser(superAdminStatus);
        setPciWorkflowEnabled(pciEnabled);
        setAdminLoaded(true);
      } catch (error) {
        console.error('Admin status load error:', error);
        setAdminLoaded(true);
      }
    }

    loadAdminStatus();
  }, [profile]);

  // Redirect Super Admin to Admin tab by default
  useEffect(() => {
    if (isSuperAdminUser && activeTab === 'dashboard') {
      setActiveTab('admin');
    }
    if (profile?.role === 'regulator' && activeTab === 'dashboard') {
      setActiveTab('regulator-oversight');
    }
  }, [isSuperAdminUser, profile?.role]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Not signed in — show magic link processing, Clerk Sign In, or Sign Up
  if (!user || !profile) {
    // Magic link is being processed — show welcome screen
    if (autoSigningIn) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to MinRisk</h1>
            <p className="text-gray-600 mb-4">Setting up your account...</p>
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>
          {signInError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 max-w-sm">
              {signInError}
            </div>
          )}
          {authMode === 'sign-up' ? (
            <>
              <SignUp routing="hash" signInUrl="/#/sign-in" />
              <p className="text-center mt-4 text-sm text-gray-600">
                Already have an account?{' '}
                <button onClick={() => setAuthMode('sign-in')} className="text-blue-600 hover:underline">
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <SignIn routing="hash" signUpUrl="/#/sign-up" />
              <p className="text-center mt-4 text-sm text-gray-600">
                Don't have an account?{' '}
                <button onClick={() => setAuthMode('sign-up')} className="text-blue-600 hover:underline">
                  Sign up
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Waiting for admin status to resolve
  if (!adminLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Handle logout via Clerk
  async function handleLogout() {
    await signOut();
  }

  // Signed in — show main app
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Navigation */}
        <MobileNav
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdminUser}
          onLogout={handleLogout}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Desktop Header - hidden on mobile */}
        <header className="mobile-hidden bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              {logoUrl ? (
                <img src={logoUrl} alt="Organization Logo" className="h-8 object-contain" />
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">MinRisk</h1>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Enterprise Risk Management</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-sm text-right hidden sm:block">
                <div className="font-medium">{profile.full_name}</div>
                <div className="text-gray-600">{profile.role}</div>
              </div>
              <UserMenu
                user={user}
                profile={profile}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </header>

        {/* Main Content - with mobile padding adjustments */}
        <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-6">
          {/* USER Role Context Banner */}
          {!isAdmin && (
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Horizontally scrollable tabs container for mobile */}
            <div className="mobile-scroll-x -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="mb-4 sm:mb-6 inline-flex sm:flex w-max sm:w-auto">
                {/* Regulator-specific tabs */}
                {profile?.role === 'regulator' && (
                  <TabsTrigger value="regulator-oversight" className="text-xs sm:text-sm whitespace-nowrap">
                    <span className="hidden sm:inline">🏛️ </span>Oversight Dashboard
                  </TabsTrigger>
                )}

                {/* Tabs visible to all users (First Line of Defense) - HIDDEN for Super Admin and Regulators */}
                {!isSuperAdminUser && profile?.role !== 'regulator' && (
                  <>
                    <TabsTrigger value="dashboard" className="text-xs sm:text-sm whitespace-nowrap">
                      <span className="hidden sm:inline">📊 </span>Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="risks" className="text-xs sm:text-sm whitespace-nowrap">
                      <span className="hidden sm:inline">📋 </span>Risks
                    </TabsTrigger>

                    {features.controls_library && (
                      <TabsTrigger value="controls" className="text-xs sm:text-sm whitespace-nowrap">
                        <span className="hidden sm:inline">🛡️ </span>Controls
                      </TabsTrigger>
                    )}

                    {features.basic_incidents && (
                      <TabsTrigger value="incidents" className="text-xs sm:text-sm whitespace-nowrap">
                        <span className="hidden sm:inline">🚨 </span>Incidents
                      </TabsTrigger>
                    )}

                    {features.basic_ai && (
                      <TabsTrigger value="ai" className="text-xs sm:text-sm whitespace-nowrap">
                        <span className="hidden sm:inline">✨ </span>AI
                      </TabsTrigger>
                    )}

                  </>
                )}

                {/* Tabs visible only to ADMIN (Second/Third Line of Defense) */}
                {isAdmin && (
                  <>
                    {!isSuperAdminUser && (
                      <>
                        <TabsTrigger value="analytics" className="text-xs sm:text-sm whitespace-nowrap">
                          <span className="hidden sm:inline">📈 </span>Analytics
                        </TabsTrigger>
                        <TabsTrigger value="kri" className="text-xs sm:text-sm whitespace-nowrap">
                          <span className="hidden sm:inline">📉 </span>KRI
                        </TabsTrigger>
                        <TabsTrigger value="intelligence" className="text-xs sm:text-sm whitespace-nowrap">
                          <span className="hidden sm:inline">🧠 </span>Intel
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="text-xs sm:text-sm whitespace-nowrap">
                          <span className="hidden sm:inline">📄 </span>Reports
                        </TabsTrigger>
                      </>
                    )}
                    <TabsTrigger value="admin" className="text-xs sm:text-sm whitespace-nowrap">
                      <span className="hidden sm:inline">⚙️ </span>Admin
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            <TabsContent value="regulator-oversight">
              <RegulatorDashboard />
            </TabsContent>

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
              <Tabs defaultValue={pciWorkflowEnabled ? "pci" : "register"} className="w-full">
                <TabsList>
                  <TabsTrigger value="register">🛡️ Control Register</TabsTrigger>
                  {pciWorkflowEnabled && (
                    <TabsTrigger value="pci">📊 PCI Controls</TabsTrigger>
                  )}
                  <TabsTrigger value="import-export">💾 Import/Export</TabsTrigger>
                </TabsList>
                <TabsContent value="register">
                  <ControlRegister />
                </TabsContent>
                {pciWorkflowEnabled && (
                  <TabsContent value="pci">
                    <PCIControlsDashboard />
                  </TabsContent>
                )}
                <TabsContent value="import-export">
                  <ImportExportManager mode="controls" />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Admin-only tabs */}
            {isAdmin && (
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
                  {isAdmin && (
                    <TabsTrigger value="ai-review">🧠 AI Review (ADMIN)</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="management">
                  <IncidentManagement />
                </TabsContent>
                {isAdmin && (
                  <TabsContent value="ai-review">
                    <AdminIncidentReview />
                  </TabsContent>
                )}
              </Tabs>
            </TabsContent>

            <TabsContent value="ai">
              <AIAssistant />
            </TabsContent>

            {isAdmin && !isSuperAdminUser && (
              <TabsContent value="reports">
                <ReportHub />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="admin">
                <AdminPanel />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </BrowserRouter>
  );
}
