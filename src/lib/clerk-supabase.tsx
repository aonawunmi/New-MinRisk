import { useEffect, useState, useContext, createContext } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { setClerkTokenGetter } from './supabase';

interface ClerkSupabaseContextType {
  supabaseReady: boolean;
}

const ClerkSupabaseContext = createContext<ClerkSupabaseContextType>({
  supabaseReady: false,
});

export function useSupabaseReady() {
  return useContext(ClerkSupabaseContext).supabaseReady;
}

export function ClerkSupabaseProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    if (user) {
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
  }, [user, getToken]);

  return (
    <ClerkSupabaseContext.Provider value={{ supabaseReady }}>
      {children}
    </ClerkSupabaseContext.Provider>
  );
}
