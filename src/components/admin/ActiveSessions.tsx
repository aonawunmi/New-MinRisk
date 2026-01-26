/**
 * Super Admin: Active Sessions Monitor
 * 
 * Shows a list of currently active users (heartbeat within last 15 mins).
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, RefreshCw } from 'lucide-react';

interface ActiveUser {
    user_id: string;
    email: string;
    full_name: string;
    organization_name: string;
    role: string;
    last_active_at: string;
    status: 'online' | 'offline';
}

export default function ActiveSessions() {
    const [users, setUsers] = useState<ActiveUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActiveUsers();

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadActiveUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    async function loadActiveUsers() {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_active_users_admin', {
                p_window_minutes: 15
            });

            if (error) {
                console.error('Failed to load active users:', error);
                return;
            }

            setUsers(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Active Sessions</h2>
                    <p className="text-muted-foreground">
                        Monitoring users active in the last 15 minutes
                    </p>
                </div>
                <Button variant="outline" onClick={loadActiveUsers} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-green-600" />
                        Live Users ({users.length})
                    </CardTitle>
                    <CardDescription>
                        Real-time view of who is logged in right now
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Last Active</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No active users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.user_id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{user.full_name}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.organization_name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {user.role.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.last_active_at).toLocaleTimeString()}
                                            <span className="text-xs text-muted-foreground ml-1">
                                                ({Math.round((Date.now() - new Date(user.last_active_at).getTime()) / 60000)}m ago)
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                Online
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
