import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * User Management Component
 *
 * Allows admins to manage users in their organization:
 * - View all users
 * - Approve/reject pending users
 * - Change user roles
 * - Suspend/unsuspend users
 */
import { useState, useEffect } from 'react';
import { listUsersInOrganization, listPendingUsers, approveUser, rejectUser, updateUserRole, updateUserStatus, } from '@/lib/admin';
import { getCurrentUserProfile } from '@/lib/profiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, UserCheck, UserX, Shield, User, Eye, } from 'lucide-react';
export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        loadUsers();
    }, []);
    async function loadUsers() {
        setLoading(true);
        setError(null);
        try {
            // Get current user profile
            const { data: profile } = await getCurrentUserProfile();
            if (!profile) {
                setError('Could not load user profile');
                return;
            }
            setCurrentUserId(profile.id);
            // Get all users
            const { data: allUsers, error: usersError } = await listUsersInOrganization(profile.organization_id);
            if (usersError)
                throw usersError;
            // Get pending users
            const { data: pending, error: pendingError } = await listPendingUsers(profile.organization_id);
            if (pendingError)
                throw pendingError;
            setUsers(allUsers || []);
            setPendingUsers(pending || []);
        }
        catch (err) {
            console.error('Load users error:', err);
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    async function handleApproveUser(userId) {
        setError(null);
        setSuccess(null);
        const { error } = await approveUser(userId, currentUserId);
        if (error) {
            setError(error.message);
        }
        else {
            setSuccess('User approved successfully');
            await loadUsers();
        }
    }
    async function handleRejectUser(userId) {
        if (!confirm('Reject this user? They will be marked as suspended.')) {
            return;
        }
        setError(null);
        setSuccess(null);
        const { error } = await rejectUser(userId);
        if (error) {
            setError(error.message);
        }
        else {
            setSuccess('User rejected successfully');
            await loadUsers();
        }
    }
    async function handleChangeRole(userId, newRole) {
        if (userId === currentUserId) {
            setError('You cannot change your own role');
            return;
        }
        setError(null);
        setSuccess(null);
        const { error } = await updateUserRole(userId, newRole);
        if (error) {
            setError(error.message);
        }
        else {
            setSuccess(`Role updated to ${newRole}`);
            await loadUsers();
        }
    }
    async function handleChangeStatus(userId, newStatus) {
        if (userId === currentUserId) {
            setError('You cannot change your own status');
            return;
        }
        setError(null);
        setSuccess(null);
        const { error } = await updateUserStatus(userId, newStatus);
        if (error) {
            setError(error.message);
        }
        else {
            setSuccess(`Status updated to ${newStatus}`);
            await loadUsers();
        }
    }
    function getRoleBadge(role) {
        switch (role) {
            case 'primary_admin':
                return (_jsxs(Badge, { className: "bg-purple-600", children: [_jsx(Shield, { className: "h-3 w-3 mr-1" }), "Primary Admin"] }));
            case 'secondary_admin':
                return (_jsxs(Badge, { className: "bg-blue-600", children: [_jsx(Shield, { className: "h-3 w-3 mr-1" }), "Admin"] }));
            case 'user':
                return (_jsxs(Badge, { variant: "outline", children: [_jsx(User, { className: "h-3 w-3 mr-1" }), "User"] }));
            case 'viewer':
                return (_jsxs(Badge, { variant: "outline", children: [_jsx(Eye, { className: "h-3 w-3 mr-1" }), "Viewer"] }));
            default:
                return _jsx(Badge, { variant: "outline", children: role });
        }
    }
    function getStatusBadge(status) {
        switch (status) {
            case 'approved':
                return _jsx(Badge, { className: "bg-green-600", children: "Active" });
            case 'pending':
                return _jsx(Badge, { className: "bg-yellow-600", children: "Pending" });
            case 'suspended':
                return _jsx(Badge, { className: "bg-red-600", children: "Suspended" });
            default:
                return _jsx(Badge, { variant: "outline", children: status });
        }
    }
    if (loading) {
        return _jsx("div", { className: "text-center py-8", children: "Loading users..." });
    }
    return (_jsxs("div", { className: "space-y-4", children: [error && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: error })] })), success && (_jsxs(Alert, { className: "bg-green-50 border-green-200", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600" }), _jsx(AlertDescription, { className: "text-green-800", children: success })] })), pendingUsers.length > 0 && (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Pending User Approvals" }), _jsxs(CardDescription, { children: [pendingUsers.length, " user", pendingUsers.length !== 1 ? 's' : '', ' ', "awaiting approval"] })] }), _jsx(CardContent, { children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Email" }), _jsx(TableHead, { children: "Requested Role" }), _jsx(TableHead, { children: "Created" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: pendingUsers.map((user) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: user.full_name }), _jsx(TableCell, { children: user.email }), _jsx(TableCell, { children: getRoleBadge(user.role) }), _jsx(TableCell, { children: new Date(user.created_at).toLocaleDateString() }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsxs(Button, { onClick: () => handleApproveUser(user.id), size: "sm", className: "bg-green-600 hover:bg-green-700", children: [_jsx(UserCheck, { className: "h-4 w-4 mr-1" }), "Approve"] }), _jsxs(Button, { onClick: () => handleRejectUser(user.id), size: "sm", variant: "destructive", children: [_jsx(UserX, { className: "h-4 w-4 mr-1" }), "Reject"] })] }) })] }, user.id))) })] }) })] })), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "All Users" }), _jsx(CardDescription, { children: "Manage user roles and access in your organization" })] }), _jsx(CardContent, { children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Email" }), _jsx(TableHead, { children: "Role" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Joined" }), _jsx(TableHead, { children: "Last Updated" })] }) }), _jsx(TableBody, { children: users.map((user) => (_jsxs(TableRow, { children: [_jsxs(TableCell, { className: "font-medium", children: [user.full_name, user.id === currentUserId && (_jsx("span", { className: "ml-2 text-xs text-gray-500", children: "(You)" }))] }), _jsx(TableCell, { children: user.email }), _jsx(TableCell, { children: user.id === currentUserId ? (getRoleBadge(user.role)) : (_jsxs(Select, { value: user.role, onValueChange: (value) => handleChangeRole(user.id, value), children: [_jsx(SelectTrigger, { className: "w-[180px]", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "primary_admin", children: "Primary Admin" }), _jsx(SelectItem, { value: "secondary_admin", children: "Admin" }), _jsx(SelectItem, { value: "user", children: "User" }), _jsx(SelectItem, { value: "viewer", children: "Viewer" })] })] })) }), _jsx(TableCell, { children: user.id === currentUserId ? (getStatusBadge(user.status)) : (_jsxs(Select, { value: user.status, onValueChange: (value) => handleChangeStatus(user.id, value), children: [_jsx(SelectTrigger, { className: "w-[140px]", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "approved", children: "Active" }), _jsx(SelectItem, { value: "suspended", children: "Suspended" })] })] })) }), _jsx(TableCell, { children: new Date(user.created_at).toLocaleDateString() }), _jsx(TableCell, { children: new Date(user.updated_at).toLocaleDateString() })] }, user.id))) })] }) })] })] }));
}
