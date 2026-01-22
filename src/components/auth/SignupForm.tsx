/**
 * SignupForm Component
 *
 * User registration with optional invite code support.
 *
 * Flows:
 * 1. With invite code → Validate → Auto-approve
 * 2. Without invite code → Register → Pending approval
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { signUp } from '@/lib/auth';
import { validateInvitation, useInvitation } from '@/lib/invitations';
import { approveUser } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SignupFormProps {
  onSuccess: () => void;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pre-fill invite code from URL parameter
  useEffect(() => {
    const inviteFromUrl = searchParams.get('invite');
    if (inviteFromUrl) {
      setFormData((prev) => ({
        ...prev,
        inviteCode: inviteFromUrl.toUpperCase(),
      }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      // Validation
      if (!formData.fullName.trim()) {
        setError('Full name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        setError('Email is required');
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      let organizationId: string;
      let userRole: string = 'user';
      let willBeAutoApproved = false;

      // Check if invite code is provided
      if (formData.inviteCode.trim()) {
        // Validate invite code
        const { data: validation, error: valError } = await validateInvitation(
          formData.inviteCode,
          formData.email
        );

        if (valError || !validation) {
          setError('Failed to validate invite code');
          setIsLoading(false);
          return;
        }

        if (!validation.is_valid) {
          setError(validation.error_message || 'Invalid invite code');
          setIsLoading(false);
          return;
        }

        // Valid invite - use organization and role from invitation
        organizationId = validation.organization_id!;
        userRole = validation.role!;
        willBeAutoApproved = true;
      } else {
        // No invite code - use default organization
        // TODO: In production, you might want to handle organization selection
        // For now, we'll return an error asking for invite code
        setError(
          'Registration requires an invite code. Please contact your administrator.'
        );
        setIsLoading(false);
        return;
      }

      // Sign up user
      const { data: newUser, error: signupError } = await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        organizationId,
        role: userRole as any, // Cast to match expected UserRole union type
      });

      if (signupError) {
        setError(signupError.message);
        setIsLoading(false);
        return;
      }

      if (!newUser) {
        setError('Signup failed - no user returned');
        setIsLoading(false);
        return;
      }

      // If invite code was used, mark it as used and auto-approve
      if (willBeAutoApproved && formData.inviteCode.trim()) {
        // Mark invitation as used
        await useInvitation(formData.inviteCode, newUser.id);

        // Auto-approve the user
        await approveUser(newUser.id, newUser.id); // Self-approval via invite

        setSuccessMessage(
          'Account created successfully! You can now sign in with your credentials.'
        );
      } else {
        setSuccessMessage(
          'Account created! Your registration is pending admin approval. You will be notified via email once approved.'
        );
      }

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        inviteCode: '',
      });

      // Wait a moment for user to see success message
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6 safe-area-y safe-area-x">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold">Create Account</CardTitle>
          <CardDescription className="text-sm sm:text-base">Sign up for MinRisk</CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="bg-green-50 border-green-200 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
                disabled={isLoading || !!successMessage}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={isLoading || !!successMessage}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                disabled={isLoading || !!successMessage}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                disabled={isLoading || !!successMessage}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="text-sm font-medium">Invite Code *</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="ABC12345"
                value={formData.inviteCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    inviteCode: e.target.value.toUpperCase(),
                  })
                }
                maxLength={8}
                required
                disabled={isLoading || !!successMessage}
                className="h-11 sm:h-10 text-base sm:text-sm uppercase"
              />
              <p className="text-xs text-gray-500">
                Get your invite code from your administrator
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 sm:h-10 text-base sm:text-sm touch-target"
              disabled={isLoading || !!successMessage}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : successMessage ? (
                'Account Created!'
              ) : (
                'Sign Up'
              )}
            </Button>

            <div className="text-center mt-6">
              <p className="text-gray-600 text-sm sm:text-base">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-medium touch-target inline-flex items-center"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>

          <div className="mt-6 text-center text-gray-500">
            <p className="text-xs sm:text-sm">MinRisk - Version 2.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

