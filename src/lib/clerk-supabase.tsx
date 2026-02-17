import { useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';
import { setClerkTokenGetter } from './supabase';

/**
 * Bridge component: Wires Clerk session tokens into the Supabase client.
 *
 * Must be rendered inside <ClerkProvider>.
 * When the Clerk session changes, updates the token getter so the
 * Supabase client automatically includes the Clerk JWT in all requests.
 */
export function ClerkSupabaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  useEffect(() => {
    if (session) {
      setClerkTokenGetter(() => session.getToken());
    } else {
      setClerkTokenGetter(null);
    }

    return () => {
      setClerkTokenGetter(null);
    };
  }, [session]);

  return <>{children}</>;
}
