import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export interface OrgFeatures {
    risk_register: boolean;
    controls_library: boolean;
    kri_monitoring: boolean;
    basic_incidents: boolean;
    basic_ai: boolean;
    ai_full: boolean;
    risk_intel: boolean;
    sso: boolean;
    board_reporting: boolean;
    dedicated_instance: boolean;
    [key: string]: boolean; // For future features
}

const DEFAULT_FEATURES: OrgFeatures = {
    risk_register: true,
    controls_library: true,
    kri_monitoring: true,
    basic_incidents: true,
    basic_ai: true,
    ai_full: false,
    risk_intel: false,
    sso: false,
    board_reporting: false,
    dedicated_instance: false,
};

export function useOrgFeatures() {
    const { profile } = useAuth();
    const [features, setFeatures] = useState<OrgFeatures>(DEFAULT_FEATURES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.organization_id) {
            setLoading(false);
            return;
        }

        async function loadFeatures() {
            try {
                const { data, error } = await supabase.rpc('get_org_features', {
                    p_org_id: profile?.organization_id
                });

                if (!error && data) {
                    // Merge with defaults to ensure all keys exist
                    setFeatures({ ...DEFAULT_FEATURES, ...data });
                }
            } catch (err) {
                console.error('Failed to load org features:', err);
            } finally {
                setLoading(false);
            }
        }

        loadFeatures();
    }, [profile?.organization_id]);

    return { features, loading };
}
