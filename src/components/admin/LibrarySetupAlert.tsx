import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface LibrarySetupAlertProps {
    onNavigateToLibrary: () => void;
}

export default function LibrarySetupAlert({ onNavigateToLibrary }: LibrarySetupAlertProps) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isEmpty, setIsEmpty] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (profile?.organization_id) {
            checkLibraryStatus();
        }
    }, [profile?.organization_id]);

    async function checkLibraryStatus() {
        try {
            // Check if any data exists in the main libraries
            const [rootCauses, controls] = await Promise.all([
                supabase.from('global_root_cause_library').select('*', { count: 'exact', head: true }),
                supabase.from('global_control_library').select('*', { count: 'exact', head: true }),
            ]);

            const hasData = (rootCauses.count || 0) > 0 || (controls.count || 0) > 0;
            setIsEmpty(!hasData);
        } catch (err) {
            console.error('Error checking library status:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading || !isEmpty || dismissed) return null;

    return (
        <Alert className="mb-6 border-purple-200 bg-purple-50">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                <div>
                    <AlertTitle className="text-purple-900 mb-1">Set up your Risk Libraries</AlertTitle>
                    <AlertDescription className="text-purple-700">
                        Your organization's risk libraries are currently empty. Use the Library Generator to seed your system with industry-standard root causes, impacts, controls, and KRIs/KCIs.
                    </AlertDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDismissed(true)}
                        className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                    >
                        Dismiss
                    </Button>
                    <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                        onClick={onNavigateToLibrary}
                    >
                        Setup Library <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Alert>
    );
}
