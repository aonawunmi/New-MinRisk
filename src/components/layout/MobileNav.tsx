import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
    Menu,
    X,
    LayoutDashboard,
    AlertTriangle,
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
    href: string;
    icon: React.ElementType;
    requiresAdmin?: boolean;
}

const mainNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Risk Register', href: '/risks', icon: AlertTriangle },
    { label: 'Incidents', href: '/incidents', icon: FileText },
    { label: 'KRI Management', href: '/kri', icon: Activity },
    { label: 'Risk Intelligence', href: '/intelligence', icon: Shield },
];

const bottomNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Risks', href: '/risks', icon: AlertTriangle },
    { label: 'Incidents', href: '/incidents', icon: FileText },
    { label: 'More', href: '#more', icon: Menu },
];

const adminNavItems: NavItem[] = [
    { label: 'Admin', href: '/admin', icon: Users, requiresAdmin: true },
    { label: 'Settings', href: '/settings', icon: Settings },
];

interface MobileNavProps {
    isAdmin?: boolean;
    onLogout?: () => void;
}

export default function MobileNav({ isAdmin = false, onLogout }: MobileNavProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const location = useLocation();

    // Close drawer on route change
    useEffect(() => {
        setIsDrawerOpen(false);
        setShowMoreMenu(false);
    }, [location.pathname]);

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

    const isActive = (href: string) => {
        if (href === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname.startsWith(href);
    };

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
                        {mainNavItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-target',
                                        isActive(item.href)
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mt-6 px-3 pt-4 border-t">
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Settings
                        </p>
                        {adminNavItems.map((item) => {
                            if (item.requiresAdmin && !isAdmin) return null;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-target',
                                        isActive(item.href)
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
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
                {bottomNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.href !== '#more' && isActive(item.href);

                    if (item.href === '#more') {
                        return (
                            <button
                                key={item.href}
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
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn('mobile-bottom-nav-item', active && 'active')}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs mt-1">{item.label}</span>
                        </Link>
                    );
                })}
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
                            {[...mainNavItems.slice(3), ...adminNavItems.filter(i => !i.requiresAdmin || isAdmin)].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        className="flex flex-col items-center p-3 rounded-lg hover:bg-slate-50 transition-colors"
                                        onClick={() => setShowMoreMenu(false)}
                                    >
                                        <Icon className="h-6 w-6 text-slate-600" />
                                        <span className="text-xs text-slate-600 mt-1 text-center">{item.label}</span>
                                    </Link>
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
