import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import {
    Menu,
    X,
    LayoutDashboard,
    ClipboardList,
    FileText,
    Settings,
    Shield,
    Activity,
    Bell,
    Users,
    LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
    label: string;
    tabValue: string;
    icon: React.ElementType;
    requiresAdmin?: boolean;
}

const mainNavItems: NavItem[] = [
    { label: 'Dashboard', tabValue: 'dashboard', icon: LayoutDashboard },
    { label: 'Risk Register', tabValue: 'risks', icon: ClipboardList },
    { label: 'Controls', tabValue: 'controls', icon: Shield },
    { label: 'Incidents', tabValue: 'incidents', icon: FileText },
    { label: 'AI Assistant', tabValue: 'ai', icon: Activity },
];

const adminNavItems: NavItem[] = [
    { label: 'Analytics', tabValue: 'analytics', icon: LayoutDashboard, requiresAdmin: true },
    { label: 'KRI', tabValue: 'kri', icon: Activity, requiresAdmin: true },
    { label: 'Intelligence', tabValue: 'intelligence', icon: Shield, requiresAdmin: true },
    { label: 'Admin', tabValue: 'admin', icon: Users, requiresAdmin: true },
];

const bottomNavItems: NavItem[] = [
    { label: 'Dashboard', tabValue: 'dashboard', icon: LayoutDashboard },
    { label: 'Risks', tabValue: 'risks', icon: ClipboardList },
    { label: 'Incidents', tabValue: 'incidents', icon: FileText },
    { label: 'More', tabValue: '#more', icon: Menu },
];

interface MobileNavProps {
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    onLogout?: () => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export default function MobileNav({
    isAdmin = false,
    isSuperAdmin = false,
    onLogout,
    activeTab = 'dashboard',
    onTabChange
}: MobileNavProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const { user, profile } = useAuth();
    const { features } = useOrgFeatures();

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDrawerOpen]);

    const handleNavClick = (tabValue: string) => {
        if (onTabChange) {
            onTabChange(tabValue);
        }
        setIsDrawerOpen(false);
        setShowMoreMenu(false);
    };

    const isActive = (tabValue: string) => activeTab === tabValue;

    return (
        <>
            {/* Mobile Header */}
            <header className="desktop-hidden fixed top-0 left-0 right-0 h-14 bg-white border-b flex items-center justify-between px-4 z-30 safe-area-top">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDrawerOpen(true)}
                    className="touch-target"
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </Button>

                <h1 className="text-lg font-bold text-slate-800">MinRisk</h1>

                <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target"
                    aria-label="Notifications"
                >
                    <Bell className="h-5 w-5" />
                </Button>
            </header>

            {/* Drawer Overlay */}
            {isDrawerOpen && (
                <div
                    className="mobile-drawer-overlay"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Drawer Panel */}
            <nav
                className={cn('mobile-drawer', isDrawerOpen ? 'open' : 'closed')}
                aria-label="Main navigation"
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <span className="text-xl font-bold text-slate-800">MinRisk</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsDrawerOpen(false)}
                        className="touch-target"
                        aria-label="Close menu"
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    <div className="px-3 space-y-1">
                        {!isSuperAdmin && mainNavItems
                            .filter(item => {
                                if (item.tabValue === 'controls') return features.controls_library;
                                if (item.tabValue === 'incidents') return features.basic_incidents;
                                if (item.tabValue === 'ai') return features.basic_ai;
                                return true;
                            })
                            .map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.tabValue}
                                        onClick={() => handleNavClick(item.tabValue)}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-target text-left',
                                            isActive(item.tabValue)
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-slate-600 hover:bg-slate-50'
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                );
                            })}
                    </div>

                    {isAdmin && (
                        <div className="mt-6 px-3 pt-4 border-t">
                            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Admin
                            </p>
                            {adminNavItems
                                .filter(item => !isSuperAdmin || item.tabValue === 'admin')
                                .map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.tabValue}
                                            onClick={() => handleNavClick(item.tabValue)}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-target text-left',
                                                isActive(item.tabValue)
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </button>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* Logout button at bottom */}
                <div className="p-4 border-t safe-area-bottom">
                    <Button
                        variant="outline"
                        className="w-full touch-target flex items-center justify-center gap-2"
                        onClick={onLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </nav>

            {/* Bottom Navigation Bar */}
            <nav className="desktop-hidden mobile-bottom-nav" aria-label="Quick navigation">
                {isSuperAdmin ? (
                    // Simplified bottom nav for Super Admin
                    <button
                        onClick={() => handleNavClick('admin')}
                        className={cn('mobile-bottom-nav-item', isActive('admin') && 'active')}
                    >
                        <Users className="h-5 w-5" />
                        <span className="text-xs mt-1">Admin</span>
                    </button>
                ) : (
                    bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = item.tabValue !== '#more' && isActive(item.tabValue);

                        if (item.tabValue === '#more') {
                            return (
                                <button
                                    key={item.tabValue}
                                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                                    className={cn('mobile-bottom-nav-item', showMoreMenu && 'active')}
                                    aria-expanded={showMoreMenu}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-xs mt-1">{item.label}</span>
                                </button>
                            );
                        }

                        return (
                            <button
                                key={item.tabValue}
                                onClick={() => handleNavClick(item.tabValue)}
                                className={cn('mobile-bottom-nav-item', active && 'active')}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="text-xs mt-1">{item.label}</span>
                            </button>
                        );
                    })
                )}
            </nav>

            {/* More Menu Popup */}
            {showMoreMenu && (
                <>
                    <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowMoreMenu(false)}
                    />
                    <div className="desktop-hidden fixed bottom-[calc(60px+var(--safe-area-inset-bottom))] left-4 right-4 bg-white rounded-lg shadow-xl border z-25 p-2">
                        <div className="grid grid-cols-3 gap-2">
                            {[...(isSuperAdmin ? [] : mainNavItems.slice(3)), ...(isAdmin ? adminNavItems : [])].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.tabValue}
                                        onClick={() => handleNavClick(item.tabValue)}
                                        className="flex flex-col items-center p-3 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <Icon className="h-6 w-6 text-slate-600" />
                                        <span className="text-xs text-slate-600 mt-1 text-center">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Spacer for fixed elements */}
            <div className="desktop-hidden h-14" /> {/* Top header spacer */}
        </>
    );
}
