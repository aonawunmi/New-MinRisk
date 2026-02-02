/**
 * Auth Callback Component
 *
 * Handles Supabase auth redirects after:
 * - Clicking an invitation email link (type=invite)
 * - Clicking a password reset email link (type=recovery)
 *
 * Supabase appends tokens to the URL hash (#access_token=...&type=...).
 * The Supabase client auto-detects these and establishes a session.
 * This component reads the type and redirects to the appropriate page.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      // Parse the hash fragment to determine the auth type
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');

      // Wait for Supabase to process the tokens from the URL
      // The client auto-detects tokens in the hash and establishes a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Auth callback session error:', sessionError);
        setError('Failed to process authentication. The link may have expired.');
        return;
      }

      if (!session) {
        // If no session yet, listen for the auth state change
        // This handles the case where the token exchange hasn't completed
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === 'SIGNED_IN' && newSession) {
            subscription.unsubscribe();
            redirectByType(type);
          }
          if (event === 'TOKEN_REFRESHED' && newSession) {
            subscription.unsubscribe();
            redirectByType(type);
          }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          subscription.unsubscribe();
          setError('Authentication timed out. Please try again or request a new link.');
        }, 10000);

        return;
      }

      // Session already established, redirect
      redirectByType(type);
    } catch (err) {
      console.error('Auth callback error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  }

  function redirectByType(type: string | null) {
    if (type === 'recovery') {
      navigate('/reset-password', { replace: true });
    } else {
      // invite, magiclink, or any other type -> set password
      navigate('/set-password', { replace: true });
    }
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <a
              href="/login"
              className="inline-block text-blue-600 hover:text-blue-700 font-medium"
            >
              Go to Login
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Processing...</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Setting up your account. Please wait...</p>
        </CardContent>
      </Card>
    </div>
  );
}
