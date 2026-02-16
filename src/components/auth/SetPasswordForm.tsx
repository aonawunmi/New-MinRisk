/**
 * Set Password Form
 *
 * Shown to users who clicked an invitation email link.
 * They arrive here via /auth/callback with an active session but no password set.
 * After setting a password, they can log in normally in the future.
 *
 * NOTE: Does NOT use the useAuth() hook because that hook auto-signs-out
 * users with status !== 'approved'. Invited users may still be 'pending'
 * at this point.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SetPasswordForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setHasSession(false);
    } else {
      setHasSession(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Get user metadata before updating password (need invite_code)
      const { data: { user } } = await supabase.auth.getUser();
      const inviteCode = user?.user_metadata?.invite_code;

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      // Mark the invitation as used in user_invitations table
      if (inviteCode && user) {
        try {
          await supabase.rpc('use_invitation', {
            p_invite_code: inviteCode,
            p_user_id: user.id,
          });
        } catch (inviteErr) {
          // Non-fatal: invitation tracking is supplementary
          console.warn('Failed to mark invitation as used:', inviteErr);
        }
      }

      // Sign out so they can log in fresh with their new password
      await supabase.auth.signOut();

      setSuccess(true);
      // No auto-redirect — user needs to know their account is pending approval
    } catch (err) {
      console.error('Set password error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  // Still checking session
  if (hasSession === null) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // No session - link may have expired
  if (hasSession === false) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Session Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your invitation link has expired or is invalid. Please contact your administrator
              to receive a new invitation.
            </p>
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
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold">Welcome to MinRisk</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Set your password to activate your account
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                Your password has been set successfully!
              </div>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm">
                <p className="font-medium mb-1">Account Pending Approval</p>
                <p>Your account is now pending approval by your organization administrator. You will be able to log in once your account has been approved.</p>
              </div>
              <a
                href="/login"
                className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded transition-colors"
              >
                Go to Login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
              </div>

              <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm" disabled={isLoading}>
                {isLoading ? 'Setting password...' : 'Set Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
