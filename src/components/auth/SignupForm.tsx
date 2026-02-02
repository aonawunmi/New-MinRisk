/**
 * SignupForm Component
 *
 * Registration is now by invitation only. This page displays a message
 * directing users to contact their administrator for access.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SignupFormProps {
  onSuccess: () => void;
}

export default function SignupForm({ onSuccess: _onSuccess }: SignupFormProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6 safe-area-y safe-area-x">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold">MinRisk</CardTitle>
          <CardDescription className="text-sm sm:text-base">Enterprise Risk Management Platform</CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8 space-y-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-4 rounded text-sm text-center">
            <p className="font-semibold mb-2">Registration is by Invitation Only</p>
            <p>
              To get access to MinRisk, please contact your organization's administrator.
              They will send you an email invitation with a link to set up your account.
            </p>
          </div>

          <div className="text-center">
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>

          <div className="text-center text-gray-500">
            <p className="text-xs sm:text-sm">MinRisk - Version 2.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
