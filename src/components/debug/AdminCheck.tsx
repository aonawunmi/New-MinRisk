/**
 * AdminCheck Component
 *
 * Debug component to check admin status
 * Navigate to /#admin-check to see this
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminCheck() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus({ error: 'Not logged in' });
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email, role, full_name, organization_id')
        .eq('id', user.id)
        .single();

      // Check if user has any admin role
      const isAdminRole = profile?.role && ['super_admin', 'primary_admin', 'secondary_admin'].includes(profile.role);

      setStatus({
        user_id: user.id,
        email: user.email,
        profile_email: profile?.email,
        full_name: profile?.full_name,
        role: profile?.role,
        is_admin: !!isAdminRole,
        organization_id: profile?.organization_id,
      });
    } catch (err: any) {
      setStatus({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Admin Status Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Your Account Status:</h3>

            {status.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800">Error: {status.error}</p>
              </div>
            ) : (
              <div className="space-y-2 bg-gray-50 rounded p-4 font-mono text-sm">
                <div><strong>User ID:</strong> {status.user_id}</div>
                <div><strong>Email:</strong> {status.email}</div>
                <div><strong>Full Name:</strong> {status.full_name}</div>
                <div><strong>Organization ID:</strong> {status.organization_id}</div>
                <div className="pt-4 border-t">
                  <strong>Role:</strong>
                  <span className={status.role === 'admin' ? 'text-green-600 font-bold ml-2' : 'text-orange-600 font-bold ml-2'}>
                    {status.role}
                  </span>
                </div>
                <div>
                  <strong>Is Admin?:</strong>
                  <span className={status.is_admin ? 'text-green-600 font-bold ml-2' : 'text-red-600 font-bold ml-2'}>
                    {status.is_admin ? 'YES ✓' : 'NO ✗'}
                  </span>
                </div>
              </div>
            )}

            {!status.error && !status.is_admin && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mt-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Action Required:</h4>
                <p className="text-yellow-700 mb-3">
                  Your role is currently <strong>'{status.role}'</strong>. To see admin features like the Owner Email column, your role needs to be one of:
                </p>
                <ul className="list-disc list-inside mb-3 text-yellow-700">
                  <li><strong>primary_admin</strong> - Primary organization administrator</li>
                  <li><strong>secondary_admin</strong> - Secondary administrator</li>
                  <li><strong>super_admin</strong> - Platform super administrator</li>
                </ul>
                <div className="bg-white rounded p-3 text-sm">
                  <p className="font-semibold mb-2">To fix this:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700">
                    <li>Go to: <a href="https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/editor" target="_blank" className="text-blue-600 underline">Supabase Dashboard</a></li>
                    <li>Click on the <strong>user_profiles</strong> table</li>
                    <li>Find your email: <strong>{status.email}</strong></li>
                    <li>Edit the <strong>role</strong> column to: <strong>primary_admin</strong></li>
                    <li>Save and refresh this page</li>
                  </ol>
                </div>
              </div>
            )}

            {!status.error && status.is_admin && (
              <div className="bg-green-50 border border-green-200 rounded p-4 mt-4">
                <h4 className="font-semibold text-green-800 mb-2">✓ You are an Admin!</h4>
                <p className="text-green-700">
                  You should see all admin features including:
                </p>
                <ul className="list-disc list-inside mt-2 text-green-700">
                  <li>Owner Email column in Risk Register</li>
                  <li>Owner Email filter dropdown</li>
                  <li>Admin tab in navigation</li>
                  <li>Owner Mapping tool</li>
                </ul>
                <p className="mt-3 text-green-700">
                  If you don't see these features, try:
                </p>
                <ol className="list-decimal list-inside mt-2 text-green-700">
                  <li>Hard refresh: <strong>Cmd+Shift+R</strong> (Mac) or <strong>Ctrl+Shift+R</strong> (Windows)</li>
                  <li>Clear browser cache</li>
                  <li>Try incognito/private browsing mode</li>
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
