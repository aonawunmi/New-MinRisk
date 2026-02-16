/**
 * SessionConflictDialog Component
 *
 * Non-dismissable modal shown when another device/browser has taken over
 * the user's session. Gives the user the choice to reclaim their session
 * here or sign out gracefully.
 */

import { Monitor, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface SessionConflictDialogProps {
  open: boolean;
  onContinueHere: () => void;
  onSignOut: () => void;
}

export default function SessionConflictDialog({
  open,
  onContinueHere,
  onSignOut,
}: SessionConflictDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-amber-500" />
            Active Session Detected
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your account is signed in on another device or browser.
            You can only be signed in on one device at a time.
            Choose to continue here (which will sign out the other session)
            or sign out of this session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </AlertDialogCancel>
          <AlertDialogAction onClick={onContinueHere}>
            <Monitor className="h-4 w-4 mr-2" />
            Continue Here
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
