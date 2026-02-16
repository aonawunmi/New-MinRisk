/**
 * Session Manager Component
 *
 * Enforces single-session policy per user (supports paid tier user limits).
 * 1. Registers session on login/mount using a persistent device ID (localStorage)
 * 2. Sends heartbeat every 60 seconds to prove the session is active
 * 3. On conflict (another device logged in), shows a dialog with options:
 *    - "Continue Here" → reclaims session, other device loses it
 *    - "Sign Out" → graceful logout of current session
 *
 * Uses localStorage (not sessionStorage) so all tabs in the same browser
 * share one device ID — prevents false conflicts from opening new tabs.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import SessionConflictDialog from './SessionConflictDialog';

const DEVICE_ID_KEY = 'minrisk_device_id';
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 60 seconds

export function SessionManager() {
  const { user } = useAuth();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const [showConflict, setShowConflict] = useState(false);
  const isPausedRef = useRef(false);

  // Get or create a persistent device ID
  const getDeviceId = useCallback((): string => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }, []);

  // Register this device as the active session
  const registerSession = useCallback(async (deviceId: string) => {
    try {
      await supabase.rpc('register_new_login', {
        p_session_id: deviceId,
      });
    } catch (err) {
      console.error('Failed to register session:', err);
    }
  }, []);

  // Send heartbeat and check if session is still valid
  const sendHeartbeat = useCallback(async (deviceId: string): Promise<boolean | null> => {
    try {
      const { data: isValid, error } = await supabase.rpc('update_session_heartbeat', {
        p_session_id: deviceId,
      });
      if (error) {
        console.error('Heartbeat error:', error);
        return null; // Network/server error — don't trigger conflict
      }
      return isValid;
    } catch (err) {
      console.error('Heartbeat failed:', err);
      return null; // Network error — don't trigger conflict
    }
  }, []);

  // Start the heartbeat interval
  const startHeartbeat = useCallback((deviceId: string) => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(async () => {
      // Skip heartbeat if paused (conflict dialog is open) or tab is hidden
      if (isPausedRef.current || document.hidden) return;

      const isValid = await sendHeartbeat(deviceId);

      // Only trigger conflict on explicit false (not on network errors)
      if (isValid === false) {
        isPausedRef.current = true;
        setShowConflict(true);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat]);

  // Handle "Continue Here" — reclaim the session
  const handleContinueHere = useCallback(async () => {
    const deviceId = deviceIdRef.current;
    if (!deviceId) return;

    await registerSession(deviceId);
    isPausedRef.current = false;
    setShowConflict(false);
  }, [registerSession]);

  // Handle "Sign Out" — graceful logout
  const handleSignOut = useCallback(async () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    localStorage.removeItem(DEVICE_ID_KEY);

    await supabase.auth.signOut();
    window.location.href = '/';
  }, []);

  // Re-check session when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && deviceIdRef.current && !isPausedRef.current) {
        const isValid = await sendHeartbeat(deviceIdRef.current);
        if (isValid === false) {
          isPausedRef.current = true;
          setShowConflict(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sendHeartbeat]);

  // Main session lifecycle
  useEffect(() => {
    if (!user) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const deviceId = getDeviceId();
      deviceIdRef.current = deviceId;

      // Register this device as the active session
      await registerSession(deviceId);

      // Start periodic heartbeat
      startHeartbeat(deviceId);
    };

    initSession();

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [user, getDeviceId, registerSession, startHeartbeat]);

  return (
    <SessionConflictDialog
      open={showConflict}
      onContinueHere={handleContinueHere}
      onSignOut={handleSignOut}
    />
  );
}
