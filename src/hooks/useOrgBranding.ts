import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export interface OrgBranding {
    logoUrl: string | null;
    loading: boolean;
}

export function useOrgBranding() {
    const { profile } = useAuth();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.organization_id) {
            setLoading(false);
            return;
        }

        async function loadBranding() {
            try {
                const { data, error } = await supabase
                    .from('organizations')
                    .select('logo_url')
                    .eq('id', profile.organization_id)
                    .single();

                if (!error && data) {
                    setLogoUrl(data.logo_url);
                }
            } catch (err) {
                console.error('Failed to load branding:', err);
            } finally {
                setLoading(false);
            }
        }

        loadBranding();
    }, [profile?.organization_id]);

    return { logoUrl, loading };
}
