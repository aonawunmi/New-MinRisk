import { useEffect, useState, useContext, createContext } from 'react';
import { useSession } from '@clerk/clerk-react';
import { setClerkTokenGetter } from './supabase';

/**
 * Context that signals whether the Clerk→Supabase token bridge is ready.
 * Child components should wait for `tokenReady` before making Supabase queries,
 * otherwise they'll run as anonymous (no JWT) due to React effect ordering.
 */
const ClerkSupabaseContext = createContext({ tokenReady: false });

export function useClerkSupabaseReady() {
  return useContext(ClerkSupabaseContext);
}

/**
 * Bridge component: Wires Clerk session tokens into the Supabase client.
 *
 * Must be rendered inside <ClerkProvider>.
 * When the Clerk session changes, updates the token getter so the
 * Supabase client automatically includes the Clerk JWT in all requests.
 *
 * Exposes `tokenReady` via context so child hooks (useAuth) can wait
 * until the JWT is wired before making authenticated Supabase queries.
 */
export function ClerkSupabaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    if (session) {
      setClerkTokenGetter(() => session.getToken());
      setTokenReady(true);
    } else {
      setClerkTokenGetter(null);
      setTokenReady(false);
    }

    return () => {
      setClerkTokenGetter(null);
    };
  }, [session]);

  return (
    <ClerkSupabaseContext.Provider value={{ tokenReady }}>
      {children}
    </ClerkSupabaseContext.Provider>
  );
}
