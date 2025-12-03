import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * UserMenu Component
 *
 * User menu with profile info and logout.
 * Clean implementation using new auth system.
 * UI pattern referenced from old UserMenu.tsx.
 */
import { useState } from 'react';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger, } from '@/components/ui/popover';
import { User, LogOut, Mail, Shield } from 'lucide-react';
export default function UserMenu({ user, profile, isAdmin }) {
    const [isLoading, setIsLoading] = useState(false);
    const handleLogout = async () => {
        setIsLoading(true);
        console.log('Logging out...');
        try {
            const { error } = await signOut();
            if (error) {
                console.error('Logout error:', error);
                alert('Failed to logout: ' + error.message);
                setIsLoading(false);
            }
            else {
                console.log('Logged out successfully');
                // Reload to clear all state
                window.location.href = '/';
            }
        }
        catch (err) {
            console.error('Unexpected logout error:', err);
            alert('An unexpected error occurred during logout');
            setIsLoading(false);
        }
    };
    const getRoleBadge = () => {
        if (profile.role === 'primary_admin')
            return 'Primary Admin';
        if (profile.role === 'secondary_admin')
            return 'Secondary Admin';
        return 'User';
    };
    return (_jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", className: "rounded-full", disabled: isLoading, children: _jsx(User, { className: "h-5 w-5" }) }) }), _jsx(PopoverContent, { className: "w-80", align: "end", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(User, { className: "h-4 w-4 text-gray-500" }), _jsx("span", { className: "font-semibold", children: profile.full_name })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-600", children: [_jsx(Mail, { className: "h-4 w-4" }), _jsx("span", { children: user.email })] }), isAdmin && (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(Shield, { className: "h-4 w-4 text-blue-600" }), _jsx("span", { className: "text-blue-600 font-medium", children: getRoleBadge() })] })), _jsxs("div", { className: "pt-2 text-xs text-gray-500", children: [_jsxs("div", { children: ["Status: ", profile.status] }), _jsxs("div", { children: ["User ID: ", user.id.slice(0, 8), "..."] })] })] }), _jsx("div", { className: "border-t pt-4", children: _jsxs(Button, { variant: "destructive", className: "w-full", onClick: handleLogout, disabled: isLoading, children: [_jsx(LogOut, { className: "h-4 w-4 mr-2" }), isLoading ? 'Logging out...' : 'Logout'] }) })] }) })] }));
}
