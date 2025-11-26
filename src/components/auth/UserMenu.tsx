/**
 * UserMenu Component
 *
 * User menu with profile info and logout.
 * Clean implementation using new auth system.
 * UI pattern referenced from old UserMenu.tsx.
 */

import { useState } from 'react';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { User, LogOut, Mail, Shield } from 'lucide-react';
import type { UserProfile, AuthUser } from '@/types/auth';

interface UserMenuProps {
  user: AuthUser;
  profile: UserProfile;
  isAdmin: boolean;
}

export default function UserMenu({ user, profile, isAdmin }: UserMenuProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    console.log('Logging out...');

    try {
      const { error } = await signOut();
      if (error) {
        console.error('Logout error:', error);
        alert('Failed to logout: ' + error.message);
        setIsLoading(false);
      } else {
        console.log('Logged out successfully');
        // Reload to clear all state
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Unexpected logout error:', err);
      alert('An unexpected error occurred during logout');
      setIsLoading(false);
    }
  };

  const getRoleBadge = () => {
    if (profile.role === 'primary_admin') return 'Primary Admin';
    if (profile.role === 'secondary_admin') return 'Secondary Admin';
    return 'User';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          disabled={isLoading}
        >
          <User className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">{profile.full_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-blue-600 font-medium">
                  {getRoleBadge()}
                </span>
              </div>
            )}
            <div className="pt-2 text-xs text-gray-500">
              <div>Status: {profile.status}</div>
              <div>User ID: {user.id.slice(0, 8)}...</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoading ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
