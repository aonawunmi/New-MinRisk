/**
 * Forgot Password Form
 *
 * Allows users to request a password reset email.
 * Uses the existing resetPassword() function from lib/auth.ts.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: resetError } = await resetPassword(email);

      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      setSent(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          {sent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                If an account exists with that email, you will receive a password reset link shortly.
                Check your inbox (and spam folder).
              </div>
              <div className="text-center">
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
              </div>

              <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-gray-600 hover:text-gray-700 text-sm">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
