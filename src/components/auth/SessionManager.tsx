/**
 * Session Manager Component
 *
 * TEMPORARILY DISABLED FOR TESTING
 *
 * Enforces single-session policy and tracks user activity.
 * 1. Registers session on login/mount
 * 2. Sends heartbeat every minute
 * 3. Forces logout if server indicates another session took over
 *
 * NOTE: Disabled to prevent "logged out on another device" errors during testing
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export function SessionManager() {
    // TEMPORARILY DISABLED - Return null immediately
    return null;

    /* ORIGINAL CODE - COMMENTED OUT FOR TESTING
    const { user } = useAuth();
    const heartbeatInterval = useRef<any>(null);

    useEffect(() => {
        if (!user) {
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
            return;
        }

        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            let thisDeviceId = sessionStorage.getItem('minrisk_device_id');
            if (!thisDeviceId) {
                thisDeviceId = crypto.randomUUID();
                sessionStorage.setItem('minrisk_device_id', thisDeviceId);

                await supabase.rpc('register_new_login', {
                    p_session_id: thisDeviceId
                });
            }

            heartbeatInterval.current = setInterval(async () => {
                try {
                    const { data: isValid, error } = await supabase.rpc('update_session_heartbeat', {
                        p_session_id: thisDeviceId
                    });

                    if (error) {
                        console.error('Heartbeat error:', error);
                        return;
                    }

                    if (isValid === false) {
                        handleForceLogout();
                    }
                } catch (err) {
                    console.error('Heartbeat failed:', err);
                }
            }, 60 * 1000);
        };

        initSession();

        return () => {
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
        };
    }, [user]);

    async function handleForceLogout() {
        if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
        }

        await supabase.auth.signOut();

        alert('You have been logged out because this account was signed in on another device.');
        window.location.href = '/';
    }

    return null;
    */
}
