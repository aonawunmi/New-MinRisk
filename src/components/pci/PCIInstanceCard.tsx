/**
 * PCIInstanceCard Component
 *
 * Displays a PCI instance with its DIME scores, confidence,
 * and provides access to secondary controls attestation.
 */

import { useState } from 'react';
import type { PCIInstance, PCIStatus } from '@/types/pci';
import { retirePCIInstance } from '@/lib/pci';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Shield,
  MoreVertical,
  ChevronRight,
  Target,
  User,
  Clock,
  AlertTriangle,
  Trash2,
  Edit,
  FileText,
} from 'lucide-react';
import DIMEDisplay from './DIMEDisplay';
import ConfidenceDisplay from './ConfidenceDisplay';
import SecondaryControlsPanel from './SecondaryControlsPanel';

interface PCIInstanceCardProps {
  pciInstance: PCIInstance;
  onUpdate?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export default function PCIInstanceCard({
  pciInstance,
  onUpdate,
  onDelete,
  readOnly = false,
}: PCIInstanceCardProps) {
  const [showSecondaryControls, setShowSecondaryControls] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const template = pciInstance.pci_template;
  const dimeScore = pciInstance.derived_dime_score;
  const confidence = pciInstance.confidence_score;

  const statusColors: Record<PCIStatus, string> = {
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    retired: 'bg-red-100 text-red-800 border-red-200',
  };

  const objectiveColors = {
    likelihood: 'bg-blue-100 text-blue-800 border-blue-200',
    impact: 'bg-purple-100 text-purple-800 border-purple-200',
    both: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  async function handleRetire() {
    setDeleting(true);
    try {
      const { error } = await retirePCIInstance(pciInstance.id);
      if (error) {
        alert('Failed to retire control: ' + error.message);
      } else {
        setShowDeleteConfirm(false);
        onDelete?.();
      }
    } catch (err) {
      alert('Failed to retire control');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono">
                  {pciInstance.pci_template_id}
                </Badge>
                <Badge
                  variant="outline"
                  className={statusColors[pciInstance.status]}
                >
                  {pciInstance.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={objectiveColors[pciInstance.objective]}
                >
                  <Target className="h-3 w-3 mr-1" />
                  {pciInstance.objective === 'both'
                    ? 'L+I'
                    : pciInstance.objective === 'likelihood'
                    ? 'Likelihood'
                    : 'Impact'}
                </Badge>
              </div>
              <CardTitle className="text-base mt-2">
                {template?.name || pciInstance.pci_template_id}
              </CardTitle>
              {pciInstance.statement && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {pciInstance.statement}
                </p>
              )}
            </div>

            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowSecondaryControls(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Attestation
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Parameters
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Retire Control
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Parameters */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="truncate">{pciInstance.owner_role}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{pciInstance.trigger_frequency}</span>
            </div>
          </div>

          {/* Scope & Method */}
          {(pciInstance.scope_boundary || pciInstance.method) && (
            <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
              <span className="font-medium">Scope:</span>{' '}
              {pciInstance.scope_boundary}
              {pciInstance.method && (
                <>
                  {' • '}
                  <span className="font-medium">Method:</span>{' '}
                  {pciInstance.method}
                </>
              )}
            </div>
          )}

          {/* DIME Display */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              DIME Score (Derived)
            </div>
            <DIMEDisplay dimeScore={dimeScore} showExplainability />
          </div>

          {/* Confidence Display */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Confidence
            </div>
            <ConfidenceDisplay confidence={confidence} showDrivers />
          </div>

          {/* Action Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowSecondaryControls(true)}
          >
            <Shield className="h-4 w-4 mr-2" />
            View/Update Attestation
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>

          {/* Warnings */}
          {pciInstance.status === 'draft' && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
              <AlertTriangle className="h-4 w-4" />
              <span>
                This control is in draft status. Complete attestation to
                activate.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Controls Sheet */}
      <Sheet
        open={showSecondaryControls}
        onOpenChange={(open) => {
          setShowSecondaryControls(open);
          // Refresh parent data when sheet closes
          if (!open) {
            onUpdate?.();
          }
        }}
      >
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {pciInstance.pci_template_id}
              </Badge>
              {template?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SecondaryControlsPanel
              pciInstanceId={pciInstance.id}
              riskId={pciInstance.risk_id}
              readOnly={readOnly}
              onUpdate={onUpdate}
              pciStatus={pciInstance.status}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire this control?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the control as retired. The control and its
              attestation history will be preserved but it will no longer
              contribute to DIME scoring for this risk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRetire}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Retiring...' : 'Retire Control'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
