/**
 * LoginForm Component
 *
 * Clean login form using new auth system (lib/auth.ts).
 * UI pattern referenced from old AuthScreen.tsx but written from scratch.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LoginCredentials } from '@/types/auth';

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: loginError } = await signIn({
        email: credentials.email,
        password: credentials.password,
      });

      if (loginError) {
        setError(loginError.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        console.log('Login successful:', data.email);
        onSuccess();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6 safe-area-y safe-area-x">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold">MinRisk</CardTitle>
          <CardDescription className="text-sm sm:text-base">Enterprise Risk Management Platform</CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
                required
                disabled={isLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                required
                disabled={isLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>

            <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm touch-target" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium touch-target inline-flex items-center">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center text-gray-500">
            <p className="text-xs sm:text-sm">MinRisk - Version 2.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
