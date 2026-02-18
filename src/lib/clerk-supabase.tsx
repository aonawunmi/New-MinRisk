import { useEffect, useState, useContext, createContext } from 'react';
import { useAuth } from '@clerk/clerk-react';
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
 * Bridge component: Wires Clerk auth tokens into the Supabase client.
 *
 * Must be rendered inside <ClerkProvider>.
 * Uses useAuth() to get the getToken function — more reliable than
 * useSession() which can return null even when the user is signed in.
 *
 * Exposes `supabaseReady` via context so child hooks (useAuth) can wait
 * until the JWT is wired before making authenticated Supabase queries.
 */
export function ClerkSupabaseProvider({ children }: { children: React.ReactNode }) {
  const { getToken, userId } = useAuth();
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    if (userId) {
      setClerkTokenGetter(() => getToken());
      setSupabaseReady(true);
    } else {
      setClerkTokenGetter(null);
      setSupabaseReady(false);
    }

    return () => {
      setClerkTokenGetter(null);
      setSupabaseReady(false);
    };
  }, [userId, getToken]);

  return (
    <ClerkSupabaseContext.Provider value={{ supabaseReady }}>
      {children}
    </ClerkSupabaseContext.Provider>
  );
}
