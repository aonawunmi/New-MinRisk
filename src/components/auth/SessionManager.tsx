/**
 * Session Manager Component
 * 
 * Enforces single-session policy and tracks user activity.
 * 1. Registers session on login/mount
 * 2. Sends heartbeat every minute
 * 3. Forces logout if server indicates another session took over
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

export function SessionManager() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const heartbeatInterval = useRef<any>(null);

    useEffect(() => {
        if (!user) {
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
            return;
        }

        const initSession = async () => {
            // Get current session ID from Supabase Auth
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            const accessToken = session.access_token;
            // Use the last part of access token as a proxy for session ID 
            // (or just use the access token itself if it's stable per login)
            // A better way is generating a random ID per client load if we want per-tab, 
            // but for per-login we want Supabase's session.
            // Supabase doesn't expose a clean unique "session ID" for the login instance in v2 easily publically 
            // without looking deep. But we can generate one client-side on login.
            // HOWEVER, to enforce "single device", we simply generate a random ID *now* and claim it.

            // Actually, simplest is: Use the access token signature or just generate a random ID on mount.
            // If user logs in on another device, that device generates a NEW random ID and claims the lock.

            // Let's use a client-side generated ID stored in sessionStorage to persist across reloads
            let thisDeviceId = sessionStorage.getItem('minrisk_device_id');
            if (!thisDeviceId) {
                thisDeviceId = crypto.randomUUID();
                sessionStorage.setItem('minrisk_device_id', thisDeviceId);

                // Claim the session immediately
                await supabase.rpc('register_new_login', {
                    p_session_id: thisDeviceId
                });
            }

            // Start Heartbeat
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
                        // Another device claimed the session
                        handleForceLogout();
                    }
                } catch (err) {
                    console.error('Heartbeat failed:', err);
                }
            }, 60 * 1000); // Check every minute
        };

        initSession();

        return () => {
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
        };
    }, [user]);

    async function handleForceLogout() {
        // Clear interval
        if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
        }

        // Sign out locally
        await supabase.auth.signOut();

        // Redirect with message
        alert('You have been logged out because this account was signed in on another device.');
        navigate('/login');
    }

    return null; // Logic only component
}
