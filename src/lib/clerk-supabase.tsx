import { useEffect, useState, useContext, createContext } from 'react';
import { useSession } from '@clerk/clerk-react';
import { setClerkTokenGetter } from './supabase';

interface ClerkSupabaseContextType {
  supabaseReady: boolean;
}

const ClerkSupabaseContext = createContext<ClerkSupabaseContextType>({
  supabaseReady: false,
});

export function useSupabaseReady() {
  const ctx = useContext(ClerkSupabaseContext);
  return ctx.supabaseReady;
}

/**
 * Bridge component: Wires Clerk session tokens into the Supabase client.
 *
 * Must be rendered inside <ClerkProvider>.
 * When the Clerk session changes, updates the token getter so the
 * Supabase client automatically includes the Clerk JWT in all requests.
 *
 * Exposes `supabaseReady` via context so child hooks (useAuth) can wait
 * until the JWT is wired before making authenticated Supabase queries.
 */
export function ClerkSupabaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    if (session) {
      setClerkTokenGetter(() => session.getToken());
      setSupabaseReady(true);
    } else {
      setClerkTokenGetter(null);
      setSupabaseReady(false);
    }

    return () => {
      setClerkTokenGetter(null);
      setSupabaseReady(false);
    };
  }, [session]);

  return (
    <ClerkSupabaseContext.Provider value={{ supabaseReady }}>
      {children}
    </ClerkSupabaseContext.Provider>
  );
}
